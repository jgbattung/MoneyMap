/**
 * One-off setup step: stamp the demo database with its `__demo_db_marker` table.
 *
 * Run once, by hand, after creating the `money_map_demo` database and applying
 * migrations to it (see the 'Demo data' section of README.md). This is the ONLY script
 * in the repository that creates the marker, and it is deliberately separate from the
 * seed so the seed can never self-authorise a database it should not touch.
 *
 * It connects through `createDemoClient()` like every other demo script, so it is
 * covered by Safety Layer 1 and cannot be pointed at another database.
 */

import { createDemoClient, DEMO_DB_URL } from "./connection";
import { createMarkerTable, MARKER_TABLE } from "./preflight";

async function main() {
  const prisma = createDemoClient();
  try {
    await createMarkerTable(prisma);
    console.log(`Marker table "${MARKER_TABLE}" is present on ${DEMO_DB_URL}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
