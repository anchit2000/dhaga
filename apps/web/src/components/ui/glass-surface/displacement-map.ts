/** Builds the SVG displacement map data-URI that drives GlassSurface's backdrop-filter distortion. */
export function buildDisplacementMap({
  width,
  height,
  borderRadius,
  borderWidth,
  brightness,
  opacity,
  blur,
  mixBlendMode,
  redGradId,
  blueGradId,
}: {
  width: number;
  height: number;
  borderRadius: number;
  borderWidth: number;
  brightness: number;
  opacity: number;
  blur: number;
  mixBlendMode: string;
  redGradId: string;
  blueGradId: string;
}): string {
  const edgeSize = Math.min(width, height) * (borderWidth * 0.5);
  const svgContent = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="black"></rect>
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#${redGradId})" />
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
      <rect x="${edgeSize}" y="${edgeSize}" width="${width - edgeSize * 2}" height="${height - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
}

/** Chrome/Edge support `backdrop-filter: url(#svgFilter)`; Safari and Firefox don't — they get the CSS-only fallback. */
export function supportsSvgBackdropFilter(filterId: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  if (isWebkit || isFirefox) return false;
  const div = document.createElement("div");
  div.style.backdropFilter = `url(#${filterId})`;
  return div.style.backdropFilter !== "";
}
