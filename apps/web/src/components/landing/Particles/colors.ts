import { readBrandColor } from "@/lib/brand-colors";
import { BRAND_COLOR_FALLBACKS, type BrandColorVar } from "@/utils/constants/brand";

function isBrandColorVar(value: string): value is BrandColorVar {
  return value in BRAND_COLOR_FALLBACKS;
}

/** Resolves a particleColors entry: a `--brand-*` name is read live off
 *  `element` so particles follow the light/dark toggle; a hex literal
 *  passes through untouched. */
export function resolveParticleColor(entry: string, element: HTMLElement): string {
  if (!entry.startsWith("--")) return entry;
  return isBrandColorVar(entry) ? readBrandColor(entry, element) : entry;
}
