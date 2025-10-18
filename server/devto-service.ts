import fetch from 'node-fetch';

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  author: string;
  tags: string[];
  reactions: number;
  comments: number;
  readingTime: number;
  trustScore: number;
  content?: string;
}

export interface DevToSearchResult {
  articles: DevToArticle[];
  totalResults: number;
  qualityScore: number;
}

export class DevToService {
  private baseUrl = 'https://dev.to/api';

  /**
   * Search DEV.to for relevant articles
   */
  async searchArticles(query: string, maxResults: number = 10): Promise<DevToSearchResult> {
    try {
      console.log(`🔍 Searching DEV.to for "${query}"...`);
      
      // Search articles by tag and text
      const searchUrl = `${this.baseUrl}/articles?tag=${encodeURIComponent(query)}&per_page=${maxResults}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Documentation-Generator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`DEV.to API error: ${response.status}`);
      }

      const articles: DevToArticle[] = await response.json();
      
      // Filter and enhance articles
      const filteredArticles = articles
        .filter(article => article.reactions > 5) // Minimum engagement
        .map(article => ({
          ...article,
          trustScore: this.calculateTrustScore(article)
        }))
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(filteredArticles);

      console.log(`✅ Found ${filteredArticles.length} DEV.to articles`);
      
      return {
        articles: filteredArticles,
        totalResults: filteredArticles.length,
        qualityScore
      };

    } catch (error) {
      console.error('DEV.to search error:', error);
      return { articles: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search by multiple tags for comprehensive coverage
   */
  async searchByTags(tags: string[], maxResults: number = 15): Promise<DevToSearchResult> {
    try {
      const searchPromises = tags.map(tag => 
        this.searchArticles(tag, Math.ceil(maxResults / tags.length))
      );

      const results = await Promise.all(searchPromises);
      const allArticles = results.flatMap(result => result.articles);
      
      // Remove duplicates and sort by trust score
      const uniqueArticles = this.removeDuplicates(allArticles);
      const sortedArticles = uniqueArticles
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedArticles);

      return {
        articles: sortedArticles,
        totalResults: sortedArticles.length,
        qualityScore
      };

    } catch (error) {
      console.error('DEV.to multi-tag search error:', error);
      return { articles: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Get trending articles
   */
  async getTrendingArticles(limit: number = 10): Promise<DevToArticle[]> {
    try {
      const url = `${this.baseUrl}/articles?per_page=${limit}&sort=top&top=week`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Documentation-Generator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`DEV.to trending API error: ${response.status}`);
      }

      const articles: DevToArticle[] = await response.json();
      
      return articles
        .map(article => ({
          ...article,
          trustScore: this.calculateTrustScore(article)
        }))
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, limit);

    } catch (error) {
      console.error('DEV.to trending articles error:', error);
      return [];
    }
  }

  /**
   * Calculate trust score for a DEV.to article
   */
  private calculateTrustScore(article: DevToArticle): number {
    let score = 0.85; // Base score - DEV.to quality tutorials trust level (as per recommendations)

    // Reactions factor (0-0.1)
    const reactions = article.reactions || 0;
    if (reactions > 100) score += 0.1;
    else if (reactions > 50) score += 0.05;
    else if (reactions < 5) score -= 0.05; // Low engagement

    // Comments factor (0-0.05)
    const comments = article.comments || 0;
    if (comments > 20) score += 0.05;
    else if (comments > 5) score += 0.03;

    // Reading time factor (0-0.05) - longer articles often more comprehensive
    if (article.readingTime > 10) score += 0.05;
    else if (article.readingTime > 5) score += 0.03;
    else if (article.readingTime < 3) score -= 0.05; // Too short

    // Tag quality factor (-0.05 to 0)
    const qualityTags = ['javascript', 'react', 'vue', 'angular', 'nodejs', 'python', 'webdev', 'tutorial'];
    const hasQualityTags = article.tags.some(tag => qualityTags.includes(tag.toLowerCase()));
    if (!hasQualityTags) score -= 0.05;

    return Math.max(0.7, Math.min(score, 1.0)); // Min 0.7, max 1.0
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(articles: DevToArticle[]): number {
    if (articles.length === 0) return 0;

    const avgTrustScore = articles.reduce((sum, article) => sum + article.trustScore, 0) / articles.length;
    const engagementScore = articles.reduce((sum, article) => sum + (article.reactions + article.comments), 0) / articles.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 50, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Remove duplicate articles based on URL
   */
  private removeDuplicates(articles: DevToArticle[]): DevToArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      if (seen.has(article.url)) {
        return false;
      }
      seen.add(article.url);
      return true;
    });
  }

  /**
   * Get article content (if needed for detailed analysis)
   */
  async getArticleContent(articleId: number): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/articles/${articleId}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Documentation-Generator/1.0'
        }
      });

      if (!response.ok) {
        return null;
      }

      const article = await response.json();
      return article.body_html || article.body_markdown || null;

    } catch (error) {
      console.error(`DEV.to article content error (${articleId}):`, error);
      return null;
    }
  }
}

// Export singleton instance
export const devToService = new DevToService();
