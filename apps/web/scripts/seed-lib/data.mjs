/**
 * Static name/label pools the generator samples from. Pure data, no logic.
 * Colors are drawn from the app's own palettes: event colors are stored as
 * tokens (see @/utils/constants/events), node-type colors as hex swatches
 * that read well on the near-black /app background.
 */

export const FIRST_NAMES = [
  "Aarav", "Aditi", "Ananya", "Arjun", "Devika", "Diya", "Farhan", "Ishaan",
  "Kabir", "Kavya", "Meera", "Mihir", "Naina", "Neel", "Nikhil", "Priya",
  "Rahul", "Ritu", "Rohan", "Sanya", "Sara", "Shreya", "Tanvi", "Vikram",
  "Zoya", "Aditya", "Alok", "Bhavna", "Charu", "Deepak", "Esha", "Gaurav",
  "Alice", "Ben", "Carlos", "Daniel", "Elena", "Hana", "James", "Lin",
  "Maria", "Mei", "Noah", "Petra", "Sofia", "Tomás", "Wei", "Yuki",
];

export const LAST_NAMES = [
  "Sharma", "Mehta", "Rao", "Kapoor", "Iyer", "Singh", "Patel", "Menon",
  "Gupta", "Joshi", "Nair", "Reddy", "Bose", "Chatterjee", "Desai", "Kulkarni",
  "Malhotra", "Pillai", "Saxena", "Verma", "Bhat", "Chawla", "Dutta", "Ghosh",
  "Chen", "Tanaka", "Novak", "Garcia", "Kim", "Okafor", "Müller", "Costa",
];

export const CITIES = [
  "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata",
  "Jaipur", "Singapore", "London", "Dubai", "San Francisco",
];

export const SECTORS = ["SaaS", "Fintech", "Healthcare", "Manufacturing", "Logistics", "Consumer", "Climate", "Media"];

export const WORK_TITLES = [
  "Software Engineer", "Senior Software Engineer", "Staff Engineer", "Product Manager",
  "Senior Product Manager", "Product Designer", "Data Scientist", "Data Analyst",
  "Account Executive", "Customer Success Manager", "Marketing Manager", "Finance Analyst",
  "Recruiter", "Operations Lead", "QA Engineer", "Solutions Architect",
];

export const LEAD_TITLES = ["Engineering Manager", "Director of Product", "VP Engineering", "Head of Sales", "Design Lead", "Head of Data"];

export const GENERAL_TITLES = [
  "Teacher", "Architect", "Civil Engineer", "Journalist", "Photographer", "Chef",
  "Pharmacist", "Bank Manager", "Professor", "Interior Designer", "Pilot", "Student", "Retired",
];

export const ACQUAINTANCE_TITLES = [
  "Founder & CEO", "Co-founder", "CTO", "VP Sales", "Head of Partnerships",
  "Investor", "Angel Investor", "Principal, Venture Capital", "Advisor",
  "Engineering Director", "Procurement Lead", "Growth Lead", "Developer Advocate",
  "Sales Director", "Country Manager", "Consultant",
];

/** [tag, title] pairs; the tag lands next to "services" on the contact. */
export const SERVICE_TYPES = [
  ["doctor", "General Physician"], ["dentist", "Dentist"], ["pediatrician", "Pediatrician"],
  ["plumber", "Plumber"], ["electrician", "Electrician"], ["carpenter", "Carpenter"],
  ["accountant", "Chartered Accountant"], ["lawyer", "Lawyer"], ["landlord", "Landlord"],
  ["mechanic", "Car Mechanic"], ["insurance", "Insurance Agent"], ["broker", "Real-estate Broker"],
  ["tailor", "Tailor"], ["yoga", "Yoga Instructor"], ["vet", "Veterinarian"],
];

export const EMPLOYER_NAMES = [
  ["Meridian Systems", "meridiansystems.example", "SaaS"],
  ["Kite Financial", "kitefinancial.example", "Fintech"],
  ["Bluegrid Health", "bluegridhealth.example", "Healthcare"],
  ["Cargoline", "cargoline.example", "Logistics"],
  ["Solverra Energy", "solverra.example", "Climate"],
  ["Pixelforge Media", "pixelforge.example", "Media"],
];

export const COMPANY_WORDS_A = [
  "North", "Vertex", "Alloy", "Harbor", "Cinder", "Lumen", "Orbit", "Sable",
  "Quill", "Ridge", "Ember", "Falcon", "Granite", "Hollow", "Iris", "Juniper",
  "Krypton", "Larch", "Mistral", "Nimbus", "Onyx", "Pioneer", "Quartz", "Raven",
];

