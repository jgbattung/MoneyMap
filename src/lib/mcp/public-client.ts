import { createAuthMiddleware } from "better-auth/api";

/**
 * Three compatibility shims for better-auth 1.2.12's `mcp` plugin, bundled as one small plugin.
 * Remove all when better-auth is upgraded to `@better-auth/oauth-provider`.
 *
 * 1. `/mcp/token` token exchange for public clients.
 *
 * better-auth 1.2.12's `/mcp/token` insists on a client_secret for every authorization_code
 * exchange, but Claude registers as a public client (`token_endpoint_auth_method: "none"`)
 * and, following that, sends no secret. Dynamic Client Registration is open to anyone and the
 * secret is handed straight back to the registrant, so it never protected anything; PKCE (S256,
 * required in `auth.ts`) is what binds the code to the client. When the secret is missing, this
 * fills in the registered one so the plugin's own PKCE and redirect checks still run.
 *
 * 2. `/mcp/authorize` with `offline_access`.
 *
 * The plugin rejects `offline_access` unless `prompt=consent` is sent, but only enforces it when
 * the user already has a session (after a fresh sign-in it adds `prompt=consent` itself). A client
 * asking for `offline_access` (refresh tokens) while already signed in would be turned away with
 * `invalid_scope`, so the missing prompt is filled in. The consent step is a no-op in this
 * plugin version (the code is issued immediately), so behavior is identical to the sign-in path.
 *
 * 3. OAuth continuation after a social (Google) sign-in.
 *
 * After sign-in the plugin resumes the pending authorize request and answers with the JSON body
 * `{ redirect: true, url }`, which the email sign-in client follows. The Google callback is a
 * plain browser navigation, so the same JSON body would be shown as text. This turns it into a
 * real 302 to the same URL. It only fires for `/callback/*` responses that have that exact shape,
 * so ordinary sign-ins are untouched. It must stay after `mcp()` in the plugins array.
 */
export const mcpCompatibility = {
  id: "mcp-compatibility",
  hooks: {
    after: [
      {
        matcher: (ctx: { path?: string }) => ctx.path?.startsWith("/callback/") === true,
        handler: createAuthMiddleware(async (ctx) => {
          const returned = ctx.context.returned as { redirect?: unknown; url?: unknown } | undefined;
          if (
            returned &&
            typeof returned === "object" &&
            !(returned instanceof Error) &&
            returned.redirect === true &&
            typeof returned.url === "string"
          ) {
            throw ctx.redirect(returned.url);
          }
        }),
      },
    ],
    before: [
      {
        matcher: (ctx: { path?: string }) => ctx.path === "/mcp/authorize",
        handler: createAuthMiddleware(async (ctx) => {
          const query = ctx.query as Record<string, string | undefined> | undefined;
          if (!query || query.prompt) return;
          if (!query.scope?.split(" ").includes("offline_access")) return;

          return { context: { query: { prompt: "consent" } } };
        }),
      },
      {
        matcher: (ctx: { path?: string }) => ctx.path === "/mcp/token",
        handler: createAuthMiddleware(async (ctx) => {
          const body = ctx.body as Record<string, unknown> | undefined;
          if (!body || typeof body !== "object") return;
          if (body.grant_type !== "authorization_code") return;
          if (body.client_secret || typeof body.code_verifier !== "string") return;
          if (ctx.request?.headers.get("authorization")?.startsWith("Basic ")) return;
          if (typeof body.client_id !== "string") return;

          const client = await ctx.context.adapter.findOne<{ clientSecret: string; disabled?: boolean | null }>({
            model: "oauthApplication",
            where: [{ field: "clientId", value: body.client_id }],
          });
          if (!client || client.disabled) return;

          return { context: { body: { client_secret: client.clientSecret } } };
        }),
      },
    ],
  },
};
