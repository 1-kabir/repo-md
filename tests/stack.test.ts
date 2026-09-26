/**
 * Tests for per-folder stack heuristics.
 */

import { detectStack } from "../src/lib/stack.js";

describe("detectStack", () => {
  it("detects Node+Express+TypeScript", () => {
    const stack = detectStack(
      ["package.json", "tsconfig.json", "index.ts"],
      (name) => {
        if (name === "package.json") {
          return JSON.stringify({
            dependencies: { express: "^4.18.0" },
            devDependencies: { typescript: "^5.0.0" },
          });
        }
        return null;
      },
      "api"
    );
    expect(stack).toBe("TypeScript+Express");
  });

  it("detects TypeScript+Next.js", () => {
    const stack = detectStack(
      ["package.json", "next.config.ts", "tsconfig.json"],
      (name) => {
        if (name === "package.json") {
          return JSON.stringify({
            dependencies: { next: "^14.0.0", react: "^18.0.0" },
            devDependencies: { typescript: "^5.0.0" },
          });
        }
        return null;
      },
      "app"
    );
    expect(stack).toContain("Next.js");
  });

  it("detects Python+Django", () => {
    const stack = detectStack(
      ["manage.py", "requirements.txt", "settings.py"],
      (name) => (name === "requirements.txt" ? "django\npsycopg2\n" : null),
      "backend"
    );
    expect(stack).toBe("Python+Django");
  });

  it("detects Python+FastAPI from requirements.txt", () => {
    const stack = detectStack(
      ["requirements.txt", "main.py"],
      (name) => (name === "requirements.txt" ? "fastapi\nuvicorn\n" : null),
      "app"
    );
    expect(stack).toBe("Python+FastAPI");
  });

  it("detects Go+Gin", () => {
    const stack = detectStack(
      ["go.mod", "main.go"],
      (name) =>
        name === "go.mod"
          ? "module example.com/app\n\nrequire github.com/gin-gonic/gin v1.9.0\n"
          : null,
      "server"
    );
    expect(stack).toBe("Go+Gin");
  });

  it("detects Rust+Axum", () => {
    const stack = detectStack(
      ["Cargo.toml", "src"],
      (name) =>
        name === "Cargo.toml"
          ? '[package]\nname = "server"\n\n[dependencies]\naxum = "0.7"\n'
          : null,
      "server"
    );
    expect(stack).toBe("Rust+Axum");
  });

  it("detects TypeScript+React (no framework config)", () => {
    const stack = detectStack(
      ["package.json", "tsconfig.json", "src"],
      (name) => {
        if (name === "package.json") {
          return JSON.stringify({
            dependencies: { react: "^18.0.0" },
            devDependencies: { typescript: "^5.0.0" },
          });
        }
        return null;
      },
      "frontend"
    );
    expect(stack).toBe("TypeScript+React");
  });

  it("detects Docker from Dockerfile", () => {
    const stack = detectStack(
      ["Dockerfile", "docker-compose.yml"],
      () => null,
      "deploy"
    );
    expect(stack).toBe("Docker");
  });

  it("returns null for unknown folder", () => {
    const stack = detectStack(["README.md", "notes.txt"], () => null, "misc");
    expect(stack).toBeNull();
  });

  it("detects NestJS", () => {
    const stack = detectStack(
      ["package.json", "tsconfig.json"],
      (name) => {
        if (name === "package.json") {
          return JSON.stringify({
            dependencies: { "@nestjs/core": "^10.0.0" },
            devDependencies: { typescript: "^5.0.0" },
          });
        }
        return null;
      },
      "src"
    );
    expect(stack).toBe("TypeScript+NestJS");
  });
});
