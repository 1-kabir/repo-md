# repo-md

**A single file that tells coding agents where everything is — before they ask.**

Coding agents arrive at your repository blind. `AGENTS.md` and `CLAUDE.md` tell them *how* to work — build commands, conventions, test suites — but say nothing about *where* anything is. Every session begins the same way: listing directories, opening files, re-learning the tree your team already knows. That exploration costs tokens, minutes, and context that should go toward the actual task.

`REPO.md` is the missing sibling: a single, strictly-conventional file that maps your repository — structure, per-folder tech stacks, entry points, and conventions — written token-consciously (terse paths, purpose tags, no prose) so agents get full context instantly, without exploration.

---

## Quickstart

```bash
# Index your repo — writes REPO.md and injects a pointer into AGENTS.md + CLAUDE.md
npx @i_kabir/repo-md init

# After structural changes, update only what changed
npx @i_kabir/repo-md update

# Check how many tokens REPO.md costs per session
npx @i_kabir/repo-md stats
```

---

## Commands

### `init`

Walk the repo, detect stacks, write `REPO.md`, and inject a pointer into `AGENTS.md` and `CLAUDE.md`.

```bash
npx @i_kabir/repo-md init [options]
```

Respects `.gitignore`, `.bobignore`, and any nested ignore files. Detects per-folder tech stacks from manifest files and dependency lists. Fully idempotent — run any number of times.

### `update`

Re-index the repo and rewrite **only the sections that changed**. Hand-enriched notes outside the marker-delimited sections are preserved exactly.

```bash
npx @i_kabir/repo-md update [options]
```

Sections are marker-delimited (`<!-- REPO.MD:STRUCTURE:START -->` … `<!-- REPO.MD:STRUCTURE:END -->`). The `update` command diffs each section independently and only rewrites those that differ. The `UPDATED` section is always refreshed with the current timestamp, branch, HEAD hash, and recent commits.

### `agent`

Run `init` first, then fire a **one-shot headless AI enrichment pass** — the agent annotates purpose tags, adds a `CONVENTIONS` section, and enriches the file without touching any source code.

```bash
npx @i_kabir/repo-md agent --agent <name> [options]
```

Supported agents:

| Flag | Binary invoked |
|---|---|
| `bob` | `bob run "…"` |
| `claude` | `claude -p "…" --permission-mode acceptEdits` |
| `opencode` | `opencode run "…" --auto` |
| `codex` | `codex exec "…" --sandbox workspace-write` |
| `agy` | `agy -p "…" --dangerously-skip-permissions` |
| `antigravity` | `$ANTIGRAVITY_CMD "…"` |

### `skill`

Print the `SKILL.md` to stdout for one-off pipe usage, or install it permanently into `.bob/skills/repo-md/`.

```bash
# Pipe directly into any agent
npx @i_kabir/repo-md skill | claude -p "maintain REPO.md"

# Install into Bob IDE (activates as /repo-md skill)
npx @i_kabir/repo-md skill --install
```

The skill guides any compatible agent through a git-aware, section-scoped REPO.md maintenance pass — orient, gather git state, detect structural changes, explore affected dirs, rewrite only changed sections.

### `stats`

Report the token cost of `REPO.md` and the per-session injection overhead.

```bash
npx @i_kabir/repo-md stats
npx @i_kabir/repo-md stats --json    # machine-readable output
```

```
REPO.md stats
─────────────────────────────────────────────
File size:        3,412 chars
Est. tokens:      853
Budget:           1,800
Budget used:      47 %
Git:              main @ d0c2421

Session injection cost (per agent startup):
  Pointer (AGENTS.md):  35 tokens
  REPO.md body:         853 tokens
  Total / session:      888 tokens

Without REPO.md:  ~600 tokens exploration overhead per session
With    REPO.md:  saves ~312 tokens vs. blind exploration
─────────────────────────────────────────────
```

---

## Options

All commands share these flags:

| Flag | Default | Description |
|---|---|---|
| `--cwd <path>` | cwd | Repository root |
| `--depth <n>` | `6` | Max directory depth |
| `--max-entries <n>` | `40` | Max file entries per directory |
| `--token-budget <n>` | `1800` | Soft token budget for REPO.md |
| `--quiet` | — | Suppress console output |
| `--help, -h` | — | Show help |
| `--version, -v` | — | Print version |

Command-specific flags:

| Command | Flag | Description |
|---|---|---|
| `init`, `update` | `--no-inject` | Skip pointer injection into AGENTS.md / CLAUDE.md |
| `agent` | `--agent <name>` | Agent to use (required) |
| `skill` | `--install` | Install SKILL.md into `.bob/skills/repo-md/` |
| `stats` | `--json` | Output as JSON |

---

## What REPO.md looks like

