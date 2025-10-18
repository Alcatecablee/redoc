import fetch from 'node-fetch';

export interface StackExchangeQuestion {
  id: number;
  title: string;
  body: string;
  url: string;
  site: string;
  score: number;
  answers: number;
  views: number;
  tags: string[];
  created: string;
  author: string;
  trustScore: number;
  acceptedAnswer?: string;
}

export interface StackExchangeSearchResult {
  questions: StackExchangeQuestion[];
  totalResults: number;
  qualityScore: number;
}

export class StackExchangeService {
  private baseUrl = 'https://api.stackexchange.com/2.3';
  private key = process.env.STACKEXCHANGE_API_KEY || '';

  // Relevant Stack Exchange sites for developers
  private sites = [
    'softwareengineering', 'programmers', 'codereview', 'softwarequality',
    'webmasters', 'webapps', 'security', 'dba', 'serverfault'
  ];

  /**
   * Search Stack Exchange network for relevant questions
   */
  async searchQuestions(query: string, maxResults: number = 10): Promise<StackExchangeSearchResult> {
    try {
      console.log(`🔍 Searching Stack Exchange for "${query}"...`);
      
      const searchPromises = this.sites.slice(0, 3).map(site => 
        this.searchSite(site, query, Math.ceil(maxResults / 3))
      );

      const results = await Promise.all(searchPromises);
      const allQuestions = results.flatMap(result => result.questions);
      
      // Remove duplicates and sort by trust score
      const uniqueQuestions = this.removeDuplicates(allQuestions);
      const sortedQuestions = uniqueQuestions
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedQuestions);

      console.log(`✅ Found ${sortedQuestions.length} Stack Exchange questions`);
      
      return {
        questions: sortedQuestions,
        totalResults: sortedQuestions.length,
        qualityScore
      };

    } catch (error) {
      console.error('Stack Exchange search error:', error);
      return { questions: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search specific Stack Exchange site
   */
  private async searchSite(site: string, query: string, limit: number): Promise<StackExchangeSearchResult> {
    try {
      let searchUrl = `${this.baseUrl}/search/advanced?site=${site}&q=${encodeURIComponent(query)}&sort=relevance&pagesize=${limit}&filter=withbody`;
      
      if (this.key) {
        searchUrl += `&key=${this.key}`;
      }

      const response = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Documentation-Generator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Stack Exchange API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return { questions: [], totalResults: 0, qualityScore: 0 };
      }

      const questions: StackExchangeQuestion[] = data.items.map((item: any) => ({
        id: item.question_id,
        title: item.title,
        body: item.body || '',
        url: item.link,
        site: site,
        score: item.score || 0,
        answers: item.answer_count || 0,
        views: item.view_count || 0,
        tags: item.tags || [],
        created: new Date(item.creation_date * 1000).toISOString(),
        author: item.owner?.display_name || 'Unknown',
        trustScore: this.calculateTrustScore(item),
        acceptedAnswer: item.accepted_answer_id ? 'Yes' : 'No'
      }));

      return {
        questions,
        totalResults: questions.length,
        qualityScore: this.calculateQualityScore(questions)
      };

    } catch (error) {
      console.error(`Stack Exchange site search error (${site}):`, error);
      return { questions: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Search by tags across multiple sites
   */
  async searchByTags(tags: string[], maxResults: number = 15): Promise<StackExchangeSearchResult> {
    try {
      const searchPromises = tags.map(tag => 
        this.searchQuestions(tag, Math.ceil(maxResults / tags.length))
      );

      const results = await Promise.all(searchPromises);
      const allQuestions = results.flatMap(result => result.questions);
      
      // Remove duplicates and sort by trust score
      const uniqueQuestions = this.removeDuplicates(allQuestions);
      const sortedQuestions = uniqueQuestions
        .sort((a, b) => b.trustScore - a.trustScore)
        .slice(0, maxResults);

      const qualityScore = this.calculateQualityScore(sortedQuestions);

      return {
        questions: sortedQuestions,
        totalResults: sortedQuestions.length,
        qualityScore
      };

    } catch (error) {
      console.error('Stack Exchange tag search error:', error);
      return { questions: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Calculate trust score for a Stack Exchange question
   */
  private calculateTrustScore(question: any): number {
    let score = 0.5; // Base score

    // Score factor (0-0.3)
    const questionScore = question.score || 0;
    if (questionScore > 10) score += 0.3;
    else if (questionScore > 5) score += 0.2;
    else if (questionScore > 0) score += 0.1;

    // Answers factor (0-0.3)
    const answers = question.answer_count || 0;
    if (answers > 5) score += 0.3;
    else if (answers > 2) score += 0.2;
    else if (answers > 0) score += 0.1;

    // Views factor (0-0.2)
    const views = question.view_count || 0;
    if (views > 1000) score += 0.2;
    else if (views > 500) score += 0.1;

    // Accepted answer factor (0-0.2)
    if (question.accepted_answer_id) score += 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall quality score for search results
   */
  private calculateQualityScore(questions: StackExchangeQuestion[]): number {
    if (questions.length === 0) return 0;

    const avgTrustScore = questions.reduce((sum, question) => sum + question.trustScore, 0) / questions.length;
    const engagementScore = questions.reduce((sum, question) => sum + (question.score + question.answers + question.views), 0) / questions.length;
    
    // Normalize engagement score (0-1)
    const normalizedEngagement = Math.min(engagementScore / 1000, 1);
    
    return (avgTrustScore * 0.7 + normalizedEngagement * 0.3);
  }

  /**
   * Remove duplicate questions based on URL
   */
  private removeDuplicates(questions: StackExchangeQuestion[]): StackExchangeQuestion[] {
    const seen = new Set<string>();
    return questions.filter(question => {
      if (seen.has(question.url)) {
        return false;
      }
      seen.add(question.url);
      return true;
    });
  }

  /**
   * Get trending questions from specific site
   */
  async getTrendingQuestions(site: string = 'softwareengineering', limit: number = 10): Promise<StackExchangeQuestion[]> {
    try {
      const url = `${this.baseUrl}/questions?site=${site}&sort=hot&pagesize=${limit}&filter=withbody`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Documentation-Generator/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Stack Exchange trending API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }

      return data.items.map((item: any) => ({
        id: item.question_id,
        title: item.title,
        body: item.body || '',
        url: item.link,
        site: site,
        score: item.score || 0,
        answers: item.answer_count || 0,
        views: item.view_count || 0,
        tags: item.tags || [],
        created: new Date(item.creation_date * 1000).toISOString(),
        author: item.owner?.display_name || 'Unknown',
        trustScore: this.calculateTrustScore(item),
        acceptedAnswer: item.accepted_answer_id ? 'Yes' : 'No'
      }));

    } catch (error) {
      console.error(`Stack Exchange trending questions error (${site}):`, error);
      return [];
    }
  }
}

// Export singleton instance
export const stackExchangeService = new StackExchangeService();
