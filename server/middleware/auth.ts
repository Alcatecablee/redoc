/**
 * Authentication Middleware
 * 
 * Provides authentication functions for Supabase and API key verification.
 * Used across multiple route modules to avoid circular dependencies.
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Verify Supabase JWT token
 * Falls back to allowing unauthenticated access if Supabase is not configured
 */
export async function verifySupabaseAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    
    // If Supabase is not configured, allow unauthenticated access
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Supabase not configured - allowing unauthenticated access');
      req.user = null;
      return next();
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing access token' });
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    if (!userResp.ok) {
      const text = await userResp.text();
      console.warn('Supabase auth verify failed:', userResp.status, text);
      return res.status(401).json({ error: 'Unauthorized', details: text });
    }

    const userData = await userResp.json();
    const email = userData.email;

    if (!email || !db) {
      req.user = userData;
      return next();
    }

    try {
      const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUsers.length > 0) {
        req.user = {
          ...userData,
          databaseId: existingUsers[0].id,
          email: email,
        };
      } else {
        const newUsers = await db.insert(users).values({
          email: email,
          plan: 'free',
          generation_count: 0,
        }).returning();

        req.user = {
          ...userData,
          databaseId: newUsers[0].id,
          email: email,
        };
      }
    } catch (dbErr: any) {
      console.warn('Failed to sync Supabase user with database:', dbErr?.message);
      req.user = userData;
    }

    return next();
  } catch (err: any) {
    console.error('Error verifying supabase token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
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
