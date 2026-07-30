import { describe, expect, it } from "vitest";
import { profileFromExtracted } from "../../schemas/contact";
import { withUrlScheme } from "../web-url";

/**
 * Cards print a website as a bare domain. The contact form's link field is
 * `type="url"`, so a scheme-less value fails native validation and the save
 * silently does nothing — every scanned card with a plain-domain website hit
 * this. These pin the repair, and pin that it stays narrow: guessing a scheme
 * for arbitrary text would corrupt links the user typed deliberately.
 */
describe("withUrlScheme", () => {
  it("gives a bare domain the scheme a url input demands", () => {
    expect(withUrlScheme("pune.stpi.in")).toBe("https://pune.stpi.in");
    expect(withUrlScheme("www.dhaga.app/about")).toBe("https://www.dhaga.app/about");
  });

  it("leaves anything that already carries a scheme alone", () => {
    expect(withUrlScheme("http://example.com")).toBe("http://example.com");
    expect(withUrlScheme("https://linkedin.com/in/x")).toBe("https://linkedin.com/in/x");
    expect(withUrlScheme("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("does not invent a scheme for things that are not hosts", () => {
    // An email or a scrap of prose prefixed with https:// would be worse than
    // leaving it as the user (or the card) wrote it.
    expect(withUrlScheme("ajay@stpi.in")).toBe("ajay@stpi.in");
    expect(withUrlScheme("Director, STPI Pune")).toBe("Director, STPI Pune");
    expect(withUrlScheme("")).toBe("");
  });
});

describe("profileFromExtracted", () => {
  it("normalises scanned links so the review form can actually be saved", () => {
    const profile = profileFromExtracted({
      name: "Ajay",
      title: null,
      company: null,
      emails: [],
      phones: [],
      links: ["pune.stpi.in"],
      location: null,
    });

    expect(profile.links[0].value).toBe("https://pune.stpi.in");
  });
});
