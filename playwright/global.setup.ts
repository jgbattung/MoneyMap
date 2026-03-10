import { chromium, type FullConfig } from "@playwright/test";
import { subtle } from "uncrypto";
import { clearDatabase, seedBaseData, createTestSession } from "./utils/db";

/**
 * Sign a cookie value using the same HMAC-SHA256 algorithm BetterAuth uses.
 * Format: `{value}.{base64_signature}`
 */
async function signCookieValue(value: string, secret: string): Promise<string> {
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    algorithm,
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return encodeURIComponent(`${value}.${base64Sig}`);
}

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
