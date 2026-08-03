import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

import { Footer } from "@/components/landing/Closing";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { Access } from "@/components/landing/FocusedHome/Access";
import { Header } from "@/components/landing/Header";
import { SITE_URL } from "@/utils/constants/site";

const TITLE = "Features — Dhaga";
const DESCRIPTION =
  "Explore how Dhaga captures meetings, notes, voice, messages and cards from the web, WhatsApp and Telegram, " +
  "builds a private knowledge graph, finds warm paths and helps you follow up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Dhaga",
    url: `${SITE_URL}/features`,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export default function FeaturesPage(): ReactElement {
  return (
    <main className="relative overflow-hidden bg-ink text-paper">
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-28 sm:pt-32">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Features
        </p>
        <h1 className="mt-4 max-w-4xl text-balance font-display text-5xl font-medium tracking-tight sm:text-6xl">
          Keep the context. Find the connection. Make the next move.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-fog">
          Dhaga turns everyday professional interactions into a private,
          searchable memory—without making you maintain another spreadsheet.
        </p>
      </section>
      <FeatureHighlights />
      <section className="mx-auto grid max-w-6xl gap-3 px-6 py-10 sm:grid-cols-2">
        <Link
          href="/product-tour"
          className="rounded-2xl border border-seam bg-panel p-5 transition-colors hover:border-trust/60 hover:bg-panel-2"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-trust">
            Want the details?
          </span>
          <span className="mt-2 block font-display text-xl">Take the full product tour →</span>
          <span className="mt-2 block text-sm leading-6 text-fog">
            See the three-step workflow, cited answers, live graph sandbox, and comparison.
          </span>
        </Link>
        <Link
          href="/pricing"
          className="rounded-2xl border border-seam bg-panel p-5 transition-colors hover:border-magic/60 hover:bg-panel-2"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-magic">
            Ready to choose?
          </span>
          <span className="mt-2 block font-display text-xl">See plans and monthly pricing →</span>
          <span className="mt-2 block text-sm leading-6 text-fog">
            Compare Free, Pro, and Power—including what annual billing saves.
          </span>
        </Link>
      </section>
      <Access />
      <Footer />
    </main>
  );
}
