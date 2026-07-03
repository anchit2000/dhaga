import type { DigestPerson } from "@/lib/repo/digest";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Post-event digest body (v1.2) — pure template, zero AI cost. */
export function sessionDigestHtml(people: DigestPerson[]): string {
  const blocks = people
    .map((person) => {
      const identity = [person.title, person.companyName]
        .filter((value): value is string => Boolean(value))
        .map(escapeHtml)
        .join(" · ");
      const factItems = person.facts
        .map((fact) => `<li>${escapeHtml(fact)}</li>`)
        .join("");
      const followUpItems = person.followUps
        .map((followUp) => `<li><em>Follow up:</em> ${escapeHtml(followUp)}</li>`)
        .join("");
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 16px;">
        <p style="color:#f3ede2;margin:0;font-size:15px;">${escapeHtml(person.name)}${
          identity ? ` <span style="color:#a49a8a;">— ${identity}</span>` : ""
        }</p>
        ${factItems || followUpItems ? `<ul style="margin:6px 0 0;padding-left:18px;">${factItems}${followUpItems}</ul>` : ""}
      </div>`;
    })
    .join("");
  return `<p>${people.length} ${people.length === 1 ? "person" : "people"}, with what you learned about them:</p>${blocks}
    <p>Reply-worthy threads fade fast — send the follow-ups while the event is still warm.</p>`;
}
