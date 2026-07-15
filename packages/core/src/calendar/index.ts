import { DemoCalendarProvider } from "./demo-provider";
import { GoogleCalendarProvider } from "./google-provider";
import { MicrosoftCalendarProvider } from "./microsoft-provider";
import type { CalendarProvider, CalendarProviderInfo } from "./types";

export type {
  BusyInterval,
  TimeRange,
  CalendarTokens,
  CalendarProvider,
  CalendarProviderInfo,
} from "./types";
export { GoogleCalendarProvider } from "./google-provider";
export { MicrosoftCalendarProvider } from "./microsoft-provider";
export { DemoCalendarProvider } from "./demo-provider";
export {
  mergeBusy,
  findOpenSlots,
  dayLoad,
  isOverloaded,
  type OpenSlot,
  type WorkingHours,
  type DayLoad,
} from "./availability";
export { buildIcs, buildAddToCalendarLinks } from "./ics";
export { spreadAcrossWeek, type SpreadItem, type DayBucket } from "./spread";

/**
 * Calendar gateway — the same registry-on-globalThis shape as the search
 * (../search/index.ts) and LLM gateways. Google + Microsoft ship built-in; a
 * contributor adds Apple/CalDAV/Fastmail/an .ics feed by implementing
 * CalendarProvider (./types.ts) and calling registerCalendarProvider(), with
 * zero changes to callers (Open/Closed, Dependency Inversion).
 */
const providerStore = globalThis as unknown as {
  __dhagaCalendarProviders?: Map<string, CalendarProvider>;
};

function builtIns(): CalendarProvider[] {
  return [new GoogleCalendarProvider(), new MicrosoftCalendarProvider(), new DemoCalendarProvider()];
}

function calendarProviders(): Map<string, CalendarProvider> {
  providerStore.__dhagaCalendarProviders ??= new Map();
  const providers = providerStore.__dhagaCalendarProviders;
  for (const provider of builtIns()) {
    if (!providers.has(provider.id)) providers.set(provider.id, provider);
  }
  return providers;
}

export function registerCalendarProvider(provider: CalendarProvider): () => void {
  if (!provider.id.trim()) throw new Error("Calendar provider id cannot be empty");
  calendarProviders().set(provider.id, provider);
  return () => calendarProviders().delete(provider.id);
}

export function getCalendarProvider(id: string): CalendarProvider {
  const provider = calendarProviders().get(id);
  if (!provider) throw new Error(`Unknown calendar provider "${id}"`);
  return provider;
}

/** Every registered provider with its configured flag — for the connect UI. */
export function listCalendarProviders(): CalendarProviderInfo[] {
  return [...calendarProviders().values()].map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
  }));
}

/** Providers a user can actually connect right now (credentials present). */
export function listConnectableCalendarProviders(): CalendarProviderInfo[] {
  return listCalendarProviders().filter((provider) => provider.configured);
}
