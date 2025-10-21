import { db } from '../db';
import { webhooks, webhookDeliveries } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
export class WebhookService {
    ensureDb() {
        if (!db) {
            throw new Error('Database not configured');
        }
        return db;
    }
    generateSecret() {
        return crypto.randomBytes(32).toString('hex');
    }
    async createWebhook(userId, url, events, organizationId) {
        const database = this.ensureDb();
        const secret = this.generateSecret();
        const [webhook] = await database.insert(webhooks).values({
            user_id: userId,
            organization_id: organizationId || null,
            url,
            events: JSON.stringify(events),
            secret,
            is_active: true,
            failure_count: 0,
            created_at: new Date(),
            last_triggered_at: null,
        }).returning();
        return webhook;
    }
    async listWebhooks(userId, organizationId) {
        const database = this.ensureDb();
        if (organizationId) {
            return await database.query.webhooks.findMany({
                where: eq(webhooks.organization_id, organizationId),
            });
        }
        return await database.query.webhooks.findMany({
            where: eq(webhooks.user_id, userId),
        });
    }
    async deleteWebhook(webhookId, userId) {
        const database = this.ensureDb();
        await database.delete(webhooks)
            .where(and(eq(webhooks.id, webhookId), eq(webhooks.user_id, userId)));
    }
    async triggerWebhook(event) {
        const database = this.ensureDb();
        const userWebhooks = await database.query.webhooks.findMany({
            where: and(eq(webhooks.user_id, event.userId), eq(webhooks.is_active, true)),
        });
        for (const webhook of userWebhooks) {
            const webhookEvents = typeof webhook.events === 'string'
                ? JSON.parse(webhook.events)
                : webhook.events;
            if (!webhookEvents.includes(event.type)) {
                continue;
            }
            await this.deliverWebhook(webhook, event);
        }
    }
    async deliverWebhook(webhook, event) {
        const database = this.ensureDb();
        const payload = {
            event: event.type,
            data: event.data,
            timestamp: new Date().toISOString(),
        };
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'User-Agent': 'DocSnap-Webhooks/1.0',
                },
                body: JSON.stringify(payload),
            });
            await database.insert(webhookDeliveries).values({
                webhook_id: webhook.id,
                event_type: event.type,
                payload: JSON.stringify(payload),
                response_status: response.status,
                response_body: await response.text(),
                delivered_at: new Date(),
                created_at: new Date(),
            });
            if (!response.ok) {
                await database.update(webhooks)
                    .set({ failure_count: webhook.failure_count + 1 })
                    .where(eq(webhooks.id, webhook.id));
                if (webhook.failure_count + 1 >= 10) {
                    await database.update(webhooks)
                        .set({ is_active: false })
                        .where(eq(webhooks.id, webhook.id));
                }
            }
            else {
                await database.update(webhooks)
                    .set({
                    last_triggered_at: new Date(),
                    failure_count: 0
                })
                    .where(eq(webhooks.id, webhook.id));
            }
        }
        catch (error) {
            console.error('Webhook delivery error:', error);
            await database.insert(webhookDeliveries).values({
                webhook_id: webhook.id,
                event_type: event.type,
                payload: JSON.stringify(payload),
                response_status: null,
                response_body: error.message,
                delivered_at: null,
                created_at: new Date(),
            });
            await database.update(webhooks)
                .set({ failure_count: webhook.failure_count + 1 })
                .where(eq(webhooks.id, webhook.id));
        }
    }
    generateSignature(payload, secret) {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
    verifySignature(payload, signature, secret) {
        const expectedSignature = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
}
export const webhookService = new WebhookService();
