import type { ReactElement } from "react";
import { Plus } from "lucide-react";

import { FOCUSED_FAQ } from "@/utils/constants/landing/focused";

export function Faq(): ReactElement {
  return (
    <section id="faq" className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 sm:py-24 lg:grid-cols-[0.65fr_1.35fr]">
      <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">The short version</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">A few honest answers.</h2></div>
      <div className="divide-y divide-seam border-y border-seam">
        {FOCUSED_FAQ.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg marker:content-none">
              {item.question}
              <Plus className="size-4 shrink-0 text-ember transition-transform group-open:rotate-45" aria-hidden="true" />
            </summary>
            <p className="max-w-2xl pb-2 pr-8 text-sm leading-6 text-fog">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
