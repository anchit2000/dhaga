import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// A startup founder running five jobs at once: raising money, recruiting a
// founding team, landing design-partner customers, and courting press. The
// graph connects those worlds through shared firms and shared events (a
// fundraise roadshow, an accelerator demo day, a launch party).
await seedDomainAccount({
  slug: "founders",
  displayName: "Sam Fielding — Founder & CEO (demo)",
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
    // --- Investors / angels (14) ---
    { name: "Priya Raghunathan", title: "Investor / Partner", company: "Northwind Ventures", location: "San Francisco", tags: ["investor"], note: "Said follow up once we hit $10k MRR — we did." },
    { name: "Marcus Feld", title: "Investor / Partner", company: "Northwind Ventures", location: "San Francisco", tags: ["investor"] },
    { name: "Elena Vasquez", title: "Investor / Partner", company: "Meridian Capital Partners", location: "New York", tags: ["investor"] },
    { name: "David Okonkwo", title: "Investor / Partner", company: "Meridian Capital Partners", location: "New York", tags: ["investor"] },
    { name: "Hannah Lindqvist", title: "Investor / Partner", company: "Blue Harbor Seed", location: "Boston", tags: ["investor", "warm-intro"], note: "Intro'd by Priya; leads seed rounds up to $2M." },
    { name: "Tomás Herrera", title: "Investor / Partner", company: "Blue Harbor Seed", location: "Boston", tags: ["investor"] },
    { name: "Grace Mbeki", title: "Investor / Partner", company: "Cedar Grove Capital", location: "Austin", tags: ["investor"], note: "Wants a warm intro to a logistics design partner before committing." },
    { name: "Ryan Caldwell", title: "Investor / Partner", company: "Cedar Grove Capital", location: "Austin", tags: ["investor"] },
    { name: "Nadia Rahman", title: "Angel", company: "Sparrow Angels", location: "London", tags: ["angel", "warm-intro"] },
    { name: "Kenji Watanabe", title: "Angel", company: "Sparrow Angels", location: "Tokyo", tags: ["angel"] },
    { name: "Olivia Brennan", title: "Angel", company: "Sparrow Angels", location: "Chicago", tags: ["angel"] },
    { name: "Samuel Adeyemi", title: "Angel", company: "Sparrow Angels", location: "Lagos", tags: ["angel"] },
    { name: "Rebecca Stone", title: "Investor / Partner", company: "Launchpad Collective", location: "San Francisco", tags: ["investor"], note: "Runs the accelerator; decides the demo-day lineup." },
    { name: "Arjun Mehta", title: "Investor / Partner", company: "Launchpad Collective", location: "San Francisco", tags: ["investor", "warm-intro"] },

    // --- Advisors (10) ---
    { name: "Fiona Chen", title: "Advisor", company: "Meadowbrook Health", location: "Seattle", tags: ["advisor"], note: "Healthcare advisor; will vouch to Meadowbrook's CISO on SSO." },
    { name: "Ibrahim Diallo", title: "Advisor", location: "Paris", tags: ["advisor"] },
    { name: "Sophie Andersson", title: "Advisor", location: "Stockholm", tags: ["advisor"], note: "Offered to intro a designer; remind them." },
    { name: "Wei Zhang", title: "Advisor", company: "Ledgerly", location: "San Jose", tags: ["advisor"] },
    { name: "Carla Nogueira", title: "Advisor", location: "São Paulo", tags: ["advisor"] },
    { name: "Malik Johnson", title: "Advisor", location: "Atlanta", tags: ["advisor", "warm-intro"], note: "Former VP Sales; reviewing our pricing deck." },
    { name: "Anya Petrova", title: "Advisor", location: "Berlin", tags: ["advisor"] },
    { name: "Daniel Kim", title: "Advisor", company: "Cornerstone Legal", location: "Los Angeles", tags: ["advisor"] },
    { name: "Lucia Romano", title: "Advisor", location: "Milan", tags: ["advisor"] },
    { name: "Kwame Asante", title: "Advisor", location: "Accra", tags: ["advisor"] },

    // --- Candidate hires (14) ---
    { name: "Jordan Blake", title: "Staff Engineer (candidate)", location: "Remote", tags: ["candidate"], note: "Strong systems eng; needs an offer by end of month or takes a competing role." },
    { name: "Meera Nair", title: "Staff Engineer (candidate)", location: "Bangalore", tags: ["candidate"] },
    { name: "Lucas Moreau", title: "Senior Backend Engineer (candidate)", location: "Montreal", tags: ["candidate"] },
    { name: "Zoe Whitfield", title: "Product Designer (candidate)", location: "Portland", tags: ["candidate", "warm-intro"], note: "Sophie's designer intro; portfolio is excellent." },
    { name: "Aiden O'Sullivan", title: "Founding Account Executive (candidate)", location: "Dublin", tags: ["candidate"] },
    { name: "Priyanka Desai", title: "Head of Growth (candidate)", location: "Toronto", tags: ["candidate"] },
    { name: "Noah Bergström", title: "Staff Engineer (candidate)", location: "Oslo", tags: ["candidate"] },
    { name: "Fatima Al-Rashid", title: "Data Engineer (candidate)", location: "Dubai", tags: ["candidate"] },
    { name: "Diego Santos", title: "DevOps Engineer (candidate)", location: "Lisbon", tags: ["candidate"] },
    { name: "Hana Kobayashi", title: "Product Manager (candidate)", location: "Tokyo", tags: ["candidate"] },
    { name: "Marcus Lee", title: "Frontend Engineer (candidate)", location: "Vancouver", tags: ["candidate"] },
    { name: "Amara Okeke", title: "Engineering Manager (candidate)", location: "Nairobi", tags: ["candidate", "warm-intro"], note: "Referred by Malik; wants to lead the platform team." },
    { name: "Isabella Rossi", title: "Founding Marketer (candidate)", location: "Rome", tags: ["candidate"] },
    { name: "Theo Nguyen", title: "Staff Engineer (candidate)", location: "Sydney", tags: ["candidate"] },

    // --- Design-partner customers (12) ---
    { name: "Victor Alvarez", title: "Head of Ops (design partner)", company: "Voltra Logistics", location: "Dallas", tags: ["customer"], note: "Design partner — asked for SSO before they expand." },
    { name: "Grace Thompson", title: "VP Engineering (design partner)", company: "Voltra Logistics", location: "Dallas", tags: ["customer"] },
    { name: "Rashida Bello", title: "CISO (design partner)", company: "Meadowbrook Health", location: "Seattle", tags: ["customer"], note: "Needs a signed BAA and a SOC 2 roadmap to go live." },
    { name: "Ethan Park", title: "Head of Ops (design partner)", company: "Meadowbrook Health", location: "Seattle", tags: ["customer"] },
    { name: "Camille Dubois", title: "Director of CX (design partner)", company: "Trailhead Retail", location: "Denver", tags: ["customer"], note: "Champion internally; wants a case study once ROI lands." },
    { name: "Oluwaseun Adebayo", title: "Head of Ops (design partner)", company: "Trailhead Retail", location: "Denver", tags: ["customer"] },
    { name: "Naomi Fischer", title: "VP Operations (design partner)", company: "Fernbank Financial", location: "Charlotte", tags: ["customer"] },
    { name: "Raj Patel", title: "Head of Data (design partner)", company: "Fernbank Financial", location: "Charlotte", tags: ["customer"] },
    { name: "Bianca Costa", title: "Head of Ops (design partner)", company: "Sightline Media", location: "Miami", tags: ["customer"] },
    { name: "Liam Gallagher", title: "Product Lead (design partner)", company: "Sightline Media", location: "Miami", tags: ["customer", "warm-intro"], note: "Introduced us to two other media buyers." },
    { name: "Sunita Kapoor", title: "Plant Ops Lead (design partner)", company: "Oakline Manufacturing", location: "Detroit", tags: ["customer"] },
    { name: "George Whitaker", title: "Head of Ops (design partner)", company: "Oakline Manufacturing", location: "Detroit", tags: ["customer"] },

    // --- Press / community (8) ---
    { name: "Sara Lindgren", title: "Reporter", company: "TechPulse Daily", location: "San Francisco", tags: ["press"], note: "Covering seed rounds; wants an exclusive on our raise." },
    { name: "Omar Haddad", title: "Reporter", company: "TechPulse Daily", location: "New York", tags: ["press"] },
    { name: "Jenny Zhao", title: "Reporter", company: "Sightline Media", location: "Los Angeles", tags: ["press", "warm-intro"] },
    { name: "Patrick Nolan", title: "Reporter", company: "Bright Signal PR", location: "Boston", tags: ["press"], note: "Our PR contact; pitching us to three outlets." },
    { name: "Aisha Mohammed", title: "Reporter", company: "Bright Signal PR", location: "Boston", tags: ["press"] },
    { name: "Felix Baumann", title: "Reporter", location: "Munich", tags: ["press"] },
    { name: "Gabriela Torres", title: "Recruiter (community)", company: "Talent Forge Recruiting", location: "Austin", tags: ["warm-intro"] },
    { name: "Hugo Almeida", title: "Reporter", location: "Barcelona", tags: ["press"] },
  ],
  events: [
    {
      name: "Seed Roadshow 2026",
      emoji: "💸",
      tags: ["investor", "warm-intro"],
      attendees: [
        "Priya Raghunathan", "Marcus Feld", "Elena Vasquez", "David Okonkwo",
        "Hannah Lindqvist", "Nadia Rahman", "Samuel Adeyemi", "Rebecca Stone",
      ],
    },
    {
      name: "Series A Roadshow",
      emoji: "📈",
      tags: ["investor"],
      attendees: [
        "Grace Mbeki", "Ryan Caldwell", "Elena Vasquez", "David Okonkwo",
        "Hannah Lindqvist", "Tomás Herrera", "Arjun Mehta",
      ],
    },
    {
      name: "Launchpad Demo Day",
      emoji: "🎤",
      tags: ["investor"],
      attendees: [
        "Rebecca Stone", "Arjun Mehta", "Priya Raghunathan", "Grace Mbeki",
        "Jordan Blake", "Zoe Whitfield", "Priyanka Desai", "Sara Lindgren",
      ],
    },
    {
      name: "Launch Party",
      emoji: "🎉",
      tags: ["press", "customer", "warm-intro"],
      attendees: [
        "Sara Lindgren", "Omar Haddad", "Jenny Zhao", "Patrick Nolan",
        "Aisha Mohammed", "Victor Alvarez", "Rashida Bello", "Camille Dubois",
        "Liam Gallagher", "Naomi Fischer", "Priya Raghunathan", "Gabriela Torres",
      ],
    },
    {
      name: "Design Partner Summit",
      emoji: "🤝",
      tags: ["customer"],
      attendees: [
        "Victor Alvarez", "Grace Thompson", "Rashida Bello", "Ethan Park",
        "Camille Dubois", "Oluwaseun Adebayo", "Naomi Fischer", "Raj Patel",
        "Bianca Costa", "Liam Gallagher", "Sunita Kapoor", "George Whitaker",
      ],
    },
  ],
});
