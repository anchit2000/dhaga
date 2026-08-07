import { and, eq, gt, or } from "drizzle-orm";
import { contacts } from "@/lib/db/schema";
import type { ConnectionItem } from "./types";

export type Cursor = { name: string; id: string };

export function decodeCursor(value?: string): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof parsed.name === "string" && typeof parsed.id === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function encodeCursor(item: ConnectionItem): string {
  return Buffer.from(
    JSON.stringify({ name: item.name, id: item.contactId }),
  ).toString("base64url");
}

export function afterCursor(cursor: Cursor | null) {
  if (!cursor) return undefined;
  return or(
    gt(contacts.name, cursor.name),
    and(eq(contacts.name, cursor.name), gt(contacts.id, cursor.id)),
  );
}
