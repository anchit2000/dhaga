import { OnboardingTour } from "@/components/app/onboarding";
import { hasSeenOnboardingTour } from "@/lib/repo/settings";
import type { ReactElement } from "react";

/**
 * First-run tour trigger on its own boundary so its (cheap) seen-check never
 * holds back the dashboard. Renders nothing until it decides to auto-start.
 */
export async function OnboardingGate(): Promise<ReactElement> {
  const seenTour = await hasSeenOnboardingTour();
  return <OnboardingTour autoStart={!seenTour} />;
}
