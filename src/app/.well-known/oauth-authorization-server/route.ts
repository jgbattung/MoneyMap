import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// RFC 8414 authorization server metadata for the MCP connector's OAuth flow.
export const GET = oAuthDiscoveryMetadata(auth);
