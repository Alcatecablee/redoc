import { Router } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const router = Router();

interface ComplexityFactors {
  pageCount: number;
  estimatedPages: number;
  hasGitHub: boolean;
  githubRepoCount: number;
  hasStackOverflow: boolean;
  stackOverflowQuestions: number;
  hasYouTube: boolean;
  youtubeVideos: number;
  hasReddit: boolean;
  redditDiscussions: number;
  domainAuthority: 'low' | 'medium' | 'high';
  contentDepth: 'shallow' | 'medium' | 'deep';
  technicalComplexity: 'simple' | 'moderate' | 'complex';
}

interface PricingQuote {
  basePrice: number;
  complexityFactors: ComplexityFactors;
  breakdown: {
    basePages: number;
    externalResearch: number;
    complexity: number;
  };
  estimatedTotal: number;
  isFree: boolean;
  freeReason?: string;
  currency: string;
}

// Quick sitemap check
async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const sitemapUrl = `${url}/sitemap.xml`;
    const response = await fetch(sitemapUrl, { timeout: 5000 });
    if (!response.ok) return [];
    
    const xml = await response.text();
    const urls = xml.match(/<loc>(.*?)<\/loc>/g) || [];
    return urls.map(u => u.replace(/<\/?loc>/g, ''));
  } catch (e) {
    return [];
  }
}

// Quick page count estimation
async function estimatePageCount(url: string): Promise<number> {
  const sitemap = await fetchSitemap(url);
  if (sitemap.length > 0) return sitemap.length;
  
  // Fallback: check homepage for links
  try {
    const response = await fetch(url, { timeout: 5000 });
    const html = await response.text();
    const $ = cheerio.load(html);
    const internalLinks = $('a[href^="/"], a[href^="' + url + '"]').length;
    // Estimate based on link count, with reasonable min/max for pricing accuracy
    // Min 5 (tiny sites), soft cap at 100 (very large sites priced accurately)
    return Math.min(Math.max(internalLinks, 5), 100);
  } catch (e) {
    return 10; // Default estimate
  }
}

// Check for external resources
async function checkExternalResources(siteName: string, url: string) {
  const factors = {
    hasGitHub: false,
    githubRepoCount: 0,
    hasStackOverflow: false,
    stackOverflowQuestions: 0,
    hasYouTube: false,
    youtubeVideos: 0,
    hasReddit: false,
    redditDiscussions: 0,
  };

  // Extract domain/product name from URL
  const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
  
  // Quick GitHub check (simplified - real implementation would use GitHub API)
  try {
    const ghResponse = await fetch(`https://api.github.com/search/repositories?q=${domain}&per_page=5`, {
      headers: { 'Accept': 'application/json' },
      timeout: 5000
    });
    if (ghResponse.ok) {
      const ghData = await ghResponse.json() as { total_count: number };
      factors.hasGitHub = ghData.total_count > 0;
      factors.githubRepoCount = Math.min(ghData.total_count, 10);
    }
  } catch (e) {
    console.warn('GitHub check failed:', e);
  }

  // Quick Stack Overflow check (simplified)
  try {
    const soResponse = await fetch(`https://api.stackexchange.com/2.3/search?order=desc&sort=activity&intitle=${domain}&site=stackoverflow`, {
      timeout: 5000
    });
    if (soResponse.ok) {
      const soData = await soResponse.json() as { items: any[] };
      factors.hasStackOverflow = soData.items.length > 0;
      factors.stackOverflowQuestions = soData.items.length;
    }
  } catch (e) {
    console.warn('StackOverflow check failed:', e);
  }

  return factors;
}

// Analyze technical complexity from homepage
async function analyzeTechnicalComplexity(url: string): Promise<'simple' | 'moderate' | 'complex'> {
  try {
    const response = await fetch(url, { timeout: 5000 });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Check for technical indicators
    const hasAPIDoc = html.toLowerCase().includes('api') || html.toLowerCase().includes('endpoint');
    const hasCodeSamples = $('pre code').length > 0 || $('code').length > 5;
    const hasMultipleTechnologies = ($('script[src]').length > 3);
    
    if (hasAPIDoc && hasCodeSamples && hasMultipleTechnologies) return 'complex';
    if (hasAPIDoc || hasCodeSamples) return 'moderate';
    return 'simple';
  } catch (e) {
    return 'simple';
  }
}

