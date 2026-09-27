/**
 * repo-md init command
 *
 * Orchestrates:
 * 1. Build ignore manager (reads .gitignore, .bobignore, nested ignores)
 * 2. Walk the file tree
 * 3. Detect per-folder stacks
 * 4. Write REPO.md
 * 5. Inject pointer into AGENTS.md + CLAUDE.md
 */

import fs from "node:fs";
import path from "node:path";
import { buildIgnoreManager } from "../lib/ignore.js";
import { walkTree } from "../lib/walker.js";
import { writeRepoMd } from "../lib/writer.js";
import { injectPointers } from "../lib/injector.js";
import { isGitRepo, headHash, currentBranch } from "../lib/git.js";

export interface InitOptions {
  /** Repository root. Defaults to cwd. */
  cwd?: string;
  /** Max directory depth. Default: 6 */
  maxDepth?: number;
  /** Max file entries per directory. Default: 40 */
  maxEntriesPerDir?: number;
  /** Token budget for REPO.md. Default: 1800 */
  tokenBudget?: number;
  /** If true, skip injecting into AGENTS.md / CLAUDE.md */
  noInject?: boolean;
  /** If true, suppress console output */
  quiet?: boolean;
}

export interface InitResult {
  repoMdPath: string;
  injectedFiles: string[];
  /** Approx token count of written REPO.md */
  tokenCount: number;
}

/**
 * Root-level files that repo-md itself writes or injects into. They are
 * excluded from the structural index so that running `init` twice in a row
 * produces byte-identical output (the tool never indexes its own outputs).
 */
export const TOOL_OWNED_FILES = ["REPO.md", "AGENTS.md", "CLAUDE.md"] as const;

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const {
    cwd = process.cwd(),
    maxDepth = 6,
    maxEntriesPerDir = 40,
    tokenBudget = 1800,
    noInject = false,
    quiet = false,
  } = options;

  const root = path.resolve(cwd);

  if (!quiet) console.log(`📂 Indexing ${root} …`);

  // 1. Build ignore manager
  const ignoreManager = buildIgnoreManager(root, maxDepth);

  // 2. Walk file tree (excluding tool-owned outputs so back-to-back runs are deterministic)
  const nodes = walkTree({
    root,
    ignoreManager,
    maxDepth,
    maxEntriesPerDir,
    excludeTopLevel: TOOL_OWNED_FILES,
  });

  // 3. Detect repo name from package.json / go.mod / Cargo.toml or dirname
  const repoName = detectRepoName(root);

  // 4. Write REPO.md
  const content = writeRepoMd({
    root,
    nodes,
    repoName,
    tokenBudget,
  });

  const repoMdPath = path.join(root, "REPO.md");
  fs.writeFileSync(repoMdPath, content + buildLeanUpdatedSection(root), "utf8");

  const tokenCount = Math.ceil(content.length / 4);
  if (!quiet) {
    console.log(`✅ REPO.md written (${tokenCount} tokens, ${content.length} chars)`);
  }

  // 5. Inject pointers
  let injectedFiles: string[] = [];
  if (!noInject) {
    injectedFiles = injectPointers(root);
    if (!quiet && injectedFiles.length > 0) {
      console.log(`💉 Injected pointer into: ${injectedFiles.join(", ")}`);
    }
  }

  return { repoMdPath, injectedFiles, tokenCount };
}

/**
 * Lean UPDATED section written by `init`.
 *
 * Uses day-level granularity + git HEAD only — deliberately excludes clock
 * time and the uncommitted-changes list (both volatile and self-referential:
 * init itself creates REPO.md) so that back-to-back init runs remain
 * byte-identical. `update` writes the richer UPDATED body with full
 * timestamp, git status, and recent commits.
 */
function buildLeanUpdatedSection(root: string): string {
  const inGit = isGitRepo(root);
  const head = inGit ? headHash(root) : null;
  const branch = inGit ? currentBranch(root) : null;
  const today = new Date().toISOString().slice(0, 10) + " (UTC)";

  const body = [
    `**Updated:** ${today}`,
    head ? `**Git:** \`${branch}\` @ \`${head}\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `\n<!-- REPO.MD:UPDATED:START -->\n\n${body}\n\n<!-- REPO.MD:UPDATED:END -->\n`;
}

function detectRepoName(root: string): string {
  // Try package.json
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
      if (pkg.name) return pkg.name;
    } catch {
      // fall through
    }
  }

  // Try go.mod (first line: "module <name>")
  const goMod = path.join(root, "go.mod");
  if (fs.existsSync(goMod)) {
    const first = fs.readFileSync(goMod, "utf8").split("\n")[0];
    const m = first.match(/^module\s+(.+)/);
    if (m) return m[1].trim().split("/").pop() ?? path.basename(root);
  }

  // Try Cargo.toml
  const cargo = path.join(root, "Cargo.toml");
  if (fs.existsSync(cargo)) {
    const m = fs.readFileSync(cargo, "utf8").match(/^name\s*=\s*"([^"]+)"/m);
    if (m) return m[1];
  }

  return path.basename(root);
}
