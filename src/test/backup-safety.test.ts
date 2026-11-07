/**
 * Safety tests for the nightly backup and restore drill tooling.
 *
 * Two kinds of test live here:
 *   1. Behavioural tests of the pure helpers in `scripts/backup/drill-lib.ts` (the target
 *      guard, manifest parsing, row-count comparison, checksum check).
 *   2. Source-text tests over `scripts/backup/*.ts` and the workflow YAML. The invariant
 *      "the drill cannot be pointed at another database, and the nightly workflow cannot
 *      be triggered from a fork" cannot be demonstrated by a behavioural test without a
 *      production connection, which is exactly what the invariant forbids. Reading the
 *      source as text is the only honest check.
 *
 * This file lives outside `scripts/backup/` on purpose: it has to contain the forbidden
 * tokens as string literals in order to search for them, so keeping it in that directory
 * would make audit greps over `scripts/backup/` return noise instead of signal.
 *
 * If one of these fails, do not relax the test. The rule it guards is the reason a
 * read-only production credential in a public repo and a local restore drill are safe.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  DRILL_TARGET,
  assertDrillTarget,
  assertSha256,
  compareCounts,
  parseCountsTsv,
  parseManifest,
} from "../../scripts/backup/drill-lib";

const BACKUP_DIR = join(process.cwd(), "scripts", "backup");
const WORKFLOW = join(process.cwd(), ".github", "workflows", "backup-production.yml");

/** Strips block and line comments so assertions apply to code, not prose about code. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Strips full-line YAML / shell comments. */
const stripHashComments = (source: string): string => source.replace(/^\s*#.*$/gm, "");

const tsFiles = (): string[] => readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".ts"));

const validManifest = () => ({
  createdAtUtc: "2026-11-07T18:00:00Z",
  serverVersionNum: 170002,
  pgMajor: 17,
  pgDumpVersion: "pg_dump (PostgreSQL) 17.2",
  sha256: "a".repeat(64),
  dumpBytes: 1234,
  tables: { user: 1, _prisma_migrations: 22 },
  runId: "1",
});

