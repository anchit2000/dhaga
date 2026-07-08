/** Parsed, trimmed shape of the /api/capture POST body (all fields optional on the wire). */
export interface ParsedCaptureRequest {
  raw: string;
  sourceUrl: string;
  contactId: string;
  imageBase64: string;
  imageType: string;
  geohash: string;
  scannedAt: Date | null;
}

/** Invalid/missing timestamp means "no session grouping" — never an error. */
function parseScannedAt(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses and trims the /api/capture POST body. Throws only on unparseable JSON. */
export async function parseCaptureRequest(request: Request): Promise<ParsedCaptureRequest> {
  const body = (await request.json()) as {
    raw?: unknown;
    sourceUrl?: unknown;
    contactId?: unknown;
    imageBase64?: unknown;
    imageType?: unknown;
    geohash?: unknown;
    scannedAt?: unknown;
  };
  return {
    raw: String(body.raw ?? "").trim(),
    sourceUrl: String(body.sourceUrl ?? "").trim(),
    contactId: String(body.contactId ?? "").trim(),
    imageBase64: String(body.imageBase64 ?? "").trim(),
    imageType: String(body.imageType ?? "").trim(),
    geohash: String(body.geohash ?? "").trim(),
    scannedAt: parseScannedAt(String(body.scannedAt ?? "").trim()),
  };
}
