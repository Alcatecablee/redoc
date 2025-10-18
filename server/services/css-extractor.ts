import * as cheerio from 'cheerio';
import postcss, { type Root as PostCSSRoot } from 'postcss';
import { parseColor, getContrastRatio, type ThemeColors } from '@shared/themes';
import { promises as dns } from 'dns';
import https from 'https';
import http from 'http';
import net from 'net';

export interface CSSExtractionOptions {
  maxImportDepth?: number;
  timeout?: number;
  userAgent?: string;
}

export interface ExtractedColors {
  colors: string[];
  cssVariables: Record<string, string>;
  confidence: number;
  source: 'css' | 'logo' | 'fallback';
}

export interface ColorFrequency {
  color: string;
  count: number;
  weight: number;
  contexts: string[];
}

const DEFAULT_OPTIONS: Required<CSSExtractionOptions> = {
  maxImportDepth: 2,
  timeout: 5000,
  userAgent: 'Mozilla/5.0 (compatible; ThemeExtractor/1.0; +https://yourapp.com/bot)',
};

// High-value selectors that likely contain brand colors
const BRAND_SELECTORS = [
  ':root',
  'body',
  'html',
  '.btn-primary',
  '.button-primary',
  '.btn',
  'button',
  'header',
  'nav',
  '.navbar',
  '.hero',
  '.header',
  '.navigation',
  'a',
  '.link',
  '.brand',
  '.logo',
  'h1',
  'h2',
  '.primary',
  '.accent',
];

// Properties that may contain brand colors
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'background',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'fill',
  'stroke',
  'outline-color',
  'text-decoration-color',
];

// Colors to ignore (common neutrals/grays)
const IGNORE_COLORS = new Set([
  '#000000',
  '#ffffff',
  '#fff',
  '#000',
  'transparent',
  'inherit',
  'currentColor',
  'initial',
  'unset',
]);

// Cache for CSS responses with TTL
interface CacheEntry {
  data: string;
  timestamp: number;
}

export class CSSExtractor {
  private options: Required<CSSExtractionOptions>;
  private visitedUrls: Set<string> = new Set();
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_CSS_SIZE = 5 * 1024 * 1024; // 5MB limit
  private readonly PARSE_TIMEOUT = 2000; // 2 seconds for parsing
  private importDepth = 0;

