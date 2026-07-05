import type { CaptureRequest, CaptureVia } from "@dhaga/core/src/api/capture";

/** Connection settings the user enters once; held in SecureStore. */
export interface MobileSettings {
  /** Dhaga web app origin, no trailing slash (LAN IP in development). */
  baseUrl: string;
  /** Per-user API key created in the web app's Settings page. */
  apiKey: string;
}

/** Which capture pipeline produced the request (BRD §6.1 tiers, plus manual typing). */
export type ScanPath = "on-device" | "image-fallback" | "typed";

/** A ready-to-POST /api/capture body plus the pipeline that built it. */
export interface ScanPayload {
  request: CaptureRequest;
  path: ScanPath;
}

/** Outcome of one shutter press, rendered on the capture screen. */
export type ScanOutcome =
  | {
      kind: "saved";
      name: string;
      via: CaptureVia;
      path: ScanPath;
      seconds: number;
      notice: string | null;
    }
  | { kind: "error"; message: string };
