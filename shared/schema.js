import { pgTable, serial, text, timestamp, jsonb, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const insertDocumentationSchema = createInsertSchema(documentations).omit({
    id: true,
    generatedAt: true,
});
export const insertThemeSchema = createInsertSchema(themes).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
    id: true,
    created_at: true,
});
export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
    id: true,
    created_at: true,
});
// Insert schemas for new tables
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
    id: true,
    created_at: true,
});
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
    id: true,
    joined_at: true,
});
export const insertWebhookSchema = createInsertSchema(webhooks).omit({
    id: true,
    created_at: true,
});
export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({
    id: true,
    created_at: true,
});
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({
    id: true,
    created_at: true,
});
export const insertBrandingSettingsSchema = createInsertSchema(brandingSettings).omit({
    id: true,
    created_at: true,
    updated_at: true,
});
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
    id: true,
    created_at: true,
});
