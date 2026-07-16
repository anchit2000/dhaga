/**
 * Orchestrates the life-network build: allocates --contacts=N across circle
 * kinds (bounded circles like family/services stay small; work, friends and
 * event acquaintances absorb scale), runs each builder, then the structural
 * passes (bridges, hubs), and returns plain row objects for insertion.
 */
import { addContact, clamp, createContext, makeName } from "./context.mjs";
import { buildFamilies } from "./families.mjs";
import { buildWork } from "./work.mjs";
import { buildFriends, buildServices, buildStale, buildTravel } from "./social.mjs";
import { buildEventsAndAcquaintances } from "./events.mjs";
import { buildEntities, buildRelationshipTypes } from "./entities.mjs";
import { addBridges, addHubs } from "./topology.mjs";
import { buildNotes } from "./notes.mjs";
import { buildStress } from "./stress.mjs";

/**
 * Family, services and stale contacts are real-life-bounded (clamped);
 * work/friends/acquaintances split what remains, so the same shape holds at
 * N=1000 and N=20000.
 */
export function allocate(contactCount) {
  const family = Math.min(clamp(Math.round(contactCount * 0.033), 10, 48), Math.floor(contactCount * 0.35));
  const services = Math.min(clamp(Math.round(contactCount * 0.02), 8, 30), Math.floor(contactCount * 0.1));
  const stale = Math.min(clamp(Math.round(contactCount * 0.005), 3, 25), Math.floor(contactCount * 0.05));
  const remaining = Math.max(0, contactCount - family - services - stale);
  const work = Math.round(remaining * 0.45);
  const friends = Math.round(remaining * 0.12);
  const acquaintances = remaining - work - friends;
  return { family, services, stale, work, friends, acquaintances };
}

export function generateLifeNetwork({ seed, userId, contactCount, withNotes, stress }) {
  const ctx = createContext({ seed, userId, contactCount, withNotes });
  const plan = allocate(contactCount);

  buildRelationshipTypes(ctx);
  buildFamilies(ctx, plan.family);
  buildWork(ctx, plan.work);
  buildFriends(ctx, plan.friends);
  buildServices(ctx, plan.services);
  buildStale(ctx, plan.stale);
  buildEventsAndAcquaintances(ctx, plan.acquaintances);
  buildTravel(ctx);
  buildEntities(ctx);
  addBridges(ctx);
  addHubs(ctx);
  if (withNotes) buildNotes(ctx);

  // Builders round their quotas; top up (as loose acquaintances) or trim (from
  // the leaf end) so --contacts=N is exact.
  while (ctx.contacts.length < contactCount) {
    addContact(ctx, { name: makeName(ctx), tags: [], source: "import" });
  }
  if (ctx.contacts.length > contactCount) trimOverflow(ctx, ctx.contacts.length - contactCount);

  // Runs last and only when requested: pathological data added ON TOP of the
  // network above, drawing further from the same `ctx.rng` stream. Omitting
  // --stress means this is never called, so the base sequence above is
  // unaffected — same seed, same output either way.
  if (stress) buildStress(ctx);

  return { plan, ...toRows(ctx) };
}

/** Drop edge-free, event-free leaves (never circle members) to hit N exactly. */
function trimOverflow(ctx, excess) {
  const attached = new Set();
  for (const edge of ctx.edges) {
    attached.add(edge.srcId);
    attached.add(edge.dstId);
  }
  for (const row of ctx.eventContacts) attached.add(row.contactId);
  for (const circle of ctx.circles) for (const id of circle.memberIds) attached.add(id);
  for (const position of ctx.positions) attached.add(position.contactId);
  for (const note of ctx.notes) attached.add(note.contactId);
  const removable = new Set();
  for (let i = ctx.contacts.length - 1; i >= 0 && removable.size < excess; i--) {
    if (!attached.has(ctx.contacts[i].id)) removable.add(ctx.contacts[i].id);
  }
  ctx.contacts = ctx.contacts.filter((c) => !removable.has(c.id));
}

function toRows(ctx) {
  const { userId } = ctx;
  return {
    companies: ctx.companies.map((c) => [c.id, c.name, c.domain, c.sector, userId]),
    contacts: ctx.contacts.map((c) => [
      c.id,
      c.name,
      c.title,
      c.companyId,
      JSON.stringify(c.emails),
      JSON.stringify(c.phones),
      c.location,
      JSON.stringify(c.tags),
      c.source,
      userId,
    ]),
    positions: ctx.positions.map((p) => [p.id, p.contactId, p.companyId, p.title, p.isCurrent, p.startedAt, p.endedAt]),
    nodeTypes: ctx.nodeTypes.map((t) => [t.id, t.name, t.slug, t.color, userId]),
    entities: ctx.entities.map((e) => [e.id, e.typeId, e.name, e.description, userId]),
    relationshipTypes: ctx.relationshipTypes.map((r) => [r.id, r.slug, r.forwardLabel, r.inverseLabel, userId]),
    events: ctx.events.map((e) => [e.id, e.name, e.startedAt, e.endedAt, e.color, e.emoji, JSON.stringify(e.tags), userId]),
    eventContacts: ctx.eventContacts.map((a) => [a.eventId, a.contactId, a.scannedAt, userId]),
    edges: ctx.edges.map((e) => [e.id, e.srcType, e.srcId, e.predicate, e.dstType, e.dstId, userId]),
    notes: ctx.notes.map((n) => [n.id, n.contactId, n.kind, n.body, userId]),
    facts: ctx.facts.map((f) => [f.id, f.contactId, f.type, f.text, f.confidence, f.sourceNoteId, userId]),
  };
}
