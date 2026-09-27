/**
 * File tree walker.
 * Returns a sorted, filtered list of FileNode entries for the repo.
 */

import fs from "node:fs";
import path from "node:path";
import type { IgnoreManager } from "./ignore.js";

export interface FileNode {
  /** Relative path from root, forward-slash separated */
  relPath: string;
  isDir: boolean;
  depth: number;
  /** Only set for dirs: sorted child entries */
  children?: FileNode[];
}

export interface WalkOptions {
  root: string;
  ignoreManager: IgnoreManager;
  /** Max directory depth (0 = root only). Default: 6 */
  maxDepth?: number;
  /** Max file entries per directory before truncation. Default: 40 */
  maxEntriesPerDir?: number;
  /**
   * Root-level entry names to exclude (tool-owned outputs such as REPO.md,
   * AGENTS.md, CLAUDE.md). Excluding them keeps `init` deterministic across
   * back-to-back runs — the tool never indexes files it generates/injects.
   */
  excludeTopLevel?: readonly string[];
}

/**
 * Walk the file tree, returning a tree of FileNode.
 * Children are sorted: dirs first, then files, both alphabetically.
 */
export function walkTree(opts: WalkOptions): FileNode[] {
  const {
    root,
    ignoreManager,
    maxDepth = 6,
    maxEntriesPerDir = 40,
    excludeTopLevel = [],
  } = opts;

  return _walk(root, root, 0, maxDepth, maxEntriesPerDir, ignoreManager, new Set(excludeTopLevel));
}

function _walk(
  root: string,
  dir: string,
  depth: number,
  maxDepth: number,
  maxEntriesPerDir: number,
  ig: IgnoreManager,
  excludeTopLevel: Set<string>
): FileNode[] {
  if (depth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  // Sort: dirs first, then files, both alpha-case-insensitive
  entries.sort((a, b) => {
    const aDir = a.isDirectory() ? 0 : 1;
    const bDir = b.isDirectory() ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  const result: FileNode[] = [];
  let fileCount = 0;

  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    const relPath = path.relative(root, absPath).replace(/\\/g, "/");
    const isDir = entry.isDirectory();

    if (depth === 0 && excludeTopLevel.has(entry.name)) continue;

    if (ig.shouldIgnore(relPath, isDir)) continue;

    if (!isDir) {
      fileCount++;
      if (fileCount > maxEntriesPerDir) {
        // Add a truncation marker if we haven't already
        if (fileCount === maxEntriesPerDir + 1) {
          result.push({
            relPath: path.dirname(relPath).replace(/\\/g, "/") + "/…",
            isDir: false,
            depth,
          });
        }
        continue;
      }
    }

    const node: FileNode = { relPath, isDir, depth };

    if (isDir) {
      node.children = _walk(root, absPath, depth + 1, maxDepth, maxEntriesPerDir, ig, excludeTopLevel);
    }

    result.push(node);
  }

  return result;
}

/** Flatten the tree into a pre-order list (dirs before their children). */
export function flattenTree(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenTree(n.children));
  }
  return result;
}
