import { Router } from 'express';
import { db } from '../db';
import { activityLogs, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// List activity logs for user's orgs and user
router.get('/api/activity', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    const limit = Math.min(100, Number(req.query.limit || 50));
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];
    if (!currentUser) return res.json({ activities: [] });

    const activities = await db.select().from(activityLogs).where(eq(activityLogs.user_id, currentUser.id)).order('created_at', { descending: true }).limit(limit);

    res.json({ activities });
  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch activity' });
  }
});

// Metrics endpoint - simple aggregates
router.get('/api/activity/metrics', async (req: any, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) return res.status(401).json({ error: 'Unauthorized' });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });

    const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
    const currentUser = foundUsers[0];
    if (!currentUser) return res.json({ metrics: {} });

    // Recent counts by action
    const recent = await db.execute(
      `SELECT action, COUNT(*) as cnt FROM activity_logs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days' GROUP BY action ORDER BY cnt DESC LIMIT 50`,
      [currentUser.id]
    );

    res.json({ metrics: { recentActions: recent.rows || [] } });
  } catch (err: any) {
    console.error('Error fetching activity metrics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch metrics' });
  }
});

export default router;
