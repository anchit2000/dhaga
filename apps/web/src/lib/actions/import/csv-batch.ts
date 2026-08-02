"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contactProfileSchema } from "@dhaga/core";
import { mutation } from "@/lib/actions/mutation";
import { importContacts, type ImportSummary } from "@/lib/repo/import";
import { emitWebhook } from "@/lib/webhooks";

/** Client sends batches (≤200) so big files dodge the action body limit. */
const batchSchema = z.object({
  format: z.enum(["google", "linkedin", "vcard", "microsoft"]),
  candidates: z
    .array(
      z.object({
        contact: contactProfileSchema,
        receipt: z.string().max(2_000),
      }),
    )
    .min(1)
    .max(200),
});

type ImportBatchResult = ImportSummary | { error: string };

export async function importCsvBatchAction(input: unknown): Promise<ImportBatchResult> {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { error: "That batch didn't validate — re-parse the file." };
  // The client already chunks into ≤200-row batches (one request each). Pin ONE
  // scoped connection for this batch: importContacts fans out a getDb() per row ×
  // distinct company plus the dedup scan and per-row note — enough to exhaust the
  // max-3 tenant pool (a server action gets no cache() getDb() dedupe). mutation()
  // collapses them to one connection and returns a resilient result on failure.
  // skipWebhook keeps the outbound contacts.imported fetch OUT of that scope — we
  // emit it below, after mutation() has released the connection.
  const r = await mutation("importCsvBatch", () =>
    importContacts(parsed.data.candidates, parsed.data.format, { skipWebhook: true }),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/app/people");
  revalidatePath("/app/import");
  revalidatePath("/app");
  // Best-effort, post-scope: a dead receiver must never fail an import that has
  // already committed (emitWebhook itself swallows + 5s-timeouts; the try/catch
  // is belt-and-braces so a future throwing emit can't break the action).
  if (r.data.created > 0 && r.data.format) {
    try {
      await emitWebhook("contacts.imported", { count: r.data.created, format: r.data.format });
    } catch {
      // Swallowed — the contacts are saved; the webhook is a courtesy.
    }
  }
  return { created: r.data.created, skipped: r.data.skipped };
}
