/**
 * repo-md agent
 *
 * Runs `repo-md init` (structural pass) then fires a one-shot headless
 * agent call to enrich REPO.md with purpose annotations, conventions, and
 * any insight the model can derive from the code.
 *
 * Supported agents:
 *   bob         — IBM Bob Shell    (bob run "<prompt>")
 *   claude      — Anthropic CLI    (claude -p "<prompt>" --permission-mode acceptEdits)
 *   opencode    — OpenCode CLI     (opencode run "<prompt>" --auto)
 *   codex       — OpenAI Codex     (codex exec "<prompt>" --sandbox workspace-write)
 *   agy         — Antigravity CLI  (agy -p "<prompt>" --dangerously-skip-permissions)
 *   antigravity — custom binary    ($ANTIGRAVITY_CMD env var)
 *
 * Headless invocation syntax verified against each CLI's official docs:
 *   - Bob Shell: non-interactive sessions use the `bob run [options] [prompt...]`
 *     subcommand (not `bob shell`). Tool calls are pre-approved automatically
 *     in this mode, so no extra permission flag is needed.
 *     https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive
 *   - Claude Code: `-p`/`--print` runs one prompt and exits. Without an
 *     explicit permission mode, a tool call that needs approval has no one to
 *     answer it in a headless run. `--permission-mode acceptEdits` auto-
 *     approves file edits (the only tool class this prompt needs) without
 *     granting blanket command execution.
 *   - OpenCode: `opencode run [message..]` is the non-interactive mode. The
 *     `--auto` flag ("auto-approve permissions that are not explicitly
 *     denied") is required for unattended runs that edit REPO.md — without
 *     it a permission request has no one to answer it.
 *     https://opencode.ai/docs/cli/
 *   - Codex: `codex exec [PROMPT]` is the non-interactive mode, but it
 *     defaults to a READ-ONLY sandbox — the enrichment pass could not write
 *     REPO.md. `--sandbox workspace-write` grants edit access to the working
 *     tree. (`--full-auto` also implies workspace-write but is deprecated
 *     and prints a warning.)
 *     https://developers.openai.com/codex/cli/reference
 *   - Antigravity (agy): `-p`/`--print`/`--prompt` runs one prompt and exits.
 *     The default `request-review` permission mode blocks on the same kind of
 *     unanswerable approval prompt, so `--dangerously-skip-permissions` is
 *     required for an unattended run.
 *     https://antigravity.google/docs/cli/headless/
 */

import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { runInit } from "./init.js";

export type AgentName = "bob" | "claude" | "opencode" | "codex" | "agy" | "antigravity";

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
      // Non-interactive: `bob run [options] [prompt...]`.
      return { cmd: "bob", args: ["run", prompt] };
    case "claude":
      return { cmd: "claude", args: ["-p", prompt, "--permission-mode", "acceptEdits"] };
    case "opencode":
      // opencode headless mode: `opencode run "<message>" --auto`
      return { cmd: "opencode", args: ["run", prompt, "--auto"] };
    case "codex":
      // exec defaults to a read-only sandbox; the enrichment pass must edit REPO.md.
      return { cmd: "codex", args: ["exec", prompt, "--sandbox", "workspace-write"] };
    case "agy":
      // Antigravity (agy) headless: `agy -p "<prompt>" --dangerously-skip-permissions`
      return { cmd: "agy", args: ["-p", prompt, "--dangerously-skip-permissions"] };
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
  // Always inherit stdout so agent output is visible; pipe stderr only in
  // quiet mode but still surface it on failure.
  const result = spawnSync(cmdSpec.cmd, cmdSpec.args, {
    cwd: root,
    stdio: quiet ? ["pipe", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });

  const exitCode = result.status ?? 1;

  if (exitCode !== 0) {
    if (!quiet) console.error(`⚠️  Agent exited with code ${exitCode}`);
    // Always print captured stderr on failure, even in quiet mode
    if (result.stderr) console.error(result.stderr);
  } else if (!quiet) {
    console.log(`✅ Enrichment complete`);
  }

  return { initTokenCount, agentExitCode: exitCode };
}
