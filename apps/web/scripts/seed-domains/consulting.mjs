import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

await seedDomainAccount({
  slug: "consulting",
  displayName: "Elena Rossi — Management Consultant (demo)",
  companies: [
    { name: "Meridian Health Systems", sector: "Healthcare" },
    { name: "Vantage Retail Group", sector: "Retail" },
    { name: "Northwind Energy", sector: "Energy & Utilities" },
    { name: "Cascade Financial", sector: "Banking & Financial Services" },
    { name: "Aurora Manufacturing", sector: "Industrial Manufacturing" },
    { name: "Solstice Telecom", sector: "Telecommunications" },
    { name: "Evergreen Logistics", sector: "Logistics & Supply Chain" },
    { name: "Halcyon Insurance", sector: "Insurance" },
    { name: "Ironwood Mining", sector: "Mining & Materials" },
    { name: "Lumen Media Group", sector: "Media & Entertainment" },
    { name: "Brightline Pharmaceuticals", sector: "Pharmaceuticals" },
    { name: "Coastal Airlines", sector: "Aviation & Travel" },
    { name: "Pinnacle Consumer Goods", sector: "Consumer Packaged Goods" },
    { name: "Verdant Agritech", sector: "Agriculture & Food" },
    { name: "Cobalt Automotive", sector: "Automotive" },
    { name: "Silverpeak Capital", sector: "Private Equity" },
    { name: "Northgate Ventures", sector: "Venture Capital" },
  ],
  contacts: [
    // --- Meridian Health Systems ---
    {
      name: "Priya Nair",
      title: "COO (client sponsor)",
      company: "Meridian Health Systems",
      location: "Boston, USA",
      tags: ["client", "sponsor"],
      note: "Strongest sponsor relationship in the book — expand from ops into digital next.",
    },
    { name: "Daniel Okafor", title: "Transformation Lead", company: "Meridian Health Systems", location: "Boston, USA", tags: ["client"] },
    { name: "Sofia Mendes", title: "VP Operations", company: "Meridian Health Systems", location: "Chicago, USA", tags: ["client"] },
    { name: "George Whitfield", title: "Referral source", company: "Meridian Health Systems", location: "Boston, USA", tags: ["referral"] },

    // --- Vantage Retail Group ---
    { name: "Marcus Feldman", title: "CEO (client sponsor)", company: "Vantage Retail Group", location: "London, UK", tags: ["client", "sponsor"] },
    {
      name: "Aisha Rahman",
      title: "Head of Merchandising",
      company: "Vantage Retail Group",
      location: "London, UK",
      tags: ["client"],
      note: "Day-to-day client lead on the merchandising redesign — keep close.",
    },
    {
      name: "Tom Becker",
      title: "Former colleague / now VP",
      company: "Vantage Retail Group",
      location: "Manchester, UK",
      tags: ["alumni", "prospect"],
      note: "Moved from firm to client-side as VP — warm buyer for the next retail engagement.",
    },
    { name: "Nina Volkova", title: "Store Ops Director", company: "Vantage Retail Group", location: "Berlin, Germany", tags: ["client"] },

    // --- Northwind Energy ---
    { name: "Ingrid Solberg", title: "CFO (client sponsor)", company: "Northwind Energy", location: "Oslo, Norway", tags: ["client", "sponsor"] },
    { name: "Rajesh Kapoor", title: "Transformation Lead", company: "Northwind Energy", location: "Oslo, Norway", tags: ["client"] },
    { name: "Chen Wei", title: "Grid Modernization Director", company: "Northwind Energy", location: "Singapore", tags: ["client"] },
    { name: "Omar Farouk", title: "Referral source", company: "Northwind Energy", location: "Dubai, UAE", tags: ["referral"] },

    // --- Cascade Financial ---
    {
      name: "Olivia Grant",
      title: "COO (client sponsor)",
      company: "Cascade Financial",
      location: "Toronto, Canada",
      tags: ["former-client", "sponsor"],
      note: "Engagement ended in March; reconnect before Q4 planning.",
    },
    { name: "Hassan Ali", title: "Head of Digital Banking", company: "Cascade Financial", location: "Toronto, Canada", tags: ["former-client"] },
    { name: "Beatriz Costa", title: "Risk Transformation Lead", company: "Cascade Financial", location: "São Paulo, Brazil", tags: ["former-client"] },
    {
      name: "Jean-Pierre Dubois",
      title: "Former colleague / now VP",
      company: "Cascade Financial",
      location: "Montréal, Canada",
      tags: ["alumni", "prospect"],
      note: "Ex-colleague, now VP at Cascade — could unlock a follow-on mandate.",
    },

    // --- Aurora Manufacturing ---
    { name: "Klaus Bauer", title: "VP Operations (client sponsor)", company: "Aurora Manufacturing", location: "Munich, Germany", tags: ["client", "sponsor"] },
    { name: "Yuki Tanaka", title: "Lean Program Lead", company: "Aurora Manufacturing", location: "Nagoya, Japan", tags: ["client"] },
    { name: "Fatima El-Sayed", title: "Supply Chain Director", company: "Aurora Manufacturing", location: "Cairo, Egypt", tags: ["client"] },
    { name: "Ravi Menon", title: "Referral source", company: "Aurora Manufacturing", location: "Bengaluru, India", tags: ["referral"] },

    // --- Solstice Telecom ---
    { name: "Nadia Petrova", title: "CTO (client sponsor)", company: "Solstice Telecom", location: "Sofia, Bulgaria", tags: ["client", "sponsor"] },
    { name: "Liam Murphy", title: "Network Strategy Lead", company: "Solstice Telecom", location: "Dublin, Ireland", tags: ["client"] },
    { name: "Amara Diallo", title: "Digital Ops Lead", company: "Solstice Telecom", location: "Dakar, Senegal", tags: ["client"] },

    // --- Evergreen Logistics ---
    {
      name: "Carlos Ramirez",
      title: "COO (client sponsor)",
      company: "Evergreen Logistics",
      location: "Madrid, Spain",
      tags: ["prospect", "sponsor"],
      note: "Met at the Global Operations Summit — active prospect, wants a diagnostic proposal.",
    },
    { name: "Grace Kim", title: "Operations Transformation Lead", company: "Evergreen Logistics", location: "Seoul, South Korea", tags: ["prospect"] },

    // --- Halcyon Insurance ---
    { name: "Robert Ashford", title: "Chief Claims Officer (client sponsor)", company: "Halcyon Insurance", location: "Hartford, USA", tags: ["client", "sponsor"] },
    { name: "Meera Iyer", title: "Claims Transformation Lead", company: "Halcyon Insurance", location: "Mumbai, India", tags: ["client"] },
    { name: "Thomas Wright", title: "Underwriting Transformation Lead", company: "Halcyon Insurance", location: "Hartford, USA", tags: ["client"] },

    // --- Ironwood Mining ---
    {
      name: "David Nkosi",
      title: "COO (client sponsor)",
      company: "Ironwood Mining",
      location: "Johannesburg, South Africa",
      tags: ["former-client", "sponsor"],
      note: "Former client; safety program stalled after we left — reopening likely.",
    },
    { name: "Emma Larsson", title: "Safety & Ops Lead", company: "Ironwood Mining", location: "Perth, Australia", tags: ["former-client"] },

    // --- Lumen Media Group ---
    { name: "Julien Moreau", title: "CEO (client sponsor)", company: "Lumen Media Group", location: "Paris, France", tags: ["client", "sponsor"] },
    { name: "Sara Haddad", title: "Digital Transformation Lead", company: "Lumen Media Group", location: "Paris, France", tags: ["client"] },
    {
      name: "Anthony Russo",
      title: "Former colleague / now VP",
      company: "Lumen Media Group",
      location: "Milan, Italy",
      tags: ["alumni", "prospect"],
      note: "Former colleague, now VP at Lumen — natural sponsor if we pitch media.",
    },
    { name: "Camille Laurent", title: "Referral source", company: "Lumen Media Group", location: "Lyon, France", tags: ["referral"] },

    // --- Brightline Pharmaceuticals ---
    { name: "Naomi Feldstein", title: "VP R&D Ops (client sponsor)", company: "Brightline Pharmaceuticals", location: "Basel, Switzerland", tags: ["client", "sponsor"] },
    { name: "Vikram Desai", title: "Commercial Transformation Lead", company: "Brightline Pharmaceuticals", location: "Hyderabad, India", tags: ["client"] },
    { name: "Sofia Ivanova", title: "Referral source", company: "Brightline Pharmaceuticals", location: "Zurich, Switzerland", tags: ["referral"] },

    // --- Coastal Airlines ---
    {
      name: "Helen Zhang",
      title: "COO (client sponsor)",
      company: "Coastal Airlines",
      location: "Hong Kong",
      tags: ["prospect", "sponsor"],
      note: "Prospect via referral from Ingrid Solberg — cautious, needs a reference call.",
    },
    { name: "Peter Andersson", title: "Fleet Ops Lead", company: "Coastal Airlines", location: "Copenhagen, Denmark", tags: ["prospect"] },

    // --- Pinnacle Consumer Goods ---
    { name: "Isabella Romano", title: "CFO (client sponsor)", company: "Pinnacle Consumer Goods", location: "New York, USA", tags: ["client", "sponsor"] },
    { name: "Kwame Mensah", title: "Route-to-Market Lead", company: "Pinnacle Consumer Goods", location: "Accra, Ghana", tags: ["client"] },
    {
      name: "Lucia Fernández",
      title: "Former colleague / now VP",
      company: "Pinnacle Consumer Goods",
      location: "Barcelona, Spain",
      tags: ["alumni", "prospect"],
      note: "Moved from client-side to a new CxO role — warm buyer.",
    },
    { name: "Derek Osei", title: "Field Sales Lead", company: "Pinnacle Consumer Goods", location: "London, UK", tags: ["client"] },

    // --- Verdant Agritech ---
    { name: "Samuel Boateng", title: "COO (client sponsor)", company: "Verdant Agritech", location: "Nairobi, Kenya", tags: ["client", "sponsor"] },
    { name: "Anna Kowalski", title: "Sustainability Ops Lead", company: "Verdant Agritech", location: "Warsaw, Poland", tags: ["client"] },
    { name: "Maria Santos", title: "Referral source", company: "Verdant Agritech", location: "Lisbon, Portugal", tags: ["referral"] },

    // --- Cobalt Automotive ---
    {
      name: "Dieter Vogel",
      title: "VP Manufacturing (client sponsor)",
      company: "Cobalt Automotive",
      location: "Stuttgart, Germany",
      tags: ["former-client", "sponsor"],
      note: "Engagement wrapped last year; check in before their EV capex cycle.",
    },
    { name: "Mei Lin", title: "EV Program Lead", company: "Cobalt Automotive", location: "Shanghai, China", tags: ["former-client"] },
    { name: "Hiroshi Sato", title: "Quality Transformation Lead", company: "Cobalt Automotive", location: "Yokohama, Japan", tags: ["former-client"] },

    // --- Silverpeak Capital (firm alumni now buyers here) ---
    {
      name: "Jonathan Pierce",
      title: "Former colleague / now VP",
      company: "Silverpeak Capital",
      location: "New York, USA",
      tags: ["alumni", "referral"],
      note: "Alumnus now a Partner — sources operational due-diligence work on portfolio companies.",
    },
    { name: "Rebecca Stein", title: "Operating Partner", company: "Silverpeak Capital", location: "New York, USA", tags: ["alumni"] },
    { name: "Aditya Sharma", title: "Referral source", company: "Silverpeak Capital", location: "London, UK", tags: ["referral"] },
    { name: "Laura Bianchi", title: "Referral source", company: "Silverpeak Capital", location: "Rome, Italy", tags: ["referral"] },

    // --- Northgate Ventures (firm alumni now buyers here) ---
    {
      name: "Michael Chen",
      title: "Former colleague / now VP",
      company: "Northgate Ventures",
      location: "San Francisco, USA",
      tags: ["alumni", "referral"],
      note: "Alumnus at the VC — refers commercial due-diligence engagements.",
    },
    { name: "Elena Volkov", title: "Referral source", company: "Northgate Ventures", location: "Berlin, Germany", tags: ["referral"] },
  ],
  events: [
    {
      name: "Global Operations Summit 2026",
      emoji: "🌍",
      tags: ["summit", "industry"],
      attendees: [
        "Priya Nair",
        "Marcus Feldman",
        "Ingrid Solberg",
        "Klaus Bauer",
        "Carlos Ramirez",
        "Robert Ashford",
        "Samuel Boateng",
        "Helen Zhang",
      ],
    },
    {
      name: "Firm Alumni Reunion",
      emoji: "🥂",
      tags: ["alumni", "reunion"],
      attendees: [
        "Tom Becker",
        "Anthony Russo",
        "Lucia Fernández",
        "Jean-Pierre Dubois",
        "Jonathan Pierce",
        "Rebecca Stein",
        "Michael Chen",
      ],
    },
    {
      name: "Meridian Digital Transformation Workshop",
      emoji: "🏥",
      tags: ["workshop", "client"],
      attendees: ["Priya Nair", "Daniel Okafor", "Sofia Mendes", "George Whitfield"],
    },
    {
      name: "Cascade Financial Kickoff Workshop",
      emoji: "🏦",
      tags: ["workshop", "client"],
      attendees: ["Olivia Grant", "Hassan Ali", "Beatriz Costa", "Jean-Pierre Dubois"],
    },
    {
      name: "FinServ Leaders Roundtable",
      emoji: "💼",
      tags: ["roundtable", "industry"],
      attendees: ["Isabella Romano", "Ingrid Solberg", "Hassan Ali", "Marcus Feldman"],
    },
  ],
});
