import { describe, expect, it } from "vitest";
import { matchLinkedInProfileUrl } from "@dhaga/core/src/capture/linkedin-qr";

/**
 * LinkedIn QR capture (docs/ideas.md; checklist.md's "LinkedIn QR format
 * support", v1.4): scanning a profile QR must prefill the manual-add form's
 * link field, never auto-create a contact or guess a name from the URL. This
 * matcher is the gate that decides "is this scan LinkedIn-shaped at all" —
 * these cases pin down what does and doesn't count, since getting either
 * direction wrong either breaks the LinkedIn flow or silently hijacks an
 * unrelated scan (a company site, a vCard, a phone number).
 */
describe("matchLinkedInProfileUrl", () => {
  it("matches a profile URL with www and https", () => {
    const url = "https://www.linkedin.com/in/john-doe-4a2b1";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches a profile URL without www", () => {
    const url = "https://linkedin.com/in/jane-smith";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches a profile URL with plain http", () => {
    const url = "http://www.linkedin.com/in/john-doe";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches a profile URL with a trailing slash", () => {
    const url = "https://www.linkedin.com/in/john-doe-4a2b1/";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches a profile URL with query params (e.g. LinkedIn share tracking)", () => {
    const url = "https://www.linkedin.com/in/john-doe-4a2b1?trk=public_profile_share";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches an lnkd.in shortlink", () => {
    const url = "https://lnkd.in/eXaMpLe1";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("matches an lnkd.in shortlink with www", () => {
    const url = "https://www.lnkd.in/eXaMpLe1";
    expect(matchLinkedInProfileUrl(url)).toBe(url);
  });

  it("trims surrounding whitespace before matching", () => {
    expect(matchLinkedInProfileUrl("  https://www.linkedin.com/in/john-doe  ")).toBe(
      "https://www.linkedin.com/in/john-doe",
    );
  });

  it("returns null for a garbage string", () => {
    expect(matchLinkedInProfileUrl("asdkjhasd not a url at all")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(matchLinkedInProfileUrl("")).toBeNull();
  });

  it("returns null for an unrelated company website", () => {
    expect(matchLinkedInProfileUrl("https://www.acme-corp.com")).toBeNull();
  });

  it("returns null for a LinkedIn company page (not a personal profile)", () => {
    expect(matchLinkedInProfileUrl("https://www.linkedin.com/company/acme-corp")).toBeNull();
  });

  it("returns null for vCard-style QR text", () => {
    const vcard = "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD";
    expect(matchLinkedInProfileUrl(vcard)).toBeNull();
  });

  it("returns null for a plain phone number", () => {
    expect(matchLinkedInProfileUrl("+1-555-123-4567")).toBeNull();
  });

  it("returns null for a lookalike host that isn't actually linkedin.com", () => {
    expect(matchLinkedInProfileUrl("https://linkedin.com.evil.example/in/john-doe")).toBeNull();
  });
});
