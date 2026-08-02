export type StoryVisual =
  | "scan"
  | "circles"
  | "voice"
  | "graph"
  | "search"
  | "draft"
  | "alerts"
  | "warmpath";

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
    title: "Scan a card. Review before it saves.",
    body: "Photograph the front and back or upload existing images. Dhaga extracts the details, then gives you a review step before Save person. A LinkedIn profile QR opens the same prefilled flow.",
  },
  {
    id: "circles",
    kicker: "Auto-grouping",
    title: "Group the people you met together.",
    body: "Attach a capture to an existing event or name a new one. The event becomes a reusable circle across Home, Events, and the graph.",
  },
  {
    id: "voice",
    kicker: "Voice-first notes",
    title: "Speak the note. Review the words.",
    body: "Dictate instead of typing, correct the transcript, then add the note. Structured facts are extracted after save and keep a receipt back to that note.",
  },
  {
    id: "graph",
    kicker: "The graph",
    title: "See the network you actually built.",
    body: "People, companies, events, entities, and tags share one private canvas. Search, isolate a circle, open a node, or use the layer controls—the same graph you use in the app.",
  },
  {
    id: "search",
    kicker: "Ask",
    title: "Ask your network. Check the receipts.",
    body: "Use Search for names, facts, and notes, or Ask Dhaga for a reasoned answer. Ask runs only when you submit and returns the source receipts separately.",
  },
  {
    id: "draft",
    kicker: "Follow-up",
    title: "Draft it. Copy it. Send it your way.",
    body: "Generate an editable follow-up from the contact's context, refine it, then copy it into the channel you choose. Dhaga never sends on your behalf.",
  },
  {
    id: "alerts",
    kicker: "Intelligence",
    title: "See the signals worth acting on.",
    body: "Job changes and watched news appear in Home beside due relationships and follow-ups. Add a useful signal as a note or dismiss it—nothing changes your graph silently.",
  },
  {
    id: "warmpath",
    kicker: "Warm paths",
    title: "Find the warm path already in your network.",
    body: "Choose a person or company and Dhaga searches the relationship paths you have recorded. When a path exists, inspect it and show it on the graph before asking for an introduction.",
  },
];
