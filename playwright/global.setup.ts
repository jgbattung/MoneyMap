import { chromium, type FullConfig } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession } from "./utils/db";

async function globalSetup(_config: FullConfig) {
  // 1. Clear the database to ensure a clean state
  await clearDatabase();

  // 2. Seed base data (test user + common types)
  const user = await seedBaseData();

  // 3. Create an authenticated session for the test user
  const sessionToken = await createTestSession(user.id);

  // 4. Launch browser and set the session cookie
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // 5. Save the authenticated browser state
  await context.storageState({ path: "playwright/.auth/user.json" });

  await browser.close();
}

export default globalSetup;
