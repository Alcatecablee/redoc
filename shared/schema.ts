import { pgTable, serial, text, timestamp, jsonb, integer, decimal, boolean, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom type for PostgreSQL tsvector (full-text search)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// Users table for subscription management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan").notNull().default("free"), // 'free', 'pro', 'enterprise'
  is_admin: boolean("is_admin").notNull().default(false), // Platform admin access
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

// Custom orders for Configure Your Project feature
export const customOrders = pgTable("custom_orders", {
  id: serial("id").primaryKey(),
  order_number: text("order_number").notNull().unique(), // Human-friendly: ORD-2025-001234
  
  // Customer Information
  user_id: integer("user_id"), // References users(id), nullable for guest orders
  email: text("email").notNull(),
  
  // Project Details
  url: text("url").notNull(),
  github_repo: text("github_repo"),
  
  // Configuration
  tier: text("tier").notNull(), // 'custom', 'standard', 'professional', 'enterprise'
  sections: text("sections").notNull(), // '8-12', '13-20', '20+'
  source_depth: text("source_depth").notNull(), // 'basic', 'standard', 'deep'
  delivery: text("delivery").notNull(), // 'standard', 'rush', 'same-day'
  formats: jsonb("formats").notNull(), // Array of format strings
  branding: text("branding").notNull(), // 'basic', 'advanced'
  youtube_options: jsonb("youtube_options"), // Array of YouTube feature strings
  seo_options: jsonb("seo_options"), // Array of SEO feature strings
  enterprise_features: jsonb("enterprise_features"), // Array of enterprise feature strings
  
  // Custom Requirements
  custom_requirements: text("custom_requirements"),
  requirements_parsed: jsonb("requirements_parsed"), // Parsed/categorized requirements
  requirements_complexity_score: integer("requirements_complexity_score"),
  
  // Pricing
  pricing_breakdown: jsonb("pricing_breakdown").notNull(), // Full breakdown object
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount_amount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  tax_amount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  discount_code: text("discount_code"),
  
  // Payment
  payment_id: text("payment_id"), // PayPal order/payment ID
  payment_status: text("payment_status").default("pending"), // 'pending', 'paid', 'failed', 'refunded'
  
  // Order Status
  status: text("status").default("quote"), // 'quote', 'pending_payment', 'processing', 'completed', 'cancelled'
  fulfillment_status: text("fulfillment_status"), // 'not_started', 'in_progress', 'delivered'
  
  // Delivery
  estimated_delivery_date: timestamp("estimated_delivery_date"),
  actual_delivery_date: timestamp("actual_delivery_date"),
  delivery_url: text("delivery_url"), // Link to completed documentation
  
  // Metadata
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  referral_source: text("referral_source"),
  session_data: jsonb("session_data"),
  admin_notes: text("admin_notes"),
  
  // Timestamps
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  paid_at: timestamp("paid_at"),
  completed_at: timestamp("completed_at"),
});

// Discount codes for promotional campaigns
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discount_type: text("discount_type").notNull(), // 'percentage', 'fixed'
  discount_value: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  min_order_amount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  max_uses: integer("max_uses"),
  current_uses: integer("current_uses").notNull().default(0),
  valid_from: timestamp("valid_from").defaultNow(),
  valid_until: timestamp("valid_until"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const documentations = pgTable("documentations", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  user_id: integer("user_id"),
  subdomain: text("subdomain").unique(),
  theme_id: integer("theme_id"),
  current_version: integer("current_version").notNull().default(1), // Track current version number
  search_vector: tsvector("search_vector"), // TIER 3.3: Full-text search vector
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Documentation versions for version history and rollback
export const documentationVersions = pgTable("documentation_versions", {
  id: serial("id").primaryKey(),
  documentation_id: integer("documentation_id").notNull(), // Reference to main documentation
  version: integer("version").notNull(), // Version number (1, 2, 3, etc.)
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  user_id: integer("user_id"),
  theme_id: integer("theme_id"),
  subdomain: text("subdomain"),
  version_notes: text("version_notes"), // What changed in this version
  content_hash: text("content_hash"), // SHA-256 hash for change detection
  is_latest: boolean("is_latest").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  created_by: text("created_by"), // Who created this version
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  user_id: integer("user_id").notNull(),
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
  customOrders: many(customOrders),
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

export const customOrdersRelations = relations(customOrders, ({ one }) => ({
  user: one(users, {
    fields: [customOrders.user_id],
    references: [users.id],
  }),
}));

export const documentationsRelations = relations(documentations, ({ one, many }) => ({
  theme: one(themes, {
    fields: [documentations.theme_id],
    references: [themes.id],
  }),
  versions: many(documentationVersions),
}));

export const documentationVersionsRelations = relations(documentationVersions, ({ one }) => ({
  documentation: one(documentations, {
    fields: [documentationVersions.documentation_id],
    references: [documentations.id],
  }),
  theme: one(themes, {
    fields: [documentationVersions.theme_id],
    references: [themes.id],
  }),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  documentations: many(documentations),
}));

// API Keys table for enterprise users
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  key_hash: text("key_hash").notNull().unique(), // Hashed API key for security
  key_prefix: text("key_prefix").notNull(), // Display prefix (e.g., "dk_...abc123")
  name: text("name").notNull(), // User-friendly name for the key
  description: text("description"),
  scopes: jsonb("scopes").notNull().default('["read", "write"]'), // Permissions: read, write, admin
  rate_limit_per_minute: integer("rate_limit_per_minute").notNull().default(60),
  rate_limit_per_day: integer("rate_limit_per_day").notNull().default(1000),
  usage_count: integer("usage_count").notNull().default(0),
  last_used_at: timestamp("last_used_at"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at"), // Optional expiration
});

// Organizations table for team collaboration
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  owner_id: integer("owner_id").notNull(),
  plan: text("plan").notNull().default("free"), // 'free', 'team', 'enterprise'
  settings: jsonb("settings").notNull().default('{}'), // Brand colors, logo, etc.
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Organization members for team collaboration
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organization_id: integer("organization_id").notNull(),
  user_id: integer("user_id").notNull(),
  role: text("role").notNull().default("member"), // 'owner', 'admin', 'member', 'viewer'
  permissions: jsonb("permissions").notNull().default('[]'),
  joined_at: timestamp("joined_at").notNull().defaultNow(),
});

// Webhooks table for event notifications
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  organization_id: integer("organization_id"),
  url: text("url").notNull(),
  events: jsonb("events").notNull().default('["documentation.created", "documentation.updated"]'), // Event types to subscribe to
  secret: text("secret").notNull(), // For signature verification
  is_active: boolean("is_active").notNull().default(true),
  last_triggered_at: timestamp("last_triggered_at"),
  failure_count: integer("failure_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Webhook deliveries for tracking
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  webhook_id: integer("webhook_id").notNull(),
  event_type: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  response_status: integer("response_status"),
  response_body: text("response_body"),
  delivered_at: timestamp("delivered_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Support tickets for priority support
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'waiting', 'resolved', 'closed'
  assigned_to: integer("assigned_to"), // Admin user ID
  sla_deadline: timestamp("sla_deadline"), // Based on plan tier
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  resolved_at: timestamp("resolved_at"),
});

// Support ticket messages
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticket_id: integer("ticket_id").notNull(),
  user_id: integer("user_id").notNull(),
  message: text("message").notNull(),
  is_internal: boolean("is_internal").notNull().default(false), // Internal notes
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Custom branding settings
export const brandingSettings = pgTable("branding_settings", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  organization_id: integer("organization_id"),
  logo_url: text("logo_url"),
  primary_color: text("primary_color"),
  secondary_color: text("secondary_color"),
  font_family: text("font_family"),
  custom_css: text("custom_css"),
  white_label_enabled: boolean("white_label_enabled").notNull().default(false),
  custom_domain: text("custom_domain"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Activity logs for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id"),
  organization_id: integer("organization_id"),
  action: text("action").notNull(), // 'created', 'updated', 'deleted', 'accessed'
  resource_type: text("resource_type").notNull(), // 'documentation', 'api_key', 'webhook', etc.
  resource_id: text("resource_id"),
  metadata: jsonb("metadata"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Idempotency keys for request deduplication
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  status: text("status").notNull(), // 'processing', 'completed', 'failed'
  status_code: integer("status_code"),
  response: text("response"),
  error: text("error"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at").notNull(),
});

// TIER 3.2: Documentation pages for incremental updates
export const documentationPages = pgTable("documentation_pages", {
  id: serial("id").primaryKey(),
  documentation_id: integer("documentation_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  content_hash: text("content_hash").notNull(), // SHA-256 for change detection
  section_type: text("section_type"), // 'overview', 'api', 'tutorial', 'faq', etc.
  metadata: jsonb("metadata"), // Additional page data
  search_vector: tsvector("search_vector"), // TIER 3.3: Full-text search vector
  last_checked_at: timestamp("last_checked_at").notNull().defaultNow(),
  last_modified_at: timestamp("last_modified_at").notNull().defaultNow(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// TIER 3.2: Page change tracking for incremental updates
export const pageChangeLog = pgTable("page_change_log", {
  id: serial("id").primaryKey(),
  page_id: integer("page_id").notNull(),
  documentation_id: integer("documentation_id").notNull(),
  old_hash: text("old_hash"),
  new_hash: text("new_hash").notNull(),
  change_type: text("change_type").notNull(), // 'added', 'modified', 'deleted'
  diff_summary: text("diff_summary"), // Brief description of changes
  regenerated: boolean("regenerated").notNull().default(false),
  detected_at: timestamp("detected_at").notNull().defaultNow(),
});

// TIER 3.4: Analytics events for tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  documentation_id: integer("documentation_id").notNull(),
  event_type: text("event_type").notNull(), // 'view', 'export', 'search', 'share'
  page_url: text("page_url"),
  section_id: text("section_id"),
  user_id: integer("user_id"),
  session_id: text("session_id"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  referrer: text("referrer"),
  metadata: jsonb("metadata"), // Additional event data
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// TIER 3.4: Analytics summary (aggregated data)
export const analyticsSummary = pgTable("analytics_summary", {
  id: serial("id").primaryKey(),
  documentation_id: integer("documentation_id").notNull(),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end").notNull(),
  total_views: integer("total_views").notNull().default(0),
  unique_visitors: integer("unique_visitors").notNull().default(0),
  total_exports: integer("total_exports").notNull().default(0),
  total_searches: integer("total_searches").notNull().default(0),
  avg_time_on_page: integer("avg_time_on_page"), // in seconds
  popular_pages: jsonb("popular_pages"), // Array of {url, views}
  popular_sections: jsonb("popular_sections"), // Array of {section, views}
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Relations for new tables
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.user_id],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.owner_id],
    references: [users.id],
  }),
  members: many(organizationMembers),
  webhooks: many(webhooks),
  brandingSettings: many(brandingSettings),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organization_id],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.user_id],
    references: [users.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  user: one(users, {
    fields: [webhooks.user_id],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [webhooks.organization_id],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhook_id],
    references: [webhooks.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.user_id],
    references: [users.id],
  }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketMessages.ticket_id],
    references: [supportTickets.id],
  }),
  user: one(users, {
    fields: [supportTicketMessages.user_id],
    references: [users.id],
  }),
}));

