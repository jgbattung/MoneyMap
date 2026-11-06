// SAFETY GUARDRAIL for the E2E suite. clearDatabase() in db.ts deletes every
// row unscoped, so the suite must only ever run against the throwaway local
// test database. This asserts what the URL IS (exact host, port and database),
// not merely what it is not. Pure and import-free so it is unit-testable and
// safe to call from playwright.config.ts.

export const E2E_DATABASE = {
  hosts: ["localhost", "127.0.0.1"],
  port: "5433",
  database: "money_map_dev",
} as const;

const HOSTED_MARKERS = ["supabase", "pooler", "amazonaws"];

// Connection-string query parameters that override the host, port or database
// in the URL authority/path (Prisma honours ?host=), so they must be absent.
const TARGET_OVERRIDE_PARAMS = ["host", "hostaddr", "port", "dbname"];

// Replace everything up to the last "@" so a credential can never reach logs,
// even an unencoded password containing "/" or "@". Over-redacting is fine.
function redact(url: string): string {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)?[\s\S]*@/i, "$1***@");
}

function fail(check: string, url: string): never {
  throw new Error(
    `E2E database guard failed: ${check}. Refusing to run. URL: ${redact(url)}`
  );
}

export function assertE2eDatabaseUrl(url: string | undefined): string {
  if (url === undefined || url.trim() === "") {
    throw new Error(
      "E2E database guard failed: DATABASE_URL is empty or unset. Refusing to run."
    );
  }

  // Runs on the raw string, before parsing, so it holds whatever else is true.
  const lower = url.toLowerCase();
  if (HOSTED_MARKERS.some((marker) => lower.includes(marker))) {
    fail("URL contains a hosted database marker (supabase/pooler/amazonaws)", url);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Do not echo the input: it is unparseable, so it cannot be redacted reliably.
    throw new Error(
      "E2E database guard failed: DATABASE_URL is not a valid URL. Refusing to run."
    );
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    fail(`protocol "${parsed.protocol}" is not postgresql`, url);
  }

  if (!(E2E_DATABASE.hosts as readonly string[]).includes(parsed.hostname)) {
    fail(`host "${parsed.hostname}" is not one of ${E2E_DATABASE.hosts.join(", ")}`, url);
  }

  // URL.port is "" when omitted, which is rejected here.
  if (parsed.port !== E2E_DATABASE.port) {
    fail(`port "${parsed.port}" is not ${E2E_DATABASE.port}`, url);
  }

  if (parsed.pathname !== `/${E2E_DATABASE.database}`) {
    fail(`database "${parsed.pathname.slice(1)}" is not ${E2E_DATABASE.database}`, url);
  }

  for (const key of parsed.searchParams.keys()) {
    if (TARGET_OVERRIDE_PARAMS.includes(key.toLowerCase())) {
      fail(`query parameter "${key}" would override the asserted host, port or database`, url);
    }
  }

  return url;
}
