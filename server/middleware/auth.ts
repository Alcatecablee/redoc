/**
 * Authentication Middleware
 * 
 * Provides authentication functions for API key verification and temporary mock auth.
 * Note: Supabase auth has been removed - you should implement proper authentication.
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Temporary mock authentication middleware
 * WARNING: This is for development only. Implement proper authentication before production!
 */
export async function verifySupabaseAuth(req: any, res: any, next: any) {
  try {
    // For development: Create/use a default test user
    if (!db) {
      console.warn('[AUTH] Database not initialized, allowing request without auth');
      req.user = {
        id: 'dev-user',
        email: 'dev@example.com',
        databaseId: 1,
      };
      return next();
    }

    // Check if we have a test user in the database
    const testEmail = 'dev@example.com';
    const existingUsers = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);

    if (existingUsers.length > 0) {
      req.user = {
        id: `user-${existingUsers[0].id}`,
        email: existingUsers[0].email,
        databaseId: existingUsers[0].id,
      };
    } else {
      // Create a default test user
      const newUsers = await db.insert(users).values({
        email: testEmail,
        name: 'Development User',
        plan: 'free',
        generation_count: 0,
      }).returning();

      req.user = {
        id: `user-${newUsers[0].id}`,
        email: newUsers[0].email,
        databaseId: newUsers[0].id,
      };
    }

    return next();
  } catch (err: any) {
    console.error('[AUTH] Error in mock auth middleware:', err);
    // Allow request to proceed even if there's an error
    req.user = {
      id: 'dev-user',
      email: 'dev@example.com',
      databaseId: 1,
    };
    return next();
  }
}

/**
 * Verify API key for Enterprise API Access
 */
export async function verifyApiKey(req: any, res: any, next: any) {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ 
        error: 'Unauthorized: missing API key',
        message: 'Please provide your API key in the X-API-Key header'
      });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const userResults = await db.select().from(users).where(eq(users.api_key, apiKey));
    
    if (userResults.length === 0) {
      return res.status(401).json({ 
        error: 'Unauthorized: invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    const user = userResults[0];
    
    if (user.plan !== 'enterprise') {
      return res.status(403).json({ 
        error: 'Forbidden: API access requires Enterprise plan',
        message: 'Please upgrade to Enterprise plan for API access'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };

    return next();
  } catch (err: any) {
    console.error('Error verifying API key', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}