export const brandingSettingsRelations = relations(brandingSettings, ({ one }) => ({
  user: one(users, {
    fields: [brandingSettings.user_id],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [brandingSettings.organization_id],
    references: [organizations.id],
  }),
}));

export const documentationPagesRelations = relations(documentationPages, ({ one, many }) => ({
  documentation: one(documentations, {
    fields: [documentationPages.documentation_id],
    references: [documentations.id],
  }),
  changeLogs: many(pageChangeLog),
}));

export const pageChangeLogRelations = relations(pageChangeLog, ({ one }) => ({
  page: one(documentationPages, {
    fields: [pageChangeLog.page_id],
    references: [documentationPages.id],
  }),
  documentation: one(documentations, {
    fields: [pageChangeLog.documentation_id],
    references: [documentations.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  documentation: one(documentations, {
    fields: [analyticsEvents.documentation_id],
    references: [documentations.id],
  }),
}));

export const analyticsSummaryRelations = relations(analyticsSummary, ({ one }) => ({
  documentation: one(documentations, {
    fields: [analyticsSummary.documentation_id],
    references: [documentations.id],
  }),
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

export const insertCustomOrderSchema = createInsertSchema(customOrders).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({
  id: true,
  created_at: true,
}) as any;

// Insert schemas for new tables
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  created_at: true,
}) as any;

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  joined_at: true,
}) as any;

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  created_at: true,
}) as any;

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
  id: true,
  created_at: true,
}) as any;

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({
  id: true,
  created_at: true,
}) as any;

