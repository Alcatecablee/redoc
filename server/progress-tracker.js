import { EventEmitter } from 'events';
class ProgressTracker extends EventEmitter {
    sessions = new Map();
    createSession(sessionId) {
        this.sessions.set(sessionId, []);
    }
    emitProgress(sessionId, event) {
        const progressEvent = {
            ...event,
            timestamp: new Date(),
        };
        const events = this.sessions.get(sessionId) || [];
        events.push(progressEvent);
        this.sessions.set(sessionId, events);
        this.emit(`progress:${sessionId}`, progressEvent);
        console.log(`[Progress ${sessionId}] Stage ${event.stage}: ${event.stageName} - ${event.description}`);
    }
    getProgress(sessionId) {
        return this.sessions.get(sessionId) || [];
    }
    endSession(sessionId, status = 'complete') {
        // Emit final status event
        this.emit(`progress:${sessionId}`, {
            stage: status === 'complete' ? 100 : -1,
            stageName: status === 'complete' ? 'Complete' : 'Error',
            description: status === 'complete' ? 'Process finished' : 'An error occurred',
            progress: status === 'complete' ? 100 : 0,
            timestamp: new Date(),
            status,
        });
        this.sessions.delete(sessionId);
        this.removeAllListeners(`progress:${sessionId}`);
    }
}
export const progressTracker = new ProgressTracker();
