import { Router } from 'express';
import { DashboardService } from '../services/dashboard-service';
import { verifySupabaseAuth } from '../middleware/auth';
import { db } from '../db';
import { users, organizations, organizationMembers } from '../../shared/schema';
import { eq } from 'drizzle-orm';

function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

const router = Router();

router.get('/overview', verifySupabaseAuth, async (req: any, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userResults = await ensureDb().select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResults[0].id;
    const overview = await DashboardService.getUserOverview(userId);

    return res.json(overview);
  } catch (error: any) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard overview', details: error.message });
  }
});

router.get('/analytics/:docId', verifySupabaseAuth, async (req: any, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const docId = parseInt(req.params.docId);
    if (isNaN(docId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const days = parseInt(req.query.days as string) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await DashboardService.getDocumentAnalytics(docId, startDate, endDate);

    return res.json(analytics);
  } catch (error: any) {
    console.error('Document analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch document analytics', details: error.message });
  }
});

router.get('/team', verifySupabaseAuth, async (req: any, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userResults = await ensureDb().select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResults[0].id;

    const orgMembership = await ensureDb()
      .select({ organizationId: organizationMembers.organization_id })
      .from(organizationMembers)
      .where(eq(organizationMembers.user_id, userId))
      .limit(1);

    if (!orgMembership || orgMembership.length === 0) {
      return res.status(404).json({ error: 'No organization found for user' });
    }

    const organizationId = orgMembership[0].organizationId;
    const teamOverview = await DashboardService.getTeamOverview(organizationId);

    return res.json(teamOverview);
  } catch (error: any) {
    console.error('Team overview error:', error);
    return res.status(500).json({ error: 'Failed to fetch team overview', details: error.message });
  }
});

router.get('/integrations', verifySupabaseAuth, async (req: any, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userResults = await ensureDb().select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResults[0].id;
    const integrationHealth = await DashboardService.getIntegrationHealth(userId);

    return res.json(integrationHealth);
  } catch (error: any) {
    console.error('Integration health error:', error);
    return res.status(500).json({ error: 'Failed to fetch integration health', details: error.message });
  }
});

router.get('/revenue', verifySupabaseAuth, async (req: any, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userResults = await ensureDb().select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userResults[0].plan !== 'enterprise') {
      return res.status(403).json({ error: 'Enterprise plan required for revenue metrics' });
    }

    const revenueMetrics = await DashboardService.getRevenueMetrics();

    return res.json(revenueMetrics);
  } catch (error: any) {
    console.error('Revenue metrics error:', error);
    return res.status(500).json({ error: 'Failed to fetch revenue metrics', details: error.message });
  }
});

router.post('/clear-cache', verifySupabaseAuth, async (req: any, res) => {
  try {
    const key = req.body.key;
    DashboardService.clearCache(key);
    return res.json({ success: true, message: 'Cache cleared' });
  } catch (error: any) {
    console.error('Clear cache error:', error);
    return res.status(500).json({ error: 'Failed to clear cache', details: error.message });
  }
});

export default router;
