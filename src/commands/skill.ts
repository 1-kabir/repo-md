/**
 * repo-md skill
 *
 * Prints the SKILL.md content to stdout for one-off pipe usage:
 *   npx @i_kabir/repo-md skill | <agent>
 *
 * Optional install via:
 *   npx @i_kabir/repo-md skill --install         (copy to .bob/skills/repo-md/SKILL.md)
 *   npx @i_kabir/repo-md skill --no-install      (explicit stdout only, default)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface SkillOptions {
  install?: boolean;
  cwd?: string;
  quiet?: boolean;
}

export interface SkillResult {
  content: string;
  installed: boolean;
  installPath?: string;
}

function findSkillMd(): string {
  // The SKILL.md is bundled alongside this file at the package root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // When running from dist/commands/, SKILL.md is at ../../SKILL.md
  const candidates = [
    path.join(__dirname, "..", "..", "SKILL.md"),
    path.join(__dirname, "..", "SKILL.md"),
    path.join(__dirname, "SKILL.md"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    "SKILL.md not found in package. Try reinstalling: npm i -g repo-md"
  );
}

export async function runSkill(options: SkillOptions = {}): Promise<SkillResult> {
  const { install = false, cwd = process.cwd(), quiet = false } = options;

  const skillMdPath = findSkillMd();
  const content = fs.readFileSync(skillMdPath, "utf8");

  if (!install) {
    // Pipe mode — write raw content to stdout (not via console.log to avoid
    // newline duplication when piped into another process)
    process.stdout.write(content);
    return { content, installed: false };
  }

  // Install into .bob/skills/repo-md/SKILL.md relative to cwd
  const root = path.resolve(cwd);
  const destDir = path.join(root, ".bob", "skills", "repo-md");
  const destPath = path.join(destDir, "SKILL.md");

  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(destPath, content, "utf8");

  if (!quiet) {
    console.log(`✅ Skill installed: ${path.relative(root, destPath)}`);
    console.log(`   Activate in Bob: /repo-md  or auto-invoked on relevant requests`);
  }

  return { content, installed: true, installPath: destPath };
}
