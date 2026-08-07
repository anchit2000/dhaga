import { listConnectableCalendarProviders, listContactSyncProviders } from "@dhaga/core";
import { listCalendarConnections } from "@/lib/repo/calendar";
import { listContactConnections } from "@/lib/repo/contact-sync";
import { countAuthoredContacts } from "@/lib/repo/contacts";
import { CalendarConnectionsSetting } from "@/components/app/settings/CalendarConnectionsSetting";
import { ContactSyncSetting } from "@/components/app/settings/ContactSyncSetting";

export async function CalendarSection({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  const [connections, { calendar: status }] = await Promise.all([
    listCalendarConnections(),
    searchParams,
  ]);
  return (
    <CalendarConnectionsSetting
      providers={listConnectableCalendarProviders()}
      connections={connections}
      status={status}
    />
  );
}

/**
 * Server-side address-book accounts (Google People, Outlook). Distinct from the
 * calendar card above: contacts and calendar are independent OAuth grants stored
 * in separate tables, so connecting one never touches the other.
 */
export async function ContactSyncSection({
  searchParams,
}: {
  searchParams: Promise<{ contacts?: string }>;
}) {
  // countAuthoredContacts is one more read on the SAME request-pinned connection
  // listContactConnections() already resolves to (lib/db/request-scope memoizes
  // it for the render) — not a new getDb() fan-out, same as SuggestionsSection.
  const [connections, authoredCount, { contacts: status }] = await Promise.all([
    listContactConnections(),
    countAuthoredContacts(),
    searchParams,
  ]);
  return (
    <ContactSyncSetting
      providers={listContactSyncProviders()}
      connections={connections}
      authoredCount={authoredCount}
      status={status}
    />
  );
}
