import { Router } from 'express';
import { z } from 'zod';
import { CSSExtractor } from '../services/css-extractor';
import { ColorAnalyzer } from '../services/color-analyzer';
import type { Theme } from '@shared/themes';

const router = Router();

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function rateLimiter(req: any, res: any, next: any) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  const record = requestCounts.get(clientId);
  
  if (!record || now > record.resetAt) {
    requestCounts.set(clientId, { count: 1, resetAt: now + RATE_WINDOW });
    return next();
  }
  
  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({ 
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((record.resetAt - now) / 1000)
    });
  }
  
  record.count++;
  next();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [clientId, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(clientId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

const extractFromUrlSchema = z.object({
  url: z.string().url(),
  includeLogo: z.boolean().optional(),
});

const extractFromColorsSchema = z.object({
  colors: z.array(z.string()),
  themeName: z.string().optional(),
});

/**
 * POST /api/extract-theme/from-url
 * Extract theme from a website URL
 */
router.post('/from-url', rateLimiter, async (req, res) => {
  try {
    const { url } = extractFromUrlSchema.parse(req.body);

    const cssExtractor = new CSSExtractor();
    const colorAnalyzer = new ColorAnalyzer();

    // Extract colors from CSS
    const extracted = await cssExtractor.extractFromURL(url);

    if (extracted.colors.length === 0) {
      return res.status(404).json({ 
        error: 'No colors found',
        message: 'Could not extract colors from the provided URL'
      });
    }

    // Build accessible palette
    const palette = colorAnalyzer.buildPalette(extracted.colors);

    // Evaluate accessibility
    const accessibility = colorAnalyzer.evaluateAccessibility(palette);

    // Construct theme
    const theme: Partial<Theme> = {
      name: `Theme from ${new URL(url).hostname}`,
      colors: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
        text_secondary: palette.textSecondary,
        border: palette.border,
        code_bg: palette.surface,
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    };

    res.json({
      theme,
      extractedColors: extracted.colors,
      palette,
      accessibility,
      confidence: extracted.confidence,
      source: extracted.source,
    });
  } catch (error: any) {
    console.error('Error extracting theme from URL:', error);
    
    // Zod validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    // URL validation and SSRF protection errors
    if (error.message?.includes('not allowed') || 
        error.message?.includes('Invalid URL') ||
        error.message?.includes('Protocol') ||
        error.message?.includes('private/internal IP') ||
        error.message?.includes('Failed to resolve')) {
      return res.status(400).json({ error: 'Invalid URL', message: error.message });
    }
    
    // Timeout errors
    if (error.message?.includes('timeout')) {
      return res.status(408).json({ error: 'Request timeout', message: error.message });
    }
    
    // Generic server error
    res.status(500).json({ error: 'Failed to extract theme', message: error.message });
  }
});

/**
 * POST /api/extract-theme/from-colors
 * Build theme from a list of colors (e.g., from logo extraction)
 */
router.post('/from-colors', rateLimiter, async (req, res) => {
  try {
    const { colors, themeName } = extractFromColorsSchema.parse(req.body);

    if (colors.length === 0) {
      return res.status(400).json({ error: 'No colors provided' });
    }

    const colorAnalyzer = new ColorAnalyzer();

    // Build accessible palette
    const palette = colorAnalyzer.buildPalette(colors);

    // Evaluate accessibility
    const accessibility = colorAnalyzer.evaluateAccessibility(palette);

    // Construct theme
    const theme: Partial<Theme> = {
      name: themeName || 'Custom Brand Theme',
      colors: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        background: palette.background,
        surface: palette.surface,
        text: palette.text,
        text_secondary: palette.textSecondary,
        border: palette.border,
        code_bg: palette.surface,
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    };

    res.json({
      theme,
      palette,
      accessibility,
      confidence: 1.0,
      source: 'logo',
    });
  } catch (error: any) {
    console.error('Error building theme from colors:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to build theme', message: error.message });
  }
});

export default router;
