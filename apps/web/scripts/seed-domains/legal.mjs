import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

await seedDomainAccount({
  slug: "legal",
  displayName: "Marcus Bell — Partner, Business Development (demo)",
  companies: [
    // --- client companies ---
    { name: "Meridian Health Systems", sector: "Healthcare" },
    { name: "Cascade Manufacturing", sector: "Manufacturing" },
    { name: "Northwind Logistics", sector: "Logistics" },
    { name: "Brightpath Software", sector: "Technology" },
    { name: "Sterling Foods Group", sector: "Consumer Goods" },
    { name: "Vantage Renewables", sector: "Energy" },
    { name: "Harbor Financial Group", sector: "Financial Services" },
    { name: "Aria Biosciences", sector: "Biotech" },
    // --- referral sources: accounting firms ---
    { name: "Whitfield & Crane CPAs", sector: "Accounting" },
    { name: "Pemberton Tax Advisors", sector: "Accounting" },
    // --- referral sources: banks ---
    { name: "First Cornerstone Bank", sector: "Banking" },
    { name: "Alderwood Capital Partners", sector: "Investment Banking" },
    // --- referral sources: fellow law firms ---
    { name: "Latham Reyes LLP", sector: "Legal" },
    { name: "Quinn Fairbanks LLP", sector: "Legal" },
    // --- referral sources: industry associations ---
    { name: "State Bar Association", sector: "Association" },
    { name: "Commercial Real Estate Council", sector: "Association" },
  ],
  contacts: [
    // --- Meridian Health Systems ---
    { name: "Priya Raman", title: "General Counsel (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client", "in-house"], note: "New GC at the client — build the relationship." },
    { name: "David Okafor", title: "Deputy General Counsel (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client", "in-house"] },
    { name: "Sandra Yeung", title: "CFO (client)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["client"] },
    { name: "Caleb Foster", title: "VP Compliance (prospect)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["prospect", "in-house"], note: "Introduced by Priya; nurture as a future contact." },
    { name: "Rosa Delacroix", title: "VP Patient Services (prospect)", company: "Meridian Health Systems", location: "Chicago, IL", tags: ["prospect"] },

    // --- Cascade Manufacturing ---
    { name: "Thomas Beckett", title: "General Counsel (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client", "in-house"], note: "Long-standing client GC — keep quarterly check-ins on the calendar." },
    { name: "Lucia Moreno", title: "VP Legal (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client", "in-house"] },
    { name: "Raj Malhotra", title: "CEO (client)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["client"] },
    { name: "Marina Petrova", title: "Head of Procurement (prospect)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["prospect"] },
    { name: "Owen Mbeki", title: "CFO (prospect)", company: "Cascade Manufacturing", location: "Cleveland, OH", tags: ["prospect"] },

    // --- Northwind Logistics ---
    { name: "Grace Adeyemi", title: "General Counsel (client)", company: "Northwind Logistics", location: "Atlanta, GA", tags: ["client", "in-house", "reconnect"], note: "Haven't spoken in over a year — reconnect and catch up over coffee." },
    { name: "Henry Salazar", title: "CFO (client)", company: "Northwind Logistics", location: "Atlanta, GA", tags: ["client"] },
    { name: "Julian Ford", title: "VP Operations (prospect)", company: "Northwind Logistics", location: "Atlanta, GA", tags: ["prospect"] },

    // --- Brightpath Software ---
    { name: "Emma Lindqvist", title: "General Counsel (client)", company: "Brightpath Software", location: "Austin, TX", tags: ["client", "in-house"] },
    { name: "Kwame Boateng", title: "Chief Legal Officer (client)", company: "Brightpath Software", location: "Austin, TX", tags: ["client", "in-house"], note: "Values responsiveness; keep touchpoints frequent." },
    { name: "Nadia Haddad", title: "VP Finance (client)", company: "Brightpath Software", location: "Austin, TX", tags: ["client"] },
    { name: "Aisha Bello", title: "Head of Product (prospect)", company: "Brightpath Software", location: "Austin, TX", tags: ["prospect"] },
    { name: "Liam O'Connor", title: "VP Engineering (prospect)", company: "Brightpath Software", location: "Austin, TX", tags: ["prospect"] },

    // --- Sterling Foods Group ---
    { name: "Robert Kim", title: "General Counsel (client)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["client", "in-house"] },
    { name: "Olivia Chen", title: "Associate General Counsel (client)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["client", "in-house"], note: "Rising in-house contact — worth a mentoring lunch." },
    { name: "Felix Andersson", title: "COO (prospect)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["prospect"] },
    { name: "Greta Halvorsen", title: "VP Legal Operations (prospect)", company: "Sterling Foods Group", location: "Minneapolis, MN", tags: ["prospect"] },

    // --- Vantage Renewables ---
    { name: "Diego Fuentes", title: "General Counsel (client)", company: "Vantage Renewables", location: "Denver, CO", tags: ["client", "in-house"] },
    { name: "Amara Nwosu", title: "CFO (client)", company: "Vantage Renewables", location: "Denver, CO", tags: ["client", "reconnect"], note: "Moved into the CFO seat last quarter — reintroduce myself." },
    { name: "Sophia Marlowe", title: "VP Development (prospect)", company: "Vantage Renewables", location: "Denver, CO", tags: ["prospect"] },

    // --- Harbor Financial Group ---
    { name: "Jonathan Pierce", title: "General Counsel (client)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["client", "in-house"] },
    { name: "Fatima Al-Rashid", title: "Deputy General Counsel (client)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["client", "in-house"] },
    { name: "Trevor Nash", title: "Chief Risk Officer (prospect)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["prospect"], note: "Warm prospect via the bar dinner; follow up next month." },
    { name: "Naomi Sato", title: "VP Legal (prospect)", company: "Harbor Financial Group", location: "Boston, MA", tags: ["prospect"] },

    // --- Aria Biosciences ---
    { name: "Sophie Bergman", title: "General Counsel (client)", company: "Aria Biosciences", location: "San Diego, CA", tags: ["client", "in-house"], note: "Prefers a warm relationship — send industry articles she'd enjoy." },
    { name: "Victor Ramos", title: "CEO (client)", company: "Aria Biosciences", location: "San Diego, CA", tags: ["client"] },
    { name: "Hana Kobayashi", title: "VP Regulatory Affairs (prospect)", company: "Aria Biosciences", location: "San Diego, CA", tags: ["prospect"] },

    // --- Whitfield & Crane CPAs (referral source) ---
    { name: "Eleanor Whitfield", title: "Partner (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source"], note: "Refers M&A work; thank her and grab lunch." },
    { name: "Gordon Pratt", title: "Tax Partner (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source"] },
    { name: "Alice Zhang", title: "Audit Manager (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source"] },
    { name: "Benjamin Cole", title: "Tax Partner (referral source)", company: "Whitfield & Crane CPAs", location: "New York, NY", tags: ["referral-source"] },

    // --- Pemberton Tax Advisors (referral source) ---
    { name: "Nathan Pemberton", title: "Managing Partner (referral source)", company: "Pemberton Tax Advisors", location: "Philadelphia, PA", tags: ["referral-source"], note: "Steady stream of referrals; send a handwritten note." },
    { name: "Isabella Rossi", title: "Senior Tax Advisor (referral source)", company: "Pemberton Tax Advisors", location: "Philadelphia, PA", tags: ["referral-source"] },

    // --- First Cornerstone Bank (referral source) ---
    { name: "Charles Dunmore", title: "Banker (referral source)", company: "First Cornerstone Bank", location: "Charlotte, NC", tags: ["referral-source"], note: "Great source of banking referrals; invite to the golf outing." },
    { name: "Yuki Tanaka", title: "Relationship Manager (referral source)", company: "First Cornerstone Bank", location: "Charlotte, NC", tags: ["referral-source"] },
    { name: "Derek Osei", title: "SVP Commercial Lending (referral source)", company: "First Cornerstone Bank", location: "Charlotte, NC", tags: ["referral-source"] },

    // --- Alderwood Capital Partners (referral source) ---
    { name: "Vanessa Blackwood", title: "Managing Director (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"], note: "Sends deal-side introductions; reciprocate when I can." },
    { name: "Samuel Greene", title: "Banker (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"] },
    { name: "Leila Farah", title: "Vice President (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"] },
    { name: "Carmen Ruiz", title: "Analyst (referral source)", company: "Alderwood Capital Partners", location: "New York, NY", tags: ["referral-source"] },

    // --- Latham Reyes LLP (referral source) ---
    { name: "Miguel Reyes", title: "Partner (referral source)", company: "Latham Reyes LLP", location: "Los Angeles, CA", tags: ["referral-source"], note: "Refers conflicts-out matters; return the favor." },
    { name: "Hannah Goldberg", title: "Partner (referral source)", company: "Latham Reyes LLP", location: "Los Angeles, CA", tags: ["referral-source"] },
    { name: "Priyanka Nair", title: "Partner (referral source)", company: "Latham Reyes LLP", location: "Los Angeles, CA", tags: ["referral-source", "reconnect"] },

    // --- Quinn Fairbanks LLP (referral source) ---
    { name: "Patrick Quinn", title: "Partner (referral source)", company: "Quinn Fairbanks LLP", location: "Seattle, WA", tags: ["referral-source", "reconnect"], note: "Lost touch after he changed firms — reconnect." },
    { name: "Rebecca Fairbanks", title: "Partner (referral source)", company: "Quinn Fairbanks LLP", location: "Seattle, WA", tags: ["referral-source"] },

    // --- State Bar Association (referral source) ---
    { name: "Angela Foster", title: "Executive Director (referral source)", company: "State Bar Association", location: "Washington, DC", tags: ["referral-source"] },
    { name: "Terrence Wu", title: "Programs Chair (referral source)", company: "State Bar Association", location: "Washington, DC", tags: ["referral-source"] },

    // --- Commercial Real Estate Council (referral source) ---
    { name: "Bianca Silva", title: "Membership Director (referral source)", company: "Commercial Real Estate Council", location: "Miami, FL", tags: ["referral-source"] },
    { name: "Omar Haddad", title: "Board Member (referral source)", company: "Commercial Real Estate Council", location: "Miami, FL", tags: ["referral-source"], note: "Connector across the CRE world — stay top of mind." },
  ],
  events: [
    {
      name: "State Bar Annual Dinner",
      emoji: "🍷",
      tags: ["bar-association", "networking"],
      attendees: ["Angela Foster", "Terrence Wu", "Miguel Reyes", "Hannah Goldberg", "Patrick Quinn", "Rebecca Fairbanks", "Priyanka Nair", "Trevor Nash", "Priya Raman"],
    },
    {
      name: "Client CLE Seminar: Compliance Update",
      emoji: "🎓",
      tags: ["cle", "seminar"],
      attendees: ["Priya Raman", "David Okafor", "Thomas Beckett", "Grace Adeyemi", "Emma Lindqvist", "Kwame Boateng", "Robert Kim", "Olivia Chen", "Diego Fuentes", "Jonathan Pierce", "Sophie Bergman", "Caleb Foster"],
    },
    {
      name: "Rainmakers Golf Outing",
      emoji: "⛳",
      tags: ["golf", "referral"],
      attendees: ["Charles Dunmore", "Derek Osei", "Vanessa Blackwood", "Samuel Greene", "Eleanor Whitfield", "Nathan Pemberton", "Miguel Reyes", "Raj Malhotra", "Victor Ramos"],
    },
    {
      name: "M&A Referral Roundtable",
      emoji: "🤝",
      tags: ["referral", "networking"],
      attendees: ["Eleanor Whitfield", "Gordon Pratt", "Vanessa Blackwood", "Leila Farah", "Charles Dunmore", "Miguel Reyes", "Hannah Goldberg", "Amara Nwosu", "Henry Salazar"],
    },
    {
      name: "Commercial Real Estate Council Mixer",
      emoji: "🏙️",
      tags: ["association", "networking"],
      attendees: ["Bianca Silva", "Omar Haddad", "Charles Dunmore", "Yuki Tanaka", "Diego Fuentes", "Sophia Marlowe"],
    },
  ],
});
