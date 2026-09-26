# REPO.md — repo-md

<!-- REPO.MD:STRUCTURE:START -->

## Structure
```
├── src/                  — source
│   ├── commands/             — CLI command implementations
│   │   ├── agent.ts            
│   │   ├── init.ts             
│   │   ├── skill.ts            
│   │   ├── stats.ts            
│   │   └── update.ts           
│   ├── lib/                  — shared utilities
│   │   ├── git.ts              
│   │   ├── ignore.ts           
│   │   ├── injector.ts         
│   │   ├── stack.ts            
│   │   ├── walker.ts           
│   │   └── writer.ts           
│   └── cli.ts                — CLI entry point
├── tests/                — tests
│   ├── fixtures/           
│   │   └── simple-app/           — TypeScript+Express
│   │       ├── api/                  — TypeScript+Express, API layer
│   │       │   ├── index.ts              — entry point
│   │       │   └── package.json          — npm manifest + deps
│   │       ├── frontend/             — TypeScript+Vite
│   │       │   ├── src/                  — source
│   │       │   │   ├── App.tsx             
│   │       │   │   └── main.tsx            
│   │       │   ├── package.json          — npm manifest + deps
│   │       │   └── vite.config.ts        — Vite config
│   │       ├── src/                  — source
│   │       │   ├── main.ts               — entry point
│   │       │   └── utils.ts            
│   │       ├── .gitignore          
│   │       ├── package.json          — npm manifest + deps
│   │       └── README.md             — project readme
│   ├── ignore.test.ts      
│   ├── init.test.ts        
│   ├── injector.test.ts    
│   ├── stack.test.ts       
│   └── writer.test.ts      
├── .bobignore          
├── .gitignore          
├── AGENTS.md             — agent instructions
├── CLAUDE.md             — Claude instructions
├── jest.config.js        — Jest config
├── package.json          — npm manifest + deps
├── README.md             — project readme
├── REPO.md               — repo index for agents
├── SECURITY.MD           — security policy
└── SKILL.md              — agent skill definition
```

<!-- REPO.MD:STRUCTURE:END -->

<!-- REPO.MD:STACK:START -->

## Stack
| Path | Tech |
| --- | --- |
| `.` | TypeScript |
| `tests` | tests |
| `tests/fixtures/simple-app` | TypeScript+Express |
| `tests/fixtures/simple-app/api` | TypeScript+Express |
| `tests/fixtures/simple-app/frontend` | TypeScript+Vite |

<!-- REPO.MD:STACK:END -->

<!-- REPO.MD:ENTRYPOINTS:START -->

## Entry Points
- `src/cli.ts`
- `tests/fixtures/simple-app/api/index.ts`
- `tests/fixtures/simple-app/src/main.ts`

<!-- REPO.MD:ENTRYPOINTS:END -->

<!-- REPO.MD:CONVENTIONS:START -->

## Conventions
- **Module system:** ESM (`"type": "module"`) — all imports use `.js` extension even for `.ts` sources
- **Build output:** `dist/` (compiled by `tsc`); only `dist/` is published to npm
- **Naming:** `camelCase` functions, `PascalCase` interfaces, `kebab-case` filenames
- **Command pattern:** each CLI subcommand is a `run<Name>(options)` function in `src/commands/`
- **No external CLI deps:** argument parsing hand-rolled to keep install footprint minimal
- **Tests:** Jest with `ts-jest`, co-located in `tests/` (not beside source)
- **Section markers:** `<!-- REPO.MD:<SECTION>:START/END -->` delimit auto-regenerated blocks
- **Token budget:** 1 800 tokens soft limit (~7 200 chars); trim STRUCTURE depth before cutting data

<!-- REPO.MD:CONVENTIONS:END -->

<!-- REPO.MD:UPDATED:START -->

**Updated:** 2026-09-26 09:48:03 UTC
**Git:** `main` @ `d0c2421`

**Uncommitted changes:**
- Added: `SKILL.md`, `src/commands/agent.ts`, `src/commands/skill.ts`, `src/commands/stats.ts`, `src/commands/update.ts`, `src/lib/git.ts`
- Modified: `README.md`, `REPO.md`, `package.json`, `src/cli.ts`, `src/lib/writer.ts`

**Recent commits:**
- `d0c2421` docs: rewrite README for repo-md; fix cli.ts as entry point in writer
- `dde5de6` feat: implement repo-md init command
- `2dc17fa` Initial commit
<!-- REPO.MD:UPDATED:END -->
