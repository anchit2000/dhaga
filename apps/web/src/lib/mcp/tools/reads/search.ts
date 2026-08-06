import type { McpServer } from "@modelcontextprotocol/server";
import { getContact, listContactsPage } from "@/lib/repo/contacts";
import { listFacts, listNotes, listOpenFollowUps } from "@/lib/repo/notes";
import { hybridSearch } from "@/lib/repo/search";
import { withUserDb } from "@/lib/db/request-scope";
import { userIdFromAuth } from "../../auth";
import { emptyResult, jsonResult } from "../../result";
import { getContactInput, listContactsInput, searchInput } from "../../schemas";

/** Search + browse + full-record read tools — dhaga_search, dhaga_list_contacts,
 *  dhaga_get_contact. See ../reads (index) for the shared read-half contract. */
export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "dhaga_search",
    {
      title: "Search your network",
      description:
        "Search the user's Dhaga contacts by name, company, role, location, or anything written in a note. Hybrid keyword + semantic search. Returns matching people with the snippets that matched, so you can cite why someone came back. Use this first when you don't already have a contact id.",
      inputSchema: searchInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const hits = await withUserDb(userId, () => hybridSearch(query));
      if (hits.length === 0) {
        return emptyResult(
          `No one in the user's network matches "${query}". Say so — do not guess at who they might have meant.`,
        );
      }
      return jsonResult(hits);
    },
  );

  server.registerTool(
    "dhaga_list_contacts",
    {
      title: "List contacts",
      description:
        "Browse the user's contacts with optional filters and pagination. Use this for 'who do I know at X' or 'show me my starred contacts'; use dhaga_search for open-ended questions.",
      inputSchema: listContactsInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, company, tag, starred, page, pageSize }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const { rows, total } = await withUserDb(userId, () =>
        listContactsPage({ page, pageSize, name, company, tag, starred }),
      );
      if (rows.length === 0) {
        return emptyResult("No contacts match those filters.");
      }
      return jsonResult({ contacts: rows, total, page, pageSize });
    },
  );

  server.registerTool(
    "dhaga_get_contact",
    {
      title: "Get a contact's full record",
      description:
        "Everything Dhaga knows about one person: their details and job history, the facts extracted from notes, recent notes verbatim, and any open follow-ups. Facts carry a sourceNoteId receipt — a fact with no receipt was entered by hand.",
      inputSchema: getContactInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ contactId }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      // One scope for all four reads — they share the single tenant connection.
      const record = await withUserDb(userId, async () => {
        const detail = await getContact(contactId);
        if (!detail) return null;
        const facts = await listFacts(contactId);
        const notes = await listNotes(contactId);
        const followUps = await listOpenFollowUps(contactId);
        return { ...detail, facts, notes: notes.slice(0, 25), followUps };
      });
      if (!record) {
        return emptyResult(
          `No contact with id "${contactId}". Look the person up with dhaga_search first.`,
        );
      }
      return jsonResult(record);
    },
  );
}
