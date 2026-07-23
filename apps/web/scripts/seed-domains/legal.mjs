import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich legal-BD demo: a rainmaking partner's book of business. Hero is a client
// General Counsel (Rachel Okonkwo) the partner wants to deepen — fleshed out for
// the contact-profile money shot — plus breadth (clients, in-house counsel,
// referral sources, prospects) so the dashboard's "threads to pull today" +
// follow-ups tiles are full.
//
// ETHICS NOTE: this is business-development / relationship data only. No
// privileged information, no matter detail, no confidential facts anywhere —
// only who-knows-whom, cadence, and how to keep relationships warm.
await seedDomainAccount({
  slug: "legal",
  displayName: "Marcus Bell — Partner, Business Development (demo)",

  relationshipTypes: [
    { slug: "referral_source", forward: "referral source for", inverse: "referred by" },
  ],

  companies: [
    // --- client companies ---
    { name: "Meridian Health Systems", sector: "Healthcare" },
    { name: "Cascade Manufacturing", sector: "Manufacturing" },
    { name: "Northwind Logistics", sector: "Logistics" },
    { name: "Brightpath Software", sector: "Technology" },
    { name: "Sterling Foods Group", sector: "Consumer Goods" },
    { name: "Vantage Renewables", sector: "Energy" },
    { name: "Harbor Financial Group", sector: "Financial Services" },
    // --- referral sources: accounting firms ---
    { name: "Whitfield & Crane CPAs", sector: "Accounting" },
    { name: "Pemberton Tax Advisors", sector: "Accounting" },
    // --- referral sources: banks ---
    { name: "First Cornerstone Bank", sector: "Banking" },
    { name: "Alderwood Capital Partners", sector: "Investment Banking" },
    // --- referral sources: fellow law firms ---
    { name: "Latham Reyes LLP", sector: "Legal" },
    { name: "Quinn Fairbanks LLP", sector: "Legal" },
    // --- referral source: industry association ---
    { name: "State Bar Association", sector: "Association" },
  ],

  contacts: [
    // ---- HERO: client GC to deepen ----
    {
      name: "Rachel Okonkwo",
      hero: true,
      title: "General Counsel",
      company: "Meridian Health Systems",
      location: "Chicago, IL",
      tags: ["client", "key-relationship", "active", "bar-committee"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 47,
      notes: [
        "Met at the State Bar Association annual dinner — seated at the same table. Easy conversation; she'd just been appointed GC and was still sizing up the room.",
        "She's building out her outside-counsel bench and wants a short list of firms that are responsive and commercial, not just big-name. Told her I'd stay in touch.",
        "Caught up over lunch — mostly bar-committee talk and her settling into the new role. Kept it social, no business pitch. Just keeping the relationship warm.",
      ],
      facts: [
        { type: "intent", text: "Building her outside-counsel roster at Meridian Health Systems — wants a firm that's responsive and commercial." },
        { type: "role", text: "General Counsel at Meridian Health Systems (newly appointed)." },
        { type: "personal", text: "We serve on the same bar committee." },
        { type: "preference", text: "Values plain-English advice and fast turnarounds." },
      ],
      followUps: [
        { action: "Grab lunch with Rachel to catch up", dueHint: "this month" },
        { action: "Send Rachel the M&A CLE seminar invite", dueHint: "this week" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    { name: "Daniel Mercer", title: "CEO (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client", "executive"], note: "Rachel reports to him. Met once at the client holiday reception — worth staying on his radar." },
    { name: "David Okafor", title: "Deputy General Counsel (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client", "in-house"], note: "Works under Rachel; the day-to-day contact. Sharp and easy to reach." },
    { name: "Sandra Yeung", title: "CFO (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client", "executive"] },
    { name: "Caleb Foster", title: "VP Compliance (prospect)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["prospect", "in-house"], note: "Introduced by Rachel at the CLE seminar — nurture as a future contact." },

    // ---- Cascade Manufacturing ----
    { name: "Thomas Beckett", title: "General Counsel (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client", "in-house"], cadenceDays: 90, lastReachedOutDaysAgo: 110, note: "Long-standing client GC — quarterly check-in is overdue.", followUps: [{ action: "Schedule Thomas's quarterly relationship check-in", dueHint: "this month" }] },
    { name: "Lucia Moreno", title: "VP Legal (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client", "in-house"] },
    { name: "Raj Malhotra", title: "CEO (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client", "executive"] },

    // ---- Northwind Logistics ----
    { name: "Grace Adeyemi", title: "General Counsel (client)", company: "Northwind Logistics", location: "Atlanta, GA", tags: ["client", "in-house", "reconnect"], cadenceDays: 60, lastReachedOutDaysAgo: 400, note: "Haven't spoken in over a year — reconnect and catch up over coffee." },
    { name: "Henry Salazar", title: "CFO (client)", company: "Northwind Logistics", location: "Atlanta, GA", tags: ["client", "executive"] },

    // ---- Brightpath Software ----
    { name: "Emma Lindqvist", title: "General Counsel (client)", company: "Brightpath Software", location: "Austin, TX", tags: ["client", "in-house"] },
    { name: "Kwame Boateng", title: "Chief Legal Officer (client)", company: "Brightpath Software", location: "Austin, TX", tags: ["client", "in-house"], note: "Values responsiveness — keep touchpoints frequent.", followUps: [{ action: "Send Kwame the data-privacy CLE recording", dueHint: "this week" }] },
    { name: "Aisha Bello", title: "Head of Product (prospect)", company: "Brightpath Software", location: "Austin, TX", tags: ["prospect"] },

    // ---- Sterling Foods Group ----
    { name: "Robert Kim", title: "General Counsel (client)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["client", "in-house"], cadenceDays: 45, lastReachedOutDaysAgo: 60, note: "Referred in by Nathan Pemberton. Keep the relationship steady." },
    { name: "Olivia Chen", title: "Associate General Counsel (client)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["client", "in-house"], note: "Rising in-house contact — worth a mentoring lunch." },

    // ---- Vantage Renewables ----
    { name: "Diego Fuentes", title: "General Counsel (client)", company: "Vantage Renewables", location: "Denver, CO", tags: ["client", "in-house"] },
    { name: "Amara Nwosu", title: "CFO (client)", company: "Vantage Renewables", location: "Denver, CO", tags: ["client", "executive", "reconnect"], note: "Moved into the CFO seat last quarter — reintroduce myself." },

    // ---- Harbor Financial Group ----
    { name: "Jonathan Pierce", title: "General Counsel (client)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["client", "in-house"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Referred in by Charles Dunmore at First Cornerstone." },
    { name: "Fatima Al-Rashid", title: "Deputy General Counsel (client)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["client", "in-house"] },
    { name: "Trevor Nash", title: "Chief Risk Officer (prospect)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["prospect"], note: "Warm prospect from the bar dinner intro — follow up.", followUps: [{ action: "Follow up with Trevor after the bar dinner intro", dueHint: "next month" }] },
    { name: "Naomi Sato", title: "VP Legal (prospect)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["prospect", "in-house"] },

    // ---- Whitfield & Crane CPAs (referral source) ----
    { name: "Eleanor Whitfield", title: "Partner (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source", "key-relationship"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Introduced me to Rachel and refers a steady stream of M&A work — thank her and stay close.", followUps: [{ action: "Take Eleanor to lunch to thank her for referrals", dueHint: "this month" }] },
    { name: "Gordon Pratt", title: "Tax Partner (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source"] },

    // ---- Pemberton Tax Advisors (referral source) ----
    { name: "Nathan Pemberton", title: "Managing Partner (referral source)", company: "Pemberton Tax Advisors", location: "Philadelphia, PA", tags: ["referral-source"], cadenceDays: 60, lastReachedOutDaysAgo: 75, note: "Steady stream of referrals — send a handwritten note.", followUps: [{ action: "Send Nathan a handwritten thank-you note", dueHint: "this week" }] },
    { name: "Isabella Rossi", title: "Senior Tax Advisor (referral source)", company: "Pemberton Tax Advisors", location: "Philadelphia, PA", tags: ["referral-source"] },

    // ---- First Cornerstone Bank (referral source) ----
    { name: "Charles Dunmore", title: "Banker (referral source)", company: "First Cornerstone Bank", location: "Charlotte, NC", tags: ["referral-source"], cadenceDays: 45, lastReachedOutDaysAgo: 58, note: "Great source of banking referrals — invite to the golf outing.", followUps: [{ action: "Invite Charles to the client golf outing", dueHint: "this month" }] },
    { name: "Yuki Tanaka", title: "Relationship Manager (referral source)", company: "First Cornerstone Bank", location: "Charlotte, NC", tags: ["referral-source"] },

    // ---- Alderwood Capital Partners (referral source) ----
    { name: "Vanessa Blackwood", title: "Managing Director (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"], cadenceDays: 60, lastReachedOutDaysAgo: 80, note: "Sends deal-side introductions — reciprocate when I can." },
    { name: "Samuel Greene", title: "Vice President (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"] },

    // ---- Latham Reyes LLP (referral source / fellow firm) ----
    { name: "Miguel Reyes", title: "Partner (referral source)", company: "Latham Reyes LLP", location: "Los Angeles, CA", tags: ["referral-source", "bar-committee"], cadenceDays: 30, lastReachedOutDaysAgo: 38, note: "On the same bar committee as Rachel and me; refers conflicts-out matters." },
    { name: "Hannah Goldberg", title: "Partner (referral source)", company: "Latham Reyes LLP", location: "Los Angeles, CA", tags: ["referral-source"] },

    // ---- Quinn Fairbanks LLP (referral source / fellow firm) ----
    { name: "Patrick Quinn", title: "Partner (referral source)", company: "Quinn Fairbanks LLP", location: "Seattle, WA", tags: ["referral-source", "reconnect"], cadenceDays: 90, lastReachedOutDaysAgo: 300, note: "Lost touch after he changed firms — reconnect." },
    { name: "Rebecca Fairbanks", title: "Partner (referral source)", company: "Quinn Fairbanks LLP", location: "Seattle, WA", tags: ["referral-source"] },

    // ---- State Bar Association (referral source / association) ----
    { name: "Angela Foster", title: "Executive Director (referral source)", company: "State Bar Association", location: "Washington, DC", tags: ["referral-source", "association"] },
    { name: "Terrence Wu", title: "Programs Chair (referral source)", company: "State Bar Association", location: "Washington, DC", tags: ["referral-source", "association", "bar-committee"] },
    { name: "Priyanka Nair", title: "Sections Coordinator (referral source)", company: "State Bar Association", location: "Washington, DC", tags: ["referral-source", "association"] },
  ],

  events: [
    {
      name: "State Bar Association Annual Dinner",
      emoji: "🍷",
      tags: ["bar-association", "networking"],
      attendees: ["Rachel Okonkwo", "Angela Foster", "Terrence Wu", "Priyanka Nair", "Miguel Reyes", "Hannah Goldberg", "Patrick Quinn", "Rebecca Fairbanks", "Trevor Nash"],
    },
    {
      name: "Client CLE Seminar: M&A Update",
      emoji: "🎓",
      tags: ["cle", "seminar"],
      attendees: ["Rachel Okonkwo", "David Okafor", "Caleb Foster", "Thomas Beckett", "Grace Adeyemi", "Emma Lindqvist", "Kwame Boateng", "Robert Kim", "Olivia Chen", "Diego Fuentes", "Jonathan Pierce"],
    },
    {
      name: "Rainmakers Golf Outing",
      emoji: "⛳",
      tags: ["golf", "referral"],
      attendees: ["Charles Dunmore", "Yuki Tanaka", "Vanessa Blackwood", "Samuel Greene", "Eleanor Whitfield", "Nathan Pemberton", "Miguel Reyes", "Raj Malhotra"],
    },
    {
      name: "M&A Referral Roundtable",
      emoji: "🤝",
      tags: ["referral", "networking"],
      attendees: ["Eleanor Whitfield", "Gordon Pratt", "Vanessa Blackwood", "Charles Dunmore", "Miguel Reyes", "Hannah Goldberg", "Amara Nwosu", "Henry Salazar"],
    },
    {
      name: "Bar Committee Working Lunch",
      emoji: "⚖️",
      tags: ["bar-association", "committee"],
      attendees: ["Rachel Okonkwo", "Miguel Reyes", "Angela Foster", "Terrence Wu"],
    },
  ],

  relationships: [
    // hero circle
    { from: "Rachel Okonkwo", predicate: "introduced_by", to: "Eleanor Whitfield" },
    { from: "Rachel Okonkwo", predicate: "reports_to", to: "Daniel Mercer" },
    { from: "Rachel Okonkwo", predicate: "colleague_of", to: "Miguel Reyes" },
    // wider book
    { from: "David Okafor", predicate: "reports_to", to: "Rachel Okonkwo" },
    { from: "Raj Malhotra", predicate: "manages", to: "Lucia Moreno" },
    { from: "Eleanor Whitfield", predicate: "colleague_of", to: "Gordon Pratt" },
    { from: "Charles Dunmore", predicate: "introduced_to", to: "Vanessa Blackwood" },
    // referral-source edges (custom label)
    { from: "Nathan Pemberton", predicate: "referral_source", to: "Robert Kim" },
    { from: "Charles Dunmore", predicate: "referral_source", to: "Jonathan Pierce" },
  ],
});
