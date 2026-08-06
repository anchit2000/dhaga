import { describe, expect, it } from "vitest";
import { companyFilteredHref } from "@/utils/company-href";

describe("companyFilteredHref", () => {
  it("targets the existing filtered list and safely encodes the name", () => {
    expect(companyFilteredHref("A & B / India")).toBe(
      "/app/companies?name=A%20%26%20B%20%2F%20India",
    );
  });
});
