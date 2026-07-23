import { Suspense } from "react";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { ListSkeleton } from "@/components/app/skeletons";
import { ImportPanel } from "@/components/app/import/ImportPanel";
import {
  ApiKeysSection,
  BillingSection,
  CalendarSection,
  CardPhotoSection,
  SecuritySection,
  SuggestionsSection,
  VoiceInputSection,
} from "./sections";

export const metadata = { title: "Settings — Dhaga" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  // Auth guard: the one lookup that must resolve before any card renders.
  // Memoized, so each section re-reading the session/user costs nothing more.
  await requireUserIdForPage();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-fog">
          Everything here is about what Dhaga keeps — and only for you.
        </p>
      </div>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <BillingSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <SecuritySection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <CalendarSection searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <SuggestionsSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <CardPhotoSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <VoiceInputSection />
      </Suspense>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <ApiKeysSection />
      </Suspense>
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
    </div>
  );
}
