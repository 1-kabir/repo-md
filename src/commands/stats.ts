/**
 * repo-md stats
 *
 * Reports token metrics for REPO.md and estimates the per-session injection
 * cost when agents load it via AGENTS.md / CLAUDE.md pointers.
 *
 * Output example:
 *   REPO.md stats
 *   ─────────────────────────────────────────
 *   File size:        3,412 chars
 *   Est. tokens:      853
 *   Budget:           1,800
 *   Budget used:      47 %
 *
 *   Session injection cost (per-agent startup):
 *     AGENTS.md pointer:  12 tokens
 *     REPO.md body:       853 tokens
 *     Total / session:    865 tokens
 *
 *   Before REPO.md:  agent spends ~600 tokens exploring structure
 *   After  REPO.md:  agent gets context in 865 tokens (saved exploration)
 *   ─────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { isGitRepo, headHash, currentBranch } from "../lib/git.js";

export interface StatsOptions {
  cwd?: string;
  json?: boolean;
  quiet?: boolean;
}

export interface StatsResult {
  repoMdChars: number;
  repoMdTokens: number;
  tokenBudget: number;
  budgetUsedPct: number;
  pointerTokens: number;
  totalSessionTokens: number;
  /** Estimated exploration tokens an agent would spend without REPO.md */
  baselineExplorationTokens: number;
  exists: boolean;
  gitHead?: string;
  gitBranch?: string;
}

const CHARS_PER_TOKEN = 4;
const DEFAULT_BUDGET = 1800;
// Pointer injected into AGENTS.md / CLAUDE.md
const POINTER_TEXT = `> 📁 This repo is indexed in [REPO.md](./REPO.md).\n> Read it before exploring the file tree — it maps structure, stacks, and entry points.`;
const POINTER_TOKENS = Math.ceil(POINTER_TEXT.length / CHARS_PER_TOKEN);

// Heuristic: without REPO.md an agent typically runs 4-8 read_file + list_dir
// calls before understanding structure — ~600 tokens on average.
const BASELINE_EXPLORATION_TOKENS = 600;

export async function runStats(options: StatsOptions = {}): Promise<StatsResult> {
  const { cwd = process.cwd(), json = false, quiet = false } = options;
  const root = path.resolve(cwd);
  const repoMdPath = path.join(root, "REPO.md");

  const exists = fs.existsSync(repoMdPath);
  let chars = 0;
  if (exists) {
    chars = fs.readFileSync(repoMdPath, "utf8").length;
  }

  const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
  const budgetUsedPct = Math.round((tokens / DEFAULT_BUDGET) * 100);
  const totalSessionTokens = tokens + POINTER_TOKENS;

  const inGit = isGitRepo(root);
  const gitHead = inGit ? headHash(root) : undefined;
  const gitBranch = inGit ? currentBranch(root) : undefined;

  const result: StatsResult = {
    repoMdChars: chars,
    repoMdTokens: tokens,
    tokenBudget: DEFAULT_BUDGET,
    budgetUsedPct,
    pointerTokens: POINTER_TOKENS,
    totalSessionTokens,
    baselineExplorationTokens: BASELINE_EXPLORATION_TOKENS,
    exists,
    gitHead,
    gitBranch,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (!quiet) {
    const line = "─".repeat(45);
    console.log(`\nREPO.md stats`);
    console.log(line);
    if (!exists) {
      console.log(`⚠️  REPO.md not found at ${repoMdPath}`);
      console.log(`   Run: npx repo-md init`);
      console.log(line);
      return result;
    }
    console.log(`File size:        ${chars.toLocaleString()} chars`);
    console.log(`Est. tokens:      ${tokens.toLocaleString()}`);
    console.log(`Budget:           ${DEFAULT_BUDGET.toLocaleString()}`);
    console.log(`Budget used:      ${budgetUsedPct} %${budgetUsedPct > 90 ? "  ⚠️  near limit" : budgetUsedPct > 100 ? "  ❌ over budget" : ""}`);
    if (gitBranch && gitHead) {
      console.log(`Git:              ${gitBranch} @ ${gitHead}`);
    }
    console.log(``);
    console.log(`Session injection cost (per agent startup):`);
    console.log(`  Pointer (AGENTS.md):  ${POINTER_TOKENS} tokens`);
    console.log(`  REPO.md body:         ${tokens} tokens`);
    console.log(`  Total / session:      ${totalSessionTokens} tokens`);
    console.log(``);
    console.log(`Without REPO.md:  ~${BASELINE_EXPLORATION_TOKENS} tokens exploration overhead per session`);
    const saved = BASELINE_EXPLORATION_TOKENS - totalSessionTokens;
    if (saved > 0) {
      console.log(`With    REPO.md:  saves ~${saved} tokens vs. blind exploration`);
    } else {
      console.log(`With    REPO.md:  +${Math.abs(saved)} tokens vs. blind exploration (enrich to reduce)`);
    }
    console.log(line);
  }

  return result;
}
