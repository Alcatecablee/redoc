/**
 * Database Transaction Utilities
 * 
 * Provides transaction management for multi-step database operations
 * to ensure atomicity and data consistency.
 * 
 * Features:
 * - Automatic rollback on error
 * - Type-safe transaction callbacks
 * - Logging and error handling
 * - Graceful fallback when DB unavailable
 */

import { db } from '../db';

/**
 * Execute a callback within a database transaction.
 * All operations succeed together or fail together (atomicity).
 * 
 * @param callback - Function containing database operations
 * @returns Result from the callback
 * @throws Error if transaction fails or DB unavailable
 * 
 * @example
 * const result = await withTransaction(async (tx) => {
 *   const org = await tx.insert(organizations).values({...}).returning();
 *   const member = await tx.insert(organizationMembers).values({...}).returning();
 *   return { org, member };
 * });
 */
export async function withTransaction<T>(
  callback: (tx: NonNullable<typeof db>) => Promise<T>
): Promise<T> {
  if (!db) {
    throw new Error('Database not available. Cannot execute transaction.');
  }

  try {
    console.log('🔒 Starting database transaction...');
    
    const result = await db.transaction(async (tx) => {
      return await callback(tx);
    });
    
    console.log('✅ Transaction committed successfully');
    return result;
  } catch (error) {
    console.error('❌ Transaction failed and rolled back:', error);
    throw error;
  }
}

/**
 * Execute a callback with optional transaction support.
 * If DB available, uses transaction. Otherwise, executes directly.
 * 
 * Useful for operations that should be transactional in production
 * but can run without DB in development.
 * 
 * @param callback - Function containing database operations
 * @param directCallback - Fallback when DB unavailable (optional)
 * @returns Result from the callback
 * 
 * @example
 * await withOptionalTransaction(
 *   async (tx) => {
 *     // Use tx for all operations
 *     await tx.insert(users).values({...});
 *   },
 *   async () => {
 *     // Fallback: use in-memory storage
 *     inMemoryStore.add(user);
 *   }
 * );
 */
export async function withOptionalTransaction<T>(
  callback: (tx: NonNullable<typeof db>) => Promise<T>,
  directCallback?: () => Promise<T>
): Promise<T> {
  if (!db) {
    console.warn('⚠️  Database not available. Skipping transaction.');
    if (directCallback) {
      return await directCallback();
    }
    throw new Error('Database not available and no fallback provided.');
  }

  return await withTransaction(callback);
}

/**
 * Retry a transaction up to N times with exponential backoff.
 * Useful for handling transient failures (deadlocks, connection issues).
 * 
 * @param callback - Transaction callback
 * @param options - Retry configuration
 * @returns Result from the callback
 * 
 * @example
 * const result = await withRetryableTransaction(
 *   async (tx) => await tx.insert(users).values({...}),
 *   { maxAttempts: 3, initialDelay: 100 }
 * );
 */
export async function withRetryableTransaction<T>(
  callback: (tx: NonNullable<typeof db>) => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelay = 100, maxDelay = 5000 } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-retryable errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxAttempts) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        console.warn(`⚠️  Transaction attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ Transaction failed after ${maxAttempts} attempts`);
  throw lastError || new Error('Transaction failed');
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  
  // Don't retry on:
  // - Constraint violations (unique, foreign key, check)
  // - Permission errors
  // - Invalid data errors
  const nonRetryablePatterns = [
    'unique constraint',
    'foreign key constraint',
    'check constraint',
    'permission denied',
    'invalid input',
    'not null violation',
    'invalid uuid',
  ];
  
  return nonRetryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Type-safe transaction context.
 * Use this type when passing db connections around.
 */
export type TransactionContext = NonNullable<typeof db>;
