import { describe, expect, it } from "vitest";
import { cardReceiptText } from "../card-receipt";
import { emptyExtractedContact } from "../../schemas/contact";

/**
 * The receipt is what survives of a card once the model stops transcribing it,
 * so these assert the two things that matter: every captured detail reaches the
 * note (it is the searchable record of the scan), and a scan that read nothing
 * writes no note at all rather than an empty husk.
 */
describe("cardReceiptText", () => {
  const scanned = {
    ...emptyExtractedContact(),
    name: "Ajay Prasad Shrivastava",
    title: "Director",
    company: "Software Technology Parks of India",
    emails: ["ajay.shrivastava@stpi.in"],
    phones: ["+91-20-22934475", "+91-9914417457"],
    links: ["pune.stpi.in"],
    location: "Pune",
  };

  it("carries every extracted detail into the note, so nothing captured is unsearchable", () => {
    const receipt = cardReceiptText(scanned);
    for (const detail of [
      "Ajay Prasad Shrivastava",
      "Director",
      "Software Technology Parks of India",
      "ajay.shrivastava@stpi.in",
      "+91-20-22934475",
      "+91-9914417457",
      "pune.stpi.in",
      "Pune",
    ]) {
      expect(receipt).toContain(detail);
    }
  });

  it("pairs title with company on one line so the role reads as a role", () => {
    expect(cardReceiptText(scanned)).toContain("Director · Software Technology Parks of India");
  });

  it("keeps the role line readable when the card gives only one of the two", () => {
    expect(cardReceiptText({ ...scanned, company: null })).toContain("Director");
    expect(cardReceiptText({ ...scanned, company: null })).not.toContain("·");
  });

  it("returns nothing when the scan read nothing — an empty receipt note is worse than none", () => {
    expect(cardReceiptText(emptyExtractedContact())).toBe("");
  });
});
