/**
 * vCard lexer: unfold physical lines (RFC folding + QUOTED-PRINTABLE soft
 * breaks), split cards, and parse each logical line into a decoded property.
 * Dependency-free and deterministic (CLAUDE.md Rule 5) — parses in-browser.
 */
import { decodeQuotedPrintable, vcardUnescape } from "./decode";

/** One parsed property line: `[group.]NAME;PARAM=VAL:value`. */
export interface VProp {
  group: string | null;
  name: string;
  params: Record<string, string[]>;
  value: string;
}

const BINARY_PROPS = new Set(["PHOTO", "LOGO", "SOUND", "KEY"]);

function normalize(text: string): string {
  const noBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return noBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isQpLine(line: string): boolean {
  return /ENCODING=QUOTED-PRINTABLE/i.test(line);
}

export function unfoldLines(text: string): string[] {
  const physical = normalize(text).split("\n");
  const logical: string[] = [];
  for (const raw of physical) {
    if (logical.length > 0) {
      const prev = logical[logical.length - 1];
      if (isQpLine(prev) && prev.endsWith("=")) {
        logical[logical.length - 1] = prev.slice(0, -1) + raw;
        continue;
      }
      if (raw.startsWith(" ") || raw.startsWith("\t")) {
        logical[logical.length - 1] = prev + raw.slice(1);
        continue;
      }
    }
    logical.push(raw);
  }
  return logical;
}

export function splitCards(lines: string[]): string[][] {
  const cards: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^BEGIN:VCARD$/i.test(trimmed)) {
      current = [];
    } else if (/^END:VCARD$/i.test(trimmed)) {
      if (current) cards.push(current);
      current = null;
    } else if (current) {
      current.push(line);
    }
  }
  return cards;
}

function splitAtColon(line: string): [string, string] | null {
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) return [line.slice(0, i), line.slice(i + 1)];
  }
  return null;
}

function splitOnSemicolon(head: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of head) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ";" && !inQuotes) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function unquote(value: string): string {
  const v = value.trim();
  return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}
function pushParam(params: Record<string, string[]>, key: string, value: string): void {
  (params[key] ??= []).push(value);
}
function isBinary(name: string, params: Record<string, string[]>): boolean {
  if (BINARY_PROPS.has(name)) return true;
  const enc = (params.ENCODING ?? []).map((v) => v.toUpperCase());
  if (enc.includes("B") || enc.includes("BASE64")) return true;
  return (params.TYPE ?? []).map((v) => v.toUpperCase()).includes("BASE64");
}

/** Parse one logical line into a decoded VProp, or null (no colon / binary). */
export function parseLine(line: string): VProp | null {
  const split = splitAtColon(line);
  if (!split) return null;
  const [head, rawValue] = split;
  const segments = splitOnSemicolon(head);
  const nameToken = segments[0];
  let group: string | null = null;
  let name = nameToken;
  const dot = nameToken.indexOf(".");
  if (dot > 0 && /^[A-Za-z0-9-]+$/.test(nameToken.slice(0, dot))) {
    group = nameToken.slice(0, dot);
    name = nameToken.slice(dot + 1);
  }
  name = name.toUpperCase();
  const params: Record<string, string[]> = {};
  for (const seg of segments.slice(1)) {
    if (!seg) continue;
    const eq = seg.indexOf("=");
    if (eq < 0) {
      pushParam(params, "TYPE", unquote(seg));
    } else {
      const key = seg.slice(0, eq).toUpperCase();
      for (const v of seg.slice(eq + 1).split(",")) pushParam(params, key, unquote(v));
    }
  }
  if (isBinary(name, params)) return null;
  const encoded = (params.ENCODING ?? []).map((v) => v.toUpperCase()).includes("QUOTED-PRINTABLE");
  const value = encoded
    ? decodeQuotedPrintable(rawValue, params.CHARSET?.[0])
    : vcardUnescape(rawValue);
  return { group, name, params, value };
}
