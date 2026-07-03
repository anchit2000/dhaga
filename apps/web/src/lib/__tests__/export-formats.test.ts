import { describe, expect, it } from "vitest";
import { contactsToCsv, contactsToVCards } from "@/lib/export/formats";
import type { ExportContact } from "@/lib/export/data";

const contact: ExportContact = {
  id: "1",
  name: 'Sarah "SC" Chen, PhD',
  title: "VP, Payments",
  companyId: "c1",
  companyName: "Stripe; Inc",
  emails: ["sarah@stripe.com"],
  phones: ["+1 555 0100"],
  links: ["https://stripe.com"],
  location: "SF",
  tags: ["fintech"],
  reachOutEveryDays: null,
  lastReachedOutAt: null,
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
});
