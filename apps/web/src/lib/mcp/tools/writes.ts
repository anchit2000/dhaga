import type { McpServer } from "@modelcontextprotocol/server";
import { bareMethods } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { addNote, setFollowUpStatus } from "@/lib/repo/notes";
import { createTask } from "@/lib/repo/tasks";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { hasMonthlyAiBudget } from "@/lib/ai/metering";
import { withUserDb } from "@/lib/db/request-scope";
import { userIdFromAuth } from "../auth";
import { errorResult, jsonResult } from "../result";
import { addNoteInput, closeFollowUpInput, createContactInput, createFollowUpInput } from "../schemas";

/**
 * The write half of the MCP surface — deliberately narrow.
 *
 * Only additive operations are exposed: create a contact, attach a note,
 * open a follow-up, close a follow-up. There is no delete, merge, bulk action,
 * or export tool here, and there should not be one: a confused or
 * prompt-injected client must not be able to cascade-delete a graph
 * (contact → notes → facts → edges → embeddings) that the user cannot recover.
 *
 * Notes queue extraction the same way the in-app note form does, so a note
 * written by an external agent still produces facts and follow-ups that carry
 * a `source_note_id` receipt — deleting the note still tombstones them.
 */
export function registerWriteTools(server: McpServer): void {
  server.registerTool(
    "dhaga_add_note",
    {
      title: "Add a note about someone",
      description:
        "Attach a note to a contact — what was said, what changed, what they need. Dhaga extracts facts and follow-ups from it in the background, each keeping a receipt back to this note. Write what the user actually told you; do not embellish.",
      inputSchema: addNoteInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ contactId, body }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const result = await withUserDb(userId, async () => {
        const noteId = await addNote(contactId, "text", body);
        // Mirrors addNoteAction: only queue extraction when the user has AI
        // budget left, so a capped account still keeps the note itself.
        const budgeted = await hasMonthlyAiBudget(userId);
        if (budgeted) await createExtractionJob({ contactId, kind: "note_extraction", noteId });
        return { noteId, extractionQueued: budgeted };
      });
      return jsonResult({
        ...result,
        message: result.extractionQueued
          ? "Note saved. Facts and follow-ups will be extracted shortly."
          : "Note saved. Extraction was skipped — the user is out of AI credits this month.",
      });
    },
  );

  server.registerTool(
    "dhaga_create_contact",
    {
      title: "Save a new contact",
      description:
        "Add a person to the user's network. Only a name is required. Pass `note` to record how they met or why this person matters — that becomes their first note and is extracted into facts. If the person may already exist, run dhaga_search first: saving a duplicate is worse than asking.",
      inputSchema: createContactInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ name, title, company, emails, phones, links, location, note }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const result = await withUserDb(userId, async () => {
        const contactId = await createContact(
          {
            name,
            title: title ?? null,
            company: company ?? null,
            // The tool's public input stays bare string arrays — widening an
            // MCP contract to labeled objects would break every client.
            emails: bareMethods(emails),
            phones: bareMethods(phones),
            links,
            location: location ?? null,
          },
          "quick_add",
        );
        if (!note) return { contactId, noteId: null };
        const noteId = await addNote(contactId, "text", note);
        if (await hasMonthlyAiBudget(userId)) {
          await createExtractionJob({ contactId, kind: "note_extraction", noteId });
        }
        return { contactId, noteId };
      });
      return jsonResult({
        ...result,
        // createContact promotes an existing "mentioned" stub in place, so the
        // id may belong to a person the graph already knew about.
        message: `Saved ${name}. Use this contactId for follow-ups and further notes.`,
      });
    },
  );

  server.registerTool(
    "dhaga_create_follow_up",
    {
      title: "Create a follow-up",
      description:
        "Open a reminder to do something for or with a contact — send a deck, check back in, chase a reply that never came. Set dueDate when the user named a date; leave it off otherwise rather than inventing one.",
      inputSchema: createFollowUpInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ contactId, companyId, action, dueDate, recurrence }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      // Parsed as UTC midnight — follow-up due dates are calendar days, not
      // instants, and the reminder job compares them in the user's timezone.
      const due = dueDate ? new Date(`${dueDate}T00:00:00Z`) : null;
      const followUpId = await withUserDb(userId, () => createTask(userId, {
        contactId: contactId ?? null,
        companyId: companyId ?? null,
        action,
        dueDate: due,
        recurrence: recurrence ?? null,
      }));
      return jsonResult({ followUpId, contactId: contactId ?? null,
        companyId: companyId ?? null, action, dueDate: dueDate ?? null, recurrence: recurrence ?? null });
    },
  );

  server.registerTool(
    "dhaga_close_follow_up",
    {
      title: "Close a follow-up",
      description:
        "Mark an open follow-up 'done' when it actually happened, or 'dismissed' when it no longer applies. Only close one the user has confirmed — never clear a list on your own initiative.",
      inputSchema: closeFollowUpInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ followUpId, status, expectedDueDate }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const expected = expectedDueDate ? new Date(`${expectedDueDate}T00:00:00Z`) : null;
      const completion = await withUserDb(userId, () => setFollowUpStatus(followUpId, status, expected));
      if (status === "done" && !completion.changed) {
        return errorResult(
          "This recurring occurrence was not completed. List follow-ups again and retry with its current expectedDueDate.",
        );
      }
      return jsonResult({
        followUpId,
        status,
        changed: completion.changed,
        nextOccurrence: completion.advancedTo,
      });
    },
  );
}
