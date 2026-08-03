import type { Metadata } from "next";

import { FocusedHome } from "@/components/landing/FocusedHome";

export const metadata: Metadata = {
  title: "Dhaga — the personal CRM you own",
  description:
    "A private, portable personal CRM for sales professionals, founders, investors, recruiters, and community builders. Capture cards, notes, and photos from the web, WhatsApp, or Telegram; search your network and follow up at the right time.",
  alternates: { canonical: "/" },
};

export default function Home(): React.ReactElement {
  return <FocusedHome />;
}
