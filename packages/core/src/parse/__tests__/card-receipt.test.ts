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
    name: "Rohan Prasad Shrivastava",
    title: "Director",
    company: "Software Technology Parks of India",
    emails: [{ value: "ajay.shrivastava@stpi.in", label: null }],
    phones: [
      { value: "+91-20-22934475", label: null },
      { value: "+91-9914417457", label: null },
    ],
    links: ["pune.stpi.in"],
    location: "Pune",
  };

  it("carries every extracted detail into the note, so nothing captured is unsearchable", () => {
    const receipt = cardReceiptText(scanned);
    for (const detail of [
      "Rohan Prasad Shrivastava",
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

  /**
   * A source that says WHICH number is which (a society noticeboard, a card
   * with separate desk and mobile lines) is stating a fact. If the receipt
   * flattens it to a bare list, the note stops being an audit trail of what was
   * captured and the user has to re-derive the labels from the photo.
   */
  it("keeps each method's label beside its value, so whose number is whose survives", () => {
    const receipt = cardReceiptText({
      ...scanned,
      phones: [
        { value: "7507626215", label: "Society office" },
        { value: "9764648750", label: "MNGL (Navnath)" },
      ],
    });
    expect(receipt).toContain("Society office – 7507626215");
    expect(receipt).toContain("MNGL (Navnath) – 9764648750");
  });

  it("prints an unlabeled method as the bare value, with no orphan separator", () => {
    expect(cardReceiptText(scanned)).toContain("\n+91-20-22934475\n");
  });

  it("returns nothing when the scan read nothing — an empty receipt note is worse than none", () => {
    expect(cardReceiptText(emptyExtractedContact())).toBe("");
  });
});
