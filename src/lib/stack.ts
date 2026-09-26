/**
 * Per-folder stack / tech heuristics.
 * Given a directory's file listing, returns a compact label like
 * "Node+Express", "Python+FastAPI", "Go", "Rust", "React", etc.
 */

/** Files/dirs that signal a given tech. Order matters — first match wins within a tier. */
interface StackSignal {
  file: string;
  label: string;
  /** Optional: must also find this file/dir for the label to apply */
  also?: string;
}

const FRAMEWORK_SIGNALS: StackSignal[] = [
  // JS frameworks (check config files)
  { file: "next.config.js", label: "Next.js" },
  { file: "next.config.mjs", label: "Next.js" },
  { file: "next.config.ts", label: "Next.js" },
  { file: "nuxt.config.ts", label: "Nuxt" },
  { file: "nuxt.config.js", label: "Nuxt" },
  { file: "svelte.config.js", label: "SvelteKit" },
  { file: "svelte.config.ts", label: "SvelteKit" },
  { file: "vite.config.ts", label: "Vite" },
  { file: "vite.config.js", label: "Vite" },
  { file: "remix.config.js", label: "Remix" },
  { file: "astro.config.mjs", label: "Astro" },
  { file: "gatsby-config.js", label: "Gatsby" },
  { file: "angular.json", label: "Angular" },
  { file: "ember-cli-build.js", label: "Ember" },
];

const RUNTIME_SIGNALS: StackSignal[] = [
  // Python frameworks
  { file: "manage.py", label: "Python+Django" },
  { file: "app.py", label: "Python+Flask" },
  { file: "main.py", label: "Python+FastAPI" },
  // Go
  { file: "go.mod", label: "Go" },
  // Rust
  { file: "Cargo.toml", label: "Rust" },
  // Ruby
  { file: "Gemfile", label: "Ruby" },
  { file: "config.ru", label: "Ruby+Rails" },
  // Java / Kotlin / JVM
  { file: "pom.xml", label: "Java+Maven" },
  { file: "build.gradle", label: "Java+Gradle" },
  { file: "build.gradle.kts", label: "Kotlin+Gradle" },
  // PHP
  { file: "composer.json", label: "PHP" },
  // Dart / Flutter
  { file: "pubspec.yaml", label: "Dart+Flutter" },
  // Swift
  { file: "Package.swift", label: "Swift" },
  // .NET
  { file: "*.csproj", label: ".NET" },
  { file: "*.fsproj", label: ".NET+F#" },
];

/** Directory names that strongly signal a layer */
const DIR_SIGNALS: Record<string, string> = {
  __tests__: "tests",
  tests: "tests",
  test: "tests",
  spec: "tests",
  e2e: "e2e",
  cypress: "e2e+Cypress",
  playwright: "e2e+Playwright",
  "src/api": "API",
  api: "API",
  routes: "routes",
  controllers: "controllers",
  models: "models",
  migrations: "migrations",
  prisma: "Prisma",
  drizzle: "Drizzle",
  graphql: "GraphQL",
  grpc: "gRPC",
  proto: "gRPC+Proto",
  docs: "docs",
  storybook: ".storybook",
  ".storybook": "Storybook",
  scripts: "scripts",
  infra: "infra",
  terraform: "Terraform",
  k8s: "k8s",
  helm: "Helm",
  docker: "Docker",
};

/** Detect React usage from package.json deps */
function hasReact(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "react" in deps;
}

function hasExpress(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "express" in deps;
}

function hasFastify(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "fastify" in deps;
}

function hasNestJS(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "@nestjs/core" in deps;
}

function hasTrpc(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "@trpc/server" in deps || "@trpc/client" in deps;
}

function hasPrisma(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "@prisma/client" in deps || "prisma" in deps;
}

function hasDrizzle(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "drizzle-orm" in deps;
}

function hasTypeScript(pkgJson: Record<string, unknown>): boolean {
  const deps = {
    ...((pkgJson.dependencies ?? {}) as Record<string, unknown>),
    ...((pkgJson.devDependencies ?? {}) as Record<string, unknown>),
  };
  return "typescript" in deps || "ts-node" in deps || "tsx" in deps;
}

function hasFastAPI(pyFiles: string[]): boolean {
  return pyFiles.some((f) =>
    f === "main.py" || f === "app.py"
  );
}

/**
 * Detect the stack for a folder.
 * @param entries - list of entry names (files + dirs) in the folder
 * @param readFile - callback to read a file's content, returns null if not available
 * @param folderName - the folder's own name
 */
