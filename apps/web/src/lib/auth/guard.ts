import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "./session";
import { SESSION_COOKIE } from "@/utils/constants/app";

export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** For pages: bounce unauthenticated visitors to /login. */
export async function requireSessionPage(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

/** For server actions and API routes: hard-fail without a session. */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) throw new Error("Unauthorized");
}
