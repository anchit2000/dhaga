import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import { SESSION_HINT_COOKIE } from "@/utils/constants/auth";
import type { NextRequest } from "next/server";

/**
 * Mirrors "is there a session?" into a non-secret, JS-readable cookie on the
 * marketing routes that render <Header />.
 *
 * Why not just read the session in the page? Because `/`, `/features`,
 * `/pricing` et al are statically prerendered — awaiting `headers()` there would
 * turn the most-visited pages in the product dynamic. A proxy runs *before* the
 * cached HTML is served, so the HTML stays static and identical for everyone
 * while the response still carries a per-reader hint the page's inline script can
 * act on before the first paint.
 *
 * `getSessionCookie` is better-auth's documented optimistic check: it only looks
 * at cookie presence, no database round-trip. That is deliberately weaker than
 * real auth — a stale token still says "1" — which is fine because the hint only
 * chooses between "Sign in" and "Dashboard". `/app` resolves the real session and
 * bounces to `/login` if it has expired.
 *
 * `/login` is matched too: signing out sends the user there, and that navigation
 * is the request that clears the hint.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const signedIn = getSessionCookie(request) !== null;

  if (signedIn) {
    response.cookies.set(SESSION_HINT_COOKIE, "1", {
      // Readable from JS on purpose — the whole point is a pre-paint DOM check.
      // It holds no token and no identity, so it grants nothing if read.
      httpOnly: false,
      sameSite: "lax",
      // Self-hosted HTTP deployments must still get the cookie (a `Secure`
      // cookie over http is dropped), so key this off the actual scheme.
      secure: request.nextUrl.protocol === "https:",
      path: "/",
    });
  } else if (request.cookies.has(SESSION_HINT_COOKIE)) {
    response.cookies.set(SESSION_HINT_COOKIE, "", { path: "/", maxAge: 0 });
  }

  return response;
}

// Only the surfaces that render the marketing <Header />, plus the page you land
// on after signing out. Everything else — /app, /api, /blog, /docs, static
// assets — is untouched, so this adds no work to the authenticated product.
export const config = {
  matcher: [
    "/",
    "/features",
    "/pricing",
    "/open-source",
    "/product-tour",
    "/use-cases/:role",
    "/login",
  ],
};
