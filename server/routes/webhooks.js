import { Router } from 'express';
import { webhookService } from '../services/webhook-service';
import { verifySupabaseAuth } from '../routes';
const router = Router();
router.post('/api/webhooks', verifySupabaseAuth, async (req, res) => {
    try {
        const { url, events, organizationId } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'URL and events array required' });
        }
        const webhook = await webhookService.createWebhook(parseInt(userId), url, events, organizationId ? parseInt(organizationId) : undefined);
        res.json({
            success: true,
            webhook: {
                id: webhook.id,
                url: webhook.url,
                events: webhook.events,
                secret: webhook.secret, // Only shown once
                created_at: webhook.created_at,
            },
        });
    }
    catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/api/webhooks', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const organizationId = req.query.organizationId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const webhooks = await webhookService.listWebhooks(parseInt(userId), organizationId ? parseInt(organizationId) : undefined);
        res.json({
            success: true,
            webhooks: webhooks.map(w => ({
                id: w.id,
                url: w.url,
                events: w.events,
                is_active: w.is_active,
                last_triggered_at: w.last_triggered_at,
                failure_count: w.failure_count,
                created_at: w.created_at,
                // Secret not returned for security
            })),
        });
    }
    catch (error) {
        console.error('List webhooks error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/api/webhooks/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const webhookId = parseInt(req.params.id);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        await webhookService.deleteWebhook(webhookId, parseInt(userId));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});
export default router;
