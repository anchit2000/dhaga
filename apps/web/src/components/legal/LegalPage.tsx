import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/**
 * The shared shell for the standalone legal pages — Privacy, Terms, Refunds,
 * Contact. Extracted from the Privacy page when three more pages needed the
 * identical wordmark / title / intro / section-list markup rather than four
 * copies of it (the no-duplicate-code rule).
 *
 * `body` is a ReactNode, not a string, because these pages have to link to each
 * other and to the processors; the section list itself stays plain data so a
 * page reads as its content and nothing else.
 */
export function LegalPage({
  title,
  intro,
  sections,
  updated,
}: {
  title: string;
  intro: ReactNode;
  sections: readonly LegalSection[];
  /** Last substantive review, e.g. "8 August 2026". Legal pages that don't say
   *  when they were written invite the reader to assume they're stale. */
  updated: string;
}): React.ReactElement {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="font-display text-lg text-paper">
        dhaga<span className="text-ember">.</span>
      </Link>
      <h1 className="mt-8 font-display text-3xl tracking-tight text-paper">{title}</h1>
      <p className="mt-2 text-sm text-fog">{intro}</p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-fog">
        Last updated {updated}
      </p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg text-paper">{section.heading}</h2>
            <div className="mt-1.5 text-sm leading-relaxed text-fog">{section.body}</div>
          </section>
        ))}
      </div>
      <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-seam pt-6 text-sm text-fog">
        <Link href="/privacy" className="hover:text-paper">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-paper">
          Terms
        </Link>
        <Link href="/refunds" className="hover:text-paper">
          Refunds &amp; cancellation
        </Link>
        <Link href="/contact" className="hover:text-paper">
          Contact
        </Link>
      </nav>
    </main>
  );
}
