// Smoke-test the domain seed util end to end against the target DB, then clean
// up after itself (seeds `demo-zztest`, verify, then delete with _cleanup.mjs).
//   node --env-file=.env.vercel scripts/seed-domains/_smoketest.mjs
import { seedDomainAccount } from "../seed-lib/seed-domain.mjs";

await seedDomainAccount({
  slug: "zztest",
  displayName: "Smoke Test (delete me)",
  companies: [
    { name: "Acme Holdings", sector: "Finance" },
    { name: "Beta Realty", sector: "Real Estate" },
  ],
  contacts: [
    { name: "Test Alice", title: "Broker", company: "Beta Realty", location: "Austin", tags: ["lead"], note: "Met at open house; wants a bigger yard in 2 years." },
    { name: "Test Bob", title: "Partner", company: "Acme Holdings", location: "NYC", tags: ["investor"] },
    { name: "Test Carol", title: "Analyst", company: "Acme Holdings", location: "NYC", tags: [] },
  ],
  events: [
    { name: "Demo Day 2025", emoji: "🎤", tags: ["conference"], attendees: ["Test Alice", "Test Bob"] },
  ],
});

console.log("\nSmoke test seeded demo-zztest. Delete it with:");
console.log("  node --env-file=.env.vercel scripts/seed-domains/_cleanup.mjs demo-zztest");
