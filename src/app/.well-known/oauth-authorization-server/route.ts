import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const discovery = oAuthDiscoveryMetadata(auth);

// RFC 8414 authorization server metadata for the MCP connector's OAuth flow.
// better-auth 1.2.12 advertises only the authorization_code grant and secret-based client
// auth, although refresh tokens work and public clients (PKCE, no secret) are accepted via
// `mcpCompatibility`. Clients read this document to decide how to call the token endpoint.
export async function GET(request: Request) {
  const response = await discovery(request);
  const metadata = await response.json();

  const withValues = (list: unknown, ...extra: string[]) =>
    Array.from(new Set([...(Array.isArray(list) ? list : []), ...extra]));

  return Response.json(
    {
      ...metadata,
      grant_types_supported: withValues(metadata.grant_types_supported, "authorization_code", "refresh_token"),
      token_endpoint_auth_methods_supported: withValues(metadata.token_endpoint_auth_methods_supported, "none"),
    },
    { status: response.status, headers: response.headers }
  );
}
