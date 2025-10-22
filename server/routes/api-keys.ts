import { Router } from 'express';
import { apiKeyService } from '../services/api-key-service';
import { verifySupabaseAuth } from '../middleware/auth';

const router = Router();

router.post('/api/keys', verifySupabaseAuth, async (req, res) => {
  try {
    const { name, description, scopes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKey = await apiKeyService.createApiKey(
      parseInt(userId),
      name,
      description,
      scopes || ['read', 'write']
    );

    res.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only shown once during creation
        scopes: apiKey.scopes,
        created_at: apiKey.created_at,
      },
    });
  } catch (error: any) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/keys', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const keys = await apiKeyService.listApiKeys(parseInt(userId));

    res.json({
      success: true,
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        key_prefix: k.key_prefix,
        description: k.description,
        scopes: k.scopes,
        is_active: k.is_active,
        usage_count: k.usage_count,
        last_used_at: k.last_used_at,
        created_at: k.created_at,
        expires_at: k.expires_at,
        rate_limit_per_minute: k.rate_limit_per_minute,
        rate_limit_per_day: k.rate_limit_per_day,
      })),
    });
  } catch (error: any) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/keys/:id', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const keyId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await apiKeyService.deleteApiKey(keyId, parseInt(userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/keys/:id/revoke', verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const keyId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await apiKeyService.revokeApiKey(keyId, parseInt(userId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
