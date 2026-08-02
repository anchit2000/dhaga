import Link from "next/link";
import type { ReactElement } from "react";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductWindow } from "./ProductWindow";

export function Hero(): ReactElement {
  return (
    <section id="product" className="border-b border-seam pt-28 sm:pt-32">
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 pb-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:pb-16">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-ember">
            A private memory for your professional network
          </p>
          <h1 className="mt-6 text-balance font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Remember every person you meet.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-fog">
            Dhaga turns meetings, notes, voice, messages, introductions, and cards into searchable context and timely follow-ups—without the CRM admin.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button render={<Link href="#request-access" />} size="lg">
              Request early access
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fog" aria-label="Product commitments">
            <li>Private by default</li>
            <li>Export anytime</li>
            <li>Open-source core</li>
          </ul>
        </div>
        <ProductWindow />
      </div>
    </section>
  );
}
