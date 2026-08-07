import type { ReactElement } from "react";

import { SignUpCta } from "@/components/landing/SignUpCta";

export function Access(): ReactElement {
  // Anchor id unchanged (`#request-access`). The pricing cards now link
  // straight to /signup, but the id stays: the /pricing JSON-LD offer URLs and
  // any bookmarked link still resolve to it.
  return (
    <section id="request-access" className="border-t border-seam bg-panel">
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Get started</p>
        <div className="mt-4 grid items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div><h2 className="text-balance font-display text-4xl leading-tight sm:text-5xl">Build relationships. Keep the context.</h2><p className="mt-4 max-w-xl text-fog">Create your Dhaga Cloud account today. New accounts join a short approval queue; starting a paid plan skips it the moment the payment completes. The open-source core remains available to self-host.</p></div>
          <SignUpCta className="flex flex-wrap items-center gap-3" />
        </div>
      </div>
    </section>
  );
}
