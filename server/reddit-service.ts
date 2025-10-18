import fetch from 'node-fetch';

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  url: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  created: string;
  author: string;
  trustScore: number;
  flair?: string;
}

export interface RedditSearchResult {
  posts: RedditPost[];
  totalResults: number;
  qualityScore: number;
}

export class RedditService {
  private baseUrl = 'https://www.reddit.com';
  private userAgent = 'AI-Documentation-Generator/1.0';

  /**
   * Search Reddit for relevant posts
   */
  async searchPosts(query: string, maxResults: number = 10): Promise<RedditSearchResult> {
    try {
      console.log(`🔍 Searching Reddit for "${query}"...`);
      
      // Search across multiple relevant subreddits
      const subreddits = [
        'webdev', 'learnprogramming', 'programming', 'javascript', 'reactjs', 
        'vuejs', 'angular', 'node', 'python', 'java', 'csharp', 'php',
        'webdev', 'frontend', 'backend', 'devops', 'database', 'api'
      ];

      const searchPromises = subreddits.slice(0, 5).map(subreddit => 
        this.searchSubreddit(subreddit, query, Math.ceil(maxResults / 5))
      );

      const results = await Promise.all(searchPromises);
      const allPosts = results.flatMap(result => result.posts);
      
      // Sort by upvotes and filter quality
      const filteredPosts = allPosts
        .filter(post => post.upvotes >= 5) // Minimum engagement
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(filteredPosts);

      console.log(`✅ Found ${filteredPosts.length} Reddit posts`);
      
      return {
        posts: filteredPosts,
        totalResults: filteredPosts.length,
        qualityScore
      };

    } catch (error) {
      console.error('Reddit search error:', error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search specific subreddit
   */
  private async searchSubreddit(subreddit: string, query: string, limit: number): Promise<RedditSearchResult> {
    try {
      const searchUrl = `${this.baseUrl}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit}&t=year`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        return { posts: [], totalResults: 0, qualityScore: 0 };
      }

      const posts: RedditPost[] = data.data.children.map((item: any) => {
        const post = item.data;
        return {
          id: post.id,
          title: post.title,
          content: post.selftext || '',
          url: `https://reddit.com${post.permalink}`,
          subreddit: post.subreddit,
          upvotes: post.ups || 0,
          comments: post.num_comments || 0,
          created: new Date(post.created_utc * 1000).toISOString(),
          author: post.author,
          trustScore: this.calculateTrustScore(post),
          flair: post.link_flair_text
        };
      });

      return {
        posts,
        totalResults: posts.length,
        qualityScore: this.calculateQualityScore(posts)
      };

    } catch (error) {
      console.error(`Reddit subreddit search error (r/${subreddit}):`, error);
      return { posts: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Calculate trust score for a Reddit post
   */
  private calculateTrustScore(post: any): number {
    let score = 0.5; // Base score

    // Upvotes factor (0-0.3)
    const upvotes = post.ups || 0;
    if (upvotes > 100) score += 0.3;
    else if (upvotes > 50) score += 0.2;
    else if (upvotes > 10) score += 0.1;

    // Comments factor (0-0.2)
    const comments = post.num_comments || 0;
    if (comments > 20) score += 0.2;
    else if (comments > 5) score += 0.1;

    // Subreddit quality factor (0-0.2)
    const qualitySubreddits = ['webdev', 'learnprogramming', 'programming', 'javascript', 'reactjs'];
    if (qualitySubreddits.includes(post.subreddit)) {
      score += 0.2;
    }

    // Gilded factor (0-0.1)
    if (post.gilded > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(posts: RedditPost[]): number {
    if (posts.length === 0) return 0;

    const avgTrustScore = posts.reduce((sum, post) => sum + post.trustScore, 0) / posts.length;
    const engagementScore = posts.reduce((sum, post) => sum + (post.upvotes + post.comments), 0) / posts.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 100, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Get trending posts from specific subreddits
   */
  async getTrendingPosts(subreddits: string[] = ['webdev', 'programming'], limit: number = 5): Promise<RedditPost[]> {
    try {
      const trendingPromises = subreddits.map(subreddit => 
        this.getSubredditPosts(subreddit, 'hot', limit)
      );

      const results = await Promise.all(trendingPromises);
      return results.flat().sort((a, b) => b.upvotes - a.upvotes).slice(0, limit);

    } catch (error) {
      console.error('Reddit trending posts error:', error);
      return [];
    }
  }

  /**
   * Get posts from specific subreddit
   */
  private async getSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'top', limit: number): Promise<RedditPost[]> {
    try {
      const url = `${this.baseUrl}/r/${subreddit}/${sort}.json?limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        return [];
      }

      return data.data.children.map((item: any) => {
        const post = item.data;
        return {
          id: post.id,
          title: post.title,
          content: post.selftext || '',
          url: `https://reddit.com${post.permalink}`,
          subreddit: post.subreddit,
          upvotes: post.ups || 0,
          comments: post.num_comments || 0,
          created: new Date(post.created_utc * 1000).toISOString(),
          author: post.author,
          trustScore: this.calculateTrustScore(post),
          flair: post.link_flair_text
        };
      });

    } catch (error) {
      console.error(`Reddit subreddit posts error (r/${subreddit}):`, error);
      return [];
    }
  }
}

// Export singleton instance
export const redditService = new RedditService();
