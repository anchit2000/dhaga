import sharp from "sharp";

// Renders the raster brand assets from the same knot geometry as
// src/components/brand/ThreadMark.tsx. Re-run after changing the mark:
//   node scripts/generate-brand-assets.mjs

const knot = (scale, strokeWidth = 1.8) => `
  <path d="M2 16 C 7 16, 8 6, 13 6 C 17 6, 17 11, 13.5 11 C 10 11, 10 6.5, 14.5 5 C 18 3.8, 20 4.5, 22 4"
    stroke="#e2a44c" stroke-width="${strokeWidth}" stroke-linecap="round" fill="none"/>
  <circle cx="2" cy="16" r="2" fill="#f3ede2"/>
  <circle cx="22" cy="4" r="2" fill="#f3ede2"/>`;

const appleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#0d0b09"/>
  <g transform="translate(24 41) scale(5.5)">${knot(5.5, 1.9)}</g>
</svg>`;

const ogImage = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d0b09"/>
  <path d="M-50 520 C 300 480, 420 260, 660 300 C 860 334, 980 220, 1260 190"
    stroke="#2b241b" stroke-width="3" fill="none"/>
  <g transform="translate(120 180) scale(7)">${knot(7, 1.7)}</g>
  <text x="330" y="292" font-family="Georgia, 'Times New Roman', serif" font-size="120" fill="#f3ede2">dhaga<tspan fill="#e2a44c">.</tspan></text>
  <text x="124" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="#a49a8a">Every thread, remembered.</text>
  <text x="124" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="#5c5347">The open-source, AI-native personal CRM — private by design.</text>
</svg>`;

const pwaIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#0d0b09"/>
  <g transform="translate(24 41) scale(5.5)">${knot(5.5, 1.9)}</g>
</svg>`;

await sharp(Buffer.from(appleIcon)).png().toFile("src/app/apple-icon.png");
await sharp(Buffer.from(ogImage)).png().toFile("src/app/opengraph-image.png");
await sharp(Buffer.from(pwaIcon(192))).png().toFile("public/icon-192.png");
await sharp(Buffer.from(pwaIcon(512))).png().toFile("public/icon-512.png");
console.log("wrote apple-icon, opengraph-image, icon-192, icon-512");
