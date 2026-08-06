import { z } from "zod";

/**
 * Input schemas for the MCP tools. Kept in one file so the whole external
 * surface of the graph is readable at a glance — this is the contract a
 * stranger's AI client codes against, so widening it is a deliberate act.
 *
 * Every limit is bounded server-side: an external model that asks for 10,000
 * contacts gets 100, not a pool-exhausting scan.
 */

export const searchInput = z.object({
  query: z
    .string()
    .min(1)
    .describe("Natural-language or keyword query, e.g. 'designers in Berlin' or 'Priya'."),
});

export const listContactsInput = z.object({
  name: z.string().optional().describe("Partial name match (case-insensitive)."),
  company: z.string().optional().describe("Exact company name."),
  tag: z.string().optional().describe("Exact tag."),
  starred: z.boolean().optional().describe("Only starred contacts."),
  page: z.number().int().min(1).default(1).describe("1-based page number."),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Results per page (max 100)."),
});

export const getContactInput = z.object({
  contactId: z
    .string()
    .min(1)
    .describe("Contact id, as returned by dhaga_search or dhaga_list_contacts."),
});

export const findWarmPathInput = z.object({
  targetId: z
    .string()
    .min(1)
    .describe("Id of the contact or company you want an introduction to."),
});

export const upcomingDatesInput = z.object({
  withinDays: z
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30)
    .describe("Look-ahead window in days."),
});

export const addNoteInput = z.object({
  contactId: z.string().min(1).describe("Contact the note is about."),
  body: z
    .string()
    .min(1)
    .max(20000)
    .describe("The note text. Facts and follow-ups are extracted from it afterwards."),
});

export const createContactInput = z.object({
  name: z.string().min(1).describe("Full name. The only required field."),
  title: z.string().optional().describe("Job title."),
  company: z.string().optional().describe("Company name; created if unknown."),
  emails: z.array(z.string()).default([]).describe("Email addresses."),
  phones: z.array(z.string()).default([]).describe("Phone numbers."),
  links: z.array(z.string()).default([]).describe("Profile URLs (LinkedIn, site, …)."),
  location: z.string().optional().describe("City or region."),
  note: z
    .string()
    .optional()
    .describe("Optional first note — how you met, why they matter, what was said."),
});

export const createFollowUpInput = z.object({
  contactId: z.string().min(1).optional().describe("Optional person the task is about."),
  companyId: z.string().min(1).optional().describe("Optional company the task is about."),
  action: z.string().min(1).max(500).describe("What to do, e.g. 'send the deck'."),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Due date as YYYY-MM-DD. Omit for an undated reminder."),
  recurrence: z.object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1).default(1),
    weekday: z.number().int().min(0).max(6).nullable().default(null),
    monthDay: z.number().int().min(1).max(31).nullable().default(null),
    month: z.number().int().min(1).max(12).nullable().default(null),
  }).optional().describe("Repeat schedule. Requires dueDate."),
});

export const closeFollowUpInput = z.object({
  followUpId: z
    .string()
    .min(1)
    .describe("Follow-up id, as returned by dhaga_list_follow_ups."),
  status: z
    .enum(["done", "dismissed"])
    .describe("'done' if it happened, 'dismissed' if it no longer applies."),
  expectedDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe("Current occurrence date from the list result; required to advance recurring tasks safely."),
});
