import type { ExtractedContact } from "../schemas/contact";
import { emptyExtractedContact } from "../schemas/contact";

/**
 * No-LLM contact parser (BRD cost layer 1: don't call an LLM when code can
 * answer). Used as the offline/keyless fallback for pasted signatures and
 * card text. Deliberately conservative: it never guesses beyond simple
 * line/regex heuristics — the user reviews before saving anyway.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s,;|]+|linkedin\.com\/[^\s,;|]+/gi;
const PHONE_RE = /(?:\+?\d[\d\s().\-]{6,}\d)/g;
const TITLE_WORDS_RE =
  /\b(ceo|cto|coo|cfo|vp|head|director|manager|lead|engineer|founder|partner|principal|consultant|analyst|designer|president|officer|sales|marketing)\b/i;

function isNameLike(line: string): boolean {
  const words = line.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  if (/[\d@/:]/.test(line)) return false;
  return /^[\p{L}][\p{L}.'\- ]+$/u.test(line);
}

export function heuristicContactParse(rawText: string): ExtractedContact {
  const contact = emptyExtractedContact();
  // Compose combining-mark (NFD) Unicode into precomposed (NFC) form first.
  // Some sources (e.g. macOS-originated text) encode an accented letter like
  // "é" as "e" + a separate combining acute mark — that combining mark isn't
  // in the \p{L} Letter category, so isNameLike's regex silently rejects an
  // otherwise-valid accented name unless it's composed first.
  const text = rawText.normalize("NFC");

  contact.emails = [...new Set(text.match(EMAIL_RE) ?? [])];
  // Dedupe after stripping trailing punctuation, not before — otherwise the
  // same link seen once mid-sentence and once at a sentence's end (with a
  // trailing period the URL regex swallows) survives as two Set entries and
  // only collapses into a visible duplicate after the .map below.
  contact.links = [
    ...new Set((text.match(URL_RE) ?? []).map((u) => u.replace(/[.,;]$/, ""))),
  ];
  // Strip emails/URLs before phone matching so "+1 555..." doesn't collide.
  const withoutInline = text.replace(EMAIL_RE, " ").replace(URL_RE, " ");
  contact.phones = [...new Set(withoutInline.match(PHONE_RE) ?? [])].map((p) =>
    p.trim(),
  );

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(EMAIL_RE, "").replace(URL_RE, "").replace(PHONE_RE, "").replace(/[|•·]+/g, " ").trim())
    .filter((line) => line.length > 1);

  const nameLine = lines.find((line) => isNameLike(line) && !TITLE_WORDS_RE.test(line));
  if (nameLine) contact.name = nameLine;

  const titleLine = lines.find((line) => line !== nameLine && TITLE_WORDS_RE.test(line));
  if (titleLine) {
    // "VP of Sales at Acme" / "CTO, Acme Corp" / "Principal — Acme" →
    // split title vs company (spaced dashes count as separators).
    const atSplit = titleLine.split(/\s+(?:at|@)\s+|,\s+|\s+[—–-]\s+/);
    contact.title = atSplit[0].trim();
    // Company is conventionally the last segment ("Principal, Early Stage — Acme").
    const lastSegment = atSplit[atSplit.length - 1]?.trim();
    if (atSplit.length > 1 && lastSegment) contact.company = lastSegment;
  }

  if (!contact.company) {
    const candidate = lines.find(
      (line) => line !== nameLine && line !== titleLine && isNameLike(line),
    );
    contact.company = candidate ?? companyFromEmailDomain(contact.emails[0]);
  }

  return contact;
}

function companyFromEmailDomain(email: string | undefined): string | null {
  if (!email) return null;
  const domain = email.split("@")[1] ?? "";
  const base = domain.split(".")[0];
  if (!base || ["gmail", "outlook", "yahoo", "hotmail", "icloud", "proton"].includes(base)) {
    return null;
  }
  return base.charAt(0).toUpperCase() + base.slice(1);
}
