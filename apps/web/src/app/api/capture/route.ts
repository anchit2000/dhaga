import { hasSession } from "@/lib/auth/guard";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { createContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";

/**
 * One-shot capture for external surfaces (browser extension; later, mobile
 * share sheets): raw text in → extracted contact saved with the source text
 * as its receipt note. Same pipeline as web quick-add, minus the review
 * step — the extension shows the result and links to the contact for edits.
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await hasSession())) {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  let raw = "";
  let sourceUrl = "";
  try {
    const body = (await request.json()) as { raw?: unknown; sourceUrl?: unknown };
    raw = String(body.raw ?? "").trim();
    sourceUrl = String(body.sourceUrl ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!raw) {
    return Response.json({ error: "Nothing to capture." }, { status: 400 });
  }
  if (raw.length > 10_000) {
    return Response.json({ error: "Selection too long." }, { status: 400 });
  }

  const extraction = await extractContactFromText(raw);
  if (!extraction.contact.name.trim()) {
    return Response.json(
      { error: "Couldn't find a person in that text — select their details and retry." },
      { status: 422 },
    );
  }
  const id = await createContact(extraction.contact, "quick_add");
  const receipt = sourceUrl ? `${raw}\n\nSource: ${sourceUrl}` : raw;
  const noteId = await addNote(id, "capture_source", receipt);
  await upsertEmbedding("note", noteId, id, receipt);

  return Response.json({
    id,
    name: extraction.contact.name,
    company: extraction.contact.company,
    via: extraction.via,
    notice: extraction.notice ?? null,
  });
}
