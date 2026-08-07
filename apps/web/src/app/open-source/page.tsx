import type { Metadata } from "next";
import type { ReactElement } from "react";

import { Footer } from "@/components/landing/Closing";
import { Access } from "@/components/landing/FocusedHome/Access";
import { Header } from "@/components/landing/Header";
import { OpenSource } from "@/components/landing/OpenSource";
import { SITE_URL } from "@/utils/constants/site";

const TITLE = "Open source — Dhaga";
const DESCRIPTION =
  "Inspect, self-host and extend Dhaga's AGPL-licensed personal CRM core. " +
  "Keep control of your relationship data and export it whenever you want.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/open-source" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Dhaga",
    url: `${SITE_URL}/open-source`,
    locale: "en_US",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export default function OpenSourcePage(): ReactElement {
  return (
    <main className="relative overflow-hidden bg-ink pt-20 text-paper">
      <Header />
      <OpenSource />
      <Access />
      <Footer />
    </main>
  );
}
