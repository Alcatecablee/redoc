import { CSSExtractor } from './css-extractor';
import { ColorAnalyzer } from './color-analyzer';
import { getDefaultTheme } from '@shared/themes';
import sharp from 'sharp';
import fetch from 'node-fetch';
/**
 * Production-ready theme orchestrator that combines CSS and logo extraction
 * with intelligent fallback strategies
 *
 * Current Implementation Status:
 * - CSS Extraction: FULLY IMPLEMENTED with @import processing, caching, size limits
 * - Logo Extraction: NOT YET IMPLEMENTED (fallback path exists, returns empty)
 * - Fallback Cascade: CSS → Default (logo step skipped until implemented)
 * - Light/Dark Variants: FULLY IMPLEMENTED
 * - CSS Variable Generation: FULLY IMPLEMENTED
 *
 * Production-Ready Features:
 * ✅ @import rule processing (depth ≤ 2)
 * ✅ Response caching with 1-hour TTL
 * ✅ 5MB CSS size limits
 * ✅ Gray/neutral color filtering (saturation < 15%)
 * ✅ WCAG AA contrast validation
 * ✅ Automatic light/dark theme generation
 * ⏳ Logo-based color extraction (planned)
 */
export class ThemeOrchestrator {
    cssExtractor;
    colorAnalyzer;
    constructor() {
        this.cssExtractor = new CSSExtractor();
        this.colorAnalyzer = new ColorAnalyzer();
    }
    /**
     * Extract a complete theme with light and dark variants
     * Strategy: Try CSS first, fallback to logo, then defaults
     */
    async extractTheme(options) {
        try {
            // Step 1: Try CSS extraction
            const cssResult = await this.cssExtractor.extractFromURL(options.url);
            // Step 2: Evaluate CSS confidence
            if (cssResult.confidence >= 0.6 && cssResult.colors.length >= 3) {
                // Strong CSS signals - use CSS extraction
                return this.buildThemeFromColors(cssResult.colors, cssResult.cssVariables, 'css');
            }
            // Step 3: Try logo extraction if available and CSS is weak
            if (options.logoUrl && cssResult.confidence < 0.6) {
                try {
                    const logoColors = await this.extractColorsFromLogo(options.logoUrl);
                    // Merge CSS and logo colors (hybrid approach)
                    const mergedColors = this.mergeColorSources(cssResult.colors, logoColors);
                    if (mergedColors.length >= 3) {
                        return this.buildThemeFromColors(mergedColors, cssResult.cssVariables, 'hybrid');
                    }
                }
                catch (error) {
                    console.warn('Logo extraction failed:', error);
                }
            }
            // Step 4: Use CSS results even if weak (better than nothing)
            if (cssResult.colors.length > 0) {
                return this.buildThemeFromColors(cssResult.colors, cssResult.cssVariables, 'css');
            }
            // Step 5: Ultimate fallback to default theme
            return this.buildFallbackTheme();
        }
        catch (error) {
            console.error('Theme extraction failed completely:', error);
            return this.buildFallbackTheme();
        }
    }
    /**
     * Build light and dark theme variants from extracted colors
     */
    buildThemeFromColors(colors, cssVariables, source) {
        // Use color analyzer to build accessible palette
        const palette = this.colorAnalyzer.buildPalette(colors);
        // Generate both light and dark variants
        const lightTheme = this.createThemeFromPalette(palette, 'light', cssVariables);
        const darkTheme = this.createThemeFromPalette(palette, 'dark', cssVariables);
        // Determine which variant to use as primary based on extracted colors
        const useLightAsPrimary = colors.filter(c => this.isLightColor(c)).length > colors.length / 2;
        const primaryTheme = useLightAsPrimary ? lightTheme : darkTheme;
        // Calculate confidence score
        const confidence = Math.min(colors.length / 5, 1.0);
        return {
            theme: primaryTheme,
            light: lightTheme,
            dark: darkTheme,
            confidence,
            source,
            swatch: colors.slice(0, 8), // Return top 8 colors as swatch
        };
    }
    /**
     * Create a theme from a color palette
     */
    createThemeFromPalette(palette, variant, cssVariables) {
        const isLight = variant === 'light';
        return {
            id: `extracted-${variant}`,
            name: `Extracted Theme (${variant === 'light' ? 'Light' : 'Dark'})`,
            colors: {
                primary: palette.primary,
                secondary: palette.secondary,
                accent: palette.accent,
                background: isLight ? palette.background : '#0f172a',
                surface: isLight ? palette.surface : '#1e293b',
                text: isLight ? palette.text : '#f1f5f9',
                text_secondary: isLight ? palette.textSecondary : '#94a3b8',
                border: isLight ? palette.border : '#334155',
                code_bg: isLight ? '#f1f5f9' : '#1e293b',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            typography: {
                font_family: 'Inter, -apple-system, system-ui, sans-serif',
                heading_font: 'Inter, -apple-system, system-ui, sans-serif',
                code_font: "'Fira Code', Monaco, Consolas, monospace",
                base_size: '16px',
                line_height: '1.6',
                heading_weights: { h1: 700, h2: 600, h3: 600 },
                heading_sizes: { h1: '2.5rem', h2: '2rem', h3: '1.5rem' },
            },
            spacing: {
                section: '3rem',
                paragraph: '1.5rem',
                list_item: '0.5rem',
                density: 'comfortable',
            },
            styling: {
                border_radius: '8px',
                code_border_radius: '6px',
                shadow: '0 1px 3px rgba(0,0,0,0.1)',
            },
            layout: { orientation: 'multi' },
        };
    }
    /**
     * Extract colors from logo image using Sharp
     * Implemented using color quantization and dominant color extraction
     *
     * @param logoUrl - URL of the logo image to extract colors from
     * @returns Promise<string[]> - Array of hex color strings
     */
    async extractColorsFromLogo(logoUrl) {
        try {
            console.log(`🎨 Extracting colors from logo: ${logoUrl}`);
            // Fetch the image
            const response = await fetch(logoUrl, { timeout: 10000 });
            if (!response.ok) {
                throw new Error(`Failed to fetch logo: ${response.statusText}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            // Resize to manageable size for analysis and extract pixel data
            const { data, info } = await sharp(buffer)
                .resize(100, 100, { fit: 'inside' })
                .raw()
                .toBuffer({ resolveWithObject: true });
            // Extract dominant colors using k-means clustering
            const colors = this.extractDominantColors(data, info.channels, 8);
            // Filter out grays and near-whites/blacks
            const filteredColors = colors.filter(color => {
                const saturation = this.getColorSaturation(color);
                const brightness = this.getColorBrightness(color);
                return saturation > 0.15 && brightness > 0.1 && brightness < 0.95;
            });
            console.log(`✅ Extracted ${filteredColors.length} colors from logo`);
            return filteredColors.slice(0, 6); // Return top 6 colors
        }
        catch (error) {
            console.error('Logo color extraction error:', error);
            return [];
        }
    }
    /**
     * Extract dominant colors from image data using simple color quantization
     */
    extractDominantColors(data, channels, numColors) {
        const colorMap = new Map();
        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < data.length; i += channels * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = channels === 4 ? data[i + 3] : 255;
            // Skip transparent pixels
            if (a < 128)
                continue;
            // Quantize to reduce color space (group similar colors)
            const qr = Math.round(r / 32) * 32;
            const qg = Math.round(g / 32) * 32;
            const qb = Math.round(b / 32) * 32;
            const key = `${qr},${qg},${qb}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
        }
        // Sort by frequency and convert to hex
        const sortedColors = Array.from(colorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, numColors)
            .map(([rgb]) => {
            const [r, g, b] = rgb.split(',').map(Number);
            return this.rgbToHex(r, g, b);
        });
        return sortedColors;
    }
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    getColorSaturation(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb)
            return 0;
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        if (max === 0)
            return 0;
        return (max - min) / max;
    }
    getColorBrightness(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb)
            return 0;
        return Math.max(rgb.r, rgb.g, rgb.b) / 255;
    }
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    /**
     * Merge colors from multiple sources, prioritizing unique and saturated colors
     */
    mergeColorSources(cssColors, logoColors) {
        const merged = [...cssColors, ...logoColors];
        const unique = Array.from(new Set(merged));
        return unique.slice(0, 8);
    }
    /**
     * Build fallback theme using defaults
     */
    buildFallbackTheme() {
        const defaultTheme = getDefaultTheme();
        return {
            theme: defaultTheme,
            light: defaultTheme,
            dark: this.createDarkVariant(defaultTheme),
            confidence: 0,
            source: 'fallback',
            swatch: [
                defaultTheme.colors.primary,
                defaultTheme.colors.secondary,
                defaultTheme.colors.accent,
            ],
        };
    }
    /**
     * Create a dark variant from a light theme
     */
    createDarkVariant(lightTheme) {
        return {
            ...lightTheme,
            id: `${lightTheme.id}-dark`,
            name: `${lightTheme.name} (Dark)`,
            colors: {
                ...lightTheme.colors,
                background: '#0f172a',
                surface: '#1e293b',
                text: '#f1f5f9',
                text_secondary: '#94a3b8',
                border: '#334155',
                code_bg: '#1e293b',
            },
        };
    }
    /**
     * Check if a color is light or dark
     */
    isLightColor(color) {
        // Simple brightness check based on hex
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
    }
}
/**
 * Generate CSS variables from a theme for use in exports
 */
export function generateThemeCSSVariables(theme) {
    return `
:root {
  /* Colors */
  --primary: ${theme.colors.primary};
  --secondary: ${theme.colors.secondary};
  --accent: ${theme.colors.accent};
  --background: ${theme.colors.background};
  --surface: ${theme.colors.surface};
  --text: ${theme.colors.text};
  --text-secondary: ${theme.colors.text_secondary};
  --border: ${theme.colors.border};
  --code-bg: ${theme.colors.code_bg};
  --success: ${theme.colors.success};
  --warning: ${theme.colors.warning};
  --error: ${theme.colors.error};

  /* Typography */
  --font-family: ${theme.typography.font_family};
  --heading-font: ${theme.typography.heading_font};
  --code-font: ${theme.typography.code_font};
  --base-size: ${theme.typography.base_size};
  --line-height: ${theme.typography.line_height};

  /* Spacing */
  --section-spacing: ${theme.spacing.section};
  --paragraph-spacing: ${theme.spacing.paragraph};
  --list-item-spacing: ${theme.spacing.list_item};

  /* Styling */
  --border-radius: ${theme.styling.border_radius};
  --code-border-radius: ${theme.styling.code_border_radius};
  --shadow: ${theme.styling.shadow};
}
  `.trim();
}
// Export singleton instance
export const themeOrchestrator = new ThemeOrchestrator();
