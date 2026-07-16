import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One saved sigma layout per user (per `key`; only "default" exists today):
 * the settled FA2 positions for a graph_hash, so any device can skip the
 * layout pass entirely (see repo/graph-layouts.ts and layout/run-layout.ts).
 * Uniqueness is the named constraint graph_layouts_scope_key — (key) when
 * self-hosted, (user_id, key) under EE RLS — targeted by name on upsert.
 */
export const graphLayouts = pgTable("graph_layouts", {
  id: text("id").primaryKey(),
  key: text("key").notNull().default("default"),
  graphHash: text("graph_hash").notNull(),
  positions: jsonb("positions").$type<Record<string, [number, number]>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GraphLayoutRow = typeof graphLayouts.$inferSelect;
