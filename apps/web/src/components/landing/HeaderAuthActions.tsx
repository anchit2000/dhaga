"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hasSessionHint } from "@/lib/auth/session-hint";
import type { ReactElement } from "react";

/**
 * The signed-out / signed-in half of the marketing header.
 *
 * The landing surfaces are statically prerendered, so the server has no reader to
 * render for. Both states therefore ship in the same HTML and CSS picks one from
 * `data-signed-in`, which the inline `SESSION_HINT_SCRIPT` (rendered by Header)
 * flips during HTML parsing — before the first paint. A signed-in visitor never
 * sees "Sign in", and because the swap happens pre-paint nothing reflows.
 *
 * The lazy initialiser reads the same cookie, so React's hydration output matches
 * the DOM the script produced, and client-side navigations between /, /features
 * and /pricing — where the inline script does not re-run — stay correct.
 */
export function HeaderAuthActions(): ReactElement {
  const [signedIn] = useState(hasSessionHint);

  return (
    <div
      data-auth-actions=""
      data-signed-in={signedIn ? "true" : "false"}
      suppressHydrationWarning
      className="group/auth flex items-center gap-2 sm:gap-4"
    >
      <div className="flex items-center gap-2 group-data-[signed-in=true]/auth:hidden sm:gap-4">
        <Link
          href="/login"
          className="hidden min-h-11 items-center text-sm text-fog transition-colors hover:text-paper sm:flex"
        >
          Sign in
        </Link>
        <Button render={<Link href="/#request-access" />} size="sm" className="min-h-11">
          <span className="sm:hidden">Join beta</span>
          <span className="hidden sm:inline">Request early access</span>
        </Button>
      </div>
      <div className="hidden items-center group-data-[signed-in=true]/auth:flex">
        <Button render={<Link href="/app" />} size="sm" className="min-h-11">
          Dashboard
        </Button>
      </div>
    </div>
  );
}
