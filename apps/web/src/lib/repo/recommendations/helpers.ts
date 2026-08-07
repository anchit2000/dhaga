function tokens(value: string): string[] {
  return [...new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 1))];
}

function decodeOffset(cursor?: string): number {
  if (!cursor) return 0;
  const value = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function encodeOffset(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

export { tokens, decodeOffset, encodeOffset };
