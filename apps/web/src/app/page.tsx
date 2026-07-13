import { AskDemo } from "@/components/landing/AskDemo";
import { Comparison } from "@/components/landing/Comparison";
import { DeferredDecor } from "@/components/landing/DeferredDecor";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { FeatureStory } from "@/components/landing/FeatureStory";
import { HowItWorks, StatsBand } from "@/components/landing/Sections";
import { OpenSource } from "@/components/landing/OpenSource";
import { Pricing } from "@/components/landing/Pricing";
import { StickyCta } from "@/components/landing/StickyCta";
import { getCurrentUser } from "@/lib/auth/guard";

export default async function Home() {
  const user = await getCurrentUser();
  const isSignedIn = !!user;

  return (
    <main className="relative">
      <DeferredDecor />
      <Header isSignedIn={isSignedIn} />
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
      <StickyCta isSignedIn={isSignedIn} />
    </main>
  );
}
