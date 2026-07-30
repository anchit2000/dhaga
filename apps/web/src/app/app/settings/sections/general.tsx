import { headers } from "next/headers";
import { hasLLM, listConnectableCalendarProviders } from "@dhaga/core";
import { getCurrentUser, requireUserIdForPage } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { getBillingGate } from "@/lib/hosted/gate";
import { aiCreditsUsedThisMonth, effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "@/lib/ai/metering";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { listVocab } from "@/lib/repo/voice-vocab";
import { listCalendarConnections } from "@/lib/repo/calendar";
import {
  getDailySuggestionCount,
  getSchedulePrefs,
  isConfirmationsDigestEnabled,
  isDailyDigestEnabled,
  isMorningReminderEnabled,
} from "@/lib/repo/suggestion-settings";
import { countCardImages } from "@/lib/repo/card-images";
import { CalendarConnectionsSetting } from "@/components/app/settings/CalendarConnectionsSetting";
import { SuggestionsSetting } from "@/components/app/settings/SuggestionsSetting";
import { CardPhotoSetting } from "@/components/app/settings/CardPhotoSetting";
import { VoiceTeaching } from "@/components/app/settings/VoiceTeaching";
import { ApiKeysSetting } from "@/components/app/settings/ApiKeysSetting";
import { BillingSetting } from "@/components/app/settings/BillingSetting";
import { ProfileSetting } from "@/components/app/settings/ProfileSetting";
import { SecuritySetting } from "@/components/app/settings/SecuritySetting";

/**
 * One async data-fetching wrapper per settings card. Each awaits only its own
 * card's query so it can stream in behind its own <Suspense> boundary — a slow
 * billing/session/calendar lookup no longer blocks the whole page. All share
 * the one request-pinned tenant connection (safe) and the memoized session.
 */

/** Name (editable via better-auth) + account email (read-only). Core — renders
 *  the same in self-host and hosted mode. */
export async function ProfileSection() {
  const user = await getCurrentUser();
  return user ? <ProfileSetting name={user.name} email={user.email} /> : null;
}

/** Only renders on a hosted instance with EE billing (getPlanSummary non-null).
 *  When it does, it also surfaces the acting user's monthly AI-credit balance,
 *  read through the same metering accessors that enforce the cap (hasLLM gate,
 *  so no line shows when the instance has no LLM configured). */
export async function BillingSection() {
  const userId = await requireUserIdForPage();
  const gate = await getBillingGate();
  const planSummary = await gate.getPlanSummary(userId);
  if (!planSummary) return null;
  const [used, unlimited] = await Promise.all([
    hasLLM() ? aiCreditsUsedThisMonth() : Promise.resolve(0),
    // The metering answer, not the billing gate's: with plan-cap enforcement on
    // the gate would say "unlimited" while the dock correctly shows "n of 300".
    hasLLM() ? hasUnlimitedAiCredits(userId) : Promise.resolve(false),
  ]);
  const aiUsage = hasLLM() ? { used, cap: await effectiveMonthlyAiCap(), unlimited } : null;
  return <BillingSetting summary={planSummary} aiUsage={aiUsage} />;
}

export async function SecuritySection() {
  // getCurrentUser() is the memoized session lookup the page guard already ran;
  // twoFactorEnabled is added to the user row by the twoFactor plugin — not part
  // of the base user type getCurrentUser() is statically typed with.
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <SecuritySetting
      email={user.email}
      twoFactorEnabled={Boolean((user as { twoFactorEnabled?: boolean }).twoFactorEnabled)}
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
  const [count, prefs, digestEnabled, confirmationsDigestEnabled, reminderEnabled] = await Promise.all([
    getDailySuggestionCount(),
    getSchedulePrefs(),
    isDailyDigestEnabled(),
    isConfirmationsDigestEnabled(),
    isMorningReminderEnabled(),
  ]);
  return (
    <SuggestionsSetting
      count={count}
      prefs={prefs}
      digestEnabled={digestEnabled}
      confirmationsDigestEnabled={confirmationsDigestEnabled}
      reminderEnabled={reminderEnabled}
    />
  );
}

export async function CardPhotoSection() {
  const [enabled, count] = await Promise.all([shouldStoreCardPhotos(), countCardImages()]);
  return <CardPhotoSetting enabled={enabled} count={count} />;
}

export async function VoiceTeachingSection() {
  const terms = await listVocab();
  return <VoiceTeaching terms={terms} />;
}

export async function ApiKeysSection() {
  const auth = await getAuth();
  const { apiKeys } = await auth.api.listApiKeys({ headers: await headers() });
  return <ApiKeysSetting keys={apiKeys} />;
}
