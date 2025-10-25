import { createAIProvider } from './ai-provider';
import { validateSEOMetadata as validateSEOResponse } from './utils/ai-validation';

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  keywords: string[];
  canonicalUrl?: string;
  robots?: string;
}

export interface SEOAnalysis {
  primaryKeywords: string[];
  secondaryKeywords: string[];
  searchIntent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  competitionLevel: 'low' | 'medium' | 'high';
  searchVolume: number;
  difficultyScore: number;
}

export class SEOService {
  private aiProvider: ReturnType<typeof createAIProvider>;

  constructor() {
    try {
      this.aiProvider = createAIProvider();
    } catch (error) {
      console.error('Failed to initialize AI provider for SEO:', error);
      this.aiProvider = null as any;
    }
  }

  /**
   * Generate comprehensive SEO metadata for documentation
   */
  async generateSEOMetadata(
    productName: string,
    targetUrl: string,
    contentSummary: string,
    sources: {
      stackOverflow: number;
      github: number;
      youtube: number;
      reddit: number;
      devTo: number;
      codeProject: number;
      stackExchange: number;
      quora: number;
      forums: number;
    }
  ): Promise<SEOMetadata> {
    try {
      console.log(`🔍 Generating SEO metadata for ${productName}...`);

      const prompt = `You are an SEO expert creating metadata for ${productName} documentation.

Content Summary: ${contentSummary.substring(0, 2000)}
Target URL: ${targetUrl}
Sources Available: ${Object.entries(sources).map(([key, value]) => `${key}: ${value}`).join(', ')}

Task:
1. Identify 3-5 primary keywords based on content and sources (e.g., "${productName} tutorial", "${productName} setup guide")
2. Generate a meta title (60-70 chars), meta description (150-160 chars), and Open Graph tags
3. Ensure keywords align with user intent (tutorials, troubleshooting, setup)
4. Include target URL branding in meta description

Output as JSON:
{
  "metaTitle": "string",
  "metaDescription": "string", 
  "ogTitle": "string",
  "ogDescription": "string",
  "ogImage": "string",
  "keywords": ["string", ...],
  "canonicalUrl": "string",
  "robots": "string"
}

Constraints:
- Prioritize long-tail keywords (e.g., "${productName} API setup guide")
- Use target URL in meta description for branding
- Optimize for search intent (informational/tutorial)
- Keep meta title under 70 characters
- Keep meta description under 160 characters`;

      if (!this.aiProvider) {
        return this.getDefaultSEOMetadata(productName, targetUrl);
      }

      const response = await this.aiProvider.generateCompletion([
        { role: 'user', content: prompt }
      ], { jsonMode: true });
      
      const metadata = validateSEOResponse(response.content);
      return this.validateSEOMetadata(metadata, productName, targetUrl);

    } catch (error) {
      console.error('SEO metadata generation error:', error);
      return this.getDefaultSEOMetadata(productName, targetUrl);
    }
  }

  /**
   * Analyze keywords and search intent
   */
  async analyzeKeywords(
    productName: string,
    contentSummary: string,
    sources: any
  ): Promise<SEOAnalysis> {
    try {
      const prompt = `Analyze keywords and search intent for ${productName} documentation.

Content Summary: ${contentSummary.substring(0, 1500)}
Sources: ${JSON.stringify(sources, null, 2)}

Task:
1. Identify primary and secondary keywords
2. Determine search intent (informational/transactional/navigational/commercial)
3. Estimate competition level and search volume
4. Calculate difficulty score (1-10)

Output as JSON:
{
  "primaryKeywords": ["string", ...],
  "secondaryKeywords": ["string", ...],
  "searchIntent": "informational|transactional|navigational|commercial",
  "competitionLevel": "low|medium|high",
  "searchVolume": number,
  "difficultyScore": number
}`;

      if (!this.aiProvider) {
        return this.getDefaultSEOAnalysis(productName);
      }

      const response = await this.aiProvider.generateCompletion([
        { role: 'user', content: prompt }
      ], { jsonMode: true });
      
      try {
        return JSON.parse(response.content);
      } catch (parseError) {
        console.error('SEO analysis parsing error:', parseError);
        return this.getDefaultSEOAnalysis(productName);
      }

    } catch (error) {
      console.error('SEO keyword analysis error:', error);
      return this.getDefaultSEOAnalysis(productName);
    }
  }

