import { headers } from "next/headers";
import { listConnectableCalendarProviders } from "@dhaga/core";
import { getCurrentUser, requireUserIdForPage } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { getBillingGate } from "@/lib/hosted/gate";
import { getSttEngine, shouldStoreCardPhotos } from "@/lib/repo/settings";
import { listCalendarConnections } from "@/lib/repo/calendar";
import {
  getDailySuggestionCount,
  getSchedulePrefs,
  isDailyDigestEnabled,
} from "@/lib/repo/suggestion-settings";
import { countCardImages } from "@/lib/repo/card-images";
import { CalendarConnectionsSetting } from "@/components/app/settings/CalendarConnectionsSetting";
import { SuggestionsSetting } from "@/components/app/settings/SuggestionsSetting";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";
import { VoiceInputSetting } from "@/components/app/settings/VoiceInputSetting";
import { ApiKeysSetting } from "@/components/app/settings/ApiKeysSetting";
import { BillingSetting } from "@/components/app/settings/BillingSetting";
import { SecuritySetting } from "@/components/app/settings/SecuritySetting";

/**
 * One async data-fetching wrapper per settings card. Each awaits only its own
 * card's query so it can stream in behind its own <Suspense> boundary — a slow
 * billing/session/calendar lookup no longer blocks the whole page. All share
 * the one request-pinned tenant connection (safe) and the memoized session.
 */

/** Only renders on a hosted instance with EE billing (getPlanSummary non-null). */
export async function BillingSection() {
  const userId = await requireUserIdForPage();
  const planSummary = await (await getBillingGate()).getPlanSummary(userId);
  return planSummary ? <BillingSetting summary={planSummary} /> : null;
}

export async function SecuritySection() {
  // getCurrentUser() is the memoized session lookup the page guard already ran;
  // twoFactorEnabled is added to the user row by the twoFactor plugin — not part
  // of the base user type getCurrentUser() is statically typed with.
  const user = await getCurrentUser();
  return (
    <SecuritySetting
      twoFactorEnabled={Boolean((user as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled)}
    />
  );
}

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

export async function SuggestionsSection() {
  const [count, prefs, digestEnabled] = await Promise.all([
    getDailySuggestionCount(),
    getSchedulePrefs(),
    isDailyDigestEnabled(),
  ]);
  return <SuggestionsSetting count={count} prefs={prefs} digestEnabled={digestEnabled} />;
}

export async function CardPhotoSection() {
  const [enabled, count] = await Promise.all([shouldStoreCardPhotos(), countCardImages()]);
  return <CardPhotoSetting enabled={enabled} count={count} />;
}

export async function VoiceInputSection() {
  const engine = await getSttEngine();
  return <VoiceInputSetting engine={engine} />;
}

export async function ApiKeysSection() {
  const auth = await getAuth();
  const { apiKeys } = await auth.api.listApiKeys({ headers: await headers() });
  return <ApiKeysSetting keys={apiKeys} />;
}
