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

const CHARS_PER_TOKEN = 4;
const DEFAULT_BUDGET = 1800;

/** Entry-point file names we highlight in the Entry Points section */
const ENTRY_POINT_NAMES = new Set([
  "index.ts", "index.js", "index.mjs",
  "main.ts", "main.js", "main.py", "main.go", "main.rs",
  "app.ts", "app.js", "app.py",
  "server.ts", "server.js",
  "cmd/main.go",
]);

/** Purpose tags derived from common dir/file names */
const PURPOSE_TAGS: Record<string, string> = {
  "src": "source",
  "lib": "library utilities",
  "api": "API layer",
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

  const sections: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = `# REPO.md — ${repoName}\n`;
  sections.push(header);

  // ── Structure section ──────────────────────────────────────────────────────
  const structLines = buildStructureSection(root, nodes);
  sections.push("## Structure\n```\n" + structLines.join("\n") + "\n```\n");

  // ── Stack section ──────────────────────────────────────────────────────────
  const stackLines = buildStackSection(root, nodes);
  if (stackLines.length > 0) {
    sections.push("## Stack\n" + stackLines.join("\n") + "\n");
  }

  // ── Entry Points section ───────────────────────────────────────────────────
  const entryLines = buildEntryPointsSection(nodes);
  if (entryLines.length > 0) {
    sections.push("## Entry Points\n" + entryLines.join("\n") + "\n");
  }

  // ── Assemble + enforce budget ──────────────────────────────────────────────
  let output = sections.join("\n");

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

    // Padding for tag alignment
    const PAD = 20;
    const padded = label.padEnd(PAD);

    // Tags
    const tags: string[] = [];
    if (node.isDir) {
      const stack = getStackForDir(root, node.relPath);
      if (stack) tags.push(stack);
      const purpose = PURPOSE_TAGS[name];
      if (purpose && !tags.some((t) => t.toLowerCase().includes(purpose.split(" ")[0].toLowerCase()))) {
        tags.push(purpose);
      }
    }

    const tagStr = tags.length > 0 ? `  — ${tags.join(", ")}` : "";
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
