import type { ReactElement } from "react";

import { Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { Access } from "./Access";
import { Faq } from "./Faq";
import { Hero } from "./Hero";
import { Journey } from "./Journey";
import { Outcomes } from "./Outcomes";
import { Trust } from "./Trust";
import { UseCases } from "./UseCases";

export function FocusedHome(): ReactElement {
  return (
    <main className="relative overflow-hidden bg-ink text-paper">
      <Header />
      <Hero />
      <Journey />
      <UseCases />
      <Trust />
      <Outcomes />
      <Faq />
      <Access />
      <Footer />
    </main>
  );
}
