/**
 * Retry utility with exponential backoff and multi-provider fallback
 * Implements robust error recovery for API calls
 */

import { LRUCache } from 'lru-cache';

interface RetryOptions {
  maxRetries?: number;
  timeout?: number;
  exponentialBackoff?: boolean;
  cacheResults?: boolean;
  cacheKey?: string; // Unique key for caching results
}

interface CachedResult<T> {
  data: T;
  timestamp: number;
  provider: string;
}

// LRU cache with bounded size and TTL
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const resultCache = new LRUCache<string, CachedResult<any>>({
  max: 1000, // Maximum 1000 cached results
  ttl: CACHE_TTL,
  updateAgeOnGet: true, // Refresh TTL on access
});

/**
 * Execute a list of provider functions with automatic fallback and retry logic
 * @param providers Array of async functions to try in order
 * @param options Retry and timeout configuration
 * @returns Result from the first successful provider
 */
export async function retryWithFallback<T>(
  providers: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<{ data: T; provider: string; fromCache: boolean }> {
  const {
    maxRetries = 3,
    timeout = 10000,
    exponentialBackoff = true,
    cacheResults = true,
    cacheKey, // Required when caching is enabled
  } = options;

  // Validate cache key if caching is enabled
  if (cacheResults && !cacheKey) {
    console.warn('⚠️ Caching enabled but no cacheKey provided - caching disabled for this call');
  }

  const errors: Error[] = [];
  const shouldCache = cacheResults && !!cacheKey;
  
  for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
    const provider = providers[providerIndex];
    const providerName = `Provider-${providerIndex + 1}`;
    const fullCacheKey = shouldCache ? `${cacheKey}:${providerName}` : '';
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting ${providerName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Execute with timeout
        const result = await Promise.race([
          provider(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
          ),
        ]);
        
        console.log(`✅ ${providerName} succeeded on attempt ${attempt + 1}`);
        
        // Cache successful result with proper key
        if (shouldCache) {
          resultCache.set(fullCacheKey, {
            data: result,
            timestamp: Date.now(),
            provider: providerName,
          });
        }
        
        return { data: result, provider: providerName, fromCache: false };
      } catch (error) {
        const err = error as Error;
        console.warn(`⚠️ ${providerName} attempt ${attempt + 1} failed:`, err.message);
        errors.push(err);
        
        // If not the last attempt, wait with exponential backoff
        if (attempt < maxRetries) {
          const delay = exponentialBackoff ? Math.pow(2, attempt) * 1000 : 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log(`❌ ${providerName} failed after ${maxRetries + 1} attempts, trying next provider...`);
  }
  
  // All providers failed - check cache for THIS specific request as last resort
  if (shouldCache && cacheKey) {
    // Only return cached data if it matches the current request
    for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
      const providerName = `Provider-${providerIndex + 1}`;
      const fullCacheKey = `${cacheKey}:${providerName}`;
      const cached = resultCache.get(fullCacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📦 Returning cached result for "${cacheKey}" from ${cached.provider}`);
        return { data: cached.data, provider: cached.provider, fromCache: true };
      }
    }
  }
  
  // No valid cache found - throw error
  throw new Error(
    `All providers failed after retries. No cached data available. Errors: ${errors.map(e => e.message).join(', ')}`
  );
}

/**
 * Execute with timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Clear old cache entries
 * Note: LRU cache handles TTL automatically, but we keep this for manual cleanup
 */
export function clearExpiredCache() {
  resultCache.purgeStale();
}

// Optional: Manual cleanup every 10 minutes (LRU handles this automatically)
setInterval(clearExpiredCache, 10 * 60 * 1000);
