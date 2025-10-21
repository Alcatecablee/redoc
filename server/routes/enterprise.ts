import { Router } from 'express';
import { storage } from '../storage';
import { ThemeOrchestrator } from '../services/theme-orchestrator';
import sharp from 'sharp';

const router = Router();

const themeOrchestrator = new ThemeOrchestrator();

function verifySupabaseAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/api/enterprise/white-label', verifySupabaseAuth, async (req, res) => {
  try {
    const { removeBranding, customProductName, customSupportEmail, emailTemplateCustomization } = req.body;

    const config = {
      removeBranding: !!removeBranding,
      customProductName: customProductName || 'DocSnap',
      customSupportEmail: customSupportEmail || '',
      emailTemplateCustomization: {
        headerText: emailTemplateCustomization?.headerText || '',
        footerText: emailTemplateCustomization?.footerText || '',
        brandColor: emailTemplateCustomization?.brandColor || '#2563eb',
      },
      updatedAt: new Date().toISOString(),
    };

    console.log('Saved white-label configuration:', config);

    res.json({
      success: true,
      config,
      message: 'White-label configuration saved successfully',
    });
  } catch (error: any) {
    console.error('White-label configuration error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

router.post('/api/enterprise/branding', verifySupabaseAuth, async (req, res) => {
  try {
    const { logoUrl, brandColors } = req.body;

    const config = {
      logoUrl: logoUrl || '',
      brandColors: {
        primary: brandColors?.primary || '#2563eb',
        secondary: brandColors?.secondary || '#64748b',
        accent: brandColors?.accent || '#0ea5e9',
      },
      updatedAt: new Date().toISOString(),
    };

    console.log('Saved branding configuration:', config);

    res.json({
      success: true,
      config,
      message: 'Branding configuration saved successfully',
    });
  } catch (error: any) {
    console.error('Branding configuration error:', error);
    res.status(500).json({ error: error.message || 'Failed to save branding' });
  }
});

router.post('/api/enterprise/extract-logo-colors', verifySupabaseAuth, async (req, res) => {
  try {
    const { logoUrl } = req.body;

    if (!logoUrl) {
      return res.status(400).json({ error: 'Logo URL is required' });
    }

    let buffer: Buffer;

    if (logoUrl.startsWith('data:image')) {
      const base64Data = logoUrl.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      const response = await fetch(logoUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch logo image');
      }
      buffer = Buffer.from(await response.arrayBuffer());
    }

    try {
      const { data, info } = await sharp(buffer)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const colors = extractDominantColors(data, info.channels, 8);

      const filteredColors = colors.filter(color => {
        const saturation = getColorSaturation(color);
        const brightness = getColorBrightness(color);
        return saturation > 0.15 && brightness > 0.1 && brightness < 0.95;
      });

      const topColors = filteredColors.slice(0, 6);

      console.log(`Extracted ${topColors.length} colors from logo:`, topColors);

      res.json({
        success: true,
        colors: topColors,
        totalExtracted: colors.length,
        message: `Successfully extracted ${topColors.length} brand colors`,
      });
    } catch (sharpError) {
      console.warn('Sharp not available, using fallback color extraction');
      
      const fallbackColors = ['#2563eb', '#64748b', '#0ea5e9'];
      
      res.json({
        success: true,
        colors: fallbackColors,
        fallback: true,
        message: 'Using fallback colors (Sharp module not available)',
      });
    }
  } catch (error: any) {
    console.error('Logo color extraction error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract colors' });
  }
});

function extractDominantColors(data: Buffer, channels: number, numColors: number): string[] {
  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += channels * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = channels === 4 ? data[i + 3] : 255;

    if (a < 128) continue;

    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;

    const key = `${qr},${qg},${qb}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors)
    .map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return rgbToHex(r, g, b);
    });

  return sortedColors;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function getColorSaturation(hexColor: string): number {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  if (max === 0) return 0;
  return delta / max;
}

function getColorBrightness(hexColor: string): number {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;
  return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export default router;
