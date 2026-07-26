import { HOW_IT_WORKS, STATS } from "@/utils/constants/landing";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SpotlightCard } from "./SpotlightCard";
import { STEP_ICONS, SparkIcon } from "./StepIcons";
import { TiltCard } from "./TiltCard";

export function StatsBand() {
  return (
    <section className="border-y border-seam bg-panel-2/40">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mx-auto max-w-2xl text-balance text-center font-display text-3xl font-medium sm:text-4xl">
          You met 47 people at your last conference.{" "}
          <span className="text-ember">You&apos;ll remember 3.</span>
        </h2>
        <p className="mt-4 text-center text-xs italic text-fog/70">
          A familiar story, not a stat we collected — picture your last conference.
        </p>
        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <Reveal key={stat.num} delay={i * 120}>
              <p
                className={`font-display text-6xl tabular-nums ${
                  i === STATS.length - 1 ? "text-ember" : "text-paper"
                }`}
              >
                <CountUp target={Number(stat.num)} />
              </p>
              <p className="mt-3 max-w-[24ch] text-sm text-fog">{stat.cap}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="How it works"
        heading="From handshake to knowledge graph in three moves."
      />
      <div className="relative mt-14">
        {/* thread connecting the three steps */}
        <svg
          className="absolute -top-2 left-0 hidden w-full md:block"
          height="24"
          aria-hidden="true"
        >
          <line
            x1="16%"
            y1="12"
            x2="84%"
            y2="12"
            stroke="#e2a44c"
            strokeOpacity="0.35"
            strokeWidth="1"
            strokeDasharray="4 5"
          />
        </svg>
        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? SparkIcon;
            return (
              <Reveal key={step.step} delay={i * 140}>
                <TiltCard>
                  <SpotlightCard
                    idleGlow={i === 1}
                    className="group relative h-full rounded-2xl border border-seam bg-gradient-to-b from-panel to-panel-2/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-amber/40 hover:shadow-[0_20px_60px_-24px_rgba(226,164,76,0.35)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-full border border-amber/30 bg-amber/10 text-amber shadow-[0_0_24px_-6px_rgba(226,164,76,0.5)]">
                        <Icon />
                      </span>
                      <span className="font-mono text-[11px] tracking-[0.18em] text-fog/70">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-2xl">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-fog">{step.body}</p>
                  </SpotlightCard>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
