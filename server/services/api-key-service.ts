import { db } from '../db';
import { apiKeys, activityLogs } from '../../shared/schema';
import { eq, and, gte } from 'drizzle-orm';
import crypto from 'crypto';
import { withTransaction } from '../utils/transaction';

export class ApiKeyService {
  private ensureDb() {
    if (!db) {
      throw new Error('Database not configured');
    }
    return db;
  }

  generateApiKey(): { key: string; hash: string; prefix: string } {
    const randomPart = crypto.randomBytes(24).toString('hex');
    const fullKey = `dk_live_${randomPart}`;
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
    const prefix = `dk_...${randomPart.slice(-8)}`;
    
    return { key: fullKey, hash, prefix };
  }
  
  hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async createApiKey(userId: number, name: string, description?: string, scopes: string[] = ['read', 'write']) {
    this.ensureDb();
    const { key, hash, prefix } = this.generateApiKey();
    
    const result = await withTransaction(async (tx) => {
      const [newKey] = await tx.insert(apiKeys).values({
        user_id: userId,
        key_hash: hash,
        key_prefix: prefix,
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

      await tx.insert(activityLogs).values({
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

      return { ...newKey, key };
    });

    return result;
  }

  async listApiKeys(userId: number) {
    const database = this.ensureDb();
    return await database.query.apiKeys.findMany({
      where: eq(apiKeys.user_id, userId),
      orderBy: (keys, { desc }) => [desc(keys.created_at)],
    });
  }

  async getApiKey(keyId: number, userId: number) {
    const database = this.ensureDb();
    return await database.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.user_id, userId)
      ),
    });
  }

  async verifyApiKey(key: string) {
    const database = this.ensureDb();
    const keyHash = this.hashApiKey(key);
    const apiKey = await database.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.key_hash, keyHash),
        eq(apiKeys.is_active, true)
      ),
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;
    }

    await database.update(apiKeys)
      .set({ 
        usage_count: apiKey.usage_count + 1,
        last_used_at: new Date()
      })
      .where(eq(apiKeys.id, apiKey.id));

    return apiKey;
  }

  async revokeApiKey(keyId: number, userId: number) {
    this.ensureDb();
    
    await withTransaction(async (tx) => {
      await tx.update(apiKeys)
        .set({ is_active: false })
        .where(and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.user_id, userId)
        ));

      await tx.insert(activityLogs).values({
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
    });
  }

  async deleteApiKey(keyId: number, userId: number) {
    this.ensureDb();
    
    await withTransaction(async (tx) => {
      await tx.delete(apiKeys)
        .where(and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.user_id, userId)
        ));

      await tx.insert(activityLogs).values({
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
    });
  }

  async logApiRequest(apiKey: any, metadata?: any) {
    const database = this.ensureDb();
    await database.insert(activityLogs).values({
      user_id: apiKey.user_id,
      action: 'api_request',
      resource_type: 'api_request',
      resource_id: String(apiKey.id),
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date(),
      organization_id: null,
      ip_address: null,
      user_agent: null,
    });
  }

  async checkRateLimit(apiKey: any): Promise<boolean> {
    const database = this.ensureDb();
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const minuteUsage = await database.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.resource_type, 'api_request'),
        eq(activityLogs.resource_id, String(apiKey.id)),
        gte(activityLogs.created_at, oneMinuteAgo)
      ),
    });

    if (minuteUsage.length >= apiKey.rate_limit_per_minute) {
      return false;
    }

    const dayUsage = await database.query.activityLogs.findMany({
      where: and(
        eq(activityLogs.resource_type, 'api_request'),
        eq(activityLogs.resource_id, String(apiKey.id)),
        gte(activityLogs.created_at, oneDayAgo)
      ),
    });

    if (dayUsage.length >= apiKey.rate_limit_per_day) {
      return false;
    }

    return true;
  }
}

export const apiKeyService = new ApiKeyService();
