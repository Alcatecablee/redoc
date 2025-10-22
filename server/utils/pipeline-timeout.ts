/**
 * Pipeline Timeout Management
 * 
 * Prevents zombie jobs by enforcing overall and per-stage timeouts.
 * Provides graceful cancellation and cleanup on timeout.
 */

export class TimeoutError extends Error {
  constructor(message: string, public stage?: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

interface PipelineTimeoutConfig {
  totalTimeoutMs: number;       // Overall pipeline timeout
  stageTimeoutMs?: number;      // Default per-stage timeout
  onTimeout?: (stage?: string) => void | Promise<void>;  // Cleanup callback
}

const DEFAULT_CONFIG: PipelineTimeoutConfig = {
  totalTimeoutMs: 10 * 60 * 1000,  // 10 minutes total
  stageTimeoutMs: 3 * 60 * 1000,   // 3 minutes per stage
};

/**
 * Execute pipeline with overall timeout
 */
export async function withPipelineTimeout<T>(
  pipelineFn: (abortSignal: AbortSignal) => Promise<T>,
  config: Partial<PipelineTimeoutConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const controller = new AbortController();
  
  const timeoutId = setTimeout(async () => {
    controller.abort();
    
    // Call cleanup callback
    if (cfg.onTimeout) {
      try {
        await cfg.onTimeout();
      } catch (err) {
        console.error('Timeout cleanup error:', err);
      }
    }
  }, cfg.totalTimeoutMs);

  try {
    const result = await pipelineFn(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (controller.signal.aborted || error.name === 'AbortError') {
      throw new TimeoutError(
        `Pipeline exceeded maximum time limit of ${cfg.totalTimeoutMs / 1000}s`
      );
    }
    
    throw error;
  }
}

/**
 * Execute a single stage with timeout
 */
export async function withStageTimeout<T>(
  stageName: string,
  stageFn: (abortSignal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<T> {
  // Create a combined abort controller that listens to parent signal
  const controller = new AbortController();
  
  // Abort if parent is aborted
  const parentAbortHandler = () => controller.abort();
  parentSignal?.addEventListener('abort', parentAbortHandler);
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const result = await stageFn(controller.signal);
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener('abort', parentAbortHandler);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener('abort', parentAbortHandler);
    
    if (controller.signal.aborted || error.name === 'AbortError') {
      throw new TimeoutError(
        `Stage "${stageName}" exceeded timeout of ${timeoutMs / 1000}s`,
        stageName
      );
    }
    
    throw error;
  }
}

/**
 * Check if abort signal is triggered
 */
export function checkAbortSignal(signal?: AbortSignal, stageName?: string): void {
  if (signal?.aborted) {
    throw new TimeoutError(
      `Operation aborted${stageName ? ` in stage "${stageName}"` : ''}`,
      stageName
    );
  }
}
