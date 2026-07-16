/**
 * Shared generation state + the invariant-enforcing mutators every circle
 * builder goes through: contact/edge/attendance creation with dedupe, degree
 * tracking (for hub targeting), and circle registration (for bridges).
 */
import { createRng } from "./rng.mjs";
import { CITIES, FIRST_NAMES, LAST_NAMES } from "./data.mjs";

export function createContext({ seed, userId, contactCount, withNotes }) {
  return {
    rng: createRng(seed),
    userId,
    contactCount,
    withNotes,
    contacts: [],
    companies: [],
    positions: [],
    nodeTypes: [],
    entities: [],
    relationshipTypes: [],
    events: [],
    eventContacts: [],
    edges: [],
    notes: [],
    facts: [],
    /** {name, kind, tag, city, memberIds[]} — bridges pick a second one. */
    circles: [],
    /** Contact ids that must stay fully disconnected (stale imports). */
    staleIds: new Set(),
    degree: new Map(),
    edgeKeys: new Set(),
    attendanceKeys: new Set(),
    /** Fixed "now" so generated timelines are seed-stable, not wall-clock. */
    baseDate: new Date("2026-07-01T00:00:00Z"),
  };
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function makeName(ctx, surname) {
  const first = ctx.rng.pick(FIRST_NAMES);
  return `${first} ${surname ?? ctx.rng.pick(LAST_NAMES)}`;
}

/** Circle members mostly share the circle's city; some noise is realistic. */
export function circleCity(ctx, homeCity) {
  return ctx.rng.chance(0.85) ? homeCity : ctx.rng.pick(CITIES);
}

export function addContact(ctx, { name, title = null, companyId = null, location = null, tags = [], source = "import", emails = [], phones = [] }) {
  const contact = { id: ctx.rng.uuid(), name, title, companyId, location, tags, source, emails, phones };
  ctx.contacts.push(contact);
  ctx.degree.set(contact.id, 0);
  return contact;
}

export function addCompany(ctx, name, domain, sector) {
  const company = { id: ctx.rng.uuid(), name, domain, sector };
  ctx.companies.push(company);
  return company;
}

const MANAGEMENT_PREDICATES = new Set(["manages", "reports_to"]);

/**
 * Adds one edge, enforcing the graph's storage invariants: no self-loops, one
 * edge per (predicate, unordered pair) — so a kinship/symmetric relation is
 * never stored in both directions — and at most one management edge per pair
 * regardless of whether it was phrased as manages or reports_to.
 */
export function addEdge(ctx, srcId, predicate, dstId, { srcType = "contact", dstType = "contact" } = {}) {
  if (srcId === dstId) return false;
  const [a, b] = srcId < dstId ? [srcId, dstId] : [dstId, srcId];
  const key = `${predicate}:${a}:${b}`;
  if (ctx.edgeKeys.has(key)) return false;
  if (MANAGEMENT_PREDICATES.has(predicate) && ctx.edgeKeys.has(`mgmt:${a}:${b}`)) return false;
  ctx.edgeKeys.add(key);
  if (MANAGEMENT_PREDICATES.has(predicate)) ctx.edgeKeys.add(`mgmt:${a}:${b}`);
  ctx.edges.push({ id: ctx.rng.uuid(), srcType, srcId, predicate, dstType, dstId });
  if (srcType === "contact") ctx.degree.set(srcId, (ctx.degree.get(srcId) ?? 0) + 1);
  if (dstType === "contact") ctx.degree.set(dstId, (ctx.degree.get(dstId) ?? 0) + 1);
  return true;
}

export function attend(ctx, eventId, contactId, scannedAt) {
  const key = `${eventId}:${contactId}`;
  if (ctx.attendanceKeys.has(key)) return false;
  ctx.attendanceKeys.add(key);
  ctx.eventContacts.push({ eventId, contactId, scannedAt });
  return true;
}

export function addEvent(ctx, { name, startedAt, endedAt = null, color, emoji, tags }) {
  const event = { id: ctx.rng.uuid(), name, startedAt, endedAt, color, emoji, tags };
  ctx.events.push(event);
  return event;
}

export function registerCircle(ctx, circle) {
  ctx.circles.push(circle);
  return circle;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
