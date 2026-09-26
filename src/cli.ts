#!/usr/bin/env node
/**
 * repo-md CLI entry point
 *
 * Usage:
 *   npx repo-md init [options]
 *
 * Options:
 *   --cwd <path>           Repository root (default: cwd)
 *   --depth <n>            Max directory depth (default: 6)
 *   --max-entries <n>      Max file entries per dir (default: 40)
 *   --token-budget <n>     Token budget for REPO.md (default: 1800)
 *   --no-inject            Skip injecting into AGENTS.md / CLAUDE.md
 *   --quiet                Suppress output
 *   --help, -h             Show this help
 *   --version, -v          Show version
 */

import { runInit } from "./commands/init.js";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

// ── Resolve package version ───────────────────────────────────────────────────
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version: string };
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

// ── Argument parser (no external deps) ───────────────────────────────────────
function parseArgs(argv: string[]): {
  command: string | undefined;
  cwd?: string;
  depth?: number;
  maxEntries?: number;
  tokenBudget?: number;
  noInject?: boolean;
  quiet?: boolean;
  help?: boolean;
  version?: boolean;
} {
  const args = argv.slice(2); // strip node + script
  const result: ReturnType<typeof parseArgs> = { command: undefined };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "init":
        result.command = "init";
        break;
      case "--cwd":
        result.cwd = args[++i];
        break;
      case "--depth":
        result.depth = parseInt(args[++i], 10);
        break;
      case "--max-entries":
        result.maxEntries = parseInt(args[++i], 10);
        break;
      case "--token-budget":
        result.tokenBudget = parseInt(args[++i], 10);
        break;
      case "--no-inject":
        result.noInject = true;
        break;
      case "--quiet":
        result.quiet = true;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
      case "--version":
      case "-v":
        result.version = true;
        break;
      default:
        // unknown flags / positional args: ignore silently
        break;
    }
    i++;
  }
  return result;
}

function printHelp(): void {
  console.log(`
repo-md — map your repo for coding agents

Usage:
  npx repo-md init [options]

Commands:
  init              Walk repo, write REPO.md, inject into AGENTS.md + CLAUDE.md

Options:
  --cwd <path>           Repository root (default: cwd)
  --depth <n>            Max directory depth (default: 6)
  --max-entries <n>      Max file entries per dir (default: 40)
  --token-budget <n>     Token budget for REPO.md (default: 1800)
  --no-inject            Skip injecting into AGENTS.md / CLAUDE.md
  --quiet                Suppress output
  --help, -h             Show this help
  --version, -v          Show version

Examples:
  npx repo-md init
  npx repo-md init --cwd ./my-project --depth 4
  npx repo-md init --no-inject
`.trim());
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.version) {
    console.log(getVersion());
    process.exit(0);
  }

  if (args.help || !args.command) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (args.command === "init") {
    try {
      await runInit({
        cwd: args.cwd,
        maxDepth: args.depth,
        maxEntriesPerDir: args.maxEntries,
        tokenBudget: args.tokenBudget,
        noInject: args.noInject,
        quiet: args.quiet,
      });
    } catch (err) {
      console.error("❌ repo-md init failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown command: ${args.command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
