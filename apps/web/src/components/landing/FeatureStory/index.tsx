"use client";

import { useEffect, useRef, useState } from "react";
import { STORY_STEPS } from "@/utils/constants/landing/story";
import { DeviceStage } from "./DeviceStage";
import { SectionHeading } from "../SectionHeading";

/**
 * Scrollytelling: the left column narrates 8 features; the right column is a
 * sticky device duo (desktop + phone) whose screens change as the story flows.
 */
export function FeatureStory() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = stepRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of stepRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="border-y border-seam bg-[radial-gradient(ellipse_70%_50%_at_70%_30%,#16120e,#0d0b09)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="The product"
          heading="One thread, followed from handshake to intro."
          headingClassName="max-w-2xl"
        />

        <div className="mt-16 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          {/* narrative steps */}
          <div>
            {STORY_STEPS.map((step, i) => (
              <div
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="flex min-h-[75vh] flex-col justify-center py-10 lg:min-h-[80vh]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
                  {String(i + 1).padStart(2, "0")} · {step.kicker}
                </p>
                <h3
                  className={`mt-3 max-w-md text-balance font-display text-3xl transition-colors duration-500 sm:text-4xl ${
                    active === i ? "text-paper" : "text-fog/60"
                  }`}
                >
                  {step.title}
                </h3>
                <p className="mt-4 max-w-md text-pretty text-fog">{step.body}</p>

                {/* inline visual on small screens */}
                <div className="mt-8 lg:hidden">
                  <DeviceStage visual={step.id} />
                </div>
              </div>
            ))}
          </div>

          {/* sticky device duo */}
          <div className="hidden lg:block">
            <div className="sticky top-24 flex h-[80vh] items-center pl-10">
              <div className="w-full">
                <DeviceStage visual={STORY_STEPS[active].id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
