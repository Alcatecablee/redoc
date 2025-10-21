import fetch from 'node-fetch';
export class ForumsService {
    forums = [
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
    async searchForums(query, maxResults = 10) {
        try {
            console.log(`🔍 Searching official forums for "${query}"...`);
            const searchPromises = this.forums.slice(0, 3).map(forum => this.searchForum(forum, query, Math.ceil(maxResults / 3)));
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
        }
        catch (error) {
            console.error('Forums search error:', error);
            return { posts: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Search specific forum
     */
    async searchForum(forum, query, limit) {
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
        }
        catch (error) {
            console.error(`Forum search error (${forum.name}):`, error);
            return { posts: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Search using SerpAPI for forum posts
     */
    async simulateForumSearch(forum, query, limit) {
        const serpApiKey = process.env.SERPAPI_KEY;
        if (!serpApiKey) {
            console.warn('⚠️ SERPAPI_KEY not set - Forum search disabled');
            return [];
        }
        try {
            const url = new URL('https://serpapi.com/search');
            url.searchParams.append('api_key', serpApiKey);
            url.searchParams.append('q', query);
            url.searchParams.append('num', limit.toString());
            url.searchParams.append('engine', 'google');
            const response = await fetch(url.toString(), {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                console.warn(`SerpAPI request failed: ${response.status}`);
                return [];
            }
            const data = await response.json();
            if (!data.organic_results || data.organic_results.length === 0) {
                return [];
            }
            return data.organic_results.map((result, index) => ({
                id: `forum-${index}-${Date.now()}`,
                title: result.title || '',
                content: result.snippet || '',
                url: result.link || '',
                forum: forum.name,
                author: 'Unknown',
                replies: 0,
                views: 0,
                created: new Date().toISOString(),
                tags: [],
                trustScore: 0.85, // Official forum trust score as per recommendations
                isOfficial: true,
                isSticky: false
            }));
        }
        catch (error) {
            console.error('SerpAPI Forum search error:', error);
            return [];
        }
    }
    /**
     * Search by product-specific forums
     */
    async searchByProduct(productName, maxResults = 15) {
        try {
            const productForums = this.forums.filter(forum => forum.name.toLowerCase().includes(productName.toLowerCase()) ||
                productName.toLowerCase().includes(forum.name.toLowerCase()));
            if (productForums.length === 0) {
                // Fallback to general search
                return this.searchForums(productName, maxResults);
            }
            const searchPromises = productForums.map(forum => this.searchForum(forum, productName, Math.ceil(maxResults / productForums.length)));
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
        }
        catch (error) {
            console.error('Product-specific forum search error:', error);
            return { posts: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Search for troubleshooting posts
     */
    async searchTroubleshooting(productName, maxResults = 10) {
        try {
            const troubleshootingQueries = [
                `${productName} error`,
                `${productName} not working`,
                `${productName} issue`,
                `${productName} problem`,
                `${productName} bug`,
                `${productName} fix`
            ];
            const searchPromises = troubleshootingQueries.map(query => this.searchForums(query, Math.ceil(maxResults / troubleshootingQueries.length)));
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
        }
        catch (error) {
            console.error('Troubleshooting forum search error:', error);
            return { posts: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Calculate trust score for a forum post
     */
    calculateTrustScore(post) {
        let score = 0.5; // Base score
        // Official forum factor (0-0.3)
        if (post.isOfficial)
            score += 0.3;
        // Sticky post factor (0-0.2)
        if (post.isSticky)
            score += 0.2;
        // Replies factor (0-0.2)
        const replies = post.replies || 0;
        if (replies > 10)
            score += 0.2;
        else if (replies > 5)
            score += 0.1;
        // Views factor (0-0.1)
        const views = post.views || 0;
        if (views > 1000)
            score += 0.1;
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
    calculateQualityScore(posts) {
        if (posts.length === 0)
            return 0;
        const avgTrustScore = posts.reduce((sum, post) => sum + post.trustScore, 0) / posts.length;
        const engagementScore = posts.reduce((sum, post) => sum + (post.replies + post.views), 0) / posts.length;
        // Normalize engagement score (0-1)
        const normalizedEngagement = Math.min(engagementScore / 100, 1);
        return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
    }
    /**
     * Remove duplicate posts based on URL
     */
    removeDuplicates(posts) {
        const seen = new Set();
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
    async getTrendingPosts(limit = 10) {
        try {
            const result = await this.searchForums('trending', limit);
            return result.posts;
        }
        catch (error) {
            console.error('Trending forum posts error:', error);
            return [];
        }
    }
}
// Export singleton instance
export const forumsService = new ForumsService();
