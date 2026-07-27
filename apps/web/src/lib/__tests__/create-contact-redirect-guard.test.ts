import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileFromExtracted } from "@dhaga/core";
import { SAVE_RETRY_MESSAGE } from "@/lib/actions/resilience";

// createContactProfile is the only DB write on the path under test; stub it so
// we can drive its return (a valid id vs. an empty one) without a real write.
const { createContactProfile } = vi.hoisted(() => ({
  createContactProfile: vi.fn(),
}));
// redirect() works by throwing NEXT_REDIRECT; mirror that so a fired redirect is
// observable (it rejects) and a suppressed one is provably absent.
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/guard", () => ({ requireUserId: async () => "test-user" }));
vi.mock("@/lib/db/request-scope", () => ({
  withUserDb: <T>(_userId: string, fn: () => Promise<T>): Promise<T> => fn(),
}));
vi.mock("@/lib/repo/contacts", () => ({ createContactProfile }));
vi.mock("next/navigation", () => ({ redirect }));

const { createContactAction } = await import("@/lib/actions/contacts/create");

function form(): FormData {
  const fd = new FormData();
  fd.set(
    "payload",
    JSON.stringify(
      profileFromExtracted({
        name: "Grace Hopper",
        title: null,
        company: null,
        emails: [],
        phones: [],
        links: [],
        location: null,
      }),
    ),
  );
  return fd;
}

/**
 * Regression: createContactAction redirected unconditionally on `id`, which is
 * seeded "". A write that resolves without throwing but yields an empty id would
 * send the user to "/app/people/" (broken) and silently drop the contact. The
 * guard must surface an error for an empty id, yet still redirect for a real one.
 */
describe("createContactAction redirect guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("surfaces an error and does NOT redirect when the create yields an empty id", async () => {
    createContactProfile.mockResolvedValueOnce("");
    const result = await createContactAction({}, form());
    expect(result.error).toBe(SAVE_RETRY_MESSAGE);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("still redirects to the new person on a valid id (guard must not over-correct)", async () => {
    createContactProfile.mockResolvedValueOnce("contact-123");
    await expect(createContactAction({}, form())).rejects.toThrow(
      "NEXT_REDIRECT:/app/people/contact-123",
    );
    expect(redirect).toHaveBeenCalledWith("/app/people/contact-123");
  });
});
