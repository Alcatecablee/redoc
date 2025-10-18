import fetch from 'node-fetch';

export interface QuoraAnswer {
  id: string;
  question: string;
  answer: string;
  url: string;
  author: string;
  upvotes: number;
  views: number;
  created: string;
  topics: string[];
  trustScore: number;
  isExpert?: boolean;
}

export interface QuoraSearchResult {
  answers: QuoraAnswer[];
  totalResults: number;
  qualityScore: number;
}

export class QuoraService {
  private baseUrl = 'https://www.quora.com';

  /**
   * Search Quora for relevant answers
   */
  async searchAnswers(query: string, maxResults: number = 10): Promise<QuoraSearchResult> {
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

    } catch (error) {
      console.error('Quora search error:', error);
      return { answers: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Simulate Quora search (replace with actual SerpAPI call)
   */
  private async simulateQuoraSearch(query: string, maxResults: number): Promise<QuoraAnswer[]> {
    // This is a placeholder - in production, you'd use SerpAPI
    // const serpApiResults = await serpApiSearch(query, { limit: maxResults });
    
    // For now, return empty array - this would be replaced with actual SerpAPI integration
    return [];
  }

  /**
   * Search by technology topics
   */
  async searchByTopics(topics: string[], maxResults: number = 15): Promise<QuoraSearchResult> {
    try {
      const searchPromises = topics.map(topic => 
        this.searchAnswers(topic, Math.ceil(maxResults / topics.length))
      );

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

    } catch (error) {
      console.error('Quora topic search error:', error);
      return { answers: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search for comparison questions
   */
  async searchComparisons(technologies: string[], maxResults: number = 10): Promise<QuoraSearchResult> {
    try {
      const comparisonQueries = [
        `${technologies[0]} vs ${technologies[1]}`,
        `difference between ${technologies[0]} and ${technologies[1]}`,
        `which is better ${technologies[0]} or ${technologies[1]}`,
        `pros and cons of ${technologies[0]} vs ${technologies[1]}`
      ];

      const searchPromises = comparisonQueries.map(query => 
        this.searchAnswers(query, Math.ceil(maxResults / comparisonQueries.length))
      );

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

    } catch (error) {
      console.error('Quora comparison search error:', error);
      return { answers: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Calculate trust score for a Quora answer
   */
  private calculateTrustScore(answer: QuoraAnswer): number {
    let score = 0.5; // Base score

    // Upvotes factor (0-0.3)
    const upvotes = answer.upvotes || 0;
    if (upvotes > 100) score += 0.3;
    else if (upvotes > 50) score += 0.2;
    else if (upvotes > 10) score += 0.1;

    // Views factor (0-0.2)
    const views = answer.views || 0;
    if (views > 10000) score += 0.2;
    else if (views > 5000) score += 0.1;

    // Expert factor (0-0.2)
    if (answer.isExpert) score += 0.2;

    // Topic quality factor (0-0.3)
    const qualityTopics = ['programming', 'software-development', 'web-development', 'technology', 'computer-science'];
    const hasQualityTopics = answer.topics.some(topic => qualityTopics.includes(topic.toLowerCase()));
    if (hasQualityTopics) score += 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(answers: QuoraAnswer[]): number {
    if (answers.length === 0) return 0;

    const avgTrustScore = answers.reduce((sum, answer) => sum + answer.trustScore, 0) / answers.length;
    const engagementScore = answers.reduce((sum, answer) => sum + (answer.upvotes + answer.views), 0) / answers.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 1000, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Remove duplicate answers based on URL
   */
  private removeDuplicates(answers: QuoraAnswer[]): QuoraAnswer[] {
    const seen = new Set<string>();
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
  async getTrendingAnswers(topics: string[] = ['programming', 'technology'], limit: number = 10): Promise<QuoraAnswer[]> {
    try {
      const result = await this.searchByTopics(topics, limit);
      return result.answers;

    } catch (error) {
      console.error('Quora trending answers error:', error);
      return [];
    }
  }
}

// Export singleton instance
export const quoraService = new QuoraService();
