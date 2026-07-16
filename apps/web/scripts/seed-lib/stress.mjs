/**
 * --stress: pathological worst-case data layered ON TOP of the realistic life
 * network, for perf testing. Called once, strictly after generateLifeNetwork's
 * normal build (circles, bridges, hubs, notes) and the exact-N top-up/trim
 * pass — it draws from the same `ctx.rng` stream, but only when invoked, so
 * omitting --stress never touches this file and the base sequence is
 * byte-identical to before. Stale contacts are still never touched (same
 * invariant as topology.mjs's hubs).
 */
import { CITIES, EVENT_COLOR_TOKENS, LEAD_TITLES, SECTORS, WORK_TITLES } from "./data.mjs";
import { addCompany, addContact, addEdge, addEvent, attend, circleCity, makeName } from "./context.mjs";

const MEGA_EMPLOYER_SIZE = 5000;
const MEGA_EVENT_COUNT = 3;
const MEGA_EVENT_ATTENDEE_RANGE = [3000, 8000];
const SUPER_HUB_COUNT = 5;
const SUPER_HUB_DEGREE_RANGE = [500, 700];

/**
 * Mega/mid tag membership fractions are tuned against --contacts=20000 (the
 * intended stress target): 2 mega tags at ~3.15% membership (~630 contacts
 * each) contribute ~2 * C(630,2) ≈ 396k shared-tag pairs; 30 mid tags at
 * ~0.75% membership (~150 contacts each) contribute ~30 * C(150,2) ≈ 335k
 * more — landing the total near 730k, inside the requested 600k-900k band.
 * At smaller --contacts the same fractions just produce smaller numbers.
 */
const MEGA_TAGS = ["network", "imported"];
const MEGA_TAG_FRACTION = 0.0315;
const MID_TAG_COUNT = 30;
const MID_TAG_FRACTION = 0.0075;
const MIN_SHARED_TAG_MEMBERS = 5;
/** Every eligible contact is padded to this many total tags with per-contact
 * (so ~0 pair contribution) filler tags, landing avg/max in the requested
 * 30-50 regardless of how many shared mega/mid tags it happened to land. */
const TAG_TARGET_RANGE = [30, 50];

function eligibleContacts(ctx) {
  return ctx.contacts.filter((c) => !ctx.staleIds.has(c.id));
}

export function buildStress(ctx) {
  addMegaEmployer(ctx);
  addMegaEvents(ctx);
  addSuperHubs(ctx);
  applyTagExplosion(ctx);
}

/** One company, ~5,000 current colleagues — the same team/manager shape
 *  work.mjs uses for a real current employer, at ~1000x the size. */
function addMegaEmployer(ctx) {
  const company = addCompany(ctx, "Colossus Holdings", "colossusholdings.example", ctx.rng.pick(SECTORS));
  const city = ctx.rng.pick(CITIES);
  const members = [];
  for (let i = 0; i < MEGA_EMPLOYER_SIZE; i++) {
    const isLead = i % ctx.rng.int(6, 9) === 0;
    const title = isLead ? ctx.rng.pick(LEAD_TITLES) : ctx.rng.pick(WORK_TITLES);
    const contact = addContact(ctx, {
      name: makeName(ctx),
      title,
      companyId: company.id,
      location: circleCity(ctx, city),
      tags: ["colossus-holdings", "work"],
      source: "import",
    });
    contact.isLead = isLead;
    members.push(contact);
    ctx.positions.push({
      id: ctx.rng.uuid(),
      contactId: contact.id,
      companyId: company.id,
      title,
      isCurrent: true,
      startedAt: "2024",
      endedAt: null,
    });
  }
  // Light org-chart edges, same density work.mjs uses for a current employer:
  // one manager per ~7-person team plus 2-4 colleague_of ties each — O(n),
  // never a full clique, even at 5,000 members.
  for (let start = 0; start < members.length; start += ctx.rng.int(5, 9)) {
    const team = members.slice(start, start + 9);
    const lead = team.find((m) => m.isLead) ?? team[0];
    for (const member of team) {
      if (member !== lead) addEdge(ctx, lead.id, "manages", member.id);
      for (const teammate of ctx.rng.sample(team, ctx.rng.int(2, 4))) {
        if (teammate !== member) addEdge(ctx, member.id, "colleague_of", teammate.id);
      }
    }
  }
}

