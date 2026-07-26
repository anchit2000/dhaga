import { HERO_FLOW } from "@/utils/constants/landing";
import { STEP_ICONS } from "./StepIcons";

/**
 * Compact above-the-fold "how it works" strip: capture → connect → ask, using
 * the same icons as the full {@link HowItWorks} section. Static/server-rendered;
 * grid-cols-3 holds the three moves side by side down to 375px.
 */
export function HeroFlow(): React.JSX.Element {
  return (
    <ul
      className="mx-auto grid max-w-md grid-cols-3 gap-3 sm:gap-6"
      aria-label="How Dhaga works, in three steps"
    >
      {HERO_FLOW.map((item, i) => {
        const Icon = STEP_ICONS[i] ?? STEP_ICONS[0];
        return (
          <li key={item.label} className="flex flex-col items-center text-center">
            <span className="flex size-9 items-center justify-center rounded-full border border-amber/25 bg-amber/10 text-amber">
              <Icon />
            </span>
            <span className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/90">
              {item.label}
            </span>
            <span className="mt-1 text-[11px] leading-tight text-fog">
              {item.caption}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
