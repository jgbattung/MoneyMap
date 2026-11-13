import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// RFC 9728 protected resource metadata. The origin follows the incoming request so the
// document is correct on every deployment (never a hardcoded localhost).
export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  return NextResponse.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  });
}
