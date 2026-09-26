/**
 * Tests for the AGENTS.md / CLAUDE.md injector.
 *
 * Key ACs:
 *  - run 3× → still exactly one block
 *  - user text untouched outside markers
 *  - creates file if missing
 */

import { applyInjection } from "../src/lib/injector.js";

const MARKER_START = "<!-- REPO.MD:START -->";
const MARKER_END = "<!-- REPO.MD:END -->";

function countBlocks(content: string): number {
  const matches = content.match(/<!-- REPO\.MD:START -->/g);
  return matches ? matches.length : 0;
}

describe("applyInjection", () => {
  it("injects block into empty content", () => {
    const result = applyInjection("");
    expect(countBlocks(result)).toBe(1);
    expect(result).toContain(MARKER_START);
    expect(result).toContain(MARKER_END);
    expect(result).toContain("REPO.md");
  });

  it("injects block at top, preserves existing user content", () => {
    const userContent = "# My Agents\n\nDo stuff here.\n";
    const result = applyInjection(userContent);
    expect(result.startsWith(MARKER_START)).toBe(true);
    expect(result).toContain("# My Agents");
    expect(result).toContain("Do stuff here.");
    expect(countBlocks(result)).toBe(1);
  });

  it("is idempotent — run 2× produces exactly one block", () => {
    const once = applyInjection("# My Agents\n");
    const twice = applyInjection(once);
    expect(countBlocks(twice)).toBe(1);
  });

  it("is idempotent — run 3× produces exactly one block (AC)", () => {
    const once = applyInjection("# Agents doc\n");
    const twice = applyInjection(once);
    const thrice = applyInjection(twice);
    expect(countBlocks(thrice)).toBe(1);
  });

  it("user text is completely untouched outside markers — run 3×", () => {
    const userContent = "# Agents\n\nBuild commands: `npm run build`\n";
    const once = applyInjection(userContent);
    const twice = applyInjection(once);
    const thrice = applyInjection(twice);
    // Everything outside the block must still be present
    expect(thrice).toContain("# Agents");
    expect(thrice).toContain("Build commands: `npm run build`");
    expect(countBlocks(thrice)).toBe(1);
  });

  it("handles content that already has marker at top", () => {
    const injected = `${MARKER_START}\n> something\n${MARKER_END}\n\n# Doc\n`;
    const result = applyInjection(injected);
    expect(countBlocks(result)).toBe(1);
    expect(result).toContain("# Doc");
  });

  it("handles multiple accidentally-injected blocks", () => {
    const doubled =
      `${MARKER_START}\n> v1\n${MARKER_END}\n\n` +
      `${MARKER_START}\n> v2\n${MARKER_END}\n\n# Doc\n`;
    const result = applyInjection(doubled);
    expect(countBlocks(result)).toBe(1);
    expect(result).toContain("# Doc");
  });
});
