import {
  GRAPH_ENTITY_FALLBACK_COLOR,
  GRAPH_LIGHT_EDGE_COLOR,
  GRAPH_NODE_COLORS,
  type GraphColorScheme,
} from "@/utils/constants/graph";
import type { GraphNodeKind } from "../types";

/** Brand colours resolved from the live CSS custom properties so the WebGL
 *  canvas follows /app's light/dark toggle instead of hardcoding a theme.
 *  Node/edge fills aren't brand tokens, so they resolve from the palette
 *  constants against the same scheme — one resolve, one source of truth. */
export interface GraphTheme {
  ink: string;
  panel: string;
  seam: string;
  paper: string;
  fog: string;
  amber: string;
  /** Deeper amber that stays readable on the light theme (circle labels). */
  ember: string;
  monoFont: string;
  /** Which theme everything below was resolved for. */
  scheme: GraphColorScheme;
  /** Node fill per kind, already resolved for `scheme`. */
  nodeColors: GraphNodePalette;
  /** Idle edge fill: seam on dark, a darker warm grey on light (light seam is
   *  1.28:1 on the canvas — the mesh disappears). */
  edge: string;
  /** Hovered/selected/on-path edge fill: amber on dark, ember on light (amber
   *  is 1.83:1 on the light canvas, so the emphasised edge wouldn't read). */
  edgeActive: string;
}

/** Node fill per kind for one theme; `entity` is the missing-node-type fallback. */
export type GraphNodePalette = Record<GraphNodeKind, string>;

type BrandTokens = Pick<
  GraphTheme,
  "ink" | "panel" | "seam" | "paper" | "fog" | "amber" | "ember" | "monoFont"
>;

/** Used only when the custom properties can't be read (pre-hydration or a
 *  detached container). Keyed by scheme — a dark-only fallback painted
 *  cream-on-cream in light mode. Mirrors globals.css `:root` / `.dark`. */
const FALLBACK: Record<GraphColorScheme, BrandTokens> = {
  dark: {
    ink: "#0d0b09",
    panel: "#16120e",
    seam: "#2b241b",
    paper: "#f3ede2",
    fog: "#a49a8a",
    amber: "#e2a44c",
    /* dark `--brand-ember` is `var(--brand-amber)` — accent text on a near-black
       ground already clears 9:1, so it stays brand amber. */
    ember: "#e2a44c",
    monoFont: "monospace",
  },
  light: {
    ink: "#f2ebdc",
    panel: "#fdfbf6",
    seam: "#c8b79a",
    paper: "#241d15",
    fog: "#655a48",
    amber: "#e2a44c",
    ember: "#7a4413",
    monoFont: "monospace",
  },
};

/** next-themes writes `dark` on <html>, and marketing surfaces force it on a
 *  wrapper — so walk up from the canvas. A detached element has nothing to
 *  walk, hence the document-level check. */
function resolveScheme(element: HTMLElement): GraphColorScheme {
  const dark =
    element.closest(".dark") !== null ||
    document.documentElement.classList.contains("dark");
  return dark ? "dark" : "light";
}

/** The node palette for one theme — also for React chrome (legend dots) that
 *  renders outside the canvas and can't read its custom properties. */
export function graphNodePalette(scheme: GraphColorScheme): GraphNodePalette {
  return { ...GRAPH_NODE_COLORS[scheme], entity: GRAPH_ENTITY_FALLBACK_COLOR[scheme] };
}

export function resolveGraphTheme(element: HTMLElement): GraphTheme {
  const scheme = resolveScheme(element);
  const fallback = FALLBACK[scheme];
  const styles = getComputedStyle(element);
  const read = (name: string, value: string): string =>
    styles.getPropertyValue(name).trim() || value;
  const seam = read("--brand-seam", fallback.seam);
  const amber = read("--brand-amber", fallback.amber);
  const ember = read("--brand-ember", fallback.ember);
  return {
    ink: read("--brand-ink", fallback.ink),
    panel: read("--brand-panel", fallback.panel),
    seam,
    paper: read("--brand-paper", fallback.paper),
    fog: read("--brand-fog", fallback.fog),
    amber,
    ember,
    monoFont: read("--font-plex-mono", fallback.monoFont) || fallback.monoFont,
    scheme,
    nodeColors: graphNodePalette(scheme),
    edge: scheme === "dark" ? seam : GRAPH_LIGHT_EDGE_COLOR,
    edgeActive: scheme === "dark" ? amber : ember,
  };
}
