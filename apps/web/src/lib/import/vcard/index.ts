/**
 * vCard (.vcf) parser entry point. Handles vCard 2.1 / 3.0 / 4.0 from Apple,
 * iCloud, Google, and Android. Dependency-free and deterministic — runs in
 * the browser, so the raw file never leaves the device (CLAUDE.md Rule 5).
 */
import { unfoldLines, splitCards, parseLine } from "./tokenize";
import type { VProp } from "./tokenize";
import { cardToCandidate } from "./map";
import type { ImportCandidate } from "../types";

/** True if the text contains a vCard (case-insensitive, after BOM strip). */
export function isVcard(text: string): boolean {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return /BEGIN:VCARD/i.test(src);
}

/** Parse every card in the text into review candidates; skip nameless cards. */
export function vcardToCandidates(text: string): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];
  for (const cardLines of splitCards(unfoldLines(text))) {
    const props: VProp[] = [];
    for (const line of cardLines) {
      const prop = parseLine(line);
      if (prop) props.push(prop);
    }
    const candidate = cardToCandidate(props);
    if (candidate) candidates.push(candidate);
  }
  return candidates;
}
