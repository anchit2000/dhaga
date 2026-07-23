import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// A startup founder running five jobs at once: raising the seed round,
// recruiting a founding team, landing design-partner customers, and courting
// press. The hero (Priya Raghunathan) is the lead-investor prospect — fleshed
// out for the contact-profile money shot — while breadth across investors,
// advisors, candidates, customers and press keeps the dashboard's "threads to
// pull today" + follow-ups tiles full. The graph connects those worlds through
// shared firms and shared events (a fundraise roadshow, an accelerator demo
// day, a launch party, a design-partner summit).
await seedDomainAccount({
  slug: "founders",
  displayName: "Sam Fielding — Founder & CEO (demo)",

  relationshipTypes: [
    { slug: "advisor_to", forward: "advises", inverse: "advised by" },
  ],

  companies: [
    // Investor funds
    { name: "Northwind Ventures", sector: "Venture Capital" },
    { name: "Meridian Capital Partners", sector: "Venture Capital" },
    { name: "Blue Harbor Seed", sector: "Venture Capital" },
    { name: "Cedar Grove Capital", sector: "Venture Capital" },
    { name: "Sparrow Angels", sector: "Angel Syndicate" },
    // Accelerator
    { name: "Launchpad Collective", sector: "Accelerator" },
    // Recruiting agency
    { name: "Talent Forge Recruiting", sector: "Recruiting" },
    // PR firm
    { name: "Bright Signal PR", sector: "Public Relations" },
    // Vendors
    { name: "Ledgerly", sector: "SaaS Vendor" },
    { name: "Cornerstone Legal", sector: "Legal Services" },
    // Design-partner customers
    { name: "Voltra Logistics", sector: "Logistics" },
    { name: "Meadowbrook Health", sector: "Healthcare" },
    { name: "Trailhead Retail", sector: "Retail" },
    { name: "Fernbank Financial", sector: "Financial Services" },
    { name: "Sightline Media", sector: "Media" },
    { name: "Oakline Manufacturing", sector: "Manufacturing" },
    // Press
    { name: "TechPulse Daily", sector: "Media" },
  ],

  contacts: [
    // ---- HERO: lead-investor prospect for the seed round ----
    {
      name: "Priya Raghunathan",
      hero: true,
      title: "Partner",
      company: "Northwind Ventures",
      location: "San Francisco",
      tags: ["investor", "warm", "lead", "active"],
      cadenceDays: 15,
      lastReachedOutDaysAgo: 24,
      notes: [
        "Pitch meeting at Northwind's office. Walked her through the wedge, the design-partner traction, and the raise. She leaned in on the founder-led sales motion and the logistics use case — said the deck was one of the cleanest she'd seen this cycle.",
        "She was direct about the gate: \"Follow up when you hit $10k MRR and I'll take it to the partnership.\" Wants to see the metric proven, not projected.",
        "We just crossed $12k MRR — expansion from Voltra plus two new design partners. This is exactly the signal she asked for; time to re-open the conversation with hard numbers.",
      ],
      facts: [
        { type: "intent", text: "Will lead the round once we prove $10k+ MRR — we're now at $12k." },
        { type: "role", text: "Partner at Northwind Ventures — leads seed rounds in our space." },
        { type: "personal", text: "Former operator; loves founder-led sales stories." },
        { type: "preference", text: "Wants a customer reference call before committing." },
      ],
      followUps: [
        { action: "Send Priya the updated metrics — we hit $12k MRR", dueHint: "today" },
        { action: "Book the partner meeting for next week", dueHint: "this week" },
      ],
    },

    // ---- Investors / angels (9 more; hero's circle + cadence + follow-ups) ----
    { name: "Marcus Feld", title: "Partner", company: "Northwind Ventures", location: "San Francisco", tags: ["investor", "warm"], cadenceDays: 21, lastReachedOutDaysAgo: 30, note: "Priya's co-investor at Northwind; would co-lead if she leads. Keep him warm so the partnership vote is easy." },
    { name: "Elena Vasquez", title: "Partner", company: "Meridian Capital Partners", location: "New York", tags: ["investor", "active"], cadenceDays: 14, lastReachedOutDaysAgo: 19, note: "Tracking the round as a fast-follow. Asked for the data room once we have a lead.", followUps: [{ action: "Send Elena the data-room link once Priya commits", dueHint: "this week" }] },
    { name: "David Okonkwo", title: "Partner", company: "Meridian Capital Partners", location: "New York", tags: ["investor"], note: "Elena's partner; the technical diligence voice at Meridian." },
    { name: "Hannah Lindqvist", title: "Partner", company: "Blue Harbor Seed", location: "Boston", tags: ["investor", "warm"], cadenceDays: 21, lastReachedOutDaysAgo: 16, note: "Intro'd by Priya; leads seed rounds up to $2M. A credible alternative lead if Northwind stalls." },
    { name: "Grace Mbeki", title: "Partner", company: "Cedar Grove Capital", location: "Austin", tags: ["investor"], cadenceDays: 21, lastReachedOutDaysAgo: 27, note: "Wants a warm intro to a logistics design partner before she'll commit.", followUps: [{ action: "Intro Grace to Victor at Voltra for a reference call", dueHint: "this week" }] },
    { name: "Nadia Rahman", title: "Angel", company: "Sparrow Angels", location: "London", tags: ["angel", "warm"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Soft-circled $50k. Writes fast once there's a lead." },
    { name: "Kenji Watanabe", title: "Angel", company: "Sparrow Angels", location: "Tokyo", tags: ["angel"], note: "Operator angel; useful for the APAC go-to-market later." },
    { name: "Rebecca Stone", title: "Partner", company: "Launchpad Collective", location: "San Francisco", tags: ["investor", "active"], cadenceDays: 15, lastReachedOutDaysAgo: 12, note: "Runs the accelerator; decides the demo-day lineup. Wants our metrics slide by Friday.", followUps: [{ action: "Send Rebecca the demo-day metrics slide", dueHint: "Friday" }] },
    { name: "Arjun Mehta", title: "Partner", company: "Launchpad Collective", location: "San Francisco", tags: ["investor", "warm"], note: "Rebecca's partner; the founder-friendly voice in the room." },

    // ---- Advisors (7) ----
    { name: "Fiona Chen", title: "Advisor", company: "Meadowbrook Health", location: "Seattle", tags: ["advisor", "active"], cadenceDays: 30, lastReachedOutDaysAgo: 38, note: "Healthcare advisor; will vouch to Meadowbrook's CISO on SSO and the SOC 2 roadmap.", facts: [{ type: "role", text: "Advisor with deep healthcare-security relationships; unblocks the Meadowbrook deal." }] },
    { name: "Malik Johnson", title: "Advisor", location: "Atlanta", tags: ["advisor", "warm"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Former VP Sales; reviewing our pricing deck and made the Priya intro. Also referred Amara for the platform lead.", followUps: [{ action: "Send Malik the revised pricing deck for a second pass", dueHint: "this week" }] },
    { name: "Sophie Andersson", title: "Advisor", location: "Stockholm", tags: ["advisor"], cadenceDays: 45, lastReachedOutDaysAgo: 30, note: "Offered to intro a designer — that became the Zoe Whitfield lead. Remind her we're moving on it." },
    { name: "Wei Zhang", title: "Advisor", company: "Ledgerly", location: "San Jose", tags: ["advisor"], note: "Finance-ops advisor; helped us clean up the metrics before the raise." },
    { name: "Daniel Kim", title: "Advisor", company: "Cornerstone Legal", location: "Los Angeles", tags: ["advisor"], note: "Startup counsel; will paper the SAFE and the BAA for Meadowbrook." },
    { name: "Carla Nogueira", title: "Advisor", location: "São Paulo", tags: ["advisor"], note: "Go-to-market advisor for LatAm expansion; longer-horizon relationship." },
    { name: "Kwame Asante", title: "Advisor", location: "Accra", tags: ["advisor"], note: "Product advisor; sharp on onboarding and activation." },

    // ---- Candidate hires (8) ----
    { name: "Jordan Blake", title: "Staff Engineer (candidate)", location: "Remote", tags: ["candidate", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 10, note: "Strong systems eng; needs an offer by end of month or takes a competing role.", facts: [{ type: "intent", text: "Ready to sign if we close by month-end; wants meaningful early-engineer equity." }], followUps: [{ action: "Get Jordan a written offer out before the competing deadline", dueHint: "today" }] },
    { name: "Zoe Whitfield", title: "Product Designer (candidate)", location: "Portland", tags: ["candidate", "warm"], cadenceDays: 10, lastReachedOutDaysAgo: 8, note: "Sophie's designer intro; portfolio is excellent. Scheduling the founder loop." },
    { name: "Meera Nair", title: "Staff Engineer (candidate)", location: "Bangalore", tags: ["candidate"], note: "Backend depth; onsite timezone overlap is the open question." },
    { name: "Aiden O'Sullivan", title: "Founding Account Executive (candidate)", location: "Dublin", tags: ["candidate", "active"], cadenceDays: 10, lastReachedOutDaysAgo: 14, note: "Founder-led-sales background; would own the design-partner-to-paid motion." },
    { name: "Priyanka Desai", title: "Head of Growth (candidate)", location: "Toronto", tags: ["candidate"], note: "Strong PLG track record; earlier stage than her last role, weighing it." },
    { name: "Amara Okeke", title: "Engineering Manager (candidate)", location: "Nairobi", tags: ["candidate", "warm"], note: "Referred by Malik; wants to lead the platform team." },
    { name: "Lucas Moreau", title: "Senior Backend Engineer (candidate)", location: "Montreal", tags: ["candidate"], note: "Great culture fit; needs the comp band confirmed." },
    { name: "Hana Kobayashi", title: "Product Manager (candidate)", location: "Tokyo", tags: ["candidate", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 12, note: "First PM hire candidate; went quiet after the take-home — re-engage.", followUps: [{ action: "Check in with Hana on the take-home and next steps", dueHint: "today" }] },

    // ---- Design-partner customers (7) ----
    { name: "Victor Alvarez", title: "Head of Ops (design partner)", company: "Voltra Logistics", location: "Dallas", tags: ["customer", "active"], cadenceDays: 14, lastReachedOutDaysAgo: 20, note: "Our first design partner and the source of the MRR expansion. Asked for SSO before they widen the rollout; happy to be Grace's reference call.", facts: [{ type: "intent", text: "Will expand seats once SSO ships; already our largest account by MRR." }], followUps: [{ action: "Confirm the SSO timeline for Victor's team", dueHint: "this week" }] },
    { name: "Grace Thompson", title: "VP Engineering (design partner)", company: "Voltra Logistics", location: "Dallas", tags: ["customer"], note: "Victor's technical counterpart; owns the SSO and security review." },
    { name: "Rashida Bello", title: "CISO (design partner)", company: "Meadowbrook Health", location: "Seattle", tags: ["customer", "active"], cadenceDays: 21, lastReachedOutDaysAgo: 25, note: "Needs a signed BAA and a SOC 2 roadmap to go live. Fiona is vouching for us." },
    { name: "Camille Dubois", title: "Director of CX (design partner)", company: "Trailhead Retail", location: "Denver", tags: ["customer", "warm"], note: "Champion internally; wants a case study once ROI lands. Agreed to be a reference for Priya.", followUps: [{ action: "Prep Camille for the reference call with Priya", dueHint: "this week" }] },
    { name: "Naomi Fischer", title: "VP Operations (design partner)", company: "Fernbank Financial", location: "Charlotte", tags: ["customer"], note: "Slower procurement, but a marquee logo when it lands." },
    { name: "Liam Gallagher", title: "Product Lead (design partner)", company: "Sightline Media", location: "Miami", tags: ["customer", "warm"], note: "Introduced us to two other media buyers and to Jenny on the press side." },
    { name: "Sunita Kapoor", title: "Plant Ops Lead (design partner)", company: "Oakline Manufacturing", location: "Detroit", tags: ["customer"], cadenceDays: 21, lastReachedOutDaysAgo: 29, note: "Manufacturing pilot; going quiet — nudge before the pilot lapses." },

    // ---- Press (4) ----
    { name: "Sara Lindgren", title: "Reporter", company: "TechPulse Daily", location: "San Francisco", tags: ["press", "active"], cadenceDays: 14, lastReachedOutDaysAgo: 18, note: "Covering seed rounds; wants an exclusive on our raise the day we close.", followUps: [{ action: "Line up Sara for the raise-announcement exclusive", dueHint: "when we close" }] },
    { name: "Patrick Nolan", title: "Reporter", company: "Bright Signal PR", location: "Boston", tags: ["press"], cadenceDays: 30, lastReachedOutDaysAgo: 22, note: "Our PR contact; pitching us to three outlets ahead of launch." },
    { name: "Omar Haddad", title: "Reporter", company: "TechPulse Daily", location: "New York", tags: ["press"], note: "Sara's colleague; covers the enterprise-tooling beat." },
    { name: "Jenny Zhao", title: "Reporter", company: "Sightline Media", location: "Los Angeles", tags: ["press", "warm"], note: "Intro'd by Liam; would cover the launch through the media-buyer angle." },
  ],

  events: [
    {
      name: "Seed Roadshow 2026",
      emoji: "💸",
      tags: ["investor", "fundraise"],
      attendees: [
        "Priya Raghunathan", "Marcus Feld", "Elena Vasquez", "David Okonkwo",
        "Hannah Lindqvist", "Grace Mbeki", "Nadia Rahman", "Rebecca Stone",
      ],
    },
    {
      name: "Launchpad Demo Day",
      emoji: "🎤",
      tags: ["investor", "accelerator"],
      attendees: [
        "Rebecca Stone", "Arjun Mehta", "Priya Raghunathan", "Grace Mbeki",
        "Marcus Feld", "Jordan Blake", "Zoe Whitfield", "Sara Lindgren",
      ],
    },
    {
      name: "Launch Party",
      emoji: "🎉",
      tags: ["press", "customer", "launch"],
      attendees: [
        "Sara Lindgren", "Omar Haddad", "Jenny Zhao", "Patrick Nolan",
        "Victor Alvarez", "Rashida Bello", "Camille Dubois", "Liam Gallagher",
        "Naomi Fischer", "Priya Raghunathan", "Fiona Chen",
      ],
    },
    {
      name: "Design Partner Summit",
      emoji: "🤝",
      tags: ["customer"],
      attendees: [
        "Victor Alvarez", "Grace Thompson", "Rashida Bello", "Camille Dubois",
        "Naomi Fischer", "Liam Gallagher", "Sunita Kapoor", "Fiona Chen",
        "Aiden O'Sullivan",
      ],
    },
    {
      name: "Founder Hiring Loop",
      emoji: "🧑‍💻",
      tags: ["hiring"],
      attendees: [
        "Jordan Blake", "Zoe Whitfield", "Meera Nair", "Aiden O'Sullivan",
        "Amara Okeke", "Hana Kobayashi", "Malik Johnson",
      ],
    },
  ],

  relationships: [
    // Hero's circle
    { from: "Priya Raghunathan", predicate: "colleague_of", to: "Marcus Feld" },
    { from: "Priya Raghunathan", predicate: "introduced_by", to: "Malik Johnson" },
    { from: "Priya Raghunathan", predicate: "introduced_to", to: "Camille Dubois" },
    { from: "Priya Raghunathan", predicate: "introduced_to", to: "Hannah Lindqvist" },
    // The wider graph
    { from: "Elena Vasquez", predicate: "colleague_of", to: "David Okonkwo" },
    { from: "Rebecca Stone", predicate: "manages", to: "Arjun Mehta" },
    { from: "Sophie Andersson", predicate: "introduced_to", to: "Zoe Whitfield" },
    { from: "Malik Johnson", predicate: "introduced_to", to: "Amara Okeke" },
    { from: "Fiona Chen", predicate: "advisor_to", to: "Rashida Bello" },
    { from: "Liam Gallagher", predicate: "introduced_to", to: "Jenny Zhao" },
  ],
});
