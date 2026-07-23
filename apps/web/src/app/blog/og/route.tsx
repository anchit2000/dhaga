import { ImageResponse } from "next/og";
import { BLOG_CATEGORIES } from "@/utils/constants/blog-categories";

// Dynamic social card for blog routes, driven by ?title= and ?category= query
// params. Lives at /blog/og (a static route handler, so it coexists with the
// optional catch-all page the same way /blog/rss.xml does) — the file-convention
// opengraph-image cannot sit inside the [[...slug]] optional catch-all segment.
// On-brand: warm near-black ground, one amber accent, the title, the wordmark.
// Font-free on purpose — satori can't parse the self-hosted Geist Pixel woff2,
// and the system stack renders robustly everywhere.

const SIZE = { width: 1200, height: 630 };

const INK = "#0d0b09";
const PANEL = "#16120e";
const PAPER = "#f4efe6";
const FOG = "#8a7c66";
const AMBER = "#e2a44c";
const SEAM = "#2b241b";

export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? "The Dhaga blog";
  const categorySlug = searchParams.get("category") ?? undefined;
  const categoryLabel = BLOG_CATEGORIES.find(
    (entry) => entry.slug === categorySlug,
  )?.label;
  const eyebrow = categoryLabel ? `dhaga. blog · ${categoryLabel}` : "dhaga. blog";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          backgroundImage: `linear-gradient(160deg, ${PANEL}, ${INK})`,
          padding: 80,
          color: PAPER,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              backgroundColor: AMBER,
              marginRight: 16,
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: FOG,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 72, height: 4, backgroundColor: AMBER, marginBottom: 32 }} />
          <div
            style={{
              fontSize: title.length > 60 ? 58 : 72,
              lineHeight: 1.1,
              fontWeight: 600,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${SEAM}`,
            paddingTop: 28,
            fontSize: 26,
            color: FOG,
          }}
        >
          <div style={{ display: "flex" }}>
            <span style={{ color: PAPER }}>dhaga</span>
            <span style={{ color: AMBER }}>.</span>
          </div>
          <div>The AI personal CRM</div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
