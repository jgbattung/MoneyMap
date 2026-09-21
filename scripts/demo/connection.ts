/**
 * SAFETY LAYER 1 - the connection string is a literal, never resolved from the environment.
 *
 * The `.env` file in this working copy points at the LIVE PRODUCTION database, which
 * holds real financial records. Prisma's CLI and client both auto-load `.env` from the
 * current working directory, and so do the usual env-file loaders. Any demo script that
 * resolves its connection string from the environment is therefore one stale shell
 * variable, one forgotten flag, or one stray loader call away from writing to production.
 *
 * This module removes that entire class of failure rather than mitigating it: there is
 * no input to get wrong. The literal below is the only source of truth for where demo
 * tooling connects, and `createDemoClient()` is the only way demo tooling is permitted
 * to build a Prisma client.
 *
 * INVARIANTS - do not break these:
 *   - No env-file loader may be imported here.
 *   - No environment variable may be read here, for any purpose.
 *   - `createDemoClient()` must never accept a URL argument.
 *
 * These invariants are locked in by a source-text regression test
 * (`src/test/demo-safety.test.ts`) because "this code cannot be pointed at another
 * database" is not something a behavioural test can verify without a production
 * connection. That test lives outside `scripts/demo/` deliberately, so that the audit
 * greps over this directory stay meaningful.
 *
 * Safety Layer 2 lives in `./preflight.ts` (marker-table assertion).
 * Safety Layer 3 lives in `./seed.ts` (every delete scoped to DEMO_USER_ID).
 */

import { PrismaClient } from "@prisma/client";

/**
 * The local Docker Postgres from `docker-compose.yml` (host port 5433), database
 * `money_map_demo`. This is a second database inside the same container as the
 * Playwright E2E database `money_map_dev`, so `clearDatabase()` in the E2E global
 * setup can never reach the demo dataset.
 */
export const DEMO_DB_URL =
  "postgresql://postgres:local_dev_password@localhost:5433/money_map_demo";

/** The single user every demo record belongs to. Every delete is scoped to this id. */
export const DEMO_USER_ID = "demo-user-money-map";

/** Stable session token for the demo user, reused by the screenshot pipeline. */
export const DEMO_SESSION_TOKEN = "demo-session-token-money-map";

/** Where the seed writes the signed session cookie for the screenshot script. */
export const DEMO_COOKIE_FILE = "scripts/demo/.demo-session.json";

/**
 * The only sanctioned way to build a Prisma client in demo tooling.
 * `datasourceUrl` overrides the `url` in `prisma/schema.prisma`, which is what
 * bypasses Prisma's automatic `.env` load.
 */
export function createDemoClient(): PrismaClient {
  return new PrismaClient({ datasourceUrl: DEMO_DB_URL });
}
