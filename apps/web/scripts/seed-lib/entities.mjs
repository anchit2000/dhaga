/**
 * Custom knowledge-graph vocabulary: node types (Gym/School/Project/Community),
 * the entities under them, contact→entity membership edges, and the custom
 * relationship_types rows whose slugs (travelled_with, landlord_of,
 * classmate_of) other builders already put on edges — so user-defined labels
 * are exercised end-to-end.
 */
import { CUSTOM_RELATIONSHIP_TYPES, ENTITY_NAMES, NODE_TYPES } from "./data.mjs";
import { addEdge, clamp } from "./context.mjs";

const MEMBERSHIP_PREDICATE = { gym: "member_of", school: "attends", project: "works_on", community: "member_of" };

export function buildRelationshipTypes(ctx) {
  for (const [slug, forwardLabel, inverseLabel] of CUSTOM_RELATIONSHIP_TYPES) {
    ctx.relationshipTypes.push({ id: ctx.rng.uuid(), slug, forwardLabel, inverseLabel });
  }
}

export function buildEntities(ctx) {
  const types = NODE_TYPES.map(([name, slug, color]) => {
    const row = { id: ctx.rng.uuid(), name, slug, color };
    ctx.nodeTypes.push(row);
    return row;
  });

  const entityCount = clamp(Math.round(ctx.contactCount / 50), 10, 30);
  const used = new Set();
  for (let i = 0; i < entityCount; i++) {
    const type = types[i % types.length];
    const pool = ENTITY_NAMES[type.slug];
    let name = pool[i % pool.length];
    if (used.has(name)) name = `${name} ${Math.floor(i / pool.length) + 1}`;
    used.add(name);
    const entity = {
      id: ctx.rng.uuid(),
      typeId: type.id,
      name,
      description: ctx.rng.chance(0.6) ? `${type.name} — added from notes` : null,
    };
    ctx.entities.push(entity);
    linkMembers(ctx, entity, type.slug);
  }
}

/** Membership edges pull from circle kinds that fit the entity's type. */
function linkMembers(ctx, entity, typeSlug) {
  const kinds =
    typeSlug === "project" ? ["work"] : typeSlug === "school" ? ["family", "friends"] : ["friends", "family", "work"];
  const pools = ctx.circles.filter((circle) => kinds.includes(circle.kind));
  if (pools.length === 0) return;
  const memberIds = ctx.rng.sample(ctx.rng.pick(pools).memberIds, ctx.rng.int(3, typeSlug === "community" ? 25 : 12));
  for (const contactId of memberIds) {
    addEdge(ctx, contactId, MEMBERSHIP_PREDICATE[typeSlug], entity.id, { dstType: "entity" });
  }
}
