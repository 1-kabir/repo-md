/**
 * Lightweight git helpers used by update, stats, and agent commands.
 * All functions are synchronous shell wrappers — no external deps.
 */

import { execSync } from "node:child_process";

export interface GitStatus {
  added: string[];
  modified: string[];
  deleted: string[];
  renamed: Array<{ from: string; to: string }>;
  head: string;
  branch: string;
}

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
}

/** Run a git command in the given dir; return stdout trimmed, or null on failure. */
function git(args: string, cwd: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/** Returns true if the given directory is inside a git repository. */
export function isGitRepo(cwd: string): boolean {
  return git("rev-parse --git-dir", cwd) !== null;
}

/** Current HEAD commit hash (short). */
export function headHash(cwd: string): string {
  return git("rev-parse --short HEAD", cwd) ?? "unknown";
}

/** Current branch name. */
export function currentBranch(cwd: string): string {
  return git("rev-parse --abbrev-ref HEAD", cwd) ?? "unknown";
}

/** Parse `git status --porcelain` into structured change lists. */
export function gitStatus(cwd: string): GitStatus {
  const raw = git("status --porcelain", cwd) ?? "";
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const renamed: Array<{ from: string; to: string }> = [];

  for (const line of raw.split("\n").filter(Boolean)) {
    const xy = line.slice(0, 2);
    // Porcelain: XY<space><path>  — path starts at index 3
    // But when X or Y is a letter at pos 0, slice(3) clips the first char.
    // Safe: take everything after the two-char XY code, then ltrim the space.
    const rest = line.slice(2).trimStart();
    if (xy === "??" || xy === "A " || xy === " A") {
      added.push(rest);
    } else if (xy.includes("M") || xy.includes("U")) {
      modified.push(rest);
    } else if (xy.includes("D") && !xy.includes("R")) {
      deleted.push(rest);
    } else if (xy.includes("R")) {
      const [from, to] = rest.split(" -> ");
      renamed.push({ from: from.trim(), to: to?.trim() ?? "" });
    }
  }

  return {
    added,
    modified,
    deleted,
    renamed,
    head: headHash(cwd),
    branch: currentBranch(cwd),
  };
}

/** Last N commit summaries. */
export function recentCommits(cwd: string, n = 5): GitCommit[] {
  const raw = git(`log --oneline --format="%h|%ci|%s" -${n}`, cwd) ?? "";
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...msg] = line.split("|");
      return { hash: hash.trim(), date: date?.trim() ?? "", message: msg.join("|").trim() };
    });
}
