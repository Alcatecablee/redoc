import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Search result interface
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'serpapi' | 'brave';
  position?: number;
  domain?: string;
}

// Stack Overflow answer interface
export interface StackOverflowAnswer {
  question: string;
  answer: string;
  votes: number;
  accepted: boolean;
  url: string;
  tags: string[];
}

// GitHub issue interface
export interface GitHubIssue {
  title: string;
  description: string;
  state: 'open' | 'closed';
  url: string;
  labels: string[];
  comments_count: number;
}

// Search service class
export class SearchService {
  private serpApiKey: string | undefined;
  private braveApiKey: string | undefined;

  constructor(serpApiKey?: string, braveApiKey?: string) {
    this.serpApiKey = serpApiKey || process.env.SERPAPI_KEY;
    this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY;
  }

  /**
   * Perform web search using SerpAPI (primary) with Brave fallback
   */
  async search(query: string, numResults: number = 10): Promise<SearchResult[]> {
    // Try SerpAPI first (primary)
    if (this.serpApiKey) {
      try {
        console.log(`🔍 Searching with SerpAPI: "${query}"`);
        return await this.searchWithSerpAPI(query, numResults);
      } catch (error) {
        console.warn('⚠️ SerpAPI failed, falling back to Brave:', error.message);
      }
    } else {
      console.log('ℹ️ SerpAPI key not configured, using Brave Search');
    }

    // Fallback to Brave Search
    if (this.braveApiKey) {
      try {
        console.log(`🔍 Searching with Brave: "${query}"`);
        return await this.searchWithBrave(query, numResults);
      } catch (error) {
        console.error('❌ Brave Search also failed:', error.message);
        return [];
      }
    }

    console.error('❌ No search API keys configured');
    return [];
  }

  /**
   * Search using SerpAPI (Google results)
   */
  private async searchWithSerpAPI(query: string, numResults: number): Promise<SearchResult[]> {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('api_key', this.serpApiKey!);
    url.searchParams.append('q', query);
    url.searchParams.append('num', numResults.toString());
    url.searchParams.append('engine', 'google');

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
      console.warn(`⚠️ No organic results from SerpAPI for query: "${query}"`);
      return [];
    }

