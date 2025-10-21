/**
 * Shared queue type definitions
 * Used by both in-memory and BullMQ queue implementations
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

export type QueueProcessor = (job: JobRecord) => Promise<void> | void;
