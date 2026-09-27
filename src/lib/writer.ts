/**
 * Token-conscious REPO.md writer.
 *
 * Format (strictly followed):
 *
 *   # REPO.md
 *   > <one-line repo purpose>
 *
 *   ## Structure
 *   ```
 *   root/
 *   ├── api/            — Node+Express  API layer
 *   │   ├── routes/     — route handlers
 *   │   └── index.ts    entry point
 *   └── frontend/       — React+Vite    client
 *   ```
 *
 *   ## Stack
 *   | Path | Tech |
 *   ...
 *
 *   ## Entry Points
 *   - `src/index.ts` — main server entry
 *
 * Budget: target < 1800 tokens (~7200 chars). Hard cap at 2200 tokens.
 */

import fs from "node:fs";
import path from "node:path";
import type { FileNode } from "./walker.js";
import { detectStack } from "./stack.js";

export interface WriterOptions {
  root: string;
  nodes: FileNode[];
  /** Optional repo name; falls back to basename of root */
  repoName?: string;
  /** Soft token budget (1 token ≈ 4 chars). Default: 1800 */
  tokenBudget?: number;
}

/** Per-section bodies returned by buildSections(), used by the update command. */
export interface SectionBodies {
  structure: string;
  stack: string;
  entryPoints: string;
  conventions: string;
}

const CHARS_PER_TOKEN = 4;
const DEFAULT_BUDGET = 1800;

/** Entry-point file names we highlight in the Entry Points section */
const ENTRY_POINT_NAMES = new Set([
  "index.ts", "index.js", "index.mjs",
  "main.ts", "main.js", "main.py", "main.go", "main.rs",
  "app.ts", "app.js", "app.py",
  "server.ts", "server.js",
  "cli.ts", "cli.js",
  "cmd/main.go",
]);

/** Purpose tags derived from common dir names */
const PURPOSE_TAGS: Record<string, string> = {
  "src": "source",
  "lib": "shared utilities",
  "api": "API layer",
  "commands": "CLI command implementations",
  "routes": "route handlers",
  "controllers": "request handlers",
  "middleware": "middleware",
  "models": "data models",
  "schemas": "data schemas",
  "services": "business logic",
  "utils": "utilities",
  "helpers": "helpers",
  "hooks": "React hooks",
  "components": "UI components",
  "pages": "page components",
  "views": "view templates",
  "layouts": "layout components",
  "store": "state management",
  "context": "React context",
  "reducers": "state reducers",
  "actions": "state actions",
  "styles": "stylesheets",
  "assets": "static assets",
  "public": "public assets",
  "static": "static files",
  "tests": "test suite",
  "__tests__": "test suite",
  "test": "test suite",
  "spec": "specs",
  "e2e": "end-to-end tests",
  "scripts": "dev/build scripts",
  "config": "configuration",
  "migrations": "DB migrations",
  "seeds": "DB seeds",
  "prisma": "Prisma schema+migrations",
  "drizzle": "Drizzle schema+migrations",
  "graphql": "GraphQL schema+resolvers",
  "proto": "protobuf definitions",
  "docs": "documentation",
  "infra": "infrastructure",
  "terraform": "Terraform IaC",
  "k8s": "Kubernetes manifests",
  "helm": "Helm charts",
  "docker": "Docker configs",
  ".github": "CI/CD workflows",
};

