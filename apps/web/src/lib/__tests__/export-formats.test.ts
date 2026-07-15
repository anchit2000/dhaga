import { describe, expect, it } from "vitest";
import { contactsToCsv, contactsToVCards } from "@/lib/export/formats";
import type { ContactMethod } from "@dhaga/core";
import type { ExportContact } from "@/lib/export/data";

const method = (value: string, label: string | null = null): ContactMethod => ({
  value,
  label,
  note: null,
});

const contact: ExportContact = {
  id: "1",
  name: 'Sarah "SC" Chen, PhD',
  nickname: null,
  title: "VP, Payments",
  companyId: "c1",
  companyName: "Stripe; Inc",
  emails: [method("sarah@stripe.com")],
  phones: [method("+1 555 0100")],
  links: [method("https://stripe.com")],
  addresses: [],
  importantDates: [],
  customFields: [],
  location: "SF",
  tags: ["fintech"],
  reachOutEveryDays: null,
  lastReachedOutAt: null,
  watchedForSignals: false,
  signalsScannedAt: null,
  source: "manual",
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

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

describe("contactsToVCards", () => {
  it("escapes reserved characters and emits required properties", () => {
    const vcf = contactsToVCards([contact]);
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("VERSION:3.0");
    expect(vcf).toContain("FN:Sarah \"SC\" Chen\\, PhD");
    expect(vcf).toContain("ORG:Stripe\\; Inc");
    expect(vcf).toContain("EMAIL;TYPE=WORK:sarah@stripe.com");
    expect(vcf).toContain("END:VCARD");
  });

  it("gives each email and phone its own EMAIL/TEL line instead of mashing multiple values into one", () => {
    const multi: ExportContact = {
      ...contact,
      emails: [method("sarah@stripe.com"), method("s.chen@personal.com")],
      phones: [method("+1 555 0100"), method("+1 555 0200")],
    };
    const vcf = contactsToVCards([multi]);
    expect(vcf).toContain("EMAIL;TYPE=WORK:sarah@stripe.com");
    expect(vcf).toContain("EMAIL;TYPE=WORK:s.chen@personal.com");
    expect(vcf).toContain("TEL;TYPE=WORK:+1 555 0100");
    expect(vcf).toContain("TEL;TYPE=WORK:+1 555 0200");
  });

  it("carries a method's own label into the vCard TYPE, defaulting to WORK when unlabeled", () => {
    // The whole point of labeled methods: a "Home" email round-trips as
    // TYPE=HOME, so an export→import cycle doesn't flatten every number to WORK.
    const labeled: ExportContact = {
      ...contact,
      emails: [method("home@chen.example", "Home"), method("work@stripe.com")],
      phones: [method("+1 555 0100", "Mobile")],
    };
    const vcf = contactsToVCards([labeled]);
    expect(vcf).toContain("EMAIL;TYPE=HOME:home@chen.example");
    expect(vcf).toContain("EMAIL;TYPE=WORK:work@stripe.com");
    expect(vcf).toContain("TEL;TYPE=MOBILE:+1 555 0100");
  });

  it("escapes an embedded CRLF as \\n instead of leaving a raw carriage return, which would corrupt vCard line folding", () => {
    // vCard's own line-folding is CRLF-based; a literal, un-escaped CR
    // smuggled into a value (as opposed to the LF the code already handled)
    // would be indistinguishable from a real line boundary to a strict
    // RFC 6350 parser.
    const withCR: ExportContact = { ...contact, location: "123 Main St\r\nApt 4" };
    const vcf = contactsToVCards([withCR]);
    expect(vcf).toContain("ADR;TYPE=WORK:;;123 Main St\\nApt 4;;;;");
  });
});
