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
    body: "Card, badge, QR, or a LinkedIn page. OCR runs on your phone — the contact is structured before the handshake ends.",
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
    body: "Sarah left Stripe this morning. Priya is back from Singapore. The moments outreach matters most, pushed to you.",
  },
  {
    id: "warmpath",
    kicker: "Warm paths",
    title: "Every intro is two threads away.",
    body: "Need a way into Aerolane? You know Priya. Priya knows Mei. The graph finds the path — and drafts the ask.",
  },
];
