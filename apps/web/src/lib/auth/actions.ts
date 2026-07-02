"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthConfigured, sessionToken, verifyPassword } from "./session";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/utils/constants/app";

export interface LoginState {
  error?: string;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      error:
        "No password configured. Set DHAGA_PASSWORD in apps/web/.env.local and restart.",
    };
  }
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    return { error: "Wrong password." };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect("/app/people");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
