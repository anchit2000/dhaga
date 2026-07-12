import type { FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Local embeddings (BRD cost layer 1: free primitive, no per-call vendor
 * cost). The model downloads to the HF cache on first use (~35 MB) and runs
 * on CPU. Every caller must tolerate `null` — no model, no crash: search
 * degrades to keyword-only.
 */

const MODEL =
  process.env.DHAGA_EMBEDDINGS_MODEL ?? "Xenova/bge-small-en-v1.5";
/** bge models retrieve better when the query (not passages) gets this prefix. */
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

export const EMBEDDING_DIMENSIONS = 384;

export function embeddingsEnabled(): boolean {
  return process.env.DHAGA_EMBEDDINGS !== "off";
}

const store = globalThis as unknown as {
  __dhagaEmbedder?: Promise<FeatureExtractionPipeline | null>;
};

function getExtractor(): Promise<FeatureExtractionPipeline | null> {
  // Import lazily: this pulls in onnxruntime-node's native binary as a side
  // effect, which must not happen unless embeddings are actually used —
  // otherwise DHAGA_EMBEDDINGS=off can't prevent it (see Dockerfile comment
  // re: glibc-only native deps; unsupported on Vercel serverless).
  store.__dhagaEmbedder ??= import("@huggingface/transformers")
    .then(({ pipeline }) =>
      pipeline("feature-extraction", MODEL, { dtype: "q8" }),
    )
    .catch(() => {
      // Model unavailable (offline first run, unsupported platform). Cache the
      // failure for this process; callers fall back to keyword search.
      return null;
    });
  return store.__dhagaEmbedder;
}

async function embed(texts: string[]): Promise<number[][] | null> {
  if (!embeddingsEnabled() || texts.length === 0) return null;
  const extractor = await getExtractor();
  if (!extractor) return null;
  try {
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output.tolist() as number[][];
  } catch {
    return null;
  }
}

export function embedPassages(texts: string[]): Promise<number[][] | null> {
  return embed(texts);
}

export async function embedQuery(text: string): Promise<number[] | null> {
  const result = await embed([QUERY_PREFIX + text]);
  return result?.[0] ?? null;
}