/** 2-3 mega-events (badge scans at conference scale), 3,000-8,000 attendees
 *  each, drawn from the whole eligible pool (including the mega-employer). */
function addMegaEvents(ctx) {
  const pool = eligibleContacts(ctx);
  if (pool.length === 0) return;
  for (let i = 0; i < MEGA_EVENT_COUNT; i++) {
    const startedAt = ctx.rng.date(new Date("2025-01-01"), ctx.baseDate);
    const event = addEvent(ctx, {
      name: `Stress Mega Summit ${i + 1}`,
      startedAt,
      endedAt: new Date(startedAt.getTime() + ctx.rng.int(1, 3) * 86400000),
      color: ctx.rng.pick(EVENT_COLOR_TOKENS),
      emoji: "🌐",
      tags: ["stress", "mega-event"],
    });
    const attendeeCount = Math.min(pool.length, ctx.rng.int(...MEGA_EVENT_ATTENDEE_RANGE));
    for (const contact of ctx.rng.sample(pool, attendeeCount)) {
      attend(ctx, event.id, contact.id, new Date(event.startedAt.getTime() + ctx.rng.int(1, 72) * 3600000));
    }
  }
}

/** A handful of super-hubs pushed to degree 500+ — topology.mjs's addHubs
 *  mechanism, aimed much higher, over the now-larger (post mega-employer)
 *  eligible pool. */
function addSuperHubs(ctx) {
  const pool = eligibleContacts(ctx);
  if (pool.length < 60) return;
  const hubIds = ctx.rng.sample(pool, Math.min(SUPER_HUB_COUNT, pool.length)).map((c) => c.id);
  for (const hubId of hubIds) {
    const target = Math.min(pool.length - 1, ctx.rng.int(...SUPER_HUB_DEGREE_RANGE));
    let attempts = 0;
    while ((ctx.degree.get(hubId) ?? 0) < target && attempts < target * 20) {
      attempts++;
      const other = ctx.rng.pick(pool);
      if (other.id === hubId) continue;
      const roll = ctx.rng.float();
      if (roll < 0.7) addEdge(ctx, hubId, "knows", other.id);
      else if (roll < 0.85) addEdge(ctx, hubId, "friend_of", other.id);
      else addEdge(ctx, other.id, "introduced_by", hubId);
    }
  }
}

/** Shared mega/mid tags (drives the shared-tag pair explosion) plus a
 *  per-contact filler top-up (drives the 30-50 avg/max tag count). */
function applyTagExplosion(ctx) {
  const pool = eligibleContacts(ctx);
  if (pool.length === 0) return;

  const megaSize = Math.min(pool.length, Math.max(MIN_SHARED_TAG_MEMBERS, Math.round(ctx.contactCount * MEGA_TAG_FRACTION)));
  for (const tag of MEGA_TAGS) {
    for (const contact of ctx.rng.sample(pool, megaSize)) {
      if (!contact.tags.includes(tag)) contact.tags.push(tag);
    }
  }

  const midSize = Math.min(pool.length, Math.max(MIN_SHARED_TAG_MEMBERS, Math.round(ctx.contactCount * MID_TAG_FRACTION)));
  for (let i = 0; i < MID_TAG_COUNT; i++) {
    const tag = `stress-mid-${i}`;
    for (const contact of ctx.rng.sample(pool, midSize)) {
      if (!contact.tags.includes(tag)) contact.tags.push(tag);
    }
  }

  for (const contact of pool) {
    const target = ctx.rng.int(...TAG_TARGET_RANGE);
    let i = 0;
    while (contact.tags.length < target) {
      contact.tags.push(`stress-filler-${contact.id.slice(0, 8)}-${i++}`);
    }
  }
}
