import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich seed-fund demo: a hero founder (Amara Diallo) — one we PASSED on at
// pre-seed who is now raising a hot, oversubscribed climate Series A — fleshed
// out for the contact-profile money shot, plus breadth so the dashboard's
// "threads to pull today" (cadence overdue) + follow-ups tiles are full.
await seedDomainAccount({
  slug: "venture-capital",
  displayName: "Ayesha Rahman — Partner, Seed Fund (demo)",

  relationshipTypes: [
    { slug: "co_invested_with", forward: "co-invested with", inverse: "co-invested with" },
    { slug: "backed_by", forward: "backed by", inverse: "backer of" },
  ],

  companies: [
    // --- portfolio startups ---
    { name: "Nimbus Ledger", sector: "Fintech" },
    { name: "Verdant Grid", sector: "Climate" },
    { name: "Pulse Health", sector: "Healthtech" },
    { name: "Forge AI", sector: "AI / DevTools" },
    { name: "Lumen Commerce", sector: "Consumer" },
    { name: "Cobalt Security", sector: "Security" },
    // --- prospect / tracking startups ---
    { name: "Helios Solar", sector: "Climate" },
    { name: "Kairos Payments", sector: "Fintech" },
    { name: "Meridian Robotics", sector: "Robotics" },
    { name: "Aster Learning", sector: "EdTech" },
    { name: "Quill Docs", sector: "SaaS" },
    { name: "Tidepool Logistics", sector: "Logistics" },
    // --- co-investor funds ---
    { name: "Northwind Capital", sector: "Venture Capital" },
    { name: "Harbor Line Ventures", sector: "Venture Capital" },
    { name: "Belmont Partners", sector: "Venture Capital" },
    // --- accelerator ---
    { name: "Ignite Labs", sector: "Accelerator" },
  ],

  contacts: [
    // ---- HERO: the founder we passed on, now raising a hot round ----
    {
      name: "Amara Diallo",
      hero: true,
      title: "Founder & CEO",
      company: "Helios Solar",
      location: "Nairobi",
      tags: ["founder", "tracking", "raising", "climate"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 47,
      notes: [
        "First met at Ignite Labs pre-seed, early 2024. Distributed solar-financing play for off-grid households — loved her but the unit economics weren't proven and the market felt too early, so we passed. Kept her on the tracking list.",
        "Traction update over coffee: 40k households live across Kenya and Rwanda, default rates under 3%, and a signed distribution deal with a regional telco. This is a completely different company than the one we passed on — I was wrong to sit it out.",
        "Word from Aria at Harbor Line: her Series A is heavily oversubscribed and closing fast. Aria is leading and there may be a sliver of allocation left for a fund that can help on enterprise distribution. Need to move THIS week.",
      ],
      facts: [
        { type: "intent", text: "Raising a Series A in climate — oversubscribed; need to move fast to get allocation." },
        { type: "role", text: "Founder & CEO of Helios Solar." },
        { type: "personal", text: "Ex-Siemens Energy eng lead; second-time founder." },
        { type: "preference", text: "Wants investors who can open enterprise doors." },
      ],
      followUps: [
        { action: "Re-engage — ask for allocation in the Series A", dueHint: "this week" },
        { action: "Intro her to a climate operator for diligence", dueHint: "this week" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    { name: "Bram de Vries", title: "Co-founder / CTO", company: "Helios Solar", location: "Nairobi", tags: ["founder", "tracking", "climate"], note: "Amara's co-founder. Owns the underwriting model and the field-agent app — the technical spine of the default-rate story." },
    { name: "Wesley Adekunle", title: "Climate Operator / Angel", company: null, location: "Lagos", tags: ["angel", "operator", "climate"], cadenceDays: 60, lastReachedOutDaysAgo: 72, note: "First introduced me to Amara back in 2024. Ran distribution at a pan-African solar company — exactly the operator to loop into Helios diligence.", facts: [{ type: "role", text: "Ex-Head of Distribution at a pan-African solar company; now angel investing." }], followUps: [{ action: "Ask Wesley to reference-check Helios's telco distribution deal", dueHint: "this week" }] },

    // ---- portfolio founders ----
    { name: "Ayaan Qureshi", title: "Founder & CEO", company: "Nimbus Ledger", location: "London", tags: ["founder", "portfolio"], cadenceDays: 45, lastReachedOutDaysAgo: 52, note: "Led our seed check. Sharp on unit economics; wants a strong fintech co-investor for the A.", facts: [{ type: "intent", text: "Raising a Series A in H2; wants a fintech-native co-lead." }], followUps: [{ action: "Introduce Ayaan to Gwen at Northwind for the A", dueHint: "this week" }] },
    { name: "Freya Lindqvist", title: "Co-founder / CTO", company: "Nimbus Ledger", location: "London", tags: ["founder", "portfolio"] },
    { name: "Diego Marchetti", title: "Founder & CEO", company: "Verdant Grid", location: "Berlin", tags: ["founder", "portfolio", "raising", "climate"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Extending seed into a bridge; grid-balancing pilots live with two utilities. Intro to climate LPs.", facts: [{ type: "intent", text: "Raising a bridge round; two utility pilots live." }, { type: "personal", text: "Third climate startup — knows the sales cycle cold." }], followUps: [{ action: "Introduce Diego to Vikram (climate-curious LP) for the bridge", dueHint: "next week" }] },
    { name: "Nadia Boulos", title: "Co-founder / CTO", company: "Verdant Grid", location: "Berlin", tags: ["founder", "portfolio", "climate"] },
    { name: "Imani Okafor", title: "Founder & CEO", company: "Pulse Health", location: "Boston", tags: ["founder", "portfolio"], cadenceDays: 45, lastReachedOutDaysAgo: 58, note: "Ex-clinician founder, deeply credible. Reimbursement path is the key risk to watch.", facts: [{ type: "role", text: "Practicing physician before founding Pulse Health." }, { type: "personal", text: "Sensitive to over-hiring — runs lean by conviction." }] },
    { name: "Sanjay Iyer", title: "Co-founder / CTO", company: "Pulse Health", location: "Boston", tags: ["founder", "portfolio"] },
    { name: "Mira Kovac", title: "Founder & CEO", company: "Forge AI", location: "San Francisco", tags: ["founder", "portfolio", "raising"], cadenceDays: 21, lastReachedOutDaysAgo: 30, note: "Hottest company in the portfolio. Series A heavily oversubscribed — help her keep the round clean.", facts: [{ type: "intent", text: "Series A oversubscribed; deciding on lead and allocation." }, { type: "preference", text: "Wants a board member who has scaled DevTools GTM." }], followUps: [{ action: "Send Mira a term-sheet comparison note for the A", dueHint: "today" }] },
    { name: "Tomasz Wojcik", title: "Co-founder / CTO", company: "Forge AI", location: "San Francisco", tags: ["founder", "portfolio"] },
    { name: "Priya Nair", title: "Founder & CEO", company: "Lumen Commerce", location: "Bangalore", tags: ["founder", "portfolio"], cadenceDays: 45, lastReachedOutDaysAgo: 49 },
    { name: "Caleb Ostrowski", title: "Co-founder / CTO", company: "Lumen Commerce", location: "Bangalore", tags: ["founder", "portfolio"] },
    { name: "Yusuf El-Amin", title: "Founder & CEO", company: "Cobalt Security", location: "Tel Aviv", tags: ["founder", "portfolio"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Strong design-partner logos already. Watch burn — hiring ahead of revenue.", facts: [{ type: "personal", text: "Ex-unit 8200; recruits heavily from his old network." }] },

    // ---- prospect / tracking founders (passed / watching) ----
    { name: "Leon Fischer", title: "Founder & CEO", company: "Kairos Payments", location: "Amsterdam", tags: ["founder", "tracking", "raising"], cadenceDays: 30, lastReachedOutDaysAgo: 38, note: "Second-time founder, clean cap table. Would take the seed lead if the terms fit — decide by Q3.", facts: [{ type: "intent", text: "Raising a seed; open to us leading if we move by Q3." }], followUps: [{ action: "Run diligence on Kairos and decide lead-or-pass", dueHint: "before Q3" }] },
    { name: "Noor Abbasi", title: "Co-founder / CTO", company: "Kairos Payments", location: "Amsterdam", tags: ["founder", "tracking"] },
    { name: "Sofia Reyes", title: "Founder & CEO", company: "Meridian Robotics", location: "Austin", tags: ["founder", "tracking"], cadenceDays: 60, lastReachedOutDaysAgo: 66, note: "Impressive demo but capital-intensive; wrong stage for us. Keep warm for later." },
    { name: "Henrik Lund", title: "Co-founder / CTO", company: "Meridian Robotics", location: "Austin", tags: ["founder", "tracking"] },
    { name: "Kwame Asante", title: "Founder & CEO", company: "Aster Learning", location: "Accra", tags: ["founder", "tracking"] },
    { name: "Ingrid Sorensen", title: "Founder & CEO", company: "Quill Docs", location: "Copenhagen", tags: ["founder", "tracking", "raising"], cadenceDays: 45, lastReachedOutDaysAgo: 51, note: "Bottoms-up SaaS with real retention. Watching the seed — wants a design-led investor.", followUps: [{ action: "Decide whether to pre-empt Quill's seed", dueHint: "this month" }] },
    { name: "Bianca Ferreira", title: "Founder & CEO", company: "Tidepool Logistics", location: "Sao Paulo", tags: ["founder", "tracking", "raising"], cadenceDays: 30, lastReachedOutDaysAgo: 35, note: "LatAm logistics wedge working. Raising an A; needs a lead comfortable with cross-border ops.", facts: [{ type: "intent", text: "Raising a Series A; needs a cross-border-comfortable lead." }] },
    { name: "Ravi Menon", title: "Co-founder / CTO", company: "Tidepool Logistics", location: "Sao Paulo", tags: ["founder", "tracking"] },

    // ---- co-investors at other funds ----
    { name: "Gwen Hollis", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor", "fintech"], cadenceDays: 45, lastReachedOutDaysAgo: 55, note: "Great potential co-investor for fintech deals; moves fast once she's in.", facts: [{ type: "preference", text: "Only leads fintech; wants the founder call before the deck." }], followUps: [{ action: "Share the Nimbus Ledger Series A memo with Gwen", dueHint: "this week" }] },
    { name: "Dmitri Volkov", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor"] },
    { name: "Aria Solberg", title: "Partner (co-investor)", company: "Harbor Line Ventures", location: "Stockholm", tags: ["co-investor", "climate"], cadenceDays: 21, lastReachedOutDaysAgo: 12, note: "Leads climate rounds. Co-invested on Verdant Grid and is leading Amara's Helios Series A — my way into that allocation. Keep close.", facts: [{ type: "role", text: "Climate lead at Harbor Line; leading the Helios Solar Series A." }] },
    { name: "Malik Johnson", title: "Partner (co-investor)", company: "Harbor Line Ventures", location: "Stockholm", tags: ["co-investor", "climate"] },
    { name: "Beatrix Chen", title: "Partner (co-investor)", company: "Belmont Partners", location: "Singapore", tags: ["co-investor"], cadenceDays: 60, lastReachedOutDaysAgo: 70 },
    { name: "Owen Fitzgerald", title: "Partner (co-investor)", company: "Belmont Partners", location: "Singapore", tags: ["co-investor"] },

    // ---- accelerator ----
    { name: "Harriet Vale", title: "Partner", company: "Ignite Labs", location: "San Francisco", tags: ["accelerator", "deal-flow"], cadenceDays: 30, lastReachedOutDaysAgo: 33, note: "Runs the accelerator's flagship cohort — best top-of-funnel for pre-seed deal flow. She sourced my first meeting with Amara.", followUps: [{ action: "Get the next Ignite Labs cohort list from Harriet", dueHint: "before demo day" }] },
    { name: "Bruno Costa", title: "Program Director", company: "Ignite Labs", location: "San Francisco", tags: ["accelerator"] },

    // ---- operators / angels ----
    { name: "Aditya Kapoor", title: "Angel / Operator", company: null, location: "San Francisco", tags: ["angel", "fintech"], cadenceDays: 60, lastReachedOutDaysAgo: 68, note: "Ex-VP Eng at a payments unicorn. Writes $50k angel checks and takes founder calls — great for fintech intros.", facts: [{ type: "personal", text: "Backed Nimbus Ledger's pre-seed alongside us." }] },
    { name: "Priyanka Sethi", title: "Angel / Operator", company: null, location: "Bangalore", tags: ["angel", "consumer"], note: "Scaled a consumer brand to exit. Perfect operator-angel to add to Lumen Commerce's cap table." },
    { name: "Rohan Gupta", title: "Angel / Operator", company: null, location: "Mumbai", tags: ["angel", "security"], cadenceDays: 90, lastReachedOutDaysAgo: 40, note: "Security operator-angel; opened two design-partner doors for Cobalt. Loop in on security deals." },
    { name: "Naomi Wright", title: "Angel / Operator", company: null, location: "Boston", tags: ["angel", "healthtech"] },
    { name: "Sebastian Klein", title: "Angel / Operator", company: null, location: "Berlin", tags: ["angel", "climate"] },
    { name: "Farah Nasser", title: "Angel / Operator", company: null, location: "Dubai", tags: ["angel"] },
    { name: "Chloe Bennett", title: "Angel / Operator", company: null, location: "Sydney", tags: ["angel"] },
    { name: "Damon Reyes", title: "Angel / Operator", company: null, location: "Austin", tags: ["angel", "robotics"] },

    // ---- LPs ----
    { name: "Geoffrey Ashworth", title: "LP", company: null, location: "Zurich", tags: ["LP", "anchor"], cadenceDays: 90, lastReachedOutDaysAgo: 101, note: "Anchor LP from Fund I. Wants quarterly portfolio pulse — send the Forge AI markup story.", followUps: [{ action: "Send Geoffrey the Q3 portfolio pulse (lead with Forge AI markup)", dueHint: "this quarter" }] },
    { name: "Margaret Sinclair", title: "LP", company: null, location: "Toronto", tags: ["LP"] },
    { name: "Vikram Desai", title: "LP", company: null, location: "Singapore", tags: ["LP", "climate-curious"], cadenceDays: 60, lastReachedOutDaysAgo: 64, note: "Family-office LP evaluating Fund II. Warm but wants to see climate exposure — showcase Verdant Grid and Helios.", facts: [{ type: "preference", text: "Will commit to Fund II if he sees real climate exposure." }] },
  ],

  events: [
    {
      name: "Ignite Labs Demo Day 2025",
      emoji: "🎤",
      tags: ["demo day"],
      attendees: [
        "Harriet Vale", "Bruno Costa",
        "Amara Diallo", "Leon Fischer", "Sofia Reyes", "Kwame Asante", "Ingrid Sorensen",
        "Gwen Hollis", "Aria Solberg", "Beatrix Chen",
        "Aditya Kapoor", "Chloe Bennett", "Damon Reyes",
      ],
    },
    {
      name: "Portfolio Founder Dinner",
      emoji: "🍽️",
      tags: ["dinner"],
      attendees: [
        "Ayaan Qureshi", "Mira Kovac", "Imani Okafor", "Diego Marchetti", "Yusuf El-Amin", "Bianca Ferreira", "Priya Nair",
        "Aditya Kapoor", "Priyanka Sethi", "Rohan Gupta",
      ],
    },
    {
      name: "LP Annual Meeting 2026",
      emoji: "📊",
      tags: ["LP"],
      attendees: [
        "Geoffrey Ashworth", "Margaret Sinclair", "Vikram Desai",
        "Mira Kovac", "Diego Marchetti",
        "Gwen Hollis", "Owen Fitzgerald",
      ],
    },
    {
      name: "Climate Tech Summit",
      emoji: "🌍",
      tags: ["conference"],
      attendees: [
        "Amara Diallo", "Bram de Vries", "Diego Marchetti", "Nadia Boulos",
        "Aria Solberg", "Malik Johnson", "Vikram Desai", "Wesley Adekunle", "Sebastian Klein",
      ],
    },
    {
      name: "Fintech Founders Roundtable",
      emoji: "💳",
      tags: ["roundtable"],
      attendees: [
        "Ayaan Qureshi", "Freya Lindqvist", "Leon Fischer", "Noor Abbasi",
        "Gwen Hollis", "Dmitri Volkov", "Aditya Kapoor",
      ],
    },
  ],

  relationships: [
    // hero circle
    { from: "Amara Diallo", predicate: "colleague_of", to: "Bram de Vries" },
    { from: "Amara Diallo", predicate: "introduced_by", to: "Wesley Adekunle" },
    { from: "Amara Diallo", predicate: "introduced_to", to: "Aria Solberg" },
    // co-invest / backing web
    { from: "Aria Solberg", predicate: "co_invested_with", to: "Diego Marchetti" },
    { from: "Gwen Hollis", predicate: "co_invested_with", to: "Ayaan Qureshi" },
    { from: "Ayaan Qureshi", predicate: "backed_by", to: "Aditya Kapoor" },
    { from: "Aditya Kapoor", predicate: "mentor_of", to: "Mira Kovac" },
    { from: "Imani Okafor", predicate: "worked_with", to: "Sanjay Iyer" },
  ],
});
