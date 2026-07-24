import type { ConfirmationView } from "@/lib/repo/confirmations";

/** Local to this template, mirroring daily-digest.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * "Confirmations waiting for review" digest — pure template, zero AI cost. Each
 * row is the confirmation's question linking straight to the inbox, so a tap
 * lands on the review screen (email needs an absolute URL — BETTER_AUTH_URL, the
 * same base the auth/access emails use).
 */
export function confirmationsDigestHtml(items: ConfirmationView[]): string {
  const href = `${process.env.BETTER_AUTH_URL ?? ""}/app/confirmations`;
  const rows = items
    .map((item) => {
      const who = item.contactName
        ? ` <span style="color:#a49a8a;">— ${escapeHtml(item.contactName)}</span>`
        : "";
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 14px;">
        <p style="margin:0;font-size:15px;">
          <a href="${href}" style="color:#f3ede2;text-decoration:none;">${escapeHtml(
            item.payload.question,
          )}</a>${who}
        </p>
      </div>`;
    })
    .join("");
  return `<p>${items.length} ${items.length === 1 ? "confirmation" : "confirmations"} waiting for your review:</p>${rows}
    <p><a href="${href}" style="color:#e2a44c;">Review them in Dhaga →</a></p>`;
}
