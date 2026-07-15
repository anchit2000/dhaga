import type { DailySuggestion } from "@/lib/repo/daily-suggestions";

/** Local to this template, mirroring digest.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Morning "reach out to these people today" digest — pure template, zero AI cost. */
export function dailyDigestHtml(suggestions: DailySuggestion[]): string {
  const rows = suggestions
    .map((suggestion) => {
      const identity = [suggestion.title, suggestion.companyName]
        .filter((value): value is string => Boolean(value))
        .map(escapeHtml)
        .join(" · ");
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 14px;">
        <p style="color:#f3ede2;margin:0;font-size:15px;">${escapeHtml(suggestion.name)}${
          identity ? ` <span style="color:#a49a8a;">— ${identity}</span>` : ""
        }</p>
        <p style="color:#a49a8a;margin:2px 0 0;font-size:13px;">${escapeHtml(suggestion.reason)}</p>
      </div>`;
    })
    .join("");
  return `<p>${suggestions.length} ${suggestions.length === 1 ? "person" : "people"} worth a message today:</p>${rows}
    <p>Consistency beats intensity — a few threads a day keeps the whole network warm.</p>`;
}
