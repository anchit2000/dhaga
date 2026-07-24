import { NextResponse } from "next/server";
import {
  REFERRAL_CODE_LENGTH,
  REFERRAL_COOKIE_MAX_AGE_S,
  REFERRAL_COOKIE_NAME,
} from "@/utils/constants/referral";

/**
 * Only a length-correct alphanumeric code is persisted; anything else still
 * redirects home but plants no cookie, so junk paths can't seed a bogus code.
 */
const CODE_PATTERN = new RegExp(`^[A-Za-z0-9]{${REFERRAL_CODE_LENGTH}}$`);

/**
 * Shareable invite target (`${SITE_URL}/r/<code>`). Drops an httpOnly referral
 * cookie the signup flow later reads, then bounces to the landing page — the
 * visitor never sees a referral-specific screen. `secure` is production-only so
 * the invite → signup flow is still testable over http on localhost.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;
  const response = NextResponse.redirect(new URL("/", request.url), 302);
  if (CODE_PATTERN.test(code)) {
    response.cookies.set(REFERRAL_COOKIE_NAME, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE_S,
    });
  }
  return response;
}
