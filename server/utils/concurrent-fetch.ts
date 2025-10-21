/**
 * Concurrent Fetch Pool
 * 
 * Processes multiple async tasks concurrently with configurable concurrency limit.
 * Uses p-limit for proper concurrency control and AbortController for timeouts.
 */

import pLimit from 'p-limit';

export interface ConcurrentFetchOptions {
  concurrency?: number;
  timeoutMs?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Process an array of items concurrently with a concurrency limit
 * 
 * @param items - Array of items to process
 * @param processor - Async function that processes each item
 * @param options - Configuration options
 * @returns Array of results (settled promises)
 */
export async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T, index: number, signal: AbortSignal) => Promise<R>,
  options: ConcurrentFetchOptions = {}
): Promise<PromiseSettledResult<R>[]> {
  const {
    concurrency = 10,
    timeoutMs = 5000,
    onProgress
  } = options;

  const limit = pLimit(concurrency);
  let completed = 0;

  const promises = items.map((item, index) =>
    limit(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const result = await processor(item, index, controller.signal);
        return result;
      } catch (error: any) {
        if (controller.signal.aborted) {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
      }
    })
  );

  return Promise.allSettled(promises);
}

/**
 * Fetch multiple URLs concurrently with rate limiting
 * 
 * @param urls - Array of URLs to fetch
 * @param options - Fetch options and concurrency settings
 * @returns Array of fetch responses (settled)
 */
export async function fetchConcurrently(
  urls: string[],
  options: ConcurrentFetchOptions & RequestInit = {}
): Promise<PromiseSettledResult<Response>[]> {
  const { concurrency, timeoutMs, onProgress, ...fetchOptions } = options;

  return processConcurrently(
    urls,
    async (url, _index, signal) => {
      const response = await fetch(url, {
        signal, // Pass AbortSignal to fetch for proper cancellation
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...fetchOptions.headers
        },
        ...fetchOptions
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    },
    { concurrency, timeoutMs, onProgress }
  );
}
