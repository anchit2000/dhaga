import type { ReactElement } from "react";

import { DAILY_LOOP_STEPS } from "@/utils/constants/landing/sections";

/**
 * The daily loop on /features: the Home briefing, the goal that aims it, and
 * the address-book noise it keeps out. Its own file rather than a second export
 * of FeatureHighlights — that one is `"use client"` for the tablist, and this
 * section is static. It also can't ride STORY_STEPS: that array's `id` is a
 * `StoryVisual` and every member needs a real device visual in FeatureStory.
 */
export function DailyLoop(): ReactElement {
  return (
    <section className="border-b border-seam">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          The daily loop
        </p>
        <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium leading-tight sm:text-5xl">
          Open Dhaga. It already knows who today is for.
        </h2>
        <p className="mt-5 max-w-2xl leading-7 text-fog">
          Home opens on a short briefing instead of a database. Give it an
          objective and that briefing becomes the plan for it.
        </p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-seam bg-seam sm:grid-cols-3">
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
