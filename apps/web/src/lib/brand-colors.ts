import { BRAND_COLOR_FALLBACKS, type BrandColorVar } from "@/utils/constants/brand";

/** Reads one `--brand-*` custom property live off `element`, falling back to
 *  the dark-theme hex value when the property is unset (e.g. during SSR). */
export function readBrandColor(name: BrandColorVar, element: HTMLElement): string {
  return getComputedStyle(element).getPropertyValue(name).trim() || BRAND_COLOR_FALLBACKS[name];
}

/** Batch form of `readBrandColor` — one `getComputedStyle` call for several vars,
 *  e.g. resolving every colour a WebGL canvas needs before it starts drawing. */
export function readBrandColors<T extends readonly BrandColorVar[]>(
  names: T,
  element: HTMLElement,
): Record<T[number], string> {
  const styles = getComputedStyle(element);
  const result: Partial<Record<BrandColorVar, string>> = {};
  for (const name of names) {
    result[name] = styles.getPropertyValue(name).trim() || BRAND_COLOR_FALLBACKS[name];
  }
  return result as Record<T[number], string>;
}
