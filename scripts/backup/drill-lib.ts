/**
 * Pure helpers for the restore drill (`restore-drill.ts`). No I/O, no process
 * spawning, no environment access - everything here is unit-tested in
 * `src/test/backup-safety.test.ts`.
 *
 * SAFETY - the drill restores into ONE place only: the local Docker Postgres
 * `money_map_postgres`, database `money_map_restore_drill`. The target is a
 * literal. There is no input that can change it, no environment variable, no
 * env-file loader, and no production credential anywhere in the drill.
 * `assertDrillTarget` positively checks every field before a restore starts.
 *
 * INVARIANTS - do not break these:
 *   - No environment variable may be read in `scripts/backup/*.ts`.
 *   - No env-file loader, no Prisma client.
 *   - `DRILL_TARGET` stays a literal; nothing may construct a target from input.
 */

export interface DrillTarget {
  container: string;
  host: string;
  port: string;
  database: string;
  user: string;
}

/**
 * Inside the container's own network namespace Postgres listens on 5432. From the
 * Windows host the same server is on 5433 (`docker-compose.yml`). The drill joins the
 * container's network so it can use a `pg_restore` matching the production major.
 */
export const DRILL_TARGET: DrillTarget = {
  container: "money_map_postgres",
  host: "localhost",
  port: "5432",
  database: "money_map_restore_drill",
  user: "postgres",
};

/** The host port compose publishes the container's 5432 on. Checked in preflight. */
export const DRILL_HOST_PORT = "5433";

/** Names the failing field only. Never echoes the offending value back. */
export function assertDrillTarget(target: DrillTarget): void {
  const fields: (keyof DrillTarget)[] = ["container", "host", "port", "database", "user"];
  for (const field of fields) {
    if (target[field] !== DRILL_TARGET[field]) {
      throw new Error(
        `Refusing to restore: drill target field "${field}" is not the expected value. ` +
          `The drill only ever restores into ${DRILL_TARGET.database} in ${DRILL_TARGET.container}.`,
      );
    }
  }
}

export interface Manifest {
  createdAtUtc: string;
  serverVersionNum: number;
  pgMajor: number;
  pgDumpVersion: string;
  sha256: string;
  dumpBytes: number;
  tables: Record<string, number>;
  runId: string;
}

const ALLOWED_MAJORS = [15, 16, 17, 18];

export function parseManifest(text: string): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("manifest.json is not valid JSON");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error("manifest.json is not an object");
  }
  const m = raw as Record<string, unknown>;

  if (typeof m.createdAtUtc !== "string" || Number.isNaN(Date.parse(m.createdAtUtc))) {
    throw new Error("manifest.json: createdAtUtc is missing or not a date");
  }
  if (typeof m.pgMajor !== "number" || !ALLOWED_MAJORS.includes(m.pgMajor)) {
    throw new Error(`manifest.json: pgMajor must be one of ${ALLOWED_MAJORS.join(", ")}`);
  }
  if (typeof m.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(m.sha256)) {
    throw new Error("manifest.json: sha256 is missing or malformed");
  }
  if (typeof m.tables !== "object" || m.tables === null || Array.isArray(m.tables)) {
    throw new Error("manifest.json: tables is missing");
  }
  const tables: Record<string, number> = {};
  for (const [name, count] of Object.entries(m.tables as Record<string, unknown>)) {
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
      throw new Error(`manifest.json: count for table "${name}" is not a non-negative integer`);
    }
    tables[name] = count;
  }
  if (Object.keys(tables).length === 0) {
    throw new Error("manifest.json: tables is empty");
  }

  return {
    createdAtUtc: m.createdAtUtc,
    serverVersionNum: typeof m.serverVersionNum === "number" ? m.serverVersionNum : 0,
    pgMajor: m.pgMajor,
    pgDumpVersion: typeof m.pgDumpVersion === "string" ? m.pgDumpVersion : "",
    sha256: m.sha256,
    dumpBytes: typeof m.dumpBytes === "number" ? m.dumpBytes : 0,
    tables,
    runId: typeof m.runId === "string" ? m.runId : "",
  };
}

/** Parses the tab-separated output of `row-counts.sql` (`-tA -F tab`). */
export function parseCountsTsv(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const [name, count, ...rest] = line.split("\t");
    if (!name || count === undefined || rest.length > 0 || !/^\d+$/.test(count)) {
      throw new Error("row count output has an unexpected shape");
    }
    counts[name] = Number(count);
  }
  return counts;
}

/**
 * Differences between the manifest and what the drill restored. Empty means a match.
 * Reports counts and table names only, never row contents.
 */
export function compareCounts(
  expected: Record<string, number>,
  actual: Record<string, number>,
): string[] {
  const mismatches: string[] = [];
  for (const name of Object.keys(expected).sort()) {
    if (!(name in actual)) {
      mismatches.push(`${name}: missing from the restore (manifest has ${expected[name]})`);
    } else if (actual[name] !== expected[name]) {
      mismatches.push(`${name}: manifest ${expected[name]}, restored ${actual[name]}`);
    }
  }
  for (const name of Object.keys(actual).sort()) {
    if (!(name in expected)) {
      mismatches.push(`${name}: in the restore but not in the manifest (${actual[name]})`);
    }
  }
  return mismatches;
}

export function assertSha256(actual: string, expected: string): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      "Decrypted dump does not match the manifest checksum. " +
        "The dump may be tampered with or is not the one this manifest describes.",
    );
  }
}
