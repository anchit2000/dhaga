import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** User-defined custom node types ("Gym", "School") that entities belong to.
 *  Slug uniqueness is app-enforced per user — RLS adds user_id, so a DB
 *  unique on slug alone would collide across tenants. */
export const nodeTypes = pgTable("node_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull(), // hex, e.g. "#7c9ce8"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Custom graph nodes beyond contacts/companies/events (a gym, a project…). */
export const entities = pgTable("entities", {
  id: text("id").primaryKey(),
  typeId: text("type_id")
    .notNull()
    .references(() => nodeTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** User-defined relationship predicates extending the built-in
 *  RELATIONSHIP_ROLES map in packages/core at runtime. */
export const relationshipTypes = pgTable("relationship_types", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(), // snake_case predicate, e.g. "father_of"
  forwardLabel: text("forward_label").notNull(), // "father of"
  inverseLabel: text("inverse_label").notNull(), // "child of"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type NodeTypeRow = typeof nodeTypes.$inferSelect;
export type EntityRow = typeof entities.$inferSelect;
export type RelationshipTypeRow = typeof relationshipTypes.$inferSelect;
