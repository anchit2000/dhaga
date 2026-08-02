export const USE_CASES = [
  {
    slug: "sales",
    label: "Sales",
    short: "Keep the relationship memory that company CRMs were never built to be.",
    headline: "Your company CRM tracks the pipeline. Dhaga helps you remember the people.",
    intro:
      "Roles change and company systems reset. Dhaga gives sales professionals a private place for the personal relationship context they are entitled to keep—without copying confidential employer records.",
    problems: [
      "Company CRMs optimize reporting, not personal recall.",
      "A job change can erase years of legitimate relationship context.",
      "Follow-ups disappear when they are not tied to an active opportunity.",
    ],
    outcomes: [
      "Remember why you know someone and what matters to them.",
      "Carry your personal network between roles and industries.",
      "Reconnect with useful context instead of a generic check-in.",
    ],
  },
  {
    slug: "founders",
    label: "Founders",
    short: "Keep investors, candidates, customers, and advisors in one memory.",
    headline: "A founder’s network is the company’s hidden operating system.",
    intro:
      "Dhaga keeps the context behind every investor conversation, customer promise, candidate introduction, and advisor follow-up searchable and ready when you need it.",
    problems: [
      "Critical context is scattered across messages, notes, and memory.",
      "Warm introductions go cold because the next step was never captured.",
      "Fundraising, hiring, and selling each create another disconnected list.",
    ],
    outcomes: [
      "Ask who can introduce you to a buyer, investor, or candidate.",
      "See every promise and follow-up before it becomes awkward.",
      "Build institutional relationship memory from day one.",
    ],
  },
  {
    slug: "investors",
    label: "Investors",
    short: "Recall every founder, thesis signal, introduction, and next step.",
    headline: "Deal flow is a relationship graph, not an inbox folder.",
    intro:
      "Dhaga connects founder notes, sector interests, warm paths, and follow-ups so investors can recall the signal behind a meeting months later.",
    problems: [
      "Founder context gets buried after the meeting ends.",
      "Warm paths are difficult to reconstruct across a large network.",
      "Useful thesis signals live in unsearchable notes.",
    ],
    outcomes: [
      "Search people, companies, markets, and introductions together.",
      "Keep sourced notes instead of relying on memory alone.",
      "Re-engage founders when timing or thesis fit changes.",
    ],
  },
  {
    slug: "recruiters",
    label: "Recruiters",
    short: "Remember the person behind the profile and when to reconnect.",
    headline: "Candidates are relationships long before they are applications.",
    intro:
      "Dhaga helps recruiters retain permissioned context about motivations, timing, introductions, and past conversations—not just another static profile.",
    problems: [
      "A good candidate may not be ready when the role opens.",
      "Conversation context disappears across tools and hiring cycles.",
      "Generic outreach wastes the trust built in earlier conversations.",
    ],
    outcomes: [
      "Recall motivations, constraints, and the last meaningful discussion.",
      "Find candidates through skills, companies, and warm connections.",
      "Reconnect when the opportunity and timing finally align.",
    ],
  },
  {
    slug: "community-builders",
    label: "Community",
    short: "Turn events and introductions into a community that remembers.",
    headline: "A community grows when every introduction has a next chapter.",
    intro:
      "Dhaga helps operators, ecosystem leaders, and community builders remember members across events, conversations, interests, and introductions.",
    problems: [
      "Event lists say who attended, not why people should meet.",
      "Member context lives in the heads of a few organizers.",
      "High-value introductions are rarely followed through.",
    ],
    outcomes: [
      "Group people by event, interest, location, or relationship.",
      "Find the right warm introduction across the community.",
      "Follow up after the event while the context is still fresh.",
    ],
  },
] as const;

export type UseCaseSlug = (typeof USE_CASES)[number]["slug"];

/** Fixed utility strings keep role colour intentional and statically visible to Tailwind. */
export const USE_CASE_ACCENTS: Record<UseCaseSlug, string> = {
  sales: "border-t-trust text-trust",
  founders: "border-t-calm text-calm",
  investors: "border-t-magic text-magic",
  recruiters: "border-t-human text-human",
  "community-builders": "border-t-amber text-ember dark:text-amber",
};

export const USE_CASE_PAGE_ACCENTS: Record<UseCaseSlug, { text: string; soft: string }> = {
  sales: { text: "text-trust", soft: "border-trust/30 bg-trust/10 text-trust" },
  founders: { text: "text-calm", soft: "border-calm/30 bg-calm/10 text-calm" },
  investors: { text: "text-magic", soft: "border-magic/30 bg-magic/10 text-magic" },
  recruiters: { text: "text-human", soft: "border-human/30 bg-human/10 text-human" },
  "community-builders": {
    text: "text-ember dark:text-amber",
    soft: "border-amber/30 bg-amber/10 text-ember dark:text-amber",
  },
};

export const USE_CASE_ARTICLES = {
  sales: {
    href: "/blog/solutions/b2b-sales",
    title: "B2B sales & account executives",
    description:
      "See how Dhaga keeps stakeholders, warm paths, and relationships alive alongside the CRM your team uses to run the deal.",
  },
  founders: {
    href: "/blog/solutions/founders",
    title: "Founders & startup CEOs",
    description:
      "A practical guide to keeping investors, advisors, early hires, customers, and press from becoming five disconnected lists.",
  },
  investors: {
    href: "/blog/solutions/venture-capital",
    title: "Venture capital & angel investors",
    description:
      "See how a private relationship graph turns founder meetings, co-investors, operators, LPs, and warm paths into queryable deal-flow memory.",
  },
  recruiters: {
    href: "/blog/solutions/recruiting",
    title: "Recruiting & executive search",
    description:
      "Learn how to keep candidate and hiring-manager relationships useful across roles, searches, and years without replacing your ATS.",
  },
  "community-builders": {
    href: "/blog/solutions/community-builders",
    title: "Community builders & super-connectors",
    description:
      "See how Dhaga becomes the memory behind thoughtful introductions across members, events, interests, and conversations.",
  },
} as const satisfies Record<
  UseCaseSlug,
  { href: string; title: string; description: string }
>;
