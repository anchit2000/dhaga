/**
 * Family circles: 2-4 clusters (own family, in-laws, extended) of small
 * multi-generation trees. Kinship is stored ONCE per pair in its canonical
 * direction — parent_of from parent to child, never child_of back — matching
 * how the app renders a single stored edge from both ends.
 */
import { CITIES, FIRST_NAMES, GENERAL_TITLES, LAST_NAMES } from "./data.mjs";
import { addContact, addEdge, circleCity, clamp, registerCircle, slugify } from "./context.mjs";

export function buildFamilies(ctx, total) {
  if (total < 3) return;
  const clusterCount = clamp(Math.round(total / 12), total >= 10 ? 2 : 1, 4);
  const surnames = ctx.rng.sample(LAST_NAMES, clusterCount);
  const sizes = splitEvenly(ctx, total, clusterCount);
  const clusters = sizes.map((size, i) => buildCluster(ctx, size, surnames[i]));

  // In-law link: one marriage bridges the first two clusters, and a couple of
  // knows edges follow it (families that met at the wedding).
  if (clusters.length >= 2 && clusters[0].length > 1 && clusters[1].length > 1) {
    addEdge(ctx, ctx.rng.pick(clusters[0]).id, "spouse_of", ctx.rng.pick(clusters[1]).id);
    for (let i = 0; i < 3; i++) {
      addEdge(ctx, ctx.rng.pick(clusters[0]).id, "knows", ctx.rng.pick(clusters[1]).id);
    }
  }
}

function splitEvenly(ctx, total, parts) {
  const sizes = [];
  let left = total;
  for (let i = parts; i > 1; i--) {
    const share = Math.round(left / i) + ctx.rng.int(-1, 1);
    const size = clamp(share, 3, left - 3 * (i - 1));
    sizes.push(size);
    left -= size;
  }
  sizes.push(left);
  return sizes;
}

/** One cluster: a grandparent couple, their children (+spouses), grandkids. */
function buildCluster(ctx, size, surname) {
  const city = ctx.rng.pick(CITIES);
  const tags = ["family", `family-${slugify(surname)}`];
  const members = [];
  const person = (title) => {
    const contact = addContact(ctx, {
      name: `${ctx.rng.pick(FIRST_NAMES)} ${surname}`,
      title: title ?? ctx.rng.pick(GENERAL_TITLES),
      location: circleCity(ctx, city),
      // Fresh array per contact — sharing `tags` across the cluster would mean
      // a later `contact.tags.push(...)` (bridges/hubs) mutates one shared
      // array read by every member, not just that contact.
      tags: [...tags],
      source: "manual",
    });
    members.push(contact);
    return contact;
  };

  let left = size;
  const take = (n) => ((left -= n), n);
  const grandparents = left >= 5 ? [person("Retired"), person("Retired")] : [];
  if (grandparents.length === 2) {
    take(2);
    addEdge(ctx, grandparents[0].id, "spouse_of", grandparents[1].id);
  }

  const children = [];
  while (left > 0) {
    const child = person(null);
    take(1);
    children.push(child);
    for (const grandparent of grandparents) addEdge(ctx, grandparent.id, "parent_of", child.id);

    let coParent = null;
    if (left > 0 && ctx.rng.chance(0.65)) {
      coParent = person(null);
      take(1);
      addEdge(ctx, child.id, "spouse_of", coParent.id);
    }
    const kids = take(Math.min(left, ctx.rng.int(0, 2)));
    const kidContacts = [];
    for (let i = 0; i < kids; i++) {
      const kid = person("Student");
      kidContacts.push(kid);
      addEdge(ctx, child.id, "parent_of", kid.id);
      if (coParent) addEdge(ctx, coParent.id, "parent_of", kid.id);
    }
    linkSiblings(ctx, kidContacts);
  }
  linkSiblings(ctx, children);

  registerCircle(ctx, {
    name: `Family ${surname}`,
    kind: "family",
    tag: tags[1],
    city,
    memberIds: members.map((m) => m.id),
  });
  return members;
}

function linkSiblings(ctx, siblings) {
  for (let i = 0; i < siblings.length; i++) {
    for (let j = i + 1; j < siblings.length; j++) {
      addEdge(ctx, siblings[i].id, "sibling_of", siblings[j].id);
    }
  }
}
