import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';

export type DetailedActivityLog = {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: {
    urlsDiscovered?: number;
    pagesProcessed?: number;
    sourcesFound?: number;
    sectionsGenerated?: number;
    itemsProcessed?: number;
    itemsTotal?: number;
    duration?: number;
  };
};

export type ProgressEvent = {
  stage: number;
  stageName: string;
  description: string;
  progress: number;
  timestamp: Date;
  status?: 'progress' | 'complete' | 'error';
  activity?: DetailedActivityLog;
  previewContent?: string;
  metrics?: {
    itemsProcessed?: number;
    itemsTotal?: number;
    sources?: string[];
    warnings?: string[];
  };
};

class ProgressTracker extends EventEmitter {
  private sessions = new LRUCache<string, ProgressEvent[]>({
    max: 1000,
    ttl: 60 * 60 * 1000,
    updateAgeOnGet: false,
  });

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
    
    const activityMsg = event.activity?.message || event.description;
    console.log(`[Progress ${sessionId.substring(0, 8)}] Stage ${event.stage}: ${event.stageName} - ${activityMsg}`);
  }

  emitActivity(sessionId: string, activity: DetailedActivityLog, stage?: number, stageName?: string) {
    const events = this.sessions.get(sessionId) || [];
    const lastEvent = events[events.length - 1];
    
    const activityEvent: ProgressEvent = {
      stage: stage || lastEvent?.stage || 0,
      stageName: stageName || lastEvent?.stageName || 'Processing',
      description: activity.message,
      progress: lastEvent?.progress || 0,
      timestamp: new Date(),
      activity,
    };

    events.push(activityEvent);
    this.sessions.set(sessionId, events);
    this.emit(`progress:${sessionId}`, activityEvent);
    
    console.log(`[Activity ${sessionId.substring(0, 8)}] ${activity.type.toUpperCase()}: ${activity.message}`);
  }

  emitPreview(sessionId: string, previewContent: string, section?: string) {
    const events = this.sessions.get(sessionId) || [];
    const lastEvent = events[events.length - 1];
    
    const previewEvent: ProgressEvent = {
      stage: lastEvent?.stage || 0,
      stageName: lastEvent?.stageName || 'Processing',
      description: section ? `Generated: ${section}` : 'Content preview available',
      progress: lastEvent?.progress || 0,
      timestamp: new Date(),
      previewContent,
      activity: {
        message: section ? `Generated section: ${section}` : 'Preview updated',
        type: 'success',
      },
    };

    events.push(previewEvent);
    this.sessions.set(sessionId, events);
    this.emit(`progress:${sessionId}`, previewEvent);
  }

  getProgress(sessionId: string): ProgressEvent[] {
    return this.sessions.get(sessionId) || [];
  }

  endSession(sessionId: string, status: 'complete' | 'error' = 'complete', documentationId?: string) {
    this.emit(`progress:${sessionId}`, {
      stage: status === 'complete' ? 100 : -1,
      stageName: status === 'complete' ? 'Complete' : 'Error',
      description: status === 'complete' ? 'Process finished successfully' : 'An error occurred',
      progress: status === 'complete' ? 100 : 0,
      timestamp: new Date(),
      status,
      ...(documentationId && { documentationId }),
    });
    
    setTimeout(() => {
      this.sessions.delete(sessionId);
      this.removeAllListeners(`progress:${sessionId}`);
    }, 5000);
  }
}

export const progressTracker = new ProgressTracker();
