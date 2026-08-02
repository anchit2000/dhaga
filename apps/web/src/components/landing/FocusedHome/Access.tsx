import type { ReactElement } from "react";

import { RequestAccessForm } from "@/components/landing/RequestAccessForm";

export function Access(): ReactElement {
  return (
    <section id="request-access" className="border-t border-seam bg-panel">
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">Early access</p>
        <div className="mt-4 grid items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div><h2 className="text-balance font-display text-4xl leading-tight sm:text-5xl">Build relationships. Keep the context.</h2><p className="mt-4 max-w-xl text-fog">Join the early-access list for Dhaga Cloud. The open-source core remains available to self-host.</p></div>
          <RequestAccessForm />
        </div>
      </div>
    </section>
  );
}
