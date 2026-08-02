import Link from "next/link";
import type { ReactElement } from "react";

import { ArrowUpRight } from "lucide-react";

import { USE_CASES, USE_CASE_ACCENTS } from "@/utils/constants/landing/use-cases";

export function UseCases(): ReactElement {
  return (
    <section className="border-b border-seam bg-panel/35" id="use-cases">
      <div className="mx-auto max-w-[1440px] px-6 py-20 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Built for relationship-driven work
        </p>
        <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <h2 className="max-w-3xl text-balance font-display text-4xl leading-tight sm:text-5xl">
            The context changes. The need to remember does not.
          </h2>
          <Link href="/features" className="text-sm text-ember hover:underline">
            Explore every feature →
          </Link>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-seam bg-seam sm:grid-cols-2 lg:grid-cols-5">
          {USE_CASES.map((useCase) => (
            <Link
              key={useCase.slug}
              href={`/use-cases/${useCase.slug}`}
              className={`group min-h-52 border-t-2 bg-panel p-6 transition-colors hover:bg-panel-2 ${USE_CASE_ACCENTS[useCase.slug]}`}
            >
              <span className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em]">
                {useCase.label}
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
              <p className="mt-12 text-pretty font-display text-xl leading-snug text-paper">
                {useCase.short}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
