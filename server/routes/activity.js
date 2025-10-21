import { Router } from 'express';
import { db } from '../db';
import { activityLogs, users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const router = Router();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
async function verifySupabaseAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || req.headers.Authorization;
        const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
        if (!token)
            return res.status(401).json({ error: 'Unauthorized: missing access token' });
        if (!SUPABASE_URL)
            return res.status(500).json({ error: 'SUPABASE_URL not configured' });
        const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY || '', 'Content-Type': 'application/json' }
        });
        if (!userResp.ok) {
            const text = await userResp.text();
            console.warn('Supabase auth verify failed:', userResp.status, text);
            return res.status(401).json({ error: 'Unauthorized', details: text });
        }
        const userData = await userResp.json();
        req.user = userData;
        return next();
    }
    catch (err) {
        console.error('Error verifying supabase token', err);
        return res.status(500).json({ error: 'Auth verification failed' });
    }
}
// List activity logs for user's orgs and user
router.get('/api/activity', verifySupabaseAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.email)
            return res.status(401).json({ error: 'Unauthorized' });
        const limit = Math.min(100, Number(req.query.limit || 50));
        if (!db)
            return res.status(500).json({ error: 'Database not initialized' });
        const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
        const currentUser = foundUsers[0];
        if (!currentUser)
            return res.json({ activities: [] });
        const activities = await db.select().from(activityLogs).where(eq(activityLogs.user_id, currentUser.id)).order('created_at', { descending: true }).limit(limit);
        res.json({ activities });
    }
    catch (err) {
        console.error('Error fetching activity logs:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch activity' });
    }
});
// Metrics endpoint - simple aggregates
router.get('/api/activity/metrics', async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.email)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!db)
            return res.status(500).json({ error: 'Database not initialized' });
        const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
        const currentUser = foundUsers[0];
        if (!currentUser)
            return res.json({ metrics: {} });
        // Recent counts by action
        const recent = await db.execute(`SELECT action, COUNT(*) as cnt FROM activity_logs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days' GROUP BY action ORDER BY cnt DESC LIMIT 50`, [currentUser.id]);
        res.json({ metrics: { recentActions: recent.rows || [] } });
    }
    catch (err) {
        console.error('Error fetching activity metrics:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch metrics' });
    }
});
export default router;
