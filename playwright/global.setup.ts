import { chromium, type FullConfig } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession } from "./utils/db";
import { signCookieValue } from "./utils/sign-cookie";

async function globalSetup(_config: FullConfig) {
  // 1. Clear the database to ensure a clean state
  await clearDatabase();

  // 2. Seed base data (test user + common types)
  const user = await seedBaseData();

  // 3. Create an authenticated session for the test user
  const sessionToken = await createTestSession(user.id);

  // 4. Sign the token the way BetterAuth expects (HMAC-SHA256 signed cookie)
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set. Cannot sign session cookie for E2E tests.");
  }
  const signedToken = await signCookieValue(sessionToken, secret);

  // 5. Launch browser and set the signed session cookie
  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signedToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // 6. Save the authenticated browser state
  await context.storageState({ path: "playwright/.auth/user.json" });

  await browser.close();
}

export default globalSetup;
