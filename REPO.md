# REPO.md — repo-md

## Structure
```
├── src/                  — source
│   ├── commands/           
│   │   └── init.ts             
│   ├── lib/                  — library utilities
│   │   ├── ignore.ts           
│   │   ├── injector.ts         
│   │   ├── stack.ts            
│   │   ├── walker.ts           
│   │   └── writer.ts           
│   └── cli.ts              
├── tests/                — tests
│   ├── fixtures/           
│   │   └── simple-app/           — TypeScript+Express
│   │       ├── api/                  — TypeScript+Express, API layer
│   │       │   ├── index.ts            
│   │       │   └── package.json        
│   │       ├── frontend/             — TypeScript+Vite
│   │       │   ├── src/                  — source
│   │       │   │   ├── App.tsx             
│   │       │   │   └── main.tsx            
│   │       │   ├── package.json        
│   │       │   └── vite.config.ts      
│   │       ├── src/                  — source
│   │       │   ├── main.ts             
│   │       │   └── utils.ts            
│   │       ├── .gitignore          
│   │       ├── package.json        
│   │       └── README.md           
│   ├── ignore.test.ts      
│   ├── init.test.ts        
│   ├── injector.test.ts    
│   ├── stack.test.ts       
│   └── writer.test.ts      
├── .bobignore          
├── .gitignore          
├── AGENTS.md           
├── CLAUDE.md           
├── jest.config.js      
├── package.json        
├── README.md           
├── REPO.md             
└── SECURITY.MD         
```

## Stack
| Path | Tech |
| --- | --- |
| `.` | TypeScript |
| `tests` | tests |
| `tests/fixtures/simple-app` | TypeScript+Express |
| `tests/fixtures/simple-app/api` | TypeScript+Express |
| `tests/fixtures/simple-app/frontend` | TypeScript+Vite |

## Entry Points
- `src/cli.ts`
- `tests/fixtures/simple-app/api/index.ts`
- `tests/fixtures/simple-app/src/main.ts`
