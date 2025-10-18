import { Router } from 'express';
import { z } from 'zod';
import { ThemeService } from '../services/theme-service';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Proper Supabase authentication middleware
async function verifySupabaseAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing access token' });
    }

    if (!SUPABASE_URL) {
      return res.status(500).json({ error: 'SUPABASE_URL not configured on server' });
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
    req.user = userData;
    req.userId = userData.id; // Set verified user ID
    return next();
  } catch (err: any) {
    console.error('Error verifying supabase token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

// Validation schemas
const createThemeSchema = z.object({
  name: z.string().min(1).max(100),
  theme: z.object({
    colors: z.object({}).passthrough().optional(),
    typography: z.object({}).passthrough().optional(),
    spacing: z.object({}).passthrough().optional(),
    styling: z.object({}).passthrough().optional(),
    layout: z.object({}).passthrough().optional(),
  }),
  sourceUrl: z.string().url().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
});

const updateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  theme: z.object({
    colors: z.object({}).passthrough().optional(),
    typography: z.object({}).passthrough().optional(),
    spacing: z.object({}).passthrough().optional(),
    styling: z.object({}).passthrough().optional(),
    layout: z.object({}).passthrough().optional(),
  }).optional(),
  sourceUrl: z.string().url().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
});

/**
 * GET /api/themes
 * List all themes for the authenticated user
 */
router.get('/', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeService = new ThemeService();
    const themes = await themeService.listAllThemes(req.userId);
    res.json({ themes });
  } catch (error: any) {
    console.error('Error listing themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes', message: error.message });
  }
});

/**
 * GET /api/themes/default
 * Get the default theme for the authenticated user
 */
router.get('/default', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeService = new ThemeService();
    const theme = await themeService.getDefaultTheme(req.userId);
    
    if (!theme) {
      return res.status(404).json({ error: 'No default theme found' });
    }
    
    res.json({ theme });
  } catch (error: any) {
    console.error('Error fetching default theme:', error);
    res.status(500).json({ error: 'Failed to fetch default theme', message: error.message });
  }
});

/**
 * GET /api/themes/:id
 * Get a specific theme by ID
 */
router.get('/:id', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeId = parseInt(req.params.id);
    if (isNaN(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    const themeService = new ThemeService();
    const theme = await themeService.getTheme(themeId, req.userId);
    
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    
    res.json({ theme });
  } catch (error: any) {
    console.error('Error fetching theme:', error);
    res.status(500).json({ error: 'Failed to fetch theme', message: error.message });
  }
});

/**
 * POST /api/themes
 * Create a new theme
 */
router.post('/', verifySupabaseAuth, async (req: any, res) => {
  try {
    const validatedData = createThemeSchema.parse(req.body);
    
    const themeService = new ThemeService();
    const theme = await themeService.createTheme({
      name: validatedData.name,
      userId: req.userId,
      theme: validatedData.theme,
      sourceUrl: validatedData.sourceUrl,
      confidenceScore: validatedData.confidenceScore,
    });
    
    res.status(201).json({ theme });
  } catch (error: any) {
    console.error('Error creating theme:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create theme', message: error.message });
  }
});

/**
 * PUT /api/themes/:id
 * Update an existing theme
 */
router.put('/:id', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeId = parseInt(req.params.id);
    if (isNaN(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    const validatedData = updateThemeSchema.parse(req.body);
    
    const themeService = new ThemeService();
    const theme = await themeService.updateTheme(themeId, req.userId, validatedData);
    
    res.json({ theme });
  } catch (error: any) {
    console.error('Error updating theme:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.message === 'Theme not found' || error.message === 'Permission denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update theme', message: error.message });
  }
});

/**
 * DELETE /api/themes/:id
 * Delete a theme
 */
router.delete('/:id', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeId = parseInt(req.params.id);
    if (isNaN(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    const themeService = new ThemeService();
    await themeService.deleteTheme(themeId, req.userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting theme:', error);
    res.status(500).json({ error: 'Failed to delete theme', message: error.message });
  }
});

/**
 * POST /api/themes/:id/set-default
 * Set a theme as the user's default
 */
router.post('/:id/set-default', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeId = parseInt(req.params.id);
    if (isNaN(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    const themeService = new ThemeService();
    const theme = await themeService.setDefaultTheme(themeId, req.userId);
    
    res.json({ theme });
  } catch (error: any) {
    console.error('Error setting default theme:', error);
    if (error.message === 'Theme not found' || error.message === 'Permission denied') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to set default theme', message: error.message });
  }
});

/**
 * POST /api/themes/:id/clone
 * Clone a theme with a new name
 */
router.post('/:id/clone', verifySupabaseAuth, async (req: any, res) => {
  try {
    const themeId = parseInt(req.params.id);
    if (isNaN(themeId)) {
      return res.status(400).json({ error: 'Invalid theme ID' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const themeService = new ThemeService();
    const theme = await themeService.cloneTheme(themeId, req.userId, name);
    
    res.status(201).json({ theme });
  } catch (error: any) {
    console.error('Error cloning theme:', error);
    if (error.message === 'Theme not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to clone theme', message: error.message });
  }
});

export default router;
