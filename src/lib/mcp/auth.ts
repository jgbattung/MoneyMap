import { auth } from "@/lib/auth";

type McpHandler = (req: Request, userId: string) => Promise<Response>;

// `req.auth` is where mcp-handler looks for the verified token; tool callbacks then read it
// from `ctx.http?.authInfo` (the userId travels in `extra`).
type McpRequest = Request & {
  auth?: {
    token: string;
    clientId: string;
    scopes: string[];
    expiresAt?: number;
    extra?: Record<string, unknown>;
  };
};

function unauthorized(req: Request) {
  const { origin } = new URL(req.url);
  const challenge = `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`;

  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Unauthorized: Authentication required" },
      id: null,
    },
    { status: 401, headers: { "WWW-Authenticate": challenge } }
  );
}

/**
 * Replaces better-auth's `withMcpAuth`, which hardcodes a localhost URL in its 401 challenge.
 * Resolves the bearer token to a user (better-auth's plugin does not check expiry, so it is
 * checked here) and hands the handler the authenticated userId.
 */
export function withMcpUser(handler: McpHandler) {
  return async (req: Request): Promise<Response> => {
    const session = await auth.api.getMcpSession({ headers: req.headers });

    if (!session?.userId) return unauthorized(req);

    const expiresAt = new Date(session.accessTokenExpiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return unauthorized(req);

    const mcpReq = req as McpRequest;
    mcpReq.auth = {
      token: session.accessToken,
      clientId: session.clientId,
      scopes: session.scopes ? session.scopes.split(" ") : [],
      expiresAt: Math.floor(expiresAt / 1000),
      extra: { userId: session.userId },
    };

    return handler(req, session.userId);
  };
}
