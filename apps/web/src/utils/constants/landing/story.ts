export type StoryVisual =
  | "scan"
  | "circles"
  | "voice"
  | "graph"
  | "search"
  | "draft"
  | "alerts"
  | "warmpath";

/** Which device the visual plays on inside the sticky device duo. */
export const PHONE_VISUALS: StoryVisual[] = ["scan", "voice", "alerts"];

export interface StoryStep {
  id: StoryVisual;
  kicker: string;
  title: string;
  body: string;
}

export const STORY_STEPS: StoryStep[] = [
  {
    id: "scan",
    kicker: "Capture",
    title: "Scan anything in five seconds.",
    body: "Card, badge, QR, or a LinkedIn page — one photo, read by AI in seconds. The contact is structured before the handshake ends.",
  },
  {
    id: "circles",
    kicker: "Auto-grouping",
    title: "Circles form themselves.",
    body: "Everyone you scan at the same event lands in one circle, automatically. Name it once — 'Web Summit 2026' — and it's an album of the day.",
  },
  {
    id: "voice",
    kicker: "Voice-first notes",
    title: "Talk. Don't type.",
    body: "A 30-second voice note becomes structured facts — role, intent, the sailing thing. Every fact keeps a receipt to the exact note it came from.",
  },
  {
    id: "graph",
    kicker: "The graph",
    title: "It all connects.",
    body: "People, companies, events, promises — one private graph that lives on your device. Drag the people. The threads follow.",
  },
  {
    id: "search",
    kicker: "Ask",
    title: "Search like you'd ask a friend.",
    body: "“Who do I know in logistics?” Structured filters plus semantic search over every note you've ever taken — answers cited to your own words.",
  },
  {
    id: "draft",
    kicker: "Follow-up",
    title: "Follow up the same evening.",
    body: "One tap: a draft that mentions what you actually talked about. Sent while they still remember you too.",
  },
  {
    id: "alerts",
    kicker: "Intelligence",
    title: "Know before your competitors do.",
    body: "Sarah announced she left Stripe — your watchlist caught it. Priya's back from Singapore — you noted it once; the graph remembered. The moments outreach matters, pushed to you.",
  },
  {
    id: "warmpath",
    kicker: "Warm paths",
    title: "Every intro is two threads away.",
    body: "Need a way into Aerolane? You've never met anyone there — but one note remembers Priya mentioning her old teammate Mei. The graph finds the path, and drafts the ask.",
  },
];
