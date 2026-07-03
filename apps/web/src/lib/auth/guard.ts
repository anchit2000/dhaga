import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "./session";
import { SESSION_COOKIE } from "@/utils/constants/app";

/** Non-browser clients (future mobile app, scripts) authenticate with
 *  `Authorization: Bearer $DHAGA_API_TOKEN` instead of the cookie. */
async function hasValidBearerToken(): Promise<boolean> {
  const token = process.env.DHAGA_API_TOKEN;
  if (!token) return false;
  const header = (await headers()).get("authorization");
  return header === `Bearer ${token}`;
}

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  if (verifySessionToken(store.get(SESSION_COOKIE)?.value)) return true;
  return hasValidBearerToken();
}

/** For pages: bounce unauthenticated visitors to /login. */
export async function requireSessionPage(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

/** For server actions and API routes: hard-fail without a session. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) throw new Error("Unauthorized");
}
