/**
 * Work circles: a 3-6 employer career, newest first. The current employer is
 * the densest (colleague_of + a manager per team); older jobs keep fewer
 * surviving ties (worked_with, thinner every job back). Every colleague gets
 * a positions row — is_current only at the newest employer.
 */
import { EMPLOYER_NAMES, LEAD_TITLES, CITIES, WORK_TITLES } from "./data.mjs";
import { addCompany, addContact, addEdge, circleCity, registerCircle, slugify, makeName } from "./context.mjs";

const SIZE_WEIGHTS = [0.34, 0.24, 0.17, 0.12, 0.08, 0.05];

export function buildWork(ctx, total) {
  if (total < 4) return;
  const employerCount = total < 12 ? 1 : total < 120 ? 3 : total < 300 ? 4 : total < 900 ? 5 : 6;
  const weights = SIZE_WEIGHTS.slice(0, employerCount);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  let left = total;
  for (let i = 0; i < employerCount; i++) {
    const employersAfter = employerCount - i - 1;
    const size =
      employersAfter === 0
        ? left
        : Math.min(Math.max(3, Math.round((weights[i] / weightSum) * total)), left - 3 * employersAfter);
    left -= size;
    buildEmployer(ctx, i, size);
  }
}

function buildEmployer(ctx, employerIndex, size) {
  const [name, domain, sector] = EMPLOYER_NAMES[employerIndex];
  const company = addCompany(ctx, name, domain, sector);
  const city = ctx.rng.pick(CITIES);
  const isCurrent = employerIndex === 0;
  const tag = slugify(name);
  const tags = [tag, isCurrent ? "work" : "ex-colleague"];
  // Career timeline: employer 0 is 2023-now, each older job ~3 years earlier.
  const startYear = 2023 - employerIndex * 3;
  const endYear = isCurrent ? null : startYear + 3;

  const members = [];
  for (let i = 0; i < size; i++) {
    const isLead = i % ctx.rng.int(6, 9) === 0;
    const title = isLead ? ctx.rng.pick(LEAD_TITLES) : ctx.rng.pick(WORK_TITLES);
    const personName = makeName(ctx);
    const contact = addContact(ctx, {
      name: personName,
      title,
      companyId: company.id,
      location: circleCity(ctx, city),
      // Fresh array per contact (+ a "lead" role tag for leads) — sharing
      // `tags` across the whole employer would mean a later
      // `contact.tags.push(...)` (bridges/hubs) mutates one array read by
      // every colleague, not just that contact.
      tags: isLead ? [...tags, "lead"] : [...tags],
      source: "import",
      emails: ctx.rng.chance(0.7)
        ? [{ value: `${slugify(personName)}@${domain}`, label: "Work", note: null }]
        : [],
      phones: ctx.rng.chance(0.25)
        ? [{ value: `+91 9${String(ctx.rng.int(100000000, 999999999))}`, label: "Mobile", note: null }]
        : [],
    });
    contact.isLead = isLead;
    members.push(contact);
    ctx.positions.push({
      id: ctx.rng.uuid(),
      contactId: contact.id,
      companyId: company.id,
      title,
      isCurrent,
      startedAt: String(startYear + ctx.rng.int(0, 2)),
      endedAt: endYear === null ? null : String(endYear),
    });
  }

  linkTeams(ctx, members, employerIndex);

  // A few mentorship ties per company, senior (lead) to junior.
  const leads = members.filter((m) => m.isLead);
  const juniors = members.filter((m) => !m.isLead);
  const mentorships = Math.min(leads.length, Math.round(size / 40));
  for (let i = 0; i < mentorships; i++) {
    addEdge(ctx, ctx.rng.pick(leads).id, "mentor_of", ctx.rng.pick(juniors).id);
  }

  registerCircle(ctx, { name, kind: "work", tag, city, memberIds: members.map((m) => m.id) });
}

/**
 * Teams of ~5-9. Current employer: manager edge per team plus 2-4 colleague_of
 * ties per member. Older employers: only decaying worked_with remnants — the
 * further back the job, the fewer ties survive.
 */
function linkTeams(ctx, members, employerIndex) {
  const isCurrent = employerIndex === 0;
  const decay = 1 / (1 + employerIndex * 0.8);
  // manages on even employers, reports_to on odd — same pair never gets both
  // (addEdge enforces it), this just varies which phrasing is stored.
  const managePredicate = employerIndex % 2 === 0 ? "manages" : "reports_to";

  for (let start = 0; start < members.length; start += ctx.rng.int(5, 9)) {
    const team = members.slice(start, start + 9);
    const lead = team.find((m) => m.isLead) ?? team[0];
    for (const member of team) {
      if (member !== lead && (isCurrent || ctx.rng.chance(decay))) {
        if (managePredicate === "manages") addEdge(ctx, lead.id, "manages", member.id);
        else addEdge(ctx, member.id, "reports_to", lead.id);
      }
      const tieCount = isCurrent ? ctx.rng.int(2, 4) : Math.max(0, Math.round(ctx.rng.int(1, 3) * decay));
      for (const teammate of ctx.rng.sample(team, tieCount)) {
        if (teammate === member) continue;
        addEdge(ctx, member.id, isCurrent ? "colleague_of" : "worked_with", teammate.id);
      }
    }
  }
}
