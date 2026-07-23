import { describe, expect, it } from "vitest";
import { primaryPosition } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";
import { isVcard, parseContactsVcard } from "@/lib/import";

/**
 * The import promise (ideas.md #4, BRD §6.7): a user's own device export
 * (iPhone/iCloud, Android, Google) seeds the graph without an LLM. The parser
 * must survive the format spread (2.1/3.0/4.0), Apple's item-group labels, and
 * QUOTED-PRINTABLE non-ASCII names — or a real import garbles or drops people.
 */

/** Find a ContactMethod by its value, or fail loudly (Rule 12). */
function methodByValue(methods: ContactMethod[], value: string): ContactMethod {
  const found = methods.find((m) => m.value === value);
  if (!found) throw new Error(`no contact method with value "${value}"`);
  return found;
}

describe("vCard (.vcf) parsing", () => {
  it("resolves Apple 3.0 item-grouped X-ABLabel labels (wrapped standard + custom)", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Appleseed;Johnny;;;",
      "FN:Johnny Appleseed",
      "item1.EMAIL;type=INTERNET:johnny@work.example",
      "item1.X-ABLabel:_$!<Work>!$_",
      "item2.EMAIL;type=INTERNET:johnny@school.example",
      "item2.X-ABLabel:School",
      "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    expect(result.format).toBe("vcard");
    expect(result.candidates).toHaveLength(1);
    const { contact, receipt } = result.candidates[0];
    expect(contact.name).toBe("Johnny Appleseed");
    // Apple wraps standard labels (_$!<Work>!$_); a custom label passes verbatim.
    expect(methodByValue(contact.emails, "johnny@work.example").label).toBe("Work");
    expect(methodByValue(contact.emails, "johnny@school.example").label).toBe("School");
    expect(receipt).toContain("Imported from vCard (.vcf)");
  });

  it("decodes a QUOTED-PRINTABLE non-ASCII name (Android 2.1) with no mojibake", () => {
    // Critical regression guard: skipping the TextDecoder step turns
    // "José García" into "JosÃ© GarcÃ­a" — a garbled graph on first import.
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:2.1",
      "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Garc=C3=ADa;Jos=C3=A9;;;",
      "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9 Garc=C3=ADa",
      "TEL;CELL:+34600000000",
      "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    const { contact } = result.candidates[0];
    expect(contact.name).toBe("José García");
    expect(contact.name).not.toContain("Ã");
    // 2.1 bare TYPE token (CELL) still maps to a labeled phone.
    expect(methodByValue(contact.phones, "+34600000000").label).toBe("Mobile");
  });

  it("maps Google 3.0 TYPE=CELL/HOME/WORK to Mobile/Home/Work phone labels", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Sharma;Priya;;;",
      "FN:Priya Sharma",
      "TEL;TYPE=CELL:+1 555 0100",
      "TEL;TYPE=HOME:+1 555 0200",
      "TEL;TYPE=WORK:+1 555 0300",
      "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    const { contact } = result.candidates[0];
    expect(methodByValue(contact.phones, "+1 555 0100").label).toBe("Mobile");
    expect(methodByValue(contact.phones, "+1 555 0200").label).toBe("Home");
    expect(methodByValue(contact.phones, "+1 555 0300").label).toBe("Work");
  });

  it("maps BDAY→Birthday, ORG;dept→position, ADR→address parts + location", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Dana Lee",
      "ORG:Globex;Research",
      "TITLE:Staff Engineer",
      "BDAY:1990-05-15",
      "ADR;TYPE=WORK:;;100 Main St;Springfield;IL;62704;USA",
      "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    const { contact } = result.candidates[0];
    const position = primaryPosition(contact.positions);
    expect(position?.company).toBe("Globex");
    expect(position?.department).toBe("Research");
    expect(position?.title).toBe("Staff Engineer");
    expect(contact.importantDates).toEqual([{ label: "Birthday", value: "1990-05-15", note: null }]);
    expect(contact.addresses).toHaveLength(1);
    const address = contact.addresses[0];
    expect(address.label).toBe("Work");
    expect(address.street).toBe("100 Main St");
    expect(address.city).toBe("Springfield");
    expect(address.region).toBe("IL");
    expect(address.postalCode).toBe("62704");
    expect(address.country).toBe("USA");
    expect(contact.location).toBe("Springfield"); // first address's city
  });

  it("unfolds an RFC-folded value (leading-space continuation) — else the name truncates", () => {
    const vcf = ["BEGIN:VCARD", "VERSION:3.0", "FN:Alexandra Con", " stantinou", "END:VCARD"].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    expect(result.candidates[0].contact.name).toBe("Alexandra Constantinou");
  });

  it("parses multiple cards and skips the nameless one", () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:3.0", "FN:First Person", "END:VCARD",
      "BEGIN:VCARD", "VERSION:3.0", "TEL;TYPE=CELL:+1 555 9999", "END:VCARD",
      "BEGIN:VCARD", "VERSION:3.0", "FN:Third Person", "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    // The middle card has neither FN nor N — no derivable name, so it's dropped.
    expect(result.candidates.map((c) => c.contact.name)).toEqual(["First Person", "Third Person"]);
  });

  it("detects vCard vs non-vCard text with isVcard", () => {
    expect(isVcard("BEGIN:VCARD\nVERSION:3.0\nFN:X\nEND:VCARD")).toBe(true);
    expect(isVcard("First Name,Last Name\nSarah,Chen")).toBe(false);
  });

  it("returns {ok:false} for a file with no cards instead of an empty graph", () => {
    expect(parseContactsVcard("this file has no vCard at all").ok).toBe(false);
  });

  it("ignores a PHOTO base64 blob (never crashes, never lands in output)", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Photo Person",
      "PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQEAYABgAAD/2wBD",
      "EMAIL:photo@example.com",
      "END:VCARD",
    ].join("\n");
    const result = parseContactsVcard(vcf);
    if (!result.ok) throw new Error(result.error);
    const { contact } = result.candidates[0];
    expect(contact.name).toBe("Photo Person");
    expect(contact.emails).toHaveLength(1);
    expect(contact.emails[0].value).toBe("photo@example.com");
    expect(contact.customFields).toHaveLength(0); // blob must not leak into the catch-all
    expect(contact.links).toHaveLength(0);
  });
});
