import { Router } from 'express';
import { db } from '../db';
import { paymentHistory, users } from '../../shared/schema';
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
// List payment history for authenticated user
router.get('/api/billing/payments', verifySupabaseAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.email)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!db)
            return res.status(500).json({ error: 'Database not initialized' });
        const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
        const currentUser = foundUsers[0];
        if (!currentUser)
            return res.json({ payments: [] });
        const payments = await db.select().from(paymentHistory).where(eq(paymentHistory.user_id, currentUser.id)).order('created_at', { descending: true });
        res.json({ payments });
    }
    catch (err) {
        console.error('Error fetching payments:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch payments' });
    }
});
// Create a lightweight invoice record (used for offline/manual invoices or immediate consultants)
router.post('/api/billing/invoices', async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.email)
            return res.status(401).json({ error: 'Unauthorized' });
        const { amount, currency = 'USD', payment_type = 'invoice', metadata = {} } = req.body;
        if (!amount)
            return res.status(400).json({ error: 'Amount is required' });
        if (!db)
            return res.status(500).json({ error: 'Database not initialized' });
        const foundUsers = await db.select().from(users).where(eq(users.email, user.email));
        const currentUser = foundUsers[0];
        if (!currentUser)
            return res.status(404).json({ error: 'User record not found' });
        const inserted = await db.insert(paymentHistory).values({ user_id: currentUser.id, payment_id: `inv_${Date.now()}`, amount: amount.toString(), currency, status: 'pending', plan: currentUser.plan || 'custom', payment_type, metadata: JSON.stringify(metadata) }).returning();
        res.status(201).json({ invoice: inserted[0] });
    }
    catch (err) {
        console.error('Error creating invoice record:', err);
        res.status(500).json({ error: err.message || 'Failed to create invoice' });
    }
});
export default router;
