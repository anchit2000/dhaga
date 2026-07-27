/** Company-name normalisation used to detect duplicates ("Acme Inc." and
 *  "Acme" are the same company). Legal-entity suffixes carry no identity, so the
 *  duplicate normaliser strips them before comparing. Stored lowercase and
 *  punctuation-free — the normaliser lowercases the name and drops punctuation
 *  before matching each token against this set. */
export const COMPANY_LEGAL_SUFFIXES: readonly string[] = [
  "inc",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "pvt",
  "private",
  "plc",
  "llp",
];

/** Upper bound on companies scanned for duplicate detection in one pass. A
 *  personal CRM never approaches this; if a graph somehow exceeds it we throw
 *  rather than silently grouping only the first slice (Rule 12 — fail loud). */
export const DUPLICATE_COMPANY_SCAN_LIMIT = 10_000;
