/**
 * Tests for the ignore manager.
 */

import { buildIgnoreManager } from "../src/lib/ignore.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const FIXTURE = path.resolve("tests/fixtures/simple-app");

describe("IgnoreManager", () => {
  it("ignores node_modules always", () => {
    const ig = buildIgnoreManager(FIXTURE, 6);
    expect(ig.shouldIgnore("node_modules", true)).toBe(true);
    expect(ig.shouldIgnore("node_modules/express/index.js", false)).toBe(true);
  });

  it("ignores .git always", () => {
    const ig = buildIgnoreManager(FIXTURE, 6);
    expect(ig.shouldIgnore(".git", true)).toBe(true);
  });

  it("ignores binary extensions", () => {
    const ig = buildIgnoreManager(FIXTURE, 6);
    expect(ig.shouldIgnore("assets/logo.png", false)).toBe(true);
    expect(ig.shouldIgnore("assets/font.woff2", false)).toBe(true);
  });

  it("ignores lock files by name", () => {
    const ig = buildIgnoreManager(FIXTURE, 6);
    expect(ig.shouldIgnore("package-lock.json", false)).toBe(true);
    expect(ig.shouldIgnore("yarn.lock", false)).toBe(true);
    expect(ig.shouldIgnore("go.sum", false)).toBe(true);
  });

  it("does not ignore normal source files", () => {
    const ig = buildIgnoreManager(FIXTURE, 6);
    expect(ig.shouldIgnore("src/main.ts", false)).toBe(false);
    expect(ig.shouldIgnore("api/index.ts", false)).toBe(false);
  });

  it("respects gitignore patterns", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-md-test-"));
    fs.writeFileSync(path.join(tmpDir, ".gitignore"), "dist/\n*.log\n");
    const ig = buildIgnoreManager(tmpDir, 6);
    expect(ig.shouldIgnore("dist", true)).toBe(true);
    expect(ig.shouldIgnore("server.log", false)).toBe(true);
    expect(ig.shouldIgnore("src/index.ts", false)).toBe(false);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("respects nested gitignore patterns", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-md-test-"));
    fs.mkdirSync(path.join(tmpDir, "packages", "app"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "packages", ".gitignore"), "*.generated.ts\n");
    const ig = buildIgnoreManager(tmpDir, 6);
    expect(ig.shouldIgnore("packages/app/foo.generated.ts", false)).toBe(true);
    expect(ig.shouldIgnore("packages/app/foo.ts", false)).toBe(false);
    fs.rmSync(tmpDir, { recursive: true });
  });
});
