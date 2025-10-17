import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { retryWithFallback } from './utils/retry-with-fallback';
import { scoreSource, filterTrustedSources, deduplicateContent, validateLinks, type ScoredSource, type SourceMetrics } from './utils/source-quality-scorer';

// Search result interface
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: 'serpapi' | 'brave' | 'cache' | 'crawl';
  position?: number;
  domain?: string;
  qualityScore?: number;
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
  private staticCache: Map<string, { data: SearchResult[]; timestamp: number }> = new Map();
  private static readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(serpApiKey?: string, braveApiKey?: string) {
    this.serpApiKey = serpApiKey || process.env.SERPAPI_KEY;
    this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY;
  }

  /**
   * Perform web search using multi-provider fallback chain with retry logic
   * SerpAPI → Brave → Cached results (robust implementation)
   */
  async search(query: string, numResults: number = 10): Promise<SearchResult[]> {
    const providers: Array<() => Promise<SearchResult[]>> = [];
    
    // Provider 0: Cached results
    providers.push(() => this.searchFromCache(query, numResults));

    // Provider 1: SerpAPI
    if (this.serpApiKey) {
      providers.push(() => this.searchWithSerpAPI(query, numResults));
    }
    
    // Provider 2: Brave Search
    if (this.braveApiKey) {
      providers.push(() => this.searchWithBrave(query, numResults));
    }
    
    // Provider 3: Basic last-resort crawl if query includes a URL/domain
    providers.push(() => this.basicWebCrawlFromQuery(query, numResults));
    
    try {
      const result = await retryWithFallback(providers, {
        maxRetries: 3,
        timeout: 15000,
        cacheResults: true,
        cacheKey: `search:${query}:${numResults}`, // Unique cache key per query
      });
      
      // Save to local cache as well for explicit cached provider
      this.setCache(query, numResults, result.data);
      
      // Apply quality scoring if we got results
      if (result.data.length > 0) {
        return this.applyQualityScoring(query, result.data);
      }
      
      return result.data;
    } catch (error) {
      console.error('All search providers failed:', (error as Error).message);
      return [];
    }
  }
  
  /**
   * Apply quality scoring to search results
   */
  private async applyQualityScoring(query: string, results: SearchResult[]): Promise<SearchResult[]> {
    if (results.length === 0) return [];

    // Validate links (skip broken URLs)
    const validated = await validateLinks(results.map<SourceMetrics>(r => ({
      url: r.url,
      content: r.snippet,
      domainAuthority: this.getDomainScore(r.url),
      contentRelevance: this.calculateRelevance(query, `${r.title} ${r.snippet}`)
    })));

    // Score and filter by threshold (70+)
    const scored: ScoredSource[] = validated.map(m => scoreSource(m));
    const trusted = filterTrustedSources(scored);
    const deduped = deduplicateContent(trusted);

    // Map back to SearchResult, preserve original order when possible
    const qualityByUrl = new Map(deduped.map(s => [s.url, s.qualityScore] as const));
    const filtered = results
      .filter(r => qualityByUrl.has(r.url))
      .map(r => ({ ...r, qualityScore: qualityByUrl.get(r.url) } as SearchResult));

    // If filtering removes too many, fall back to top-N by simple heuristics
    if (filtered.length === 0) {
      return results
        .map(r => ({
          ...r,
          qualityScore: this.getDomainScore(r.url) + this.calculateRelevance(query, `${r.title} ${r.snippet}`) / 2,
        }))
        .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
        .slice(0, Math.min(results.length, 10));
    }

    return filtered.slice(0, Math.min(filtered.length, 10));
  }
  
  /**
   * Get domain score for quality assessment
   */
  private getDomainScore(url: string): number {
    try {
      const domain = new URL(url).hostname;
      if (domain.includes('stackoverflow.com')) return 90;
      if (domain.includes('github.com')) return 90;
      if (domain.includes('.gov') || domain.includes('.edu')) return 95;
      if (domain.includes('docs.')) return 85;
      return 50;
    } catch {
      return 20;
    }
  }

  /**
   * Basic content relevance based on term overlap
   */
  private calculateRelevance(query: string, text: string): number {
    if (!query || !text) return 50;
    const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (terms.length === 0) return 50;
    const corpus = text.toLowerCase();
    let hits = 0;
    for (const t of terms) {
      if (corpus.includes(t)) hits++;
    }
    const ratio = hits / terms.length;
    return Math.max(10, Math.min(100, Math.round(ratio * 100)));
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

    const data = await response.json() as { organic_results?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      position?: number;
    }> };

    if (!data.organic_results || data.organic_results.length === 0) {
      console.warn(`⚠️ No organic results from SerpAPI for query: "${query}"`);
      return [];
    }

    return data.organic_results.map((result, index: number) => ({
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

    const data = await response.json() as { web?: { results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }> } };

    if (!data.web || !data.web.results || data.web.results.length === 0) {
      console.warn(`⚠️ No web results from Brave for query: "${query}"`);
      return [];
    }

    return data.web.results.map((result, index: number) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.description || '',
      source: 'brave' as const,
      position: index + 1,
      domain: this.extractDomain(result.url)
    }));
  }

  /**
   * Provider: Cached results (if available)
   */
  private async searchFromCache(query: string, numResults: number): Promise<SearchResult[]> {
    const key = this.cacheKey(query, numResults);
    const now = Date.now();
    const cached = this.staticCache.get(key);
    if (cached && now - cached.timestamp < SearchService.CACHE_TTL_MS) {
      return cached.data.map(r => ({ ...r, source: 'cache' as const }));
    }
    // Force a failure to move to next provider
    throw new Error('No cached search results');
  }

  private setCache(query: string, numResults: number, data: SearchResult[]) {
    const key = this.cacheKey(query, numResults);
    this.staticCache.set(key, { data, timestamp: Date.now() });
  }

  private cacheKey(query: string, numResults: number) {
    return `${query}::${numResults}`;
  }

  /**
   * Last-resort: attempt to crawl a domain if present in query
   */
  private async basicWebCrawlFromQuery(query: string, numResults: number): Promise<SearchResult[]> {
    const domain = this.extractDomainFromQuery(query);
    if (!domain) {
      // Give up to let caller continue gracefully
      return [];
    }
    const origin = `https://${domain}`;
    try {
      const resp = await fetch(origin, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) return [];
      const html = await resp.text();
      const $ = cheerio.load(html);
      const links: SearchResult[] = [];
      $('a[href]').each((i, el) => {
        if (links.length >= numResults) return;
        const href = $(el).attr('href') || '';
        const text = $(el).text().trim();
        if (!href) return;
        // Prefer documentation-like links
        const isDocLike = /doc|help|support|guide|tutorial|api|developer|faq|question|blog|article/i.test(href + ' ' + text);
        if (!isDocLike) return;
        try {
          const absolute = new URL(href, origin).href;
          links.push({
            title: text || absolute,
            url: absolute,
            snippet: `Discovered via basic crawl on ${domain}`,
            source: 'crawl',
            position: links.length + 1,
            domain: this.extractDomain(absolute),
          });
        } catch {}
      });
      return links;
    } catch {
      return [];
    }
  }

  private extractDomainFromQuery(query: string): string | null {
    const m = query.match(/(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(?:\/[\S]*)?/i);
    if (m && m[1]) return m[1].toLowerCase();
    return null;
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
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
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

      const data = await response.json() as {
        title: string;
        body?: string;
        state: 'open' | 'closed';
        labels?: Array<{ name: string }>;
        comments?: number;
      };

      return {
        title: data.title,
        description: data.body?.substring(0, 2000) || '',
        state: data.state,
        url,
        labels: data.labels?.map((l) => l.name) || [],
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
        console.error(`Search failed for "${query}":`, (error as Error).message);
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
