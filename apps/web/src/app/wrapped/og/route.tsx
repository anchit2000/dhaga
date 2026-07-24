import { ImageResponse } from "next/og";
import { WRAPPED_CARD_SIZES } from "@/utils/constants/wrapped";
import { parseWrappedOgParams } from "@/lib/wrapped/og-url";
import { verifyWrappedParams } from "@/lib/wrapped/sign";
import { renderWrappedCard } from "./card";

// Public, CONTACT-FREE Network Wrapped share image. Reads WRAPPED_OG_PARAMS,
// verifies the HMAC (a forged/garbled card falls back to a generic promo card
// rather than 500ing), and renders in the requested aspect ratio. Node runtime
// (no edge) and font-free — satori can't parse the self-hosted Geist woff2.
export const runtime = "nodejs";

export function GET(request: Request): ImageResponse {
  const { params, format, sig } = parseWrappedOgParams(new URL(request.url).searchParams);
  const valid = verifyWrappedParams(params, sig);
  const size = WRAPPED_CARD_SIZES[format];

  return new ImageResponse(renderWrappedCard(params, format, valid), {
    width: size.width,
    height: size.height,
    headers: {
      "Cache-Control": valid
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
    },
  });
}
