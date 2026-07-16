/**
 * Friend circles (dense, with an organizer hub each), service providers
 * (mostly leaf nodes), stale imports (deliberately disconnected), and travel
 * groups (drawn from existing friends, tied with the custom travelled_with
 * predicate plus a shared trip event).
 */
import {
  ACQUAINTANCE_TITLES,
  CITIES,
  FRIEND_CIRCLE_NAMES,
  GENERAL_TITLES,
  SERVICE_TYPES,
  TRIP_DESTINATIONS,
  WORK_TITLES,
} from "./data.mjs";
import { addContact, addEdge, addEvent, attend, circleCity, clamp, makeName, registerCircle, slugify } from "./context.mjs";

export function buildFriends(ctx, total) {
  if (total < 4) return;
  let left = total;
  let nameIndex = 0;
  while (left > 0) {
    let size = Math.min(left, ctx.rng.int(6, total > 2000 ? 40 : 20));
    if (left - size < 4) size = left; // absorb a too-small remainder
    left -= size;
    const [kind, baseName] = FRIEND_CIRCLE_NAMES[nameIndex % FRIEND_CIRCLE_NAMES.length];
    const suffix = nameIndex >= FRIEND_CIRCLE_NAMES.length ? ` ${Math.floor(nameIndex / FRIEND_CIRCLE_NAMES.length) + 1}` : "";
    buildFriendCircle(ctx, kind, `${baseName}${suffix}`, size);
    nameIndex++;
  }
}

function buildFriendCircle(ctx, kind, name, size) {
  const city = ctx.rng.pick(CITIES);
  const tag = slugify(name);
  const members = [];
  for (let i = 0; i < size; i++) {
    const name = makeName(ctx);
    members.push(
      addContact(ctx, {
        name,
        title: ctx.rng.pick(ctx.rng.chance(0.6) ? WORK_TITLES : GENERAL_TITLES),
        location: circleCity(ctx, city),
        tags: [kind, tag],
        source: ctx.rng.chance(0.5) ? "manual" : "import",
        emails: ctx.rng.chance(0.45)
          ? [{ value: `${slugify(name)}@personalmail.example`, label: "Personal", note: null }]
          : [],
      }),
    );
  }
  // Organizer hub: knows most of the circle; everyone else gets 1-3 ties.
  // School circles use the custom classmate_of predicate for some pairs.
  const organizer = members[0];
  for (const member of members.slice(1)) {
    if (ctx.rng.chance(0.6)) addEdge(ctx, organizer.id, "friend_of", member.id);
    const tieCount = ctx.rng.int(1, 3);
    for (const other of ctx.rng.sample(members, tieCount)) {
      if (other === member) continue;
      const predicate = kind === "school" && ctx.rng.chance(0.4) ? "classmate_of" : "friend_of";
      addEdge(ctx, member.id, predicate, other.id);
    }
  }
  registerCircle(ctx, { name, kind: "friends", tag, city, memberIds: members.map((m) => m.id) });
}

/** Service providers: leaves, tagged; the landlord exercises landlord_of. */
export function buildServices(ctx, count) {
  const family = ctx.circles.find((c) => c.kind === "family");
  for (let i = 0; i < count; i++) {
    const [tag, title] = SERVICE_TYPES[i % SERVICE_TYPES.length];
    const contact = addContact(ctx, {
      name: makeName(ctx),
      title,
      location: ctx.rng.pick(CITIES),
      tags: ["services", tag],
      source: "manual",
      phones: ctx.rng.chance(0.8)
        ? [{ value: `+91 9${String(ctx.rng.int(100000000, 999999999))}`, label: "Mobile", note: null }]
        : [],
    });
    const anchor = family ? ctx.rng.pick(family.memberIds) : null;
    if (!anchor) continue;
    if (tag === "landlord") addEdge(ctx, contact.id, "landlord_of", anchor);
    else if (ctx.rng.chance(0.25)) addEdge(ctx, contact.id, "knows", anchor);
  }
}

/** A handful of stale imports: no edges, no events, no tags — real address
 *  books always carry a few of these disconnected islands. */
export function buildStale(ctx, count) {
  for (let i = 0; i < count; i++) {
    const contact = addContact(ctx, {
      name: makeName(ctx),
      title: ctx.rng.chance(0.5) ? ctx.rng.pick(ACQUAINTANCE_TITLES) : null,
      location: ctx.rng.chance(0.5) ? ctx.rng.pick(CITIES) : null,
      tags: [],
      source: "import",
    });
    ctx.staleIds.add(contact.id);
  }
}

/** Travel groups reuse friends: travelled_with cliques + a shared trip event. */
export function buildTravel(ctx) {
  const friendCircles = ctx.circles.filter((c) => c.kind === "friends");
  if (friendCircles.length === 0) return;
  const groupCount = clamp(Math.round(ctx.contactCount / 500), 2, 5);
  for (let i = 0; i < groupCount; i++) {
    const circle = ctx.rng.pick(friendCircles);
    const buddies = ctx.rng.sample(circle.memberIds, ctx.rng.int(3, 6));
    if (buddies.length < 2) continue;
    for (let a = 0; a < buddies.length; a++) {
      for (let b = a + 1; b < buddies.length; b++) {
        addEdge(ctx, buddies[a], "travelled_with", buddies[b]);
      }
    }
    const destination = TRIP_DESTINATIONS[i % TRIP_DESTINATIONS.length];
    const year = ctx.rng.int(2023, 2026);
    const startedAt = ctx.rng.date(new Date(`${year}-01-01`), new Date(`${year}-06-01`));
    const trip = addEvent(ctx, {
      name: `${destination} Trip ${year}`,
      startedAt,
      endedAt: new Date(startedAt.getTime() + ctx.rng.int(3, 7) * 86400000),
      color: "teal",
      emoji: "✈️",
      tags: ["travel", slugify(destination)],
    });
    for (const buddy of buddies) attend(ctx, trip.id, buddy, startedAt);
  }
}
