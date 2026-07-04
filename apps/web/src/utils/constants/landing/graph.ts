export interface GraphNode {
  id: string;
  x: number;
  y: number;
  initials: string;
  color: string;
  label?: string;
  big?: boolean;
  /** Only rendered during the capture scene. */
  isNew?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphScene {
  id: string;
  chip: string;
  caption: string;
  litNodes: string[];
  litEdges: string[];
  dimOthers: boolean;
  cluster?: boolean;
  showNew?: boolean;
  factsOn?: string;
  draftOn?: string;
  badgeOn?: string;
  query?: string;
  warmLabel?: boolean;
}

/** Coordinates are percentages of the stage (100 × 60 viewBox). */
export const GRAPH_NODES: GraphNode[] = [
  { id: "you", x: 50, y: 46, initials: "You", color: "#e2a44c", big: true },
  { id: "priya", x: 33, y: 28, initials: "PN", color: "#7fb98a", label: "Priya Nair" },
  { id: "mei", x: 20, y: 12, initials: "MT", color: "#8aa8d8", label: "Mei Tanaka · Aerolane" },
  { id: "sarah", x: 66, y: 24, initials: "SC", color: "#c98a9e", label: "Sarah Chen" },
  { id: "rohan", x: 22, y: 46, initials: "RM", color: "#8aa8d8", label: "Rohan Mehta" },
  { id: "alice", x: 76, y: 46, initials: "AK", color: "#a49a8a", label: "Alice Krejčová" },
  { id: "dan", x: 80, y: 10, initials: "DA", color: "#a49a8a" },
  { id: "kavya", x: 90, y: 28, initials: "KS", color: "#7fb98a" },
  { id: "nisha", x: 42, y: 10, initials: "NS", color: "#e2a44c", label: "Nisha Shah — just scanned", isNew: true },
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: "you", to: "priya" },
  { from: "priya", to: "mei" },
  { from: "you", to: "sarah" },
  { from: "you", to: "rohan" },
  { from: "you", to: "alice" },
  { from: "sarah", to: "dan" },
  { from: "sarah", to: "kavya" },
  { from: "alice", to: "kavya" },
  { from: "you", to: "nisha" },
];

export const GRAPH_FACTS = [
  "Evaluating route-optimisation AI next quarter",
  "Intro'd you to their CTO",
] as const;

export const GRAPH_SCENES: GraphScene[] = [
  {
    id: "capture",
    chip: "Scan anything",
    caption: "Card, badge, QR, or a LinkedIn page — a contact in five seconds, OCR on-device.",
    litNodes: ["you", "nisha"],
    litEdges: ["you-nisha"],
    dimOthers: true,
    showNew: true,
  },
  {
    id: "circles",
    chip: "Circles form themselves",
    caption: "Scanned at the same event? Grouped into one circle, automatically.",
    litNodes: ["sarah", "dan", "kavya"],
    litEdges: ["sarah-dan", "sarah-kavya"],
    dimOthers: true,
    cluster: true,
  },
  {
    id: "voice",
    chip: "Talk, don't type",
    caption: "Voice notes become structured facts — each one keeps a receipt to the original note.",
    litNodes: ["rohan"],
    litEdges: ["you-rohan"],
    dimOthers: true,
    factsOn: "rohan",
  },
  {
    id: "graph",
    chip: "A living graph",
    caption: "People, companies, events, promises — one private graph, on your device.",
    litNodes: ["you", "priya", "mei", "sarah", "rohan", "alice", "dan", "kavya"],
    litEdges: ["you-priya", "priya-mei", "you-sarah", "you-rohan", "you-alice", "sarah-dan", "sarah-kavya", "alice-kavya"],
    dimOthers: false,
  },
  {
    id: "search",
    chip: "Ask in plain language",
    caption: "Structured filters + semantic search over everything you've ever noted.",
    litNodes: ["priya", "kavya"],
    litEdges: [],
    dimOthers: true,
    query: "ask> who do I know in logistics?",
  },
  {
    id: "draft",
    chip: "Same-evening follow-ups",
    caption: "One tap: a draft that mentions what you actually talked about.",
    litNodes: ["alice"],
    litEdges: ["you-alice"],
    dimOthers: true,
    draftOn: "alice",
  },
  {
    id: "alerts",
    chip: "Job-change alerts",
    caption: "Sarah announced she left Stripe. Your watchlist caught it — you knew before your competitors did.",
    litNodes: ["sarah"],
    litEdges: ["you-sarah"],
    dimOthers: true,
    badgeOn: "sarah",
  },
  {
    id: "warmpath",
    chip: "Warm paths",
    caption: "Need Aerolane? A note remembers Priya's old teammate Mei is there. Intro found.",
    litNodes: ["you", "priya", "mei"],
    litEdges: ["you-priya", "priya-mei"],
    dimOthers: true,
    warmLabel: true,
  },
];
