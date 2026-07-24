import { beforeEach, describe, expect, it, vi } from "vitest";

// The vision call is the one seam we mock: it costs money and needs a real
// provider. Everything downstream (contact/note/receipt writes) runs against
// the in-memory PGlite so the receipt-count assertions mean something.
const { scanCardImagesMock } = vi.hoisted(() => ({ scanCardImagesMock: vi.fn() }));
vi.mock("@/lib/ai/card-scan", () => ({ scanCardImages: scanCardImagesMock }));

import { handleImageCapture } from "@/app/api/capture/handlers";
import { CaptureValidationError, parseCaptureRequest } from "@/app/api/capture/parse-request";
import { listCardImageRefs } from "@/lib/repo/card-images";
import { setStoreCardPhotos } from "@/lib/repo/settings";
import { MAX_CARD_IMAGES } from "@/utils/constants/app";
import type { CaptureImage } from "@dhaga/core/src/api/capture";

// A 1×1 PNG — a real-enough base64 payload without shipping a photo fixture.
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const SCANNED_CONTACT = {
  name: "Front And Back",
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function image(imageType: CaptureImage["imageType"] = "image/png"): CaptureImage {
  return { imageBase64: TINY_PNG, imageType };
}

beforeEach(() => {
  scanCardImagesMock.mockReset();
});

/**
 * Back-compat is a hard requirement: mobile persisted queued capture requests
 * with a single `imageBase64` scalar before `images[]` existed. Those must
 * still parse and scan, or an app update silently drops in-flight captures.
 */
describe("legacy single-image capture requests keep working", () => {
  it("normalizes the scalar imageBase64/imageType into a one-image array", async () => {
    const parsed = await parseCaptureRequest(
      makeRequest({ imageBase64: TINY_PNG, imageType: "image/png" }),
    );
    expect(parsed.images).toEqual([{ imageBase64: TINY_PNG, imageType: "image/png" }]);
    // The scalar mirror stays populated for any caller still reading it.
    expect(parsed.imageBase64).toBe(TINY_PNG);
    expect(parsed.imageType).toBe("image/png");
  });

  it("defaults a scalar with no imageType to image/jpeg", async () => {
    const parsed = await parseCaptureRequest(makeRequest({ imageBase64: TINY_PNG }));
    expect(parsed.images).toEqual([{ imageBase64: TINY_PNG, imageType: "image/jpeg" }]);
  });
});

/**
 * The whole point of the feature: several photos of the SAME card become one
 * contact, and every photo is kept as its own receipt. These assertions fail
 * if anyone re-introduces a single-image hard-code on the scan path.
 */
describe("multi-image card scan merges into one contact with N receipts", () => {
  it("passes every image to the extractor and stores each as a receipt", async () => {
    await setStoreCardPhotos(true);
    scanCardImagesMock.mockResolvedValue({
      contact: SCANNED_CONTACT,
      rawText: "front\nback\nleaflet",
    });

    const parsed = await parseCaptureRequest(
      makeRequest({ images: [image("image/png"), image("image/jpeg"), image("image/webp")] }),
    );
    expect(parsed.images).toHaveLength(3);

    const response = await handleImageCapture("user-multi", parsed);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; name: string; photoStored: boolean };

    // ONE merged contact, not three.
    expect(body.name).toBe("Front And Back");
    expect(body.photoStored).toBe(true);

    // The extractor sees ALL images — the merge can only happen if every
    // photo reaches the model in a single call.
    expect(scanCardImagesMock).toHaveBeenCalledTimes(1);
    const passedImages = scanCardImagesMock.mock.calls[0][1] as unknown[];
    expect(passedImages).toHaveLength(3);

    // Each photo persisted as its own receipt against the single contact.
    expect(await listCardImageRefs(body.id)).toHaveLength(3);
  });

  it("stores no receipts when the store-card-photos setting is off", async () => {
    await setStoreCardPhotos(false);
    scanCardImagesMock.mockResolvedValue({ contact: SCANNED_CONTACT, rawText: "x" });

    const parsed = await parseCaptureRequest(makeRequest({ images: [image(), image()] }));
    const response = await handleImageCapture("user-off", parsed);
    const body = (await response.json()) as { id: string; photoStored: boolean };

    expect(body.photoStored).toBe(false);
    expect(await listCardImageRefs(body.id)).toHaveLength(0);
    await setStoreCardPhotos(true);
  });
});

/**
 * A card has a handful of surfaces at most; a large batch is a mistake or
 * abuse, and each image is a full (paid) vision-model input. The count is
 * capped before any model call.
 */
describe("capture rejects more images than a single card can need", () => {
  it("rejects a request carrying more than MAX_CARD_IMAGES photos", async () => {
    const tooMany = Array.from({ length: MAX_CARD_IMAGES + 1 }, () => image());
    await expect(
      parseCaptureRequest(makeRequest({ images: tooMany })),
    ).rejects.toBeInstanceOf(CaptureValidationError);
  });

  it("rejects an image with an unsupported type", async () => {
    await expect(
      parseCaptureRequest(makeRequest({ images: [{ imageBase64: TINY_PNG, imageType: "image/gif" }] })),
    ).rejects.toBeInstanceOf(CaptureValidationError);
  });
});
