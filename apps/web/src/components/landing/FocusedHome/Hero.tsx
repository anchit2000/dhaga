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
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-trust">
            The personal CRM you own
          </p>
          <h1 className="mt-5 text-balance font-display text-5xl leading-[0.98] tracking-tight sm:text-6xl">
            Your CRM belongs to the company. Your relationships don&apos;t.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-fog sm:text-lg">
            Dhaga is the private, portable relationship memory for sales professionals, founders, investors, recruiters, and everyone whose network outlasts a role.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button render={<Link href="#request-access" />} size="lg">
              Request early access
              <ArrowRight aria-hidden="true" />
            </Button>
            <Button render={<Link href="/features" />} variant="outline" size="lg">
              See how it works
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fog" aria-label="Product commitments">
            <li className="text-trust">Private by default</li>
            <li className="text-calm">Export anytime</li>
            <li className="text-magic">Open-source core</li>
          </ul>
        </div>
        <ProductWindow />
      </div>
    </section>
  );
}
