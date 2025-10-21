import fetch from 'node-fetch';
export class QuoraService {
    baseUrl = 'https://www.quora.com';
    /**
     * Search Quora for relevant answers
     */
    async searchAnswers(query, maxResults = 10) {
        try {
            console.log(`🔍 Searching Quora for "${query}"...`);
            // Use SerpAPI for Quora search as they don't have a public API
            const searchQuery = `site:quora.com ${query}`;
            // This would typically use SerpAPI, but for now we'll simulate the structure
            // In production, you'd call SerpAPI with this query
            const answers = await this.simulateQuoraSearch(searchQuery, maxResults);
            const qualityScore = this.calculateQualityScore(answers);
            console.log(`✅ Found ${answers.length} Quora answers`);
            return {
                answers,
                totalResults: answers.length,
                qualityScore
            };
        }
        catch (error) {
            console.error('Quora search error:', error);
            return { answers: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Search using SerpAPI for Quora answers
     */
    async simulateQuoraSearch(query, maxResults) {
        const serpApiKey = process.env.SERPAPI_KEY;
        if (!serpApiKey) {
            console.warn('⚠️ SERPAPI_KEY not set - Quora search disabled');
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
            const data = await response.json();
            if (!data.organic_results || data.organic_results.length === 0) {
                return [];
            }
            return data.organic_results.map((result, index) => ({
                id: `quora-${index}-${Date.now()}`,
                question: result.title || '',
                answer: result.snippet || '',
                url: result.link || '',
                author: 'Unknown',
                upvotes: 50,
                views: 1000,
                created: new Date().toISOString(),
                topics: [],
                trustScore: 0.75, // Quora trust score as per recommendations
                isExpert: false
            }));
        }
        catch (error) {
            console.error('SerpAPI Quora search error:', error);
            return [];
        }
    }
    /**
     * Search by technology topics
     */
    async searchByTopics(topics, maxResults = 15) {
        try {
            const searchPromises = topics.map(topic => this.searchAnswers(topic, Math.ceil(maxResults / topics.length)));
            const results = await Promise.all(searchPromises);
            const allAnswers = results.flatMap(result => result.answers);
            // Remove duplicates and sort by trust score
            const uniqueAnswers = this.removeDuplicates(allAnswers);
            const sortedAnswers = uniqueAnswers
                .sort((a, b) => b.trustScore - a.trustScore)
                .slice(0, maxResults);
            const qualityScore = this.calculateQualityScore(sortedAnswers);
            return {
                answers: sortedAnswers,
                totalResults: sortedAnswers.length,
                qualityScore
            };
        }
        catch (error) {
            console.error('Quora topic search error:', error);
            return { answers: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Search for comparison questions
     */
    async searchComparisons(technologies, maxResults = 10) {
        try {
            const comparisonQueries = [
                `${technologies[0]} vs ${technologies[1]}`,
                `difference between ${technologies[0]} and ${technologies[1]}`,
                `which is better ${technologies[0]} or ${technologies[1]}`,
                `pros and cons of ${technologies[0]} vs ${technologies[1]}`
            ];
            const searchPromises = comparisonQueries.map(query => this.searchAnswers(query, Math.ceil(maxResults / comparisonQueries.length)));
            const results = await Promise.all(searchPromises);
            const allAnswers = results.flatMap(result => result.answers);
            // Remove duplicates and sort by trust score
            const uniqueAnswers = this.removeDuplicates(allAnswers);
            const sortedAnswers = uniqueAnswers
                .sort((a, b) => b.trustScore - a.trustScore)
                .slice(0, maxResults);
            const qualityScore = this.calculateQualityScore(sortedAnswers);
            return {
                answers: sortedAnswers,
                totalResults: sortedAnswers.length,
                qualityScore
            };
        }
        catch (error) {
            console.error('Quora comparison search error:', error);
            return { answers: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Calculate trust score for a Quora answer
     */
    calculateTrustScore(answer) {
        let score = 0.5; // Base score
        // Upvotes factor (0-0.3)
        const upvotes = answer.upvotes || 0;
        if (upvotes > 100)
            score += 0.3;
        else if (upvotes > 50)
            score += 0.2;
        else if (upvotes > 10)
            score += 0.1;
        // Views factor (0-0.2)
        const views = answer.views || 0;
        if (views > 10000)
            score += 0.2;
        else if (views > 5000)
            score += 0.1;
        // Expert factor (0-0.2)
        if (answer.isExpert)
            score += 0.2;
        // Topic quality factor (0-0.3)
        const qualityTopics = ['programming', 'software-development', 'web-development', 'technology', 'computer-science'];
        const hasQualityTopics = answer.topics.some(topic => qualityTopics.includes(topic.toLowerCase()));
        if (hasQualityTopics)
            score += 0.3;
        return Math.min(score, 1.0);
    }
    /**
     * Calculate overall quality score for search results
     */
    calculateQualityScore(answers) {
        if (answers.length === 0)
            return 0;
        const avgTrustScore = answers.reduce((sum, answer) => sum + answer.trustScore, 0) / answers.length;
        const engagementScore = answers.reduce((sum, answer) => sum + (answer.upvotes + answer.views), 0) / answers.length;
        // Normalize engagement score (0-1)
        const normalizedEngagement = Math.min(engagementScore / 1000, 1);
        return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
    }
    /**
     * Remove duplicate answers based on URL
     */
    removeDuplicates(answers) {
        const seen = new Set();
        return answers.filter(answer => {
            if (seen.has(answer.url)) {
                return false;
            }
            seen.add(answer.url);
            return true;
        });
    }
    /**
     * Get trending answers for technology topics
     */
    async getTrendingAnswers(topics = ['programming', 'technology'], limit = 10) {
        try {
            const result = await this.searchByTopics(topics, limit);
            return result.answers;
        }
        catch (error) {
            console.error('Quora trending answers error:', error);
            return [];
        }
    }
}
// Export singleton instance
export const quoraService = new QuoraService();
