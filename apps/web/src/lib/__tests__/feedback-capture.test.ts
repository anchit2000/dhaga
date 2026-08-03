import { describe, expect, it } from "vitest";
import {
  describeAttached,
  feedbackSubmissionSchema,
  routePattern,
  sanitizeRoute,
} from "@/lib/feedback/context";

/**
 * WHY these tests exist: a feedback box is the easiest place in the product to
 * break the product's own promise. CLAUDE.md forbids collecting contact PII,
 * note text, extraction output or search queries, and "attach some context for
 * debugging" is exactly the well-meaning change that quietly starts shipping a
 * contact id, a `?q=` search term or a DOM snapshot to the maintainer's inbox.
 *
 * So the allow-list is pinned here rather than trusted to review. These fail if
 * anyone widens what a report can carry — which is the point: widening it is
 * allowed, doing it silently is not.
 */

/**
 * The complete set of things a report may carry, besides the message the user
 * typed. Adding a key here is a deliberate privacy decision, and the assertion
 * below drags the disclosure line along with it — a user must be able to read
 * what is attached before they send it.
 */
const ALLOWED_FIELDS = ["message", "route", "viewport", "userAgent", "locale", "timezone", "appVersion"];

describe("feedback capture allow-list", () => {
  it("carries exactly the reviewed fields and nothing more", () => {
    expect(Object.keys(feedbackSubmissionSchema.shape).sort()).toEqual([...ALLOWED_FIELDS].sort());
  });

  it("drops contact names, note text, searches and page snapshots that a client sends anyway", () => {
    const parsed = feedbackSubmissionSchema.parse({
      message: "The graph is slow",
      route: "/app/graph",
      contactName: "Priya Raman",
      contactId: "c_9f1c4b2e",
      noteText: "Met Priya at the summit, she runs platform eng",
      searchQuery: "priya",
      goalObjective: "find a design partner",
      dom: "<main>…</main>",
      clipboard: "whatever was copied",
      referrer: "https://mail.google.com/",
      ip: "203.0.113.7",
      analyticsId: "ga_1234",
    });
    expect(Object.keys(parsed)).toEqual(["message", "route"]);
    expect(JSON.stringify(parsed)).not.toContain("Priya");
  });

  it("will not let prose through the context fields", () => {
    const base = { message: "hi", route: "/app" };
    // Each of these is a plausible way to smuggle a name into a "harmless"
    // field; the patterns in utils/constants/feedback.ts are what stop it.
    expect(feedbackSubmissionSchema.safeParse({ ...base, viewport: "Priya Raman" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...base, locale: "met Priya today" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...base, timezone: "Priya Raman, Acme" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...base, appVersion: "note: call Priya" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...base, viewport: "375x812", locale: "en-AU", timezone: "Australia/Sydney", appVersion: "4f2a1c9" }).success).toBe(true);
  });

  it("rejects an empty message and one longer than a paragraph", () => {
    expect(feedbackSubmissionSchema.safeParse({ message: "   ", route: "/app" }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ message: "x".repeat(2001), route: "/app" }).success).toBe(false);
  });
});

describe("routePattern", () => {
  it("replaces a contact id with its param name", () => {
    expect(routePattern("/app/people/9f1c4b2e-1111", { id: "9f1c4b2e-1111" })).toBe("/app/people/[id]");
  });

  it("leaves a static route untouched", () => {
    expect(routePattern("/app/graph", {})).toBe("/app/graph");
  });

  it("redacts every segment of a catch-all, not just the first", () => {
    expect(routePattern("/docs/guide/import/csv", { slug: ["guide", "import", "csv"] })).toBe(
      "/docs/[slug]/[slug]/[slug]",
    );
  });

  it("redacts a param that arrives percent-encoded in the path", () => {
    expect(routePattern("/app/companies/Acme%20Corp", { id: "Acme Corp" })).toBe(
      "/app/companies/[id]",
    );
  });
});

describe("sanitizeRoute", () => {
  it("drops the query string, where a search term would be", () => {
    // usePathname() already excludes this; the server drops it regardless,
    // because ?q= is precisely the forbidden payload.
    expect(sanitizeRoute("/app/search?q=Priya%20Raman")).toBe("/app/search");
  });

  it("drops a fragment", () => {
    expect(sanitizeRoute("/app/people/[id]#notes")).toBe("/app/people/[id]");
  });

  it("never returns an empty route", () => {
    expect(sanitizeRoute("?q=priya")).toBe("/");
  });
});

describe("describeAttached", () => {
  it("names every attached field, so nothing is collected silently", () => {
    const line = describeAttached({
      route: "/app/people/[id]",
      viewport: "375x812",
      userAgent: "Mozilla/5.0 (iPhone)",
      locale: "en-AU",
      timezone: "Australia/Sydney",
      appVersion: "4f2a1c9",
    });
    expect(line).toContain("/app/people/[id]");
    expect(line).toContain("375x812");
    expect(line).toContain("en-AU");
    expect(line).toContain("Australia/Sydney");
    expect(line).toContain("4f2a1c9");
    expect(line).toContain("browser");
    expect(line).toContain("account");
  });

  it("omits what the browser could not report rather than showing a blank", () => {
    const line = describeAttached({ route: "/app" });
    expect(line).toBe("Attached: page /app · your browser version · your account.");
  });
});
