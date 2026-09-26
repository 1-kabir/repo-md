/**
 * Injection of REPO.md pointer into AGENTS.md and CLAUDE.md.
 *
 * Inserts a marker-delimited block:
 *
 *   <!-- REPO.MD:START -->
 *   > 📁 This repo is indexed in [REPO.md](./REPO.md).
 *   > Read it before exploring the file tree — it maps structure, stacks, and entry points.
 *   <!-- REPO.MD:END -->
 *
 * Rules:
 *  - Idempotent: running 3× produces exactly one block
 *  - Creates the file if missing
 *  - Preserves all user content outside the markers
 *  - Block is prepended (agents read top-down, so put it first)
 */

import fs from "node:fs";
import path from "node:path";

const MARKER_START = "<!-- REPO.MD:START -->";
const MARKER_END = "<!-- REPO.MD:END -->";

const BLOCK = `${MARKER_START}
> 📁 This repo is indexed in [REPO.md](./REPO.md).
> Read it before exploring the file tree — it maps structure, stacks, and entry points.
${MARKER_END}`;

/** Files to inject into */
const INJECT_FILES = ["AGENTS.md", "CLAUDE.md"] as const;

/**
 * Inject the REPO.md pointer block into the given files.
 * @param root - the repository root directory
 * @returns list of files that were actually written (created or updated)
 */
export function injectPointers(root: string): string[] {
  const written: string[] = [];

  for (const filename of INJECT_FILES) {
    const filePath = path.join(root, filename);
    const updated = injectIntoFile(filePath);
    if (updated) written.push(filename);
  }

  return written;
}

/**
 * Inject (idempotently) into a single file.
 * Returns true if the file was written.
 */
export function injectIntoFile(filePath: string): boolean {
  let existing = "";
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, "utf8");
  }

  const updated = applyInjection(existing);
  if (updated === existing) return false; // nothing changed

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

/**
 * Pure function: given file content, return updated content with exactly
 * one injected block at the top.  Idempotent.
 */
export function applyInjection(content: string): string {
  // Strip any existing block(s) — handles the case where the block was
  // already injected (possibly more than once, to make it idempotent).
  const stripped = stripBlock(content);

  // Prepend the block, with a blank line separator if there's remaining content
  const tail = stripped.trimStart();
  if (tail.length === 0) {
    return BLOCK + "\n";
  }
  return BLOCK + "\n\n" + tail;
}

/**
 * Remove all marker-delimited blocks from content.
 */
function stripBlock(content: string): string {
  // Use a regex that handles \r\n and \n line endings
  const pattern = new RegExp(
    escapeRegex(MARKER_START) + "[\\s\\S]*?" + escapeRegex(MARKER_END) + "\\r?\\n?",
    "g"
  );
  return content.replace(pattern, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
