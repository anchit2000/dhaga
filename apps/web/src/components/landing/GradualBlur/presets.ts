import type { CSSProperties } from "react";

export type BlurPosition = "top" | "bottom" | "left" | "right";
export type BlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
export type BlurTarget = "parent" | "page";

export interface GradualBlurConfig {
  position: BlurPosition;
  strength: number;
  height: string;
  width?: string;
  divCount: number;
  exponential: boolean;
  zIndex: number;
  animated: boolean | "scroll";
  duration: string;
  easing: string;
  opacity: number;
  curve: BlurCurve;
  responsive: boolean;
  target: BlurTarget;
  className: string;
  style: CSSProperties;
  hoverIntensity?: number;
  onAnimationComplete?: () => void;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
}

export type GradualBlurProps = Partial<GradualBlurConfig> & {
  preset?: keyof typeof PRESETS;
};

export const DEFAULT_CONFIG: GradualBlurConfig = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
};

export const PRESETS = {
  top: { position: "top", height: "6rem" },
  bottom: { position: "bottom", height: "6rem" },
  left: { position: "left", height: "6rem" },
  right: { position: "right", height: "6rem" },
  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
  smooth: { height: "8rem", curve: "bezier", divCount: 10 },
  sharp: { height: "5rem", curve: "linear", divCount: 4 },
  header: { position: "top", height: "8rem", curve: "ease-out" },
  footer: { position: "bottom", height: "8rem", curve: "ease-out" },
  sidebar: { position: "left", height: "6rem", strength: 2.5 },
  "page-header": { position: "top", height: "10rem", target: "page", strength: 3 },
  "page-footer": { position: "bottom", height: "10rem", target: "page", strength: 3 },
} satisfies Record<string, Partial<GradualBlurConfig>>;

export const CURVE_FUNCTIONS: Record<BlurCurve, (progress: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

export function mergeConfigs(...configs: Array<Partial<GradualBlurConfig>>): GradualBlurConfig {
  let merged = {} as GradualBlurConfig;
  for (const config of configs) {
    merged = { ...merged, ...config } as GradualBlurConfig;
  }
  return merged;
}

export function getGradientDirection(position: BlurPosition): string {
  const directions: Record<BlurPosition, string> = {
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  };
  return directions[position];
}
