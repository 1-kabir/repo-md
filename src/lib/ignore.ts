/**
 * Ignore-file loader and matcher.
 * Loads .gitignore, .bobignore, and any nested ignore files,
 * then answers shouldIgnore(relPath) questions.
 */

import fs from "node:fs";
import path from "node:path";
// ignore is a CJS module; use createRequire for type-safe interop
import { createRequire } from "node:module";
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ignoreFactory = (_require("ignore") as any).default ?? _require("ignore");

interface IgnoreInstance {
  add(pattern: string | string[]): IgnoreInstance;
  ignores(path: string): boolean;
}
type Ignore = IgnoreInstance;
function ignore(): Ignore {
  return ignoreFactory() as Ignore;
}

/** Names we treat as ignore files (gitignore syntax). */
const IGNORE_FILES = [".gitignore", ".bobignore"] as const;

/** Always-ignored top-level names regardless of ignore files. */
const ALWAYS_SKIP = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "env",
  "ENV",
  "__pycache__",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  "out",
  "target",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".yarn",
]);

/** Binary / lock / generated file extensions we skip. */
const SKIP_EXTENSIONS = new Set([
  // binaries
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".ico", ".svg",
  ".mp3", ".mp4", ".wav", ".ogg", ".flac",
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  // lock files (handled by name too)
  ".lock",
]);

/** Specific filenames that are always skipped. */
const SKIP_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
  "Pipfile.lock",
  "poetry.lock",
  "Gemfile.lock",
  "cargo.lock",
  "go.sum",
  ".DS_Store",
  "Thumbs.db",
]);

export interface IgnoreManager {
  shouldIgnore(relPath: string, isDir: boolean): boolean;
}

/**
 * Build an IgnoreManager rooted at `root`.
 * Eagerly loads all ignore files found in the tree (up to maxDepth).
 */
export function buildIgnoreManager(root: string, maxDepth: number): IgnoreManager {
  // Root-level ignore instance (covers everything)
  const rootIg = ignore();
  for (const f of IGNORE_FILES) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) {
      rootIg.add(fs.readFileSync(p, "utf8"));
    }
  }

  // Map: directory (rel path from root) → Ignore instance for nested patterns
  const dirIgMap = new Map<string, Ignore>();
  _loadNestedIgnores(root, root, 0, maxDepth, dirIgMap);

  return {
    shouldIgnore(relPath: string, isDir: boolean): boolean {
      const name = path.basename(relPath);
      // Hard skips
      if (ALWAYS_SKIP.has(name)) return true;
      if (SKIP_NAMES.has(name)) return true;
      if (!isDir) {
        const ext = path.extname(name).toLowerCase();
        if (SKIP_EXTENSIONS.has(ext)) return true;
      }

      // Root-level ignore patterns
      if (rootIg.ignores(relPath.replace(/\\/g, "/"))) return true;

      // Nested ignore patterns from parent dirs
      const parts = relPath.split(/[\\/]/);
      for (let i = 1; i < parts.length; i++) {
        const dirKey = parts.slice(0, i).join("/");
        const ig = dirIgMap.get(dirKey);
        if (ig) {
          const relative = parts.slice(i).join("/");
          if (relative && ig.ignores(relative)) return true;
        }
      }

      return false;
    },
  };
}

function _loadNestedIgnores(
  root: string,
  dir: string,
  depth: number,
  maxDepth: number,
  map: Map<string, Ignore>
): void {
  if (depth > maxDepth) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const relDir = path.relative(root, dir).replace(/\\/g, "/");

  // Check for nested ignore files in this dir (not root, handled separately)
  if (depth > 0) {
    let ig: Ignore | null = null;
    for (const f of IGNORE_FILES) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) {
        ig = ig ?? ignore();
        ig.add(fs.readFileSync(p, "utf8"));
      }
    }
    if (ig) map.set(relDir, ig);
  }

  for (const e of entries) {
    if (e.isDirectory() && !ALWAYS_SKIP.has(e.name)) {
      _loadNestedIgnores(
        root,
        path.join(dir, e.name),
        depth + 1,
        maxDepth,
        map
      );
    }
  }
}
