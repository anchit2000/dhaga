import { BRAND_COLOR_FALLBACKS, type BrandColorVar } from "@/utils/constants/brand";

/** Reads one `--brand-*` custom property live off `element`, falling back to
 *  the dark-theme hex value when the property is unset (e.g. during SSR). */
export function readBrandColor(name: BrandColorVar, element: HTMLElement): string {
  return getComputedStyle(element).getPropertyValue(name).trim() || BRAND_COLOR_FALLBACKS[name];
}