describe("restore drill: target guard", () => {
  it("accepts exactly the pinned local target", () => {
    expect(() => assertDrillTarget({ ...DRILL_TARGET })).not.toThrow();
  });

  it("pins the local container, in-network port and drill database", () => {
    expect(DRILL_TARGET).toEqual({
      container: "money_map_postgres",
      host: "localhost",
      port: "5432",
      database: "money_map_restore_drill",
      user: "postgres",
    });
  });

  it.each([
    ["container", "some_other_container"],
    ["host", "db.example.supabase.co"],
    ["port", "5433"],
    ["port", "6543"],
    ["database", "money_map_dev"],
    ["database", "postgres"],
    ["user", "moneymap_readonly"],
  ] as const)("rejects a wrong %s (%s)", (field, value) => {
    expect(() => assertDrillTarget({ ...DRILL_TARGET, [field]: value })).toThrow(/Refusing to restore/);
  });

  it("names the failing field but never echoes the offending value", () => {
    try {
      assertDrillTarget({ ...DRILL_TARGET, host: "secret-host.example.com" });
      throw new Error("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"host"');
      expect(message).not.toContain("secret-host.example.com");
    }
  });
});

describe("restore drill: manifest parsing", () => {
  it("parses a valid manifest", () => {
    const m = parseManifest(JSON.stringify(validManifest()));
    expect(m.pgMajor).toBe(17);
    expect(m.tables._prisma_migrations).toBe(22);
  });

  it.each([
    ["not JSON", "{nope"],
    ["not an object", "[]"],
    ["unsupported major", JSON.stringify({ ...validManifest(), pgMajor: 14 })],
    ["malformed sha256", JSON.stringify({ ...validManifest(), sha256: "xyz" })],
    ["empty tables", JSON.stringify({ ...validManifest(), tables: {} })],
    ["negative count", JSON.stringify({ ...validManifest(), tables: { user: -1 } })],
    ["non-integer count", JSON.stringify({ ...validManifest(), tables: { user: 1.5 } })],
    ["bad date", JSON.stringify({ ...validManifest(), createdAtUtc: "yesterday" })],
  ])("rejects a manifest that is %s", (_name, text) => {
    expect(() => parseManifest(text)).toThrow();
  });
});

describe("restore drill: row counts", () => {
  it("parses the tab-separated row-counts output", () => {
    expect(parseCountsTsv("user\t1\n_prisma_migrations\t22\n")).toEqual({ user: 1, _prisma_migrations: 22 });
  });

  it("rejects output with an unexpected shape", () => {
    expect(() => parseCountsTsv("user\tmany\n")).toThrow();
    expect(() => parseCountsTsv("user\t1\textra\n")).toThrow();
  });

  it("returns no mismatches when counts agree", () => {
    expect(compareCounts({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([]);
  });

  it("reports a differing count", () => {
    expect(compareCounts({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(["b: manifest 2, restored 3"]);
  });

  it("reports a table missing from the restore", () => {
    const result = compareCounts({ a: 1, b: 2 }, { a: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^b: missing from the restore/);
  });

  it("reports an extra table in the restore", () => {
    const result = compareCounts({ a: 1 }, { a: 1, c: 5 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^c: in the restore but not in the manifest/);
  });
});

describe("restore drill: checksum", () => {
  it("accepts a matching checksum, ignoring case", () => {
    expect(() => assertSha256("ABCDEF", "abcdef")).not.toThrow();
  });

  it("rejects a mismatched checksum", () => {
    expect(() => assertSha256("a".repeat(64), "b".repeat(64))).toThrow(/checksum/);
  });
});

describe("backup tooling: source-text safety", () => {
  it("has TypeScript files to check", () => {
    expect(tsFiles()).toEqual(expect.arrayContaining(["drill-lib.ts", "restore-drill.ts"]));
  });

  it("no backup script reads the environment, loads an env file, or builds a Prisma client", () => {
    for (const file of tsFiles()) {
      const code = stripComments(readFileSync(join(BACKUP_DIR, file), "utf8"));
      expect(code, `${file} must not read process.env`).not.toMatch(/process\.env/);
      expect(code, `${file} must not load an env file`).not.toMatch(/dotenv/);
      expect(code, `${file} must not load an env file`).not.toMatch(/loadEnvConfig/);
      expect(code, `${file} must not use Prisma`).not.toMatch(/PrismaClient/);
      expect(code, `${file} must not mention DATABASE_URL`).not.toMatch(/DATABASE_URL|DIRECT_URL/);
    }
  });

  it("no backup script names production hosts", () => {
    for (const file of tsFiles()) {
      const code = stripComments(readFileSync(join(BACKUP_DIR, file), "utf8"));
      expect(code, `${file} must not reference supabase`).not.toMatch(/supabase/i);
      expect(code, `${file} must not reference a pooler`).not.toMatch(/pooler/i);
    }
  });

  it("no backup script uses --clean (fresh databases only)", () => {
    for (const file of tsFiles()) {
      const code = stripComments(readFileSync(join(BACKUP_DIR, file), "utf8"));
      expect(code, `${file} must not use --clean`).not.toMatch(/--clean/);
    }
  });

  it("the drill never goes through a shell", () => {
    const code = stripComments(readFileSync(join(BACKUP_DIR, "restore-drill.ts"), "utf8"));
    expect(code).not.toMatch(/\bexecSync\s*\(/);
    expect(code).not.toMatch(/\bexec\s*\(/);
    expect(code).not.toMatch(/shell\s*:\s*true/);
  });

  it("the drill pins the target to the drill-lib literal and joins the local container", () => {
    const code = stripComments(readFileSync(join(BACKUP_DIR, "restore-drill.ts"), "utf8"));
    expect(code).toContain("assertDrillTarget(DRILL_TARGET)");
    expect(code).toContain("container:${t.container}");
  });
});

describe("backup workflow: source-text safety", () => {
  const raw = () => readFileSync(WORKFLOW, "utf8");
  const code = () => stripHashComments(raw());

  it("triggers only on schedule and manual dispatch", () => {
    const text = code();
    expect(text).not.toMatch(/pull_request/);
    expect(text).not.toMatch(/\bpush:/);
    expect(text).toMatch(/^\s*schedule:/m);
    expect(text).toMatch(/^\s*workflow_dispatch:/m);
  });

  it("never mentions pull_request even in comments, other than to forbid it", () => {
    const comments = raw()
      .split("\n")
      .filter((l) => /^\s*#/.test(l) && /pull_request/.test(l));
    for (const line of comments) {
      expect(line).toMatch(/never/i);
    }
  });

  it("has read-only repository permissions", () => {
    expect(code()).toMatch(/^permissions:\s*\n\s+contents: read\s*$/m);
  });

  it("keeps artifacts for 90 days and fails if nothing is uploaded", () => {
    expect(code()).toContain("retention-days: 90");
    expect(code()).toContain("if-no-files-found: error");
  });

  it("uploads only the upload directory, never the work directory", () => {
    const text = code();
    const paths = [...text.matchAll(/^\s+path:\s*(.+)$/gm)].map((m) => m[1].trim());
    expect(paths).toEqual(["${{ runner.temp }}/upload/"]);
  });

  it("never enables shell tracing", () => {
    expect(code()).not.toMatch(/set\s+-[a-z]*x/);
    expect(code()).not.toMatch(/bash\s+-[a-z]*x/);
  });

  it("never echoes the secret or passes it on a command line", () => {
    const text = code();
    expect(text).not.toMatch(/echo[^\n]*(BACKUP_DATABASE_URL|PGURL)/);
    // The secret is only ever bound to an env variable, never interpolated into a run block.
    const runBlocks = [...text.matchAll(/run:\s*[|>]?[\s\S]*?(?=\n\s{6}- |\n\S|$)/g)].map((m) => m[0]);
    for (const block of runBlocks) {
      expect(block).not.toMatch(/\$\{\{\s*secrets\./);
    }
  });

  it("uses the read-only secret only in step-level env", () => {
    const text = code();
    const uses = [...text.matchAll(/\$\{\{\s*secrets\.([A-Z_]+)\s*\}\}/g)].map((m) => m[1]);
    expect(new Set(uses)).toEqual(new Set(["BACKUP_DATABASE_URL"]));
  });

  it("does not use a services block or --clean for the restore", () => {
    expect(code()).not.toMatch(/^\s*services:/m);
    expect(code()).not.toMatch(/--clean/);
  });

  it("encrypts before upload and asserts the age header", () => {
    expect(code()).toContain("age -R .github/backup-recipient.txt");
    expect(code()).toContain("age-encryption.org/v1");
  });
});