```markdown
# REPO.md — my-app

> Full-stack SaaS — Next.js frontend, Express API, Prisma + Postgres.

<!-- REPO.MD:STRUCTURE:START -->
## Structure
\`\`\`
├── api/                  — TypeScript+Express  API layer
│   ├── routes/           — route handlers
│   ├── middleware/       — middleware
│   └── index.ts          — entry point
├── frontend/             — TypeScript+Next.js  client
│   ├── src/              — source
│   └── next.config.ts
├── prisma/               — Prisma  schema+migrations
└── scripts/              — dev/build scripts
\`\`\`
<!-- REPO.MD:STRUCTURE:END -->

<!-- REPO.MD:STACK:START -->
## Stack
| Path | Tech |
| --- | --- |
| `.` | TypeScript |
| `api` | TypeScript+Express |
| `frontend` | TypeScript+Next.js |
| `prisma` | Prisma |
<!-- REPO.MD:STACK:END -->

<!-- REPO.MD:ENTRYPOINTS:START -->
## Entry Points
- `api/index.ts` — Express server
- `frontend/src/app/page.tsx`
<!-- REPO.MD:ENTRYPOINTS:END -->

<!-- REPO.MD:CONVENTIONS:START -->
## Conventions
- ESM throughout; `.js` extensions on TS imports
- All API routes in `api/routes/`, one file per resource
- Prisma migrations never edited by hand
<!-- REPO.MD:CONVENTIONS:END -->

<!-- REPO.MD:UPDATED:START -->
**Updated:** 2025-07-11 12:00:00 UTC
**Git:** `main` @ `a1b2c3d`
<!-- REPO.MD:UPDATED:END -->
```

---

## Section markers

`repo-md` uses HTML comment markers to delimit auto-generated sections. Content outside the markers is **never touched** by any command — it's yours to write and maintain by hand.

| Section | Marker ID | Auto-generated by |
|---|---|---|
| Directory tree | `STRUCTURE` | `init`, `update` |
| Per-folder tech table | `STACK` | `init`, `update` |
| Entry point list | `ENTRYPOINTS` | `init`, `update` |
| Patterns & decisions | `CONVENTIONS` | `agent`, or by hand |
| Timestamp + git state | `UPDATED` | `update` |

The `update` command diffs each section in isolation — only changed sections are rewritten.

---

## Agent injection block

`repo-md init` prepends this block to `AGENTS.md` and `CLAUDE.md`:

```markdown
<!-- REPO.MD:START -->
> 📁 This repo is indexed in [REPO.md](./REPO.md).
> Read it before exploring the file tree — it maps structure, stacks, and entry points.
<!-- REPO.MD:END -->
```

Running `init` multiple times produces exactly one block. All surrounding content is untouched.

---

## Stack detection

`repo-md` detects the tech stack per folder from manifest files — no configuration needed:

| Signal | Detected stack |
|---|---|
| `package.json` + `express` dep | `Node+Express` / `TypeScript+Express` |
| `package.json` + `@nestjs/core` | `TypeScript+NestJS` |
| `next.config.*` | `TypeScript+Next.js` |
| `vite.config.*` | `TypeScript+Vite` |
| `package.json` + `react` dep | `TypeScript+React` |
| `requirements.txt` / `pyproject.toml` + `fastapi` | `Python+FastAPI` |
| `requirements.txt` + `django` / `manage.py` | `Python+Django` |
| `go.mod` + `gin-gonic/gin` | `Go+Gin` |
| `Cargo.toml` + `axum` | `Rust+Axum` |
| `Gemfile` + `rails` | `Ruby+Rails` |
| `composer.json` + `laravel` | `PHP+Laravel` |
| `pom.xml` | `Java+Maven` |
| `pubspec.yaml` | `Dart+Flutter` |
| `Dockerfile` | `Docker` |
| `*.tf` files | `Terraform` |

---

## What is skipped

- `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `.next/`, `.turbo/`, etc.
- Binary and asset extensions: images, fonts, archives, compiled artifacts
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `go.sum`, `Cargo.lock`, etc.
- Anything matched by `.gitignore`, `.bobignore`, or any nested ignore file

---

## Token budget

The default target is **~1800 tokens** (~7200 characters). The writer uses compact box-drawing trees, one-line purpose tags, and no prose. Use `--token-budget` to tune. If the output exceeds the budget, the STRUCTURE section is trimmed at depth before any data sections are dropped.

---

## Project structure

```
src/
├── cli.ts                — CLI entry point; dispatches all commands
├── commands/
│   ├── init.ts           — walk + write REPO.md + inject pointers
│   ├── update.ts         — diff-aware section update
│   ├── agent.ts          — headless AI enrichment pass
│   ├── skill.ts          — print/install SKILL.md
│   └── stats.ts          — token cost report
└── lib/
    ├── git.ts            — git status + history helpers
    ├── ignore.ts         — .gitignore/.bobignore loader + matcher
    ├── walker.ts         — depth-capped file tree walker
    ├── stack.ts          — per-folder stack heuristics
    ├── writer.ts         — token-conscious REPO.md writer
    └── injector.ts       — idempotent AGENTS.md/CLAUDE.md injector
tests/
├── fixtures/simple-app/  — fixture repo for integration tests
├── ignore.test.ts
├── stack.test.ts
├── writer.test.ts
├── injector.test.ts
└── init.test.ts
```

---

## Development

```bash
npm install
npm run build      # compile TypeScript → dist/
npm test           # run tests across 5 suites
npm run dev        # watch mode
```

Requirements: Node.js ≥ 18.

---

## License

MIT
