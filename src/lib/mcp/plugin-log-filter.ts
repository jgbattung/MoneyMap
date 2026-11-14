/**
 * better-auth 1.2.12's `mcp` plugin calls `console.log` directly (not its configurable logger,
 * so no `logger` option can silence it) with the raw `/mcp/authorize` query and with the full
 * registered client row, which includes `clientSecret`. Those lines would land in Vercel logs on
 * every authorize call.
 *
 * This drops exactly those two shapes and nothing else: every other `console.log`, every
 * `console.error` and all better-auth logger output (including errors) pass through untouched.
 *
 * Remove when better-auth is upgraded to `@better-auth/oauth-provider`.
 */
export function isPluginLeak(value: unknown): boolean {
  if (!value || typeof value !== "object" || value instanceof Error) return false;
  const o = value as Record<string, unknown>;
  const isClientRow = "clientSecret" in o && "clientId" in o;
  const isAuthorizeQuery = "client_id" in o && "response_type" in o;
  return isClientRow || isAuthorizeQuery;
}

const INSTALLED = Symbol.for("money-map.mcp-plugin-log-filter");

export function installPluginLogFilter() {
  const g = globalThis as Record<symbol, unknown>;
  if (g[INSTALLED]) return;
  g[INSTALLED] = true;

  const original = console.log;
  console.log = (...args: unknown[]) => {
    if (args.length === 1 && isPluginLeak(args[0])) return;
    original.apply(console, args);
  };
}
