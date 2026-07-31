import { describe, expect, it } from "vitest";
import { contactsToCsv } from "@/lib/export/formats";
import { contact, method } from "./helpers";
import type { ExportContact } from "@/lib/export/data";

/** Export is the no-lock-in promise (M8) — escaping must round-trip. */
describe("contactsToCsv", () => {
  it("quotes and escapes fields containing commas and quotes", () => {
    const csv = contactsToCsv([contact]);
    const [header, row] = csv.split("\r\n");
    expect(header).toContain("name,title,company");
    expect(row).toContain('"Sarah ""SC"" Chen, PhD"');
    expect(row).toContain('"VP, Payments"');
  });

  it("quotes a field containing a bare carriage return, since many CSV readers treat a lone CR as a row break", () => {
    // A field with just \r (no \n) — e.g. pasted from an old Mac-style text
    // source — must still be quoted, or the unescaped CR reads as a row
    // terminator to readers using universal-newline splitting and silently
    // shreds this contact's row into two.
    const withCR: ExportContact = { ...contact, location: "Line1\rLine2" };
    const csv = contactsToCsv([withCR]);
    expect(csv).toContain('"Line1\rLine2"');
  });

  it("emits each of multiple emails/phones joined in one cell rather than one column per value", () => {
    const multi: ExportContact = {
      ...contact,
      emails: [method("sarah@stripe.com"), method("s.chen@personal.com")],
      phones: [method("+1 555 0100"), method("+1 555 0200")],
    };
    const csv = contactsToCsv([multi]);
    expect(csv).toContain("sarah@stripe.com; s.chen@personal.com");
    expect(csv).toContain("+1 555 0100; +1 555 0200");
  });
});
