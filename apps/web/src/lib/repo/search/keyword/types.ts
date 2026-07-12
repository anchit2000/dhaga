export interface KeywordHit {
  contactId: string;
  score: number;
  match?: string;
}

/** ts_headline uses \x01 as its highlight marker (see SEARCH_HEADLINE_OPTS)
 *  instead of the default <b>/</b> so plain-text rendering never leaks HTML. */
export const stripHeadlineMarkers = (snippet: string): string => snippet.replace(/\x01/g, "");
