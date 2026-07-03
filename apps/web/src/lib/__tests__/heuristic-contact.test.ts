import { describe, expect, it } from "vitest";
import { heuristicContactParse } from "@dhaga/core";

/**
 * The offline parser is the keyless/over-budget fallback (M1's free path) —
 * these cases encode what "good enough to review" means.
 */
describe("heuristicContactParse", () => {
  it("parses a dash-separated signature (title vs company)", () => {
    const result = heuristicContactParse(
      "Nisha Shah\nPrincipal, Early Stage — Meridian Capital\nnisha@meridian.vc | +65 9123 4567\nSingapore",
    );
    expect(result.name).toBe("Nisha Shah");
    expect(result.title).toBe("Principal");
    expect(result.company).toBe("Meridian Capital");
    expect(result.emails).toEqual(["nisha@meridian.vc"]);
    expect(result.phones).toEqual(["+65 9123 4567"]);
  });

  it('parses "at"-separated title lines', () => {
    const result = heuristicContactParse(
      "Rohan Mehta\nHead of Operations at Freightline\nrohan@freightline.io",
    );
    expect(result.title).toBe("Head of Operations");
    expect(result.company).toBe("Freightline");
  });

  it("falls back to the email domain for the company", () => {
    const result = heuristicContactParse("Sarah Chen\nsarah@stripe.com");
    expect(result.company).toBe("Stripe");
  });

  it("never invents a company from free-mail domains", () => {
    const result = heuristicContactParse("Dan Wu\ndan.wu@gmail.com");
    expect(result.company).toBeNull();
  });

  it("extracts links and strips trailing punctuation", () => {
    const result = heuristicContactParse(
      "Priya Nair\nlinkedin.com/in/priyanair, www.freightline.io.",
    );
    expect(result.links).toContain("linkedin.com/in/priyanair");
    expect(result.links).toContain("www.freightline.io");
  });
});
