import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// Rich executive-search demo: a hero passive candidate (Sofia Delgado) fleshed
// out for the contact-profile money shot — screening receipts, what she really
// wants, when she'll be open — plus a two-sided pipeline (candidates + hiring
// managers) so the dashboard's "threads to pull today" and follow-up tiles fill.
await seedDomainAccount({
  slug: "recruiting",
  displayName: "Tom Bradley — Executive Search (demo)",

  relationshipTypes: [
    { slug: "referred_by", forward: "referred by", inverse: "referred" },
  ],

  companies: [
    // Employers where candidates currently work
    { name: "Nimbus Data", sector: "Cloud Infrastructure" },
    { name: "Fernwood Labs", sector: "AI / Machine Learning" },
    { name: "Aster Robotics", sector: "Robotics" },
    { name: "Copperline Retail", sector: "E-commerce" },
    { name: "Tidewater Analytics", sector: "Data & Analytics" },
    { name: "Harborstone Bank", sector: "Financial Services" },
    { name: "Vellum Media", sector: "Media & Publishing" },
    // Client companies that hire
    { name: "Kite Financial", sector: "Fintech" },
    { name: "Solaris Grid", sector: "Clean Energy" },
    { name: "Meridian Logistics", sector: "Supply Chain" },
    { name: "Northwind Security", sector: "Cybersecurity" },
    { name: "Cobalt Studios", sector: "Gaming" },
    { name: "Everest Biosciences", sector: "Biotech" },
    { name: "Lumen Education", sector: "EdTech" },
  ],

  contacts: [
    // ---- HERO ----
    {
      name: "Sofia Delgado",
      hero: true,
      title: "Staff Engineer",
      company: "Fernwood Labs",
      location: "San Francisco, CA",
      tags: ["candidate", "passive", "open-to-move", "senior"],
      cadenceDays: 30,
      lastReachedOutDaysAgo: 47,
      notes: [
        "Screening call — happy at Fernwood day-to-day but hitting a ceiling: no Staff+ path and the infra org keeps getting reorged under her. Not actively looking, but picks up when I call. Would move for the right mission and scope.",
        "What she actually wants: a Staff or Principal seat with real architectural ownership, remote-first, at a company solving something she cares about (climate, health, or fintech-for-the-underbanked). Comp target ~$210k base; equity matters but she's been burned by paper before. Explicitly does NOT want a manager track.",
        "Timing: her team ships a big platform launch end of Q2. She won't seriously interview before then — too much in flight and she doesn't want to leave it half-done. Told me to circle back right after; she'll have bandwidth and a clean story to tell.",
      ],
      facts: [
        { type: "intent", text: "Open to a Staff/Principal role — remote, mission-driven, ~$210k." },
        { type: "role", text: "Staff Engineer at Fernwood Labs." },
        { type: "personal", text: "New baby; won't relocate this year." },
        { type: "preference", text: "Wants scope over title; hates take-home tests." },
      ],
      followUps: [
        { action: "Send Sofia the fintech Staff role", dueHint: "this week" },
        { action: "Check in after her Q2 launch — she's open then", dueHint: "early Q3" },
      ],
    },

    // ---- hero's circle (for relationships) ----
    { name: "Priya Raghunathan", title: "Engineering Manager", company: "Fernwood Labs", location: "San Francisco, CA", tags: ["candidate", "manager", "hero-circle"], cadenceDays: 45, lastReachedOutDaysAgo: 60, note: "Sofia's manager at Fernwood. Good relationship — not poaching from her, but she's a strong candidate herself and a great backchannel reference." },
    { name: "Marcus Webb", title: "Staff Software Engineer", company: "Nimbus Data", location: "Austin, TX", tags: ["candidate", "passive", "hero-circle"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Worked with Sofia at her last company — vouches for her hard. Deep ML infra background; not looking now, reconnect Q1." },
    { name: "David Chen", title: "Engineering Lead", company: "Solaris Grid", location: "Phoenix, AZ", tags: ["candidate", "placed", "referral-source"], note: "Placed 2023 at Solaris Grid; thriving. Referred Sofia to me — they went through bootcamp together. Best referral source I have." },
    { name: "Ethan Brooks", title: "CTO (client)", company: "Kite Financial", location: "New York, NY", tags: ["hiring-manager", "client"], cadenceDays: 21, lastReachedOutDaysAgo: 18, note: "Building a mission-driven fintech platform team — exactly Sofia's profile. Would move fast for a Staff eng with her background.", followUps: [{ action: "Float Sofia to Ethan once she's post-launch", dueHint: "early Q3" }] },

    // ---- candidates: engineering ----
    { name: "Elena Vasquez", title: "Engineering Manager", company: "Aster Robotics", location: "Boston, MA", tags: ["candidate", "open-to-move"], cadenceDays: 21, lastReachedOutDaysAgo: 30, note: "Wants her first Director role; frustrated with the flat org at Aster.", followUps: [{ action: "Send Elena the Solaris Grid eng leadership brief", dueHint: "this week" }] },
    { name: "Dele Okafor", title: "Senior Frontend Engineer", company: "Copperline Retail", location: "Chicago, IL", tags: ["candidate", "silver-medalist"], note: "Silver-medalist for the Kite Financial UI role — strong, lost on location. Keep warm for the next frontend req." },
    { name: "Hana Kobayashi", title: "Platform Engineer", company: "Tidewater Analytics", location: "Seattle, WA", tags: ["candidate", "passive"], cadenceDays: 45, lastReachedOutDaysAgo: 58 },
    { name: "Owen Fitzgerald", title: "Principal Engineer", company: "Harborstone Bank", location: "Charlotte, NC", tags: ["candidate", "passive"], note: "20 yrs in fintech; only moves for a Principal/Architect title bump." },
    { name: "Yara Haddad", title: "Machine Learning Engineer", company: "Fernwood Labs", location: "San Francisco, CA", tags: ["candidate", "open-to-move"], cadenceDays: 30, lastReachedOutDaysAgo: 44 },
    { name: "Arjun Kapoor", title: "Head of Data", company: "Harborstone Bank", location: "Charlotte, NC", tags: ["candidate", "passive", "open-to-move"], cadenceDays: 30, lastReachedOutDaysAgo: 52, note: "Exploring quietly; conflict with the new CTO. Handle discreetly — do not contact at work.", followUps: [{ action: "Line up a discreet coffee with Arjun off-site", dueHint: "next week" }] },
    { name: "Rafael Santos", title: "Group Product Manager", company: "Nimbus Data", location: "Austin, TX", tags: ["candidate", "passive"], cadenceDays: 30, lastReachedOutDaysAgo: 39 },
    { name: "Gabriel Silva", title: "Mobile Engineer", company: "Vellum Media", location: "Miami, FL", tags: ["candidate", "open-to-move"] },
    { name: "Felix Bauer", title: "Security Engineer", company: "Nimbus Data", location: "Remote", tags: ["candidate", "silver-medalist"], note: "Silver-medalist for the Northwind Security role; keep warm.", followUps: [{ action: "Re-approach Felix when Northwind opens its next req", dueHint: "this month" }] },
    { name: "Benjamin Ortiz", title: "Data Scientist", company: "Tidewater Analytics", location: "New York, NY", tags: ["candidate", "open-to-move"], cadenceDays: 21, lastReachedOutDaysAgo: 33 },

    // ---- candidates: placed (now at client companies) ----
    { name: "Isabelle Rousseau", title: "Senior Backend Engineer", company: "Kite Financial", location: "New York, NY", tags: ["candidate", "placed"], note: "Placed at Kite Financial 2024 — thriving under Ethan. Likely a future client herself." },
    { name: "Kwame Boateng", title: "Security Engineer", company: "Northwind Security", location: "Washington, DC", tags: ["candidate", "placed"], note: "Placed early 2025; still in the guarantee period — keep close." },
    { name: "Nadia Petrova", title: "Product Manager", company: "Meridian Logistics", location: "Dallas, TX", tags: ["candidate", "placed"] },

    // ---- candidates: design, product & GTM ----
    { name: "Jonas Berg", title: "Design Lead", company: "Vellum Media", location: "Portland, OR", tags: ["candidate", "passive", "open-to-move"], note: "Portfolio is exceptional; would consider a client-side Head of Design role.", followUps: [{ action: "Send Jonas the Cobalt Studios Head of Design spec", dueHint: "this week" }] },
    { name: "Theo Laurent", title: "Product Manager", company: "Copperline Retail", location: "Chicago, IL", tags: ["candidate", "silver-medalist"], note: "Silver-medalist for the Cobalt Studios PM role." },
    { name: "Renata Cruz", title: "Chief of Staff", company: "Aster Robotics", location: "Boston, MA", tags: ["candidate", "open-to-move"], cadenceDays: 30, lastReachedOutDaysAgo: 46, note: "Ex-consultant; wants a COO track. Watch for the right seed-stage client." },
    { name: "Aisha Bello", title: "Head of Marketing", company: "Copperline Retail", location: "Remote", tags: ["candidate", "passive"] },
    { name: "Zoe Nakamura", title: "People Operations Lead", company: "Vellum Media", location: "Remote", tags: ["candidate", "passive"], cadenceDays: 45, lastReachedOutDaysAgo: 61 },

    // ---- hiring managers / clients ----
    { name: "Diana Voss", title: "VP People (client)", company: "Kite Financial", location: "New York, NY", tags: ["hiring-manager", "client"], cadenceDays: 14, lastReachedOutDaysAgo: 20, note: "Best client relationship I have. Hires 6–8 eng/yr. Isabelle's skip-level." },
    { name: "Melissa Tan", title: "Talent Acquisition Lead (client)", company: "Kite Financial", location: "New York, NY", tags: ["hiring-manager", "client"], cadenceDays: 14, lastReachedOutDaysAgo: 19 },
    { name: "Naomi Reyes", title: "Head of Talent (client)", company: "Solaris Grid", location: "Phoenix, AZ", tags: ["hiring-manager", "client"], cadenceDays: 21, lastReachedOutDaysAgo: 24, note: "Ramping a new engineering hub — 4 open reqs for Q3.", followUps: [{ action: "Send Naomi the shortlist for the Solaris Grid platform reqs", dueHint: "today" }] },
    { name: "Oliver Grant", title: "VP Engineering (client)", company: "Solaris Grid", location: "Phoenix, AZ", tags: ["hiring-manager", "client"] },
    { name: "Bianca Costa", title: "Director of Recruiting (client)", company: "Meridian Logistics", location: "Dallas, TX", tags: ["hiring-manager", "client"], cadenceDays: 21, lastReachedOutDaysAgo: 28 },
    { name: "Sadie Whitfield", title: "Head of People (client)", company: "Cobalt Studios", location: "Austin, TX", tags: ["hiring-manager", "client"], note: "First-time hiring exec; needs a lot of hand-holding but loyal." },
    { name: "Simon Yardley", title: "Studio Head (client)", company: "Cobalt Studios", location: "Austin, TX", tags: ["hiring-manager", "client"], note: "Scaling a new studio; wants senior PMs and gameplay engineers.", followUps: [{ action: "Book the Cobalt Studios kickoff intake call with Simon", dueHint: "this week" }] },
    { name: "Gordon Pryce", title: "CISO (client)", company: "Northwind Security", location: "Washington, DC", tags: ["hiring-manager", "client"], cadenceDays: 30, lastReachedOutDaysAgo: 41, note: "Only hires senior security talent; slow process, high bar." },
    { name: "Charlotte Meyer", title: "VP People (client)", company: "Everest Biosciences", location: "Cambridge, MA", tags: ["hiring-manager", "client"] },
    { name: "Dr. Alan Frost", title: "Head of R&D (client)", company: "Everest Biosciences", location: "Cambridge, MA", tags: ["hiring-manager", "client"], note: "Tough to place for — very specific ML+biology profile." },
    { name: "Wendy Chukwu", title: "Chief People Officer (client)", company: "Lumen Education", location: "Remote", tags: ["hiring-manager", "client"], cadenceDays: 21, lastReachedOutDaysAgo: 27, note: "New logo, signed 2025. Building out product + eng from scratch." },
    { name: "Paul Hargreaves", title: "Head of Engineering (client)", company: "Lumen Education", location: "Boston, MA", tags: ["hiring-manager", "client"] },
  ],

  events: [
    {
      name: "Austin Backend Meetup",
      emoji: "🛠️",
      tags: ["meetup", "engineering"],
      attendees: ["Marcus Webb", "Rafael Santos", "Felix Bauer", "Simon Yardley", "Gabriel Silva"],
    },
    {
      name: "Spring Tech Career Fair",
      emoji: "🎪",
      tags: ["career-fair", "hiring"],
      attendees: ["Dele Okafor", "Gabriel Silva", "Benjamin Ortiz", "Naomi Reyes", "Bianca Costa", "Melissa Tan", "Wendy Chukwu"],
    },
    {
      name: "State University Alumni Night",
      emoji: "🎓",
      tags: ["alumni", "networking"],
      attendees: ["Sofia Delgado", "Marcus Webb", "Yara Haddad", "David Chen", "Ethan Brooks", "Charlotte Meyer"],
    },
    {
      name: "Cloud & Infra Summit",
      emoji: "☁️",
      tags: ["conference", "engineering"],
      attendees: ["Hana Kobayashi", "Priya Raghunathan", "Owen Fitzgerald", "Oliver Grant", "Paul Hargreaves"],
    },
    {
      name: "Fintech Hiring Mixer",
      emoji: "💳",
      tags: ["mixer", "fintech", "hiring"],
      attendees: ["Sofia Delgado", "Isabelle Rousseau", "Owen Fitzgerald", "Arjun Kapoor", "Diana Voss", "Ethan Brooks", "Melissa Tan"],
    },
  ],

  relationships: [
    { from: "Sofia Delgado", predicate: "reports_to", to: "Priya Raghunathan" },
    { from: "Sofia Delgado", predicate: "colleague_of", to: "Marcus Webb" },
    { from: "Sofia Delgado", predicate: "referred_by", to: "David Chen" },
    { from: "Priya Raghunathan", predicate: "manages", to: "Yara Haddad" },
    { from: "Ethan Brooks", predicate: "manages", to: "Isabelle Rousseau" },
    { from: "David Chen", predicate: "mentor_of", to: "Kwame Boateng" },
    { from: "Diana Voss", predicate: "colleague_of", to: "Ethan Brooks" },
    { from: "Naomi Reyes", predicate: "introduced_by", to: "David Chen" },
    { from: "Marcus Webb", predicate: "worked_with", to: "Elena Vasquez" },
  ],
});
