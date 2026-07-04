export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRGB(hex: string): RGBColor {
  let val = hex.replace("#", "");
  if (val.length === 3) val = val[0] + val[0] + val[1] + val[1] + val[2] + val[2];
  const r = parseInt(val.slice(0, 2), 16) / 255;
  const g = parseInt(val.slice(2, 4), 16) / 255;
  const b = parseInt(val.slice(4, 6), 16) / 255;
  return { r: r * 0.15, g: g * 0.15, b: b * 0.15 };
}

export function hsvToRGB(h: number, s: number, v: number): RGBColor {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return { r: v, g: t, b: p };
    case 1:
      return { r: q, g: v, b: p };
    case 2:
      return { r: p, g: v, b: t };
    case 3:
      return { r: p, g: q, b: v };
    case 4:
      return { r: t, g: p, b: v };
    default:
      return { r: v, g: p, b: q };
  }
}

export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return min;
  return ((value - min) % range) + min;
}

export function hashCode(s: string): number {
  if (s.length === 0) return 0;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function scaleByPixelRatio(input: number): number {
  const pixelRatio = window.devicePixelRatio || 1;
  return Math.floor(input * pixelRatio);
}
