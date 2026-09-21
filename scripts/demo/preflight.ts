/**
 * SAFETY LAYER 2 - assert a marker table that only the demo database has.
 *
 * Layer 1 (`./connection.ts`) guarantees demo tooling never resolves its connection
 * string from the environment. This layer is the independent backstop: it is a property
 * of the database actually reached, not of the configuration intended, so it still holds
 * if Layer 1 fails completely - if someone edits the literal, if Prisma resolves the
 * datasource in a way we did not anticipate, or if the local port is forwarded somewhere
 * unexpected.
 *
 * The production database has no `__demo_db_marker` table and cannot acquire one by
 * accident: the table is created only by `createMarkerTable()`, which is called only
 * from the explicit, user-run demo setup path against a database the user named by hand.
 *
 * `assertDemoDatabase()` must be called before ANY write in demo tooling, and it must be
 * the first thing that touches the database.
 */

import type { PrismaClient } from "@prisma/client";

export const MARKER_TABLE = "__demo_db_marker";

/**
 * Throws if the connected database is not the demo database.
 *
 * Performs a single read-only `to_regclass` lookup, which returns NULL rather than
 * erroring when the relation is absent. No write of any kind happens here, so a failed
 * assertion leaves whatever database was mistakenly reached completely untouched.
 */
export async function assertDemoDatabase(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ marker: string | null }>>(
    `SELECT to_regclass('public.${MARKER_TABLE}')::text AS marker`,
  );

  const marker = rows[0]?.marker ?? null;

  if (marker === null) {
    throw new Error(
      [
        "",
        "  REFUSING TO WRITE.",
        "",
        `  The target database has no "${MARKER_TABLE}" table.`,
        "  This is NOT the demo database, and no write has been performed.",
        "",
        "  The demo database is created once, by hand, by you - never by a script.",
        "  See the 'Demo data' section of README.md for the exact setup commands.",
        "",
      ].join("\n"),
    );
  }
}

/**
 * Creates the marker table if it is absent.
 *
 * Only ever called from the explicit setup path (`npm run setup:demo-marker`), which the
 * user runs once against the demo database they created by hand. Never called from the
 * seed, so the seed can never self-authorise a database it is not supposed to touch.
 */
export async function createMarkerTable(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${MARKER_TABLE}" (
       id          integer PRIMARY KEY DEFAULT 1,
       created_at  timestamptz NOT NULL DEFAULT now(),
       note        text NOT NULL DEFAULT 'MoneyMap demo database. Safe to wipe. Never production.',
       CONSTRAINT ${MARKER_TABLE}_singleton CHECK (id = 1)
     )`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${MARKER_TABLE}" (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
  );
}
