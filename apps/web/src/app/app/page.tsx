import { Suspense } from "react";
import { DashboardSection } from "@/components/app/home/DashboardSection";
import { HomeDock } from "@/components/app/home/HomeDock";
import { OnboardingGate } from "@/components/app/home/OnboardingGate";
import { HomeBentoSkeleton, PageHeaderSkeleton } from "@/components/app/skeletons";
import { requireUserIdForPage } from "@/lib/auth/guard";

export const metadata = { title: "Home — Dhaga" };

/**
 * Home streams per region: the shell auth-gates then paints instantly, and each
 * data region resolves on its own. The dashboard (header + bento) is one
 * boundary — its interactive tiles share HomeDashboard's grid and detail sheet,
 * so they render together — while the capture dock (all-fast queries) and the
 * onboarding tour paint without waiting on the dashboard's slow serial chain.
 */
export default async function HomePage() {
  const userId = await requireUserIdForPage();

  return (
    <div className="space-y-8 pb-16">
      <Suspense fallback={null}>
        <OnboardingGate />
      </Suspense>

      <Suspense
        fallback={
          <>
            <PageHeaderSkeleton />
            <HomeBentoSkeleton />
          </>
        }
      >
        <DashboardSection userId={userId} />
      </Suspense>

      <Suspense fallback={null}>
        <HomeDock userId={userId} />
      </Suspense>
    </div>
  );
}
