import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

await seedDomainAccount({
  slug: "financial-advisors",
  displayName: "David Okonkwo — Wealth Advisor (demo)",
  companies: [
    { name: "Okonkwo Wealth Advisors", sector: "Wealth Management" },
    { name: "Meridian Wealth Partners", sector: "Wealth Management" },
    { name: "Cedar & Vance Advisory", sector: "Wealth Management" },
    { name: "Rosewater Family Office", sector: "Wealth Management" },
    { name: "Blackwood Tax & Accounting", sector: "Accounting" },
    { name: "Nakamura CPA Group", sector: "Accounting" },
    { name: "Ellison Estate Law", sector: "Legal" },
    { name: "Ravensworth Estate & Trust Law", sector: "Legal" },
    { name: "Summit Custody Trust", sector: "Custody & Clearing" },
    { name: "Guardian Shore Insurance", sector: "Insurance" },
    { name: "Harborline Realty Group", sector: "Real Estate" },
    { name: "First Cascade Bank", sector: "Banking" },
    { name: "Pinnacle M&A Advisors", sector: "Investment Banking" },
    { name: "Delgado Auto Group", sector: "Automotive" },
    { name: "Thornton Manufacturing", sector: "Manufacturing" },
    { name: "Brightpath Community Foundation", sector: "Nonprofit" },
  ],
  contacts: [
    // --- Internal team ---
    { name: "Priya Raman", title: "Associate Advisor", company: "Okonkwo Wealth Advisors", location: "Denver", tags: ["team"] },
    { name: "Marcus Feldman", title: "Client Service Associate", company: "Okonkwo Wealth Advisors", location: "Denver", tags: ["team"] },

    // --- Centers of influence: CPAs ---
    { name: "Denise Blackwood", title: "CPA (referral partner)", company: "Blackwood Tax & Accounting", location: "Denver", tags: ["COI", "referral"], note: "Top referral source — sends business-owner clients pre-sale. Reciprocate with estate-attorney intros." },
    { name: "Arjun Mehta", title: "CPA (referral partner)", company: "Blackwood Tax & Accounting", location: "Denver", tags: ["COI", "referral"] },
    { name: "Kenji Nakamura", title: "CPA (referral partner)", company: "Nakamura CPA Group", location: "Boulder", tags: ["COI", "referral"], note: "Specializes in real-estate investors; coordinate on the Delgado 1031 exchange." },
    { name: "Sofia Reyes", title: "CPA (referral partner)", company: "Nakamura CPA Group", location: "Boulder", tags: ["COI", "referral"] },

    // --- Centers of influence: estate attorneys ---
    { name: "Margaret Ellison", title: "Estate Attorney", company: "Ellison Estate Law", location: "Denver", tags: ["COI", "referral"], note: "Drafts most of my clients' trusts. Introduce to the Delgados before the sale closes." },
    { name: "Trevor Nwosu", title: "Estate Attorney", company: "Ellison Estate Law", location: "Denver", tags: ["COI", "referral"] },
    { name: "Yelena Petrova", title: "Estate Attorney", company: "Ravensworth Estate & Trust Law", location: "Fort Collins", tags: ["COI", "referral"] },
    { name: "Sam Okafor", title: "Estate Attorney", company: "Ravensworth Estate & Trust Law", location: "Fort Collins", tags: ["COI"] },

    // --- Other centers of influence ---
    { name: "Dana Kowalski", title: "Insurance Agent (referral partner)", company: "Guardian Shore Insurance", location: "Denver", tags: ["COI", "referral"] },
    { name: "Luis Delacruz", title: "Real Estate Broker (referral partner)", company: "Harborline Realty Group", location: "Denver", tags: ["COI", "referral"] },
    { name: "Grace Lin", title: "Commercial Banker (referral partner)", company: "First Cascade Bank", location: "Denver", tags: ["COI", "referral"], note: "Handles lending for business-owner clients; warm channel for succession deals." },
    { name: "Rafael Ortega", title: "M&A Advisor", company: "Pinnacle M&A Advisors", location: "Denver", tags: ["COI", "referral"], note: "Running the sale process for Delgado Auto Group; keep aligned on liquidity timing." },

    // --- Custodian ---
    { name: "Hannah Berg", title: "Custodian Relationship Manager", company: "Summit Custody Trust", location: "Salt Lake City", tags: ["custodian", "vendor"] },
    { name: "Omar Haddad", title: "Operations Contact", company: "Summit Custody Trust", location: "Salt Lake City", tags: ["custodian", "vendor"] },

    // --- Peer advisors / co-advisory ---
    { name: "Nathan Cole", title: "Wealth Advisor", company: "Meridian Wealth Partners", location: "Denver", tags: ["COI", "referral"] },
    { name: "Aisha Bello", title: "Financial Planner", company: "Meridian Wealth Partners", location: "Denver", tags: ["COI"] },
    { name: "Gregory Vance", title: "Managing Partner", company: "Cedar & Vance Advisory", location: "Aspen", tags: ["COI", "referral"] },
    { name: "Helena Cedar", title: "Partner", company: "Cedar & Vance Advisory", location: "Aspen", tags: ["COI"] },
    { name: "Diana Rosewater", title: "Principal", company: "Rosewater Family Office", location: "Denver", tags: ["COI", "prospect"], note: "Family office; potential co-advisory on a $40M multi-generational client. Exploratory." },

    // --- Clients: business owners ---
    { name: "Ricardo Delgado", title: "Client", company: "Delgado Auto Group", location: "Denver", tags: ["client", "business-owner"], note: "Selling the business next year — liquidity event; introduce the estate attorney and coordinate a 1031 on the dealership real estate." },
    { name: "Carmen Delgado", title: "Client", location: "Denver", tags: ["client"], note: "Wants sale proceeds structured for the grandchildren; revisit the gifting strategy." },
    { name: "Eleanor Thornton", title: "Client", company: "Thornton Manufacturing", location: "Longmont", tags: ["client", "business-owner"], note: "Succession to her daughter in 3 years; buy-sell agreement review is overdue." },
    { name: "Walter Thornton", title: "Client", location: "Longmont", tags: ["client"] },

    // --- Clients: retirees ---
    { name: "Harold Whitfield", title: "Client", location: "Denver", tags: ["client", "retiree"], note: "Granddaughter starting college 2027; 529 review. RMDs begin this year — set up QCDs." },
    { name: "Nadia Whitfield", title: "Client", location: "Denver", tags: ["client", "retiree"] },
    { name: "George Adeyemi", title: "Client", location: "Colorado Springs", tags: ["client", "retiree"], note: "Worried about outliving assets; Monte Carlo shows 92% success — reassure at the annual review." },
    { name: "Fatima Adeyemi", title: "Client", location: "Colorado Springs", tags: ["client", "retiree"] },
    { name: "Beatrice Kang", title: "Client", location: "Boulder", tags: ["client", "retiree"] },
    { name: "Theodore Kang", title: "Client", location: "Boulder", tags: ["client", "retiree"] },
    { name: "Sandra Muller", title: "Client", location: "Denver", tags: ["client", "retiree"] },
    { name: "Patrick Muller", title: "Client", location: "Denver", tags: ["client", "retiree"] },
    { name: "Rosa Mendez", title: "Client", location: "Pueblo", tags: ["client", "retiree"], note: "Widow; consolidated her late husband's IRAs. Sensitive — lead reviews with cash-flow certainty." },

    // --- Clients: professionals / pre-retiree ---
    { name: "Vivian Osei", title: "Client", location: "Denver", tags: ["client"], note: "Equity comp from a tech IPO vesting through 2026; plan concentrated-stock diversification and AMT." },
    { name: "Daniel Osei", title: "Client", location: "Denver", tags: ["client"] },
    { name: "Priyanka Shah", title: "Client", location: "Boulder", tags: ["client"], note: "Physician; backdoor Roth + cash-balance plan. Review malpractice/umbrella coverage." },
    { name: "Anthony Russo", title: "Client", location: "Denver", tags: ["client"] },
    { name: "Miriam Katz", title: "Client", location: "Denver", tags: ["client"], note: "Recently divorced; update beneficiaries and rebuild the plan around a single income." },
    { name: "Charles Ofori", title: "Client", location: "Aurora", tags: ["client"] },
    { name: "Linda Park", title: "Client", location: "Aurora", tags: ["client"] },
    { name: "Gustavo Rivas", title: "Client", location: "Denver", tags: ["client"] },
    { name: "Naomi Fischer", title: "Client", location: "Denver", tags: ["client"] },
    { name: "Ibrahim Sy", title: "Client", location: "Denver", tags: ["client"] },
    { name: "Grace Abara", title: "Client", location: "Golden", tags: ["client"] },
    { name: "Simon Wexler", title: "Client", location: "Golden", tags: ["client"], note: "Sits on the Brightpath foundation board; interested in a donor-advised fund." },

    // --- Prospects ---
    { name: "Wesley Grant", title: "Prospect", location: "Denver", tags: ["prospect", "referral"], note: "Referred by Denise Blackwood; recently sold a franchise, $6M in cash. Follow up within a week." },
    { name: "Olivia Bennett", title: "Prospect", location: "Boulder", tags: ["prospect"] },
    { name: "Marcus Adeleke", title: "Prospect", company: "Thornton Manufacturing", location: "Longmont", tags: ["prospect", "referral"], note: "CFO at Thornton; Eleanor wants him on the succession team. Warm." },
    { name: "Tara Nguyen", title: "Prospect", location: "Denver", tags: ["prospect"] },
    { name: "Bradley Simmons", title: "Prospect", company: "Delgado Auto Group", location: "Denver", tags: ["prospect"], note: "GM at the dealership; will get a windfall from the sale earnout. Nurture." },
    { name: "Elena Vasquez", title: "Prospect", location: "Fort Collins", tags: ["prospect"] },
    { name: "Jerome Washington", title: "Prospect", company: "Harborline Realty Group", location: "Denver", tags: ["prospect", "referral"] },
    { name: "Sophie Laurent", title: "Prospect", location: "Aspen", tags: ["prospect"], note: "Met at the Cedar & Vance seminar; inherited a family trust, shopping for a fiduciary." },
    { name: "Kwame Boateng", title: "Prospect", location: "Denver", tags: ["prospect"] },
    { name: "Rebecca Stern", title: "Prospect", company: "Guardian Shore Insurance", location: "Denver", tags: ["prospect", "referral"] },
    { name: "Hiroshi Tanaka", title: "Prospect", location: "Boulder", tags: ["prospect"] },
  ],
  events: [
    {
      name: "Client Appreciation Dinner 2026",
      emoji: "🍷",
      tags: ["client-event", "appreciation"],
      attendees: [
        "Harold Whitfield", "Nadia Whitfield", "George Adeyemi", "Fatima Adeyemi",
        "Beatrice Kang", "Theodore Kang", "Sandra Muller", "Patrick Muller",
        "Ricardo Delgado", "Carmen Delgado", "Eleanor Thornton", "Walter Thornton",
        "Vivian Osei", "Daniel Osei", "Rosa Mendez", "Priyanka Shah",
      ],
    },
    {
      name: "Retirement Income Seminar",
      emoji: "🎓",
      tags: ["seminar", "prospecting"],
      attendees: [
        "Harold Whitfield", "George Adeyemi", "Beatrice Kang", "Sandra Muller",
        "Rosa Mendez", "Olivia Bennett", "Tara Nguyen", "Elena Vasquez",
        "Kwame Boateng", "Hiroshi Tanaka",
      ],
    },
    {
      name: "CPA Networking Lunch",
      emoji: "🍴",
      tags: ["COI", "networking"],
      attendees: [
        "Denise Blackwood", "Arjun Mehta", "Kenji Nakamura", "Sofia Reyes",
        "Grace Lin", "Rafael Ortega", "Nathan Cole", "Gregory Vance", "Priya Raman",
      ],
    },
    {
      name: "Estate Planning Workshop",
      emoji: "📜",
      tags: ["seminar", "estate"],
      attendees: [
        "Margaret Ellison", "Trevor Nwosu", "Yelena Petrova", "Sam Okafor",
        "Harold Whitfield", "Ricardo Delgado", "Carmen Delgado", "Eleanor Thornton",
        "Miriam Katz", "Diana Rosewater", "Simon Wexler",
      ],
    },
    {
      name: "Business Owner Roundtable",
      emoji: "💼",
      tags: ["seminar", "business-owner"],
      attendees: [
        "Ricardo Delgado", "Eleanor Thornton", "Rafael Ortega", "Grace Lin",
        "Denise Blackwood", "Marcus Adeleke", "Bradley Simmons", "Wesley Grant",
        "Luis Delacruz",
      ],
    },
  ],
});
