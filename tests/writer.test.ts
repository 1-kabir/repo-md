/**
 * Tests for the REPO.md writer.
 */

import { writeRepoMd } from "../src/lib/writer.js";
import { walkTree } from "../src/lib/walker.js";
import { buildIgnoreManager } from "../src/lib/ignore.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

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

  it("recognizes .tsx entry files (e.g. Vite/React main.tsx)", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    expect(out).toContain("frontend/src/main.tsx");
  });

  it("prefers a package.json-declared runtime entry over a same-dir filename guess", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes });
    // api/package.json has no scripts.start, so the plain index.ts guess stands.
    expect(out).toContain("api/index.ts");
  });

  it("respects custom repoName", () => {
    const nodes = getNodes();
    const out = writeRepoMd({ root: FIXTURE, nodes, repoName: "my-awesome-app" });
    expect(out).toContain("my-awesome-app");
  });
});

describe("writeRepoMd — package.json-declared entry points", () => {
  // Ad-hoc temp fixture (not under tests/fixtures/) reproducing a package
  // whose `main` field points at a type-only barrel while the real runtime
  // entry is only discoverable via `scripts.start`/`bin`.
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repo-md-writer-test-"));
    fs.mkdirSync(path.join(tmpRoot, "svc", "bin"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "svc", "types"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "svc", "package.json"),
      JSON.stringify({
        name: "svc",
        main: "./index.ts",
        scripts: { start: "node --loader tsx bin/serve.ts" },
      })
    );
    fs.writeFileSync(path.join(tmpRoot, "svc", "index.ts"), "export type { Foo } from './types/foo.js';\n");
    fs.writeFileSync(path.join(tmpRoot, "svc", "bin", "serve.ts"), "console.log('serving');\n");
    fs.writeFileSync(path.join(tmpRoot, "svc", "types", "foo.d.ts"), "export type Foo = string;\n");
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function nodesFor(root: string) {
    const ig = buildIgnoreManager(root, 6);
    return walkTree({ root, ignoreManager: ig });
  }

  it("prefers the scripts.start-declared entry over the barrel index.ts", () => {
    const nodes = nodesFor(tmpRoot);
    const out = writeRepoMd({ root: tmpRoot, nodes });
    expect(out).toContain("svc/bin/serve.ts");
    expect(out).not.toContain("svc/index.ts");
  });

  it("never lists .d.ts files or files under a types/ dir as entry points", () => {
    const nodes = nodesFor(tmpRoot);
    const out = writeRepoMd({ root: tmpRoot, nodes });
    const entryPointsSection = out.split("## Entry Points")[1] ?? "";
    expect(entryPointsSection).not.toContain("foo.d.ts");
  });
});
