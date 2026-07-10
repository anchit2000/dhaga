import { matchLinkedInProfileUrl } from "@dhaga/core/src/capture/linkedin-qr";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

/**
 * Best-effort LinkedIn QR detection on a just-captured card photo, using the
 * browser's native BarcodeDetector API (no new npm dependency — coverage is
 * Chromium-only today, see the caller for the graceful-fallback note).
 * Returns the matched LinkedIn profile URL, or null if the browser doesn't
 * support BarcodeDetector, no QR code was found, or the QR content isn't
 * LinkedIn-shaped — every null case falls through to the existing
 * card-photo → AI OCR flow unchanged.
 */
export async function detectLinkedInQrUrl(photo: File): Promise<string | null> {
  if (typeof window === "undefined" || !window.BarcodeDetector) return null;
  try {
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const codes = await detector.detect(photo);
    for (const code of codes) {
      const match = matchLinkedInProfileUrl(code.rawValue);
      if (match) return match;
    }
    return null;
  } catch {
    return null;
  }
}
