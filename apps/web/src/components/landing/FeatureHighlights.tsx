"use client";

import { useRef, useState, type KeyboardEvent, type ReactElement } from "react";

import { DeviceStage } from "@/components/landing/FeatureStory/DeviceStage";
import { Button } from "@/components/ui/button";
import { STORY_STEPS } from "@/utils/constants/landing/story";

export function FeatureHighlights(): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = STORY_STEPS[activeIndex];

  function focusTab(index: number): void {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const lastIndex = STORY_STEPS.length - 1;
    const nextIndex =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (index + 1) % STORY_STEPS.length
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? (index - 1 + STORY_STEPS.length) % STORY_STEPS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : null;
    if (nextIndex === null) return;
    event.preventDefault();
    focusTab(nextIndex);
  }

  return (
    <section className="border-y border-seam bg-panel/35">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Explore the product
        </p>
        <h2 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium sm:text-5xl">
          Less reading. More seeing.
        </h2>
        <p className="mt-5 max-w-2xl leading-7 text-fog">
          Choose a capability. Dhaga shows you how it works—without another
          wall of copy.
        </p>

        <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-8">
          <div
            role="tablist"
            aria-label="Product capabilities"
            className="flex snap-x snap-mandatory scroll-px-1 gap-2 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:content-start sm:overflow-visible sm:pb-0"
          >
            {STORY_STEPS.map((step, index) => (
              <Button
                key={step.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                id={`feature-tab-${step.id}`}
                aria-selected={activeIndex === index}
                aria-controls="feature-panel"
                tabIndex={activeIndex === index ? 0 : -1}
                variant="outline"
                onClick={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className="group h-auto min-h-11 min-w-56 snap-start flex-col items-start justify-start whitespace-normal rounded-xl border-seam bg-panel p-3.5 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-trust/60 hover:bg-panel-2 focus-visible:border-trust focus-visible:ring-2 focus-visible:ring-trust/35 aria-selected:border-trust aria-selected:bg-trust/[0.07] sm:min-w-0"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-trust">
                  {String(index + 1).padStart(2, "0")} · {step.kicker}
                </span>
                <span className="mt-1 block font-display text-base leading-snug text-paper">
                  {step.title}
                </span>
              </Button>
            ))}
          </div>

          <div className="mt-3 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <FeaturePreview step={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturePreview({ step }: { step: (typeof STORY_STEPS)[number] }): ReactElement {
  return (
    <div
      id="feature-panel"
      role="tabpanel"
      aria-labelledby={`feature-tab-${step.id}`}
      className="overflow-hidden rounded-2xl border border-seam bg-ink p-4 shadow-[0_24px_80px_-48px_var(--shadow-cast)] sm:p-5"
    >
      <div className="mb-3 flex flex-col gap-1 border-b border-seam pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-trust">
          {step.kicker} · product preview
        </p>
        <p className="max-w-xl text-xs leading-5 text-fog">{step.body}</p>
      </div>
      <div className="mx-auto max-w-2xl pb-8 pt-1 sm:pl-14">
        <DeviceStage visual={step.id} />
      </div>
    </div>
  );
}
