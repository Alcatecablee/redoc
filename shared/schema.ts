import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documentations = pgTable("documentations", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  user_id: text("user_id"),
  subdomain: text("subdomain").unique(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertDocumentationSchema = createInsertSchema(documentations).omit({
  id: true,
  generatedAt: true,
});

export type InsertDocumentation = z.infer<typeof insertDocumentationSchema>;
export type Documentation = typeof documentations.$inferSelect;
