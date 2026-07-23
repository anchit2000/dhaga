import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich B2B-sales demo: Dhaga as the AE's PERSONAL relationship layer that
// complements the team CRM. A hero champion (Marcus Feld) is fleshed out for
// the contact-profile money shot — discovery notes + facts w/ receipts,
// follow-ups, an org relationship map — plus breadth so the dashboard's
// "threads to pull today" (cadence overdue) and follow-ups tiles are full.
await seedDomainAccount({
  slug: "b2b-sales",
  displayName: "Priya Nair — Account Executive (demo)",

  relationshipTypes: [
    { slug: "champion_of", forward: "champions us at", inverse: "championed by" },
    { slug: "sponsored_by", forward: "sponsored by", inverse: "sponsors" },
  ],

  companies: [
    // Prospect / customer accounts across industries
    { name: "Cargoline Freight", sector: "Logistics" },
    { name: "Northwind Logistics", sector: "Logistics" },
    { name: "HelvetSecure", sector: "Cybersecurity" },
    { name: "Brightwell Health", sector: "Healthcare" },
    { name: "Meridian Retail Group", sector: "Retail" },
    { name: "Aldergrove Bank", sector: "Financial Services" },
    { name: "Solvent Manufacturing", sector: "Manufacturing" },
    { name: "Kestrel Aerospace", sector: "Aerospace" },
    { name: "Verdant Foods", sector: "Food & Beverage" },
    { name: "Pinecrest Insurance", sector: "Insurance" },
    { name: "Lumen Media", sector: "Media" },
    { name: "Tessellate Analytics", sector: "SaaS" },
    { name: "Ironbridge Utilities", sector: "Energy" },
    { name: "Harbor & Vale Legal", sector: "Legal" },
    // Partner vendors
    { name: "Coriander Systems Integrators", sector: "Consulting (Partner)" },
    { name: "Ridgeway Cloud Partners", sector: "Cloud Reseller (Partner)" },
  ],

  contacts: [
    // ---- HERO: champion at the key account (Cargoline Freight) ----
    {
      name: "Marcus Feld",
      hero: true,
      title: "VP Engineering",
      company: "Cargoline Freight",
      location: "Chicago, IL",
      tags: ["champion", "active", "platform-team", "warm-reintro"],
      cadenceDays: 7,
      lastReachedOutDaysAgo: 13,
      notes: [
        "Discovery call. Cargoline's platform team is drowning in manual onboarding for new freight partners — Marcus wants that automated. He's the technical decision-maker and clearly wants us to win; asked sharp questions and volunteered internal context. Classic champion.",
        "Follow-up call on his concerns: he needs SOC 2 Type II before security will sign off, and wants a hard number on onboarding time-to-first-value. Nervous that a long ramp will make the platform team resist the change. Asked what a realistic POC looks like.",
        "Small world — Marcus just moved to Cargoline from Northwind Logistics, where he championed us last year before the budget froze. This is a warm re-intro, not a cold account. He already knows the product; we're picking up where Northwind left off.",
      ],
      facts: [
        { type: "intent", text: "Evaluating us for the platform team; cares most about onboarding time and SOC 2." },
        { type: "role", text: "VP Engineering at Cargoline Freight." },
        { type: "personal", text: "Came from Northwind Logistics where he was also a champion." },
        { type: "preference", text: "Wants a hands-on POC, not a demo." },
      ],
      followUps: [
        { action: "Send Marcus the SOC 2 report + onboarding benchmarks", dueHint: "this week" },
        { action: "Get the CFO (economic buyer) into next week's call", dueHint: "next week" },
      ],
    },

    // ---- hero's circle at Cargoline (drives the profile relationship map) ----
    {
      name: "Sofia Reyes",
      title: "CFO",
      company: "Cargoline Freight",
      location: "Chicago, IL",
      tags: ["economic-buyer", "active"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 18,
      note: "Economic buyer — holds the budget. Marcus can champion internally but Sofia signs. Wants the ROI framed as reduced ops headcount, not features.",
      facts: [{ type: "intent", text: "Will fund the deal if onboarding savings clear the ROI bar; wants a business case, not a demo." }],
    },
    {
      name: "Aisha Bello",
      title: "Solutions Architect",
      company: "Cargoline Freight",
      location: "Remote",
      tags: ["evaluator", "technical"],
      cadenceDays: 14,
      lastReachedOutDaysAgo: 9,
      note: "Technical evaluator on Marcus's team — will run the POC hands-on. Kingmaker for the technical win; keep her unblocked.",
    },
    {
      name: "Grace Okonkwo",
      title: "Head of Ops",
      company: "Cargoline Freight",
      location: "Detroit, MI",
      tags: ["evaluator", "advocate"],
      cadenceDays: 14,
      lastReachedOutDaysAgo: 20,
      note: "Owns the onboarding pain day-to-day; strong internal advocate alongside Marcus. Wants to see the POC run against real partner data.",
      followUps: [{ action: "Schedule POC scoping call with Grace + Aisha", dueHint: "this week" }],
    },
    {
      name: "Roland Pike",
      title: "IT Procurement Lead",
      company: "Cargoline Freight",
      location: "Chicago, IL",
      tags: ["blocker", "security"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 22,
      note: "Blocker — controls the security review and vendor paperwork. Pushing hard on SOC 2 timelines; neutralize by getting the report to him early.",
    },

    // ---- Northwind Logistics (Marcus's former account; the re-intro mutual) ----
    {
      name: "Rebecca Lin",
      title: "Director of Engineering",
      company: "Northwind Logistics",
      location: "Minneapolis, MN",
      tags: ["advocate", "connector"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 24,
      note: "Worked with Marcus at Northwind and made the warm re-intro into Cargoline. Still an internal advocate at Northwind — keep her close for when that budget reopens.",
    },
    {
      name: "Tomas Novak",
      title: "VP Operations",
      company: "Northwind Logistics",
      location: "Minneapolis, MN",
      tags: ["economic-buyer", "nurture"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 41,
      note: "EB at Northwind — budget freed up next fiscal year; keep warm until Q3. Worked alongside Marcus before Marcus left.",
    },
    {
      name: "Owen Pratt",
      title: "Procurement Lead",
      company: "Northwind Logistics",
      location: "Chicago, IL",
      tags: ["blocker"],
      note: "Prefers the incumbent vendor; needs a compelling switching-cost story.",
    },

    // ---- HelvetSecure (security-first prospect, partner-sourced) ----
    {
      name: "Karim Haddad",
      title: "Head of Platform",
      company: "HelvetSecure",
      location: "Zurich, CH",
      tags: ["champion", "active"],
      cadenceDays: 14,
      lastReachedOutDaysAgo: 16,
      note: "Champion — built the internal business case and sponsors the pilot. Sourced via Sophie at Ridgeway. Wants data-residency answers he can take to Lena.",
      facts: [{ type: "intent", text: "Championing us for a platform pilot; blocked on data-residency guarantees for EU." }],
    },
    {
      name: "Lena Fischer",
      title: "CISO",
      company: "HelvetSecure",
      location: "Zurich, CH",
      tags: ["economic-buyer", "security"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 27,
      note: "EB and security gatekeeper — won't sign without EU data-residency guarantees. Karim is prepping her; get ahead of it.",
      followUps: [{ action: "Send Lena the EU data-residency + subprocessor pack", dueHint: "this week" }],
    },
    {
      name: "Nadia Petrov",
      title: "Security Engineer",
      company: "HelvetSecure",
      location: "Berlin, DE",
      tags: ["evaluator"],
    },

    // ---- Meridian Retail Group (multi-threaded prospect) ----
    {
      name: "Yuki Tanaka",
      title: "VP Digital",
      company: "Meridian Retail Group",
      location: "Seattle, WA",
      tags: ["champion", "active"],
      cadenceDays: 10,
      lastReachedOutDaysAgo: 15,
      note: "Champion — wants a fast rollout before holiday peak season. The clock is the deal driver; sequence everything around the freeze date.",
      followUps: [{ action: "Send Yuki the holiday-peak rollout timeline", dueHint: "today" }],
    },
    {
      name: "Fernando Cruz",
      title: "CFO",
      company: "Meridian Retail Group",
      location: "Seattle, WA",
      tags: ["economic-buyer"],
      note: "EB — approves once Yuki's rollout plan has a number attached.",
    },
    {
      name: "Ravi Deshpande",
      title: "Procurement Lead",
      company: "Meridian Retail Group",
      location: "Seattle, WA",
      tags: ["blocker"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 29,
      note: "Wants a 3-vendor bake-off; slowing momentum against Yuki's timeline.",
    },

    // ---- Aldergrove Bank (long cycle, board sign-off) ----
    {
      name: "Isaac Mbeki",
      title: "VP Engineering",
      company: "Aldergrove Bank",
      location: "Toronto, ON",
      tags: ["champion"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 19,
      note: "Champion — sourced through Elena at Coriander. Building the case for Eleanor.",
    },
    {
      name: "Eleanor Voss",
      title: "Head of Technology",
      company: "Aldergrove Bank",
      location: "Toronto, ON",
      tags: ["economic-buyer"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 26,
      note: "EB — approval requires board sign-off; long cycle. Don't push the paper, feed the champion.",
    },
    {
      name: "Clara Jensen",
      title: "Risk & Compliance Lead",
      company: "Aldergrove Bank",
      location: "Montreal, QC",
      tags: ["blocker", "security"],
    },

    // ---- Brightwell Health (closed-lost; re-engage path) ----
    {
      name: "Priscilla Adeyemi",
      title: "Head of Ops",
      company: "Brightwell Health",
      location: "Boston, MA",
      tags: ["champion", "closed-lost"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 52,
      note: "Was our champion; frustrated we lost to the incumbent EHR add-on. Still willing to intro us elsewhere — she moves companies often.",
      followUps: [{ action: "Ask Priscilla for a warm intro at her next company", dueHint: "this month" }],
    },
    {
      name: "Dr. Alan Whitmore",
      title: "Chief Medical Information Officer",
      company: "Brightwell Health",
      location: "Boston, MA",
      tags: ["economic-buyer", "closed-lost"],
      note: "Lost — chose incumbent EHR add-on; revisit after their 2-yr contract lapses.",
    },

    // ---- Solvent Manufacturing ----
    {
      name: "Henrik Sørensen",
      title: "Plant Systems Manager",
      company: "Solvent Manufacturing",
      location: "Turin, IT",
      tags: ["champion", "active"],
      cadenceDays: 14,
      lastReachedOutDaysAgo: 21,
      note: "Champion — sees ROI in reduced downtime; needs a floor-level demo his ops team can touch.",
    },
    {
      name: "Bianca Ferraro",
      title: "COO",
      company: "Solvent Manufacturing",
      location: "Milan, IT",
      tags: ["economic-buyer"],
    },

    // ---- Kestrel Aerospace (compliance-gated) ----
    {
      name: "Colonel Rita Banks",
      title: "Director of Programs",
      company: "Kestrel Aerospace",
      location: "Denver, CO",
      tags: ["economic-buyer"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 37,
      note: "EB — procurement gated by government compliance; ITAR questions still open.",
    },
    {
      name: "Diane Kowalski",
      title: "Head of Ops",
      company: "Kestrel Aerospace",
      location: "Wichita, KS",
      tags: ["champion"],
    },

    // ---- Verdant Foods (champion changed jobs from Meridian) ----
    {
      name: "Olivia Santos",
      title: "VP Supply Chain",
      company: "Verdant Foods",
      location: "Austin, TX",
      tags: ["champion", "changed-jobs"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 17,
      note: "Champion — moved from Meridian Retail, brings prior product familiarity. Warm path into a brand-new logo.",
      facts: [{ type: "personal", text: "Previously at Meridian Retail Group; already knows the product from that eval." }],
    },
    {
      name: "Thabo Nkosi",
      title: "CFO",
      company: "Verdant Foods",
      location: "Austin, TX",
      tags: ["economic-buyer"],
    },

    // ---- Pinecrest Insurance ----
    {
      name: "Anjali Rao",
      title: "Head of Claims Tech",
      company: "Pinecrest Insurance",
      location: "Hartford, CT",
      tags: ["champion", "active"],
      cadenceDays: 14,
      lastReachedOutDaysAgo: 12,
      note: "Champion — pushing hard internally; wants case studies from insurance peers to close her CDO.",
      followUps: [{ action: "Send Anjali the insurance-peer case studies", dueHint: "this week" }],
    },
    {
      name: "Gerald Webb",
      title: "Chief Digital Officer",
      company: "Pinecrest Insurance",
      location: "Hartford, CT",
      tags: ["economic-buyer"],
      note: "EB — Anjali's boss; approves once she brings peer proof.",
    },

    // ---- Lumen Media ----
    {
      name: "Camille Dubois",
      title: "VP Product",
      company: "Lumen Media",
      location: "Los Angeles, CA",
      tags: ["champion"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 28,
      note: "Champion — cost-sensitive account; wants usage-based pricing modeled before she goes to her CFO.",
    },
    {
      name: "Jerome Baptiste",
      title: "CFO",
      company: "Lumen Media",
      location: "Los Angeles, CA",
      tags: ["economic-buyer"],
      note: "EB — wants usage-based pricing modeled out end to end.",
    },

    // ---- Tessellate Analytics (closed-won reference customer) ----
    {
      name: "Nathan Cole",
      title: "CTO",
      company: "Tessellate Analytics",
      location: "San Francisco, CA",
      tags: ["champion", "closed-won", "reference"],
      cadenceDays: 45,
      lastReachedOutDaysAgo: 30,
      note: "Fast technical win; now our strongest reference customer. Happy to take peer calls — use him for Anjali and Karim.",
    },
    {
      name: "Priyanka Sharma",
      title: "VP Finance",
      company: "Tessellate Analytics",
      location: "San Francisco, CA",
      tags: ["economic-buyer", "closed-won"],
    },

    // ---- Ironbridge Utilities ----
    {
      name: "Amara Diallo",
      title: "Head of Ops",
      company: "Ironbridge Utilities",
      location: "Manchester, UK",
      tags: ["champion"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 33,
      note: "Champion — regulatory reporting is her pain; annual budget cycle starts in autumn. Sourced via Elena at Coriander.",
    },

    // ---- Harbor & Vale Legal (champion changed jobs from Pinecrest) ----
    {
      name: "Julian Foster",
      title: "Director of Legal Ops",
      company: "Harbor & Vale Legal",
      location: "New York, NY",
      tags: ["champion", "changed-jobs"],
      cadenceDays: 21,
      lastReachedOutDaysAgo: 14,
      note: "Champion — wants to cut document turnaround. Changed jobs from Pinecrest, where he saw the product; warm intro carried over.",
    },

    // ---- Partner vendor contacts (co-sell sources) ----
    {
      name: "Elena Popescu",
      title: "Partner Alliance Manager",
      company: "Coriander Systems Integrators",
      location: "Bucharest, RO",
      tags: ["partner", "co-sell"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 25,
      note: "Co-sell partner — sources us into Aldergrove and Ironbridge. Nurture the relationship, it pays in pipeline.",
    },
    {
      name: "Sophie Laurent",
      title: "Channel Director",
      company: "Ridgeway Cloud Partners",
      location: "Paris, FR",
      tags: ["partner", "co-sell"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 23,
      note: "Reseller — sources cloud-migration deals; introduced HelvetSecure via Karim.",
      followUps: [{ action: "Send Sophie the updated partner deal-reg form", dueHint: "this week" }],
    },
  ],

  events: [
    {
      name: "Dhaga Connect 2026 — User Conference",
      emoji: "🎤",
      tags: ["conference", "flagship"],
      attendees: [
        "Marcus Feld",
        "Sofia Reyes",
        "Karim Haddad",
        "Yuki Tanaka",
        "Nathan Cole",
        "Anjali Rao",
        "Olivia Santos",
        "Elena Popescu",
        "Sophie Laurent",
        "Julian Foster",
      ],
    },
    {
      name: "Cargoline Freight — Quarterly Business Review",
      emoji: "📊",
      tags: ["qbr", "key-account"],
      attendees: ["Marcus Feld", "Sofia Reyes", "Grace Okonkwo", "Aisha Bello", "Roland Pike"],
    },
    {
      name: "Webinar — Data Residency for Regulated Industries",
      emoji: "🖥️",
      tags: ["webinar", "security"],
      attendees: ["Lena Fischer", "Karim Haddad", "Nadia Petrov", "Clara Jensen", "Colonel Rita Banks"],
    },
    {
      name: "Meridian Retail — Pre-Holiday Rollout Workshop",
      emoji: "🛍️",
      tags: ["workshop", "prospect"],
      attendees: ["Yuki Tanaka", "Fernando Cruz", "Ravi Deshpande", "Olivia Santos"],
    },
    {
      name: "Partner Co-Sell Dinner",
      emoji: "🍽️",
      tags: ["partner", "co-sell", "dinner"],
      attendees: ["Elena Popescu", "Sophie Laurent", "Isaac Mbeki", "Amara Diallo", "Karim Haddad"],
    },
  ],

  relationships: [
    // Hero's org map at Cargoline + the warm re-intro path from Northwind
    { from: "Marcus Feld", predicate: "introduced_by", to: "Rebecca Lin" },
    { from: "Marcus Feld", predicate: "manages", to: "Aisha Bello" },
    { from: "Grace Okonkwo", predicate: "reports_to", to: "Marcus Feld" },
    { from: "Marcus Feld", predicate: "colleague_of", to: "Sofia Reyes" },
    { from: "Marcus Feld", predicate: "worked_with", to: "Tomas Novak" },
    { from: "Sofia Reyes", predicate: "colleague_of", to: "Roland Pike" },
    // Partner-sourced champions
    { from: "Karim Haddad", predicate: "introduced_by", to: "Sophie Laurent" },
    { from: "Isaac Mbeki", predicate: "introduced_by", to: "Elena Popescu" },
    // The changed-jobs warm path
    { from: "Olivia Santos", predicate: "worked_with", to: "Yuki Tanaka" },
  ],
});
