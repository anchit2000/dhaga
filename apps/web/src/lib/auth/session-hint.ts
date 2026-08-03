import { SESSION_HINT_COOKIE } from "@/utils/constants/auth";

/**
 * Reads the `dhaga_signed_in` hint cookie that src/proxy.ts mirrors from the
 * real (httpOnly) session cookie. Anchored on `^` or `; ` so a cookie whose name
 * merely *ends* with ours can't produce a false positive; no nested quantifiers,
 * so it is linear-time.
 *
 * This is a display hint only — it decides which header affordance to show, never
 * what a user may do. `/app` still resolves the real session server-side.
 */
const HINT_PATTERN = `(?:^|; )${SESSION_HINT_COOKIE}=1(?:;|$)`;
const HINT_REGEX = new RegExp(HINT_PATTERN);

export function hasSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  return HINT_REGEX.test(document.cookie);
}

/**
 * The same check, as a string the marketing Header renders inline. The browser
 * runs it synchronously while parsing the HTML — before the first paint — so a
 * signed-in visitor never sees the signed-out controls and nothing reflows once
 * React hydrates. See components/landing/HeaderAuthActions.tsx for the markup it
 * flips, and Next.js's "Preventing flash before hydration" guide for the pattern.
 */
export const SESSION_HINT_SCRIPT =
  `(function(){try{if(new RegExp("${HINT_PATTERN}").test(document.cookie)){` +
  `var n=document.querySelector("[data-auth-actions]");` +
  `if(n)n.setAttribute("data-signed-in","true")}}catch(e){}})()`;
