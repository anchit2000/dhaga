"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Slide-up bar after meaningful scroll. Dismissible, remembers dismissal for the session. */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () =>
      setVisible(
        !sessionStorage.getItem("dhaga-cta-dismissed") && window.scrollY > 1200,
      );
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-seam bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <p className="text-sm text-fog">
          <span className="font-medium text-paper">Founding lifetime — $79</span>{" "}
          for the first 500 seats. Then $99.
        </p>
        <div className="flex items-center gap-3">
          <Button render={<Link href="#request-access" />} size="sm">
            Reserve a seat
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-fog transition-colors hover:text-paper"
            onClick={() => {
              sessionStorage.setItem("dhaga-cta-dismissed", "1");
              setVisible(false);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
