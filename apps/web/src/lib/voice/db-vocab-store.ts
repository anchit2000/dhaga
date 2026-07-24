/**
 * VocabStore backed by the per-user voice-vocab API (server persists the terms
 * and recomputes phonetic keys). Client-only: it calls our own `/api/voice/vocab`
 * routes with fetch — never a third-party API, never the DB directly.
 *
 * URL contract (the route is owned by another agent; we depend only on these):
 *   load()          GET    /api/voice/vocab            -> { terms: VocabTerm[] }
 *   upsert(...)     POST   /api/voice/vocab {term,...}  -> { term: VocabTerm }
 *   remove(term)    DELETE /api/voice/vocab?term=<t>
 *   clear()         DELETE /api/voice/vocab
 */
import type { VocabStore } from "@dhaga/core/src/voice/teaching/types";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

const VOCAB_URL = "/api/voice/vocab";

async function ok(res: Response, action: string): Promise<Response> {
  if (!res.ok) throw new Error(`voice vocab ${action} failed: ${res.status}`);
  return res;
}

export class DbVocabStore implements VocabStore {
  async load(): Promise<VocabTerm[]> {
    const res = await ok(await fetch(VOCAB_URL, { method: "GET" }), "load");
    const data = (await res.json()) as { terms: VocabTerm[] };
    return data.terms;
  }

  async upsert(term: string, aliases?: string[], boost?: number): Promise<VocabTerm> {
    const res = await ok(
      await fetch(VOCAB_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ term, aliases, boost }),
      }),
      "upsert",
    );
    const data = (await res.json()) as { term: VocabTerm };
    return data.term;
  }

  async remove(term: string): Promise<void> {
    await ok(
      await fetch(`${VOCAB_URL}?term=${encodeURIComponent(term)}`, { method: "DELETE" }),
      "remove",
    );
  }

  async clear(): Promise<void> {
    await ok(await fetch(VOCAB_URL, { method: "DELETE" }), "clear");
  }
}
