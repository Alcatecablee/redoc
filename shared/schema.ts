import { pgTable, serial, text, timestamp, jsonb, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table for subscription management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan").notNull().default("free"), // 'free', 'pro', 'enterprise'
  subscription_id: text("subscription_id"), // PayPal subscription ID
  subscription_status: text("subscription_status"), // 'active', 'cancelled', 'expired'
  generation_count: integer("generation_count").notNull().default(0), // For free tier limit (resets monthly)
  api_key: text("api_key").unique(), // For enterprise tier
  api_usage: integer("api_usage").notNull().default(0), // Token usage for Enterprise billing
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"), // For API usage billing
  last_reset_at: timestamp("last_reset_at").notNull().defaultNow(), // For monthly reset of free tier
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Payment history for tracking all transactions
export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  subscription_id: text("subscription_id"),
  payment_id: text("payment_id").notNull(), // PayPal payment ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(), // 'completed', 'pending', 'failed', 'refunded'
  plan: text("plan").notNull(), // 'pro', 'enterprise'
  payment_type: text("payment_type").notNull(), // 'subscription', 'api_usage', 'consulting'
  metadata: jsonb("metadata"), // Additional PayPal data
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Subscription events for audit trail
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  subscription_id: text("subscription_id").notNull(),
  event_type: text("event_type").notNull(), // 'created', 'activated', 'suspended', 'cancelled', 'payment_failed'
  event_data: jsonb("event_data"), // PayPal webhook payload
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const documentations = pgTable("documentations", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  user_id: text("user_id"),
  subdomain: text("subdomain").unique(),
  theme_id: integer("theme_id"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  user_id: text("user_id").notNull(),
  tokens: jsonb("tokens").notNull(),
  is_default: text("is_default").default("false"),
  source_url: text("source_url"),
  confidence_score: text("confidence_score"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  paymentHistory: many(paymentHistory),
  subscriptionEvents: many(subscriptionEvents),
}));

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  user: one(users, {
    fields: [paymentHistory.user_id],
    references: [users.id],
  }),
}));

export const subscriptionEventsRelations = relations(subscriptionEvents, ({ one }) => ({
  user: one(users, {
    fields: [subscriptionEvents.user_id],
    references: [users.id],
  }),
}));

export const documentationsRelations = relations(documentations, ({ one }) => ({
  theme: one(themes, {
    fields: [documentations.theme_id],
    references: [themes.id],
  }),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  documentations: many(documentations),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertDocumentationSchema = createInsertSchema(documentations).omit({
  id: true,
  generatedAt: true,
}) as any;

export const insertThemeSchema = createInsertSchema(themes).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  created_at: true,
}) as any;

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  created_at: true,
}) as any;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDocumentation = z.infer<typeof insertDocumentationSchema>;
export type Documentation = typeof documentations.$inferSelect;
export type InsertTheme = z.infer<typeof insertThemeSchema>;
export type Theme = typeof themes.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
