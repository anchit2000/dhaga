import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Marisol Vega's world: her own brokerage, a rival brokerage she co-brokers
// with, the lenders / title / staging / inspection / trades vendors she leans
// on deal after deal, plus her book of buyers, sellers, past clients and leads.
// Professionals cluster by company; clients thread together through the open
// houses, the closing, the expo and the mixer.

await seedDomainAccount({
  slug: "real-estate",
  displayName: "Marisol Vega — Realtor (demo)",

  companies: [
    { name: "Vega & Bright Realty", sector: "Real estate brokerage" },
    { name: "Harborline Properties", sector: "Real estate brokerage" },
    { name: "Cascade Home Loans", sector: "Mortgage lender" },
    { name: "Summit Peak Mortgage", sector: "Mortgage lender" },
    { name: "Anchor Title & Escrow", sector: "Title & escrow" },
    { name: "Willowbrook Home Staging", sector: "Home staging" },
    { name: "Fresh Nest Staging", sector: "Home staging" },
    { name: "Keystone Home Inspections", sector: "Home inspection" },
    { name: "TrueLevel Home Inspection", sector: "Home inspection" },
    { name: "Cornerstone Contracting", sector: "General contracting" },
    { name: "BrightSpark Electric", sector: "Electrical contractor" },
    { name: "Meadowview HOA", sector: "Homeowners association" },
    { name: "Riverside Appraisal Group", sector: "Property appraisal" },
    { name: "GreenLeaf Landscaping", sector: "Landscaping" },
    { name: "Lens & Light Photography", sector: "Real estate photography" },
    { name: "Bluebird Insurance Group", sector: "Insurance" },
  ],

  contacts: [
    // --- Vega & Bright Realty (Marisol's brokerage) ---
    { name: "Priya Nadkarni", title: "Broker", company: "Vega & Bright Realty", location: "Riverside, CA", tags: ["broker", "sphere"], note: "My managing broker — signs off on all my listings. Loves a coffee at 8am." },
    { name: "Damon Whitfield", title: "Real estate agent", company: "Vega & Bright Realty", location: "Riverside, CA", tags: ["sphere", "referral"], note: "Sends me his overflow buyer leads; I cover his open houses when he travels." },
    { name: "Yuki Tanaka", title: "Real estate agent", company: "Vega & Bright Realty", location: "Riverside, CA", tags: ["sphere"] },
    { name: "Sofia Reyes", title: "Real estate agent", company: "Vega & Bright Realty", location: "Corona, CA", tags: ["sphere"] },
    { name: "Grace Okafor", title: "Transaction coordinator", company: "Vega & Bright Realty", location: "Riverside, CA", tags: ["sphere"], note: "Runs my files start to finish — copy her on every contract." },
    { name: "Ted Vance", title: "Real estate agent", company: "Vega & Bright Realty", location: "Moreno Valley, CA", tags: ["sphere"] },

    // --- Harborline Properties (rival / co-broke partner) ---
    { name: "Renata Cruz", title: "Broker", company: "Harborline Properties", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Broker on the other side of two of my closings — straight shooter, easy to deal with." },
    { name: "Malik Johnson", title: "Real estate agent", company: "Harborline Properties", location: "Fontana, CA", tags: ["referral"] },
    { name: "Fiona Albright", title: "Real estate agent", company: "Harborline Properties", location: "Riverside, CA", tags: ["referral"] },

    // --- Lenders ---
    { name: "Brian Halloran", title: "Loan Officer", company: "Cascade Home Loans", location: "Riverside, CA", tags: ["referral", "sphere"], note: "My go-to for first-time buyers — fast pre-approvals, closes on time." },
    { name: "Aisha Karim", title: "Loan Officer", company: "Cascade Home Loans", location: "Ontario, CA", tags: ["referral"] },
    { name: "Derek Oyelaran", title: "Mortgage underwriter", company: "Cascade Home Loans", location: "Ontario, CA", tags: ["referral"] },
    { name: "Nina Volkov", title: "Loan Officer", company: "Summit Peak Mortgage", location: "Corona, CA", tags: ["referral"], note: "Good on jumbo loans — send her the higher-end buyers." },
    { name: "Carlos Mendez", title: "Loan Officer", company: "Summit Peak Mortgage", location: "Riverside, CA", tags: ["referral"] },

    // --- Title & escrow ---
    { name: "Helen Cho", title: "Escrow Officer", company: "Anchor Title & Escrow", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Handles most of my escrows — text her direct line, skips the front desk." },
    { name: "Raymond Duval", title: "Title Officer", company: "Anchor Title & Escrow", location: "Riverside, CA", tags: ["referral"] },

    // --- Staging ---
    { name: "Bianca Fontaine", title: "Home Stager", company: "Willowbrook Home Staging", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Staged the Larkspur listing beautifully — books up fast, give her 2 weeks." },
    { name: "Owen Pryce", title: "Home Stager", company: "Willowbrook Home Staging", location: "Corona, CA", tags: ["referral"] },
    { name: "Delphine Marchetti", title: "Home Stager", company: "Fresh Nest Staging", location: "Moreno Valley, CA", tags: ["referral"] },

    // --- Inspection ---
    { name: "Gus Petrakis", title: "Home Inspector", company: "Keystone Home Inspections", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Thorough inspector — buyers trust his reports, never fluffs findings." },
    { name: "Wendy Salazar", title: "Home Inspector", company: "Keystone Home Inspections", location: "Fontana, CA", tags: ["referral"] },
    { name: "Hank Brody", title: "Home Inspector", company: "TrueLevel Home Inspection", location: "Corona, CA", tags: ["referral"] },

    // --- Trades ---
    { name: "Miguel Santos", title: "General Contractor", company: "Cornerstone Contracting", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Handles pre-listing repairs for my sellers — bid on the Maplewood roof." },
    { name: "Lena Krause", title: "Project Manager", company: "Cornerstone Contracting", location: "Riverside, CA", tags: ["referral"] },
    { name: "Andre Dubois", title: "Electrician", company: "BrightSpark Electric", location: "Ontario, CA", tags: ["referral"] },

    // --- HOA ---
    { name: "Patricia Lund", title: "HOA President", company: "Meadowview HOA", location: "Riverside, CA", tags: ["sphere"], note: "Meadowview president — call her for HOA docs before listing in that tract." },
    { name: "Samuel Adeyemi", title: "HOA Board Member", company: "Meadowview HOA", location: "Riverside, CA", tags: ["sphere"] },

    // --- Appraisal / landscaping / photo / insurance ---
    { name: "Victor Nawrocki", title: "Appraiser", company: "Riverside Appraisal Group", location: "Riverside, CA", tags: ["referral"] },
    { name: "Rosa Iglesias", title: "Landscaper", company: "GreenLeaf Landscaping", location: "Corona, CA", tags: ["referral"] },
    { name: "Trevor Kim", title: "Real Estate Photographer", company: "Lens & Light Photography", location: "Riverside, CA", tags: ["referral", "sphere"], note: "Shoots all my listings — drone + twilight package is worth it on luxury." },
    { name: "Naomi Sterling", title: "Insurance Agent", company: "Bluebird Insurance Group", location: "Riverside, CA", tags: ["referral"], note: "Writes homeowner policies for my buyers before close of escrow." },

    // --- Buyer clients ---
    { name: "Jamal Ferris", title: "Buyer client", location: "Riverside, CA", tags: ["buyer"], note: "Wants a bigger yard within 2 years; second baby due in spring." },
    { name: "Emily Zhao", title: "Buyer client", location: "Corona, CA", tags: ["buyer"], note: "First-time buyer, pre-approved with Brian at Cascade up to $520k." },
    { name: "Ravi Deshmukh", title: "Buyer client", location: "Riverside, CA", tags: ["buyer"] },
    { name: "Carmen Ortega", title: "Buyer client", location: "Moreno Valley, CA", tags: ["buyer"], note: "Relocating for work in August — needs to close before the school year." },
    { name: "Tobias Lindqvist", title: "Buyer client", location: "Corona, CA", tags: ["buyer"] },
    { name: "Elliot Prasad", title: "Buyer client", location: "Riverside, CA", tags: ["buyer"] },

    // --- Listing / seller clients ---
    { name: "Gloria Bennett", title: "Listing client", location: "Riverside, CA", tags: ["seller"], note: "Selling the Larkspur house to downsize — emotional about it, handle gently." },
    { name: "Frank Moretti", title: "Listing client", location: "Riverside, CA", tags: ["seller"], note: "Maplewood Dr listing — wants to net enough to buy in Arizona." },
    { name: "Aditi Rao", title: "Listing client", location: "Corona, CA", tags: ["seller"], note: "Cypress Court listing; prefers weekend showings only." },
    { name: "Kwame Boateng", title: "Listing client", location: "Fontana, CA", tags: ["seller"] },
    { name: "Susan Delgado", title: "Listing client", location: "Moreno Valley, CA", tags: ["seller"] },

    // --- Past clients ---
    { name: "Nadia Harrington", title: "Past client", location: "Riverside, CA", tags: ["past-client", "sphere"], note: "Closing anniversary in October — send a note." },
    { name: "Chris Vandermeer", title: "Past client", location: "Corona, CA", tags: ["past-client", "sphere"], note: "Bought in 2023; asked me to keep an eye on rental cap rates." },
    { name: "Leila Haddad", title: "Past client", location: "Riverside, CA", tags: ["past-client", "sphere"] },
    { name: "Marcus Bell", title: "Past client", location: "Ontario, CA", tags: ["past-client"] },
    { name: "Ingrid Solberg", title: "Past client", location: "Riverside, CA", tags: ["past-client", "sphere"] },
    { name: "Monica Fairbanks", title: "Past client", location: "Fontana, CA", tags: ["past-client"], note: "Referred her sister last year — great source of referrals." },

    // --- Leads / sphere ---
    { name: "Peter Nakamura", title: "Lead", location: "Riverside, CA", tags: ["lead"], note: "Met at the expo — thinking about selling next spring, not ready yet." },
    { name: "Denise Achterberg", title: "Lead", location: "Corona, CA", tags: ["lead"] },
    { name: "Oscar Rivera", title: "Lead", location: "Moreno Valley, CA", tags: ["lead"] },
    { name: "Bethany Cole", title: "Lead", location: "Riverside, CA", tags: ["lead"] },
    { name: "Hassan Qureshi", title: "Sphere contact", location: "Riverside, CA", tags: ["sphere"] },
    { name: "Vera Popescu", title: "Sphere contact", location: "Corona, CA", tags: ["sphere"] },
    { name: "Gabriel Torres", title: "Referral partner", location: "Ontario, CA", tags: ["referral", "sphere"], note: "Out-of-area agent — swaps referrals with me for the coast." },
    { name: "Bella Ricci", title: "Lead", location: "Fontana, CA", tags: ["lead"] },
    { name: "Dominic Sauer", title: "Sphere contact", location: "Riverside, CA", tags: ["sphere"] },
  ],

  events: [
    {
      name: "Open House — 42 Larkspur Lane",
      emoji: "🏡",
      tags: ["open-house", "seller"],
      attendees: [
        "Gloria Bennett",
        "Bianca Fontaine",
        "Trevor Kim",
        "Damon Whitfield",
        "Emily Zhao",
        "Ravi Deshmukh",
        "Jamal Ferris",
        "Peter Nakamura",
      ],
    },
    {
      name: "Closing — 118 Maplewood Dr",
      emoji: "🔑",
      tags: ["closing", "seller"],
      attendees: [
        "Frank Moretti",
        "Carmen Ortega",
        "Helen Cho",
        "Raymond Duval",
        "Brian Halloran",
        "Miguel Santos",
      ],
    },
    {
      name: "Riverside Neighborhood Home Expo",
      emoji: "🏘️",
      tags: ["expo", "lead", "networking"],
      attendees: [
        "Priya Nadkarni",
        "Yuki Tanaka",
        "Nina Volkov",
        "Aisha Karim",
        "Gus Petrakis",
        "Patricia Lund",
        "Peter Nakamura",
        "Denise Achterberg",
        "Oscar Rivera",
        "Bethany Cole",
        "Bella Ricci",
      ],
    },
    {
      name: "Broker Mixer",
      emoji: "🍸",
      tags: ["networking", "sphere"],
      attendees: [
        "Renata Cruz",
        "Malik Johnson",
        "Fiona Albright",
        "Priya Nadkarni",
        "Damon Whitfield",
        "Sofia Reyes",
        "Carlos Mendez",
        "Naomi Sterling",
        "Gabriel Torres",
      ],
    },
    {
      name: "Open House — 7 Cypress Court",
      emoji: "🏡",
      tags: ["open-house", "seller"],
      attendees: [
        "Aditi Rao",
        "Delphine Marchetti",
        "Trevor Kim",
        "Yuki Tanaka",
        "Tobias Lindqvist",
        "Elliot Prasad",
        "Carmen Ortega",
      ],
    },
  ],
});