/** Annotation tags for well-known individual files */
const FILE_TAGS: Record<string, string> = {
  // CLI / entry points
  "cli.ts": "CLI entry point",
  "cli.js": "CLI entry point",
  "index.ts": "entry point",
  "index.js": "entry point",
  "index.mjs": "entry point",
  "main.ts": "entry point",
  "main.js": "entry point",
  "main.go": "entry point",
  "main.py": "entry point",
  "main.rs": "entry point",
  "server.ts": "server entry",
  "server.js": "server entry",
  "app.ts": "app entry",
  "app.js": "app entry",
  // Config / meta
  "package.json": "npm manifest + deps",
  "tsconfig.json": "TypeScript config",
  "tsconfig.base.json": "base TypeScript config",
  "jest.config.js": "Jest config",
  "jest.config.ts": "Jest config",
  "vitest.config.ts": "Vitest config",
  "vite.config.ts": "Vite config",
  "vite.config.js": "Vite config",
  "next.config.ts": "Next.js config",
  "next.config.js": "Next.js config",
  "next.config.mjs": "Next.js config",
  ".eslintrc.js": "ESLint config",
  ".eslintrc.json": "ESLint config",
  "eslint.config.js": "ESLint config",
  "prettier.config.js": "Prettier config",
  ".prettierrc": "Prettier config",
  "tailwind.config.ts": "Tailwind config",
  "tailwind.config.js": "Tailwind config",
  "Dockerfile": "container build",
  "docker-compose.yml": "multi-container setup",
  "docker-compose.yaml": "multi-container setup",
  // Docs / meta
  "README.md": "project readme",
  "AGENTS.md": "agent instructions",
  "CLAUDE.md": "Claude instructions",
  "REPO.md": "repo index for agents",
  "SKILL.md": "agent skill definition",
  "SECURITY.md": "security policy",
  "SECURITY.MD": "security policy",
  // Go / Rust / Python
  "go.mod": "Go module definition",
  "Cargo.toml": "Rust manifest",
  "requirements.txt": "Python dependencies",
  "pyproject.toml": "Python project config",
  "manage.py": "Django CLI",
};

/**
 * Build raw section bodies without markers — used by both writeRepoMd and
 * the update command (which handles markers and diffing itself).
 */
export function buildSections(opts: Omit<WriterOptions, "repoName">): SectionBodies {
  _stackCache = new Map();
  const { root, nodes } = opts;

  const structLines = buildStructureSection(root, nodes);
  const structure = "\n## Structure\n```\n" + structLines.join("\n") + "\n```\n";

  const stackLines = buildStackSection(root, nodes);
  const stack = stackLines.length > 0
    ? "\n## Stack\n" + stackLines.join("\n") + "\n"
    : "";

  const entryLines = buildEntryPointsSection(nodes);
  const entryPoints = entryLines.length > 0
    ? "\n## Entry Points\n" + entryLines.join("\n") + "\n"
    : "";

  return { structure, stack, entryPoints, conventions: "" };
}

export function writeRepoMd(opts: WriterOptions): string {
  // Reset per-call cache so two calls on the same or different trees don't bleed
  _stackCache = new Map();

  const {
    root,
    nodes,
    repoName = path.basename(root),
    tokenBudget = DEFAULT_BUDGET,
  } = opts;
  const charBudget = tokenBudget * CHARS_PER_TOKEN;

  const parts: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  parts.push(`# REPO.md — ${repoName}`);

  // ── Structure section ──────────────────────────────────────────────────────
  const structLines = buildStructureSection(root, nodes);
  const structBody = "## Structure\n```\n" + structLines.join("\n") + "\n```";
  parts.push(
    "<!-- REPO.MD:STRUCTURE:START -->\n\n" + structBody + "\n\n<!-- REPO.MD:STRUCTURE:END -->"
  );

  // ── Stack section ──────────────────────────────────────────────────────────
  const stackLines = buildStackSection(root, nodes);
  if (stackLines.length > 0) {
    const stackBody = "## Stack\n" + stackLines.join("\n");
    parts.push(
      "<!-- REPO.MD:STACK:START -->\n\n" + stackBody + "\n\n<!-- REPO.MD:STACK:END -->"
    );
  }

  // ── Entry Points section ───────────────────────────────────────────────────
  const entryLines = buildEntryPointsSection(nodes);
  if (entryLines.length > 0) {
    const epBody = "## Entry Points\n" + entryLines.join("\n");
    parts.push(
      "<!-- REPO.MD:ENTRYPOINTS:START -->\n\n" + epBody + "\n\n<!-- REPO.MD:ENTRYPOINTS:END -->"
    );
  }

  // ── Conventions section (scaffold — enriched by `repo-md agent` or by hand) ─
  parts.push(
    "<!-- REPO.MD:CONVENTIONS:START -->\n\n## Conventions\n\n<!-- REPO.MD:CONVENTIONS:END -->"
  );

  // ── Assemble + enforce budget ──────────────────────────────────────────────
  let output = parts.join("\n\n") + "\n";

  if (output.length > charBudget) {
    output = trimToBudget(output, charBudget);
  }

  return output;
}

// ── Structure section ─────────────────────────────────────────────────────────

function buildStructureSection(root: string, nodes: FileNode[]): string[] {
  const lines: string[] = [];
  renderNodes(root, nodes, "", true, lines);
  return lines;
}

