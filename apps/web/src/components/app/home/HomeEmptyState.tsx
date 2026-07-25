import Link from "next/link";
import { ThreadMark } from "@/components/brand/ThreadMark";
import { Button } from "@/components/ui/button";
import { HOME_EMPTY_STEPS } from "@/utils/constants/home";

/**
 * First-run Home surface for a brand-new account (no people captured yet).
 * A calm, centered welcome that orients the user instead of showing an empty
 * bento grid. Complementary to OnboardingTour (the driver.js walkthrough that
 * auto-starts once) — it keeps the tour's `[data-tour="updates"]` anchor alive
 * for a zero-data account, so no tour step misses its target.
 */
export function HomeEmptyState(): React.ReactElement {
  return (
    <section
      data-tour="updates"
      className="flex flex-col items-center rounded-2xl border border-seam bg-panel px-6 py-14 text-center sm:py-20"
    >
      <ThreadMark size={56} />
      <h2 className="mt-6 font-display text-2xl tracking-tight text-paper sm:text-3xl">
        Welcome to Dhaga
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-fog">
        Capture the people you meet and Dhaga threads them into a private
        knowledge graph — so you always have a thread to pull when it matters.
      </p>

      <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <Button render={<Link href="/app/quick-add" />} size="lg" className="w-full sm:w-auto">
          Capture your first contact
        </Button>
        <Button
          render={<Link href="/app/people/new" />}
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
        >
          Add manually
        </Button>
      </div>

      <ol className="mt-12 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        {HOME_EMPTY_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-xl border border-seam bg-ink/40 p-4 text-left"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-ember">
              Step {index + 1}
            </span>
            <p className="mt-2 text-sm text-paper">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-fog">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
