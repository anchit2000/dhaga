import type { ExtractionStreamEvent } from "@/types";

/** Fire-and-read one job: the same POST both claims the job (the atomic claim
 *  dedupes a double-fire) and streams its NDJSON progress. keepalive lets the
 *  worker run to completion even if the user navigates away mid-extraction. */
export async function streamJob(
  jobId: string,
  onEvent: (event: ExtractionStreamEvent) => void,
): Promise<void> {
  const response = await fetch(
    `/api/jobs/extraction/run?jobId=${encodeURIComponent(jobId)}`,
    { method: "POST", keepalive: true },
  );
  if (!response.ok || !response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ExtractionStreamEvent);
      newline = buffer.indexOf("\n");
    }
  }
}
