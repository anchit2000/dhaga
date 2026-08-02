import type { Metadata } from "next";
import type { ReactElement } from "react";

import { AskDemo } from "@/components/landing/AskDemo";
import { Footer } from "@/components/landing/Closing";
import { Comparison } from "@/components/landing/Comparison";
import { Faq } from "@/components/landing/Faq";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { Access } from "@/components/landing/FocusedHome/Access";
import { Header } from "@/components/landing/Header";
import { NetworkSandbox } from "@/components/landing/NetworkSandbox";
import { HowItWorks, StatsBand } from "@/components/landing/Sections";
import { SITE_URL } from "@/utils/constants/site";

const TITLE = "Features — Dhaga";
const DESCRIPTION =
  "Explore how Dhaga captures meetings, notes, voice, messages and cards, " +
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
      <section className="mx-auto max-w-6xl px-6 pb-8 pt-32 sm:pt-40">
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
      <StatsBand />
      <HowItWorks />
      <FeatureHighlights />
      <AskDemo />
      <NetworkSandbox />
      <Comparison />
      <Faq />
      <Access />
      <Footer />
    </main>
  );
}
