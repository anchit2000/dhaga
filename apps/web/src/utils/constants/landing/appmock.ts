import type { FeedItem, ProfileFact } from "@/types";

export const MOCK_CIRCLES = [
  { dot: "#e2a44c", name: "Web Summit 2026" },
  { dot: "#7fb98a", name: "Investors" },
  { dot: "#8aa8d8", name: "Founders" },
  { dot: "#c98a9e", name: "Bangalore Chapter" },
] as const;

export const MOCK_FEED: FeedItem[] = [
  {
    personId: "sarah",
    text: "Sarah Chen changed jobs: Stripe → founding something new",
    bold: ["Sarah Chen"],
    time: "2m",
  },
  {
    text: "You scanned 4 cards at Web Summit — grouped into one event",
    bold: ["Web Summit"],
    time: "1h",
  },
  {
    personId: "priya",
    text: "Reminder: follow up with Priya Nair — she's back from Singapore today",
    bold: ["Priya Nair"],
    time: "3h",
  },
  {
    personId: "rohan",
    text: "Voice note transcribed — 3 facts added to Rohan Mehta",
    bold: ["Rohan Mehta"],
    time: "5h",
  },
  {
    personId: "alice",
    text: "Draft ready: follow-up email to Alice Krejčová",
    bold: ["Alice Krejčová"],
    time: "1d",
  },
];

export const MOCK_PROFILE_FACTS: ProfileFact[] = [
  { text: "Leaving Stripe in March, exploring fintech infra", source: "voice note · Web Summit" },
  { text: "Interested in our API for onboarding flows", source: "voice note · Web Summit" },
  { text: "Two kids, loves sailing", source: "voice note · Web Summit" },
];

export const MOCK_TIMELINE = [
  { label: "You met at Web Summit 2026", date: "JUN 12" },
  { label: "Voice note added", date: "JUN 12" },
  { label: "Follow-up email sent", date: "JUN 13" },
] as const;

/** Home's hero "Today" tile. `bucket` is the real BUCKET_LABEL (Check-in /
 *  Due / Network) rendered as an ember mono tag, then "· reason". */
export const MOCK_HOME_TODAY = [
  { personId: "sarah", name: "Sarah Chen", bucket: "Due", reason: "met at Web Summit — promised an intro" },
  { personId: "priya", name: "Priya Nair", bucket: "Check-in", reason: "back from Singapore today" },
  { personId: "rohan", name: "Rohan Mehta", bucket: "Network", reason: "3 new facts from your voice note" },
] as const;

export const MOCK_HOME_FOLLOWUPS = [
  { action: "Send the API onboarding deck to", contact: "Alice Krejčová" },
  { action: "Intro the Bangalore founders to", contact: "Kavya Singh" },
] as const;

/** Home's "Signals" tile: job-change/news alerts across the graph (BRD §6.7). */
export const MOCK_HOME_SIGNALS = [
  { kind: "Job change", name: "Sarah Chen", company: "Stripe", headline: "Left Stripe — founding something new" },
  { kind: "News", name: "Dev Anand", company: "Portside", headline: "Portside closed a Series A" },
] as const;

/** Home's "Going quiet" tile: valuable relationships decaying toward dormant —
 *  strength label + score, plus how long since the last touch. */
export const MOCK_HOME_QUIET = [
  { name: "Darren Adams", detail: "VP Sales · Northwind", strength: "Cooling", score: 22, lastTouch: "8 months ago" },
  { name: "Marcus Reeve", detail: "COO · Lattice Freight", strength: "Dormant", score: 11, lastTouch: "11 months ago" },
] as const;

/** Home's relationship inbox lead: an edge the extractor found but couldn't
 *  link — an ambiguous name the user resolves before it joins the graph. */
export const MOCK_HOME_INBOX = {
  src: "Priya Nair",
  predicate: "worked with",
  object: "Mei",
  candidates: ["Mei Tanaka", "Mei Chen"],
} as const;

export const MOCK_HOME_PEOPLE = [
  { name: "Nisha Shah", detail: "Meridian Capital" },
  { name: "Rohan Mehta", detail: "Freight ops · Mumbai" },
  { name: "Kavya Singh", detail: "BD · Portside" },
] as const;

/** Daily-briefing status line — mirrors app/page.tsx `statusParts`. Counts
 *  derive from the tiles above so the line can never drift from what's shown.
 *  (The `number` param widens the const-tuple length so the plural check
 *  type-checks — a literal length would make `=== 1` a dead comparison.) */
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
export const MOCK_HOME_STATUS = [
  `${MOCK_HOME_TODAY.length} due`,
  plural(MOCK_HOME_FOLLOWUPS.length, "follow-up"),
  plural(MOCK_HOME_SIGNALS.length, "signal"),
  `${MOCK_HOME_QUIET.length} going quiet`,
].join(" · ");

export const MOCK_CAPTURE_ACTIONS = ["Voice", "Camera", "Upload", "Capture"] as const;
