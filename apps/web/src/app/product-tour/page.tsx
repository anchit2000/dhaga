import type { Metadata } from "next";
import type { ReactElement } from "react";

import { AskDemo } from "@/components/landing/AskDemo";
import { Footer } from "@/components/landing/Closing";
import { Comparison } from "@/components/landing/Comparison";
import { Faq } from "@/components/landing/Faq";
import { Header } from "@/components/landing/Header";
import { NetworkSandbox } from "@/components/landing/NetworkSandbox";
import { HowItWorks, StatsBand } from "@/components/landing/Sections";
import { SITE_URL } from "@/utils/constants/site";

const TITLE = "Product tour — Dhaga";
const DESCRIPTION =
  "Take a detailed tour of Dhaga: capture relationship context, search with cited answers, explore the private graph, and compare personal CRM approaches.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/product-tour" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Dhaga",
    url: `${SITE_URL}/product-tour`,
    locale: "en_US",
  },
};

export default function ProductTourPage(): ReactElement {
  return (
    <main className="relative overflow-hidden bg-ink text-paper">
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-28 sm:pt-32">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Product tour
        </p>
        <h1 className="mt-4 max-w-4xl text-balance font-display text-5xl font-medium tracking-tight sm:text-6xl">
          Go deeper when you want to.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-fog">
          The short feature page shows the product. This tour keeps the detailed workflow,
          examples, sandbox, and comparison in one optional deep dive.
        </p>
      </section>
      <StatsBand />
      <HowItWorks />
      <AskDemo />
      <NetworkSandbox />
      <Comparison />
      <Faq />
      <Footer />
    </main>
  );
}
