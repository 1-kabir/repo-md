/**
 * repo-md update
 *
 * Re-runs the structural analysis (same as init), then diffs the result
 * against the existing REPO.md and surgically rewrites only the changed
 * marker-delimited sections. Hand-enriched content outside the markers is
 * preserved verbatim.
 *
 * Section markers (the convention):
 *
 *   <!-- REPO.MD:STRUCTURE:START --> … <!-- REPO.MD:STRUCTURE:END -->
 *   <!-- REPO.MD:STACK:START -->     … <!-- REPO.MD:STACK:END -->
 *   <!-- REPO.MD:ENTRYPOINTS:START -->… <!-- REPO.MD:ENTRYPOINTS:END -->
 *   <!-- REPO.MD:UPDATED:START -->   … <!-- REPO.MD:UPDATED:END -->
 */

import fs from "node:fs";
import path from "node:path";
import { buildIgnoreManager } from "../lib/ignore.js";
import { walkTree } from "../lib/walker.js";
import { buildSections } from "../lib/writer.js";
import { TOOL_OWNED_FILES } from "./init.js";
import { isGitRepo, gitStatus, recentCommits, headHash, currentBranch } from "../lib/git.js";

export interface UpdateOptions {
  cwd?: string;
  maxDepth?: number;
  maxEntriesPerDir?: number;
  tokenBudget?: number;
  /** If true, skip injecting into AGENTS.md / CLAUDE.md (unused by update, accepted for compat) */
  noInject?: boolean;
  quiet?: boolean;
}

export interface UpdateResult {
  repoMdPath: string;
  sectionsChanged: string[];
  /** true if file didn't exist and was created fresh */
  created: boolean;
  tokenCount: number;
}

// ── Section marker helpers ─────────────────────────────────────────────────

const SECTION_IDS = ["STRUCTURE", "STACK", "ENTRYPOINTS", "CONVENTIONS", "UPDATED"] as const;
type SectionId = typeof SECTION_IDS[number];

function markerStart(id: SectionId): string {
  return `<!-- REPO.MD:${id}:START -->`;
}
function markerEnd(id: SectionId): string {
  return `<!-- REPO.MD:${id}:END -->`;
}

/** Extract the content between the markers (exclusive), or null if not found. */
function extractSection(content: string, id: SectionId): string | null {
  const start = content.indexOf(markerStart(id));
  const end = content.indexOf(markerEnd(id));
  if (start === -1 || end === -1) return null;
  return content.slice(start + markerStart(id).length, end);
}

/** Replace (or insert) a marked section in the full file content. */
function replaceSection(content: string, id: SectionId, newBody: string): string {
  const ms = markerStart(id);
  const me = markerEnd(id);
  const wrapped = `${ms}\n${newBody.trimEnd()}\n${me}`;

  const start = content.indexOf(ms);
  const end = content.indexOf(me);

  if (start !== -1 && end !== -1) {
    return content.slice(0, start) + wrapped + content.slice(end + me.length);
  }
  // Section doesn't exist yet — append at end
  return content.trimEnd() + "\n\n" + wrapped + "\n";
}

// ── Update command ─────────────────────────────────────────────────────────