export const COMPANY_WORDS_B = [
  "Labs", "Systems", "Works", "Capital", "Dynamics", "Software", "Analytics",
  "Robotics", "Ventures", "Digital", "Networks", "Industries", "Health", "Logistics",
];

export const FRIEND_CIRCLE_NAMES = [
  ["school", "School Batch of 2004"], ["college", "College Hostel Wing"],
  ["college", "Engineering Classmates"], ["neighborhood", "Indiranagar Neighbours"],
  ["neighborhood", "Society Residents"], ["hobby", "Sunday Football Crew"],
  ["hobby", "Trail Runners"], ["hobby", "Book Club"], ["hobby", "Startup Poker Night"],
  ["hobby", "Photography Walks"], ["college", "MBA Cohort"], ["hobby", "Badminton Group"],
  ["neighborhood", "Old Colony Friends"], ["hobby", "Cycling Club"], ["school", "School Debate Team"],
];

export const CONFERENCE_NAMES = [
  "TechSparks", "SaaSBoomi Annual", "Fintech Forward", "DevConf India", "Climate Capital Summit",
  "Product Leaders Meet", "GrowthX Conclave", "Web Summit", "Founders Retreat", "AI Frontier",
  "Design Matters", "Cloud Native Days", "Sales Kickoff Expo", "Health Innovate", "Logistics World",
];

export const MEETUP_NAMES = [
  "Indie Hackers Coffee", "Product Tank", "React Bangalore Meetup", "Founders Breakfast",
  "Data Science Circle", "Marketing Guild Mixer", "Open Source Saturday", "CTO Roundtable",
];

export const TRIP_DESTINATIONS = ["Goa", "Ladakh", "Coorg", "Bali", "Kerala", "Meghalaya"];

/** Event color tokens/emoji mirror @/utils/constants/events (tokens, not hex). */
export const EVENT_COLOR_TOKENS = ["amber", "clay", "rose", "violet", "blue", "teal", "green", "slate"];
export const EVENT_EMOJIS = ["🎪", "🎟️", "🤝", "🏢", "✈️", "🎓", "🍻", "🎤", "💼", "🌐", "🚀", "📅", "☕", "🧑‍💻"];

/** Node types (custom entity kinds); hex swatches from the app palette. */
export const NODE_TYPES = [
  ["Gym", "gym", "#2fa5a0"],
  ["School", "school", "#4f8fd6"],
  ["Project", "project", "#8f6fd0"],
  ["Community", "community", "#5a9e52"],
];

export const ENTITY_NAMES = {
  gym: ["Iron Temple Gym", "Cult Fit Indiranagar", "Morning Flow Yoga Studio", "CrossFit Koramangala", "Apex Climbing Gym"],
  school: ["Little Acorns Preschool", "DPS East", "National Public School", "Riverdale High", "Montessori House"],
  project: ["Kitchen Renovation", "Open-source Graph Library", "Angel Syndicate", "Community Garden Build", "Podcast Studio Setup", "Farmhouse Project"],
  community: ["Bangalore Runners", "Indie Makers BLR", "Toastmasters Chapter", "Rotary Club", "Apartment Owners Association", "Street Dogs Rescue", "Classical Music Circle"],
};

/** Custom relationship predicates seeded into relationship_types. */
export const CUSTOM_RELATIONSHIP_TYPES = [
  ["travelled_with", "travelled with", "travelled with"],
  ["landlord_of", "landlord of", "tenant of"],
  ["classmate_of", "classmate of", "classmate of"],
];

export const NOTE_TEMPLATES = [
  "Caught up with {name} over coffee. {detail}",
  "Met {name} at {context}. {detail}",
  "Call with {name} — {detail}",
  "{name} mentioned they are {detail2}",
  "Quick chat with {name} after {context}. {detail}",
];

export const NOTE_DETAILS = [
  "They just moved teams and are settling in.",
  "Planning a trip to the hills next quarter.",
  "Asked about hiring referrals.",
  "They're exploring a side project on weekends.",
  "Kids started at a new school this year.",
  "Thinking about switching jobs in a few months.",
  "Training for a half marathon.",
];

export const NOTE_DETAILS_2 = [
  "looking for a co-founder", "moving to a new city soon", "raising a small angel round",
  "learning pottery", "open to advisory work", "getting into trail running",
];

export const FACT_TEMPLATES = [
  ["role", "Works as {title}"],
  ["personal", "Has two kids in school"],
  ["personal", "Recently moved within {city}"],
  ["preference", "Prefers morning meetings over evening calls"],
  ["preference", "Coffee over tea, always"],
  ["intent", "Wants an intro to a design leader"],
  ["intent", "Exploring new roles in the next quarter"],
  ["personal", "Runs regularly and does trail races"],
];