  /**
   * Generate keyword-optimized content suggestions
   */
  async generateKeywordSuggestions(
    productName: string,
    sectionName: string,
    keywords: string[]
  ): Promise<string[]> {
    try {
      const prompt = `Generate keyword-optimized content suggestions for ${productName} ${sectionName} section.

Target Keywords: ${keywords.join(', ')}

Task:
1. Suggest 5-7 keyword variations for the ${sectionName} section
2. Include long-tail keywords and semantic variations
3. Focus on user search intent (tutorials, troubleshooting, setup)

Output as JSON array of strings:
["keyword1", "keyword2", ...]`;

      if (!this.aiProvider) {
        return this.getDefaultKeywordSuggestions(productName, sectionName);
      }

      const response = await this.aiProvider.generateCompletion([
        { role: 'user', content: prompt }
      ], { jsonMode: true });
      
      try {
        return JSON.parse(response.content);
      } catch (parseError) {
        console.error('Keyword suggestions parsing error:', parseError);
        return this.getDefaultKeywordSuggestions(productName, sectionName);
      }

    } catch (error) {
      console.error('Keyword suggestions generation error:', error);
      return this.getDefaultKeywordSuggestions(productName, sectionName);
    }
  }

  /**
   * Validate SEO metadata
   */
  private validateSEOMetadata(metadata: any, productName: string, targetUrl: string): SEOMetadata {
    return {
      metaTitle: metadata.metaTitle || `${productName} Documentation - Complete Guide`,
      metaDescription: metadata.metaDescription || `Comprehensive ${productName} documentation with tutorials, troubleshooting, and best practices.`,
      ogTitle: metadata.ogTitle || metadata.metaTitle || `${productName} Documentation`,
      ogDescription: metadata.ogDescription || metadata.metaDescription || `Learn ${productName} with our comprehensive documentation.`,
      ogImage: metadata.ogImage || `${targetUrl}/og-image.png`,
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [`${productName} tutorial`, `${productName} guide`],
      canonicalUrl: metadata.canonicalUrl || targetUrl,
      robots: metadata.robots || 'index, follow'
    };
  }

  /**
   * Get default SEO metadata
   */
  private getDefaultSEOMetadata(productName: string, targetUrl: string): SEOMetadata {
    return {
      metaTitle: `${productName} Documentation - Complete Guide`,
      metaDescription: `Comprehensive ${productName} documentation with tutorials, troubleshooting, and best practices. Learn ${productName} with our detailed guides.`,
      ogTitle: `${productName} Documentation`,
      ogDescription: `Learn ${productName} with our comprehensive documentation and tutorials.`,
      ogImage: `${targetUrl}/og-image.png`,
      keywords: [`${productName} tutorial`, `${productName} guide`, `${productName} documentation`],
      canonicalUrl: targetUrl,
      robots: 'index, follow'
    };
  }

  /**
   * Get default SEO analysis
   */
  private getDefaultSEOAnalysis(productName: string): SEOAnalysis {
    return {
      primaryKeywords: [`${productName} tutorial`, `${productName} guide`],
      secondaryKeywords: [`${productName} setup`, `${productName} documentation`],
      searchIntent: 'informational',
      competitionLevel: 'medium',
      searchVolume: 1000,
      difficultyScore: 5
    };
  }

  /**
   * Get default keyword suggestions
   */
  private getDefaultKeywordSuggestions(productName: string, sectionName: string): string[] {
    return [
      `${productName} ${sectionName}`,
      `${productName} ${sectionName} tutorial`,
      `${productName} ${sectionName} guide`,
      `how to ${sectionName} ${productName}`,
      `${productName} ${sectionName} best practices`
    ];
  }

  /**
   * Generate SEO-friendly URL slug
   */
  generateURLSlug(productName: string, sectionName?: string): string {
    const baseSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (sectionName) {
      const sectionSlug = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `${baseSlug}-${sectionSlug}`;
    }
    return baseSlug;
  }

  /**
   * Calculate SEO score based on metadata quality
   */
  calculateSEOScore(metadata: SEOMetadata): number {
    let score = 0;

    // Title length (0-20 points)
    if (metadata.metaTitle.length >= 50 && metadata.metaTitle.length <= 70) {
      score += 20;
    } else if (metadata.metaTitle.length >= 40 && metadata.metaTitle.length <= 80) {
      score += 15;
    } else {
      score += 10;
    }

    // Description length (0-20 points)
    if (metadata.metaDescription.length >= 140 && metadata.metaDescription.length <= 160) {
      score += 20;
    } else if (metadata.metaDescription.length >= 120 && metadata.metaDescription.length <= 180) {
      score += 15;
    } else {
      score += 10;
    }

    // Keywords count (0-20 points)
    if (metadata.keywords.length >= 3 && metadata.keywords.length <= 5) {
      score += 20;
    } else if (metadata.keywords.length >= 2 && metadata.keywords.length <= 7) {
      score += 15;
    } else {
      score += 10;
    }

    // Open Graph tags (0-20 points)
    if (metadata.ogTitle && metadata.ogDescription && metadata.ogImage) {
      score += 20;
    } else if (metadata.ogTitle && metadata.ogDescription) {
      score += 15;
    } else {
      score += 10;
    }

    // Canonical URL (0-10 points)
    if (metadata.canonicalUrl) {
      score += 10;
    }

    // Robots meta (0-10 points)
    if (metadata.robots && metadata.robots.includes('index')) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}

// Export singleton instance
export const seoService = new SEOService();
