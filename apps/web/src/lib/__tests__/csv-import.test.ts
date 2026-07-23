import { describe, expect, it } from "vitest";
import { methodValues, primaryPosition } from "@dhaga/core";
import { parseContactsCsv } from "@/lib/import";

/**
 * The import promise (ideas.md #4): the user's own export files seed the
 * graph without an LLM. Both Google header generations and LinkedIn's
 * preamble-prefixed file must parse, because a silent format miss means an
 * empty graph and a bounced user.
 */
describe("contacts CSV parsing", () => {
  it("parses the current Google Contacts format, incl. ::: multi-values", () => {
    const csv = [
      "First Name,Middle Name,Last Name,Organization Name,Organization Title,Labels,E-mail 1 - Value,E-mail 2 - Value,Phone 1 - Value,Notes",
      'Sarah,,Chen,Stripe,Payments Lead,* myContacts,sarah@stripe.example,s.chen@gmail.example ::: sc@x.example,+1 555 0100,Met at GITEX',
    ].join("\n");
    const result = parseContactsCsv(csv);
    if (!result.ok) throw new Error(result.error);
    expect(result.format).toBe("google");
    expect(result.candidates).toHaveLength(1);
    const { contact, receipt } = result.candidates[0];
    expect(contact.name).toBe("Sarah Chen");
    expect(primaryPosition(contact.positions)?.company).toBe("Stripe");
    expect(primaryPosition(contact.positions)?.title).toBe("Payments Lead");
    expect(methodValues(contact.emails)).toEqual([
      "sarah@stripe.example",
      "s.chen@gmail.example",
      "sc@x.example",
    ]);
    // The receipt must carry what the contact row can't: provenance.
    expect(receipt).toContain("Google Contacts");
    expect(receipt).toContain("Met at GITEX");
  });

  it("carries the Google address column into contact.location instead of dropping it", () => {
    // Google's export puts each contact's address under "Address N -
    // Formatted", not under any of the name/org columns already mapped.
    // ContactForm and createContact both read/write contact.location, so a
    // hardcoded null here would silently erase real address data on import.
    const csv = [
      "First Name,Last Name,Organization Name,E-mail 1 - Value,Address 1 - Formatted",
      "Sarah,Chen,Stripe,sarah@stripe.example,\"123 Market St, San Francisco, CA 94105, USA\"",
    ].join("\n");
    const result = parseContactsCsv(csv);
    if (!result.ok) throw new Error(result.error);
    expect(result.candidates[0].contact.location).toBe(
      "123 Market St, San Francisco, CA 94105, USA",
    );
  });

  it("parses the legacy Google format (Given/Family, Organization 1)", () => {
    const csv = [
      "Name,Given Name,Family Name,Organization 1 - Name,Organization 1 - Title,E-mail 1 - Value",
      "Rohan Mehta,Rohan,Mehta,Freightline,Head of Ops,rohan@freightline.example",
    ].join("\n");
    const result = parseContactsCsv(csv);
    if (!result.ok) throw new Error(result.error);
    expect(result.format).toBe("google");
    expect(result.candidates[0].contact.name).toBe("Rohan Mehta");
    expect(primaryPosition(result.candidates[0].contact.positions)?.company).toBe(
      "Freightline",
    );
  });

  it("finds the LinkedIn header behind the Notes: preamble and keeps quoted commas", () => {
    const csv = [
      "Notes:",
      '"When exporting your connection data, you may be missing emails."',
      "",
      "First Name,Last Name,URL,Email Address,Company,Position,Connected On",
      'Priya,"Jain, PhD",https://www.linkedin.com/in/priya,priya@acme.example,"Acme, Inc.",CTO,12 Mar 2024',
    ].join("\n");
    const result = parseContactsCsv(csv);
    if (!result.ok) throw new Error(result.error);
    expect(result.format).toBe("linkedin");
    const { contact, receipt } = result.candidates[0];
    expect(contact.name).toBe("Priya Jain, PhD");
    expect(primaryPosition(contact.positions)?.company).toBe("Acme, Inc.");
    expect(methodValues(contact.links)).toEqual(["https://www.linkedin.com/in/priya"]);
    expect(receipt).toContain("connected 12 Mar 2024");
  });

  it("rejects a CSV that is neither format instead of guessing", () => {
    const result = parseContactsCsv("Name,Email\nSomeone,someone@example.com");
    expect(result.ok).toBe(false);
  });
});
