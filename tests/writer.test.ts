/**
 * Tests for the REPO.md writer.
 */

import { writeRepoMd } from "../src/lib/writer.js";
import { walkTree } from "../src/lib/walker.js";
import { buildIgnoreManager } from "../src/lib/ignore.js";
import path from "node:path";

const FIXTURE = path.resolve("tests/fixtures/simple-app");

function getNodes() {
  const ig = buildIgnoreManager(FIXTURE, 6);
  return walkTree({ root: FIXTURE, ignoreManager: ig });
}

describe("writeRepoMd", () => {
  it("produces deterministic output across 2 runs", () => {
    const nodes1 = getNodes();
    const nodes2 = getNodes();
    const out1 = writeRepoMd({ root: FIXTURE, nodes: nodes1 });
    const out2 = writeRepoMd({ root: FIXTURE, nodes: nodes2 });
    expect(out1).toBe(out2);
  });

  it("starts with # REPO.md header", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    expect(out).toMatch(/^# REPO\.md/);
  });

  it("contains ## Structure section", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    expect(out).toContain("## Structure");
  });

  it("stays within token budget (default 1800 tokens → 7200 chars)", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    expect(out.length).toBeLessThanOrEqual(1800 * 4);
  });

  it("lists key directories in structure", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    expect(out).toContain("api/");
    expect(out).toContain("src/");
    expect(out).toContain("frontend/");
  });

  it("includes stack labels", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    // api/ has package.json with express → TypeScript+Express
    expect(out).toMatch(/## Stack/);
  });

  it("includes entry points section when entry files exist", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    // src/main.ts and api/index.ts and frontend/src/main.tsx are entry points
    expect(out).toContain("## Entry Points");
  });

  it("respects custom repoName", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes, repoName: "my-awesome-app" });
    expect(out).toContain("my-awesome-app");
  });
});
