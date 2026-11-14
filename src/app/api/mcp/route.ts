import { createMcpHandler } from "mcp-handler";
import { withMcpUser } from "@/lib/mcp/auth";
import { registerTools } from "@/lib/mcp/tools";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Stateless MCP server over Streamable HTTP. Every request is authenticated by `withMcpUser`
// first, which puts the token's userId where tool callbacks read it (ctx.http.authInfo).
const mcpHandler = createMcpHandler(registerTools, {
  serverInfo: { name: "money-map", version: "1.0.0" },
});

const handler = withMcpUser((req) => mcpHandler(req));

export { handler as GET, handler as POST };
