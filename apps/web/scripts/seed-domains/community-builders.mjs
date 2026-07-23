import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Noah Kim's world: a super-connector who runs a builder community. His value
// isn't any one company — it's the graph. Members work all over the map
// (climate, hardware, AI, design, fintech, healthtech, academia), and they
// thread together through the recurring rituals he hosts: a monthly meetup,
// an annual conference, and a founders' dinner series. Speakers, sponsors and
// volunteers keep the machine running. Most notes are intro-maker notes: who to
// connect to whom.
//
// The hero is Maya Okonkwo — a climate-hardware founder and the community's
// densest node. The point of this persona is the GRAPH: Maya is wired to a
// founder she should meet, the mutual who brought her in, a co-organizer, and
// the members she mentors. Her profile is the money shot (facts + receipts +
// follow-ups + overdue cadence), and the graph around her is the value.

await seedDomainAccount({
  slug: "community-builders",
  displayName: "Noah Kim — Community Builder (demo)",

  relationshipTypes: [
    { slug: "connected", forward: "connected", inverse: "connected" },
  ],

  companies: [
    // --- members' varied employers ---
    { name: "Thermrail", sector: "Climate hardware" },
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
    // ---- HERO: super-connector climate-hardware founder ----
    {
      name: "Maya Okonkwo",
      hero: true,
      title: "Founder",
      company: "Thermrail",
      location: "San Francisco, CA",
      tags: ["member", "super-connector", "climate", "hardware"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 45,
      notes: [
        "Met Maya at the March Builders Meetup — she walked in already knowing half the room. Founder of Thermrail, doing climate-hardware; the kind of person who leaves an event having made five intros for other people.",
        "Who Maya should meet: Naomi Okafor at Solverra (climate hardware, complementary — kept meaning to introduce them), Helena Voss for a seed conversation, and Theo at Voltrail on the battery side. She's actively asking for more hardware founders.",
        "Maya offered to speak — pitched a talk on building a hardware team from scratch. Slot her into the spring series; she said any month works.",
      ],
      facts: [
        { type: "intent", text: "Building a climate-hardware startup; loves making intros and wants to meet more hardware founders." },
        { type: "role", text: "Founder of Thermrail; ex-Tesla hardware." },
        { type: "personal", text: "Runs a monthly hardware dinner; hugely generous with intros." },
        { type: "preference", text: "Into climate + hardware + industrial design." },
      ],
      followUps: [
        { action: "Introduce Maya to the Solverra founder", dueHint: "this week" },
        { action: "Invite Maya to speak at the spring series", dueHint: "this month" },
      ],
    },

    // ---- hero's circle (drives the graph) ----
    { name: "Naomi Okafor", title: "Founder & CEO", company: "Solverra", location: "San Francisco, CA", tags: ["member", "founder", "climate"], cadenceDays: 30, lastReachedOutDaysAgo: 40, note: "The Solverra founder — climate hardware, complementary to Thermrail. Maya keeps meaning to meet her; make the intro.", facts: [{ type: "intent", text: "Scaling Solverra's climate-hardware line; open to co-marketing with other hardware founders." }, { type: "role", text: "Founder & CEO of Solverra; raising a seed round." }], followUps: [{ action: "Introduce Naomi to Helena for a seed conversation", dueHint: "this week" }] },
    { name: "Helena Voss", title: "Partner", company: "Northwind Capital", location: "San Francisco, CA", tags: ["member", "super-connector", "investor"], cadenceDays: 30, lastReachedOutDaysAgo: 38, note: "The mutual who first brought Maya into the community. Writes seed checks in climate + hardware; loves warm intros to technical founders.", facts: [{ type: "role", text: "Partner at Northwind Capital; leads their climate + hardware seed practice." }, { type: "preference", text: "Only takes warm intros; wants technical founders, not decks." }] },
    { name: "Caleb Stone", title: "Community Organizer", company: "Foundry Coworking", location: "Oakland, CA", tags: ["organizer", "super-connector"], cadenceDays: 21, lastReachedOutDaysAgo: 28, note: "Co-organizes the meetup with me and runs a parallel maker community — cross-promote every event. My most reliable partner." },
    { name: "Lucia Ferrari", title: "Climate Analyst", company: "Solverra", location: "San Francisco, CA", tags: ["member", "new", "climate"], note: "New member Maya is mentoring — sharp on climate policy, needs founder introductions." },
    { name: "Theo Lindgren", title: "Founder", company: "Voltrail", location: "Berkeley, CA", tags: ["member", "hardware", "founder"], cadenceDays: 21, lastReachedOutDaysAgo: 30, note: "Building battery hardware; worked alongside Maya on a hardware panel. Introduce him to Naomi at Solverra.", facts: [{ type: "role", text: "Founder of Voltrail; battery hardware." }, { type: "intent", text: "Looking for a manufacturing partner and a lead hardware hire." }] },
    { name: "Devon Clarke", title: "Mechanical Engineer", company: "Voltrail", location: "Oakland, CA", tags: ["member", "new", "hardware"], note: "Junior engineer Maya is mentoring; wants to move from IC to founding-engineer track." },
    { name: "Iris Kowalski", title: "Design Lead", company: "Cobalt Design Co.", location: "San Francisco, CA", tags: ["member", "speaker", "design"], cadenceDays: 30, lastReachedOutDaysAgo: 36, note: "Old friend of Maya's and a great speaker on design systems.", followUps: [{ action: "Invite Iris to run a design-systems workshop", dueHint: "spring series" }] },

    // ---- climate / hardware members ----
    { name: "Priya Raman", title: "Head of Hardware", company: "Solverra", location: "Oakland, CA", tags: ["member", "hardware", "climate"] },
    { name: "Tobias Reyes", title: "Robotics Engineer", company: "Voltrail", location: "Berkeley, CA", tags: ["member", "hardware"] },
    { name: "Sven Andersson", title: "Founder", company: "Orchard Robotics", location: "San Jose, CA", tags: ["member", "hardware", "founder"], cadenceDays: 30, lastReachedOutDaysAgo: 44, note: "Orchard Robotics founder; pair with Voltrail for a hardware panel." },
    { name: "Ana Beltran", title: "Robotics Lead", company: "Orchard Robotics", location: "San Jose, CA", tags: ["member", "hardware", "climate"], note: "Into climate + hardware; introduce to the Thermrail and Solverra founders." },
    { name: "Patrick O'Neill", title: "Sustainability Lead", company: "Cascade Foods", location: "Oakland, CA", tags: ["member", "climate"] },

    // ---- AI / engineering members ----
    { name: "Sam Whitfield", title: "Research Scientist", company: "Meridian Labs", location: "San Francisco, CA", tags: ["member", "speaker"], note: "Great speaker on ML evals; invite for the fall series.", facts: [{ type: "personal", text: "Nervous first-time speaker but excellent one-on-one; give him a small room." }], followUps: [{ action: "Confirm Sam's talk slot for the fall series", dueHint: "next month" }] },
    { name: "Ibrahim Diallo", title: "ML Engineer", company: "Meridian Labs", location: "Berkeley, CA", tags: ["member", "new"] },
    { name: "Lena Vasquez", title: "Staff Engineer", company: "Bluepeak Cloud", location: "San Francisco, CA", tags: ["member"] },
    { name: "Grace Yoon", title: "Infrastructure Engineer", company: "Bluepeak Cloud", location: "Oakland, CA", tags: ["member"] },

    // ---- design members ----
    { name: "Valentina Cruz", title: "Founder", company: "Cobalt Design Co.", location: "San Francisco, CA", tags: ["member", "design", "founder"], note: "Runs the design studio; great for portfolio reviews with new designers." },
    { name: "Noah Adeyemi", title: "Product Designer", company: "Cobalt Design Co.", location: "Oakland, CA", tags: ["member", "design"] },
    { name: "Yuki Sato", title: "Brand Designer", company: "Brightside Media", location: "San Francisco, CA", tags: ["member", "design"] },
    { name: "Amara Okafor", title: "UX Designer", company: "Lumen Health", location: "Berkeley, CA", tags: ["member", "design"] },

    // ---- marketing members ----
    { name: "Derek Osei", title: "Head of Growth", company: "Brightside Media", location: "San Francisco, CA", tags: ["member"] },
    { name: "Tanya Bright", title: "Marketing Director", company: "Cascade Foods", location: "Oakland, CA", tags: ["member"] },
    { name: "Chloe Dubois", title: "Marketing Manager", company: "Payload Financial", location: "San Francisco, CA", tags: ["member"] },

    // ---- fintech / healthtech founders & teams ----
    { name: "Jordan Ellis", title: "Founder", company: "Payload Financial", location: "San Francisco, CA", tags: ["member", "fintech", "founder"], cadenceDays: 30, lastReachedOutDaysAgo: 45, note: "Building payments infra; connect with Sofia at Greenspan.", facts: [{ type: "intent", text: "Raising a Series A for Payload; wants intros to fintech-focused GPs." }], followUps: [{ action: "Connect Jordan with Sofia at Greenspan", dueHint: "this week" }] },
    { name: "Julian Vega", title: "Fintech Product Lead", company: "Payload Financial", location: "San Francisco, CA", tags: ["member", "new", "fintech"] },
    { name: "Nadia Kovac", title: "Product Lead", company: "Tidebank", location: "Oakland, CA", tags: ["member", "fintech"] },
    { name: "Colin Frost", title: "Compliance Lead", company: "Tidebank", location: "San Francisco, CA", tags: ["member", "fintech"] },
    { name: "Dr. Priyanka Nair", title: "Founder", company: "Lumen Health", location: "San Francisco, CA", tags: ["member", "founder", "healthtech"], cadenceDays: 30, lastReachedOutDaysAgo: 40, note: "Digital-health founder; wants intros to healthtech investors.", followUps: [{ action: "Introduce Priyanka to healthtech investors", dueHint: "next month" }] },

    // ---- investors / VC members ----
    { name: "Marcus Chen", title: "Principal", company: "Northwind Capital", location: "Palo Alto, CA", tags: ["member", "investor"] },
    { name: "Rahul Kapoor", title: "Angel Investor", company: "Northwind Capital", location: "San Francisco, CA", tags: ["member", "investor"], cadenceDays: 45, lastReachedOutDaysAgo: 55, note: "Active angel; wants deal flow from our founder members." },
    { name: "Sofia Marchetti", title: "General Partner", company: "Greenspan Ventures", location: "Menlo Park, CA", tags: ["member", "investor"], cadenceDays: 45, lastReachedOutDaysAgo: 60, note: "Fintech + healthtech focus; introduce to the Payload and Lumen founders." },
    { name: "Henrik Nilsson", title: "Investor", company: "Greenspan Ventures", location: "Menlo Park, CA", tags: ["member", "investor", "climate"] },

    // ---- academia members ----
    { name: "Dr. Elena Petrova", title: "Professor of Robotics", company: "Larkfield University", location: "Berkeley, CA", tags: ["member", "speaker"], note: "Speaks beautifully on autonomous systems; ideal conference keynote." },
    { name: "Rina Devi", title: "Professor of Economics", company: "Larkfield University", location: "Berkeley, CA", tags: ["member", "speaker", "fintech"] },

    // ---- external speakers ----
    { name: "Rosa Iglesias", title: "Author & Keynote Speaker", location: "San Francisco, CA", tags: ["speaker"], note: "Bestselling author on community; anchored last year's conference." },
    { name: "Aditya Menon", title: "Startup Advisor", company: "Northwind Capital", location: "Palo Alto, CA", tags: ["speaker"] },

    // ---- sponsors ----
    { name: "Karen Whitlock", title: "Partner", company: "Novak & Vale", location: "San Francisco, CA", tags: ["sponsor"], note: "Law-firm sponsor; covers the venue for the annual conference." },
    { name: "Simone Laurent", title: "VP Marketing", company: "Bluepeak Cloud", location: "San Francisco, CA", tags: ["sponsor"], note: "Bluepeak sponsors our cloud credits; renew the partnership in Q3.", followUps: [{ action: "Renew the Bluepeak cloud-credits sponsorship", dueHint: "Q3" }] },
    { name: "Hiro Nakamura", title: "Café Owner", company: "Terraform Coffee", location: "Oakland, CA", tags: ["sponsor"], note: "Donates coffee for every meetup; always give him a shoutout." },

    // ---- venue staff & organizers ----
    { name: "Grant Holloway", title: "General Manager", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["organizer"] },
    { name: "Aria Fontaine", title: "Community Manager", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["organizer", "volunteer"], note: "My right hand at every meetup; runs check-in and name tags." },
    { name: "Leo Barnes", title: "Events Coordinator", company: "The Atrium", location: "San Francisco, CA", tags: ["organizer", "volunteer"] },

    // ---- volunteers ----
    { name: "Felix Moreau", title: "Content Lead", company: "Brightside Media", location: "San Francisco, CA", tags: ["member", "volunteer"] },
    { name: "Mei Lin", title: "Volunteer", company: "Foundry Coworking", location: "San Francisco, CA", tags: ["volunteer", "new"] },
    { name: "Bianca Rossi", title: "Photographer", company: "Brightside Media", location: "San Francisco, CA", tags: ["volunteer"], note: "Shoots every event for us; get her the run-of-show early." },
  ],

  events: [
    {
      name: "Builders Meetup — March",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Naomi Okafor", "Priya Raman", "Theo Lindgren", "Iris Kowalski",
        "Noah Adeyemi", "Sam Whitfield", "Lena Vasquez", "Helena Voss", "Marcus Chen",
        "Jordan Ellis", "Nadia Kovac", "Aria Fontaine", "Hiro Nakamura", "Caleb Stone",
        "Valentina Cruz", "Grant Holloway", "Mei Lin", "Chloe Dubois", "Lucia Ferrari",
      ],
    },
    {
      name: "Builders Meetup — April",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Ana Beltran", "Devon Clarke", "Sam Whitfield", "Ibrahim Diallo",
        "Grace Yoon", "Iris Kowalski", "Yuki Sato", "Derek Osei", "Tanya Bright",
        "Helena Voss", "Sofia Marchetti", "Dr. Priyanka Nair", "Aria Fontaine", "Hiro Nakamura",
        "Caleb Stone", "Lucia Ferrari", "Tobias Reyes", "Amara Okafor", "Patrick O'Neill",
      ],
    },
    {
      name: "Builders Meetup — May",
      emoji: "🌃",
      tags: ["meetup", "member"],
      attendees: [
        "Maya Okonkwo", "Naomi Okafor", "Priya Raman", "Theo Lindgren", "Jordan Ellis",
        "Nadia Kovac", "Colin Frost", "Iris Kowalski", "Felix Moreau", "Helena Voss",
        "Rahul Kapoor", "Henrik Nilsson", "Aria Fontaine", "Hiro Nakamura", "Caleb Stone",
        "Julian Vega", "Devon Clarke", "Bianca Rossi", "Sam Whitfield", "Grace Yoon",
      ],
    },
    {
      name: "ThreadCon Annual Conference",
      emoji: "🎤",
      tags: ["conference", "speaker", "sponsor"],
      attendees: [
        "Maya Okonkwo", "Naomi Okafor", "Theo Lindgren", "Sven Andersson", "Ana Beltran",
        "Iris Kowalski", "Rosa Iglesias", "Dr. Elena Petrova", "Aditya Menon", "Sam Whitfield",
        "Helena Voss", "Marcus Chen", "Sofia Marchetti", "Karen Whitlock", "Simone Laurent",
        "Hiro Nakamura", "Aria Fontaine", "Leo Barnes", "Bianca Rossi", "Jordan Ellis",
        "Dr. Priyanka Nair", "Rina Devi", "Caleb Stone", "Rahul Kapoor", "Valentina Cruz",
      ],
    },
    {
      name: "Founders Dinner — Spring",
      emoji: "🍽️",
      tags: ["dinner", "founder", "investor"],
      attendees: [
        "Maya Okonkwo", "Naomi Okafor", "Theo Lindgren", "Jordan Ellis", "Dr. Priyanka Nair",
        "Sven Andersson", "Valentina Cruz", "Helena Voss", "Marcus Chen", "Sofia Marchetti",
        "Rahul Kapoor", "Henrik Nilsson",
      ],
    },
    {
      name: "Founders Dinner — Summer",
      emoji: "🍽️",
      tags: ["dinner", "founder", "investor"],
      attendees: [
        "Maya Okonkwo", "Naomi Okafor", "Jordan Ellis", "Sven Andersson", "Dr. Priyanka Nair",
        "Theo Lindgren", "Helena Voss", "Sofia Marchetti", "Aditya Menon", "Rahul Kapoor",
        "Caleb Stone", "Iris Kowalski",
      ],
    },
  ],

  relationships: [
    // hero, densely connected (7 edges touching Maya)
    { from: "Maya Okonkwo", predicate: "introduced_to", to: "Naomi Okafor" },
    { from: "Maya Okonkwo", predicate: "introduced_by", to: "Helena Voss" },
    { from: "Maya Okonkwo", predicate: "colleague_of", to: "Caleb Stone" },
    { from: "Maya Okonkwo", predicate: "mentor_of", to: "Lucia Ferrari" },
    { from: "Maya Okonkwo", predicate: "mentor_of", to: "Devon Clarke" },
    { from: "Maya Okonkwo", predicate: "worked_with", to: "Theo Lindgren" },
    { from: "Maya Okonkwo", predicate: "friend_of", to: "Iris Kowalski" },
    // the rest of the graph
    { from: "Jordan Ellis", predicate: "introduced_by", to: "Helena Voss" },
    { from: "Sofia Marchetti", predicate: "worked_with", to: "Marcus Chen" },
    { from: "Caleb Stone", predicate: "friend_of", to: "Aria Fontaine" },
    { from: "Sven Andersson", predicate: "colleague_of", to: "Ana Beltran" },
    { from: "Theo Lindgren", predicate: "connected", to: "Naomi Okafor" },
  ],
});
