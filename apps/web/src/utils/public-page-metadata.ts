import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/utils/constants/site";

export const PUBLIC_SHELL_PAGES = {
  login: {
    path: "/login",
    title: "Sign in — Dhaga",
    description: "Sign in to your private Dhaga relationship memory and continue where you left off.",
  },
  signup: {
    path: "/signup",
    title: "Create account — Dhaga",
    description: "Create a Dhaga account to capture relationship context, find warm paths, and follow up on time.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy — Dhaga",
    description: "How Dhaga handles relationship data, AI actions, browser access, deletion receipts, and exports.",
  },
  forgotPassword: {
    path: "/forgot-password",
    title: "Reset your password — Dhaga",
    description: "Request a secure email link to reset your Dhaga password and regain access to your relationship memory.",
  },
  resetPassword: {
    path: "/reset-password",
    title: "Choose a new password — Dhaga",
    description: "Choose a new password for your Dhaga account using the secure reset link sent to your email address.",
  },
  authError: {
    path: "/auth/error",
    title: "Sign-in help — Dhaga",
    description: "Review a Dhaga sign-in or access-request problem and return to the right account recovery step.",
  },
} as const;

type PublicShellPage = keyof typeof PUBLIC_SHELL_PAGES;

export function publicPageMetadata(page: PublicShellPage): Metadata {
  const { path, title, description } = PUBLIC_SHELL_PAGES[page];
  const url = `${SITE_URL}${path}`;
  const image = `${SITE_URL}/opengraph-image.png`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: SITE_NAME,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
