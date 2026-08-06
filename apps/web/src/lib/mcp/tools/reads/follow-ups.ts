import type { McpServer } from "@modelcontextprotocol/server";
import { listAllOpenFollowUps, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { findWarmPaths } from "@/lib/repo/warm-paths";
import { withUserDb } from "@/lib/db/request-scope";
import { userIdFromAuth } from "../../auth";
import { emptyResult, jsonResult } from "../../result";
import { findWarmPathInput, upcomingDatesInput } from "../../schemas";

/** Follow-up, warm-intro, and important-date read tools — dhaga_list_follow_ups,
 *  dhaga_find_warm_path, dhaga_list_upcoming_dates. See ../reads (index) for
 *  the shared read-half contract. */
export function registerFollowUpTools(server: McpServer): void {
  server.registerTool(
    "dhaga_list_follow_ups",
    {
      title: "List open follow-ups",
      description:
        "Every open follow-up across the whole network, soonest-due first, with undated ones last. Use this for 'what am I on the hook for' or 'who am I overdue with' — including people who never got back to you.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    // No inputSchema, so the callback receives only the context.
    async (ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const followUps = await withUserDb(userId, () => listAllOpenFollowUps());
      if (followUps.length === 0) {
        return emptyResult("No open follow-ups. The user is all caught up.");
      }
      return jsonResult(followUps);
    },
  );

  server.registerTool(
    "dhaga_find_warm_path",
    {
      title: "Find a warm intro path",
      description:
        "Given a person or company the user wants to reach, returns up to three introduction paths through people they already know. Each path starts at the contact to ask and ends at the target. Returns nothing when no path exists — say so rather than inventing a connector.",
      inputSchema: findWarmPathInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ targetId }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const paths = await withUserDb(userId, () => findWarmPaths(targetId));
      if (paths.length === 0) {
        return emptyResult(
          "No warm path to that target in the user's graph. Tell them there is no known route rather than suggesting one.",
        );
      }
      return jsonResult(paths);
    },
  );

  server.registerTool(
    "dhaga_list_upcoming_dates",
    {
      title: "List upcoming important dates",
      description:
        "Birthdays, work anniversaries, and other dates recorded on contacts that fall inside the next N days, resolved in the user's own timezone. Use this for 'who should I reach out to this week'.",
      inputSchema: upcomingDatesInput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ withinDays }, ctx) => {
      const userId = userIdFromAuth(ctx.http?.authInfo);
      const dates = await withUserDb(userId, () => listUpcomingImportantDates(withinDays));
      if (dates.length === 0) {
        return emptyResult(`No important dates in the next ${withinDays} days.`);
      }
      return jsonResult(dates);
    },
  );
}