function renderNodes(
  root: string,
  nodes: FileNode[],
  prefix: string,
  isLast: boolean,
  lines: string[]
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const last = i === nodes.length - 1;
    const connector = last ? "└── " : "├── ";
    const childPrefix = last ? "    " : "│   ";

    const name = path.basename(node.relPath);
    let label = name + (node.isDir ? "/" : "");

    // Padding for tag alignment (only when there are tags, to avoid trailing spaces)
    const PAD = 20;

    // Tags
    const tags: string[] = [];
    if (node.isDir) {
      const stack = getStackForDir(root, node.relPath);
      if (stack) tags.push(stack);
      const purpose = PURPOSE_TAGS[name];
      if (purpose && !tags.some((t) => t.toLowerCase().includes(purpose.split(" ")[0].toLowerCase()))) {
        tags.push(purpose);
      }
    } else {
      const fileTag = FILE_TAGS[name];
      if (fileTag) tags.push(fileTag);
    }

    const tagStr = tags.length > 0 ? `  — ${tags.join(", ")}` : "";
    const padded = tags.length > 0 ? label.padEnd(PAD) : label;
    lines.push(prefix + connector + padded + tagStr);

    if (node.isDir && node.children && node.children.length > 0) {
      renderNodes(root, node.children, prefix + childPrefix, last, lines);
    }
  }
}

/** Cache: relPath → stack label */
/** Per-call cache: relPath → stack label. Reset at the top of writeRepoMd(). */
let _stackCache: Map<string, string | null> = new Map();

function getStackForDir(root: string, relPath: string): string | null {
  if (_stackCache.has(relPath)) return _stackCache.get(relPath)!;

  const absDir = path.join(root, relPath);
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(absDir).map((e) => e);
  } catch {
    _stackCache.set(relPath, null);
    return null;
  }

  const folderName = path.basename(relPath);
  const result = detectStack(entries, (name) => {
    try {
      return fs.readFileSync(path.join(absDir, name), "utf8");
    } catch {
      return null;
    }
  }, folderName);

  _stackCache.set(relPath, result);
  return result;
}

// ── Stack section ─────────────────────────────────────────────────────────────

function buildStackSection(root: string, nodes: FileNode[]): string[] {
  // Collect all dirs with a detected stack
  const rows: Array<{ path: string; stack: string }> = [];
  collectStackRows(root, nodes, rows);

  // Deduplicate by path (keep first occurrence)
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  // Also detect root-level stack
  const rootStack = getStackForDir(root, ".");
  if (rootStack) {
    unique.unshift({ path: ".", stack: rootStack });
  }

  if (unique.length === 0) return [];

  const lines = ["| Path | Tech |", "| --- | --- |"];
  for (const row of unique) {
    lines.push(`| \`${row.path}\` | ${row.stack} |`);
  }
  return lines;
}

function collectStackRows(
  root: string,
  nodes: FileNode[],
  rows: Array<{ path: string; stack: string }>
): void {
  for (const node of nodes) {
    if (!node.isDir) continue;
    const stack = getStackForDir(root, node.relPath);
    if (stack) rows.push({ path: node.relPath, stack });
    if (node.children) collectStackRows(root, node.children, rows);
  }
}

// ── Entry Points section ──────────────────────────────────────────────────────

function buildEntryPointsSection(nodes: FileNode[]): string[] {
  const found: string[] = [];
  collectEntryPoints(nodes, found);
  return found.map((p) => `- \`${p}\``);
}

function collectEntryPoints(nodes: FileNode[], found: string[]): void {
  for (const node of nodes) {
    if (node.isDir) {
      if (node.children) collectEntryPoints(node.children, found);
    } else {
      const name = path.basename(node.relPath);
      if (ENTRY_POINT_NAMES.has(name)) {
        found.push(node.relPath);
      }
    }
  }
}

// ── Budget trimming ───────────────────────────────────────────────────────────

function trimToBudget(text: string, charBudget: number): string {
  if (text.length <= charBudget) return text;
  const lines = text.split("\n");
  const kept: string[] = [];
  let chars = 0;
  for (const line of lines) {
    if (chars + line.length + 1 > charBudget) {
      kept.push("… (truncated to token budget)");
      break;
    }
    kept.push(line);
    chars += line.length + 1;
  }
  return kept.join("\n");
}
