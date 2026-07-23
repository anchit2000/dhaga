import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Noah Kim's world: a super-connector who runs a builder community. His value
// isn't any one company — it's the graph. Members work all over the map
// (climate, hardware, AI, design, fintech, healthtech, academia), and they
// thread together through the recurring rituals he hosts: a monthly meetup,
// an annual conference, and a founders' dinner series. Speakers, sponsors and
// volunteers keep the machine running. The notes are mostly intro-maker notes:
// who to connect to whom.

await seedDomainAccount({
  slug: "community-builders",
  displayName: "Noah Kim — Community Builder (demo)",

  companies: [
    // --- members' varied employers ---
    { name: "Solverra", sector: "Climate tech" },
    { name: "Voltrail", sector: "Hardware / batteries" },
    { name: "Orchard Robotics", sector: "Robotics" },
    { name: "Meridian Labs", sector: "AI research" },
    { name: "Bluepeak Cloud", sector: "Cloud infrastructure" },
    { name: "Payload Financial", sector: "Fintech" },
    { name: "Tidebank", sector: "Fintech / banking" },
    { name: "Cobalt Design Co.", sector: "Design studio" },
    { name: "Brightside Media", sector: "Marketing agency" },
    { name: "Lumen Health", sector: "Healthtech" },
    { name: "Cascade Foods", sector: "Consumer packaged goods" },
    { name: "Larkfield University", sector: "Academia" },
    { name: "Northwind Capital", sector: "Venture capital" },
    { name: "Greenspan Ventures", sector: "Venture capital" },
    // --- venues & sponsors ---
    { name: "Foundry Coworking", sector: "Coworking venue" },
    { name: "The Atrium", sector: "Event venue" },
    { name: "Novak & Vale", sector: "Law firm (sponsor)" },
    { name: "Terraform Coffee", sector: "Café (sponsor)" },
  ],

  contacts: [
    // --- climate / hardware founders & teams ---
    { name: "Maya Okonkwo", title: "Founder & CEO", company: "Solverra", location: "San Francisco, CA", tags: ["member", "super-connector", "climate"], note: "The Solverra founder — the person everyone wants to meet on climate hardware. Happy to advise early founders." },
    { name: "Priya Raman", title: "Head of Hardware", company: "Solverra", location: "Oakland, CA", tags: ["member", "hardware", "climate"] },
    { name: "Lucia Ferrari", title: "Climate Analyst", company: "Solverra", location: "San Francisco, CA", tags: ["member", "new", "climate"] },
    { name: "Theo Lindgren", title: "Founder", company: "Voltrail", location: "Berkeley, CA", tags: ["member", "hardware"], note: "Building battery hardware; introduce to the Solverra founder." },
    { name: "Devon Clarke", title: "Mechanical Engineer", company: "Voltrail", location: "Oakland, CA", tags: ["member", "new", "hardware"] },
    { name: "Tobias Reyes", title: "Robotics Engineer", company: "Voltrail", location: "Berkeley, CA", tags: ["member", "hardware"] },
    { name: "Sven Andersson", title: "Founder", company: "Orchard Robotics", location: "San Jose, CA", tags: ["member", "hardware"], note: "Orchard Robotics founder; pair with Voltrail for a hardware panel." },
    { name: "Ana Beltran", title: "Robotics Lead", company: "Orchard Robotics", location: "San Jose, CA", tags: ["member", "hardware"], note: "Into climate + hardware; introduce to the Solverra founder." },
    { name: "Dominic Vance", title: "Hardware Engineer", company: "Orchard Robotics", location: "San Jose, CA", tags: ["member", "new", "hardware"] },

    // --- AI / engineering ---
    { name: "Sam Whitfield", title: "Research Scientist", company: "Meridian Labs", location: "San Francisco, CA", tags: ["member", "speaker"], note: "Great speaker on ML evals; invite for the fall series." },
    { name: "Ibrahim Diallo", title: "ML Engineer", company: "Meridian Labs", location: "Berkeley, CA", tags: ["member", "new"] },
    { name: "Fatima Zahra", title: "Data Scientist", company: "Meridian Labs", location: "Oakland, CA", tags: ["member"] },
    { name: "Lena Vasquez", title: "Staff Engineer", company: "Bluepeak Cloud", location: "San Francisco, CA", tags: ["member"] },
    { name: "Grace Yoon", title: "Infrastructure Engineer", company: "Bluepeak Cloud", location: "Oakland, CA", tags: ["member"] },
    { name: "Kwame Mensah", title: "Solutions Engineer", company: "Bluepeak Cloud", location: "San Francisco, CA", tags: ["member"] },

    // --- design ---
    { name: "Iris Kowalski", title: "Design Lead", company: "Cobalt Design Co.", location: "San Francisco, CA", tags: ["member", "speaker", "design"], note: "Great speaker on design systems; invite for the spring series." },
    { name: "Valentina Cruz", title: "Founder", company: "Cobalt Design Co.", location: "San Francisco, CA", tags: ["member", "design"], note: "Runs the design studio; great for portfolio reviews with new designers." },
    { name: "Noah Adeyemi", title: "Product Designer", company: "Cobalt Design Co.", location: "Oakland, CA", tags: ["member", "design"] },
    { name: "Yuki Sato", title: "Brand Designer", company: "Brightside Media", location: "San Francisco, CA", tags: ["member", "design"] },
    { name: "Amara Okafor", title: "UX Designer", company: "Lumen Health", location: "Berkeley, CA", tags: ["member", "design"] },
    { name: "Camille Roux", title: "UX Researcher", company: "Lumen Health", location: "Berkeley, CA", tags: ["member", "new", "design"] },

    // --- marketing ---
    { name: "Derek Osei", title: "Head of Growth", company: "Brightside Media", location: "San Francisco, CA", tags: ["member"] },
    { name: "Tanya Bright", title: "Marketing Director", company: "Cascade Foods", location: "Oakland, CA", tags: ["member"] },
    { name: "Felix Moreau", title: "Content Lead", company: "Brightside Media", location: "San Francisco, CA", tags: ["member", "volunteer"] },
    { name: "Ethan Park", title: "Growth Marketer", company: "Cascade Foods", location: "Oakland, CA", tags: ["member", "new"] },
    { name: "Chloe Dubois", title: "Marketing Manager", company: "Payload Financial", location: "San Francisco, CA", tags: ["member"] },
    { name: "Nour Haddad", title: "Journalist", company: "Brightside Media", location: "San Francisco, CA", tags: ["member", "new"] },

    // --- investors / VC ---
    { name: "Helena Voss", title: "Partner", company: "Northwind Capital", location: "San Francisco, CA", tags: ["member", "super-connector"], note: "Writes seed checks in climate + hardware; loves warm intros to technical founders." },
    { name: "Marcus Chen", title: "Principal", company: "Northwind Capital", location: "Palo Alto, CA", tags: ["member"] },
    { name: "Rahul Kapoor", title: "Angel Investor", company: "Northwind Capital", location: "San Francisco, CA", tags: ["member"], note: "Active angel; wants deal flow from our founder members." },
    { name: "Sofia Marchetti", title: "General Partner", company: "Greenspan Ventures", location: "Menlo Park, CA", tags: ["member"], note: "Fintech + healthtech focus; introduce to the Payload and Lumen founders." },
    { name: "Bassam Haddad", title: "Angel Investor", company: "Greenspan Ventures", location: "San Francisco, CA", tags: ["member"] },
    { name: "Henrik Nilsson", title: "Investor", company: "Greenspan Ventures", location: "Menlo Park, CA", tags: ["member", "climate"] },

    // --- academia ---
    { name: "Dr. Elena Petrova", title: "Professor of Robotics", company: "Larkfield University", location: "Berkeley, CA", tags: ["member", "speaker"], note: "Speaks beautifully on autonomous systems; ideal conference keynote." },
    { name: "Dr. Omar Nasser", title: "Research Fellow", company: "Larkfield University", location: "Berkeley, CA", tags: ["member"] },
    { name: "Wei Zhang", title: "PhD Candidate", company: "Larkfield University", location: "Berkeley, CA", tags: ["member", "new"] },
    { name: "Rina Devi", title: "Professor of Economics", company: "Larkfield University", location: "Berkeley, CA", tags: ["member", "speaker", "fintech"] },
    { name: "Yasmin Farah", title: "Biotech Researcher", company: "Lumen Health", location: "San Francisco, CA", tags: ["member"] },

    // --- fintech / healthtech / food founders & teams ---
    { name: "Jordan Ellis", title: "Founder", company: "Payload Financial", location: "San Francisco, CA", tags: ["member", "fintech"], note: "Building payments infra; connect with Sofia at Greenspan." },
    { name: "Julian Vega", title: "Fintech Product Lead", company: "Payload Financial", location: "San Francisco, CA", tags: ["member", "new", "fintech"] },
    { name: "Rafael Costa", title: "Backend Engineer", company: "Payload Financial", location: "San Francisco, CA", tags: ["member", "fintech"] },
    { name: "Nadia Kovac", title: "Product Lead", company: "Tidebank", location: "Oakland, CA", tags: ["member", "fintech"] },
    { name: "Colin Frost", title: "Compliance Lead", company: "Tidebank", location: "San Francisco, CA", tags: ["member", "fintech"] },
    { name: "Ingrid Solberg", title: "Product Manager", company: "Tidebank", location: "Oakland, CA", tags: ["member", "fintech"] },
    { name: "Dr. Priyanka Nair", title: "Founder", company: "Lumen Health", location: "San Francisco, CA", tags: ["member", "founder"], note: "Digital-health founder; wants intros to healthtech investors." },
    { name: "Gabriel Santos", title: "Ops Lead", company: "Cascade Foods", location: "Oakland, CA", tags: ["member"] },
    { name: "Patrick O'Neill", title: "Sustainability Lead", company: "Cascade Foods", location: "Oakland, CA", tags: ["member", "climate"] },

    // --- external speakers ---
    { name: "Rosa Iglesias", title: "Author & Keynote Speaker", location: "San Francisco, CA", tags: ["speaker"], note: "Bestselling author on community; anchored last year's conference." },
    { name: "Tomas Herrera", title: "Design Systems Advocate", company: "Cobalt Design Co.", location: "Oakland, CA", tags: ["speaker", "design"] },
    { name: "Aditya Menon", title: "Startup Advisor", company: "Northwind Capital", location: "Palo Alto, CA", tags: ["speaker"] },

    // --- sponsors ---
    { name: "Karen Whitlock", title: "Partner", company: "Novak & Vale", location: "San Francisco, CA", tags: ["sponsor"], note: "Law-firm sponsor; covers the venue for the annual conference." },
    { name: "Bruce Tanaka", title: "Managing Partner", company: "Novak & Vale", location: "San Francisco, CA", tags: ["sponsor"] },
    { name: "Simone Laurent", title: "VP Marketing", company: "Bluepeak Cloud", location: "San Francisco, CA", tags: ["sponsor"], note: "Bluepeak sponsors our cloud credits; renew the partnership in Q3." },
    { name: "Hiro Nakamura", title: "Café Owner", company: "Terraform Coffee", location: "Oakland, CA", tags: ["sponsor"], note: "Donates coffee for every meetup; always give him a shoutout." },

    // --- venue staff & organizers ---
    { name: "Grant Holloway", title: "General Manager", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["organizer"] },
    { name: "Aria Fontaine", title: "Community Manager", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["organizer", "volunteer"], note: "My right hand at every meetup; runs check-in and name tags." },
    { name: "Caleb Stone", title: "Community Organizer", company: "Foundry Coworking", location: "Oakland, CA", tags: ["super-connector", "organizer"], note: "Runs a parallel maker community; cross-promote our events." },
    { name: "Leo Barnes", title: "Events Coordinator", company: "The Atrium", location: "San Francisco, CA", tags: ["organizer", "volunteer"] },
    { name: "Sana Qureshi", title: "Events Manager", company: "The Atrium", location: "San Francisco, CA", tags: ["organizer"] },

    // --- volunteers ---
    { name: "Mei Lin", title: "Volunteer", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["volunteer", "new"] },
    { name: "Oscar Delgado", title: "Volunteer", location: "Oakland, CA", tags: ["volunteer"] },
    { name: "Bianca Rossi", title: "Photographer", company: "Brightside Media", location: "San Francisco, CA", tags: ["volunteer"], note: "Shoots every event for us; get her the run-of-show early." },
  ],

  events: [
    {
      name: "Builders Meetup — March",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Priya Raman", "Theo Lindgren", "Iris Kowalski", "Noah Adeyemi",
        "Sam Whitfield", "Lena Vasquez", "Helena Voss", "Marcus Chen", "Jordan Ellis",
        "Nadia Kovac", "Aria Fontaine", "Hiro Nakamura", "Caleb Stone", "Dominic Vance",
        "Fatima Zahra", "Valentina Cruz", "Grant Holloway", "Ethan Park", "Mei Lin",
        "Chloe Dubois",
      ],
    },
    {
      name: "Builders Meetup — April",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Ana Beltran", "Devon Clarke", "Sam Whitfield", "Ibrahim Diallo",
        "Grace Yoon", "Iris Kowalski", "Yuki Sato", "Derek Osei", "Tanya Bright",
        "Helena Voss", "Sofia Marchetti", "Bassam Haddad", "Dr. Priyanka Nair", "Aria Fontaine",
        "Hiro Nakamura", "Caleb Stone", "Lucia Ferrari", "Tobias Reyes", "Amara Okafor",
        "Gabriel Santos",
      ],
    },
    {
      name: "Builders Meetup — May",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Priya Raman", "Theo Lindgren", "Jordan Ellis", "Nadia Kovac",
        "Colin Frost", "Iris Kowalski", "Camille Roux", "Felix Moreau", "Helena Voss",
        "Rahul Kapoor", "Henrik Nilsson", "Aria Fontaine", "Hiro Nakamura", "Caleb Stone",
        "Julian Vega", "Ingrid Solberg", "Kwame Mensah", "Patrick O'Neill", "Nour Haddad",
        "Rafael Costa",
      ],
    },
    {
      name: "ThreadCon Annual Conference",
      emoji: "🎤",
      tags: ["conference", "speaker", "sponsor"],
      attendees: [
        "Maya Okonkwo", "Theo Lindgren", "Sven Andersson", "Ana Beltran", "Iris Kowalski",
        "Tomas Herrera", "Rosa Iglesias", "Dr. Elena Petrova", "Aditya Menon", "Sam Whitfield",
        "Helena Voss", "Marcus Chen", "Sofia Marchetti", "Karen Whitlock", "Bruce Tanaka",
        "Simone Laurent", "Hiro Nakamura", "Aria Fontaine", "Leo Barnes", "Bianca Rossi",
        "Sana Qureshi", "Jordan Ellis", "Dr. Priyanka Nair", "Rina Devi", "Dr. Omar Nasser",
        "Wei Zhang", "Caleb Stone", "Rahul Kapoor", "Valentina Cruz", "Yasmin Farah",
      ],
    },
    {
      name: "Founders Dinner — Spring",
      emoji: "🍽️",
      tags: ["dinner", "founder", "investor"],
      attendees: [
        "Maya Okonkwo", "Theo Lindgren", "Jordan Ellis", "Dr. Priyanka Nair", "Sven Andersson",
        "Valentina Cruz", "Helena Voss", "Marcus Chen", "Sofia Marchetti", "Bassam Haddad",
        "Rahul Kapoor", "Henrik Nilsson",
      ],
    },
    {
      name: "Founders Dinner — Summer",
      emoji: "🍽️",
      tags: ["dinner", "founder", "investor"],
      attendees: [
        "Maya Okonkwo", "Jordan Ellis", "Sven Andersson", "Dr. Priyanka Nair", "Theo Lindgren",
        "Helena Voss", "Sofia Marchetti", "Aditya Menon", "Rahul Kapoor", "Caleb Stone",
        "Iris Kowalski", "Valentina Cruz",
      ],
    },
    {
      name: "Volunteer & Organizer Kickoff",
      emoji: "🙌",
      tags: ["volunteer", "organizer"],
      attendees: [
        "Aria Fontaine", "Leo Barnes", "Mei Lin", "Oscar Delgado", "Bianca Rossi",
        "Grant Holloway", "Sana Qureshi", "Caleb Stone", "Felix Moreau", "Hiro Nakamura",
      ],
    },
  ],
});
