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

import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  DRILL_CONTAINER_PREFIX,
  DRILL_DATABASE,
  DRILL_LABEL,
  assertDrillContainer,
  assertSha256,
  compareCounts,
  drillContainerName,
  parseCountsTsv,
  parseManifest,
} from "../../scripts/backup/drill-lib";

const BACKUP_DIR = join(process.cwd(), "scripts", "backup");
const DB_DIR = join(process.cwd(), "scripts", "db");
const WORKFLOW = join(process.cwd(), ".github", "workflows", "backup-production.yml");
const RECIPIENT = join(process.cwd(), ".github", "backup-recipient.txt");

/** Strips block and line comments so assertions apply to code, not prose about code. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Strips full-line YAML / shell comments. */
const stripHashComments = (source: string): string => source.replace(/^\s*#.*$/gm, "");

/** Strips SQL block and line comments. */
const stripSqlComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");

/** Replaces SQL string literals with '' so keyword checks see only code. */
const stripSqlLiterals = (source: string): string => source.replace(/'(?:[^']|'')*'/g, "''");

const tsFiles = (): string[] => readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".ts"));
const shFiles = (): string[] => readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sh"));

/**
 * Runs one of the shell guards with bash, feeding the script on stdin with carriage
 * returns removed so a CRLF checkout on Windows behaves like the LF file the runner gets.
 */
const runShell = (script: string, args: string[], env: Record<string, string> = {}) => {
  const source = readFileSync(join(BACKUP_DIR, script), "utf8").replace(/\r/g, "");
  const result = spawnSync("bash", ["-s", "--", ...args], {
    input: source,
    encoding: "utf8",
    cwd: process.cwd(),
    env: { ...process.env, GITHUB_ACTIONS: "", BACKUP_DATABASE_URL: "", ...env },
  });
  if (result.error) throw result.error;
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
};

/** A fake but well-formed Session pooler URL for the read-only login. Never a real one. */
const FAKE = {
  ref: "abcdefghijklmnopqrst",
  password: "Fakepass0123456789abcdefghijklmnop",
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
};
const fakeUrl = (overrides: Partial<{ scheme: string; user: string; password: string; host: string; port: string; db: string; query: string }> = {}) => {
  const o = {
    scheme: "postgresql",
    user: `moneymap_readonly.${FAKE.ref}`,
    password: FAKE.password,
    host: FAKE.host,
    port: "5432",
    db: "postgres",
    query: "?sslmode=require",
    ...overrides,
  };
  return `${o.scheme}://${o.user}${o.password === "" ? "" : `:${o.password}`}@${o.host}${o.port === "" ? "" : `:${o.port}`}/${o.db}${o.query}`;
};

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

