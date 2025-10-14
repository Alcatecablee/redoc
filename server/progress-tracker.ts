import { EventEmitter } from 'events';

export type ProgressEvent = {
  stage: number;
  stageName: string;
  description: string;
  progress: number;
  timestamp: Date;
};

class ProgressTracker extends EventEmitter {
  private sessions: Map<string, ProgressEvent[]> = new Map();

  createSession(sessionId: string) {
    this.sessions.set(sessionId, []);
  }

  emitProgress(sessionId: string, event: Omit<ProgressEvent, 'timestamp'>) {
    const progressEvent: ProgressEvent = {
      ...event,
      timestamp: new Date(),
    };

    const events = this.sessions.get(sessionId) || [];
    events.push(progressEvent);
    this.sessions.set(sessionId, events);

    this.emit(`progress:${sessionId}`, progressEvent);
    console.log(`[Progress ${sessionId}] Stage ${event.stage}: ${event.stageName} - ${event.description}`);
  }

  getProgress(sessionId: string): ProgressEvent[] {
    return this.sessions.get(sessionId) || [];
  }

  endSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const progressTracker = new ProgressTracker();
