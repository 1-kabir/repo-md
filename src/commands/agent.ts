/**
 * repo-md agent
 *
 * Runs `repo-md init` (structural pass) then fires a one-shot headless
 * agent call to enrich REPO.md with purpose annotations, conventions, and
 * any insight the model can derive from the code.
 *
 * Supported agents:
 *   bob       — IBM Bob Shell  (bob shell -p "<prompt>")
 *   claude    — Anthropic CLI  (claude -p "<prompt>")
 *   opencode  — OpenCode CLI   (opencode -p "<prompt>")
 *   codex     — OpenAI Codex   (codex exec "<prompt>")
 *   antigravity — any $ANTIGRAVITY_CMD env var
 */

import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { runInit } from "./init.js";

export type AgentName = "bob" | "claude" | "opencode" | "codex" | "antigravity";

export interface AgentOptions {
  agent: AgentName;
  cwd?: string;
  maxDepth?: number;
  maxEntriesPerDir?: number;
  tokenBudget?: number;
  noInject?: boolean;
  quiet?: boolean;
}

export interface AgentResult {
  initTokenCount: number;
  agentExitCode: number;
}

const ENRICHMENT_PROMPT = `You are analyzing a software repository. The file REPO.md has been pre-populated with a structural index.

Your task:
1. Read REPO.md and the repository structure carefully.
2. Enrich REPO.md by:
   - Adding a one-line repo purpose comment after the title (if missing)
   - Improving directory annotations in Structure (≤6 words each, no sentences)
   - Adding a CONVENTIONS section (patterns, naming rules, notable decisions)
   - Preserving ALL existing section markers exactly as-is
3. Rules you MUST follow:
   - NEVER modify any source code files
   - NEVER add content outside the marker-delimited sections
   - NEVER exceed the existing token budget
   - Preserve all <!-- REPO.MD:*:START --> … <!-- REPO.MD:*:END --> markers
   - Stay factual — only annotate what you can confirm from the code
   - If already enriched, verify accuracy and return without changes

Analyze only. Enrich REPO.md. Do not touch any other file.`;

function buildCommand(agent: AgentName, prompt: string): { cmd: string; args: string[] } | null {
  switch (agent) {
    case "bob":
      return { cmd: "bob", args: ["shell", "-p", prompt] };
    case "claude":
      return { cmd: "claude", args: ["-p", prompt] };
    case "opencode":
      return { cmd: "opencode", args: ["-p", prompt] };
    case "codex":
      return { cmd: "codex", args: ["exec", prompt] };
    case "antigravity": {
      const custom = process.env["ANTIGRAVITY_CMD"];
      if (!custom) {
        console.error("❌ ANTIGRAVITY_CMD env var not set");
        return null;
      }
      const parts = custom.split(" ");
      return { cmd: parts[0], args: [...parts.slice(1), prompt] };
    }
    default:
      return null;
  }
}

/** Check if a CLI binary exists in PATH. */
function hasBinary(name: string): boolean {
  try {
    // On Windows use `where.exe` explicitly to avoid PowerShell's Where-Object alias
    const cmd = process.platform === "win32" ? `where.exe ${name}` : `which ${name}`;
    execSync(cmd, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
  const {
    agent,
    cwd = process.cwd(),
    maxDepth = 6,
    maxEntriesPerDir = 40,
    tokenBudget = 1800,
    noInject = false,
    quiet = false,
  } = options;

  const root = path.resolve(cwd);

  // Step 1: structural init pass
  if (!quiet) console.log(`📂 Running init pass …`);
  const { tokenCount: initTokenCount } = await runInit({
    cwd: root,
    maxDepth,
    maxEntriesPerDir,
    tokenBudget,
    noInject,
    quiet,
  });

  // Step 2: resolve agent command
  const cmdSpec = buildCommand(agent, ENRICHMENT_PROMPT);
  if (!cmdSpec) {
    process.exit(1);
  }

  if (!hasBinary(cmdSpec.cmd)) {
    console.error(`❌ Agent binary not found: ${cmdSpec.cmd}`);
    console.error(`   Install it or choose a different agent with --agent`);
    process.exit(1);
  }

  if (!quiet) console.log(`🤖 Calling ${agent} for enrichment pass …`);

  // Step 3: spawn the agent headlessly in the repo root
  const result = spawnSync(cmdSpec.cmd, cmdSpec.args, {
    cwd: root,
    stdio: quiet ? "pipe" : "inherit",
    encoding: "utf8",
  });

  const exitCode = result.status ?? 1;

  if (exitCode !== 0 && !quiet) {
    console.error(`⚠️  Agent exited with code ${exitCode}`);
    if (result.stderr) console.error(result.stderr);
  } else if (!quiet) {
    console.log(`✅ Enrichment complete`);
  }

  return { initTokenCount, agentExitCode: exitCode };
}
