import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { assertE2eDatabaseUrl } from "./playwright/utils/db-guard";

// Load the app's .env.local first (for BETTER_AUTH_SECRET, etc.),
// then override with .env.test (for DATABASE_URL, DIRECT_URL).
// .env.test takes precedence because dotenv does NOT overwrite existing vars.
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
// CI and local share the same database URL (localhost:5433/money_map_dev), so
// .env.test is authoritative everywhere and always overrides.
dotenv.config({
  path: path.resolve(__dirname, "playwright/.env.test"),
  override: true,
});
// Abort here, before webServer starts, if the URL is not the E2E database.
assertE2eDatabaseUrl(process.env.DATABASE_URL);

const E2E_PORT = 3001;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Tests share a single database — must run sequentially
  reporter: "html",

  globalSetup: "./playwright/global.setup.ts",

  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    storageState: "playwright/.auth/user.json",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // E2E_PROD=1 serves a production build (run `npm run build` first). It only
    // picks the server and has no effect on which database is used.
    command: process.env.E2E_PROD
      ? `npx next start --port ${E2E_PORT}`
      : `npx next dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    env: {
      ...process.env as Record<string, string>,
      DATABASE_URL: process.env.DATABASE_URL!,
      DIRECT_URL: process.env.DIRECT_URL!,
    },
  },
});
