"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { clearVocab, removeVocab, upsertVocab } from "@/lib/repo/voice-vocab";

/**
 * Server actions the settings UI binds to <form action={...}>. FormData contract:
 *   addVocabTermAction    — `term` (required), `aliases` (optional, comma-separated),
 *                           `boost` (optional integer)
 *   removeVocabTermAction — `term` (required)
 *   clearVocabAction      — no fields
 */

function parseAliases(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);
}

export async function addVocabTermAction(formData: FormData): Promise<void> {
  const term = String(formData.get("term") ?? "").trim();
  if (!term) return;
  const aliases = parseAliases(formData.get("aliases"));
  const boostRaw = formData.get("boost");
  const boost = typeof boostRaw === "string" && boostRaw.trim() ? Number(boostRaw) : undefined;
  const r = await mutation("addVocabTerm", () =>
    upsertVocab(term, aliases, Number.isInteger(boost) ? boost : undefined),
  );
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

export async function removeVocabTermAction(formData: FormData): Promise<void> {
  const term = String(formData.get("term") ?? "").trim();
  if (!term) return;
  const r = await mutation("removeVocabTerm", () => removeVocab(term));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

export async function clearVocabAction(): Promise<void> {
  const r = await mutation("clearVocab", () => clearVocab());
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}
