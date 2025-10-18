import fetch from 'node-fetch';

export interface CodeProjectArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  author: string;
  published: string;
  views: number;
  rating: number;
  votes: number;
  tags: string[];
  trustScore: number;
  content?: string;
}

export interface CodeProjectSearchResult {
  articles: CodeProjectArticle[];
  totalResults: number;
  qualityScore: number;
}

export class CodeProjectService {
  private baseUrl = 'https://www.codeproject.com';

  /**
   * Search CodeProject for relevant articles
   */
  async searchArticles(query: string, maxResults: number = 10): Promise<CodeProjectSearchResult> {
    try {
      console.log(`🔍 Searching CodeProject for "${query}"...`);
      
      // Use SerpAPI for CodeProject search as they don't have a public API
      const searchQuery = `site:codeproject.com ${query}`;
      
      // This would typically use SerpAPI, but for now we'll simulate the structure
      // In production, you'd call SerpAPI with this query
      const articles = await this.simulateCodeProjectSearch(searchQuery, maxResults);
      
      const qualityScore = this.calculateQualityScore(articles);

      console.log(`✅ Found ${articles.length} CodeProject articles`);
      
      return {
        articles,
        totalResults: articles.length,
        qualityScore
      };

    } catch (error) {
      console.error('CodeProject search error:', error);
      return { articles: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search using SerpAPI for CodeProject articles
   */
  private async simulateCodeProjectSearch(query: string, maxResults: number): Promise<CodeProjectArticle[]> {
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      console.warn('⚠️ SERPAPI_KEY not set - CodeProject search disabled');
      return [];
    }

    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.append('api_key', serpApiKey);
      url.searchParams.append('q', query);
      url.searchParams.append('num', maxResults.toString());
      url.searchParams.append('engine', 'google');

      const response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.warn(`SerpAPI request failed: ${response.status}`);
        return [];
      }

      const data = await response.json() as { organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
      }> };

      if (!data.organic_results || data.organic_results.length === 0) {
        return [];
      }

      return data.organic_results.map((result, index) => ({
        id: `cp-${index}-${Date.now()}`,
        title: result.title || '',
        summary: result.snippet || '',
        url: result.link || '',
        author: 'Unknown',
        published: new Date().toISOString(),
        views: 0,
        rating: 4.0,
        votes: 10,
        tags: [],
        trustScore: 0.85  // CodeProject trust score as per recommendations
      }));

    } catch (error) {
      console.error('SerpAPI CodeProject search error:', error);
      return [];
    }
  }

  /**
   * Search by technology/category
   */
  async searchByCategory(category: string, maxResults: number = 10): Promise<CodeProjectSearchResult> {
    try {
      const categories = {
        'javascript': ['javascript', 'js', 'ecmascript'],
        'react': ['react', 'reactjs', 'jsx'],
        'vue': ['vue', 'vuejs'],
        'angular': ['angular', 'angularjs'],
        'node': ['nodejs', 'node.js'],
        'python': ['python', 'django', 'flask'],
        'csharp': ['c#', 'csharp', 'dotnet'],
        'web': ['web', 'html', 'css', 'frontend', 'backend']
      };

      const tags = categories[category.toLowerCase()] || [category];
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
      console.error('CodeProject category search error:', error);
      return { articles: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Calculate trust score for a CodeProject article
   */
  private calculateTrustScore(article: CodeProjectArticle): number {
    let score = 0.5; // Base score

    // Views factor (0-0.3)
    const views = article.views || 0;
    if (views > 10000) score += 0.3;
    else if (views > 5000) score += 0.2;
    else if (views > 1000) score += 0.1;

    // Rating factor (0-0.3)
    const rating = article.rating || 0;
    if (rating > 4.5) score += 0.3;
    else if (rating > 4.0) score += 0.2;
    else if (rating > 3.5) score += 0.1;

    // Votes factor (0-0.2)
    const votes = article.votes || 0;
    if (votes > 50) score += 0.2;
    else if (votes > 20) score += 0.1;

    // Tag quality factor (0-0.2)
    const qualityTags = ['tutorial', 'how-to', 'beginner', 'advanced', 'best-practices'];
    const hasQualityTags = article.tags.some(tag => qualityTags.includes(tag.toLowerCase()));
    if (hasQualityTags) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(articles: CodeProjectArticle[]): number {
    if (articles.length === 0) return 0;

    const avgTrustScore = articles.reduce((sum, article) => sum + article.trustScore, 0) / articles.length;
    const engagementScore = articles.reduce((sum, article) => sum + (article.views + article.votes), 0) / articles.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 5000, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Remove duplicate articles based on URL
   */
  private removeDuplicates(articles: CodeProjectArticle[]): CodeProjectArticle[] {
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
   * Get trending articles by category
   */
  async getTrendingArticles(category: string = 'web', limit: number = 10): Promise<CodeProjectArticle[]> {
    try {
      // This would typically use CodeProject's RSS feed or trending API
      // For now, we'll simulate with a search
      const result = await this.searchByCategory(category, limit);
      return result.articles;

    } catch (error) {
      console.error('CodeProject trending articles error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const codeProjectService = new CodeProjectService();
