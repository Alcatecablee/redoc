import { v4 as uuidv4 } from 'uuid';
// Simple in-process queue for development. If REDIS_URL is provided, a BullMQ implementation can be added later.
class InMemoryQueue {
    processing = false;
    queue = [];
    records = new Map();
    processor;
    constructor(processor) {
        this.processor = processor;
    }
    async enqueue(name, payload) {
        const id = uuidv4();
        const now = new Date().toISOString();
        const job = {
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
        if (this.processing)
            return;
        this.processing = true;
        try {
            while (this.queue.length > 0) {
                const job = this.queue.shift();
                job.status = 'running';
                job.updatedAt = new Date().toISOString();
                this.records.set(job.id, job);
                try {
                    await this.processor(job);
                    job.status = 'completed';
                    job.updatedAt = new Date().toISOString();
                    this.records.set(job.id, job);
                }
                catch (err) {
                    job.status = 'failed';
                    job.error = (err && err.message) || String(err);
                    job.updatedAt = new Date().toISOString();
                    this.records.set(job.id, job);
                }
            }
        }
        finally {
            this.processing = false;
        }
    }
    getJob(id) {
        return this.records.get(id) || null;
    }
}
let queueInstance = null;
export function initInMemoryQueue(processor) {
    if (!queueInstance)
        queueInstance = new InMemoryQueue(processor);
    return queueInstance;
}
export function getQueue() {
    if (!queueInstance)
        throw new Error('Queue not initialized');
    return queueInstance;
}
