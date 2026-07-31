/**
 * "A contact the user authored in Dhaga" — the single definition of which rows
 * may be written into an EXTERNAL address book.
 *
 * Two surfaces push contacts outward and they must agree exactly: the sync
 * path, which offers unlinked contacts to the client one write at a time
 * (./sweep.ts), and the bulk path, where the user exports a seed .vcf and
 * imports it into their phone in one go (@/lib/export/data, `scope=authored`).
 * A second copy of this rule would drift silently, and the drift is a privacy
 * incident rather than a bug report: the fast path would shove into an address
 * book precisely what the safe path refuses to.
 *
 * The parameter is a structural shape, not a row type, because the two callers
 * hold different ones (LocalContact vs ExportContact).
 */
export interface AuthoredContactFields {
  /** `contacts.source` — how the row got into the graph. */
  source: string;
  name: string | null;
}

/**
 * Contacts eligible to be written outward are the ones the user CREATED in
 * Dhaga, which is narrower than "everything unlinked":
 *
 *  - "mentioned" rows are AI-inferred stubs, a name lifted out of a note.
 *    Inferred data must never be written into an external address book.
 *  - "import" rows came from somewhere else — a CSV/vCard the user uploaded, a
 *    connected account, or a previous sync. They are unlinked HERE by accident
 *    of provenance, not because the user authored them, and pushing them would
 *    turn "add my Dhaga people to my phone" into "replay every list I have ever
 *    imported into my address book".
 *
 * A nameless row is excluded too — an address-book record with no name is not a
 * contact, it is a blank the user has to clean off every device it reaches.
 */
export function isAuthoredContact(contact: AuthoredContactFields): boolean {
  if (!contact.name?.trim()) return false;
  return contact.source !== "mentioned" && contact.source !== "import";
}
