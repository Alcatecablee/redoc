import { Router } from 'express';
import { db } from '../db';
import { users, documentations } from '@shared/schema';
import { eq, count, sql } from 'drizzle-orm';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function verifyAdminAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing access token' });
    }
    
    if (!SUPABASE_URL) {
      return res.status(500).json({ error: 'SUPABASE_URL not configured' });
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userData = await userResp.json();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const foundUsers = await db.select().from(users).where(eq(users.email, userData.email));
    
    if (foundUsers.length === 0 || !foundUsers[0].is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    req.user = userData;
    req.dbUser = foundUsers[0];
    next();
  } catch (err: any) {
    console.error('Error verifying admin token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

router.get('/api/admin/stats', verifyAdminAuth, async (req: any, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const allUsers = await db.select().from(users).orderBy(users.created_at);
    
    const totalDocs = await db.select({ count: count() }).from(documentations);
    
    const stats = {
      totalUsers: allUsers.length,
      enterpriseUsers: allUsers.filter(u => u.plan === 'enterprise').length,
      totalDocs: totalDocs[0]?.count || 0,
      activeSubscriptions: allUsers.filter(u => u.subscription_status === 'active').length,
    };

    res.json({
      success: true,
      users: allUsers,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/users/:id/plan', verifyAdminAuth, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { plan, is_admin } = req.body;

    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const updates: any = { updated_at: new Date() };
    if (plan) updates.plan = plan;
    if (typeof is_admin === 'boolean') updates.is_admin = is_admin;

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    res.json({
      success: true,
      user: updated[0],
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
