/**
 * Structural passes over the assembled circles:
 * - bridges: ~5% of circle members join a second circle (tag + a few ties),
 *   the "colleague who is also a college friend" pattern;
 * - hubs: a handful of connectors get boosted to degree 50+ with knows/
 *   friend_of/introduced_by edges fanned across every circle, producing the
 *   power-law degree skew real networks have. Stale contacts are never
 *   touched — they must stay disconnected.
 */
import { addEdge, attend, clamp } from "./context.mjs";

export function addBridges(ctx) {
  if (ctx.circles.length < 2) return;
  const bridgeCount = Math.round(ctx.contactCount * 0.05);
  const memberCircle = new Map();
  for (const circle of ctx.circles) {
    for (const id of circle.memberIds) memberCircle.set(id, circle);
  }
  const contactById = new Map(ctx.contacts.map((c) => [c.id, c]));
  const candidates = ctx.rng.sample([...memberCircle.keys()], bridgeCount);
  for (const contactId of candidates) {
    const home = memberCircle.get(contactId);
    const others = ctx.circles.filter((c) => c !== home);
    if (others.length === 0) break;
    const second = ctx.rng.pick(others);
    const contact = contactById.get(contactId);
    if (contact && second.tag && !contact.tags.includes(second.tag)) contact.tags.push(second.tag);
    const predicate = second.kind === "work" ? "worked_with" : "friend_of";
    for (const other of ctx.rng.sample(second.memberIds, ctx.rng.int(2, 4))) {
      addEdge(ctx, contactId, predicate, other);
    }
    second.memberIds.push(contactId);
  }
}

export function addHubs(ctx) {
  const eligible = ctx.contacts.filter((c) => !ctx.staleIds.has(c.id));
  if (eligible.length < 60) return;
  const hubCount = clamp(Math.round(ctx.contactCount * 0.005), 3, 60);
  // Prefer circle "anchors" (first member = family elder / org lead /
  // circle organizer), then fill from anywhere.
  const anchors = ctx.circles.map((circle) => circle.memberIds[0]).filter(Boolean);
  const hubIds = [...new Set([...ctx.rng.sample(anchors, hubCount), ...ctx.rng.sample(eligible, hubCount).map((c) => c.id)])]
    .filter((id) => !ctx.staleIds.has(id))
    .slice(0, hubCount);

  for (const hubId of hubIds) {
    const ceiling = Math.min(150, Math.max(60, Math.floor(eligible.length / 8)));
    const target = ctx.rng.int(50, ceiling);
    let attempts = 0;
    while ((ctx.degree.get(hubId) ?? 0) < target && attempts < target * 15) {
      attempts++;
      const other = ctx.rng.pick(eligible);
      if (other.id === hubId) continue;
      const roll = ctx.rng.float();
      if (roll < 0.7) addEdge(ctx, hubId, "knows", other.id);
      else if (roll < 0.85) addEdge(ctx, hubId, "friend_of", other.id);
      else addEdge(ctx, other.id, "introduced_by", hubId);
    }
  }

  // Connectors are also serial event-goers — but tag-wise that's still just
  // 1-2 tags (from the first couple of events), never one tag per event
  // attended, so hubs sit at the top of the realistic 2-6 tag range instead
  // of accumulating unboundedly.
  if (ctx.events.length > 0) {
    const contactById = new Map(eligible.map((c) => [c.id, c]));
    for (const hubId of hubIds) {
      const attended = ctx.rng.sample(ctx.events, ctx.rng.int(2, Math.min(6, ctx.events.length)));
      for (const event of attended) {
        attend(ctx, event.id, hubId, event.startedAt);
      }
      const hub = contactById.get(hubId);
      if (hub) {
        for (const event of attended.slice(0, ctx.rng.int(1, 2))) {
          if (event.tags[0] && !hub.tags.includes(event.tags[0])) hub.tags.push(event.tags[0]);
        }
      }
    }
  }
}