// Calculate pricing based on NEW quotation model
function calculatePricing(factors: ComplexityFactors): PricingQuote {
  // Count total resources across all platforms
  const totalResources = 
    factors.stackOverflowQuestions + 
    factors.githubRepoCount + 
    factors.youtubeVideos + 
    factors.redditDiscussions +
    factors.estimatedPages; // Include pages as resources
  
  // Determine complexity tier based on resource count
  let complexityMultiplier = 1.0;
  let complexityTier = 'Low';
  
  if (totalResources > 200) {
    complexityMultiplier = 2.0;
    complexityTier = 'High';
  } else if (totalResources > 50) {
    complexityMultiplier = 1.5;
    complexityTier = 'Medium';
  }
  
  // NEW FORMULA: $300 minimum + (Resource Count × $5 × Complexity Multiplier)
  // Example: 100 resources at Medium (1.5x) = $300 + (100 × $5 × 1.5) = $300 + $750 = $1,050
  const resourceValue = totalResources * 5;
  const complexityAdjustedValue = resourceValue * complexityMultiplier;
  const baseCalculation = 300 + complexityAdjustedValue;
  
  // Cap at $5,000 for base package as per roadmap
  const basePrice = Math.min(baseCalculation, 5000);
  
  // Breakdown for transparency
  const multiplierBonus = resourceValue * (complexityMultiplier - 1);
  
  // Free tier: Very small projects (<20 resources, no external presence)
  const hasExternalPresence = factors.hasGitHub || factors.hasStackOverflow || factors.hasYouTube || factors.hasReddit;
  const isFree = totalResources < 20 && !hasExternalPresence;
  
  // Check if cap was applied
  const wasCapped = baseCalculation > 5000;
  const capDiscount = wasCapped ? baseCalculation - 5000 : 0;
  
  // Adjust breakdown to match actual payable total
  let finalBreakdown;
  if (isFree) {
    // Zero out all breakdown when free
    finalBreakdown = {
      basePages: 0,
      externalResearch: 0,
      complexity: 0,
    };
  } else if (wasCapped) {
    // Show cap discount as separate line
    finalBreakdown = {
      basePages: 300,
      externalResearch: resourceValue,
      complexity: multiplierBonus,
      capDiscount: -capDiscount, // Negative to show discount
    };
  } else {
    // Normal breakdown
    finalBreakdown = {
      basePages: 300,
      externalResearch: resourceValue,
      complexity: multiplierBonus,
    };
  }
  
  return {
    basePrice: basePrice,
    complexityFactors: {
      ...factors,
      // Add total resource count for display
      totalResources: totalResources,
      complexityTier: complexityTier,
    } as any,
    breakdown: finalBreakdown,
    estimatedTotal: isFree ? 0 : basePrice,
    isFree,
    freeReason: isFree ? `Starter project (${totalResources} resources) - FREE!` : undefined,
    currency: 'USD',
  };
}

/**
 * POST /api/analyze-complexity
 * Analyzes a URL and returns complexity factors + instant pricing quote
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL and prevent SSRF attacks
    let normalizedUrl: string;
    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP/HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
      }
      
      // TODO: Add DNS resolution + IP validation for complete SSRF protection
      // Current implementation blocks obvious attacks but may miss:
      // - Hostnames resolving to internal IPs
      // - Alternate numeric encodings (decimal IP, IPv6-mapped)
      // - HTTP redirects to internal addresses
      
      // Block internal/private IP ranges to prevent SSRF (RFC1918, loopback, link-local, cloud metadata)
      const hostname = urlObj.hostname.toLowerCase();
      const blockedPatterns = [
        'localhost',
        '127.',          // IPv4 loopback (127.0.0.0/8)
        '0.0.0.0',
        '::1',           // IPv6 loopback
        'fe80:',         // IPv6 link-local
        '169.254.',      // IPv4 link-local / AWS metadata
        '10.',           // RFC1918 private (10.0.0.0/8)
        '192.168.',      // RFC1918 private (192.168.0.0/16)
        '172.16.',       // RFC1918 private (172.16.0.0/12)
        '172.17.', '172.18.', '172.19.', // Rest of 172.16/12 range
        '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.',
        '172.28.', '172.29.', '172.30.', '172.31.',
        'metadata.google.internal',      // GCP metadata
        'metadata.azure.com',             // Azure metadata
      ];
      
      if (blockedPatterns.some(pattern => hostname.includes(pattern))) {
        return res.status(400).json({ error: 'Cannot analyze internal/private URLs' });
      }
      
      normalizedUrl = urlObj.origin + urlObj.pathname;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    console.log('📊 Analyzing complexity for:', normalizedUrl);
    
    // Run analyses in parallel
    const [estimatedPages, externalResources, technicalComplexity] = await Promise.all([
      estimatePageCount(normalizedUrl),
      checkExternalResources('', normalizedUrl),
      analyzeTechnicalComplexity(normalizedUrl),
    ]);
    
    const complexityFactors: ComplexityFactors = {
      pageCount: estimatedPages,
      estimatedPages,
      ...externalResources,
      domainAuthority: 'medium', // Simplified for now
      contentDepth: estimatedPages > 20 ? 'deep' : estimatedPages > 10 ? 'medium' : 'shallow',
      technicalComplexity,
    };
    
    const quote = calculatePricing(complexityFactors);
    
    console.log('✅ Analysis complete:', {
      pages: estimatedPages,
      external: Object.keys(externalResources).filter(k => k.startsWith('has') && (externalResources as any)[k]),
      total: quote.estimatedTotal,
      isFree: quote.isFree,
    });
    
    res.json({
      success: true,
      url: normalizedUrl,
      analysis: complexityFactors,
      quote,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Complexity analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze URL', 
      message: error.message 
    });
  }
});

export default router;
