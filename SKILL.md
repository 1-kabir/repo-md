---
name: repo-md
description: >
  Use when working in a repo that has a REPO.md file, or when the user wants
  to update, enrich, or maintain REPO.md. Activates when the user says
  "update REPO.md", "refresh the index", "enrich repo context", "fix REPO.md",
  or starts a session in a repo with a REPO.md present. Guides the agent through
  a git-aware, section-scoped REPO.md maintenance pass that preserves hand-written
  notes and only rewrites auto-generated marker sections.
---

# REPO.md Maintenance Skill

Follow these steps precisely. Never modify source code. Never exceed the token
budget. Preserve all hand-enriched content outside the regeneration markers.

---

## Step 1 — Orient

1. Call `read_file` on `REPO.md` to load current content.
2. If `REPO.md` does not exist, tell the user to run `npx repo-md init` first,
   then stop.
3. Note which marker-delimited sections exist:
   - `<!-- REPO.MD:STRUCTURE:START -->` … `<!-- REPO.MD:STRUCTURE:END -->`
   - `<!-- REPO.MD:STACK:START -->` … `<!-- REPO.MD:STACK:END -->`
   - `<!-- REPO.MD:ENTRYPOINTS:START -->` … `<!-- REPO.MD:ENTRYPOINTS:END -->`
   - `<!-- REPO.MD:CONVENTIONS:START -->` … `<!-- REPO.MD:CONVENTIONS:END -->`
   - `<!-- REPO.MD:UPDATED:START -->` … `<!-- REPO.MD:UPDATED:END -->`
4. Everything **outside** these markers is hand-enriched — do not touch it.

---

## Step 2 — Gather Git State

Run these commands using `execute_command`:

```bash
git status --short
git log --oneline -5
git rev-parse --short HEAD
git rev-parse --abbrev-ref HEAD
```

Store: uncommitted changes, last 5 commit messages, HEAD hash, branch name.

---

## Step 3 — Analyse Changed Paths

From git status, identify which directories were added, removed, or renamed:
- **Added files in new dirs** → STRUCTURE and STACK sections may need updating
- **Deleted dirs** → remove from STRUCTURE, STACK, ENTRYPOINTS
- **Renamed dirs** → update all three sections consistently
- **Modified files only** → STRUCTURE/STACK likely unchanged; update UPDATED only

If no structural change is detected, skip to Step 6 (UPDATED only).

---

## Step 4 — Explore Affected Directories (parallel)

For each structurally changed directory, use `list_files` and `read_file`
(on `package.json`, `go.mod`, `Cargo.toml`, `requirements.txt`, etc.)
to determine:
- Stack / tech label (≤2 tokens: `TypeScript+Express`, `Python+FastAPI`, `Go`)
- Purpose annotation (≤6 words, no sentences: `— API route handlers`)
- Entry points (files matching: `index.ts`, `main.ts`, `cli.ts`, `main.go`, etc.)

Use `spawn_subagent` when exploring more than 3 separate directories to keep
context lean.

---

## Step 5 — Rewrite Changed Sections

For each section that needs updating, replace **only** the content between its
start and end markers. Leave the markers themselves exactly as-is.

### STRUCTURE rules
- Tree format: `├── dirname/    — purpose annotation`
- Annotations ≤6 words, no sentences, no duplication of AGENTS.md
- Paths verbatim (forward slashes, no leading `./`)
- Dirs sorted: directories first, then files, both alphabetically
- Omit: `node_modules/`, `.git/`, `dist/`, `build/`, contents of lock files

### STACK rules
- Markdown table: `| Path | Tech |`
- One row per directory that has a detectable stack
- Tech label compact: `TypeScript+Express`, `Python+FastAPI`, `Go+Gin`, `Rust+Axum`
- Root listed as `.`

### ENTRYPOINTS rules
- Bullet list: `` - `path/to/entry.ts` ``
- Include: `index.ts/js`, `main.ts/js/py/go/rs`, `app.ts/js/py`, `cli.ts/js`, `server.ts/js`
- Relative paths from repo root

### CONVENTIONS rules (enrich if new patterns detected)
- Naming conventions found in code (`camelCase`, `snake_case`, `kebab-case`)
- Module patterns (ESM, CommonJS, barrel exports)
- Test co-location rules (`*.test.ts` beside source, or `tests/` dir)
- Notable tooling choices (tsconfig paths, eslint config, build tool)
- ≤8 bullet points; do not duplicate stack info

---

## Step 6 — Update the UPDATED Section

Always rewrite this section:

```markdown
<!-- REPO.MD:UPDATED:START -->

**Updated:** <ISO timestamp> UTC
**Git:** `<branch>` @ `<short-hash>`
[**Uncommitted changes:**
- Added: `path`, …
- Modified: `path`, …
- Deleted: `path`, …]

**Recent commits:**
- `<hash>` <message>
- …

<!-- REPO.MD:UPDATED:END -->
```

Only include the uncommitted changes block if `git status` showed changes.

---

## Step 7 — Write the File

Use `apply_diff` for targeted section replacements (preferred — minimal diff).
Use `write_file` only if REPO.md is being created for the first time.

Verify the final file:
- All original markers are still present and balanced
- No source code files were modified
- Character count ≤ `token_budget × 4` (default: 7 200 chars / 1 800 tokens)

If over budget, trim the STRUCTURE section by reducing depth, not by removing
stack or entry-point data.

---

## Hard Rules (never violate)

1. **Never modify any file other than `REPO.md`.**
2. **Never remove or rewrite content outside the regeneration markers.**
3. **Never fabricate stack labels** — only annotate what you confirmed from files.
4. **Never produce sentences** in annotations — keywords and short phrases only.
5. **Stay under token budget** — if content won't fit, trim STRUCTURE depth first.
6. **One pass, no follow-up questions** — complete the update autonomously.
