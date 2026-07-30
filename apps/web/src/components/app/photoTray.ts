/**
 * Pure list transitions for a photo tray (the card scan's, and a photo note's).
 * Both surfaces hold the same thing — an ordered list of images capped at
 * MAX_CARD_IMAGES that the user can add to, drop from, reorder, and crop — so
 * the cap and the bounds rules live here once instead of in each component.
 *
 * Order is load-bearing on both: it is the order the pages are transcribed in.
 */

/** Append, never exceeding `max`. Extra photos are dropped, not rejected —
 *  silently truncating a 10-photo selection is kinder than losing all of it. */
export function addToTray(current: File[], incoming: File[], max: number): File[] {
  if (incoming.length === 0) return current;
  return [...current, ...incoming].slice(0, max);
}

export function removeFromTray(current: File[], index: number): File[] {
  return current.filter((_, i) => i !== index);
}

/** Swap with the neighbour `delta` away; a move off either end is a no-op. */
export function moveInTray(current: File[], index: number, delta: number): File[] {
  const target = index + delta;
  if (target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Replace one image in place (a crop) — position must survive the edit. */
export function replaceInTray(current: File[], index: number, file: File): File[] {
  return current.map((existing, i) => (i === index ? file : existing));
}
