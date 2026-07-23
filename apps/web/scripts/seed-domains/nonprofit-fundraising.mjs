import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

// A major-gifts / development officer's personal relationship layer: the donors,
// households, board members, foundation program officers and corporate sponsors
// Grace stewards. This is NOT a donor system of record — it's the human graph
// (who knows whom, who opens which door) that lives alongside the CRM.
await seedDomainAccount({
  slug: "nonprofit-fundraising",
  displayName: "Grace Whitfield — Development Director (demo)",
  companies: [
    // Family foundations / grantmakers
    { name: "The Alderman Family Foundation", sector: "Philanthropy" },
    { name: "Cortland Community Foundation", sector: "Philanthropy" },
    { name: "Meridian Charitable Trust", sector: "Philanthropy" },
    { name: "Nakamura Family Foundation", sector: "Philanthropy" },
    // Corporate sponsors
    { name: "Vertex Financial Group", sector: "Financial Services" },
    { name: "Solstice Energy", sector: "Energy" },
    { name: "Brightline Health", sector: "Healthcare" },
    { name: "Pallas Technologies", sector: "Technology" },
    { name: "Harborview Bank", sector: "Banking" },
    // Donor employers / board affiliations
    { name: "Kellerman & Associates", sector: "Legal" },
    { name: "Riverstone Capital", sector: "Investment" },
    { name: "Ashford University", sector: "Education" },
    { name: "Coastline Medical Center", sector: "Healthcare" },
    { name: "Dunmore Real Estate", sector: "Real Estate" },
    { name: "Greenfield Architects", sector: "Architecture" },
    { name: "Maribel's Restaurant Group", sector: "Hospitality" },
  ],
  contacts: [
    // --- Board members ---
    { name: "Eleanor Vance", title: "Board member", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["board", "stewardship"], note: "Board chair — can open the door to the Alderman family foundation. Wants a quarterly one-on-one." },
    { name: "Marcus Delgado", title: "Board member", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["board"] },
    { name: "Priya Raghunathan", title: "Board member", company: "Ashford University", location: "Evanston, IL", tags: ["board", "stewardship"] },
    { name: "Theodore Brandt", title: "Board member", company: "Riverstone Capital", location: "Chicago, IL", tags: ["board"] },
    { name: "Yuki Nakamura", title: "Board member", company: "Nakamura Family Foundation", location: "Chicago, IL", tags: ["board", "foundation"], note: "Board member who bridges the Nakamura family foundation; secured last year's matching gift." },
    { name: "Camille Okonkwo", title: "Board member", company: "Brightline Health", location: "Oak Park, IL", tags: ["board"] },
    { name: "Douglas Fairbanks", title: "Board member", company: "Harborview Bank", location: "Chicago, IL", tags: ["board", "stewardship"] },
    { name: "Renata Silva", title: "Board member", company: "Greenfield Architects", location: "Chicago, IL", tags: ["board"] },

    // --- Foundation program officers ---
    { name: "Harold Alderman", title: "Foundation Program Officer", company: "The Alderman Family Foundation", location: "Chicago, IL", tags: ["foundation", "major-gift"], note: "Family principal and program officer; capacity for a 6-figure grant; align our LOI to the fall board meeting." },
    { name: "Sofia Marchetti", title: "Foundation Program Officer", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["foundation"], note: "Reviews youth-literacy grants; submit the LOI ahead of their spring cycle." },
    { name: "Wendell Cho", title: "Foundation Program Officer", company: "Meridian Charitable Trust", location: "Milwaukee, WI", tags: ["foundation"] },
    { name: "Aisha Bello", title: "Foundation Program Officer", company: "Nakamura Family Foundation", location: "Chicago, IL", tags: ["foundation", "stewardship"] },
    { name: "Gregory Pines", title: "Foundation Program Officer", company: "The Alderman Family Foundation", location: "Chicago, IL", tags: ["foundation"] },
    { name: "Lena Hoffmann", title: "Foundation Program Officer", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["foundation"] },

    // --- Corporate sponsor leads ---
    { name: "Bianca Ferreira", title: "Corporate Sponsor Lead", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["corporate", "stewardship"], note: "Owns Vertex's CSR budget; renews the annual gala sponsorship if we send an impact deck by Q3." },
    { name: "Owen Whitaker", title: "Corporate Sponsor Lead", company: "Solstice Energy", location: "Chicago, IL", tags: ["corporate"] },
    { name: "Nadia Haddad", title: "Corporate Sponsor Lead", company: "Brightline Health", location: "Oak Park, IL", tags: ["corporate"] },
    { name: "Ravi Menon", title: "Corporate Sponsor Lead", company: "Pallas Technologies", location: "Chicago, IL", tags: ["corporate"] },
    { name: "Fiona Byrne", title: "Corporate Sponsor Lead", company: "Harborview Bank", location: "Chicago, IL", tags: ["corporate"] },
    { name: "Julian Rhodes", title: "Corporate Sponsor Lead", company: "Solstice Energy", location: "Chicago, IL", tags: ["corporate", "prospect"], note: "New CSR hire; warm intro from Owen; potential table sponsor for the gala." },

    // --- Major donors & households ---
    { name: "Beatrice Alderman", title: "Major donor", company: "The Alderman Family Foundation", location: "Lake Forest, IL", tags: ["major-gift", "donor", "stewardship"], note: "Passionate about youth literacy; capacity for a 5-figure gift; ask in fall." },
    { name: "Charles Alderman", title: "Major donor", company: "The Alderman Family Foundation", location: "Lake Forest, IL", tags: ["major-gift", "donor"], note: "Beatrice's husband; steward the household jointly; prefers a private site visit over gala events." },
    { name: "Hiroshi Nakamura", title: "Major donor", company: "Nakamura Family Foundation", location: "Winnetka, IL", tags: ["major-gift", "donor"] },
    { name: "Miriam Nakamura", title: "Major donor", company: "Nakamura Family Foundation", location: "Winnetka, IL", tags: ["major-gift", "donor", "stewardship"] },
    { name: "Patrick O'Sullivan", title: "Major donor", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Dolores Reyes", title: "Major donor", company: "Coastline Medical Center", location: "Evanston, IL", tags: ["major-gift", "donor"], note: "Retired physician; funds the clinic-literacy pilot; send a handwritten thank-you, not an email." },
    { name: "Anton Kovac", title: "Major donor", company: "Riverstone Capital", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Isabelle Fontaine", title: "Major donor", company: "Dunmore Real Estate", location: "Chicago, IL", tags: ["major-gift", "donor", "stewardship"] },
    { name: "Samuel Greenfield", title: "Major donor", company: "Greenfield Architects", location: "Oak Park, IL", tags: ["major-gift", "donor"], note: "Firm principal; underwrote the library build-out; open to a naming gift if we scope it." },
    { name: "Marta Greenfield", title: "Major donor", company: "Greenfield Architects", location: "Oak Park, IL", tags: ["major-gift", "donor"] },
    { name: "Winston Ashford", title: "Major donor", company: "Ashford University", location: "Evanston, IL", tags: ["major-gift", "donor"] },
    { name: "Naomi Adler", title: "Major donor", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Terrence Bloom", title: "Major donor", company: "Harborview Bank", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Constance Meriwether", title: "Major donor", company: "Maribel's Restaurant Group", location: "Chicago, IL", tags: ["major-gift", "donor", "stewardship"], note: "Hosts the cultivation dinner at her restaurant and comps the venue annually." },
    { name: "Rafael Ortiz", title: "Major donor", company: "Maribel's Restaurant Group", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Evelyn Prosser", title: "Major donor", company: "Coastline Medical Center", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Gordon Ashby", title: "Major donor", company: "Riverstone Capital", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Lucille Barnard", title: "Major donor", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["major-gift", "donor", "stewardship"] },
    { name: "Desmond Achebe", title: "Major donor", company: "Pallas Technologies", location: "Chicago, IL", tags: ["major-gift", "donor"] },
    { name: "Freya Lindqvist", title: "Major donor", company: "Solstice Energy", location: "Chicago, IL", tags: ["major-gift", "donor"] },

    // --- Prospects ---
    { name: "Vincent Callahan", title: "Prospect", company: "Vertex Financial Group", location: "Chicago, IL", tags: ["prospect", "donor"], note: "Attended the gala as Marcus's guest; capacity looks strong; move to cultivation." },
    { name: "Amara Diallo", title: "Prospect", company: "Pallas Technologies", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Nathaniel Brooks", title: "Prospect", company: "Harborview Bank", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Sunita Kapoor", title: "Prospect", company: "Brightline Health", location: "Oak Park, IL", tags: ["prospect", "donor"] },
    { name: "Oliver Benton", title: "Prospect", company: "Dunmore Real Estate", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Celeste Moreau", title: "Prospect", company: "Ashford University", location: "Evanston, IL", tags: ["prospect"], note: "Alumna interested in a scholarship fund; still discovery stage, no ask yet." },
    { name: "Bartholomew Quinn", title: "Prospect", company: "Riverstone Capital", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Ingrid Sorensen", title: "Prospect", company: "Solstice Energy", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Malik Johnson", title: "Prospect", company: "Coastline Medical Center", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Rosalind Frye", title: "Prospect", company: "Greenfield Architects", location: "Oak Park, IL", tags: ["prospect"] },
    { name: "Hector Villanueva", title: "Prospect", company: "Maribel's Restaurant Group", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Genevieve Laurent", title: "Prospect", company: "Kellerman & Associates", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Tobias Mwangi", title: "Prospect", company: "Pallas Technologies", location: "Chicago, IL", tags: ["prospect"] },
    { name: "Delphine Auclair", title: "Prospect", company: "Cortland Community Foundation", location: "Chicago, IL", tags: ["prospect", "foundation"] },
    { name: "Josephine Hartwell", title: "Prospect", company: "Harborview Bank", location: "Chicago, IL", tags: ["prospect", "stewardship"], note: "Longtime volunteer moving into giving; small first gift, high loyalty — invest early." },
  ],
  events: [
    {
      name: "Spring Gala 2026",
      emoji: "🥂",
      tags: ["gala", "stewardship"],
      attendees: [
        "Eleanor Vance", "Marcus Delgado", "Beatrice Alderman", "Charles Alderman",
        "Harold Alderman", "Hiroshi Nakamura", "Miriam Nakamura", "Yuki Nakamura",
        "Bianca Ferreira", "Constance Meriwether", "Naomi Adler", "Terrence Bloom",
        "Isabelle Fontaine", "Samuel Greenfield", "Vincent Callahan", "Dolores Reyes",
      ],
    },
    {
      name: "Cultivation Dinner at Maribel's",
      emoji: "🍷",
      tags: ["cultivation", "stewardship"],
      attendees: [
        "Constance Meriwether", "Rafael Ortiz", "Beatrice Alderman", "Charles Alderman",
        "Bianca Ferreira", "Vincent Callahan", "Eleanor Vance", "Marcus Delgado",
        "Lucille Barnard", "Anton Kovac",
      ],
    },
    {
      name: "Alderman Foundation Site Visit",
      emoji: "🏛️",
      tags: ["foundation", "stewardship"],
      attendees: [
        "Harold Alderman", "Gregory Pines", "Beatrice Alderman", "Charles Alderman",
        "Eleanor Vance",
      ],
    },
    {
      name: "Youth Literacy Luncheon",
      emoji: "📚",
      tags: ["stewardship", "foundation"],
      attendees: [
        "Sofia Marchetti", "Lena Hoffmann", "Dolores Reyes", "Celeste Moreau",
        "Priya Raghunathan", "Winston Ashford", "Delphine Auclair",
      ],
    },
    {
      name: "Corporate Partners Breakfast",
      emoji: "☕",
      tags: ["corporate"],
      attendees: [
        "Bianca Ferreira", "Owen Whitaker", "Nadia Haddad", "Ravi Menon",
        "Fiona Byrne", "Julian Rhodes", "Marcus Delgado", "Desmond Achebe",
      ],
    },
  ],
});