describe("restore drill: throwaway container guard", () => {
  const NAME = "moneymap-drill-0123456789abcdef";
  const good = () => ({
    name: `/${NAME}`,
    labels: { "moneymap.drill": "1" },
    networkMode: "none",
    image: "postgres:17-alpine",
  });
  const expected = { name: NAME, major: 17 };

  it("pins the drill database, container prefix and label", () => {
    expect(DRILL_DATABASE).toBe("money_map_restore_drill");
    expect(DRILL_CONTAINER_PREFIX).toBe("moneymap-drill-");
    expect(DRILL_LABEL).toBe("moneymap.drill=1");
  });

  it("builds the container name from a short lowercase id", () => {
    expect(drillContainerName("0123456789abcdef")).toBe(NAME);
  });

  it.each(["", "short", "UPPERCASE12345678", "has-dash-12345678", "has space 12345", "a".repeat(33), "../etc/passwd"])(
    "rejects the random id %j",
    (random) => {
      expect(() => drillContainerName(random)).toThrow(/random id/);
    },
  );

  it("accepts exactly the container the drill started (docker reports a leading slash)", () => {
    expect(() => assertDrillContainer(good(), expected)).not.toThrow();
    expect(() => assertDrillContainer({ ...good(), name: NAME }, expected)).not.toThrow();
  });

  it.each([
    ["name", { name: "/moneymap-drill-ffffffffffffffff" }],
    ["name", { name: "/money_map_postgres" }],
    ["name", { name: "/some_other_container" }],
    ["label", { labels: {} }],
    ["label", { labels: { "moneymap.drill": "0" } }],
    ["networkMode", { networkMode: "bridge" }],
    ["networkMode", { networkMode: "host" }],
    ["networkMode", { networkMode: "container:money_map_postgres" }],
    ["image", { image: "postgres:15-alpine" }],
    ["image", { image: "postgres:17" }],
  ] as const)("rejects a wrong %s", (field, override) => {
    expect(() => assertDrillContainer({ ...good(), ...override }, expected)).toThrow(
      new RegExp(`field "${field}"`),
    );
  });

  it("rejects money_map_postgres even if the caller expects it", () => {
    expect(() =>
      assertDrillContainer({ ...good(), name: "/money_map_postgres" }, { name: "money_map_postgres", major: 17 }),
    ).toThrow(/field "name"/);
  });

  it("rejects an image major that differs from the backup's major", () => {
    expect(() => assertDrillContainer(good(), { name: NAME, major: 16 })).toThrow(/field "image"/);
  });

  it("names the failing field but never echoes the offending value", () => {
    try {
      assertDrillContainer({ ...good(), image: "secret-registry.example.com/postgres:17-alpine" }, expected);
      throw new Error("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('"image"');
      expect(message).not.toContain("secret-registry.example.com");
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

  it("the drill restores only into its own no-network throwaway container, guarded before the restore", () => {
    const code = stripComments(readFileSync(join(BACKUP_DIR, "restore-drill.ts"), "utf8"));
    expect(code).toContain("drillContainerName(");
    expect(code).toContain("assertDrillContainer(");
    expect(code.indexOf("assertDrillContainer(")).toBeLessThan(code.indexOf('"pg_restore"'));
    expect(code).toMatch(/"--network",\s*"none"/);
    expect(code).toContain("DRILL_LABEL");
    expect(code).toMatch(/"rm",\s*"-f"/);
  });

  it("no backup script touches the compose database, joins another container's network, or uses port 5433", () => {
    for (const file of tsFiles()) {
      const code = stripComments(readFileSync(join(BACKUP_DIR, file), "utf8"));
      // The guard in drill-lib may name money_map_postgres only to reject it.
      const withoutRejection = file === "drill-lib.ts" ? code.replace(/name === "money_map_postgres"/g, "") : code;
      expect(withoutRejection, `${file} must not reference money_map_postgres`).not.toMatch(/money_map_postgres/);
      expect(code, `${file} must not use container: networking`).not.toMatch(/container:/);
      expect(code, `${file} must not reference host port 5433`).not.toMatch(/5433/);
      expect(code, `${file} must not run dropdb`).not.toMatch(/dropdb/);
    }
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

describe("restore drill: helper edge cases", () => {
  it.each([
    ["tables is null", { ...validManifest(), tables: null }],
    ["tables is an array", { ...validManifest(), tables: [1, 2] }],
    ["sha256 is missing", { ...validManifest(), sha256: undefined }],
    ["pgMajor is a string", { ...validManifest(), pgMajor: "17" }],
    ["createdAtUtc is missing", { ...validManifest(), createdAtUtc: undefined }],
    ["a count is a string", { ...validManifest(), tables: { user: "1" } }],
  ])("rejects a manifest where %s", (_name, manifest) => {
    expect(() => parseManifest(JSON.stringify(manifest))).toThrow();
  });

  it("accepts every supported major and defaults optional fields", () => {
    for (const pgMajor of [15, 16, 17, 18]) {
      const m = parseManifest(
        JSON.stringify({ createdAtUtc: "2026-11-07T18:00:00Z", pgMajor, sha256: "0".repeat(64), tables: { a: 0 } }),
      );
      expect(m).toMatchObject({ pgMajor, serverVersionNum: 0, pgDumpVersion: "", dumpBytes: 0, runId: "", tables: { a: 0 } });
    }
  });

  it("parses CRLF output and ignores blank lines", () => {
    expect(parseCountsTsv("a\t1\r\n\r\nb\t0\r\n")).toEqual({ a: 1, b: 0 });
    expect(parseCountsTsv("")).toEqual({});
  });

  it("rejects a row with no table name or a negative count", () => {
    expect(() => parseCountsTsv("\t5\n")).toThrow();
    expect(() => parseCountsTsv("a\t-1\n")).toThrow();
  });

  it("treats a zero-row table as present, and reports every difference in name order", () => {
    expect(compareCounts({ a: 0 }, { a: 0 })).toEqual([]);
    expect(compareCounts({ b: 1, a: 1, z: 1 }, { a: 2, b: 3, y: 4 })).toEqual([
      "a: manifest 1, restored 2",
      "b: manifest 1, restored 3",
      "z: missing from the restore (manifest has 1)",
      "y: in the restore but not in the manifest (4)",
    ]);
  });

  it("never echoes either checksum in the mismatch error", () => {
    const actual = "1".repeat(64);
    const expected = "2".repeat(64);
    let message = "";
    try {
      assertSha256(actual, expected);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/checksum/);
    expect(message).not.toContain(actual);
    expect(message).not.toContain(expected);
  });
});

describe("backup recipient key", () => {
  const fakeKey = "age1" + "q".repeat(58);
  const dir = mkdtempSync(join(tmpdir(), "mm-recipient-test-"));
  const file = (name: string, content: string) => {
    const path = join(dir, name);
    writeFileSync(path, content);
    return path;
  };
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("the committed recipient is exactly one real age public key, not the placeholder", () => {
    const lines = readFileSync(RECIPIENT, "utf8").replace(/\r?\n$/, "").split(/\r?\n/);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^age1[0-9a-z]{58}$/);
    expect(lines[0]).not.toBe("REPLACE_WITH_AGE_PUBLIC_KEY");
  });

  it("check-recipient.sh accepts the committed file by default", () => {
    const r = runShell("check-recipient.sh", []);
    expect(r.out).toContain("check-recipient: ok");
    expect(r.code).toBe(0);
  });

  it("check-recipient.sh accepts a well-formed key with or without a trailing newline", () => {
    expect(runShell("check-recipient.sh", [file("ok-nl.txt", `${fakeKey}\n`)]).code).toBe(0);
    expect(runShell("check-recipient.sh", [file("ok-no-nl.txt", fakeKey)]).code).toBe(0);
  });

  it.each([
    ["the placeholder", "REPLACE_WITH_AGE_PUBLIC_KEY\n", /placeholder/],
    ["two keys", `${fakeKey}\n${fakeKey}\n`, /exactly one line/],
    ["an empty file", "", /exactly one line/],
    ["a short key", "age1" + "q".repeat(57) + "\n", /valid age public key/],
    ["an uppercase key", "age1" + "Q".repeat(58) + "\n", /valid age public key/],
    ["a secret key", "AGE-SECRET-KEY-1" + "Q".repeat(58) + "\n", /valid age public key/],
    ["a CRLF line ending", `${fakeKey}\r\n`, /valid age public key/],
    ["leading whitespace", ` ${fakeKey}\n`, /valid age public key/],
  ])("check-recipient.sh rejects %s", (name, content, message) => {
    const r = runShell("check-recipient.sh", [file(`${name.replace(/\W+/g, "-")}.txt`, content)]);
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(message);
  });

  it("check-recipient.sh rejects a missing file", () => {
    const r = runShell("check-recipient.sh", [join(dir, "does-not-exist.txt")]);
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/not found/);
  });
});

describe("source URL guard (assert-source-url.sh)", () => {
  it.each([
    ["postgresql scheme with sslmode", fakeUrl()],
    ["postgres scheme", fakeUrl({ scheme: "postgres" })],
    ["no query", fakeUrl({ query: "" })],
    ["percent-encoded password characters", fakeUrl({ password: "abc%2Fdef-ghi_jkl.mno~pqr" })], // ggignore
  ])("accepts the read-only Session pooler login (%s)", (_name, url) => {
    const r = runShell("assert-source-url.sh", [], { BACKUP_DATABASE_URL: url });
    expect(r.out).toContain("assert-source-url: ok");
    expect(r.code).toBe(0);
    expect(r.out).not.toContain("::add-mask::");
  });

  it.each([
    ["empty", "", "BACKUP_DATABASE_URL is empty"],
    ["garbage", "not a url", "url shape"],
    ["http scheme", fakeUrl({ scheme: "http" }), "scheme"],
    ["the postgres superuser", fakeUrl({ user: `postgres.${FAKE.ref}` }), "user"],
    ["the role without a project ref", fakeUrl({ user: "moneymap_readonly" }), "user"],
    ["an uppercase project ref", fakeUrl({ user: `moneymap_readonly.${FAKE.ref.toUpperCase()}` }), "user"],
    ["a user with a suffix", fakeUrl({ user: `moneymap_readonly.${FAKE.ref}x.y` }), "user"],
    ["no password", fakeUrl({ password: "" }), "password"],
    ["a password with symbols", fakeUrl({ password: "abc$def" }), "password"], // ggignore
    ["the direct host", fakeUrl({ host: `db.${FAKE.ref}.supabase.co` }), "host"],
    ["a host suffix trick", fakeUrl({ host: `${FAKE.host}.evil.example` }), "host"],
    ["a host prefix trick", fakeUrl({ host: `evil.${FAKE.host}` }), "host"],
    ["the transaction pooler port", fakeUrl({ port: "6543" }), "port"],
    ["no port", fakeUrl({ port: "" }), "port"],
    ["another database", fakeUrl({ db: "money_map" }), "database"],
    ["an extra path segment", fakeUrl({ db: "postgres/x" }), "database"],
    ["sslmode disabled", fakeUrl({ query: "?sslmode=disable" }), "query"],
    ["a host override parameter", fakeUrl({ query: "?host=evil.example" }), "query"],
    ["an extra parameter", fakeUrl({ query: "?sslmode=require&options=-c" }), "query"],
  ])("rejects %s and names only the failed check", (_name, url, check) => {
    const r = runShell("assert-source-url.sh", [], { BACKUP_DATABASE_URL: url });
    expect(r.code).not.toBe(0);
    expect(r.out).toContain(`check failed: ${check}`);
    expect(r.out).not.toContain(FAKE.password);
    expect(r.out).not.toContain(FAKE.ref);
    expect(r.out).not.toContain("pooler.supabase.com:");
    if (url !== "") expect(r.out).not.toContain(url);
  });

  it("rejects an unset variable", () => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => k !== "BACKUP_DATABASE_URL" && k !== "GITHUB_ACTIONS"),
    ) as NodeJS.ProcessEnv;
    const result = spawnSync("bash", ["-s"], {
      input: readFileSync(join(BACKUP_DIR, "assert-source-url.sh"), "utf8").replace(/\r/g, ""),
      encoding: "utf8",
      env,
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("BACKUP_DATABASE_URL is empty");
  });

  it("in GitHub Actions, masks the project ref and pooler host, never the password", () => {
    const r = runShell("assert-source-url.sh", [], { BACKUP_DATABASE_URL: fakeUrl(), GITHUB_ACTIONS: "true" });
    expect(r.code).toBe(0);
    const masks = r.out.split(/\r?\n/).filter((l) => l.startsWith("::add-mask::"));
    expect(masks).toEqual([`::add-mask::${FAKE.ref}`, `::add-mask::${FAKE.host}`]);
    expect(r.out).not.toContain(FAKE.password);
  });
});

describe("backup shell scripts: source-text safety", () => {
  it("has the three shell scripts", () => {
    expect(shFiles().sort()).toEqual(["assert-source-url.sh", "check-recipient.sh", "restore-check.sh"]);
  });

  it.each(["assert-source-url.sh", "check-recipient.sh", "restore-check.sh"])(
    "%s uses bash strict mode and never traces or uses --clean",
    (file) => {
      const raw = readFileSync(join(BACKUP_DIR, file), "utf8");
      const code = stripHashComments(raw);
      expect(raw.startsWith("#!/usr/bin/env bash")).toBe(true);
      expect(code).toMatch(/^set -euo pipefail\r?$/m);
      expect(code).not.toMatch(/set\s+-[a-z]*x/);
      expect(code).not.toMatch(/--clean/);
    },
  );

  it.each(["assert-source-url.sh", "check-recipient.sh"])(
    "%s pins the C locale so [a-z] never matches uppercase",
    (file) => {
      const code = stripHashComments(readFileSync(join(BACKUP_DIR, file), "utf8"));
      expect(code.indexOf("export LC_ALL=C")).toBeGreaterThan(code.indexOf("set -euo pipefail"));
      expect(code.indexOf("export LC_ALL=C")).toBeLessThan(code.indexOf("=~"));
    },
  );

  it("assert-source-url.sh never prints the URL or any part of the secret except masks", () => {
    const code = stripHashComments(readFileSync(join(BACKUP_DIR, "assert-source-url.sh"), "utf8"));
    const printing = code.split(/\r?\n/).filter((l) => /\b(echo|printf)\b/.test(l));
    expect(printing.length).toBeGreaterThan(0);
    for (const line of printing) {
      expect(line).not.toMatch(/\$\{?(url|password|query|path|scheme|BACKUP_DATABASE_URL)\b/);
      if (/\$\{?(user|host)\b/.test(line)) expect(line).toContain("::add-mask::");
    }
  });

  it("restore-check.sh always removes its container and restores strictly into a fresh server", () => {
    const code = stripHashComments(readFileSync(join(BACKUP_DIR, "restore-check.sh"), "utf8"));
    expect(code).toMatch(/trap cleanup EXIT/);
    expect(code).toMatch(/docker rm -f "\$name"/);
    expect(code).toMatch(/pg_restore --exit-on-error --no-owner --no-privileges/);
    expect(code).toMatch(/ON_ERROR_STOP=1/);
    expect(code).toMatch(/_prisma_migrations/);
    // Never connects anywhere except the throwaway container it started.
    expect(code).not.toMatch(/PGURL|BACKUP_DATABASE_URL|--network/);
  });

  it("restore-check.sh rejects a bad argument count and an unsupported major before starting anything", () => {
    expect(runShell("restore-check.sh", []).code).toBe(2);
    const r = runShell("restore-check.sh", ["/nonexistent.dump", "14", "/nonexistent.tsv"]);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/unsupported postgres major: 14/);
  });
});

describe("backup role SQL: source-text safety", () => {
  const read = (name: string) => readFileSync(join(DB_DIR, name), "utf8");

  it("create-backup-role.sql still ships the password placeholder and no real password", () => {
    const raw = read("create-backup-role.sql");
    expect(raw).toContain("v_password text := 'REPLACE_WITH_GENERATED_PASSWORD';");
    // The guard compares against a split literal so a replace-all cannot neutralise it.
    expect(raw).toContain("IF v_password = 'REPLACE_WITH_' || 'GENERATED_PASSWORD' THEN");
    const literals = [...stripSqlComments(raw).matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
    expect(literals.length).toBeGreaterThan(0);
    for (const literal of literals) {
      expect(literal).not.toMatch(/^[A-Za-z0-9]{32,}$/);
    }
  });

  it("create-backup-role.sql is one atomic DO block with the guards and a SELECT-only grant set", () => {
    const code = stripSqlComments(read("create-backup-role.sql")).trim();
    expect(code.startsWith("DO $$")).toBe(true);
    expect(code.endsWith("$$;")).toBe(true);
    expect(code.match(/\$\$/g)).toHaveLength(2);
    expect(code).toMatch(/already exists/);
    expect(code).toMatch(/length\(v_password\) < 32/);
    expect(code).toMatch(/current_user <> 'postgres'/);
    expect(code).toMatch(/pg_get_userbyid\(c\.relowner\) <> 'postgres'/);
    expect(code).toMatch(
      /CREATE ROLE moneymap_readonly LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD %L/,
    );
    expect(code).toMatch(/ALTER ROLE moneymap_readonly SET default_transaction_read_only = on;/);
    const grants = [...code.matchAll(/\bGRANT\s+(\w+)/g)].map((m) => m[1]);
    expect(grants.length).toBeGreaterThan(0);
    for (const privilege of grants) expect(["USAGE", "SELECT"]).toContain(privilege);
    // No role memberships ("GRANT some_role TO moneymap_readonly").
    expect(code).not.toMatch(/\bGRANT\s+\w+\s+TO\b/);
  });

  it("verify-backup-role.sql is a single read-only SELECT that names the role literally", () => {
    const code = stripSqlComments(read("verify-backup-role.sql")).trim();
    expect(code).toMatch(/^WITH\b/);
    expect(code.match(/;/g)).toHaveLength(1);
    expect(code.endsWith(";")).toBe(true);
    expect(code).toContain("rolname = 'moneymap_readonly'");
    expect(code).not.toMatch(/current_user/);
    expect(stripSqlLiterals(code)).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|DO|COPY|SET)\b/i,
    );
  });

  it("verify-backup-role.sql returns ok as the last column (the workflow reads the last field)", () => {
    const code = stripSqlComments(read("verify-backup-role.sql"));
    expect(code).toMatch(/SELECT\s+checks\.\*,[\s\S]*\)\s+AS ok\s+FROM checks;\s*$/);
    for (const check of ["write_grants", "create_on_schemas", "missing_select"]) {
      expect(code).toContain(`cardinality(${check}) = 0`);
    }
  });

  it("drop-backup-role.sql is one atomic DO block that is a no-op when the role is absent", () => {
    const code = stripSqlComments(read("drop-backup-role.sql")).trim();
    expect(code.startsWith("DO $$")).toBe(true);
    expect(code.endsWith("$$;")).toBe(true);
    expect(code).toMatch(/RAISE NOTICE[^;]*;\s*RETURN;/);
    expect(code).toMatch(/DROP ROLE moneymap_readonly;/);
    expect(code).not.toMatch(/\b(DROP|TRUNCATE|DELETE FROM)\s+(TABLE|SCHEMA)\b/i);
  });

  it("row-counts.sql is a single read-only SELECT over public base tables", () => {
    const code = stripSqlComments(readFileSync(join(BACKUP_DIR, "row-counts.sql"), "utf8")).trim();
    expect(code).toMatch(/^SELECT\b/);
    expect(code.match(/;/g)).toHaveLength(1);
    expect(code).toContain("table_schema = 'public'");
    expect(code).toContain("table_type = 'BASE TABLE'");
    expect(stripSqlLiterals(code)).not.toMatch(
      /\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|DO|COPY)\b/i,
    );
  });
});

describe("backup workflow: structure", () => {
  const code = () => stripHashComments(readFileSync(WORKFLOW, "utf8"));
  const at = (needle: string) => {
    const index = code().indexOf(needle);
    expect(index, `workflow should contain ${needle}`).toBeGreaterThanOrEqual(0);
    return index;
  };

  it("runs nightly at 18:00 UTC and never cancels a backup in progress", () => {
    expect(code()).toMatch(/cron: '0 18 \* \* \*'/);
    expect(code()).toMatch(/^concurrency:\s*\n\s+group: backup-production\s*\n\s+cancel-in-progress: false\s*$/m);
    expect(code()).toMatch(/timeout-minutes: 20/);
  });

  it("does not persist the checkout token", () => {
    expect(code()).toMatch(/uses: actions\/checkout@v4\s*\n\s+with:\s*\n\s+persist-credentials: false/);
  });

  it("binds the secret only as a step-level env variable", () => {
    const lines = code()
      .split(/\r?\n/)
      .filter((l) => l.includes("secrets."));
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(line).toMatch(/^ {10}(PGURL|BACKUP_DATABASE_URL): \$\{\{ secrets\.BACKUP_DATABASE_URL \}\}\s*$/);
    }
  });

  it("checks the recipient and the URL before anything connects", () => {
    const firstConnection = at("-e PGURL");
    expect(at("bash scripts/backup/check-recipient.sh")).toBeLessThan(firstConnection);
    expect(at("bash scripts/backup/assert-source-url.sh")).toBeLessThan(firstConnection);
  });

  it("proves the login is read-only before dumping", () => {
    expect(at("< scripts/db/verify-backup-role.sql")).toBeLessThan(at("pg_dump --dbname"));
    expect(code()).toContain('if [ "$who" != "moneymap_readonly" ]');
    expect(code()).toContain('if [ "${result##*|}" != "t" ]');
  });

  it("dumps into the work directory, proves the restore, then encrypts, then uploads", () => {
    expect(code()).toMatch(
      /pg_dump --dbname="\$PGURL" -Fc --schema=public --no-owner --no-privileges' > "\$RUNNER_TEMP\/work\/backup\.dump"/,
    );
    const restore = at("bash scripts/backup/restore-check.sh");
    const encrypt = at("age -R .github/backup-recipient.txt");
    const upload = at("uses: actions/upload-artifact@v4");
    expect(at("pg_dump --dbname")).toBeLessThan(restore);
    expect(restore).toBeLessThan(encrypt);
    expect(encrypt).toBeLessThan(upload);
  });

  it("never writes the plaintext dump into the upload directory", () => {
    for (const line of code().split(/\r?\n/)) {
      if (/upload/.test(line) && /backup\.dump/.test(line)) {
        expect(line).toMatch(/upload\/backup\.dump\.age/);
      }
    }
    expect(code()).toMatch(/shred -u "\$RUNNER_TEMP\/work\/backup\.dump"/);
  });

  it("names the artifact by date and run id and always cleans the work directory", () => {
    expect(code()).toContain("name: production-backup-${{ steps.detect.outputs.date }}-${{ github.run_id }}");
    expect(code()).toMatch(/- name: Clean up\s*\n\s+if: always\(\)\s*\n\s+run: \|\s*\n\s+rm -rf "\$RUNNER_TEMP\/work"/);
  });

  it("allows only supported Postgres majors", () => {
    expect(code()).toMatch(/15 \| 16 \| 17 \| 18\) ;;/);
  });
});

describe("backup docs and wiring", () => {
  const readme = () => readFileSync(join(process.cwd(), "README.md"), "utf8");

  it("exposes the drill as npm run backup:drill", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts["backup:drill"]).toBe("tsx scripts/backup/restore-drill.ts");
  });

  it("documents the restore drill and the production restore runbook", () => {
    const text = readme();
    expect(text).toContain("### Restore drill");
    expect(text).toContain("npm run backup:drill");
    expect(text).toContain("money_map_restore_drill");
    expect(text).toContain("### Production restore runbook");
    expect(text).toContain("Take a fresh backup first.");
    expect(text).toContain("createdAtUtc");
    expect(text).toContain(
      "pg_restore --clean --if-exists --single-transaction --exit-on-error --no-owner --no-privileges",
    );
    expect(text).toContain("| `backup-production` | 18:00 UTC daily");
  });

  it("documents the drill as a throwaway no-network container, not the compose database", () => {
    const text = readme();
    const section = text.slice(text.indexOf("### Restore drill"), text.indexOf("### Production restore runbook"));
    expect(section).toContain("postgres:<major>-alpine");
    expect(section).toContain("--network none");
    expect(section).toContain("docker ps -aq --filter label=moneymap.drill");
    expect(section).toContain("npm.cmd run backup:drill");
    expect(section).not.toContain("money_map_postgres");
    expect(section).not.toMatch(/docker compose up -d/);
  });

  it("no backup surface contains age secret key material", () => {
    const files = [
      join(process.cwd(), "README.md"),
      join(DB_DIR, "README.md"),
      RECIPIENT,
      WORKFLOW,
      ...readdirSync(BACKUP_DIR).map((f) => join(BACKUP_DIR, f)),
      ...readdirSync(DB_DIR)
        .filter((f) => f.includes("backup-role"))
        .map((f) => join(DB_DIR, f)),
    ];
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/AGE-SECRET-KEY-1[0-9A-Z]{20,}/);
    }
  });
});
