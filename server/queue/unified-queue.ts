/**
 * Unified Queue Abstraction
 * 
 * Provides a consistent interface for both in-memory and BullMQ queues.
 * Switch between implementations using the USE_BULLMQ environment variable.
 * 
 * Development: USE_BULLMQ=false (in-memory, no Redis required)
 * Production: USE_BULLMQ=true (BullMQ + Redis for persistence)
 */

import { initInMemoryQueue } from '../queue';
import type { JobPayload, JobRecord, QueueProcessor } from './types';

interface UnifiedQueueInterface {
  enqueue(name: string, payload: JobPayload): Promise<JobRecord>;
  getJob(id: string): Promise<JobRecord | null>;
  getStats?(): Promise<any>;
  cleanup?(): Promise<void>;
  close?(): Promise<void>;
}

class UnifiedQueue implements UnifiedQueueInterface {
  private queue: any;
  private useBullMQ: boolean;
  private initPromise: Promise<void>;

  constructor(processor: QueueProcessor, options?: { concurrency?: number }) {
    this.useBullMQ = process.env.USE_BULLMQ === 'true';
    
    // Initialize queue asynchronously
    this.initPromise = this.initializeQueue(processor, options);
  }

  private async initializeQueue(processor: QueueProcessor, options?: { concurrency?: number }) {
    if (this.useBullMQ) {
      console.log('🚀 Initializing BullMQ Queue (production mode)...');
      
      if (!process.env.REDIS_URL) {
        console.warn('⚠️  REDIS_URL not set! Falling back to in-memory queue.');
        console.warn('   Set REDIS_URL to enable persistent queue: redis://localhost:6379');
        this.useBullMQ = false;
      }
    }

    if (this.useBullMQ) {
      try {
        // Dynamic import - only loads BullMQ when needed
        const { initBullMQQueue } = await import('./bullmq-queue');
        this.queue = initBullMQQueue(processor, options);
        
        // Start the worker
        await this.queue.startWorker().catch((err: Error) => {
          console.error('❌ Failed to start BullMQ worker:', err);
          console.log('   Falling back to in-memory queue...');
          throw err;
        });
      } catch (err) {
        console.error('❌ Failed to initialize BullMQ:', err);
        console.log('   Falling back to in-memory queue...');
        this.useBullMQ = false;
        this.queue = initInMemoryQueue(processor);
      }
    } else {
      console.log('📦 Initializing In-Memory Queue (development mode)...');
      this.queue = initInMemoryQueue(processor);
    }
  }

  async enqueue(name: string, payload: JobPayload): Promise<JobRecord> {
    await this.initPromise;
    return await this.queue.enqueue(name, payload);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    await this.initPromise;
    return this.queue.getJob(id);
  }

  async getStats() {
    await this.initPromise;
    if (this.useBullMQ && this.queue.getStats) {
      return await this.queue.getStats();
    }
    return { mode: 'in-memory', message: 'Stats not available in memory mode' };
  }

  async cleanup() {
    await this.initPromise;
    if (this.useBullMQ && this.queue.cleanup) {
      await this.queue.cleanup();
    }
  }

  async close() {
    await this.initPromise;
    if (this.useBullMQ && this.queue.close) {
      await this.queue.close();
    }
  }

  getMode(): 'bullmq' | 'in-memory' {
    return this.useBullMQ ? 'bullmq' : 'in-memory';
  }
}

let unifiedQueueInstance: UnifiedQueue | null = null;

export function initUnifiedQueue(
  processor: QueueProcessor,
  options?: { concurrency?: number }
): UnifiedQueue {
  if (!unifiedQueueInstance) {
    unifiedQueueInstance = new UnifiedQueue(processor, options);
  }
  return unifiedQueueInstance;
}

export function getUnifiedQueue(): UnifiedQueue {
  if (!unifiedQueueInstance) {
    throw new Error('Unified Queue not initialized. Call initUnifiedQueue() first.');
  }
  return unifiedQueueInstance;
}

export type { JobPayload, JobRecord, QueueProcessor } from './types';
