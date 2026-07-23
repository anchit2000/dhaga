import Link from "next/link";
import { ArrowRight, BookOpen, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEVELOPER_HUB_TRACK,
  PRODUCT_HUB_TRACK,
  type DocsHubTrack,
} from "@/utils/constants/docs";
import type { ReactElement, ReactNode } from "react";

// Bespoke `/docs` hub landing, rendered by the catch-all route when the slug is
// empty (in place of the stock Fumadocs card grid). Two on-brand tracks —
// Product guide and Developer/self-hosting — each with a primary CTA and the
// key entry links beneath. Mobile-first: a single column that becomes two at
// `sm`. One accent (amber), one border (seam); tokens from globals.css.

interface DocsTrackCardProps {
  track: DocsHubTrack;
  icon: ReactNode;
}

function DocsTrackCard({ track, icon }: DocsTrackCardProps): ReactElement {
  return (
    <section className="cover-open flex flex-col rounded-2xl border border-fd-border bg-fd-card p-6 hover:border-amber/40 sm:p-8">
      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-fd-border bg-amber/10 text-amber">
        {icon}
      </span>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-fog">
        {track.eyebrow}
      </p>
      <h2 className="mt-2 font-display text-2xl tracking-tight text-fd-foreground">
        {track.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
        {track.tagline}
      </p>

      <div className="mt-6">
        <Button render={<Link href={track.href} />} size="sm">
          {track.ctaLabel}
          <ArrowRight />
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-1 border-t border-fd-border pt-6">
        {track.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-amber/5"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-fd-foreground">
                {link.title}
                <ArrowRight className="size-3 text-fog opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="text-xs leading-relaxed text-fd-muted-foreground">
                {link.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocsHub(): ReactElement {
  return (
    <div className="mx-auto w-full max-w-4xl py-4">
      <header className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-widest text-fog">
          Documentation
        </p>
        <h1 className="mt-3 font-display text-3xl tracking-tight text-fd-foreground sm:text-4xl">
          Dhaga<span className="text-amber">.</span> docs
        </h1>
        <p className="mt-4 text-base leading-relaxed text-fd-muted-foreground">
          Dhaga (धागा — &ldquo;thread&rdquo;) turns every card scan, badge, and
          voice note into a private knowledge graph you can search in plain
          language. Pick your path.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <DocsTrackCard track={PRODUCT_HUB_TRACK} icon={<BookOpen />} />
        <DocsTrackCard track={DEVELOPER_HUB_TRACK} icon={<Terminal />} />
      </div>
    </div>
  );
}
