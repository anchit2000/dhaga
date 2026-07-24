import { methodValues } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";

/** The identity fields carried alongside a contact hit — everything
 *  detailSnippet needs to explain a non-obvious match. Emails/phones/links and
 *  tags arrive straight from jsonb columns (parsed to JS by the driver). */
export interface IdentityDetailFields {
  location: string | null;
  tags: string[] | null;
  emails: ContactMethod[] | null;
  phones: ContactMethod[] | null;
  links: ContactMethod[] | null;
  companyDomain: string | null;
  companySector: string | null;
}

function firstMatch(words: string[], value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return words.some((word) => lower.includes(word)) ? value : undefined;
}

function firstArrayMatch(words: string[], values: string[]): string | undefined {
  return values.find((value) => {
    const lower = value.toLowerCase();
    return words.some((word) => lower.includes(word));
  });
}

/**
 * Identity + detail fields on contacts/companies. Name/title/company are
 * already visible on the result card, so only the "non-obvious" fields
 * (why else did this contact surface?) get a snippet — one, cheapest to
 * explain first. Returns undefined when only the obvious fields matched.
 */
export function detailSnippet(words: string[], row: IdentityDetailFields): string | undefined {
  const location = firstMatch(words, row.location);
  if (location) return `location: ${location}`;
  const tag = firstArrayMatch(words, row.tags ?? []);
  if (tag) return `tag: ${tag}`;
  const email = firstArrayMatch(words, methodValues(row.emails ?? []));
  if (email) return `email: ${email}`;
  const phone = firstArrayMatch(words, methodValues(row.phones ?? []));
  if (phone) return `phone: ${phone}`;
  const link = firstArrayMatch(words, methodValues(row.links ?? []));
  if (link) return `link: ${link}`;
  const domain = firstMatch(words, row.companyDomain);
  if (domain) return `company: ${domain}`;
  const sector = firstMatch(words, row.companySector);
  if (sector) return `sector: ${sector}`;
  return undefined;
}