export async function runUpdate(options: UpdateOptions = {}): Promise<UpdateResult> {
  const {
    cwd = process.cwd(),
    maxDepth = 6,
    maxEntriesPerDir = 40,
    tokenBudget = 1800,
    quiet = false,
  } = options;

  const root = path.resolve(cwd);
  const repoMdPath = path.join(root, "REPO.md");

  if (!quiet) console.log(`🔄 Updating ${repoMdPath} …`);

  // ── 1. Analyse repo ──────────────────────────────────────────────────
  const ignoreManager = buildIgnoreManager(root, maxDepth);
  const nodes = walkTree({ root, ignoreManager, maxDepth, maxEntriesPerDir, excludeTopLevel: TOOL_OWNED_FILES });

  // ── 2. Build fresh section bodies ────────────────────────────────────────
  const fresh = buildSections({ root, nodes, tokenBudget });

  // ── 3. Git metadata ──────────────────────────────────────────────────────
  const inGit = isGitRepo(root);
  const status = inGit ? gitStatus(root) : null;
  const commits = inGit ? recentCommits(root, 5) : [];
  const head = inGit ? headHash(root) : null;
  const branch = inGit ? currentBranch(root) : null;

  // Build UPDATED section body
  const now = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const updatedLines: string[] = [
    `\n**Updated:** ${now}`,
    head ? `**Git:** \`${branch}\` @ \`${head}\`` : "",
  ].filter(Boolean);

  if (status && (status.added.length + status.modified.length + status.deleted.length + status.renamed.length) > 0) {
    updatedLines.push("\n**Uncommitted changes:**");
    if (status.added.length) updatedLines.push(`- Added: ${status.added.slice(0, 6).map(f => `\`${f}\``).join(", ")}${status.added.length > 6 ? ` +${status.added.length - 6} more` : ""}`);
    if (status.modified.length) updatedLines.push(`- Modified: ${status.modified.slice(0, 6).map(f => `\`${f}\``).join(", ")}${status.modified.length > 6 ? ` +${status.modified.length - 6} more` : ""}`);
    if (status.deleted.length) updatedLines.push(`- Deleted: ${status.deleted.slice(0, 6).map(f => `\`${f}\``).join(", ")}${status.deleted.length > 6 ? ` +${status.deleted.length - 6} more` : ""}`);
    if (status.renamed.length) updatedLines.push(`- Renamed: ${status.renamed.slice(0, 4).map(r => `\`${r.from}\` → \`${r.to}\``).join(", ")}${status.renamed.length > 4 ? ` +${status.renamed.length - 4} more` : ""}`);
  }

  if (commits.length > 0) {
    updatedLines.push("\n**Recent commits:**");
    for (const c of commits) {
      updatedLines.push(`- \`${c.hash}\` ${c.message}`);
    }
  }

  const updatedBody = updatedLines.join("\n");

  // ── 4. Load existing REPO.md (or start from scratch) ────────────────────
  let existing = "";
  let created = false;
  if (fs.existsSync(repoMdPath)) {
    existing = fs.readFileSync(repoMdPath, "utf8");
  } else {
    created = true;
  }

  // ── 5. Diff section by section, rewrite only what changed ───────────────
  let result = existing;
  const sectionsChanged: string[] = [];

  // Ensure the header exists (idempotent)
  const repoName = path.basename(root);
  if (!result.trimStart().startsWith("# REPO.md")) {
    result = `# REPO.md — ${repoName}\n\n` + result;
  }

  const sectionMap: Record<SectionId, string> = {
    STRUCTURE: fresh.structure,
    STACK: fresh.stack,
    ENTRYPOINTS: fresh.entryPoints,
    CONVENTIONS: fresh.conventions ?? "",
    UPDATED: updatedBody,
  };

  for (const id of SECTION_IDS) {
    const newBody = sectionMap[id];
    if (!newBody.trim()) continue; // skip empty sections

    const existing_body = extractSection(result, id);
    if (existing_body === null || existing_body.trim() !== newBody.trim()) {
      result = replaceSection(result, id, newBody);
      sectionsChanged.push(id);
    }
  }

  // ── 6. Write if anything changed ─────────────────────────────────────────
  if (created || sectionsChanged.length > 0) {
    fs.writeFileSync(repoMdPath, result, "utf8");
  }

  const tokenCount = Math.ceil(result.length / 4);

  if (!quiet) {
    if (created) {
      console.log(`✅ REPO.md created (${tokenCount} tokens)`);
    } else if (sectionsChanged.length > 0) {
      console.log(`✅ Updated sections: ${sectionsChanged.join(", ")} (${tokenCount} tokens)`);
    } else {
      console.log(`✓  REPO.md is up to date (${tokenCount} tokens, no changes)`);
    }
  }

  return { repoMdPath, sectionsChanged, created, tokenCount };
}
