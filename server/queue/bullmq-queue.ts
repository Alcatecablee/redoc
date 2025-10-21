import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise-grade job queue using BullMQ + Redis
 * Features:
 * - Persistent jobs (survive server restarts)
 * - Concurrent workers (5+ jobs simultaneously)
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed jobs
 * - Job progress tracking
 */

export interface JobPayload {
  url: string;
  userId: string | null;
  sessionId?: string;
  userPlan?: string;
  subdomain?: string;
}

export interface JobRecord {
  id: string;
  name: string;
  payload: JobPayload;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
  attempts?: number;
}

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisConnection(): Redis {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect on READONLY errors
        return true;
      }
      return false;
    },
  });

  redis.on('error', (err: Error) => {
    console.error('❌ Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  return redis;
}

export class BullMQQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents;
  private processor: (job: JobRecord) => Promise<void> | void;
  private concurrency: number;

  constructor(
    processor: (job: JobRecord) => Promise<void> | void,
    options: { concurrency?: number; queueName?: string } = {}
  ) {
    const { concurrency = 5, queueName = 'documentation-generation' } = options;

    this.processor = processor;
    this.concurrency = concurrency;

    // Create queue connection
    this.queue = new Queue(queueName, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60, // Keep completed jobs for 7 days
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 14 * 24 * 60 * 60, // Keep failed jobs for 14 days (for manual inspection)
          count: 500, // Keep max 500 failed jobs
        },
      },
    });

    // Create queue events listener
    this.queueEvents = new QueueEvents(queueName, {
      connection: createRedisConnection(),
    });

    // Listen for job events
    this.setupEventListeners();

    console.log(`🚀 BullMQ Queue initialized: ${queueName} (${concurrency} workers)`);
  }

  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed successfully`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`📊 Job ${jobId} progress: ${JSON.stringify(data)}`);
    });
  }

  /**
   * Start the worker to process jobs
   */
  async startWorker() {
    if (this.worker) {
      console.warn('⚠️  Worker already started');
      return;
    }

    this.worker = new Worker(
      this.queue.name,  // Use the same queue name as the Queue instance
      async (job: Job) => {
        console.log(`🔄 Processing job ${job.id}...`);

        const jobRecord: JobRecord = {
          id: job.id!,
          name: job.name,
          payload: job.data,
          status: 'running',
          createdAt: new Date(job.timestamp).toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: job.attemptsMade,
        };

        try {
          // Update progress to 0%
          await job.updateProgress(0);

          // Execute the processor
          await this.processor(jobRecord);

          // Update progress to 100%
          await job.updateProgress(100);

          // Return the result
          return jobRecord.result;
        } catch (error) {
          console.error(`❌ Job ${job.id} processor error:`, error);
          jobRecord.status = 'failed';
          jobRecord.error = error instanceof Error ? error.message : String(error);
          throw error; // Re-throw to trigger BullMQ retry logic
        }
      },
      {
        connection: createRedisConnection(),
        concurrency: this.concurrency,
        limiter: {
          max: 100, // Max 100 jobs
          duration: 60000, // Per minute
        },
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`✅ Worker completed job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Worker failed job ${job?.id}:`, err.message);
    });

    console.log(`👷 Worker started with ${this.concurrency} concurrent processors`);
  }

  /**
   * Add a job to the queue
   */
  async enqueue(name: string, payload: JobPayload): Promise<JobRecord> {
    const job = await this.queue.add(name, payload, {
      jobId: uuidv4(), // Generate unique ID
    });

    const jobRecord: JobRecord = {
      id: job.id!,
      name,
      payload,
      status: 'queued',
      createdAt: new Date(job.timestamp).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`📝 Job ${job.id} enqueued: ${name}`);
    return jobRecord;
  }

  /**
   * Get job status by ID
   */
  async getJob(id: string): Promise<JobRecord | null> {
    const job = await this.queue.getJob(id);
    if (!job) return null;

    const state = await job.getState();
    const status = this.mapBullMQState(state);

    return {
      id: job.id!,
      name: job.name,
      payload: job.data,
      status,
      result: job.returnvalue,
      error: job.failedReason,
      progress: job.progress as number | undefined,
      createdAt: new Date(job.timestamp).toISOString(),
      updatedAt: job.processedOn ? new Date(job.processedOn).toISOString() : new Date().toISOString(),
      attempts: job.attemptsMade,
    };
  }

  /**
   * Map BullMQ job state to our status
   */
  private mapBullMQState(state: string): JobRecord['status'] {
    switch (state) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'active':
        return 'running';
      case 'waiting':
      case 'delayed':
      case 'paused':
        return 'queued';
      default:
        return 'queued';
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const waiting = await this.queue.getWaitingCount();
    const active = await this.queue.getActiveCount();
    const completed = await this.queue.getCompletedCount();
    const failed = await this.queue.getFailedCount();
    const delayed = await this.queue.getDelayedCount();

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Clean old jobs (completed/failed beyond retention period)
   */
  async cleanup() {
    const grace = 1000; // 1 second grace period
    await this.queue.clean(7 * 24 * 60 * 60 * 1000, grace, 'completed'); // 7 days
    await this.queue.clean(14 * 24 * 60 * 60 * 1000, grace, 'failed'); // 14 days
    console.log('🧹 Queue cleanup completed');
  }

  /**
   * Close all connections gracefully
   */
  async close() {
    console.log('🛑 Closing BullMQ queue...');
    
    if (this.worker) {
      await this.worker.close();
    }
    
    await this.queueEvents.close();
    await this.queue.close();
    
    console.log('✅ BullMQ queue closed successfully');
  }
}

// Singleton instance
let queueInstance: BullMQQueue | null = null;

export function initBullMQQueue(
  processor: (job: JobRecord) => Promise<void> | void,
  options?: { concurrency?: number }
): BullMQQueue {
  if (!queueInstance) {
    queueInstance = new BullMQQueue(processor, options);
  }
  return queueInstance;
}

export function getBullMQQueue(): BullMQQueue {
  if (!queueInstance) {
    throw new Error('BullMQ Queue not initialized. Call initBullMQQueue() first.');
  }
  return queueInstance;
}
