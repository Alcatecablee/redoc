/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures when AI providers are down.
 * Opens circuit after consecutive failures, auto-tests for recovery.
 */

import { LRUCache } from 'lru-cache';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing - reject immediately
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Open after N consecutive failures
  resetTimeout: number;         // Test recovery after N milliseconds
  successThreshold: number;     // Close after N consecutive successes in half-open
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 30000,      // Test recovery after 30 seconds
  successThreshold: 2,      // Close after 2 successes
};

// Track circuit state per service (using LRU cache for bounded memory)
const circuits = new LRUCache<string, CircuitStats>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceKey: string,
  fn: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Get or initialize circuit state
  let stats = circuits.get(serviceKey);
  if (!stats) {
    stats = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      nextAttemptTime: 0,
    };
    circuits.set(serviceKey, stats);
  }

  // Check circuit state
  const now = Date.now();
  
  // If circuit is OPEN, check if it's time to test recovery
  if (stats.state === CircuitState.OPEN) {
    if (now < stats.nextAttemptTime) {
      throw new Error(
        `Circuit breaker OPEN for "${serviceKey}". ` +
        `Next attempt in ${Math.ceil((stats.nextAttemptTime - now) / 1000)}s. ` +
        `Reason: ${stats.failures} consecutive failures.`
      );
    }
    
    // Time to test recovery - transition to HALF_OPEN
    console.log(`⚡ Circuit breaker "${serviceKey}": Testing recovery (HALF_OPEN)`);
    stats.state = CircuitState.HALF_OPEN;
    stats.successes = 0;
  }

  // Execute the function
  try {
    const result = await fn();
    
    // Success!
    stats.lastSuccessTime = now;
    stats.failures = 0; // Reset failure count
    
    if (stats.state === CircuitState.HALF_OPEN) {
      stats.successes++;
      console.log(`✅ Circuit breaker "${serviceKey}": Recovery test ${stats.successes}/${cfg.successThreshold} succeeded`);
      
      // Close circuit after enough successes
      if (stats.successes >= cfg.successThreshold) {
        console.log(`✅ Circuit breaker "${serviceKey}": CLOSED (fully recovered)`);
        stats.state = CircuitState.CLOSED;
      }
    }
    
    circuits.set(serviceKey, stats);
    return result;
  } catch (error) {
    // Failure!
    stats.lastFailureTime = now;
    stats.failures++;
    stats.successes = 0; // Reset success count
    
    // Open circuit if threshold exceeded
    if (stats.failures >= cfg.failureThreshold) {
      stats.state = CircuitState.OPEN;
      stats.nextAttemptTime = now + cfg.resetTimeout;
      
      console.error(
        `🔴 Circuit breaker "${serviceKey}": OPEN after ${stats.failures} failures. ` +
        `Will retry in ${cfg.resetTimeout / 1000}s`
      );
    } else {
      console.warn(
        `⚠️ Circuit breaker "${serviceKey}": Failure ${stats.failures}/${cfg.failureThreshold}`
      );
    }
    
    circuits.set(serviceKey, stats);
    throw error;
  }
}

/**
 * Get current circuit state for a service
 */
export function getCircuitState(serviceKey: string): CircuitStats | null {
  return circuits.get(serviceKey) || null;
}

/**
 * Manually reset a circuit breaker
 */
export function resetCircuit(serviceKey: string): void {
  circuits.delete(serviceKey);
  console.log(`🔄 Circuit breaker "${serviceKey}": Manually reset`);
}

/**
 * Get all circuit states (for monitoring)
 */
export function getAllCircuitStates(): Record<string, CircuitStats> {
  const states: Record<string, CircuitStats> = {};
  
  // Common service keys to check
  const serviceKeys = [
    'ai-provider-groq',
    'ai-provider-openai',
    'ai-provider-deepseek',
    'ai-provider-ollama',
  ];
  
  for (const key of serviceKeys) {
    const state = circuits.get(key);
    if (state) {
      states[key] = state;
    }
  }
  
  return states;
}
