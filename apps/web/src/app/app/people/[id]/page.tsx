import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Waypoints } from "lucide-react";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { isReachOutDue } from "@/lib/repo/reminders";
import { Button } from "@/components/ui/button";
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
  GroupChipsSection,
  MergeCandidatesSection,
} from "./_sections/header-sections";
import {
  FactsSection,
  FollowUpsSection,
  NotesSection,
  RelationshipsSection,
  TimelineSection,
} from "./_sections/body-sections";
import { CardPhotosSection, SignalsSection } from "./_sections/aside-sections";

export const metadata = { title: "Person — Dhaga" };

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserIdForPage();
  const { id } = await params;
  const detail = await getContact(id);
  if (!detail) notFound();
  const { contact, companyName } = detail;
  const lastTouch = contact.lastReachedOutAt ?? contact.createdAt;
  const isDue = isReachOutDue(contact.reachOutEveryDays, lastTouch);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xl text-amber">
            {contact.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl tracking-tight">
              {contact.name}
              {contact.nickname ? (
                <span className="ml-2 text-lg text-fog">“{contact.nickname}”</span>
              ) : null}
            </h1>
            <p className="mt-0.5 text-sm text-fog">
              {[contact.title, companyName].filter(Boolean).join(" · ") ||
                "No title or company yet"}
            </p>
            <Suspense
              fallback={
                <div className="mt-2">
                  <Skeleton className="h-11 w-40 rounded-md" />
                </div>
              }
            >
              <GroupChipsSection contactId={id} tags={contact.tags} />
            </Suspense>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href={`/app/people/${id}/edit`} />}
            variant="outline"
            size="sm"
          >
            <Pencil />
            Edit
          </Button>
          <Button
            render={<Link href={`/app/graph?focus=${id}`} />}
            variant="outline"
            size="sm"
          >
            <Waypoints />
            View in graph
          </Button>
        </div>
      </div>

      {contact.source === "mentioned" ? (
        <Suspense fallback={<Skeleton className="h-16 w-full rounded-2xl" />}>
          <MergeCandidatesSection contactId={id} name={contact.name} />
        </Suspense>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <BriefSection contactId={id} />
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <RelationshipsSection contactId={id} name={contact.name} />
          </Suspense>
          <OnDemandNetwork contactId={id} />
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <FollowUpsSection contactId={id} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <FactsSection contactId={id} />
          </Suspense>
          <Suspense fallback={<ListSkeleton rows={3} />}>
            <NotesSection contactId={id} />
          </Suspense>
          <DraftSection contactId={id} />
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
