import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { ArrowRight, ArrowUpRight, BookOpen, Check } from "lucide-react";

import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/utils/constants/site";
import { USE_CASE_ARTICLES, USE_CASE_PAGE_ACCENTS, USE_CASES } from "@/utils/constants/landing/use-cases";

interface UseCasePageProps {
  params: Promise<{ role: string }>;
}

export function generateStaticParams(): Array<{ role: string }> {
  return USE_CASES.map((useCase) => ({ role: useCase.slug }));
}

export async function generateMetadata({ params }: UseCasePageProps): Promise<Metadata> {
  const { role } = await params;
  const useCase = USE_CASES.find((item) => item.slug === role);
  if (!useCase) return {};
  const title = `Personal CRM for ${useCase.label} — Dhaga`;
  return {
    title,
    description: useCase.intro,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
    openGraph: { title, description: useCase.intro, url: `${SITE_URL}/use-cases/${useCase.slug}` },
  };
}

export default async function UseCasePage({ params }: UseCasePageProps): Promise<ReactElement> {
  const { role } = await params;
  const useCase = USE_CASES.find((item) => item.slug === role);
  if (!useCase) notFound();
  const article = USE_CASE_ARTICLES[useCase.slug];
  const roleAccent = USE_CASE_PAGE_ACCENTS[useCase.slug];

  return (
    <main className="relative bg-ink text-paper">
      <Header />
      <section className="mx-auto max-w-[1200px] px-6 pb-20 pt-32 sm:pt-40">
        <p className={`font-mono text-xs uppercase tracking-[0.22em] ${roleAccent.text}`}>Dhaga for {useCase.label}</p>
        <h1 className="mt-5 max-w-4xl text-balance font-display text-5xl leading-[1.02] sm:text-6xl">{useCase.headline}</h1>
        <p className="mt-6 max-w-3xl text-pretty text-lg leading-8 text-fog">{useCase.intro}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button render={<Link href="#request-access" />} size="lg">Request early access <ArrowRight /></Button>
          <Button render={<Link href="/features" />} variant="outline" size="lg">See how Dhaga works</Button>
        </div>
      </section>
      <section className="border-y border-seam bg-panel/35">
        <div className="mx-auto grid max-w-[1200px] gap-px bg-seam sm:grid-cols-2">
          <UseCaseList title="What breaks today" items={useCase.problems} />
          <UseCaseList title="What Dhaga changes" items={useCase.outcomes} positive accent={roleAccent.text} />
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <p className="max-w-3xl text-pretty text-lg leading-8 text-fog">
          Dhaga is a personal relationship memory, not a way to copy a company database. Only save information you are permitted to retain, and keep confidential employer or customer data in the systems where it belongs.
        </p>
      </section>
      <section className="border-y border-seam bg-panel/35">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <p className={`font-mono text-xs uppercase tracking-[0.22em] ${roleAccent.text}`}>
            See how you&apos;d use Dhaga
          </p>
          <Link
            href={article.href}
            className="group mt-6 grid gap-8 rounded-2xl border border-seam bg-panel p-8 transition-colors hover:border-line hover:bg-panel-2 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-10"
          >
            <span className={`flex size-12 items-center justify-center rounded-xl border ${roleAccent.soft}`}>
              <BookOpen className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="font-display text-2xl text-paper">{article.title}</span>
              <span className="mt-2 block max-w-3xl text-sm leading-6 text-fog">
                {article.description}
              </span>
            </span>
            <ArrowUpRight
              className={`size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${roleAccent.text}`}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
      <FinalCta />
      <Footer />
    </main>
  );
}

function UseCaseList({ title, items, positive = false, accent = "text-ember" }: { title: string; items: readonly string[]; positive?: boolean; accent?: string }): ReactElement {
  return (
    <div className="bg-panel p-8 sm:p-12">
      <h2 className="font-display text-3xl">{title}</h2>
      <ul className="mt-8 space-y-5">
        {items.map((item) => <li key={item} className="flex gap-3 leading-7 text-fog">{positive ? <Check className={`mt-1 size-5 shrink-0 ${accent}`} /> : <span className="text-human">·</span>}<span>{item}</span></li>)}
      </ul>
    </div>
  );
}
