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
├── jest.config.js        — Jest config
├── package.json          — npm manifest + deps
├── README.md             — project readme
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

<!-- REPO.MD:CONVENTIONS:END -->
