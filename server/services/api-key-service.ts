import { db } from '../db';
import { apiKeys, activityLogs } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class ApiKeyService {
  generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  async createApiKey(userId: number, name: string, description?: string, scopes: string[] = ['read', 'write']) {
    const key = this.generateApiKey();
    
    const [newKey] = await db.insert(apiKeys).values({
      user_id: userId,
      key,
      name,
      description: description || null,
      scopes: JSON.stringify(scopes),
      rate_limit_per_minute: 60,
      rate_limit_per_day: 10000,
      usage_count: 0,
      is_active: true,
      created_at: new Date(),
      expires_at: null,
      last_used_at: null,
    }).returning();

    await db.insert(activityLogs).values({
      user_id: userId,
      action: 'created',
      resource_type: 'api_key',
      resource_id: String(newKey.id),
      metadata: JSON.stringify({ name, scopes }),
      created_at: new Date(),
      organization_id: null,
      ip_address: null,
      user_agent: null,
    });

    return newKey;
  }

  async listApiKeys(userId: number) {
    return await db.query.apiKeys.findMany({
      where: eq(apiKeys.user_id, userId),
      orderBy: (keys, { desc }) => [desc(keys.created_at)],
    });
  }

  async getApiKey(keyId: number, userId: number) {
    return await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.user_id, userId)
      ),
    });
  }

  async verifyApiKey(key: string) {
    const apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.key, key),
        eq(apiKeys.is_active, true)
      ),
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;
    }

    await db.update(apiKeys)
      .set({ 
        usage_count: apiKey.usage_count + 1,
        last_used_at: new Date()
      })
      .where(eq(apiKeys.id, apiKey.id));

    return apiKey;
  }

  async revokeApiKey(keyId: number, userId: number) {
    await db.update(apiKeys)
      .set({ is_active: false })
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.user_id, userId)
      ));

    await db.insert(activityLogs).values({
      user_id: userId,
      action: 'revoked',
      resource_type: 'api_key',
      resource_id: String(keyId),
      metadata: null,
      created_at: new Date(),
      organization_id: null,
      ip_address: null,
      user_agent: null,
    });
  }

  async deleteApiKey(keyId: number, userId: number) {
    await db.delete(apiKeys)
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.user_id, userId)
      ));

    await db.insert(activityLogs).values({
      user_id: userId,
      action: 'deleted',
      resource_type: 'api_key',
      resource_id: String(keyId),
      metadata: null,
      created_at: new Date(),
      organization_id: null,
      ip_address: null,
      user_agent: null,
    });
  }

  async checkRateLimit(apiKey: any): Promise<boolean> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const minuteUsage = await db.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.resource_type, 'api_request'),
        eq(activityLogs.resource_id, String(apiKey.id)),
        // created_at > oneMinuteAgo
      ),
    });

    if (minuteUsage.length >= apiKey.rate_limit_per_minute) {
      return false;
    }

    return true;
  }
}

export const apiKeyService = new ApiKeyService();
