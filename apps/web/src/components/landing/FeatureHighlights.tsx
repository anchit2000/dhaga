import type { ReactElement } from "react";

import { DAILY_LOOP_STEPS } from "@/utils/constants/landing/sections";
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

/**
 * The daily loop: the Home briefing, the goal that aims it, and the noise it
 * keeps out. Lives beside FeatureHighlights because it is the same card grid
 * over a different constant — STORY_STEPS can't hold it (its `id` is a
 * `StoryVisual` and each member needs a device visual in FeatureStory).
 */
export function DailyLoop(): ReactElement {
  return (
    <section className="border-b border-seam">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          The daily loop
        </p>
        <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl leading-tight sm:text-5xl">
          Open Dhaga. It already knows who today is for.
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-fog">
          Home opens on a short briefing instead of a database. Give it an
          objective and that briefing becomes the plan for it.
        </p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-seam bg-seam sm:grid-cols-3">
          {DAILY_LOOP_STEPS.map((step) => (
            <article key={step.kicker} className="bg-panel p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember">
                {step.kicker}
              </p>
              <h3 className="mt-4 font-display text-xl text-paper">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-fog">{step.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-fog">
          Both the goal cohort and the noise judgement run as a nightly batch
          sweep — 0 credits, on every plan.
        </p>
      </div>
    </section>
  );
}
