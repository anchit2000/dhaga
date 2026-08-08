import { Suspense } from "react";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getBillingGate } from "@/lib/hosted/gate";
import { ListSkeleton } from "@/components/app/skeletons";
import { ImportPanel } from "@/components/app/import/ImportPanel";
import { OnboardingTour } from "@/components/app/onboarding";
import { SettingsTabs } from "@/components/app/settings/SettingsTabs";
import { ConnectAssistantSetting } from "@/components/app/settings/ConnectAssistantSetting";
import {
  ApiKeysSection,
  AppearanceSection,
  BillingSection,
  CalendarSection,
  ContactSyncSection,
  CardPhotoSection,
  CreditsSection,
  MessagingSection,
  ProfileSection,
  SecuritySection,
  SuggestionsSection,
  VoiceTeachingSection,
} from "./sections";

export const metadata = { title: "Settings — Dhaga" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string; contacts?: string }>;
}) {
  // Auth guard: the one lookup that must resolve before any card renders.
  // Memoized, so each section re-reading the session/user costs nothing more.
  const userId = await requireUserIdForPage();
  // Whether the "Plan & billing" tab exists at all. BillingSection renders null
  // when the instance has no billing (core-only self-host), and a permanently
  // empty tab is worse than none — so the tab list needs the answer up front.
  // One indexed read (the entitlement hot path), awaited here for the same
  // reason `calendarActive` is: it decides which triggers render, not content.
  const billingActive = Boolean(await (await getBillingGate()).getPlanSummary(userId));
  // searchParams is a fast (non-DB) resolve; awaiting it here only decides which
  // tab opens. The OAuth-callback flow returns to ?calendar=… and relies on the
  // Calendar tab being selected. The promise is still passed to CalendarSection
  // (unchanged) so its own listCalendarConnections() query keeps streaming.
  const { calendar } = await searchParams;

  return (
    // max-w-3xl, not 2xl: the eight tab triggers measure 720px, so a 672px
    // column clipped the last one ("Import" → "Im", underline sliced in half)
    // at every width including desktop. 768px holds the whole row.
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Renders null; resumes the onboarding tour's settings leg (notifications
          → contact sync → import) when handed off from Home, guarded by a
          sessionStorage flag. */}
      <OnboardingTour autoStart={false} />
      <div>
        <h1 className="font-display text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fog">
          Everything here is about what Dhaga keeps — and only for you.
        </p>
      </div>
      <SettingsTabs
        calendarActive={Boolean(calendar)}
        billingActive={billingActive}
        account={
          <>
            <Suspense fallback={<ListSkeleton rows={2} />}>
              <ProfileSection />
            </Suspense>
            <Suspense fallback={<ListSkeleton rows={3} />}>
              <AppearanceSection />
            </Suspense>
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <SecuritySection />
            </Suspense>
            {/* No query behind it, so no Suspense boundary — it sits above the
                tokens card because a local client needs a token from there. */}
            <ConnectAssistantSetting />
            <Suspense fallback={<ListSkeleton rows={2} />}>
              <ApiKeysSection />
            </Suspense>
          </>
        }
        billing={
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <BillingSection />
          </Suspense>
        }
        credits={
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <CreditsSection />
          </Suspense>
        }
        capture={
          <>
            <Suspense fallback={<ListSkeleton rows={2} />}>
              <CardPhotoSection />
            </Suspense>
            <Suspense fallback={<ListSkeleton rows={2} />}>
              <VoiceTeachingSection />
            </Suspense>
            <Suspense fallback={<ListSkeleton rows={2} />}>
              <ContactSyncSection searchParams={searchParams} />
            </Suspense>
          </>
        }
        calendar={
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <CalendarSection searchParams={searchParams} />
          </Suspense>
        }
        messaging={
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <MessagingSection />
          </Suspense>
        }
        suggestions={
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <SuggestionsSection />
          </Suspense>
        }
        importPanel={
          <section id="import" className="scroll-mt-20 space-y-4 rounded-2xl border border-seam bg-panel p-5">
            <div>
              <h2 className="font-display text-lg">Import contacts</h2>
              <p className="mt-1 text-sm text-fog">
                Bring in a Google Contacts or LinkedIn CSV. Parsing happens in your browser,
                and existing people are skipped safely.
              </p>
            </div>
            <ImportPanel />
            <div className="border-t border-seam pt-4">
              <p className="text-sm font-medium text-paper">Connected contacts</p>
              <p className="mt-1 text-xs text-fog">
                Direct Google and on-device contact sync are not connected yet. They will
                require explicit account or device permission before Dhaga reads anything.
              </p>
            </div>
          </section>
        }
      />
    </div>
  );
}
