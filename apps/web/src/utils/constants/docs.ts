// Docs are split into two tracks with separate sidebar contexts (Fumadocs
// "root" folders): the PRODUCT guide (`/docs/guide/**`) and the DEVELOPER
// docs (self-hosting, extending, API, development, contributing, product/BRD,
// roadmap). These constants drive both the in-memory page-tree transform
// (`src/lib/docs/tracks.ts`) and the bespoke `/docs` hub landing.

// Index page of the developer track — where the Developer tab/toggle lands.
export const PRODUCT_GUIDE_URL = "/docs/guide";
export const DEVELOPER_ENTRY_URL = "/docs/self-hosting";

// The `/docs` hub index page — kept at the top level (belongs to neither track).
export const DOCS_BASE_URL = "/docs";

// Metadata for the synthetic Developer root folder (Product's name/description
// come from `content/docs/guide/meta.json`).
export const DEVELOPER_TRACK_TITLE = "Developer";
export const DEVELOPER_TRACK_DESCRIPTION =
  "Self-host, extend, operate, and contribute to Dhaga.";

export interface DocsHubLink {
  title: string;
  href: string;
  description: string;
}

export interface DocsHubTrack {
  eyebrow: string;
  title: string;
  tagline: string;
  href: string;
  ctaLabel: string;
  links: readonly DocsHubLink[];
}

export const PRODUCT_HUB_TRACK: DocsHubTrack = {
  eyebrow: "For people using Dhaga",
  title: "Product guide",
  tagline:
    "A task-oriented tour of the app — capture people anywhere, turn notes into a private knowledge graph, and query it in plain language.",
  href: PRODUCT_GUIDE_URL,
  ctaLabel: "Open the product guide",
  links: [
    {
      title: "Capturing people",
      href: "/docs/guide/capturing-people",
      description: "Quick-add by paste, card scan, voice, camera, or file.",
    },
    {
      title: "Notes & facts",
      href: "/docs/guide/notes-and-facts",
      description: "Facts get extracted automatically, each with a receipt.",
    },
    {
      title: "Exploring the graph",
      href: "/docs/guide/exploring-the-graph",
      description: "Your whole network on one canvas — warm-path intros.",
    },
    {
      title: "Search & Ask Dhaga",
      href: "/docs/guide/search-and-ask",
      description: "Filter or ask a natural-language question with receipts.",
    },
  ],
};

export const DEVELOPER_HUB_TRACK: DocsHubTrack = {
  eyebrow: "For people running & extending Dhaga",
  title: "Developer & self-hosting",
  tagline:
    "Run the full AGPL core yourself, plug in your own providers, read the generated API reference, and follow the product thinking behind it.",
  href: DEVELOPER_ENTRY_URL,
  ctaLabel: "Start self-hosting",
  links: [
    {
      title: "Self-hosting",
      href: "/docs/self-hosting",
      description: "What you get, the hosted-mode switches, and env vars.",
    },
    {
      title: "Extending Dhaga",
      href: "/docs/extending",
      description: "Your own LLM, web search, embeddings, or vector store.",
    },
    {
      title: "API reference",
      href: "/docs/api",
      description: "The generated @dhaga/core surface — gateways and schemas.",
    },
    {
      title: "Product & roadmap",
      href: "/docs/product/brd",
      description: "The BRD, build status, and the raw idea backlog.",
    },
  ],
};

export const DOCS_HUB_TRACKS: readonly DocsHubTrack[] = [
  PRODUCT_HUB_TRACK,
  DEVELOPER_HUB_TRACK,
];
