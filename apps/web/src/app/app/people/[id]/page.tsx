import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { aiGateReason } from "@/lib/ai/gate";
import { getContact } from "@/lib/repo/contacts";
import { isReachOutDue } from "@/lib/repo/reminders";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/app/skeletons";
import { BriefSection } from "@/components/app/contact/BriefSection";
import { KeepInTouch } from "@/components/app/contact/KeepInTouch";
import { WatchToggle } from "@/components/app/contact/WatchToggle";
import { OnDemandNetwork } from "@/components/app/contact/OnDemandNetwork";
import { ContactInfoCard } from "@/components/app/contact/ContactInfoCard";
import { DraftSection } from "@/components/app/contact/DraftSection";
import { ForgetButton } from "@/components/app/contact/ForgetButton";
import {
  MergeCandidatesSection,
  PersonIdentityHeader,
} from "./_sections/header-sections";
import {
  FactsSection,
  FollowUpsSection,
  NotesSection,
  RelationshipsSection,
  TimelineSection,
} from "./_sections/body-sections";
import {
  CardPhotosSection,
  ContactActionsSection,
  SignalsSection,
} from "./_sections/aside-sections";

export const metadata = { title: "Person — Dhaga" };

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserIdForPage();
  const { id } = await params;
  const detail = await getContact(id);
  if (!detail) notFound();
  const { contact, companyName, lastTouch } = detail;
  // Resolved ONCE for the whole page and handed to each AI control — the three
  // AI sections here must not each open their own metering read (aiGateReason is
  // React-cached, but the explicit prop keeps the single-read contract visible).
  const aiGate = await aiGateReason(userId);
  // Shared last-touch definition (notes + event scans count), so this badge
  // agrees with Home's due feed rather than nagging about someone Home dropped.
  const isDue = isReachOutDue(contact.reachOutEveryDays, lastTouch);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PersonIdentityHeader contactId={id} contact={contact} companyName={companyName} />

      {contact.source === "mentioned" ? (
        <Suspense fallback={<Skeleton className="h-16 w-full rounded-2xl" />}>
          <MergeCandidatesSection contactId={id} name={contact.name} />
        </Suspense>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <BriefSection contactId={id} aiGate={aiGate} />
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <RelationshipsSection contactId={id} name={contact.name} />
          </Suspense>
          <OnDemandNetwork contactId={id} />
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <FollowUpsSection contactId={id} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <FactsSection contactId={id} aiGate={aiGate} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <NotesSection contactId={id} />
          </Suspense>
          <DraftSection contactId={id} aiGate={aiGate} />
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <TimelineSection
              contactId={id}
              createdAt={contact.createdAt}
              source={contact.source}
              lastReachedOutAt={contact.lastReachedOutAt}
            />
          </Suspense>
        </div>

        <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-20">
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-2xl" />}>
            <ContactActionsSection contactId={id} />
          </Suspense>
          <ContactInfoCard detail={detail} />
          <Suspense fallback={<Skeleton className="h-28 w-40 rounded-xl" />}>
            <CardPhotosSection contactId={id} />
          </Suspense>
          <KeepInTouch
            contactId={id}
            everyDays={contact.reachOutEveryDays}
            lastTouch={lastTouch.toLocaleDateString()}
            due={isDue}
          />
          <WatchToggle
            contactId={id}
            watched={contact.watchedForSignals}
          />
          <Suspense fallback={<ListSkeleton rows={1} />}>
            <SignalsSection contactId={id} contactName={contact.name} />
          </Suspense>
        </aside>
      </div>

      <div className="border-t border-seam pt-5">
        <ForgetButton contactId={id} name={contact.name} />
      </div>
    </div>
  );
}