export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({
  id: true,
  created_at: true,
  updated_at: true,
}) as any;

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  created_at: true,
}) as any;

export const insertDocumentationPageSchema = createInsertSchema(documentationPages).omit({
  id: true,
  created_at: true,
}) as any;

export const insertPageChangeLogSchema = createInsertSchema(pageChangeLog).omit({
  id: true,
  detected_at: true,
}) as any;

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  created_at: true,
}) as any;

export const insertAnalyticsSummarySchema = createInsertSchema(analyticsSummary).omit({
  id: true,
  created_at: true,
}) as any;

// Type exports
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
export type InsertCustomOrder = z.infer<typeof insertCustomOrderSchema>;
export type CustomOrder = typeof customOrders.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertBrandingSettings = z.infer<typeof insertBrandingSettingsSchema>;
export type BrandingSettings = typeof brandingSettings.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertDocumentationPage = z.infer<typeof insertDocumentationPageSchema>;
export type DocumentationPage = typeof documentationPages.$inferSelect;
export type InsertPageChangeLog = z.infer<typeof insertPageChangeLogSchema>;
export type PageChangeLog = typeof pageChangeLog.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsSummary = z.infer<typeof insertAnalyticsSummarySchema>;
export type AnalyticsSummary = typeof analyticsSummary.$inferSelect;
