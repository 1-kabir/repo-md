<!-- REPO.MD:START -->
> 📁 This repo is indexed in [REPO.md](./REPO.md).
> Read it before exploring the file tree — it maps structure, stacks, and entry points.
<!-- REPO.MD:END -->

# repo-md — Agent Instructions

## What this project is

A zero-dependency CLI tool (`npx repo-md`) that generates and maintains a `REPO.md` index file for coding agents. It walks the file tree, detects per-folder tech stacks, and writes a token-budgeted markdown file that agents read at session start to skip exploratory tool calls.

Commands: `init` · `update` · `agent` · `skill` · `stats`

## Build & test

```bash
npm run build      # tsc → dist/
npm test           # Jest, 5 suites, ~41 tests
npm run dev        # tsc --watch
```

Always run `npm test` after any change. All 41 tests must pass before committing.

## Project layout

```
src/cli.ts                  ← CLI entry; dispatches commands
src/commands/init.ts        ← walk + write REPO.md + inject pointers
src/commands/update.ts      ← diff-aware per-section update
src/commands/agent.ts       ← headless AI enrichment pass
src/commands/skill.ts       ← print/install SKILL.md
src/commands/stats.ts       ← token cost report
src/lib/git.ts              ← git status + history (zero deps, shell wrappers)
src/lib/ignore.ts           ← .gitignore/.bobignore manager + ALWAYS_SKIP list
src/lib/walker.ts           ← depth-capped file tree walker
src/lib/stack.ts            ← per-folder tech stack heuristics
src/lib/writer.ts           ← token-budgeted REPO.md writer; emits section markers
src/lib/injector.ts         ← idempotent AGENTS.md/CLAUDE.md pointer injector
tests/                      ← Jest tests, co-located (not beside source)
tests/fixtures/simple-app/  ← multi-package fixture (Express API + Vite frontend)
```

## Code conventions

- **ESM throughout** — `"type": "module"` in `package.json`; all TS imports use `.js` extensions
- **No external runtime deps** — only `ignore` and `minimatch` in `dependencies`; everything else is `node:*` built-ins
- **Command pattern** — each subcommand is `run<Name>(options): Promise<Result>` in `src/commands/`
- **Section markers** — `<!-- REPO.MD:<SECTION>:START -->` … `<!-- REPO.MD:<SECTION>:END -->` delimit auto-generated blocks in REPO.md; content outside markers is never touched
- **Token budget** — 1 800 token soft limit (~7 200 chars); trim STRUCTURE depth before dropping data
- **Naming** — `camelCase` functions, `PascalCase` interfaces/types, `kebab-case` filenames

## Key files to know before editing

| File | Why it matters |
|---|---|
| `src/lib/ignore.ts` | `ALWAYS_SKIP` set controls what never appears in REPO.md (`.git`, `.bob`, `dist`, `node_modules`, etc.) |
| `src/lib/writer.ts` | `FILE_TAGS` + `PURPOSE_TAGS` drive auto-annotations; `buildSections()` is used by `update` |
| `src/commands/update.ts` | Section diff logic — `extractSection` / `replaceSection` — is the core of idempotent updates |
| `src/lib/git.ts` | Porcelain parser: uses `slice(2).trimStart()` not `slice(3)` — critical for correct filenames |

## Testing notes

- `tests/writer.test.ts` — checks REPO.md output format; update if marker structure changes
- `tests/init.test.ts` — integration test; runs against `tests/fixtures/simple-app/`
- `tests/injector.test.ts` — verifies idempotency of pointer injection

## What NOT to do

- Do not add external runtime dependencies without a strong reason
- Do not modify files inside `tests/fixtures/` unless fixing the fixture itself
- Do not break the section marker format — downstream tools (including this agent skill) depend on it
- Do not commit with failing tests
