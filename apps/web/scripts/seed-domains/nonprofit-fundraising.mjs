import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// A major-gifts / development director's personal relationship layer: the
// donors, households, board members, foundation program officers and corporate
// sponsors Grace stewards. A hero major-gift prospect (Margaret Ellsworth) is
// fleshed out for the contact-profile money shot, plus breadth so the home
// dashboard's "threads to pull today" + follow-ups tiles are full. This is NOT
// a donor system of record — it's the human graph (who knows whom, who opens
// which door) that lives alongside the CRM.
await seedDomainAccount({
  slug: "nonprofit-fundraising",
  displayName: "Grace Whitfield — Development Director (demo)",

  companies: [
    // Family foundations / grantmakers
    { name: "The Ellsworth Family Foundation", sector: "Philanthropy" },
    { name: "The Alderman Family Foundation", sector: "Philanthropy" },
    { name: "Cortland Community Foundation", sector: "Philanthropy" },
    { name: "Nakamura Family Foundation", sector: "Philanthropy" },
    // Corporate sponsors
    { name: "Vertex Financial Group", sector: "Financial Services" },
    { name: "Solstice Energy", sector: "Energy" },
    { name: "Brightline Health", sector: "Healthcare" },
    { name: "Harborview Bank", sector: "Banking" },
    // Donor employers / board affiliations
    { name: "Kellerman & Associates", sector: "Legal" },
    { name: "Riverstone Capital", sector: "Investment" },
    { name: "Ashford University", sector: "Education" },
    { name: "Coastline Medical Center", sector: "Healthcare" },
    { name: "Greenfield Architects", sector: "Architecture" },
    { name: "Maribel's Restaurant Group", sector: "Hospitality" },
  ],

  contacts: [
    // ---- HERO — major-gift prospect ----
    {
      name: "Margaret Ellsworth",
      hero: true,
      title: "Retired CEO",
      company: "The Ellsworth Family Foundation",
      location: "Lake Forest, IL",
      tags: ["major-gift", "prospect", "cultivation", "board-interest"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 51,
      notes: [
        "Cultivation lunch at the Arboretum Club. Warm, curious, asked hard questions about outcomes — not vanity metrics. Said she's 'done writing checks into the void' and wants to fund something she can watch work. Left the door wide open for a fall ask.",
        "Her passion is youth literacy — she taught first grade for six years before her business career and still tears up talking about kids who 'unlock' reading. This is the emotional core; lead every touch with the literacy program, not the org.",
        "Capacity signals are strong: she sold her packaging company last year (nine figures, local press covered it) and now funds the Ellsworth Family Foundation with her two children as co-trustees. Board-interest hint dropped twice — she may want a seat, not just a gift.",
      ],
      facts: [
        { type: "intent", text: "Capacity + interest for a six-figure gift toward the youth-literacy program; likely ready in the fall." },
        { type: "role", text: "Retired CEO; trustee of the Ellsworth Family Foundation." },
        { type: "personal", text: "Three grandchildren; volunteers as a reading tutor." },
        { type: "preference", text: "Prefers a program site visit to a gala; wants to see impact." },
      ],
      followUps: [
        { action: "Invite Margaret to the program site visit", dueHint: "this month" },
        { action: "Send her the youth-literacy impact report", dueHint: "this week" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    { name: "Harold Ellsworth", title: "Retired Physician", company: "The Ellsworth Family Foundation", location: "Lake Forest, IL", tags: ["spouse", "donor"], note: "Margaret's husband and co-signer on the foundation. Quieter, detail-oriented; wants to see the program's budget and staff ratios before they commit. Steward the household jointly." },
    { name: "Eleanor Vance", title: "Board Chair", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["board", "stewardship", "connector"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Board chair and Margaret's longtime friend — she opened the Ellsworth door. Wants a quarterly one-on-one; keep her looped on the cultivation.", followUps: [{ action: "Brief Eleanor before the Ellsworth site visit", dueHint: "this month" }] },
    { name: "Sofia Marchetti", title: "Foundation Program Officer", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["foundation", "stewardship"], note: "Reviews youth-literacy grants and would host Margaret's site visit; submit the LOI ahead of their spring cycle." },

    // ---- Board members (cadence + stewardship drives the home dashboard) ----
    { name: "Marcus Delgado", title: "Board member", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["board"], cadenceDays: 45, lastReachedOutDaysAgo: 58, note: "Brought Vincent Callahan to the gala as his guest — a live prospect. Nudge him to make the second introduction." },
    { name: "Yuki Nakamura", title: "Board member", company: "Nakamura Family Foundation", location: "Chicago, IL", tags: ["board", "foundation"], note: "Bridges the Nakamura family foundation; secured last year's matching gift. Mentors Aisha on the program team." },
    { name: "Douglas Fairbanks", title: "Board member", company: "Harborview Bank", location: "Chicago, IL", tags: ["board", "stewardship"], cadenceDays: 45, lastReachedOutDaysAgo: 62, followUps: [{ action: "Confirm Douglas for the board reception", dueHint: "this week" }] },
    { name: "Priya Raghunathan", title: "Board member", company: "Ashford University", location: "Evanston, IL", tags: ["board", "stewardship"] },
    { name: "Theodore Brandt", title: "Board member", company: "Riverstone Capital", location: "Chicago, IL", tags: ["board"], cadenceDays: 60, lastReachedOutDaysAgo: 70 },
    { name: "Renata Silva", title: "Board member", company: "Greenfield Architects", location: "Chicago, IL", tags: ["board"] },

    // ---- Foundation program officers ----
    { name: "Harold Alderman", title: "Foundation Program Officer", company: "The Alderman Family Foundation", location: "Chicago, IL", tags: ["foundation", "major-gift"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Family principal and program officer; capacity for a six-figure grant; align our LOI to the fall board meeting.", followUps: [{ action: "Submit the Alderman LOI before the fall board meeting", dueHint: "September" }] },
    { name: "Aisha Bello", title: "Foundation Program Officer", company: "Nakamura Family Foundation", location: "Chicago, IL", tags: ["foundation", "stewardship"] },
    { name: "Wendell Cho", title: "Foundation Program Officer", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["foundation"] },

    // ---- Corporate sponsor leads ----
    { name: "Bianca Ferreira", title: "Corporate Sponsor Lead", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["corporate", "stewardship"], cadenceDays: 30, lastReachedOutDaysAgo: 47, note: "Owns Vertex's CSR budget; renews the annual gala sponsorship if we send an impact deck by Q3.", followUps: [{ action: "Send Bianca the Q3 impact deck for sponsorship renewal", dueHint: "this month" }] },
    { name: "Owen Whitaker", title: "Corporate Sponsor Lead", company: "Solstice Energy", location: "Chicago, IL", tags: ["corporate"] },
    { name: "Nadia Haddad", title: "Corporate Sponsor Lead", company: "Brightline Health", location: "Oak Park, IL", tags: ["corporate"] },
    { name: "Fiona Byrne", title: "Corporate Sponsor Lead", company: "Harborview Bank", location: "Chicago, IL", tags: ["corporate"] },

    // ---- Major donors & households ----
    { name: "Beatrice Alderman", title: "Major donor", company: "The Alderman Family Foundation", location: "Lake Forest, IL", tags: ["major-gift", "donor", "stewardship"], cadenceDays: 45, lastReachedOutDaysAgo: 60, note: "Passionate about youth literacy; capacity for a five-figure gift; ask in fall. Steward the household jointly with Charles." },
    { name: "Charles Alderman", title: "Major donor", company: "The Alderman Family Foundation", location: "Lake Forest, IL", tags: ["major-gift", "donor"], note: "Beatrice's husband; prefers a private site visit over gala events." },
    { name: "Hiroshi Nakamura", title: "Major donor", company: "Nakamura Family Foundation", location: "Winnetka, IL", tags: ["major-gift", "donor"] },
    { name: "Dolores Reyes", title: "Major donor", company: "Coastline Medical Center", location: "Evanston, IL", tags: ["major-gift", "donor", "stewardship"], cadenceDays: 60, lastReachedOutDaysAgo: 78, note: "Retired physician; funds the clinic-literacy pilot; send a handwritten thank-you, not an email.", followUps: [{ action: "Mail Dolores a handwritten thank-you for the pilot renewal", dueHint: "this week" }] },
    { name: "Constance Meriwether", title: "Major donor", company: "Maribel's Restaurant Group", location: "Chicago, IL", tags: ["major-gift", "donor", "stewardship"], note: "Hosts the cultivation dinner at her restaurant and comps the venue annually." },
    { name: "Rafael Ortiz", title: "Major donor", company: "Maribel's Restaurant Group", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Samuel Greenfield", title: "Major donor", company: "Greenfield Architects", location: "Oak Park, IL", tags: ["major-gift", "donor"], note: "Firm principal; underwrote the library build-out; open to a naming gift if we scope it.", followUps: [{ action: "Draft a naming-gift proposal for the Greenfield reading room", dueHint: "next month" }] },
    { name: "Patrick O'Sullivan", title: "Major donor", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Isabelle Fontaine", title: "Major donor", company: "Riverstone Capital", location: "Chicago, IL", tags: ["major-gift", "donor", "stewardship"], cadenceDays: 45, lastReachedOutDaysAgo: 55 },
    { name: "Naomi Adler", title: "Major donor", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Terrence Bloom", title: "Major donor", company: "Harborview Bank", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Gordon Ashby", title: "Major donor", company: "Riverstone Capital", location: "Chicago, IL", tags: ["major-gift", "donor"], cadenceDays: 60, lastReachedOutDaysAgo: 72 },

    // ---- Prospects ----
    { name: "Vincent Callahan", title: "Prospect", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["prospect", "donor", "cultivation"], cadenceDays: 30, lastReachedOutDaysAgo: 39, note: "Attended the gala as Marcus's guest; capacity looks strong; move to cultivation." },
    { name: "Celeste Moreau", title: "Prospect", company: "Ashford University", location: "Evanston, IL", tags: ["prospect"], note: "Alumna interested in a scholarship fund; still discovery stage, no ask yet." },
    { name: "Josephine Hartwell", title: "Prospect", company: "Harborview Bank", location: "Chicago, IL", tags: ["prospect", "stewardship"], note: "Longtime volunteer moving into giving; small first gift, high loyalty — invest early.", followUps: [{ action: "Add Josephine to the monthly volunteer-donor note", dueHint: "this month" }] },
    { name: "Nathaniel Brooks", title: "Prospect", company: "Solstice Energy", location: "Chicago, IL", tags: ["prospect"], cadenceDays: 45, lastReachedOutDaysAgo: 52 },
    { name: "Amara Diallo", title: "Prospect", company: "Brightline Health", location: "Oak Park, IL", tags: ["prospect"] },
    { name: "Sunita Kapoor", title: "Prospect", company: "Coastline Medical Center", location: "Chicago, IL", tags: ["prospect", "donor"] },
    { name: "Oliver Benton", title: "Prospect", company: "Solstice Energy", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Delphine Auclair", title: "Prospect", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["prospect", "foundation"] },
  ],

  events: [
    {
      name: "Youth-Literacy Program Site Visit",
      emoji: "🏫",
      tags: ["cultivation", "stewardship"],
      attendees: [
        "Margaret Ellsworth", "Harold Ellsworth", "Eleanor Vance", "Sofia Marchetti",
        "Dolores Reyes", "Samuel Greenfield",
      ],
    },
    {
      name: "Spring Gala 2026",
      emoji: "🥂",
      tags: ["gala", "stewardship"],
      attendees: [
        "Margaret Ellsworth", "Eleanor Vance", "Marcus Delgado", "Beatrice Alderman",
        "Charles Alderman", "Harold Alderman", "Hiroshi Nakamura", "Yuki Nakamura",
        "Bianca Ferreira", "Constance Meriwether", "Naomi Adler", "Terrence Bloom",
        "Isabelle Fontaine", "Vincent Callahan", "Dolores Reyes",
      ],
    },
    {
      name: "Cultivation Dinner at Maribel's",
      emoji: "🍷",
      tags: ["cultivation", "stewardship"],
      attendees: [
        "Margaret Ellsworth", "Constance Meriwether", "Rafael Ortiz", "Beatrice Alderman",
        "Charles Alderman", "Bianca Ferreira", "Vincent Callahan", "Eleanor Vance",
        "Gordon Ashby", "Isabelle Fontaine",
      ],
    },
    {
      name: "Board Reception",
      emoji: "🏛️",
      tags: ["board", "stewardship"],
      attendees: [
        "Eleanor Vance", "Marcus Delgado", "Yuki Nakamura", "Douglas Fairbanks",
        "Priya Raghunathan", "Theodore Brandt", "Renata Silva", "Margaret Ellsworth",
      ],
    },
    {
      name: "Youth Literacy Luncheon",
      emoji: "📚",
      tags: ["stewardship", "foundation"],
      attendees: [
        "Sofia Marchetti", "Wendell Cho", "Aisha Bello", "Dolores Reyes",
        "Celeste Moreau", "Priya Raghunathan", "Delphine Auclair",
      ],
    },
  ],

  relationships: [
    { from: "Margaret Ellsworth", predicate: "spouse_of", to: "Harold Ellsworth" },
    { from: "Margaret Ellsworth", predicate: "introduced_by", to: "Eleanor Vance" },
    { from: "Margaret Ellsworth", predicate: "introduced_to", to: "Sofia Marchetti" },
    { from: "Beatrice Alderman", predicate: "spouse_of", to: "Charles Alderman" },
    { from: "Harold Alderman", predicate: "parent_of", to: "Beatrice Alderman" },
    { from: "Vincent Callahan", predicate: "introduced_by", to: "Marcus Delgado" },
    { from: "Marcus Delgado", predicate: "colleague_of", to: "Naomi Adler" },
    { from: "Yuki Nakamura", predicate: "mentor_of", to: "Aisha Bello" },
  ],
});
