/**
 * Value decoders for the vCard lexer: QUOTED-PRINTABLE + CHARSET (via
 * TextDecoder — the fix for garbled Android 2.1 non-ASCII names) and the
 * standard vCard backslash unescaping. Pure and deterministic.
 */

/** Decode `=XX` hex bytes then interpret them with the declared charset. */
export function decodeQuotedPrintable(input: string, charset: string | undefined): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "=" && i + 2 < input.length && /^[0-9A-Fa-f]{2}$/.test(input.slice(i + 1, i + 3))) {
      bytes.push(parseInt(input.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(input.charCodeAt(i) & 0xff);
    }
  }
  const label = charset && charset.trim() ? charset.trim().toLowerCase() : "utf-8";
  const data = new Uint8Array(bytes);
  try {
    return new TextDecoder(label).decode(data);
  } catch {
    return new TextDecoder("utf-8").decode(data);
  }
}

/** vCard unescaping: `\n`/`\N` → newline, `\,` `\;` `\\` → literal. */
export function vcardUnescape(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "\\" && i + 1 < value.length) {
      const next = value[++i];
      out += next === "n" || next === "N" ? "\n" : next;
    } else {
      out += value[i];
    }
  }
  return out;
}
