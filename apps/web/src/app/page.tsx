import { AskDemo } from "@/components/landing/AskDemo";
import { Comparison } from "@/components/landing/Comparison";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { FeatureStory } from "@/components/landing/FeatureStory";
import { HowItWorks, StatsBand } from "@/components/landing/Sections";
import { OpenSource } from "@/components/landing/OpenSource";
import { Pricing } from "@/components/landing/Pricing";
import { StickyCta } from "@/components/landing/StickyCta";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <StatsBand />
      <HowItWorks />
      <FeatureStory />
      <AskDemo />
      <Comparison />
      <OpenSource />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
      <StickyCta />
    </main>
  );
}
