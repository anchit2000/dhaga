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
    text: "You scanned 4 cards at Web Summit — grouped into one session",
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
