import { betterFetch } from "@better-fetch/fetch";
import type { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
 
type Session = typeof auth.$Infer.Session;

export async function middleware(request: NextRequest) {
	const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
		baseURL: request.nextUrl.origin,
		headers: {
			cookie: request.headers.get("cookie") || "", // Forward the cookies from the request
		},
	});

	const { pathname } = request.nextUrl;

	console.log("Middleware - pathname:", pathname);
  console.log("Middleware - session exists:", !!session);

	// If user has session and tries to access auth pages, redirect to dashboard
	if (session && (pathname === '/sign-in' || pathname === '/sign-up')) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
 
	// If no session and NOT on auth pages, redirect to sign-in
	if (!session && pathname !== '/sign-in' && pathname !== '/sign-up') {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}
 
	return NextResponse.next();
}
 
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};