  constructor(options: CSSExtractionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract brand colors from a website URL
   */
  async extractFromURL(url: string): Promise<ExtractedColors> {
    try {
      // SSRF Protection: Validate URL
      await this.validateUrl(url);

      // Fetch the HTML
      const html = await this.fetchWithTimeout(url);
      const $ = cheerio.load(html);

      // Extract stylesheet URLs
      const stylesheetUrls = this.discoverStylesheets($, url);

      // Collect all CSS rules
      const allRules: { selector: string; declarations: Map<string, string> }[] = [];
      const cssVariables: Record<string, string> = {};

      // Process each stylesheet (with cycle detection)
      for (const cssUrl of stylesheetUrls) {
        try {
          // Prevent infinite loops from cyclic @imports
          if (this.visitedUrls.has(cssUrl)) {
            console.warn(`Skipping already visited CSS URL: ${cssUrl}`);
            continue;
          }
          this.visitedUrls.add(cssUrl);

          // SSRF Protection: Validate each CSS URL
          await this.validateUrl(cssUrl);
          const css = await this.fetchWithCache(cssUrl);
          
          // Parse CSS with timeout protection
          const { rules, variables } = await this.parseCSSWithTimeout(css);
          allRules.push(...rules);
          Object.assign(cssVariables, variables);
          
          // Process @import rules (depth limited)
          await this.processImports(css, cssUrl, allRules, cssVariables, 0);
        } catch (error) {
          console.warn(`Failed to fetch CSS from ${cssUrl}:`, error);
        }
      }

      // Also parse inline styles and style tags with timeout protection
      const inlineStylePromises: Promise<void>[] = [];
      $('style').each((_, el) => {
        const css = $(el).html() || '';
        const promise = this.parseCSSWithTimeout(css).then(({ rules, variables }) => {
          allRules.push(...rules);
          Object.assign(cssVariables, variables);
        }).catch(err => console.warn('Failed to parse inline style:', err));
        inlineStylePromises.push(promise);
      });

      // Wait for all inline styles to be parsed
      await Promise.all(inlineStylePromises);

      // Extract and weight colors
      const colorFrequencies = this.extractColors(allRules, cssVariables);

      // Build final palette
      const colors = this.buildPalette(colorFrequencies);

      // Calculate confidence based on number of distinct brand colors found
      const confidence = Math.min(colors.length / 5, 1.0);

      return {
        colors,
        cssVariables,
        confidence,
        source: 'css',
      };
    } catch (error) {
      console.error('CSS extraction failed:', error);
      return {
        colors: [],
        cssVariables: {},
        confidence: 0,
        source: 'fallback',
      };
    }
  }

  /**
   * Discover all stylesheet URLs from HTML
   */
  private discoverStylesheets($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const urls: string[] = [];

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl) urls.push(absoluteUrl);
      }
    });

    return urls;
  }

  /**
   * Parse CSS and extract rules and variables
   */
  private async parseCSS(css: string): Promise<{
    rules: { selector: string; declarations: Map<string, string> }[];
    variables: Record<string, string>;
  }> {
    const rules: { selector: string; declarations: Map<string, string> }[] = [];
    const variables: Record<string, string> = {};

    try {
      const root = postcss.parse(css);

      root.walkRules((rule) => {
        const declarations = new Map<string, string>();

        rule.walkDecls((decl) => {
          // Collect CSS variables
          if (decl.prop.startsWith('--')) {
            variables[decl.prop] = decl.value;
          }

          // Collect color properties
          if (COLOR_PROPERTIES.includes(decl.prop)) {
            declarations.set(decl.prop, decl.value);
          }
        });

        if (declarations.size > 0) {
          rules.push({
            selector: rule.selector,
            declarations,
          });
        }
      });
    } catch (error) {
      console.error('PostCSS parsing error:', error);
    }

    return { rules, variables };
  }

  /**
   * Parse CSS with size-based protection (timeout not possible due to synchronous postcss.parse)
   * NOTE: PostCSS parsing is synchronous and cannot be interrupted mid-parse.
   * We rely on MAX_CSS_SIZE to prevent parsing extremely large stylesheets.
   */
  private async parseCSSWithTimeout(css: string): Promise<{
    rules: { selector: string; declarations: Map<string, string> }[];
    variables: Record<string, string>;
  }> {
    // Additional size check before parsing (belt and suspenders)
    if (css.length > this.MAX_CSS_SIZE) {
      throw new Error(`CSS too large to parse safely: ${css.length} bytes`);
    }

    // Parse directly - timeout not enforceable on synchronous postcss.parse
    return this.parseCSS(css);
  }

  /**
   * Process @import rules in CSS (depth limited)
   */
  private async processImports(
    css: string,
    baseUrl: string,
    allRules: { selector: string; declarations: Map<string, string> }[],
    cssVariables: Record<string, string>,
    depth: number
  ): Promise<void> {
    if (depth >= this.options.maxImportDepth) {
      return;
    }

    // Match @import url("...") or @import "..." or @import url(...)
    const importMatches = css.match(/@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/g);
    if (!importMatches) return;

    for (const match of importMatches) {
      const urlMatch = match.match(/@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/);
      if (!urlMatch) continue;

      const importUrl = this.resolveUrl(urlMatch[1], baseUrl);
      if (!importUrl || this.visitedUrls.has(importUrl)) continue;

      try {
        this.visitedUrls.add(importUrl);
        await this.validateUrl(importUrl);
        const importedCss = await this.fetchWithCache(importUrl);
        const { rules, variables } = await this.parseCSSWithTimeout(importedCss);
        
        allRules.push(...rules);
        Object.assign(cssVariables, variables);

        // Recursively process nested @imports
        await this.processImports(importedCss, importUrl, allRules, cssVariables, depth + 1);
      } catch (error) {
        console.warn(`Failed to process @import from ${importUrl}:`, error);
      }
    }
  }

  /**
   * Fetch CSS with caching
   */
  private async fetchWithCache(url: string): Promise<string> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await this.fetchWithTimeout(url);
    
    // Check size limit
    if (data.length > this.MAX_CSS_SIZE) {
      throw new Error(`CSS file too large: ${data.length} bytes (max ${this.MAX_CSS_SIZE})`);
    }

    this.cache.set(url, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Extract colors from CSS rules and apply weighting
   */
  private extractColors(
    rules: { selector: string; declarations: Map<string, string> }[],
    cssVariables: Record<string, string>
  ): ColorFrequency[] {
    const colorMap = new Map<string, ColorFrequency>();

    for (const rule of rules) {
      const weight = this.getSelectorWeight(rule.selector);

      for (const [prop, value] of rule.declarations) {
        const colors = this.extractColorsFromValue(value, cssVariables);

        for (const color of colors) {
          const normalized = this.normalizeColor(color);
          if (!normalized || IGNORE_COLORS.has(normalized)) continue;

          // Filter out neutral grays (low saturation colors)
          if (this.isNeutralGray(normalized)) continue;

          if (!colorMap.has(normalized)) {
            colorMap.set(normalized, {
              color: normalized,
              count: 0,
              weight: 0,
              contexts: [],
            });
          }

          const freq = colorMap.get(normalized)!;
          freq.count++;
          freq.weight += weight;
          freq.contexts.push(rule.selector);
        }
      }
    }

    return Array.from(colorMap.values()).sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get weight for a selector based on likelihood of containing brand colors
   */
  private getSelectorWeight(selector: string): number {
    const lowerSelector = selector.toLowerCase();

    // High priority selectors
    if (lowerSelector.includes(':root')) return 10;
    if (lowerSelector === 'body' || lowerSelector === 'html') return 8;

    // Check if matches any brand selector
    for (const brandSel of BRAND_SELECTORS) {
      if (lowerSelector.includes(brandSel.toLowerCase())) {
        return 5;
      }
    }

    // Default weight
    return 1;
  }

  /**
   * Extract color values from a CSS value string, resolving var() references
   */
  private extractColorsFromValue(value: string, cssVariables: Record<string, string>): string[] {
    const colors: string[] = [];

    // Resolve CSS variables
    let resolvedValue = value;
    const varMatches = value.match(/var\((--[a-zA-Z0-9-_]+)(?:,\s*([^)]+))?\)/g);
    if (varMatches) {
      for (const match of varMatches) {
        const varMatch = match.match(/var\((--[a-zA-Z0-9-_]+)(?:,\s*([^)]+))?\)/);
        if (varMatch) {
          const varName = varMatch[1];
          const fallback = varMatch[2];
          const varValue = cssVariables[varName] || fallback || '';
          resolvedValue = resolvedValue.replace(match, varValue);
        }
      }
    }

    // Extract hex colors
    const hexMatches = resolvedValue.match(/#[0-9a-fA-F]{3,8}/g);
    if (hexMatches) colors.push(...hexMatches);

    // Extract rgb/rgba
    const rgbMatches = resolvedValue.match(/rgba?\([^)]+\)/g);
    if (rgbMatches) {
      for (const rgb of rgbMatches) {
        const rgbMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          colors.push(this.rgbToHex(r, g, b));
        }
      }
    }

    // Extract hsl/hsla
    const hslMatches = resolvedValue.match(/hsla?\([^)]+\)/g);
    if (hslMatches) {
      for (const hsl of hslMatches) {
        const converted = this.hslToHex(hsl);
        if (converted) colors.push(converted);
      }
    }

    return colors;
  }

  /**
   * Build final color palette from frequency data
   */
  private buildPalette(frequencies: ColorFrequency[]): string[] {
    // Filter to get top candidates
    const topColors = frequencies.slice(0, 20);

    // Remove very similar colors (clustering)
    const palette: string[] = [];

    for (const freq of topColors) {
      const isDuplicate = palette.some((existing) => {
        return this.areColorsSimilar(freq.color, existing);
      });

      if (!isDuplicate) {
        palette.push(freq.color);
      }

      // Limit to 8 colors
      if (palette.length >= 8) break;
    }

    return palette;
  }

  /**
   * Check if two colors are perceptually similar
   */
  private areColorsSimilar(color1: string, color2: string, threshold: number = 30): boolean {
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    if (!rgb1 || !rgb2) return false;

    const deltaR = rgb1.r - rgb2.r;
    const deltaG = rgb1.g - rgb2.g;
    const deltaB = rgb1.b - rgb2.b;

    const distance = Math.sqrt(deltaR * deltaR + deltaG * deltaG + deltaB * deltaB);

    return distance < threshold;
  }

  /**
   * Check if a color is a neutral gray (low saturation)
   */
  private isNeutralGray(color: string): boolean {
    const rgb = parseColor(color);
    if (!rgb) return false;

    // Calculate saturation (difference between max and min channels)
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    
    // Avoid division by zero
    if (max === 0) return true;
    
    const saturation = (max - min) / max;

    // Filter out colors with very low saturation (< 15%)
    return saturation < 0.15;
  }

  /**
   * Normalize color to hex format
   */
  private normalizeColor(color: string): string | null {
    // Already hex
    if (color.startsWith('#')) {
      // Convert 3-digit hex to 6-digit
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
      }
      return color.toLowerCase();
    }

    return null;
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Convert HSL to hex (simplified)
   */
  private hslToHex(hsl: string): string | null {
    const match = hsl.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
    if (!match) return null;

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

    return this.rgbToHex(r, g, b);
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(href: string, baseUrl: string): string | null {
    try {
      // Already absolute
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }

      // Protocol-relative
      if (href.startsWith('//')) {
        const baseProtocol = new URL(baseUrl).protocol;
        return `${baseProtocol}${href}`;
      }

      // Relative
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }

  /**
   * Validate URL to prevent SSRF attacks
   * Resolves DNS and checks if IP is in private/loopback ranges
   * Returns the validated IP address to use for connection pinning
   */
  private async validateUrl(url: string): Promise<string> {
    try {
      const parsedUrl = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`Protocol ${parsedUrl.protocol} not allowed`);
      }

      const hostname = parsedUrl.hostname.toLowerCase();

      // Quick hostname-based blocks for known dangerous names
      const blockedHostnames = [
        'localhost',
        'metadata.google.internal',
        'metadata',
        'instance-data',
      ];
      
      if (blockedHostnames.includes(hostname)) {
        throw new Error(`Access to ${hostname} is not allowed`);
      }

      // Resolve hostname to IP address(es)
      let addresses: string[];
      try {
        const resolved = await dns.resolve(hostname);
        addresses = resolved;
      } catch (dnsError) {
        // If DNS resolution fails, also try resolve4 and resolve6
        try {
          const ipv4 = await dns.resolve4(hostname).catch(() => []);
          const ipv6 = await dns.resolve6(hostname).catch(() => []);
          addresses = [...ipv4, ...ipv6];
        } catch {
          throw new Error(`Failed to resolve hostname: ${hostname}`);
        }
      }

      if (addresses.length === 0) {
        throw new Error(`No IP addresses found for ${hostname}`);
      }

      // Check each resolved IP address
      for (const ip of addresses) {
        if (this.isPrivateOrLoopback(ip)) {
          throw new Error(`Access to private/internal IP ${ip} (${hostname}) is not allowed`);
        }
      }

      // Return the first validated IP for connection pinning
      return addresses[0];

    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Check if an IP address is private, loopback, or link-local
   */
  private isPrivateOrLoopback(ip: string): boolean {
    // IPv4 checks
    if (ip.includes('.')) {
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return true; // Invalid IP, block it
      }

      const [a, b, c, d] = parts;

      // 127.0.0.0/8 - Loopback
      if (a === 127) return true;

      // 10.0.0.0/8 - Private
      if (a === 10) return true;

      // 172.16.0.0/12 - Private (172.16.0.0 to 172.31.255.255)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 - Private
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) return true;

      // 100.64.0.0/10 - CGNAT (Carrier-Grade NAT)
      if (a === 100 && b >= 64 && b <= 127) return true;

      // 198.18.0.0/15 - Benchmark testing
      if (a === 198 && (b === 18 || b === 19)) return true;

      // 0.0.0.0/8 - Current network
      if (a === 0) return true;

      // 224.0.0.0/4 - Multicast
      if (a >= 224 && a <= 239) return true;

      // 240.0.0.0/4 - Reserved
      if (a >= 240) return true;

      return false;
    }

    // IPv6 checks
    if (ip.includes(':')) {
      const lower = ip.toLowerCase();

      // ::1 - Loopback
      if (lower === '::1' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;

      // fc00::/7 - Unique local addresses
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

      // fe80::/10 - Link-local
      if (lower.startsWith('fe80:')) return true;

      // ::ffff:0:0/96 - IPv4-mapped IPv6
      if (lower.startsWith('::ffff:')) return true;

      return false;
    }

    // Unknown format, block it
    return true;
  }

  /**
   * Fetch URL with timeout and redirect protection
   * Manually follows redirects to revalidate each target
   * Uses IP pinning to prevent DNS rebinding attacks
   */
  private async fetchWithTimeout(url: string, maxRedirects: number = 5): Promise<string> {
    let currentUrl = url;
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
      // CRITICAL: Validate URL and get the vetted IP address
      const validatedIp = await this.validateUrl(currentUrl);
      const parsedUrl = new URL(currentUrl);
      
      // Use native http/https modules with custom lookup for IP pinning
      const isHttps = parsedUrl.protocol === 'https:';
      const protocol = isHttps ? https : http;

      const responseText = await new Promise<string>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          req.destroy();
          reject(new Error('Request timeout'));
        }, this.options.timeout);

        const req = protocol.request(currentUrl, {
          // CRITICAL: Pass lookup function directly to pin connection to validated IP
          lookup: (hostname, options, callback) => {
            // Force connection to the validated IP, bypassing fresh DNS lookup
            // Determine IP family (4 for IPv4, 6 for IPv6)
            const family = net.isIP(validatedIp);
            callback(null, validatedIp, family);
          },
          headers: {
            'User-Agent': this.options.userAgent,
          },
        }, (res) => {
          clearTimeout(timeoutId);

          // Handle redirects manually
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            const location = res.headers.location;
            if (!location) {
              reject(new Error('Redirect response missing Location header'));
              return;
            }

            // Resolve relative URLs
            const redirectUrl = new URL(location, currentUrl).href;
            
            // Signal redirect to outer loop
            resolve(`__REDIRECT__${redirectUrl}`);
            return;
          }

          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            return;
          }

          // Collect response body
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8');
            resolve(text);
          });
          res.on('error', reject);
        });

        req.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });

        req.end();
      });

      // Check if this was a redirect
      if (responseText.startsWith('__REDIRECT__')) {
        const redirectUrl = responseText.substring(12);
        currentUrl = redirectUrl;
        redirectCount++;
        continue;
      }

      return responseText;
    }

    throw new Error(`Too many redirects (${maxRedirects})`);
  }
}
