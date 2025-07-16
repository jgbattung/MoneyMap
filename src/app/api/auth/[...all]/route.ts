import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { POST: betterAuthPOST, GET: betterAuthGET } = toNextJsHandler(auth);

export async function GET(request: Request) {
  console.log("GET called with URL:", request.url);
  console.log("GET called with pathname:", new URL(request.url).pathname);
  
  const response = await betterAuthGET(request);
  console.log("BetterAuth response status:", response.status);
  
  return response;
}

export async function POST(request: Request) {
  console.log("POST called with URL:", request.url);
  console.log("POST called with pathname:", new URL(request.url).pathname);
  
  const response = await betterAuthPOST(request);
  console.log("BetterAuth response status:", response.status);
  
  return response;
}