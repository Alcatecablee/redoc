import { v4 as uuidv4 } from 'uuid';

type JobPayload = any;

type JobRecord = {
  id: string;
  name: string;
  payload: JobPayload;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

// Simple in-process queue for development. If REDIS_URL is provided, a BullMQ implementation can be added later.
class InMemoryQueue {
  private processing = false;
  private queue: JobRecord[] = [];
  private records: Map<string, JobRecord> = new Map();
  private processor: (job: JobRecord) => Promise<void> | void;

  constructor(processor: (job: JobRecord) => Promise<void> | void) {
    this.processor = processor;
  }

  async enqueue(name: string, payload: JobPayload) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const job: JobRecord = {
      id,
      name,
      payload,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
    this.queue.push(job);
    this.records.set(id, job);
    // start processing if not already
    this.processNext().catch((e) => console.error('Queue process error', e));
    return job;
  }

  async processNext() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        job.status = 'running';
        job.updatedAt = new Date().toISOString();
        this.records.set(job.id, job);
        console.log(`📋 Processing job ${job.id} (${job.name})`);
        try {
          await this.processor(job);
          job.status = 'completed';
          job.updatedAt = new Date().toISOString();
          this.records.set(job.id, job);
          console.log(`✅ Job ${job.id} (${job.name}) completed successfully`);
        } catch (err: any) {
          job.status = 'failed';
          job.error = (err && err.message) || String(err);
          job.updatedAt = new Date().toISOString();
          this.records.set(job.id, job);
          console.error(`❌ Job ${job.id} (${job.name}) failed:`, {
            error: job.error,
            stack: err?.stack,
            payload: job.payload
          });
        }
      }
    } finally {
      this.processing = false;
    }
  }

  getJob(id: string) {
    return this.records.get(id) || null;
  }
}

let queueInstance: InMemoryQueue | null = null;

export function initInMemoryQueue(processor: (job: JobRecord) => Promise<void> | void) {
  if (!queueInstance) queueInstance = new InMemoryQueue(processor);
  return queueInstance;
}

export function getQueue() {
  if (!queueInstance) throw new Error('Queue not initialized');
  return queueInstance;
}
