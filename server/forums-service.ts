import fetch from 'node-fetch';

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  url: string;
  forum: string;
  author: string;
  replies: number;
  views: number;
  created: string;
  tags: string[];
  trustScore: number;
  isOfficial?: boolean;
  isSticky?: boolean;
}

export interface ForumSearchResult {
  posts: ForumPost[];
  totalResults: number;
  qualityScore: number;
}

export class ForumsService {
  private forums = [
    {
      name: 'Stripe Community',
      url: 'community.stripe.com',
      searchQuery: 'site:community.stripe.com'
    },
    {
      name: 'Vercel Community',
      url: 'vercel.com/community',
      searchQuery: 'site:vercel.com/community'
    },
    {
      name: 'Supabase Community',
      url: 'supabase.com/community',
      searchQuery: 'site:supabase.com/community'
    },
    {
      name: 'Discord Developer',
      url: 'discord.com/developers',
      searchQuery: 'site:discord.com/developers'
    },
    {
      name: 'GitHub Community',
      url: 'github.community',
      searchQuery: 'site:github.community'
    }
  ];

  /**
   * Search official forums for relevant posts
   */
  async searchForums(query: string, maxResults: number = 10): Promise<ForumSearchResult> {
    try {
      console.log(`🔍 Searching official forums for "${query}"...`);
      
      const searchPromises = this.forums.slice(0, 3).map(forum => 
        this.searchForum(forum, query, Math.ceil(maxResults / 3))
      );

      const results = await Promise.all(searchPromises);
      const allPosts = results.flatMap(result => result.posts);
      
      // Remove duplicates and sort by trust score
      const uniquePosts = this.removeDuplicates(allPosts);
      const sortedPosts = uniquePosts
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedPosts);

      console.log(`✅ Found ${sortedPosts.length} forum posts`);
      
      return {
        posts: sortedPosts,
        totalResults: sortedPosts.length,
        qualityScore
      };

    } catch (error) {
      console.error('Forums search error:', error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search specific forum
   */
  private async searchForum(forum: any, query: string, limit: number): Promise<ForumSearchResult> {
    try {
      // Use SerpAPI for forum search
      const searchQuery = `${forum.searchQuery} ${query}`;
      
      // This would typically use SerpAPI, but for now we'll simulate the structure
      // In production, you'd call SerpAPI with this query
      const posts = await this.simulateForumSearch(forum, searchQuery, limit);
      
      const qualityScore = this.calculateQualityScore(posts);

      return {
        posts,
        totalResults: posts.length,
        qualityScore
      };

    } catch (error) {
      console.error(`Forum search error (${forum.name}):`, error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Simulate forum search (replace with actual SerpAPI call)
   */
  private async simulateForumSearch(forum: any, query: string, limit: number): Promise<ForumPost[]> {
    // This is a placeholder - in production, you'd use SerpAPI
    // const serpApiResults = await serpApiSearch(query, { limit });
    
    // For now, return empty array - this would be replaced with actual SerpAPI integration
    return [];
  }

  /**
   * Search by product-specific forums
   */
  async searchByProduct(productName: string, maxResults: number = 15): Promise<ForumSearchResult> {
    try {
      const productForums = this.forums.filter(forum => 
        forum.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(forum.name.toLowerCase())
      );

      if (productForums.length === 0) {
        // Fallback to general search
        return this.searchForums(productName, maxResults);
      }

      const searchPromises = productForums.map(forum => 
        this.searchForum(forum, productName, Math.ceil(maxResults / productForums.length))
      );

      const results = await Promise.all(searchPromises);
      const allPosts = results.flatMap(result => result.posts);
      
      // Remove duplicates and sort by trust score
      const uniquePosts = this.removeDuplicates(allPosts);
      const sortedPosts = uniquePosts
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedPosts);

      return {
        posts: sortedPosts,
        totalResults: sortedPosts.length,
        qualityScore
      };

    } catch (error) {
      console.error('Product-specific forum search error:', error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search for troubleshooting posts
   */
  async searchTroubleshooting(productName: string, maxResults: number = 10): Promise<ForumSearchResult> {
    try {
      const troubleshootingQueries = [
        `${productName} error`,
        `${productName} not working`,
        `${productName} issue`,
        `${productName} problem`,
        `${productName} bug`,
        `${productName} fix`
      ];

      const searchPromises = troubleshootingQueries.map(query => 
        this.searchForums(query, Math.ceil(maxResults / troubleshootingQueries.length))
      );

      const results = await Promise.all(searchPromises);
      const allPosts = results.flatMap(result => result.posts);
      
      // Remove duplicates and sort by trust score
      const uniquePosts = this.removeDuplicates(allPosts);
      const sortedPosts = uniquePosts
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedPosts);

      return {
        posts: sortedPosts,
        totalResults: sortedPosts.length,
        qualityScore
      };

    } catch (error) {
      console.error('Troubleshooting forum search error:', error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Calculate trust score for a forum post
   */
  private calculateTrustScore(post: ForumPost): number {
    let score = 0.5; // Base score

    // Official forum factor (0-0.3)
    if (post.isOfficial) score += 0.3;

    // Sticky post factor (0-0.2)
    if (post.isSticky) score += 0.2;

    // Replies factor (0-0.2)
    const replies = post.replies || 0;
    if (replies > 10) score += 0.2;
    else if (replies > 5) score += 0.1;

    // Views factor (0-0.1)
    const views = post.views || 0;
    if (views > 1000) score += 0.1;

    // Forum quality factor (0-0.2)
    const qualityForums = ['Stripe Community', 'Vercel Community', 'Supabase Community'];
    if (qualityForums.includes(post.forum)) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(posts: ForumPost[]): number {
    if (posts.length === 0) return 0;

    const avgTrustScore = posts.reduce((sum, post) => sum + post.trustScore, 0) / posts.length;
    const engagementScore = posts.reduce((sum, post) => sum + (post.replies + post.views), 0) / posts.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 100, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Remove duplicate posts based on URL
   */
  private removeDuplicates(posts: ForumPost[]): ForumPost[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      if (seen.has(post.url)) {
        return false;
      }
      seen.add(post.url);
      return true;
    });
  }

  /**
   * Get trending posts from official forums
   */
  async getTrendingPosts(limit: number = 10): Promise<ForumPost[]> {
    try {
      const result = await this.searchForums('trending', limit);
      return result.posts;

    } catch (error) {
      console.error('Trending forum posts error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const forumsService = new ForumsService();
