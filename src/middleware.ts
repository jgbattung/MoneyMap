import { betterFetch } from "@better-fetch/fetch";
import type { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
 
type Session = typeof auth.$Infer.Session;

/**
 * Paths a signed-out visitor may reach. Everything else redirects to /sign-in.
 * The signed-in redirect below is separate and unaffected: a signed-in visitor is still
 * sent from `/`, `/sign-in` and `/sign-up` to `/dashboard`.
 */
const PUBLIC_PATHS = new Set(['/', '/sign-in', '/sign-up']);

export async function middleware(request: NextRequest) {
	const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
		baseURL: request.nextUrl.origin,
		headers: {
			cookie: request.headers.get("cookie") || "", // Forward the cookies from the request
		},
	});

	const { pathname } = request.nextUrl;

	// If user has session and is on root or auth pages, redirect to dashboard
	if (session && (pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up')) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}
 
	// If no session and NOT on a public page, redirect to sign-in.
	// `/` is the public landing page; without this exemption it would be unreachable,
	// which is what made the root route a dead end before the landing page existed.
	if (!session && !PUBLIC_PATHS.has(pathname)) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}
 
	return NextResponse.next();
}
 
export const config = {
  matcher: [
    // `screenshots` is excluded because the middleware otherwise guards everything
    // under `public/`, so the landing page's product images would redirect a
    // signed-out visitor to /sign-in and never render. That also breaks the Next
    // image optimizer, which fetches the upstream file over HTTP and cannot follow
    // the redirect. Only this one public asset directory is exempted; every
    // application route still runs the guard above.
    "/((?!api|_next/static|_next/image|favicon.ico|screenshots).*)",
  ],
};