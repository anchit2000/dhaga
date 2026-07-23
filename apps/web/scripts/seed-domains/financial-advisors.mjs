import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich wealth-advisory demo: a hero client (Eleanor Thornton) fleshed out for
// the contact-profile money shot — a founder a year out from selling her
// company — plus breadth so the dashboard's "threads to pull today" +
// follow-ups tiles are full. Notes/facts are relationship + planning context
// only, never compliance or recordkeeping.
await seedDomainAccount({
  slug: "financial-advisors",
  displayName: "David Okonkwo — Wealth Advisor (demo)",

  relationshipTypes: [
    { slug: "referred_by", forward: "referred by", inverse: "referred" },
    { slug: "cpa_for", forward: "CPA for", inverse: "works with CPA" },
  ],

  companies: [
    { name: "Okonkwo Wealth Advisors", sector: "Wealth Management" },
    { name: "Meridian Wealth Partners", sector: "Wealth Management" },
    { name: "Cedar & Vance Advisory", sector: "Wealth Management" },
    { name: "Blackwood Tax & Accounting", sector: "Accounting" },
    { name: "Nakamura CPA Group", sector: "Accounting" },
    { name: "Ellison Estate Law", sector: "Legal" },
    { name: "Ravensworth Estate & Trust Law", sector: "Legal" },
    { name: "Summit Custody Trust", sector: "Custody & Clearing" },
    { name: "Guardian Shore Insurance", sector: "Insurance" },
    { name: "First Cascade Bank", sector: "Banking" },
    { name: "Pinnacle M&A Advisors", sector: "Investment Banking" },
    { name: "Thornton Manufacturing", sector: "Manufacturing" },
    { name: "Delgado Auto Group", sector: "Automotive" },
    { name: "Brightpath Community Foundation", sector: "Nonprofit" },
  ],

  contacts: [
    // ---- HERO ----
    {
      name: "Eleanor Thornton",
      hero: true,
      title: "Founder & CEO",
      company: "Thornton Manufacturing",
      location: "Longmont",
      tags: ["client", "business-owner", "liquidity-event", "priority"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 47,
      notes: [
        "Annual review — portfolio is on track, but the whole conversation is now the sale. She's tired of the day-to-day and ready to hand the business to a buyer, not her daughter. Wants the estate and tax picture buttoned up before any letter of intent goes out.",
        "Sale update: Rafael at Pinnacle has two interested strategic buyers; a deal could close within 12 months, likely mid-eight-figures pre-tax. She's anxious about the tax hit and whether she'll 'have enough forever' once the paycheck stops.",
        "Family catch-up over coffee — two grandkids now (Mia 6, Leo 3). She's quietly funding their 529s and wants that to continue post-sale. Mentioned she'd love to retire at 62 and spend winters near the grandkids.",
      ],
      facts: [
        { type: "intent", text: "Selling Thornton Manufacturing next year — big liquidity event; wants estate + tax planning done before the letter of intent." },
        { type: "personal", text: "Two grandkids (Mia, Leo); funding their 529s. Wants to retire at 62 and winter near family." },
        { type: "preference", text: "Risk-averse post-sale; interested in some ESG exposure, dislikes lockups and illiquidity." },
        { type: "role", text: "Founder/owner of Thornton Manufacturing; her CFO Marcus Adeleke runs finance day-to-day." },
      ],
      followUps: [
        { action: "Send Eleanor the pre-sale tax-planning checklist", dueHint: "this week" },
        { action: "Introduce Eleanor to Margaret Ellison (estate attorney) before year-end", dueHint: "before year-end" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    { name: "Walter Thornton", title: "Retired Engineer", location: "Longmont", tags: ["client", "spouse"], note: "Eleanor's husband; the calm one in the room. Cares most about a predictable retirement paycheck and not touching the grandkids' 529s." },
    { name: "Marcus Adeleke", title: "CFO", company: "Thornton Manufacturing", location: "Longmont", tags: ["client", "business-owner"], cadenceDays: 45, lastReachedOutDaysAgo: 52, note: "Eleanor's business partner and CFO; will get an earnout at the sale. Wants his own plan for the windfall — nurture as a client in his own right." },
    { name: "Denise Blackwood", title: "CPA (referral partner)", company: "Blackwood Tax & Accounting", location: "Denver", tags: ["COI", "referral"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Eleanor's CPA and my top referral source — sends business owners pre-sale. Coordinate the Thornton tax picture and reciprocate with estate-attorney intros.", followUps: [{ action: "Reciprocate Denise's referrals with two estate-attorney intros", dueHint: "this month" }] },
    { name: "Margaret Ellison", title: "Estate Attorney", company: "Ellison Estate Law", location: "Denver", tags: ["COI", "referral"], cadenceDays: 60, lastReachedOutDaysAgo: 75, note: "Drafts most of my clients' trusts. Line her up for Eleanor before the sale closes." },

    // ---- centers of influence: CPAs ----
    { name: "Arjun Mehta", title: "CPA (referral partner)", company: "Blackwood Tax & Accounting", location: "Denver", tags: ["COI", "referral"] },
    { name: "Kenji Nakamura", title: "CPA (referral partner)", company: "Nakamura CPA Group", location: "Boulder", tags: ["COI", "referral"], cadenceDays: 45, lastReachedOutDaysAgo: 60, note: "Specializes in real-estate investors; coordinate on the Delgado 1031 exchange." },
    { name: "Sofia Reyes", title: "CPA (referral partner)", company: "Nakamura CPA Group", location: "Boulder", tags: ["COI", "referral"] },

    // ---- centers of influence: estate attorneys ----
    { name: "Trevor Nwosu", title: "Estate Attorney", company: "Ellison Estate Law", location: "Denver", tags: ["COI", "referral"] },
    { name: "Yelena Petrova", title: "Estate Attorney", company: "Ravensworth Estate & Trust Law", location: "Fort Collins", tags: ["COI", "referral"] },
    { name: "Sam Okafor", title: "Estate Attorney", company: "Ravensworth Estate & Trust Law", location: "Fort Collins", tags: ["COI"] },

    // ---- other centers of influence ----
    { name: "Grace Lin", title: "Commercial Banker (referral partner)", company: "First Cascade Bank", location: "Denver", tags: ["COI", "referral"], cadenceDays: 60, lastReachedOutDaysAgo: 70, note: "Handles lending for business-owner clients; warm channel for succession deals." },
    { name: "Rafael Ortega", title: "M&A Advisor", company: "Pinnacle M&A Advisors", location: "Denver", tags: ["COI", "referral"], cadenceDays: 30, lastReachedOutDaysAgo: 33, note: "Running the sale process for both Thornton and Delgado; keep aligned on liquidity timing." },
    { name: "Dana Kowalski", title: "Insurance Agent (referral partner)", company: "Guardian Shore Insurance", location: "Denver", tags: ["COI", "referral"] },
    { name: "Luis Delacruz", title: "Real Estate Broker (referral partner)", company: "Harborline Realty Group", location: "Denver", tags: ["COI", "referral"] },

    // ---- custodian ----
    { name: "Hannah Berg", title: "Custodian Relationship Manager", company: "Summit Custody Trust", location: "Salt Lake City", tags: ["custodian", "vendor"] },
    { name: "Omar Haddad", title: "Operations Contact", company: "Summit Custody Trust", location: "Salt Lake City", tags: ["custodian", "vendor"] },

    // ---- peer advisors / co-advisory ----
    { name: "Nathan Cole", title: "Wealth Advisor", company: "Meridian Wealth Partners", location: "Denver", tags: ["COI", "referral"] },
    { name: "Gregory Vance", title: "Managing Partner", company: "Cedar & Vance Advisory", location: "Aspen", tags: ["COI", "referral"] },
    { name: "Diana Rosewater", title: "Principal", company: "Rosewater Family Office", location: "Denver", tags: ["COI", "prospect"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Family office; potential co-advisory on a multi-generational client. Exploratory — keep it warm." },

    // ---- clients: business owners ----
    { name: "Ricardo Delgado", title: "Client", company: "Delgado Auto Group", location: "Denver", tags: ["client", "business-owner"], cadenceDays: 30, lastReachedOutDaysAgo: 52, note: "Selling the dealership — liquidity event; introduce the estate attorney and coordinate a 1031 on the dealership real estate.", followUps: [{ action: "Set up the Delgado / estate-attorney intro call", dueHint: "next week" }] },
    { name: "Carmen Delgado", title: "Client", location: "Denver", tags: ["client"], note: "Wants sale proceeds structured for the grandchildren; revisit the gifting strategy." },

    // ---- clients: retirees ----
    { name: "Harold Whitfield", title: "Client", location: "Denver", tags: ["client", "retiree"], cadenceDays: 90, lastReachedOutDaysAgo: 110, note: "Granddaughter starting college 2027 — 529 review. Wants to give while living.", followUps: [{ action: "Prep Harold's 529 + gifting review deck", dueHint: "this month" }] },
    { name: "Nadia Whitfield", title: "Client", location: "Denver", tags: ["client", "retiree"] },
    { name: "George Adeyemi", title: "Client", location: "Colorado Springs", tags: ["client", "retiree"], cadenceDays: 90, lastReachedOutDaysAgo: 100, note: "Worried about outliving assets; the plan looks healthy — reassure at the annual review." },
    { name: "Fatima Adeyemi", title: "Client", location: "Colorado Springs", tags: ["client", "retiree"] },
    { name: "Beatrice Kang", title: "Client", location: "Boulder", tags: ["client", "retiree"] },
    { name: "Theodore Kang", title: "Client", location: "Boulder", tags: ["client", "retiree"] },
    { name: "Sandra Muller", title: "Client", location: "Denver", tags: ["client", "retiree"] },
    { name: "Rosa Mendez", title: "Client", location: "Pueblo", tags: ["client", "retiree"], cadenceDays: 60, lastReachedOutDaysAgo: 80, note: "Widow; consolidated her late husband's accounts. Sensitive — lead reviews with cash-flow certainty." },

    // ---- clients: professionals / pre-retiree ----
    { name: "Vivian Osei", title: "Client", location: "Denver", tags: ["client"], cadenceDays: 45, lastReachedOutDaysAgo: 55, note: "Equity comp vesting through 2026; wants to talk diversifying the concentrated position." },
    { name: "Priyanka Shah", title: "Client", location: "Boulder", tags: ["client"], note: "Physician; revisit umbrella coverage and the college-savings mix." },
    { name: "Miriam Katz", title: "Client", location: "Denver", tags: ["client"], note: "Recently divorced; rebuild the plan around a single income.", followUps: [{ action: "Help Miriam update beneficiaries after the divorce", dueHint: "this week" }] },
    { name: "Simon Wexler", title: "Client", location: "Golden", tags: ["client"], note: "Sits on the Brightpath foundation board; interested in a donor-advised fund." },
    { name: "Grace Abara", title: "Client", location: "Golden", tags: ["client"] },
    { name: "Charles Ofori", title: "Client", location: "Aurora", tags: ["client"] },
    { name: "Naomi Fischer", title: "Client", location: "Denver", tags: ["client"] },

    // ---- prospects ----
    { name: "Wesley Grant", title: "Prospect", location: "Denver", tags: ["prospect", "referral"], cadenceDays: 14, lastReachedOutDaysAgo: 20, note: "Referred by Denise Blackwood; recently sold a franchise and is sitting on cash.", followUps: [{ action: "Follow up with Wesley on the cash-management plan", dueHint: "this week" }] },
    { name: "Sophie Laurent", title: "Prospect", location: "Aspen", tags: ["prospect"], note: "Met at the Cedar & Vance seminar; inherited a family trust, shopping for a fiduciary." },
    { name: "Bradley Simmons", title: "Prospect", company: "Delgado Auto Group", location: "Denver", tags: ["prospect"], note: "GM at the dealership; will get an earnout from the sale. Nurture." },
    { name: "Olivia Bennett", title: "Prospect", location: "Boulder", tags: ["prospect"] },
    { name: "Kwame Boateng", title: "Prospect", location: "Denver", tags: ["prospect"] },
    { name: "Hiroshi Tanaka", title: "Prospect", location: "Boulder", tags: ["prospect"] },
  ],

  events: [
    {
      name: "Client Appreciation Dinner 2026",
      emoji: "🍷",
      tags: ["client-event", "appreciation"],
      attendees: [
        "Eleanor Thornton", "Walter Thornton", "Harold Whitfield", "Nadia Whitfield",
        "George Adeyemi", "Fatima Adeyemi", "Beatrice Kang", "Theodore Kang",
        "Sandra Muller", "Ricardo Delgado", "Carmen Delgado", "Vivian Osei",
        "Rosa Mendez", "Priyanka Shah",
      ],
    },
    {
      name: "Retirement Income Seminar",
      emoji: "🎓",
      tags: ["seminar", "prospecting"],
      attendees: [
        "Harold Whitfield", "George Adeyemi", "Beatrice Kang", "Sandra Muller",
        "Rosa Mendez", "Olivia Bennett", "Kwame Boateng", "Hiroshi Tanaka",
      ],
    },
    {
      name: "CPA Networking Lunch",
      emoji: "🍴",
      tags: ["COI", "networking"],
      attendees: [
        "Denise Blackwood", "Arjun Mehta", "Kenji Nakamura", "Sofia Reyes",
        "Grace Lin", "Rafael Ortega", "Nathan Cole", "Gregory Vance",
      ],
    },
    {
      name: "Estate Planning Workshop",
      emoji: "📜",
      tags: ["seminar", "estate"],
      attendees: [
        "Eleanor Thornton", "Margaret Ellison", "Trevor Nwosu", "Yelena Petrova",
        "Sam Okafor", "Harold Whitfield", "Ricardo Delgado", "Carmen Delgado",
        "Miriam Katz", "Diana Rosewater", "Simon Wexler",
      ],
    },
    {
      name: "Business Owner Roundtable",
      emoji: "💼",
      tags: ["seminar", "business-owner"],
      attendees: [
        "Eleanor Thornton", "Marcus Adeleke", "Ricardo Delgado", "Rafael Ortega",
        "Grace Lin", "Denise Blackwood", "Bradley Simmons", "Wesley Grant",
        "Luis Delacruz",
      ],
    },
  ],

  relationships: [
    { from: "Eleanor Thornton", predicate: "spouse_of", to: "Walter Thornton" },
    { from: "Eleanor Thornton", predicate: "colleague_of", to: "Marcus Adeleke" },
    { from: "Denise Blackwood", predicate: "cpa_for", to: "Eleanor Thornton" },
    { from: "Eleanor Thornton", predicate: "introduced_to", to: "Margaret Ellison" },
    { from: "Wesley Grant", predicate: "referred_by", to: "Denise Blackwood" },
    { from: "Denise Blackwood", predicate: "colleague_of", to: "Arjun Mehta" },
    { from: "Margaret Ellison", predicate: "colleague_of", to: "Trevor Nwosu" },
    { from: "Ricardo Delgado", predicate: "introduced_to", to: "Rafael Ortega" },
    { from: "Harold Whitfield", predicate: "spouse_of", to: "Nadia Whitfield" },
  ],
});
