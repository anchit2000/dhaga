import type { ReactElement } from "react";

import { STORY_STEPS } from "@/utils/constants/landing/story";

export function FeatureHighlights(): ReactElement {
  return (
    <section className="border-y border-seam bg-panel/35">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          What Dhaga remembers
        </p>
        <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium sm:text-5xl">
          More than a contact record.
        </h2>
        <p className="mt-5 max-w-2xl leading-7 text-fog">
          Capture the context, connect it to the rest of your network, and use
          it when there is a reason to reach out.
        </p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-seam bg-seam sm:grid-cols-2">
          {STORY_STEPS.map((step, index) => (
            <article key={step.id} className="bg-panel p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember">
                {String(index + 1).padStart(2, "0")} · {step.kicker}
              </p>
              <h3 className="mt-4 font-display text-2xl text-paper">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-fog">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
