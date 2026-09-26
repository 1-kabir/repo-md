/**
 * Integration test for repo-md init command.
 * Runs against the fixture repo and validates key ACs.
 */

import { runInit } from "../src/commands/init.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const FIXTURE = path.resolve("tests/fixtures/simple-app");

describe("runInit — fixture repo", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-md-init-"));
    // Copy fixture into tmpDir so we don't pollute the real fixture
    cpR(FIXTURE, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes REPO.md", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    expect(fs.existsSync(path.join(tmpDir, "REPO.md"))).toBe(true);
  });

  it("REPO.md output is deterministic across 2 runs (AC)", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    const run1 = fs.readFileSync(path.join(tmpDir, "REPO.md"), "utf8");

    // Remove generated files and re-run from same starting state
    fs.rmSync(path.join(tmpDir, "REPO.md"));
    fs.rmSync(path.join(tmpDir, "AGENTS.md"), { force: true });
    fs.rmSync(path.join(tmpDir, "CLAUDE.md"), { force: true });
    await runInit({ cwd: tmpDir, quiet: true });
    const run2 = fs.readFileSync(path.join(tmpDir, "REPO.md"), "utf8");

    expect(run1).toBe(run2);
  });

  it("REPO.md stays within token budget", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    const content = fs.readFileSync(path.join(tmpDir, "REPO.md"), "utf8");
    const tokens = Math.ceil(content.length / 4);
    expect(tokens).toBeLessThanOrEqual(2200);
  });

  it("REPO.md contains full structure under token budget", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    const content = fs.readFileSync(path.join(tmpDir, "REPO.md"), "utf8");
    expect(content).toContain("api/");
    expect(content).toContain("src/");
    expect(content).toContain("frontend/");
  });

  it("injects pointer into AGENTS.md (creates it if missing)", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    const agentsPath = path.join(tmpDir, "AGENTS.md");
    expect(fs.existsSync(agentsPath)).toBe(true);
    const content = fs.readFileSync(agentsPath, "utf8");
    expect(content).toContain("<!-- REPO.MD:START -->");
  });

  it("injects pointer into CLAUDE.md (creates it if missing)", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    const claudePath = path.join(tmpDir, "CLAUDE.md");
    expect(fs.existsSync(claudePath)).toBe(true);
    const content = fs.readFileSync(claudePath, "utf8");
    expect(content).toContain("<!-- REPO.MD:START -->");
  });

  it("injection is idempotent — run 3× has exactly one block in AGENTS.md (AC)", async () => {
    await runInit({ cwd: tmpDir, quiet: true });
    await runInit({ cwd: tmpDir, quiet: true });
    await runInit({ cwd: tmpDir, quiet: true });
    const content = fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf8");
    const matches = content.match(/<!-- REPO\.MD:START -->/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("injection preserves user content outside markers", async () => {
    const agentsPath = path.join(tmpDir, "AGENTS.md");
    fs.writeFileSync(agentsPath, "# My Agents\n\nBuild: `npm run build`\n", "utf8");
    await runInit({ cwd: tmpDir, quiet: true });
    await runInit({ cwd: tmpDir, quiet: true });
    await runInit({ cwd: tmpDir, quiet: true });
    const content = fs.readFileSync(agentsPath, "utf8");
    expect(content).toContain("# My Agents");
    expect(content).toContain("Build: `npm run build`");
  });

  it("--no-inject skips AGENTS.md / CLAUDE.md", async () => {
    await runInit({ cwd: tmpDir, quiet: true, noInject: true });
    expect(fs.existsSync(path.join(tmpDir, "AGENTS.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, "CLAUDE.md"))).toBe(false);
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────

function cpR(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === ".git") continue;
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      cpR(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
