import type { Metadata } from "next";

import { FocusedHome } from "@/components/landing/FocusedHome";

export const metadata: Metadata = {
  title: "Dhaga — the personal CRM you own",
  description:
    "A private, portable personal CRM with an interactive knowledge graph for sales professionals, founders, investors, recruiters, and community builders. Capture relationship context, find warm paths, and follow up at the right time.",
  alternates: { canonical: "/" },
};

export default function Home(): React.ReactElement {
  return <FocusedHome />;
}
