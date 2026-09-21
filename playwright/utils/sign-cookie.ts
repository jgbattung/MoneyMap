import { subtle } from "uncrypto";

/**
 * Sign a cookie value using the same HMAC-SHA256 algorithm BetterAuth uses.
 * Format: `{value}.{base64_signature}`
 *
 * Shared by the Playwright global setup and the demo seed, which both need to mint a
 * session cookie the app will accept. Extracted so there is exactly one definition of
 * the signing format in the repository.
 */
export async function signCookieValue(value: string, secret: string): Promise<string> {
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
