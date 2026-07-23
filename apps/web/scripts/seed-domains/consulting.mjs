import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich consulting demo: a hero (David Nkosi) — a FORMER CLIENT now in a new
// buying role — fleshed out for the contact-profile money shot, plus breadth so
// the dashboard's "threads to pull today" + follow-ups tiles are full.
await seedDomainAccount({
  slug: "consulting",
  displayName: "Elena Rossi — Management Consultant (demo)",

  relationshipTypes: [
    { slug: "former_client", forward: "former client", inverse: "former consultant" },
  ],

  companies: [
    { name: "Rossi & Partners", sector: "Management Consulting" },
    { name: "Meridian Health Systems", sector: "Healthcare" },
    { name: "Vantage Retail Group", sector: "Retail" },
    { name: "Northwind Energy", sector: "Energy & Utilities" },
    { name: "Cascade Financial", sector: "Banking & Financial Services" },
    { name: "Aurora Manufacturing", sector: "Industrial Manufacturing" },
    { name: "Ironwood Mining", sector: "Mining & Materials" },
    { name: "Atlas Freight Group", sector: "Logistics & Supply Chain" },
    { name: "Solstice Telecom", sector: "Telecommunications" },
    { name: "Halcyon Insurance", sector: "Insurance" },
    { name: "Lumen Media Group", sector: "Media & Entertainment" },
    { name: "Brightline Pharmaceuticals", sector: "Pharmaceuticals" },
    { name: "Pinnacle Consumer Goods", sector: "Consumer Packaged Goods" },
    { name: "Cobalt Automotive", sector: "Automotive" },
    { name: "Silverpeak Capital", sector: "Private Equity" },
    { name: "Northgate Ventures", sector: "Venture Capital" },
  ],

  contacts: [
    // ---- HERO: former client, now COO at a new company with a fresh mandate ----
    {
      name: "David Nkosi",
      hero: true,
      title: "Chief Operating Officer",
      company: "Atlas Freight Group",
      location: "Cape Town, South Africa",
      tags: ["alumni-client", "warm", "buyer", "active"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 44,
      notes: [
        "Led the Ironwood Mining ops turnaround with David when he was VP Ops — cut unplanned downtime 18% and rebuilt the maintenance-planning function. He championed our team to the Ironwood board.",
        "David just moved to Atlas Freight Group as COO. Jonathan Pierce (Silverpeak) introduced him to the board during the buyout. Big step up — group-wide operations remit now.",
        "Coffee in Cape Town: David has a fresh mandate to overhaul Atlas's supply chain ahead of their Q4 planning. Wants a lean senior team, not a 60-slide deck. Warm to bringing us in.",
      ],
      facts: [
        { type: "intent", text: "Planning a supply-chain transformation at Atlas Freight Group — likely needs outside help in Q4." },
        { type: "role", text: "COO at Atlas Freight Group (was VP Ops at Ironwood Mining)." },
        { type: "personal", text: "We worked the Ironwood engagement together; he trusts our team." },
        { type: "preference", text: "Prefers a small senior team over a big deck." },
      ],
      followUps: [
        { action: "Send David the ops diagnostic one-pager", dueHint: "this week" },
        { action: "Reconnect before their Q4 planning cycle", dueHint: "before Q4" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    {
      name: "Emma Larsson",
      title: "Safety & Ops Lead",
      company: "Ironwood Mining",
      location: "Perth, Australia",
      tags: ["former-client", "sphere"],
      cadenceDays: 90,
      lastReachedOutDaysAgo: 120,
      note: "Ran the maintenance workstream alongside David and our team on the Ironwood turnaround. Good barometer for how that org remembers us.",
      facts: [{ type: "personal", text: "Worked the Ironwood engagement day-to-day with David; still close with him." }],
    },
    {
      name: "Jonathan Pierce",
      title: "Partner",
      company: "Silverpeak Capital",
      location: "New York, USA",
      tags: ["alumni", "referral", "warm"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 30,
      note: "Firm alumnus, now a Partner at Silverpeak. Introduced David to the Atlas board during the buyout. Sources operational due-diligence work on portfolio companies.",
      facts: [{ type: "role", text: "Partner at Silverpeak; introduced David into the Atlas COO role." }],
      followUps: [{ action: "Thank Jonathan for the Atlas intro and ask about portfolio ops-DD pipeline", dueHint: "this week" }],
    },
    {
      name: "Lena Fischer",
      title: "VP Supply Chain",
      company: "Atlas Freight Group",
      location: "Rotterdam, Netherlands",
      tags: ["prospect", "stakeholder"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 12,
      note: "David's key lieutenant at Atlas — owns the supply-chain P&L. She'll be our day-to-day if the transformation lands.",
    },
    { name: "Marco Bianchi", title: "Head of Logistics Ops", company: "Atlas Freight Group", location: "Milan, Italy", tags: ["prospect", "stakeholder"] },

    // ---- Meridian Health Systems (active client) ----
    {
      name: "Priya Nair",
      title: "COO (client sponsor)",
      company: "Meridian Health Systems",
      location: "Boston, USA",
      tags: ["client", "sponsor"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 41,
      note: "Strongest sponsor relationship in the book — expand from ops into digital next.",
      facts: [{ type: "intent", text: "Open to a digital-operations follow-on once the current ops phase closes." }],
    },
    {
      name: "Daniel Okafor",
      title: "Transformation Lead",
      company: "Meridian Health Systems",
      location: "Boston, USA",
      tags: ["client"],
      followUps: [{ action: "Share the revised staffing plan for the Meridian ops phase 2", dueHint: "today" }],
    },
    { name: "Sofia Mendes", title: "VP Operations", company: "Meridian Health Systems", location: "Chicago, USA", tags: ["client"], cadenceDays: 30, lastReachedOutDaysAgo: 38 },

    // ---- Vantage Retail Group (active client + alum buyer) ----
    {
      name: "Marcus Feldman",
      title: "CEO (client sponsor)",
      company: "Vantage Retail Group",
      location: "London, UK",
      tags: ["client", "sponsor"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 47,
      note: "Backed the merchandising redesign personally. Wants a quarterly exec readout — overdue for one.",
    },
    {
      name: "Aisha Rahman",
      title: "Head of Merchandising",
      company: "Vantage Retail Group",
      location: "London, UK",
      tags: ["client"],
      note: "Day-to-day client lead on the merchandising redesign — keep close.",
      followUps: [{ action: "Send Aisha the updated assortment-model results", dueHint: "this week" }],
    },
    {
      name: "Tom Becker",
      title: "VP Retail Operations",
      company: "Vantage Retail Group",
      location: "Manchester, UK",
      tags: ["alumni", "buyer", "warm"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 60,
      note: "Moved from the firm to client-side as VP — warm buyer for the next retail engagement.",
      facts: [{ type: "role", text: "Firm alumnus now VP Retail Ops at Vantage; a warm inside buyer." }],
    },
    { name: "Nina Volkova", title: "Store Ops Director", company: "Vantage Retail Group", location: "Berlin, Germany", tags: ["client"] },

    // ---- Northwind Energy (active client) ----
    {
      name: "Ingrid Solberg",
      title: "CFO (client sponsor)",
      company: "Northwind Energy",
      location: "Oslo, Norway",
      tags: ["client", "sponsor"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 39,
      note: "Referred Helen Zhang at Coastal to us. Loyal sponsor — keep the relationship warm between phases.",
    },
    { name: "Rajesh Kapoor", title: "Transformation Lead", company: "Northwind Energy", location: "Oslo, Norway", tags: ["client"] },
    { name: "Chen Wei", title: "Grid Modernization Director", company: "Northwind Energy", location: "Singapore", tags: ["client"] },

    // ---- Cascade Financial (former client + alum buyer) ----
    {
      name: "Olivia Grant",
      title: "COO (client sponsor)",
      company: "Cascade Financial",
      location: "Toronto, Canada",
      tags: ["former-client", "sponsor"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 70,
      note: "Engagement ended in March; reconnect before Q4 planning.",
      followUps: [{ action: "Set up a Q4-planning reconnect call with Olivia", dueHint: "this month" }],
    },
    { name: "Hassan Ali", title: "Head of Digital Banking", company: "Cascade Financial", location: "Toronto, Canada", tags: ["former-client"] },
    {
      name: "Jean-Pierre Dubois",
      title: "VP Risk & Operations",
      company: "Cascade Financial",
      location: "Montréal, Canada",
      tags: ["alumni", "buyer", "warm"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 58,
      note: "Ex-colleague, now VP at Cascade — could unlock a follow-on mandate.",
    },

    // ---- Aurora Manufacturing (active client) ----
    { name: "Klaus Bauer", title: "VP Operations (client sponsor)", company: "Aurora Manufacturing", location: "Munich, Germany", tags: ["client", "sponsor"], cadenceDays: 30, lastReachedOutDaysAgo: 44 },
    { name: "Yuki Tanaka", title: "Lean Program Lead", company: "Aurora Manufacturing", location: "Nagoya, Japan", tags: ["client"] },
    {
      name: "Fatima El-Sayed",
      title: "Supply Chain Director",
      company: "Aurora Manufacturing",
      location: "Cairo, Egypt",
      tags: ["client"],
      followUps: [{ action: "Circulate the supplier-risk heatmap to Fatima's team", dueHint: "this week" }],
    },

    // ---- Ironwood Mining (hero's old client org) ----
    {
      name: "Thabo Molefe",
      title: "CFO",
      company: "Ironwood Mining",
      location: "Johannesburg, South Africa",
      tags: ["former-client", "sphere"],
      cadenceDays: 60,
      lastReachedOutDaysAgo: 85,
      note: "Held the purse strings on the Ironwood turnaround. Still fond of the team; a natural reference for David's new mandate.",
    },

    // ---- Solstice Telecom (active client) ----
    { name: "Nadia Petrova", title: "CTO (client sponsor)", company: "Solstice Telecom", location: "Sofia, Bulgaria", tags: ["client", "sponsor"] },
    { name: "Liam Murphy", title: "Network Strategy Lead", company: "Solstice Telecom", location: "Dublin, Ireland", tags: ["client"] },
    { name: "Amara Diallo", title: "Digital Ops Lead", company: "Solstice Telecom", location: "Dakar, Senegal", tags: ["client"] },

    // ---- Halcyon Insurance (active client) ----
    { name: "Robert Ashford", title: "Chief Claims Officer (client sponsor)", company: "Halcyon Insurance", location: "Hartford, USA", tags: ["client", "sponsor"], cadenceDays: 30, lastReachedOutDaysAgo: 46 },
    { name: "Meera Iyer", title: "Claims Transformation Lead", company: "Halcyon Insurance", location: "Mumbai, India", tags: ["client"] },

    // ---- Lumen Media Group (active client + alum buyer) ----
    { name: "Julien Moreau", title: "CEO (client sponsor)", company: "Lumen Media Group", location: "Paris, France", tags: ["client", "sponsor"] },
    { name: "Sara Haddad", title: "Digital Transformation Lead", company: "Lumen Media Group", location: "Paris, France", tags: ["client"] },
    {
      name: "Anthony Russo",
      title: "VP Content Operations",
      company: "Lumen Media Group",
      location: "Milan, Italy",
      tags: ["alumni", "buyer", "warm"],
      note: "Former colleague, now VP at Lumen — natural sponsor if we pitch media ops.",
      followUps: [{ action: "Send Anthony the media-ops benchmarking teaser", dueHint: "this week" }],
    },

    // ---- Brightline Pharmaceuticals (active client) ----
    { name: "Naomi Feldstein", title: "VP R&D Ops (client sponsor)", company: "Brightline Pharmaceuticals", location: "Basel, Switzerland", tags: ["client", "sponsor"], cadenceDays: 30, lastReachedOutDaysAgo: 40 },
    { name: "Vikram Desai", title: "Commercial Transformation Lead", company: "Brightline Pharmaceuticals", location: "Hyderabad, India", tags: ["client"] },

    // ---- Pinnacle Consumer Goods (active client + alum buyer) ----
    { name: "Isabella Romano", title: "CFO (client sponsor)", company: "Pinnacle Consumer Goods", location: "New York, USA", tags: ["client", "sponsor"] },
    {
      name: "Lucia Fernández",
      title: "VP Route-to-Market",
      company: "Pinnacle Consumer Goods",
      location: "Barcelona, Spain",
      tags: ["alumni", "buyer", "warm"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 55,
      note: "Moved from the firm to a VP role — warm buyer for a commercial-ops engagement.",
    },
    { name: "Kwame Mensah", title: "Route-to-Market Lead", company: "Pinnacle Consumer Goods", location: "Accra, Ghana", tags: ["client"] },

    // ---- Cobalt Automotive (former client) ----
    {
      name: "Dieter Vogel",
      title: "VP Manufacturing (client sponsor)",
      company: "Cobalt Automotive",
      location: "Stuttgart, Germany",
      tags: ["former-client", "sponsor"],
      note: "Engagement wrapped last year; check in before their EV capex cycle.",
      followUps: [{ action: "Ping Dieter ahead of the EV capex planning window", dueHint: "next month" }],
    },
    { name: "Mei Lin", title: "EV Program Lead", company: "Cobalt Automotive", location: "Shanghai, China", tags: ["former-client"] },

    // ---- Firm alumni now on the buy/referral side (PE + VC) ----
    { name: "Rebecca Stein", title: "Operating Partner", company: "Silverpeak Capital", location: "New York, USA", tags: ["alumni", "referral"] },
    {
      name: "Michael Chen",
      title: "Partner",
      company: "Northgate Ventures",
      location: "San Francisco, USA",
      tags: ["alumni", "referral"],
      cadenceDays: 60,
      lastReachedOutDaysAgo: 78,
      note: "Alumnus at the VC — refers commercial due-diligence engagements.",
    },

    // ---- Referral / sphere ----
    {
      name: "Grace Whitmore",
      title: "Partner",
      company: "Rossi & Partners",
      location: "London, UK",
      tags: ["firm", "mentor"],
      note: "Firm partner who led the Ironwood engagement with me — knows David well and would gladly join a reconnect.",
    },
    {
      name: "Helen Zhang",
      title: "COO",
      company: "Coastal Airlines",
      location: "Hong Kong",
      tags: ["prospect", "sponsor"],
      note: "Prospect via referral from Ingrid Solberg — cautious, needs a reference call.",
    },
  ],

  events: [
    {
      name: "Global Operations Summit 2026",
      emoji: "🌍",
      tags: ["summit", "industry"],
      attendees: ["David Nkosi", "Priya Nair", "Marcus Feldman", "Ingrid Solberg", "Klaus Bauer", "Robert Ashford", "Helen Zhang", "Lena Fischer"],
    },
    {
      name: "Firm Alumni Reunion",
      emoji: "🥂",
      tags: ["alumni", "reunion"],
      attendees: ["David Nkosi", "Tom Becker", "Anthony Russo", "Jean-Pierre Dubois", "Jonathan Pierce", "Rebecca Stein", "Michael Chen", "Lucia Fernández", "Grace Whitmore"],
    },
    {
      name: "Atlas Freight Supply-Chain Workshop",
      emoji: "🚚",
      tags: ["workshop", "prospect"],
      attendees: ["David Nkosi", "Lena Fischer", "Marco Bianchi"],
    },
    {
      name: "Meridian Digital Transformation Workshop",
      emoji: "🏥",
      tags: ["workshop", "client"],
      attendees: ["Priya Nair", "Daniel Okafor", "Sofia Mendes"],
    },
    {
      name: "FinServ Leaders Roundtable",
      emoji: "💼",
      tags: ["roundtable", "industry"],
      attendees: ["Isabella Romano", "Ingrid Solberg", "Hassan Ali", "Marcus Feldman", "Olivia Grant"],
    },
  ],

  relationships: [
    { from: "David Nkosi", predicate: "worked_with", to: "Emma Larsson" },
    { from: "David Nkosi", predicate: "introduced_by", to: "Jonathan Pierce" },
    { from: "David Nkosi", predicate: "colleague_of", to: "Lena Fischer" },
    { from: "David Nkosi", predicate: "former_client", to: "Grace Whitmore" },
    { from: "Lena Fischer", predicate: "reports_to", to: "David Nkosi" },
    { from: "Klaus Bauer", predicate: "manages", to: "Yuki Tanaka" },
    { from: "Marcus Feldman", predicate: "mentor_of", to: "Tom Becker" },
    { from: "Ingrid Solberg", predicate: "friend_of", to: "Helen Zhang" },
  ],
});
