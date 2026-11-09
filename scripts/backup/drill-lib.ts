/**
 * Pure helpers for the restore drill (`restore-drill.ts`). No I/O, no process
 * spawning, no environment access - everything here is unit-tested in
 * `src/test/backup-safety.test.ts`.
 *
 * SAFETY - the drill restores into ONE kind of place only: a throwaway
 * `postgres:<major>-alpine` container that the drill itself starts with
 * `--network none` (no network at all, production included), database
 * `money_map_restore_drill`, removed when the drill ends. It never touches
 * `money_map_postgres` or any other existing container. There is no input that can
 * change the database name or the container prefix, no environment variable, no
 * env-file loader, and no production credential anywhere in the drill.
 * `assertDrillContainer` positively checks the started container before a restore.
 *
 * INVARIANTS - do not break these:
 *   - No environment variable may be read in `scripts/backup/*.ts`.
 *   - No env-file loader, no Prisma client.
 *   - The restore target is always a container the drill just created, started with
 *     `--network none`; nothing may point the restore at an existing container.
 */

export const DRILL_DATABASE = "money_map_restore_drill";
export const DRILL_CONTAINER_PREFIX = "moneymap-drill-";
export const DRILL_LABEL = "moneymap.drill=1";

/** Name of the throwaway container. `random` is a short lowercase hex/alphanumeric id. */
export function drillContainerName(random: string): string {
  if (!/^[a-z0-9]{8,32}$/.test(random)) {
    throw new Error("Refusing to start the drill container: the random id is not 8-32 lowercase letters or digits.");
  }
  return `${DRILL_CONTAINER_PREFIX}${random}`;
}

export interface DrillContainerInfo {
  name: string;
  labels: Record<string, string>;
  networkMode: string;
  image: string;
}

/** Names the failing field only. Never echoes the offending value back. */
export function assertDrillContainer(info: DrillContainerInfo, expected: { name: string; major: number }): void {
  const fail = (field: string): never => {
    throw new Error(
      `Refusing to restore: drill container field "${field}" is not the expected value. ` +
        `The drill only ever restores into ${DRILL_DATABASE} in a throwaway container it started itself.`,
    );
  };
  const name = info.name.replace(/^\//, "");
  if (name !== expected.name || !name.startsWith(DRILL_CONTAINER_PREFIX) || name === "money_map_postgres") fail("name");
  if (info.labels?.["moneymap.drill"] !== "1") fail("label");
  if (info.networkMode !== "none") fail("networkMode");
  if (info.image !== `postgres:${expected.major}-alpine`) fail("image");
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
