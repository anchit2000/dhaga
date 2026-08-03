import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { feedback } from "@/lib/db/schema";
import { POST } from "@/app/api/feedback/route";
import type { FeedbackRow } from "@/lib/db/schema";

/**
 * WHY these tests exist: the user's report is the thing that must survive.
 *
 * Two failure modes are the reason. First, the owner notification is a network
 * call to a third party that is DOWN sometimes and UNCONFIGURED on every
 * self-host — if that can fail the request, a user who took the trouble to write
 * in gets an error and their words are lost. Second, this endpoint is the one
 * place in the app that ships context off the graph, so what lands in the table
 * has to be the reviewed allow-list even when the client sends more.
 *
 * Runs against the in-memory PGlite the vitest config boots, through the real
 * withUserDb / repo / schema path — the row that comes back is a real row.
 */

let currentUserId = "feedback-user";
let sendEmailImpl: () => Promise<{ ok: boolean; error?: string }> = async () => ({ ok: true });

vi.mock("@/lib/auth/guard", () => ({
  // request-scope falls back to the default (unscoped) PGlite db when there is
  // no session — the same shape the rest of the repo suite runs in.
  getCurrentUser: async () => null,
  requireUserIdFromRequest: async () => currentUserId,
}));

vi.mock("@/lib/email/send", () => ({
  emailEnabled: () => true,
  ownerEmail: () => "owner@dhaga.test",
  emailShell: (title: string, body: string) => `${title}${body}`,
  sendEmail: async () => sendEmailImpl(),
}));

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function rowsFor(userId: string): Promise<FeedbackRow[]> {
  const db = await getDb();
  // `user_id` only exists once EE's RLS DDL has run; PGlite has neither, so the
  // route's own message text is what distinguishes one test's rows here.
  return db.select().from(feedback).where(eq(feedback.message, userId));
}

afterEach(() => {
  sendEmailImpl = async () => ({ ok: true });
  vi.restoreAllMocks();
});

describe("POST /api/feedback", () => {
  it("stores the report with its attached context", async () => {
    currentUserId = "feedback-store-user";
    const response = await post({
      message: "feedback-store-user",
      route: "/app/people/[id]",
      viewport: "375x812",
      userAgent: "Mozilla/5.0 (iPhone)",
      locale: "en-AU",
      timezone: "Australia/Sydney",
      appVersion: "4f2a1c9",
    });
    expect(response.status).toBe(200);

    const [row] = await rowsFor("feedback-store-user");
    expect(row).toBeDefined();
    expect(row.route).toBe("/app/people/[id]");
    expect(row.viewport).toBe("375x812");
    expect(row.locale).toBe("en-AU");
    expect(row.timezone).toBe("Australia/Sydney");
    expect(row.appVersion).toBe("4f2a1c9");
  });

  it("keeps the report when the owner email throws", async () => {
    currentUserId = "feedback-email-user";
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    sendEmailImpl = async () => {
      throw new Error("resend unreachable");
    };

    const response = await post({ message: "feedback-email-user", route: "/app" });

    // The user is told it sent, because it did — the row is committed and the
    // notification is a best-effort side effect, not part of the transaction.
    expect(response.status).toBe(200);
    expect(await rowsFor("feedback-email-user")).toHaveLength(1);
    expect(errors).toHaveBeenCalled();
    // The failure log must not carry the report or the recipient (PII rule in
    // lib/email/send.ts).
    expect(JSON.stringify(errors.mock.calls)).not.toContain("dhaga.test");
    expect(JSON.stringify(errors.mock.calls)).not.toContain("feedback-email-user");
  });

  it("stores nothing the allow-list does not cover, whatever the client sends", async () => {
    currentUserId = "feedback-strip-user";
    const response = await post({
      message: "feedback-strip-user",
      route: "/app/search?q=Priya%20Raman",
      contactName: "Priya Raman",
      noteText: "Met Priya at the summit",
      searchQuery: "priya",
      dom: "<main>Priya Raman</main>",
    });
    expect(response.status).toBe(200);

    const [row] = await rowsFor("feedback-strip-user");
    // The whole stored row, values included — a new column carrying forbidden
    // content fails here even if nobody thought to assert on it by name.
    expect(JSON.stringify(row)).not.toContain("Priya");
    expect(row.route).toBe("/app/search");
  });

  it("refuses an unauthenticated caller before touching the DB", async () => {
    const guard = await import("@/lib/auth/guard");
    vi.spyOn(guard, "requireUserIdFromRequest").mockRejectedValue(new Error("Unauthorized"));
    const response = await post({ message: "feedback-anon-user", route: "/app" });
    expect(response.status).toBe(401);
    expect(await rowsFor("feedback-anon-user")).toHaveLength(0);
  });

  it("rate-limits a flood so one stuck client cannot fill the owner's inbox", async () => {
    currentUserId = "feedback-flood-user";
    const statuses: number[] = [];
    // RATE_LIMITS.feedback allows 5 per 5 minutes; the 6th must be refused.
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await post({ message: "feedback-flood-user", route: "/app" })).status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
    expect(await rowsFor("feedback-flood-user")).toHaveLength(5);
  });
});
