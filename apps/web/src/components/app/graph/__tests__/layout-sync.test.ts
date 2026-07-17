import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GRAPH_LAYOUT_UPLOADED_KEY } from "@/utils/constants/graph";
import { alreadyUploaded, scheduleLayoutUpload } from "../logic/layout-sync";
import type { PositionMap } from "../types";

function fakeStore(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  } as Storage;
}

const positions: PositionMap = new Map([["a", { x: 1, y: 2 }]]);

describe("layout upload memory", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {}); // scheduleLayoutUpload only checks presence
  });
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // IDB-cached payloads freeze the pre-upload server layout state, so the
  // "differs from the server copy" check at the call site re-fired on every
  // warm/304 boot — one redundant megabyte POST per visit (observed live).
  // Remembering the uploaded hash locally is what breaks that loop.
  it("skips the POST entirely when this browser already uploaded the hash", () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const store = fakeStore({ [GRAPH_LAYOUT_UPLOADED_KEY]: "abc" });
    scheduleLayoutUpload("abc", positions, store);
    vi.runAllTimers();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uploads an unseen hash and remembers it only after the server accepts", async () => {
    let resolveFetch: (value: { ok: boolean }) => void = () => undefined;
    const fetchSpy = vi.fn().mockReturnValue(
      new Promise<{ ok: boolean }>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const store = fakeStore();
    scheduleLayoutUpload("fresh", positions, store);
    vi.runAllTimers();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(alreadyUploaded("fresh", store)).toBe(false); // not until 2xx
    resolveFetch({ ok: true });
    await vi.waitFor(() => expect(alreadyUploaded("fresh", store)).toBe(true));
  });

  it("does not remember a rejected upload, so the next settle retries", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchSpy);
    const store = fakeStore();
    scheduleLayoutUpload("denied", positions, store);
    vi.runAllTimers();
    await Promise.resolve();
    expect(alreadyUploaded("denied", store)).toBe(false);
  });
});
