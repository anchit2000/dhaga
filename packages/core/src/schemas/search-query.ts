import { z } from "zod";

/**
 * M6 stage 1 — query understanding: one small structured call turns a
 * natural-language question into filters + a semantic residual.
 */
export const searchQueryPlanSchema = z.object({
  session: z
    .string()
    .nullable()
    .describe("Event/session name if the question names one, else null"),
  company: z
    .string()
    .nullable()
    .describe("Company name if the question scopes to one, else null"),
  tags: z
    .array(z.string())
    .describe("Sector/role/topic tags implied by the question, lowercase"),
  semantic_query: z
    .string()
    .describe("The question rephrased as a short retrieval query"),
});

export type SearchQueryPlan = z.infer<typeof searchQueryPlanSchema>;