    return data.organic_results.map((result: any, index: number) => ({
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      source: 'serpapi' as const,
      position: result.position || index + 1,
      domain: this.extractDomain(result.link)
    }));
  }

  /**
   * Search using Brave Search API
   */
  private async searchWithBrave(query: string, numResults: number): Promise<SearchResult[]> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.append('q', query);
    url.searchParams.append('count', Math.min(numResults, 20).toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.braveApiKey!
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search request failed: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();

    if (!data.web || !data.web.results || data.web.results.length === 0) {
      console.warn(`⚠️ No web results from Brave for query: "${query}"`);
      return [];
    }

    return data.web.results.map((result: any, index: number) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.description || '',
      source: 'brave' as const,
      position: index + 1,
      domain: this.extractDomain(result.url)
    }));
  }

  /**
   * Extract Stack Overflow answers from a question URL
   */
  async extractStackOverflowAnswers(url: string): Promise<StackOverflowAnswer[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) return [];

      const html = await response.text();
      const $ = cheerio.load(html);

      const answers: StackOverflowAnswer[] = [];

      // Extract question
      const question = $('#question-header h1').text().trim();
      const tags = $('.post-tag').map((i, el) => $(el).text()).get();

      // Extract accepted answer
      const acceptedAnswer = $('.answer.accepted-answer').first();
      if (acceptedAnswer.length > 0) {
        const answerText = acceptedAnswer.find('.s-prose').text().trim();
        const votes = parseInt(acceptedAnswer.find('.js-vote-count').text()) || 0;

        answers.push({
          question,
          answer: answerText.substring(0, 2000), // Limit length
          votes,
          accepted: true,
          url,
          tags
        });
      }

      // Extract other highly voted answers
      $('.answer').not('.accepted-answer').each((i, el) => {
        if (answers.length >= 3) return; // Limit to 3 answers total

        const answerText = $(el).find('.s-prose').text().trim();
        const votes = parseInt($(el).find('.js-vote-count').text()) || 0;

        if (votes >= 5 || answers.length === 0) { // Only high-quality answers
          answers.push({
            question,
            answer: answerText.substring(0, 2000),
            votes,
            accepted: false,
            url,
            tags
          });
        }
      });

      return answers;
    } catch (error) {
      console.error(`Failed to extract Stack Overflow answers from ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Extract GitHub issue information
   */
  async extractGitHubIssue(url: string): Promise<GitHubIssue | null> {
    try {
      // Extract owner, repo, and issue number from URL
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
      if (!match) return null;

      const [, owner, repo, issueNumber] = match;

      // Use GitHub API for better data
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Knowledge-Base-Generator'
        }
      });

      if (!response.ok) {
        // Fallback to scraping
        return await this.scrapeGitHubIssue(url);
      }

      const data: any = await response.json();

      return {
        title: data.title,
        description: data.body?.substring(0, 2000) || '',
        state: data.state,
        url,
        labels: data.labels?.map((l: any) => l.name) || [],
        comments_count: data.comments || 0
      };
    } catch (error) {
      console.error(`Failed to extract GitHub issue from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Scrape GitHub issue (fallback method)
   */
  private async scrapeGitHubIssue(url: string): Promise<GitHubIssue | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) return null;

      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('.js-issue-title').text().trim();
      const description = $('.comment-body').first().text().trim();
      const state = $('.State').text().toLowerCase().includes('closed') ? 'closed' : 'open';
      const labels = $('.IssueLabel').map((i, el) => $(el).text().trim()).get();

      return {
        title,
        description: description.substring(0, 2000),
        state: state as 'open' | 'closed',
        url,
        labels,
        comments_count: 0
      };
    } catch (error) {
      console.error(`Failed to scrape GitHub issue from ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Perform comprehensive research on a product
   */
  async performComprehensiveResearch(productName: string, baseUrl: string): Promise<{
    searchResults: SearchResult[];
    stackOverflowAnswers: StackOverflowAnswer[];
    gitHubIssues: GitHubIssue[];
  }> {
    const baseDomain = this.extractDomain(baseUrl);

    // Define comprehensive search queries
    const queries = [
      // Official documentation
      `"${productName}" documentation site:${baseDomain}`,
      
      // External tutorials and guides
      `"${productName}" tutorial getting started -site:${baseDomain}`,
      `"${productName}" guide how to use`,
      
      // Troubleshooting and issues
      `"${productName}" error troubleshooting site:stackoverflow.com`,
      `"${productName}" common issues problems`,
      `"${productName}" not working fix`,
      
      // GitHub discussions
      `"${productName}" issues site:github.com`,
      
      // Best practices and comparisons
      `"${productName}" best practices tips`,
      `"${productName}" vs alternatives comparison`,
      
      // Integration and API
      `"${productName}" integration guide`,
      `"${productName}" API examples code`,
    ];

    // Perform all searches in batches
    const allSearchResults: SearchResult[] = [];
    
    for (const query of queries.slice(0, 8)) { // Limit to 8 queries
      try {
        const results = await this.search(query, 5); // 5 results per query
        allSearchResults.push(...results);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Search failed for "${query}":`, error.message);
      }
    }

    // Deduplicate by URL
    const uniqueResults = this.deduplicateResults(allSearchResults);

    // Extract Stack Overflow answers
    const stackOverflowUrls = uniqueResults
      .filter(r => r.domain?.includes('stackoverflow.com'))
      .slice(0, 5); // Limit to 5 SO questions

    const stackOverflowAnswers: StackOverflowAnswer[] = [];
    for (const result of stackOverflowUrls) {
      try {
        const answers = await this.extractStackOverflowAnswers(result.url);
        stackOverflowAnswers.push(...answers);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
      } catch (error) {
        console.error(`Failed to extract SO answers:`, error.message);
      }
    }

    // Extract GitHub issues
    const gitHubUrls = uniqueResults
      .filter(r => r.domain?.includes('github.com') && r.url.includes('/issues/'))
      .slice(0, 5); // Limit to 5 GitHub issues

    const gitHubIssues: GitHubIssue[] = [];
    for (const result of gitHubUrls) {
      try {
        const issue = await this.extractGitHubIssue(result.url);
        if (issue) gitHubIssues.push(issue);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      } catch (error) {
        console.error(`Failed to extract GitHub issue:`, error.message);
      }
    }

    return {
      searchResults: uniqueResults,
      stackOverflowAnswers,
      gitHubIssues
    };
  }

  /**
   * Deduplicate search results by URL
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const normalized = result.url.toLowerCase().split('?')[0]; // Remove query params
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Calculate quality score for search results
   */
  calculateQualityScore(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    let score = 0;
    const weights = {
      stackoverflow: 2,
      github: 2,
      documentation: 3,
      blog: 1,
      other: 0.5
    };

    results.forEach(result => {
      const domain = result.domain || '';
      
      if (domain.includes('stackoverflow.com')) {
        score += weights.stackoverflow;
      } else if (domain.includes('github.com')) {
        score += weights.github;
      } else if (domain.includes('docs') || domain.includes('documentation')) {
        score += weights.documentation;
      } else if (domain.includes('blog') || domain.includes('medium.com') || domain.includes('dev.to')) {
        score += weights.blog;
      } else {
        score += weights.other;
      }
    });

    // Normalize to 0-1 scale
    return Math.min(score / (results.length * 3), 1);
  }
}

// Export singleton instance
export const searchService = new SearchService();