export function detectStack(
  entries: string[],
  readFile: (name: string) => string | null,
  folderName: string
): string | null {
  const entrySet = new Set(entries);

  // ── Node / JS / TS ──────────────────────────────────────────────────────────
  if (entrySet.has("package.json")) {
    let pkg: Record<string, unknown> = {};
    try {
      const raw = readFile("package.json");
      if (raw) pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // ignore parse errors
    }

    const parts: string[] = [];

    // Runtime label
    const isTS = hasTypeScript(pkg);
    const runtime = isTS ? "TypeScript" : "Node";

    // Framework detection
    let framework = "";
    for (const sig of FRAMEWORK_SIGNALS) {
      if (entrySet.has(sig.file)) {
        framework = sig.label;
        break;
      }
    }
    if (!framework) {
      if (hasNestJS(pkg)) framework = "NestJS";
      else if (hasExpress(pkg)) framework = "Express";
      else if (hasFastify(pkg)) framework = "Fastify";
      else if (hasTrpc(pkg)) framework = "tRPC";
      else if (hasReact(pkg)) framework = "React";
    }

    // ORM / data
    let orm = "";
    if (hasPrisma(pkg)) orm = "Prisma";
    else if (hasDrizzle(pkg)) orm = "Drizzle";

    parts.push(runtime);
    if (framework) parts.push(framework);
    if (orm) parts.push(orm);

    return parts.join("+");
  }

  // ── Python ──────────────────────────────────────────────────────────────────
  if (entrySet.has("requirements.txt") || entrySet.has("pyproject.toml") || entrySet.has("Pipfile") || entrySet.has("setup.py")) {
    // Detect framework from file names
    if (entrySet.has("manage.py")) return "Python+Django";
    const pyFiles = entries.filter((e) => e.endsWith(".py"));
    const raw = readFile("requirements.txt") ?? readFile("pyproject.toml") ?? "";
    if (/fastapi/i.test(raw)) return "Python+FastAPI";
    if (/flask/i.test(raw)) return "Python+Flask";
    if (/django/i.test(raw)) return "Python+Django";
    if (/starlette/i.test(raw)) return "Python+Starlette";
    if (pyFiles.length > 0) return "Python";
    return "Python";
  }

  // ── Go ──────────────────────────────────────────────────────────────────────
  if (entrySet.has("go.mod")) {
    const mod = readFile("go.mod") ?? "";
    if (/gin-gonic\/gin/.test(mod)) return "Go+Gin";
    if (/labstack\/echo/.test(mod)) return "Go+Echo";
    if (/gofiber\/fiber/.test(mod)) return "Go+Fiber";
    return "Go";
  }

  // ── Rust ────────────────────────────────────────────────────────────────────
  if (entrySet.has("Cargo.toml")) {
    const cargo = readFile("Cargo.toml") ?? "";
    if (/axum/.test(cargo)) return "Rust+Axum";
    if (/actix-web/.test(cargo)) return "Rust+Actix";
    if (/rocket/.test(cargo)) return "Rust+Rocket";
    return "Rust";
  }

  // ── Ruby ────────────────────────────────────────────────────────────────────
  if (entrySet.has("Gemfile")) {
    const gemfile = readFile("Gemfile") ?? "";
    if (/rails/.test(gemfile)) return "Ruby+Rails";
    if (/sinatra/.test(gemfile)) return "Ruby+Sinatra";
    return "Ruby";
  }

  // ── PHP ─────────────────────────────────────────────────────────────────────
  if (entrySet.has("composer.json")) {
    const comp = readFile("composer.json") ?? "";
    if (/laravel/.test(comp)) return "PHP+Laravel";
    if (/symfony/.test(comp)) return "PHP+Symfony";
    return "PHP";
  }

  // ── JVM ─────────────────────────────────────────────────────────────────────
  if (entrySet.has("pom.xml")) return "Java+Maven";
  if (entrySet.has("build.gradle.kts")) return "Kotlin+Gradle";
  if (entrySet.has("build.gradle")) return "Java+Gradle";

  // ── .NET ────────────────────────────────────────────────────────────────────
  if (entries.some((e) => e.endsWith(".csproj"))) return ".NET+C#";
  if (entries.some((e) => e.endsWith(".fsproj"))) return ".NET+F#";

  // ── Dart / Flutter ──────────────────────────────────────────────────────────
  if (entrySet.has("pubspec.yaml")) return "Dart+Flutter";

  // ── Swift ───────────────────────────────────────────────────────────────────
  if (entrySet.has("Package.swift")) return "Swift";

  // ── Infrastructure / config only ────────────────────────────────────────────
  if (entrySet.has("Dockerfile") || entrySet.has("docker-compose.yml") || entrySet.has("docker-compose.yaml")) {
    return "Docker";
  }
  if (entries.some((e) => e.endsWith(".tf"))) return "Terraform";
  if (entries.some((e) => e.endsWith(".yaml") || e.endsWith(".yml"))) {
    if (folderName === "k8s" || folderName === "kubernetes") return "k8s";
    if (folderName === "helm" || folderName === "charts") return "Helm";
  }

  // ── Directory name signals ───────────────────────────────────────────────────
  const dirSignal = DIR_SIGNALS[folderName];
  if (dirSignal) return dirSignal;

  return null;
}
