/**
 * Events and the acquaintances met there. Conferences absorb the bulk of a
 * large network (badge scans), each with a cohort of event-only contacts plus
 * a few existing circle members; meetups and weddings mix existing circles.
 * Co-attendance sprinkles cross-cluster met_at/knows/introduced_by edges,
 * which is how real networks get their shortcuts between circles.
 */
import {
  ACQUAINTANCE_TITLES,
  CITIES,
  COMPANY_WORDS_A,
  COMPANY_WORDS_B,
  CONFERENCE_NAMES,
  EVENT_COLOR_TOKENS,
  EVENT_EMOJIS,
  MEETUP_NAMES,
  SECTORS,
} from "./data.mjs";
import { addCompany, addContact, addEdge, addEvent, attend, clamp, makeName, slugify } from "./context.mjs";

export function buildEventsAndAcquaintances(ctx, acquaintanceTotal) {
  const externalCompanies = buildExternalCompanies(ctx, Math.ceil(acquaintanceTotal / 7));
  const conferences = buildConferences(ctx);
  const acquaintances = buildAcquaintances(ctx, acquaintanceTotal, externalCompanies, conferences);
  fillCohorts(ctx, conferences, acquaintances);
  buildMeetups(ctx);
  buildWeddings(ctx);
}

function buildExternalCompanies(ctx, count) {
  const companies = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let name = `${ctx.rng.pick(COMPANY_WORDS_A)} ${ctx.rng.pick(COMPANY_WORDS_B)}`;
    if (used.has(name)) name = `${name} ${used.size}`;
    used.add(name);
    companies.push(addCompany(ctx, name, `${slugify(name)}.example`, ctx.rng.pick(SECTORS)));
  }
  return companies;
}

function buildConferences(ctx) {
  const count = clamp(Math.round(ctx.contactCount / 40), 8, 120);
  const conferences = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const year = ctx.rng.int(2022, 2026);
    let name = `${ctx.rng.pick(CONFERENCE_NAMES)} ${year}`;
    if (used.has(name)) name = `${ctx.rng.pick(CONFERENCE_NAMES)} ${year} — ${ctx.rng.pick(CITIES)}`;
    if (used.has(name)) continue;
    used.add(name);
    const startedAt = ctx.rng.date(new Date(`${year}-01-15`), new Date(`${year}-06-15`));
    conferences.push(
      addEvent(ctx, {
        name,
        startedAt,
        endedAt: new Date(startedAt.getTime() + ctx.rng.int(1, 2) * 86400000),
        color: ctx.rng.pick(EVENT_COLOR_TOKENS),
        emoji: ctx.rng.pick(EVENT_EMOJIS),
        tags: [slugify(name), "conference"],
      }),
    );
  }
  return conferences;
}

/**
 * Event-only contacts: the long tail of the network. Companies are assigned
 * power-law-ish (a few big employers, many single-contact ones); each
 * acquaintance is tagged with the conference they were met at.
 */
function buildAcquaintances(ctx, total, externalCompanies, conferences) {
  const acquaintances = [];
  for (let i = 0; i < total; i++) {
    const company =
      externalCompanies.length > 0 && ctx.rng.chance(0.9)
        ? externalCompanies[Math.floor(Math.pow(ctx.rng.float(), 1.6) * externalCompanies.length)]
        : null;
    const conference = conferences.length > 0 ? ctx.rng.pick(conferences) : null;
    const name = makeName(ctx);
    const title = ctx.rng.pick(ACQUAINTANCE_TITLES);
    // Role tag (from title) alongside the "met at" conference tag — every
    // acquaintance gets both, matching the primary-circle-tag + role-tag mix
    // the rest of the network has.
    const tags = conference ? [conference.tags[0], slugify(title)] : [slugify(title)];
    const contact = addContact(ctx, {
      name,
      title,
      companyId: company?.id ?? null,
      location: ctx.rng.pick(CITIES),
      tags,
      source: "import",
      emails:
        company && ctx.rng.chance(0.6)
          ? [{ value: `${slugify(name)}@${company.domain}`, label: "Work", note: null }]
          : [],
    });
    contact.primaryEvent = conference;
    acquaintances.push(contact);
  }
  return acquaintances;
}

