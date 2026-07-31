import { describe, expect, it } from "vitest";
import { contactsToCsv, contactsToVCards } from "@/lib/export/formats";
import { address, contact, method } from "./helpers";
import type { ExportContact } from "@/lib/export/data";

describe("contactsToVCards", () => {
  it("escapes reserved characters and emits required properties", () => {
    const vcf = contactsToVCards([contact]);
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("VERSION:3.0");
    expect(vcf).toContain("FN:Sarah \"SC\" Chen\\, PhD");
    expect(vcf).toContain("ORG:Stripe\\; Inc");
    expect(vcf).toContain("EMAIL:sarah@stripe.com");
    expect(vcf).toContain("END:VCARD");
  });

  it("gives each email and phone its own EMAIL/TEL line instead of mashing multiple values into one", () => {
    const multi: ExportContact = {
      ...contact,
      emails: [method("sarah@stripe.com"), method("s.chen@personal.com")],
      phones: [method("+1 555 0100"), method("+1 555 0200")],
    };
    const vcf = contactsToVCards([multi]);
    expect(vcf).toContain("EMAIL:sarah@stripe.com");
    expect(vcf).toContain("EMAIL:s.chen@personal.com");
    expect(vcf).toContain("TEL:+1 555 0100");
    expect(vcf).toContain("TEL:+1 555 0200");
  });

  it("carries a method's own label into the vCard TYPE, and emits NO TYPE when it has none", () => {
    // The whole point of labeled methods: a "Home" email round-trips as
    // TYPE=HOME, so an export→import cycle doesn't flatten every number.
    //
    // An UNLABELED method must stay unlabeled. This file is what a user imports
    // into their phone, and a `TYPE=WORK` default asserts something about a
    // number the user never said — a fabrication indistinguishable, once it is
    // in the address book, from a label they chose. Sync then reads it back as
    // a divergence: "Work" in Dhaga against nothing on the phone, per method,
    // per contact. That default cost 1400 conflict rows on a 700-contact seed.
    const labeled: ExportContact = {
      ...contact,
      emails: [method("home@chen.example", "Home"), method("work@stripe.com")],
      phones: [method("+1 555 0100", "Mobile")],
    };
    const vcf = contactsToVCards([labeled]);
    expect(vcf).toContain("EMAIL;TYPE=HOME:home@chen.example");
    expect(vcf).toContain("EMAIL:work@stripe.com");
    expect(vcf).not.toContain("EMAIL;TYPE=WORK:work@stripe.com");
    expect(vcf).toContain("TEL;TYPE=MOBILE:+1 555 0100");
  });

  it("escapes an embedded CRLF as \\n instead of leaving a raw carriage return, which would corrupt vCard line folding", () => {
    // vCard's own line-folding is CRLF-based; a literal, un-escaped CR
    // smuggled into a value (as opposed to the LF the code already handled)
    // would be indistinguishable from a real line boundary to a strict
    // RFC 6350 parser.
    const withCR: ExportContact = { ...contact, addresses: [address(null, "123 Main St\r\nApt 4")] };
    const vcf = contactsToVCards([withCR]);
    expect(vcf).toContain("ADR:;;123 Main St\\nApt 4;Mumbai;Maharashtra;;India");
  });

  it("emits one ADR per entry of contacts.addresses, carrying each label as an item-group X-ABLabel", () => {
    // contacts.addresses is the multi-value field the sync merge owns, and a
    // field the seed .vcf drops is deleted in Dhaga on the SECOND sync — see
    // ../export-seed/merge-safety. The label rides X-ABLabel rather than a TYPE
    // token because it has to come back verbatim: "Studio" has no TYPE at all,
    // and TYPE=HOME would return "Home" even for a label stored as "home".
    const withAddresses: ExportContact = {
      ...contact,
      addresses: [
        address("Home", "12 Bandra Road", "400050"),
        address("Studio", "4 Kala Ghoda Lane", "400001"),
      ],
    };
    const vcf = contactsToVCards([withAddresses]);
    expect(vcf).toContain("item1.ADR:;;12 Bandra Road;Mumbai;Maharashtra;400050;India");
    expect(vcf).toContain("item1.X-ABLabel:Home");
    expect(vcf).toContain("item2.ADR:;;4 Kala Ghoda Lane;Mumbai;Maharashtra;400001;India");
    expect(vcf).toContain("item2.X-ABLabel:Studio");
  });

  it("numbers address and date item-groups from one shared counter", () => {
    // A grouped property finds its label by group id, so an item1.ADR and an
    // item1.X-ABDATE on the same card would both resolve to whichever
    // X-ABLabel came first — the address would come back labelled "Anniversary".
    const both: ExportContact = {
      ...contact,
      addresses: [address("Home", "12 Bandra Road", "400050")],
      importantDates: [{ label: "Anniversary", value: "2019-09-01", note: null }],
    };
    const vcf = contactsToVCards([both]);
    expect(vcf).toContain("item1.X-ABLabel:Home");
    expect(vcf).toContain("item2.X-ABDATE:2019-09-01");
    expect(vcf).toContain("item2.X-ABLabel:Anniversary");
  });

  it("gives an unlabeled address no group and no TYPE, rather than defaulting it to WORK", () => {
    const unlabeled: ExportContact = {
      ...contact,
      addresses: [address(null, "12 Bandra Road", "400050")],
    };
    const vcf = contactsToVCards([unlabeled]);
    expect(vcf).toContain("ADR:;;12 Bandra Road;Mumbai;Maharashtra;400050;India");
    expect(vcf).not.toContain("ADR;TYPE=WORK");
    expect(vcf).not.toContain("X-ABLabel");
  });

  it("writes no ADR at all for a contact whose only place is the free-text location", () => {
    // `location` is display text, not postal data. Emitting it as an ADR made
    // the round trip ADD a {label:"Work", street:"SF"} entry to
    // contacts.addresses that the user never entered — a fabrication, not a
    // carry-over. The CSV column (and the JSON dump) still hold it.
    const vcf = contactsToVCards([contact]);
    expect(vcf).not.toContain("ADR");
    expect(vcf).not.toContain("SF");
    expect(contactsToCsv([contact])).toContain("SF");
  });
});
