import type { ReactElement } from "react";

import { Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { Access } from "./Access";
import { Faq } from "./Faq";
import { GraphProof } from "./GraphProof";
import { Hero } from "./Hero";
import { Journey } from "./Journey";
import { Trust } from "./Trust";
import { UseCases } from "./UseCases";

export function FocusedHome(): ReactElement {
  return (
    <main className="relative overflow-hidden bg-ink text-paper">
      <Header />
      <Hero />
      <Journey />
      <GraphProof />
      <UseCases />
      <Trust />
      <Faq />
      <Access />
      <Footer />
    </main>
  );
}
