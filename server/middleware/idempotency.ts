/**
 * Request Idempotency Middleware
 * 
 * Prevents duplicate processing of the same request when clients retry.
 * Uses idempotency keys to track and deduplicate requests.
 * 
 * Features:
 * - Automatic deduplication based on Idempotency-Key header
 * - Cached responses for duplicate requests
 * - TTL-based expiration (24 hours default)
 * - Supports both in-memory and database storage
 * 
 * Usage:
 * ```typescript
 * router.post('/api/generate-docs', 
 *   idempotencyMiddleware({ ttlSeconds: 86400 }), 
 *   handler
 * );
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { idempotencyKeys } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';

interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  statusCode?: number;
  response?: any;
  error?: string;
  createdAt: number;
  expiresAt: number;
}

interface IdempotencyStorage {
  get(key: string): Promise<IdempotencyRecord | undefined>;
  set(key: string, record: IdempotencyRecord): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): Promise<any>;
  cleanup(): Promise<void>;
}

class DatabaseIdempotencyStore implements IdempotencyStorage {
  async get(key: string): Promise<IdempotencyRecord | undefined> {
    if (!db) return undefined;
    
    try {
      const records = await db.select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, key))
        .limit(1);
      
      if (!records.length) return undefined;
      
      const record = records[0];
      
      if (record.expires_at && new Date(record.expires_at) < new Date()) {
        await this.delete(key);
        return undefined;
      }
      
      return {
        key: record.key,
        status: record.status as any,
        statusCode: record.status_code || undefined,
        response: record.response ? JSON.parse(record.response) : undefined,
        error: record.error || undefined,
        createdAt: new Date(record.created_at).getTime(),
        expiresAt: new Date(record.expires_at!).getTime(),
      };
    } catch (error) {
      console.error('Failed to get idempotency key from database:', error);
      return undefined;
    }
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    if (!db) return;
    
    try {
      await db.insert(idempotencyKeys).values({
        key: record.key,
        status: record.status,
        status_code: record.statusCode,
        response: record.response ? JSON.stringify(record.response) : null,
        error: record.error || null,
        created_at: new Date(record.createdAt),
        expires_at: new Date(record.expiresAt),
      }).onConflictDoUpdate({
        target: idempotencyKeys.key,
        set: {
          status: record.status,
          status_code: record.statusCode,
          response: record.response ? JSON.stringify(record.response) : null,
          error: record.error || null,
        },
      });
    } catch (error) {
      console.error('Failed to set idempotency key in database:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!db) return;
    
    try {
      await db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
    } catch (error) {
      console.error('Failed to delete idempotency key from database:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    const record = await this.get(key);
    return record !== undefined;
  }

  async cleanup(): Promise<void> {
    if (!db) return;
    
    try {
      const result = await db.delete(idempotencyKeys)
        .where(lt(idempotencyKeys.expires_at, new Date()));
      
      console.log(`🧹 Cleaned up expired idempotency keys from database`);
    } catch (error) {
      console.error('Failed to cleanup idempotency keys:', error);
    }
  }

  async getStats(): Promise<any> {
    if (!db) {
      return { mode: 'database', error: 'Database not available' };
    }
    
    try {
      const all = await db.select().from(idempotencyKeys);
      
      return {
        mode: 'database',
        total: all.length,
        processing: all.filter(r => r.status === 'processing').length,
        completed: all.filter(r => r.status === 'completed').length,
        failed: all.filter(r => r.status === 'failed').length,
      };
    } catch (error) {
      return { mode: 'database', error: 'Failed to get stats' };
    }
  }
}

class InMemoryIdempotencyStore implements IdempotencyStorage {
  private store = new Map<string, IdempotencyRecord>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get(key: string): Promise<IdempotencyRecord | undefined> {
    const record = this.store.get(key);
    
    if (record && record.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    
    return record;
  }

  async set(key: string, record: IdempotencyRecord): Promise<void> {
    this.store.set(key, record);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const record = await this.get(key);
    return record !== undefined;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt < now) {
        this.store.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired idempotency keys (in-memory)`);
    }
  }

  async getStats(): Promise<any> {
    return {
      mode: 'in-memory',
      total: this.store.size,
      processing: Array.from(this.store.values()).filter(r => r.status === 'processing').length,
      completed: Array.from(this.store.values()).filter(r => r.status === 'completed').length,
      failed: Array.from(this.store.values()).filter(r => r.status === 'failed').length,
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const globalStore: IdempotencyStorage = db 
  ? new DatabaseIdempotencyStore() 
  : new InMemoryIdempotencyStore();

console.log(`💾 Idempotency storage initialized: ${db ? 'Database (persistent)' : 'In-Memory (development only)'}`);

setInterval(() => globalStore.cleanup(), 10 * 60 * 1000);

export interface IdempotencyOptions {
  ttlSeconds?: number;
  headerName?: string;
  required?: boolean;
  generateKey?: (req: Request) => string;
}

/**
 * Idempotency middleware factory
 * 
 * @param options - Configuration options
 * @returns Express middleware
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const {
    ttlSeconds = 86400,
    headerName = 'Idempotency-Key',
    required = false,
    generateKey,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    let idempotencyKey = req.headers[headerName.toLowerCase()] as string;

    if (!idempotencyKey && generateKey) {
      idempotencyKey = generateKey(req);
    }

    if (!idempotencyKey) {
      if (required) {
        return res.status(400).json({
          error: `Missing ${headerName} header. This endpoint requires an idempotency key.`,
        });
      }
      return next();
    }

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        error: `Invalid ${headerName}. Must be a valid UUID or alphanumeric string (16-64 characters).`,
      });
    }

    const existingRecord = globalStore.get(idempotencyKey);

    if (existingRecord) {
      if (existingRecord.status === 'processing') {
        console.log(`⏳ Idempotent request already processing: ${idempotencyKey}`);
        return res.status(409).json({
          error: 'Request is already being processed',
          retryAfter: 5,
        });
      }

      if (existingRecord.status === 'completed') {
        console.log(`✅ Returning cached response for idempotency key: ${idempotencyKey}`);
        return res
          .status(existingRecord.statusCode || 200)
          .json(existingRecord.response);
      }

      if (existingRecord.status === 'failed') {
        console.log(`❌ Returning cached error for idempotency key: ${idempotencyKey}`);
        return res
          .status(existingRecord.statusCode || 500)
          .json({ error: existingRecord.error });
      }
    }

    const record: IdempotencyRecord = {
      key: idempotencyKey,
      status: 'processing',
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    globalStore.set(idempotencyKey, record);

    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let statusCode = 200;

    res.status = function (code: number) {
      statusCode = code;
      return originalStatus(code);
    };

    res.json = function (body: any) {
      const updatedRecord = globalStore.get(idempotencyKey);
      
      if (updatedRecord) {
        if (statusCode >= 200 && statusCode < 300) {
          updatedRecord.status = 'completed';
          updatedRecord.statusCode = statusCode;
          updatedRecord.response = body;
        } else {
          updatedRecord.status = 'failed';
          updatedRecord.statusCode = statusCode;
          updatedRecord.error = body?.error || 'Request failed';
        }
        
        globalStore.set(idempotencyKey, updatedRecord);
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Generate an idempotency key from request parameters
 * Useful for automatic deduplication based on request content
 */
export function generateIdempotencyKey(req: Request): string {
  const content = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
    userId: (req as any).user?.id,
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Validate idempotency key format
 */
function isValidIdempotencyKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const alphanumericRegex = /^[a-zA-Z0-9_-]{16,64}$/;
  
  return uuidRegex.test(key) || alphanumericRegex.test(key);
}

/**
 * Get idempotency store statistics
 */
export function getIdempotencyStats() {
  return globalStore.getStats();
}

/**
 * Clear a specific idempotency key (admin/testing only)
 */
export function clearIdempotencyKey(key: string): boolean {
  if (globalStore.has(key)) {
    globalStore.delete(key);
    return true;
  }
  return false;
}

/**
 * Clear all idempotency keys (admin/testing only)
 */
export function clearAllIdempotencyKeys(): number {
  const stats = globalStore.getStats();
  const total = stats.total;
  globalStore.destroy();
  return total;
}
