import { CalendarDays, Inbox, MapPin, Waypoints } from "lucide-react";

import type { FeedItem, ProfileFact } from "@/types";

export const MOCK_PREVIEW_NAV = [
  { label: "Home", icon: null, active: true },
  { label: "Calendar", icon: CalendarDays, active: false },
  { label: "Confirmations", icon: Inbox, active: false },
  { label: "Graph", icon: Waypoints, active: false },
  { label: "Map", icon: MapPin, active: false },
] as const;

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
  { personId: "sarah", name: "Sarah Chen", bucket: "Due", reason: "Quarterly · due to reconnect" },
  { personId: "priya", name: "Priya Nair", bucket: "Check-in", reason: "Daily check-in" },
  { personId: "rohan", name: "Rohan Mehta", bucket: "Network", reason: "12 connections in your network" },
  { personId: "alice", name: "Alice Krejčová", bucket: "Due", reason: "Monthly · due to reconnect" },
  { personId: "kavya", name: "Kavya Singh", bucket: "Network", reason: "8 connections in your network" },
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
  { name: "Nisha Shah", detail: "Meridian Capital", reason: "recently added" },
  { name: "Rohan Mehta", detail: "Freight ops · Mumbai", reason: "recently interacted" },
  { name: "Kavya Singh", detail: "BD · Portside", reason: "recently added" },
] as const;

export const MOCK_HOME_CONFIRMATIONS = [
  { contact: "Sarah Chen", claim: "Exploring a new fintech venture", kind: "role" },
  { contact: "Priya Nair", claim: "Based in Singapore", kind: "location" },
] as const;

export const MOCK_HOME_EVENTS = [
  { name: "Founder dinner", date: "15 Jul 2026", people: 12 },
  { name: "Mumbai SaaS meetup", date: "2 Jul 2026", people: 28 },
] as const;

export const MOCK_HOME_STATS = [
  { label: "People", value: "248", activity: [30, 55, 42, 70, 82, 65, 92, 100] },
  { label: "Companies", value: "73", activity: [45, 38, 60, 52, 72, 68, 86, 78] },
  { label: "Notes", value: "416", activity: [28, 64, 48, 76, 52, 84, 70, 96] },
  { label: "Facts", value: "911", activity: [35, 42, 68, 60, 88, 72, 94, 82] },
  { label: "Relationships", value: "384", activity: [48, 58, 52, 74, 68, 82, 78, 98] },
  { label: "Events", value: "12", activity: [22, 44, 35, 62, 54, 76, 64, 86] },
  { label: "Open follow-ups", value: "7", activity: [66, 54, 72, 48, 62, 38, 52, 30] },
  { label: "Entities", value: "18", activity: [30, 40, 52, 48, 65, 72, 68, 84] },
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
