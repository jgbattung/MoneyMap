/**
 * Source-text regression tests for the demo tooling safety layers.
 *
 * These deliberately read `scripts/demo/*.ts` as TEXT and assert on its content rather
 * than exercising behaviour. The invariant being protected is "this code cannot be
 * pointed at another database", and a behavioural test cannot demonstrate that without
 * a production connection - which is the exact thing the invariant exists to prevent.
 * A source-text test is the only honest way to check it in CI.
 *
 * This file lives outside `scripts/demo/` on purpose: it has to contain the forbidden
 * tokens as string literals in order to search for them, and having it inside that
 * directory would make the audit greps over `scripts/demo/` return noise instead of
 * signal.
 *
 * If one of these fails, do not relax the test. The layer it guards is the reason the
 * `.env` in this working copy - which points at a live production database of real
 * financial records - cannot be reached by demo tooling.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DEMO_DIR = join(process.cwd(), "scripts", "demo");

const readDemoFile = (name: string): string => readFileSync(join(DEMO_DIR, name), "utf8");

const demoFileNames = (): string[] =>
  readdirSync(DEMO_DIR).filter((f) => f.endsWith(".ts"));

/** Strips block and line comments so assertions apply to code, not prose about code. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("demo tooling: Safety Layer 1 (no environment resolution)", () => {
  it("has demo scripts to check", () => {
    expect(demoFileNames().length).toBeGreaterThan(0);
  });

  it.each(["connection.ts", "preflight.ts", "seed.ts", "dataset.ts"])(
    "%s never reads an environment variable for a connection string",
    (file) => {
      const code = stripComments(readDemoFile(file));
      expect(code).not.toMatch(/process\.env/);
      expect(code).not.toMatch(/DATABASE_URL/);
      expect(code).not.toMatch(/DIRECT_URL/);
    },
  );

  it("no file in scripts/demo imports an env-file loader", () => {
    for (const file of demoFileNames()) {
      const code = stripComments(readDemoFile(file));
      expect(code, `${file} must not load an env file`).not.toMatch(/dotenv/);
      expect(code, `${file} must not load an env file`).not.toMatch(/loadEnvConfig/);
    }
  });

  it("connection.ts pins the demo database as a hardcoded literal", () => {
    const code = readDemoFile("connection.ts");
    expect(code).toContain(
      'postgresql://postgres:local_dev_password@localhost:5433/money_map_demo',
    );
    // The literal must be the only source of truth: a factory that accepts a URL would
    // reopen exactly the misconfiguration hole this layer closes.
    expect(code).toMatch(/export function createDemoClient\(\): PrismaClient/);
    expect(code).toContain("datasourceUrl: DEMO_DB_URL");
  });

  it("every demo Prisma client is built through createDemoClient", () => {
    for (const file of demoFileNames()) {
      if (file === "connection.ts") continue;
      const code = stripComments(readDemoFile(file));
      expect(code, `${file} must not construct its own PrismaClient`).not.toMatch(
        /new\s+PrismaClient\s*\(/,
      );
    }
  });
});

describe("demo tooling: Safety Layer 2 (marker table)", () => {
  it("the seed asserts the marker before it deletes or writes anything", () => {
    const code = stripComments(readDemoFile("seed.ts"));
    const assertAt = code.indexOf("assertDemoDatabase(prisma)");
    const resetAt = code.indexOf("resetDemoData(prisma)");
    const seedAt = code.indexOf("seedDemoData(prisma)");

    expect(assertAt).toBeGreaterThan(-1);
    expect(resetAt).toBeGreaterThan(-1);
    expect(seedAt).toBeGreaterThan(-1);
    expect(assertAt).toBeLessThan(resetAt);
    expect(assertAt).toBeLessThan(seedAt);
  });

  it("the marker check is read-only, so a refusal cannot damage the wrong database", () => {
    const code = stripComments(readDemoFile("preflight.ts"));
    const assertBody = code.slice(
      code.indexOf("export async function assertDemoDatabase"),
      code.indexOf("export async function createMarkerTable"),
    );
    expect(assertBody).toContain("to_regclass");
    expect(assertBody).not.toMatch(/CREATE |INSERT |UPDATE |DELETE |DROP /i);
    expect(assertBody).not.toMatch(/\$executeRaw/);
  });

  it("the seed never creates the marker table itself", () => {
    // Self-authorising would collapse layer 2 into a no-op.
    const code = stripComments(readDemoFile("seed.ts"));
    expect(code).not.toContain("createMarkerTable");
  });
});

describe("demo tooling: Safety Layer 3 (scoped deletes only)", () => {
  it("has no unscoped deleteMany() anywhere", () => {
    for (const file of demoFileNames()) {
      const code = stripComments(readDemoFile(file));
      expect(code, `${file} has an unscoped deleteMany()`).not.toMatch(
        /deleteMany\s*\(\s*\)/,
      );
    }
  });

  it("every deleteMany in seed.ts is scoped to the demo user", () => {
    const code = stripComments(readDemoFile("seed.ts"));
    const calls = code.match(/deleteMany\s*\(\s*\{[^}]*\}[^}]*\}\s*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(10);
    for (const call of calls) {
      expect(call, `unscoped delete: ${call}`).toMatch(/DEMO_USER_ID/);
    }
  });

  it("does not reuse the unscoped wipe helper from the Playwright utilities", () => {
    for (const file of demoFileNames()) {
      const code = stripComments(readDemoFile(file));
      expect(code, `${file} must not import the E2E wipe helper`).not.toContain(
        "clearDatabase",
      );
      expect(code).not.toMatch(/playwright\/utils\/db/);
    }
  });
});

describe("demo tooling: migrations are never automated", () => {
  it("no demo script shells out to a schema-changing Prisma command", () => {
    for (const file of demoFileNames()) {
      const code = readDemoFile(file);
      expect(code, `${file} must not run migrations`).not.toMatch(/prisma\s+migrate/);
      expect(code, `${file} must not push schema`).not.toMatch(/db\s+push/);
    }
  });

  it("package.json scripts never invoke a schema-changing Prisma command", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    for (const [name, command] of Object.entries(pkg.scripts)) {
      expect(command, `script "${name}" must not run migrations`).not.toMatch(
        /prisma\s+(migrate|db)\b/,
      );
    }
  });

  it("dev:demo and seed:demo point at the demo database only", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["seed:demo"]).toBe("tsx scripts/demo/seed.ts");
    expect(pkg.scripts["dev:demo"]).toContain("money_map_demo");
    expect(pkg.scripts["dev:demo"]).not.toContain("money_map_dev ");
    expect(pkg.scripts.dev).toBe("next dev");
  });
});
