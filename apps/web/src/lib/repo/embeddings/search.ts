import { embedQuery } from "@/lib/ai/embedder";
import { getVectorStore } from "../vector-store";

export interface SemanticHit {
  contactId: string;
  content: string;
  ownerType: string;
  similarity: number;
}

export async function semanticSearch(
  query: string,
  limit = 12,
): Promise<SemanticHit[]> {
  const queryVector = await embedQuery(query);
  if (!queryVector) return [];
  const vectorStore = getVectorStore();
  if (queryVector.length !== vectorStore.dimensions) {
    throw new Error(
      `Query embedding has ${queryVector.length} dimensions, but vector store ` +
        `"${vectorStore.id}" expects ${vectorStore.dimensions}`,
    );
  }
  return vectorStore.search(queryVector, { limit, minimumSimilarity: 0.5 });
}
