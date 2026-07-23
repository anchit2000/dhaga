import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich real-estate demo: a hero client (Priya Raman) fleshed out for the
// contact-profile money shot, plus breadth so the dashboard's "threads to pull
// today" + follow-ups tiles are full.
await seedDomainAccount({
  slug: "real-estate",
  displayName: "Marisol Vega — Realtor (demo)",

  relationshipTypes: [
    { slug: "referred_by", forward: "referred by", inverse: "referred" },
    { slug: "lender_for", forward: "lender for", inverse: "works with lender" },
  ],

  companies: [
    { name: "Riverbend Realty", sector: "Real Estate Brokerage" },
    { name: "Crestline Properties", sector: "Real Estate Brokerage" },
    { name: "Summit Lending", sector: "Mortgage" },
    { name: "Harbor Mortgage", sector: "Mortgage" },
    { name: "Maple Title & Escrow", sector: "Title & Escrow" },
    { name: "BrightStage Home Staging", sector: "Home Staging" },
    { name: "Keystone Home Inspection", sector: "Inspection" },
    { name: "Alderwood Contracting", sector: "Construction" },
    { name: "Maple Heights HOA", sector: "Community" },
    { name: "Northwind Labs", sector: "Software" },
    { name: "Cargoline", sector: "Logistics" },
    { name: "Solventis Health", sector: "Healthcare" },
    { name: "Larkspur Coffee", sector: "Hospitality" },
    { name: "Fjord Design Co.", sector: "Design" },
  ],

  contacts: [
    // ---- HERO ----
    {
      name: "Priya Raman",
      hero: true,
      title: "Product Manager",
      company: "Northwind Labs",
      location: "Maple Heights",
      tags: ["buyer", "active", "referral", "pre-approved"],
      cadenceDays: 15,
      lastReachedOutDaysAgo: 21,
      notes: [
        "Met at the 42 Larkspur open house. Loved the light and the kitchen; worried the commute to Northwind is a bit long. Second baby on the way, so they need a 4th bedroom by summer.",
        "Financing call — pre-approved up to $850k with Summit Lending (loan officer Marco Diaz). Wants to stay under $780k to keep the payment comfortable.",
        "Texted her the new Maple Heights listings. She flagged 18 Cedar Court and wants a showing this weekend.",
      ],
      facts: [
        { type: "intent", text: "Buying a 4-bed in Maple Heights within 6 months; wants to stay under $780k." },
        { type: "personal", text: "Second baby due in spring — needs the extra bedroom by summer." },
        { type: "preference", text: "Priorities: big backyard, natural light, top-rated school district." },
        { type: "role", text: "Product Manager at Northwind Labs; hybrid schedule, so commute matters." },
      ],
      followUps: [
        { action: "Book the 18 Cedar Court showing for Saturday morning", dueHint: "this week" },
        { action: "Introduce Priya to Marco at Summit Lending to finalize pre-approval", dueHint: "this week" },
      ],
    },
    // ---- hero's circle (for relationships) ----
    { name: "Dev Raman", title: "Software Engineer", company: "Cargoline", location: "Maple Heights", tags: ["buyer", "spouse"], note: "Priya's husband; the quieter decision-maker. Cares most about the garage and a home office." },
    { name: "Helen Cho", title: "Past client", company: "Solventis Health", location: "Riverside", tags: ["past-client", "referral-source"], cadenceDays: 90, lastReachedOutDaysAgo: 120, note: "Sold her the Oak St bungalow in 2023. Referred the Ramans. Loves being kept in the loop — send a closing-anniversary note in October.", facts: [{ type: "personal", text: "Closing anniversary in October — she appreciates a handwritten card." }], followUps: [{ action: "Send Helen a closing-anniversary note", dueHint: "October" }] },
    { name: "Marco Diaz", title: "Loan Officer", company: "Summit Lending", location: "Downtown", tags: ["lender", "partner"], cadenceDays: 30, lastReachedOutDaysAgo: 40, note: "Go-to lender for first-time buyers. Fast on pre-approvals; send him the Ramans." },

    // ---- active buyers/sellers with cadence due (drive 'threads to pull today') ----
    { name: "Tomás Alvarez", title: "Seller", company: "Cargoline", location: "Riverside", tags: ["seller", "listing", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 11, note: "Listing 88 Alder Ave. Wants to close before the school year. Staging booked with BrightStage.", followUps: [{ action: "Send Tomás the updated comps for 88 Alder Ave", dueHint: "today" }] },
    { name: "Nadia Okoro", title: "Buyer", company: "Northwind Labs", location: "Maple Heights", tags: ["buyer", "first-time", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 9, note: "First-time buyer, cautious. Wants to see three more before deciding." },
    { name: "Grace Bellini", title: "Seller", company: "Fjord Design Co.", location: "Hillcrest", tags: ["seller", "active"], cadenceDays: 15, lastReachedOutDaysAgo: 20, followUps: [{ action: "Confirm the Hillcrest photographer for Grace's listing", dueHint: "this week" }] },
    { name: "Owen Fletcher", title: "Buyer", company: "Solventis Health", location: "Downtown", tags: ["buyer", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 10 },
    { name: "Aisha Rahman", title: "Buyer", company: "Larkspur Coffee", location: "Maple Heights", tags: ["buyer", "lead"], cadenceDays: 15, lastReachedOutDaysAgo: 18, note: "Wants a walkable neighbourhood near a good café. Pre-qual pending." },
    { name: "Ben Carver", title: "Seller", company: "Alderwood Contracting", location: "Riverside", tags: ["seller", "past-client"], cadenceDays: 30, lastReachedOutDaysAgo: 38 },
    { name: "Sofia Marchetti", title: "Buyer", company: "Northwind Labs", location: "Hillcrest", tags: ["buyer", "active"], cadenceDays: 7, lastReachedOutDaysAgo: 8, followUps: [{ action: "Send Sofia the Hillcrest listings under $600k", dueHint: "today" }] },
    { name: "Liam O'Donnell", title: "Buyer", company: "Cargoline", location: "Maple Heights", tags: ["buyer", "lead"], cadenceDays: 15, lastReachedOutDaysAgo: 19 },
    { name: "Yuki Tanaka", title: "Seller", company: "Solventis Health", location: "Downtown", tags: ["seller", "active"], cadenceDays: 30, lastReachedOutDaysAgo: 34 },
    { name: "Rosa Iglesias", title: "Buyer", company: "Larkspur Coffee", location: "Riverside", tags: ["buyer", "lead"], cadenceDays: 15, lastReachedOutDaysAgo: 22 },

    // ---- partners / vendors ----
    { name: "Dana Whitfield", title: "Broker", company: "Riverbend Realty", location: "Downtown", tags: ["colleague", "broker"], note: "My managing broker. Loop in on the Alvarez deal." },
    { name: "Priyanka Shah", title: "Home Stager", company: "BrightStage Home Staging", location: "Riverside", tags: ["vendor", "staging"], cadenceDays: 90, lastReachedOutDaysAgo: 30 },
    { name: "Ravi Menon", title: "Home Inspector", company: "Keystone Home Inspection", location: "Hillcrest", tags: ["vendor", "inspection"] },
    { name: "Carlos Rivera", title: "Contractor", company: "Alderwood Contracting", location: "Maple Heights", tags: ["vendor", "contractor"], note: "Reliable for pre-listing fixes; books up fast in spring." },
    { name: "Emily Novak", title: "Escrow Officer", company: "Maple Title & Escrow", location: "Downtown", tags: ["vendor", "escrow"] },
    { name: "Jordan Park", title: "Loan Officer", company: "Harbor Mortgage", location: "Downtown", tags: ["lender", "partner"] },
    { name: "Fatima Hassan", title: "Agent", company: "Crestline Properties", location: "Riverside", tags: ["colleague", "co-op-agent"], note: "Represented the buyer on the Oak St deal — smooth to work with." },

    // ---- sphere / past clients (breadth) ----
    { name: "George Mbeki", title: "Past client", company: "Cargoline", location: "Riverside", tags: ["past-client", "sphere"] },
    { name: "Hana Lee", title: "Past client", company: "Fjord Design Co.", location: "Hillcrest", tags: ["past-client", "sphere"] },
    { name: "Peter Novak", title: "Past client", company: "Solventis Health", location: "Maple Heights", tags: ["past-client", "sphere"] },
    { name: "Lucia Romano", title: "Lead", company: "Larkspur Coffee", location: "Downtown", tags: ["lead", "sphere"] },
    { name: "Ahmed Farouk", title: "Lead", company: "Northwind Labs", location: "Maple Heights", tags: ["lead"] },
    { name: "Ingrid Larsen", title: "Past client", company: "Fjord Design Co.", location: "Hillcrest", tags: ["past-client", "sphere"] },
    { name: "Mateo Gomez", title: "Lead", company: "Cargoline", location: "Riverside", tags: ["lead"] },
    { name: "Priya Nair", title: "Past client", company: "Solventis Health", location: "Downtown", tags: ["past-client", "sphere"] },
    { name: "Deborah Klein", title: "HOA President", company: "Maple Heights HOA", location: "Maple Heights", tags: ["sphere", "community"], note: "Knows everyone in Maple Heights; great source of off-market word-of-mouth." },
    { name: "Sam Whitaker", title: "Past client", company: "Alderwood Contracting", location: "Riverside", tags: ["past-client"] },
    { name: "Chloe Bernard", title: "Lead", company: "Larkspur Coffee", location: "Hillcrest", tags: ["lead"] },
    { name: "Victor Osei", title: "Past client", company: "Cargoline", location: "Maple Heights", tags: ["past-client", "sphere"] },
  ],

  events: [
    { name: "Open House — 42 Larkspur Lane", emoji: "🏠", tags: ["open-house"], attendees: ["Priya Raman", "Dev Raman", "Nadia Okoro", "Aisha Rahman", "Ahmed Farouk", "Lucia Romano"] },
    { name: "Open House — 18 Cedar Court", emoji: "🏡", tags: ["open-house"], attendees: ["Priya Raman", "Owen Fletcher", "Sofia Marchetti", "Mateo Gomez"] },
    { name: "Riverside Neighborhood Home Expo", emoji: "🎪", tags: ["expo", "community"], attendees: ["Priya Raman", "Helen Cho", "Tomás Alvarez", "Deborah Klein", "George Mbeki", "Chloe Bernard", "Rosa Iglesias"] },
    { name: "Closing — 12 Oak Street", emoji: "🔑", tags: ["closing"], attendees: ["Helen Cho", "Fatima Hassan", "Emily Novak", "Marco Diaz"] },
    { name: "Riverbend Broker Mixer", emoji: "🥂", tags: ["networking"], attendees: ["Dana Whitfield", "Fatima Hassan", "Jordan Park", "Priyanka Shah", "Marco Diaz"] },
  ],

  relationships: [
    { from: "Priya Raman", predicate: "spouse_of", to: "Dev Raman" },
    { from: "Priya Raman", predicate: "referred_by", to: "Helen Cho" },
    { from: "Priya Raman", predicate: "introduced_to", to: "Marco Diaz" },
    { from: "Tomás Alvarez", predicate: "introduced_to", to: "Priyanka Shah" },
    { from: "Helen Cho", predicate: "friend_of", to: "Deborah Klein" },
    { from: "Marco Diaz", predicate: "colleague_of", to: "Jordan Park" },
    { from: "Dana Whitfield", predicate: "manages", to: "Fatima Hassan" },
    { from: "Nadia Okoro", predicate: "referred_by", to: "George Mbeki" },
  ],
});