function fillCohorts(ctx, conferences, acquaintances) {
  const byEvent = new Map(conferences.map((event) => [event.id, []]));
  for (const contact of acquaintances) {
    if (!contact.primaryEvent) continue;
    attendAt(ctx, contact.primaryEvent, contact.id);
    byEvent.get(contact.primaryEvent.id)?.push(contact.id);
    if (ctx.rng.chance(0.15)) {
      const second = ctx.rng.pick(conferences);
      attendAt(ctx, second, contact.id);
      byEvent.get(second.id)?.push(contact.id);
      // Heavy event-goer: the second conference earns its own tag too
      // (bounded to this one contact — `contact.tags` is never shared).
      if (second.tags[0] && !contact.tags.includes(second.tags[0])) contact.tags.push(second.tags[0]);
    }
  }
  // Existing circle members drop by, then co-attendance mints thin edges.
  const circleMembers = ctx.circles.flatMap((circle) => circle.memberIds);
  for (const event of conferences) {
    const cohort = byEvent.get(event.id) ?? [];
    if (circleMembers.length > 0) {
      for (const memberId of ctx.rng.sample(circleMembers, ctx.rng.int(2, 8))) {
        if (attend(ctx, event.id, memberId, event.startedAt)) cohort.push(memberId);
      }
    }
    const pairCount = Math.min(40, Math.ceil(cohort.length * 0.12));
    for (let i = 0; i < pairCount; i++) {
      const [a, b] = [ctx.rng.pick(cohort), ctx.rng.pick(cohort)];
      if (a === b) continue;
      const roll = ctx.rng.float();
      if (roll < 0.55) addEdge(ctx, a, "met_at", b);
      else if (roll < 0.85) addEdge(ctx, a, "knows", b);
      else addEdge(ctx, a, "introduced_by", b);
    }
  }
}

function attendAt(ctx, event, contactId) {
  if (!event) return;
  attend(ctx, event.id, contactId, new Date(event.startedAt.getTime() + ctx.rng.int(1, 30) * 3600000));
}

/** Meetups: small recurring gatherings of friends + colleagues. */
function buildMeetups(ctx) {
  const pool = ctx.circles.filter((c) => c.kind === "friends" || c.kind === "work");
  if (pool.length === 0) return;
  const count = clamp(Math.round(ctx.contactCount / 120), 3, 40);
  for (let i = 0; i < count; i++) {
    const name = `${MEETUP_NAMES[i % MEETUP_NAMES.length]}${i >= MEETUP_NAMES.length ? ` #${Math.floor(i / MEETUP_NAMES.length) + 1}` : ""}`;
    const startedAt = ctx.rng.date(new Date("2024-01-01"), ctx.baseDate);
    const event = addEvent(ctx, {
      name,
      startedAt,
      endedAt: null,
      color: ctx.rng.pick(EVENT_COLOR_TOKENS),
      emoji: ctx.rng.pick(EVENT_EMOJIS),
      tags: ["meetup"],
    });
    const circle = ctx.rng.pick(pool);
    for (const memberId of ctx.rng.sample(circle.memberIds, ctx.rng.int(5, 15))) {
      attend(ctx, event.id, memberId, startedAt);
    }
  }
}

/** One or two weddings: family + friends cohorts, cross-circle by nature. */
function buildWeddings(ctx) {
  const families = ctx.circles.filter((c) => c.kind === "family");
  const friends = ctx.circles.filter((c) => c.kind === "friends");
  if (families.length === 0) return;
  for (let i = 0; i < Math.min(2, families.length); i++) {
    const startedAt = ctx.rng.date(new Date("2023-10-01"), new Date("2026-03-01"));
    const event = addEvent(ctx, {
      name: `${families[i].name.replace("Family ", "")} Wedding`,
      startedAt,
      endedAt: startedAt,
      color: "rose",
      emoji: "🎉",
      tags: ["wedding", "family"],
    });
    const guests = [
      ...families[i].memberIds,
      ...(friends.length > 0 ? ctx.rng.sample(ctx.rng.pick(friends).memberIds, 10) : []),
    ];
    for (const guest of ctx.rng.sample(guests, Math.min(guests.length, 40))) {
      attend(ctx, event.id, guest, startedAt);
    }
  }
}
