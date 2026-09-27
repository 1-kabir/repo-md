#!/usr/bin/env node
/**
 * repo-md CLI entry point
 *
 * Usage:
 *   npx @1-kabir/repo-md init     [options]   Walk repo, write REPO.md, inject pointers
 *   npx @1-kabir/repo-md update   [options]   Re-index; rewrite only changed sections
 *   npx @1-kabir/repo-md agent    --agent <name> [options]  AI enrichment pass
 *   npx @1-kabir/repo-md skill    [--install] Print or install SKILL.md
 *   npx @1-kabir/repo-md stats    [--json]    Token cost report
 */

import { runInit } from "./commands/init.js";
import { runUpdate } from "./commands/update.js";
import { runAgent, type AgentName } from "./commands/agent.js";
import { runSkill } from "./commands/skill.js";
import { runStats } from "./commands/stats.js";
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
interface ParsedArgs {
  command: string | undefined;
  // shared
  cwd?: string;
  depth?: number;
  maxEntries?: number;
  tokenBudget?: number;
  quiet?: boolean;
  help?: boolean;
  version?: boolean;
  // init / update
  noInject?: boolean;
  // agent
  agent?: string;
  // skill
  install?: boolean;
  noInstall?: boolean;
  // stats
  json?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = { command: undefined };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "init":
      case "update":
      case "agent":
      case "skill":
      case "stats":
        result.command = arg;
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
      case "--agent":
        result.agent = args[++i];
        break;
      case "--install":
        result.install = true;
        break;
      case "--no-install":
        result.noInstall = true;
        break;
      case "--json":
        result.json = true;
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
  npx @1-kabir/repo-md <command> [options]

Commands:
  init              Walk repo, write REPO.md, inject into AGENTS.md + CLAUDE.md
  update            Re-index repo; diff and rewrite only changed sections
  agent             Run init then fire a headless AI enrichment pass
  skill             Print SKILL.md to stdout; optionally install it
  stats             Report REPO.md token cost and per-session savings

Options (all commands):
  --cwd <path>           Repository root (default: cwd)
  --depth <n>            Max directory depth (default: 6)
  --max-entries <n>      Max file entries per dir (default: 40)
  --token-budget <n>     Token budget for REPO.md (default: 1800)
  --quiet                Suppress output
  --help, -h             Show this help
  --version, -v          Show version

Options (init / update):
  --no-inject            Skip injecting into AGENTS.md / CLAUDE.md

Options (agent):
  --agent <name>         Agent to use: bob | claude | opencode | codex | agy | antigravity

Options (skill):
  --install              Install SKILL.md into .bob/skills/repo-md/
  --no-install           Explicit stdout-only mode (default)

Options (stats):
  --json                 Output as JSON

Examples:
  npx @1-kabir/repo-md init
  npx @1-kabir/repo-md update
  npx @1-kabir/repo-md update --cwd ./my-project
  npx @1-kabir/repo-md agent --agent bob
  npx @1-kabir/repo-md agent --agent claude
  npx @1-kabir/repo-md agent --agent opencode
  npx @1-kabir/repo-md agent --agent agy
  npx @1-kabir/repo-md skill
  npx @1-kabir/repo-md skill --install
  npx @1-kabir/repo-md skill | claude -p "enrich this"
  npx @1-kabir/repo-md stats
  npx @1-kabir/repo-md stats --json
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

  const sharedOpts = {
    cwd: args.cwd,
    maxDepth: args.depth,
    maxEntriesPerDir: args.maxEntries,
    tokenBudget: args.tokenBudget,
    quiet: args.quiet,
  };

  try {
    switch (args.command) {
      case "init":
        await runInit({ ...sharedOpts, noInject: args.noInject });
        break;

      case "update":
        await runUpdate({ ...sharedOpts, noInject: args.noInject });
        break;

      case "agent": {
        const validAgents: AgentName[] = ["bob", "claude", "opencode", "codex", "agy", "antigravity"];
        if (!args.agent || !validAgents.includes(args.agent as AgentName)) {
          console.error(`❌ --agent is required. Valid values: ${validAgents.join(" | ")}`);
          process.exit(1);
        }
        await runAgent({
          ...sharedOpts,
          agent: args.agent as AgentName,
          noInject: args.noInject,
        });
        break;
      }

      case "skill":
        await runSkill({
          cwd: args.cwd,
          install: args.install,
          quiet: args.quiet,
        });
        break;

      case "stats":
        await runStats({
          cwd: args.cwd,
          json: args.json,
          quiet: args.quiet,
        });
        break;

      default:
        console.error(`Unknown command: ${args.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`❌ repo-md ${args.command} failed:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
