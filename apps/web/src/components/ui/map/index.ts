/**
 * Vendored from **mapcn** (MIT) — https://mapcn.vercel.app,
 * `AnmolSaini16/mapcn`, registry item `https://mapcn.vercel.app/r/map.json`.
 * A shadcn-style registry, so the source lives here rather than in node_modules;
 * only `maplibre-gl` is a real dependency.
 *
 * Trimmed and adapted rather than copied verbatim, because:
 *  1. **maplibre-gl v6 removed the default export** — upstream's
 *     `import MapLibreGL from "maplibre-gl"` (and `MapLibreGL.StyleSpecification`)
 *     does not compile against the version we ship. Named imports here.
 *  2. **The CARTO basemap could not be allowed to survive as a default.**
 *     Upstream falls back to CARTO's Positron/Dark-Matter tiles, whose
 *     commercial use needs a CARTO Enterprise licence; `styles` is a required
 *     prop here so there is no fallback to revert to. See
 *     `utils/constants/map.ts` and docs/LIBRARIES.md.
 *  3. Markers, popups, tooltips, routes, arcs and GeoJSON layers (~1,700 lines)
 *     are unused — re-add from the registry item above if a use appears.
 *  4. Touch targets and cluster fonts were fixed for our constraints (44px
 *     controls; OpenFreeMap serves no "Open Sans Semibold" glyphs).
 */

export { Map, type MapProps } from "./Map";
export { MapControls } from "./MapControls";
export { MapClusterLayer, type MapClusterLayerProps } from "./MapClusterLayer";
export { useMap, type MapContextValue, type MapTheme } from "./context";
export type { MapBounds, MapPointCollection, MapPointFeature } from "./types";
