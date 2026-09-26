# repo-md

**A single file that tells coding agents where everything is — before they ask.**

Coding agents arrive at your repository blind. `AGENTS.md` and `CLAUDE.md` tell them *how* to work — build commands, conventions, test suites — but say nothing about *where* anything is. So every session begins the same way: dozens of tool calls listing directories, opening files, and re-learning the same tree your team already knows. That exploration costs tokens, minutes, and context that should be spent on the actual task.

`REPO.md` is the missing sibling: a single, strictly-conventional file that maps the repository itself — structure, per-folder tech stacks, entry points, and where each concern lives — written in a token-conscious style (terse paths, purpose tags, no prose) so it costs almost nothing to keep in context, while saving the dozens of exploratory calls it eliminates.

---

## Workflow

### 1. Index
```bash
npx repo-md init
```
Walks your repo, respects `.gitignore` and `.bobignore` (and any nested ignore files), applies depth and per-folder entry caps, detects stacks via heuristics, and writes `REPO.md`.

### 2. Inject
The same command adds a marker-delimited pointer into `AGENTS.md` and `CLAUDE.md` — idempotent, never duplicates, creates them if missing — so every agent reads `REPO.md` on session start.

### 3. Maintain
Re-run `npx repo-md init` after significant structural changes. The command is fully idempotent: it overwrites `REPO.md` and updates the injection block without touching any surrounding content.

---

## Installation

No install required — run directly with `npx`:

```bash
npx repo-md init
```

Or install globally:

```bash
npm install -g repo-md
repo-md init
```

---

## Usage

```
repo-md init [options]

Options:
  --cwd <path>           Repository root (default: cwd)
  --depth <n>            Max directory depth (default: 6)
  --max-entries <n>      Max file entries per directory (default: 40)
  --token-budget <n>     Token budget for REPO.md output (default: 1800)
  --no-inject            Skip injecting into AGENTS.md / CLAUDE.md
  --quiet                Suppress console output
  --version, -v          Print version
  --help, -h             Show help
```

### Examples

```bash
# Index current directory
npx repo-md init

# Index a subdirectory, limit depth
npx repo-md init --cwd ./my-project --depth 4

# Generate REPO.md only, skip agent file injection
npx repo-md init --no-inject

# Tighter token budget for very large repos
npx repo-md init --token-budget 1200
```

---

## What REPO.md looks like

```markdown
# REPO.md — my-app

## Structure
\`\`\`
├── api/                  — TypeScript+Express  API layer
│   ├── routes/           — route handlers
│   ├── middleware/       — middleware
│   └── index.ts
├── frontend/             — TypeScript+React+Vite  client
│   ├── src/              — source
│   └── vite.config.ts
├── prisma/               — Prisma  schema+migrations
└── scripts/              — scripts
\`\`\`

## Stack
| Path | Tech |
| --- | --- |
| `.` | TypeScript |
| `api` | TypeScript+Express |
| `frontend` | TypeScript+React+Vite |
| `prisma` | Prisma |

## Entry Points
- `api/index.ts`
- `frontend/src/main.tsx`
\`\`\`
```

---

## Injection block

`repo-md init` prepends this block to `AGENTS.md` and `CLAUDE.md`:

```markdown
<!-- REPO.MD:START -->
> 📁 This repo is indexed in [REPO.md](./REPO.md).
> Read it before exploring the file tree — it maps structure, stacks, and entry points.
<!-- REPO.MD:END -->
```

Running `init` three times still produces exactly one block. All user content outside the markers is untouched.

---

## Stack detection

`repo-md` detects the tech stack per folder from manifest files and dependency lists — no configuration needed:

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

The default target is **~1800 tokens** (~7200 characters). The writer uses compact box-drawing trees, one-line purpose tags, and no prose. If the output exceeds the budget, it truncates gracefully. Use `--token-budget` to tune.

---

## Project structure

```
src/
├── cli.ts              — CLI entry point
├── commands/
│   └── init.ts         — init command orchestration
└── lib/
    ├── ignore.ts       — .gitignore/.bobignore loader + matcher
    ├── walker.ts       — depth-capped file tree walker
    ├── stack.ts        — per-folder stack heuristics
    ├── writer.ts       — token-conscious REPO.md writer
    └── injector.ts     — idempotent AGENTS.md/CLAUDE.md injector
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
npm test           # run 41 tests across 5 suites
npm run dev        # watch mode
```

Requirements: Node.js ≥ 18.

---

## License

MIT
