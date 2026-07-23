import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

await seedDomainAccount({
  slug: "venture-capital",
  displayName: "Ayesha Rahman — Partner, Seed Fund (demo)",
  companies: [
    // --- portfolio startups ---
    { name: "Nimbus Ledger", sector: "Fintech" },
    { name: "Verdant Grid", sector: "Climate" },
    { name: "Pulse Health", sector: "Healthtech" },
    { name: "Forge AI", sector: "AI / DevTools" },
    { name: "Lumen Commerce", sector: "Consumer" },
    { name: "Cobalt Security", sector: "Security" },
    { name: "Rootstock Bio", sector: "Biotech" },
    { name: "Tidepool Logistics", sector: "Logistics" },
    // --- prospect / tracking startups ---
    { name: "Helios Solar", sector: "Climate" },
    { name: "Kairos Payments", sector: "Fintech" },
    { name: "Meridian Robotics", sector: "Robotics" },
    { name: "Aster Learning", sector: "EdTech" },
    { name: "Quill Docs", sector: "SaaS" },
    { name: "Saffron Kitchen", sector: "Consumer" },
    // --- co-investor funds ---
    { name: "Northwind Capital", sector: "Venture Capital" },
    { name: "Harbor Line Ventures", sector: "Venture Capital" },
    { name: "Belmont Partners", sector: "Venture Capital" },
    // --- accelerator ---
    { name: "Ignite Labs", sector: "Accelerator" },
  ],
  contacts: [
    // --- portfolio founders ---
    { name: "Ayaan Qureshi", title: "Founder & CEO", company: "Nimbus Ledger", location: "London", tags: ["founder", "portfolio"], note: "Led our seed check. Sharp on unit economics; wants a strong fintech co-investor for the A." },
    { name: "Freya Lindqvist", title: "Co-founder / CTO", company: "Nimbus Ledger", location: "London", tags: ["founder", "portfolio"] },
    { name: "Diego Marchetti", title: "Founder & CEO", company: "Verdant Grid", location: "Berlin", tags: ["founder", "portfolio", "raising"], note: "Extending seed into a bridge; grid-balancing pilots live with two utilities. Intro to climate LPs." },
    { name: "Nadia Boulos", title: "Co-founder / CTO", company: "Verdant Grid", location: "Berlin", tags: ["founder", "portfolio"] },
    { name: "Imani Okafor", title: "Founder & CEO", company: "Pulse Health", location: "Boston", tags: ["founder", "portfolio"], note: "Ex-clinician founder, deeply credible. Reimbursement path is the key risk to watch." },
    { name: "Sanjay Iyer", title: "Co-founder / CTO", company: "Pulse Health", location: "Boston", tags: ["founder", "portfolio"] },
    { name: "Mira Kovac", title: "Founder & CEO", company: "Forge AI", location: "San Francisco", tags: ["founder", "portfolio", "raising"], note: "Hottest company in the portfolio. Series A heavily oversubscribed — help her keep the round clean." },
    { name: "Tomasz Wojcik", title: "Co-founder / CTO", company: "Forge AI", location: "San Francisco", tags: ["founder", "portfolio"] },
    { name: "Priya Nair", title: "Founder & CEO", company: "Lumen Commerce", location: "Bangalore", tags: ["founder", "portfolio"] },
    { name: "Caleb Ostrowski", title: "Co-founder / CTO", company: "Lumen Commerce", location: "Bangalore", tags: ["founder", "portfolio"] },
    { name: "Yusuf El-Amin", title: "Founder & CEO", company: "Cobalt Security", location: "Tel Aviv", tags: ["founder", "portfolio"], note: "Strong design-partner logos already. Watch burn — hiring ahead of revenue." },
    { name: "Hana Takeda", title: "Co-founder / CTO", company: "Cobalt Security", location: "Tel Aviv", tags: ["founder", "portfolio"] },
    { name: "Elena Vasquez", title: "Founder & CEO", company: "Rootstock Bio", location: "San Diego", tags: ["founder", "portfolio"] },
    { name: "Marcus Thorne", title: "Co-founder / CTO", company: "Rootstock Bio", location: "San Diego", tags: ["founder", "portfolio"] },
    { name: "Bianca Ferreira", title: "Founder & CEO", company: "Tidepool Logistics", location: "Sao Paulo", tags: ["founder", "portfolio", "raising"], note: "LatAm logistics wedge working. Raising an A; needs a lead comfortable with cross-border ops." },
    { name: "Ravi Menon", title: "Co-founder / CTO", company: "Tidepool Logistics", location: "Sao Paulo", tags: ["founder", "portfolio"] },

    // --- prospect / tracking founders (passed / watching) ---
    { name: "Amara Diallo", title: "Founder & CEO", company: "Helios Solar", location: "Nairobi", tags: ["founder", "tracking", "raising"], note: "Passed at pre-seed 2024 — now raising a hot Series A in climate; re-engage before it closes." },
    { name: "Bram de Vries", title: "Co-founder / CTO", company: "Helios Solar", location: "Nairobi", tags: ["founder", "tracking"] },
    { name: "Leon Fischer", title: "Founder & CEO", company: "Kairos Payments", location: "Amsterdam", tags: ["founder", "tracking", "raising"], note: "Second-time founder, clean cap table. Would take the seed lead if the terms fit — decide by Q3." },
    { name: "Noor Abbasi", title: "Co-founder / CTO", company: "Kairos Payments", location: "Amsterdam", tags: ["founder", "tracking"] },
    { name: "Sofia Reyes", title: "Founder & CEO", company: "Meridian Robotics", location: "Austin", tags: ["founder", "tracking"], note: "Impressive demo but capital-intensive; wrong stage for us. Keep warm for later." },
    { name: "Henrik Lund", title: "Co-founder / CTO", company: "Meridian Robotics", location: "Austin", tags: ["founder", "tracking"] },
    { name: "Kwame Asante", title: "Founder & CEO", company: "Aster Learning", location: "Accra", tags: ["founder", "tracking"] },
    { name: "Layla Mansour", title: "Co-founder / CTO", company: "Aster Learning", location: "Accra", tags: ["founder", "tracking"] },
    { name: "Ingrid Sorensen", title: "Founder & CEO", company: "Quill Docs", location: "Copenhagen", tags: ["founder", "tracking", "raising"], note: "Bottoms-up SaaS with real retention. Watching the seed — wants a design-led investor." },
    { name: "Oskar Nowak", title: "Co-founder / CTO", company: "Quill Docs", location: "Copenhagen", tags: ["founder", "tracking"] },
    { name: "Rafael Costa", title: "Founder & CEO", company: "Saffron Kitchen", location: "Lisbon", tags: ["founder", "tracking"] },
    { name: "Elif Yildiz", title: "Co-founder / CTO", company: "Saffron Kitchen", location: "Lisbon", tags: ["founder", "tracking"] },

    // --- co-investors at other funds ---
    { name: "Gwen Hollis", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor"], note: "Great potential co-investor for fintech deals; moves fast once she's in." },
    { name: "Dmitri Volkov", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor"] },
    { name: "Zara Haddad", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor"] },
    { name: "Theo Nakamura", title: "Partner (co-investor)", company: "Northwind Capital", location: "New York", tags: ["co-investor"] },
    { name: "Aria Solberg", title: "Partner (co-investor)", company: "Harbor Line Ventures", location: "Stockholm", tags: ["co-investor"], note: "Leads climate rounds. Co-invested on Verdant Grid — keep close for the next climate deal." },
    { name: "Malik Johnson", title: "Partner (co-investor)", company: "Harbor Line Ventures", location: "Stockholm", tags: ["co-investor"] },
    { name: "Felix Braun", title: "Partner (co-investor)", company: "Harbor Line Ventures", location: "Stockholm", tags: ["co-investor"] },
    { name: "Beatrix Chen", title: "Partner (co-investor)", company: "Belmont Partners", location: "Singapore", tags: ["co-investor"] },
    { name: "Owen Fitzgerald", title: "Partner (co-investor)", company: "Belmont Partners", location: "Singapore", tags: ["co-investor"] },
    { name: "Camila Rojas", title: "Partner (co-investor)", company: "Belmont Partners", location: "Singapore", tags: ["co-investor"] },

    // --- accelerator ---
    { name: "Harriet Vale", title: "Partner (co-investor)", company: "Ignite Labs", location: "San Francisco", tags: ["co-investor"], note: "Runs the accelerator's flagship cohort — best top-of-funnel for pre-seed deal flow." },
    { name: "Bruno Costa", title: "Partner (co-investor)", company: "Ignite Labs", location: "San Francisco", tags: ["co-investor"] },

    // --- operators / angels ---
    { name: "Aditya Kapoor", title: "Angel / Operator", company: null, location: "San Francisco", tags: ["angel"], note: "Ex-VP Eng at a payments unicorn. Writes $50k angel checks and takes founder calls — great for fintech intros." },
    { name: "Lena Hoffmann", title: "Angel / Operator", company: null, location: "Munich", tags: ["angel"] },
    { name: "Marcus Webb", title: "Angel / Operator", company: null, location: "London", tags: ["angel"] },
    { name: "Priyanka Sethi", title: "Angel / Operator", company: null, location: "Bangalore", tags: ["angel"], note: "Scaled a consumer brand to exit. Perfect operator-angel to add to Lumen Commerce's cap table." },
    { name: "Gabriel Moreau", title: "Angel / Operator", company: null, location: "Paris", tags: ["angel"] },
    { name: "Naomi Wright", title: "Angel / Operator", company: null, location: "Boston", tags: ["angel"] },
    { name: "Sebastian Klein", title: "Angel / Operator", company: null, location: "Berlin", tags: ["angel"] },
    { name: "Farah Nasser", title: "Angel / Operator", company: null, location: "Dubai", tags: ["angel"] },
    { name: "Julian Park", title: "Angel / Operator", company: null, location: "Seoul", tags: ["angel"] },
    { name: "Chloe Bennett", title: "Angel / Operator", company: null, location: "Sydney", tags: ["angel"] },
    { name: "Rohan Gupta", title: "Angel / Operator", company: null, location: "Mumbai", tags: ["angel"], note: "Security operator-angel; opened two design-partner doors for Cobalt. Loop in on security deals." },
    { name: "Simone Laurent", title: "Angel / Operator", company: null, location: "Montreal", tags: ["angel"] },
    { name: "Andre Silva", title: "Angel / Operator", company: null, location: "Sao Paulo", tags: ["angel"] },
    { name: "Yuki Tanaka", title: "Angel / Operator", company: null, location: "Tokyo", tags: ["angel"] },
    { name: "Damon Reyes", title: "Angel / Operator", company: null, location: "Austin", tags: ["angel"] },
    { name: "Inga Petrova", title: "Angel / Operator", company: null, location: "Tallinn", tags: ["angel"] },
    { name: "Wesley Adekunle", title: "Angel / Operator", company: null, location: "Lagos", tags: ["angel"] },

    // --- LPs ---
    { name: "Geoffrey Ashworth", title: "LP", company: null, location: "Zurich", tags: ["LP"], note: "Anchor LP from Fund I. Wants quarterly portfolio pulse — send the Forge AI markup story." },
    { name: "Margaret Sinclair", title: "LP", company: null, location: "Toronto", tags: ["LP"] },
    { name: "Vikram Desai", title: "LP", company: null, location: "Singapore", tags: ["LP"], note: "Family-office LP evaluating Fund II. Warm but wants to see climate exposure — showcase Verdant Grid." },
  ],
  events: [
    {
      name: "Ignite Labs Demo Day 2025",
      emoji: "🎤",
      tags: ["demo day"],
      attendees: [
        "Harriet Vale", "Bruno Costa",
        "Amara Diallo", "Leon Fischer", "Sofia Reyes", "Kwame Asante", "Ingrid Sorensen", "Rafael Costa",
        "Gwen Hollis", "Aria Solberg", "Beatrix Chen",
        "Aditya Kapoor", "Chloe Bennett", "Damon Reyes",
      ],
    },
    {
      name: "Portfolio Founder Dinner",
      emoji: "🍽️",
      tags: ["dinner"],
      attendees: [
        "Ayaan Qureshi", "Mira Kovac", "Imani Okafor", "Diego Marchetti", "Yusuf El-Amin", "Bianca Ferreira", "Priya Nair",
        "Aditya Kapoor", "Priyanka Sethi", "Rohan Gupta",
      ],
    },
    {
      name: "LP Annual Meeting 2026",
      emoji: "📊",
      tags: ["LP"],
      attendees: [
        "Geoffrey Ashworth", "Margaret Sinclair", "Vikram Desai",
        "Mira Kovac", "Diego Marchetti",
        "Gwen Hollis", "Owen Fitzgerald",
      ],
    },
    {
      name: "Climate Tech Summit",
      emoji: "🌍",
      tags: ["conference"],
      attendees: [
        "Diego Marchetti", "Nadia Boulos", "Amara Diallo", "Bram de Vries",
        "Aria Solberg", "Malik Johnson", "Vikram Desai",
      ],
    },
    {
      name: "Fintech Founders Roundtable",
      emoji: "💳",
      tags: ["roundtable"],
      attendees: [
        "Ayaan Qureshi", "Freya Lindqvist", "Leon Fischer", "Noor Abbasi",
        "Gwen Hollis", "Dmitri Volkov", "Aditya Kapoor",
      ],
    },
  ],
});
