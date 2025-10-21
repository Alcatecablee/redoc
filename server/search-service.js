import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { retryWithFallback } from './utils/retry-with-fallback';
import { scoreSource, filterTrustedSources, deduplicateContent, validateLinks, crossVerifyContent } from './utils/source-quality-scorer';
import { youtubeService } from './youtube-service';
import { redditService } from './reddit-service';
import { devToService } from './devto-service';
import { codeProjectService } from './codeproject-service';
import { stackExchangeService } from './stackexchange-service';
import { quoraService } from './quora-service';
import { forumsService } from './forums-service';
// Search service class
export class SearchService {
    serpApiKey;
    braveApiKey;
    staticCache = new Map();
    static CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
    // Dynamic source limits based on product complexity
    // Truncation increased from 100 to 1000 chars for all complexity levels
    // Search results scaled: small (10), medium (15-20), large (up to 30)
    // Community sources: Reddit (5-15), DEV.to (5-10), CodeProject (3-8), Stack Exchange (5-10), Quora (3-6), Forums (5-8)
    static SOURCE_LIMITS = {
        small: {
            soQuestions: 5,
            githubIssues: 5,
            searchResults: 10,
            youtubeVideos: 5,
            redditPosts: 5,
            devToArticles: 5,
            codeProjectArticles: 3,
            stackExchangeQuestions: 5,
            quoraAnswers: 3,
            forumPosts: 5,
            truncationLimit: 1000
        },
        medium: {
            soQuestions: 10,
            githubIssues: 10,
            searchResults: 20,
            youtubeVideos: 8,
            redditPosts: 10,
            devToArticles: 8,
            codeProjectArticles: 5,
            stackExchangeQuestions: 8,
            quoraAnswers: 5,
            forumPosts: 6,
            truncationLimit: 1000
        },
        large: {
            soQuestions: 20,
            githubIssues: 15,
            searchResults: 30,
            youtubeVideos: 10,
            redditPosts: 15,
            devToArticles: 10,
            codeProjectArticles: 8,
            stackExchangeQuestions: 10,
            quoraAnswers: 6,
            forumPosts: 8,
            truncationLimit: 1000
        }
    };
    constructor(serpApiKey, braveApiKey) {
        this.serpApiKey = serpApiKey || process.env.SERPAPI_KEY;
        this.braveApiKey = braveApiKey || process.env.BRAVE_API_KEY;
    }
    /**
     * Estimate product complexity based on crawled pages and GitHub activity
     */
    estimateProductComplexity(crawledPageCount, githubStars) {
        // Simple heuristic: more pages/stars = more complex product
        let complexityScore = 0;
        // Factor 1: Number of crawled documentation pages
        if (crawledPageCount >= 50)
            complexityScore += 3;
        else if (crawledPageCount >= 20)
            complexityScore += 2;
        else
            complexityScore += 1;
        // Factor 2: GitHub popularity (if available)
        if (githubStars) {
            if (githubStars >= 10000)
                complexityScore += 2;
            else if (githubStars >= 1000)
                complexityScore += 1;
        }
        // Classify based on score
        if (complexityScore >= 4)
            return 'large';
        if (complexityScore >= 2)
            return 'medium';
        return 'small';
    }
    /**
     * Get source limits based on product complexity
     */
    getSourceLimits(productSize) {
        return SearchService.SOURCE_LIMITS[productSize];
    }
    /**
     * Calculate trust score for a source
     * Returns a score from 0-1 based on source type, domain authority, and votes
     */
    calculateTrustScore(result, votes, isAccepted) {
        const domain = result.domain || '';
        let trustScore = 0.5; // Base score
        // Official documentation sites - highest trust
        if (domain.includes('docs') || domain.includes('documentation') ||
            domain.includes('developer') || domain.includes('api')) {
            trustScore = 0.95;
        }
        // Stack Overflow - trust based on votes
        else if (domain.includes('stackoverflow.com')) {
            if (isAccepted) {
                trustScore = 0.9;
            }
            else if (votes !== undefined) {
                // Logarithmic scale: 0.5 base + up to 0.4 based on votes
                trustScore = Math.min(0.9, 0.5 + (Math.log10(votes + 1) / 10));
            }
            else {
                trustScore = 0.7; // Default for SO without vote info
            }
        }
        // GitHub - trust based on issue state
        else if (domain.includes('github.com')) {
            trustScore = 0.75; // Default for open issues
        }
        // YouTube - enhanced trust scoring based on view count from snippet
        else if (domain.includes('youtube.com')) {
            trustScore = this.calculateYouTubeTrustScore(result);
        }
        // High-authority blog sites
        else if (domain.includes('dev.to') || domain.includes('medium.com') ||
            domain.includes('smashingmagazine.com') || domain.includes('css-tricks.com')) {
            trustScore = 0.65;
        }
        // Unknown blogs or sites
        else {
            // Could enhance with domain authority API, for now use conservative score
            trustScore = 0.4;
        }
        return trustScore;
    }
    /**
     * Enhanced YouTube trust scoring from search snippets
     * Extracts view counts and other indicators from SerpAPI results
     */
    calculateYouTubeTrustScore(result) {
        let trustScore = 0.6; // Base score for YouTube
        // Try to extract view count from snippet
        const snippet = result.snippet?.toLowerCase() || '';
        const title = result.title?.toLowerCase() || '';
        // Extract view count patterns: "1.2M views", "123K views", "1,234 views"
        const viewMatch = snippet.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*views?/i);
        if (viewMatch) {
            const viewCount = this.parseViewCount(viewMatch[1]);
            if (viewCount > 1000000)
                trustScore = 0.85; // 1M+ views
            else if (viewCount > 100000)
                trustScore = 0.8; // 100K+ views
            else if (viewCount > 10000)
                trustScore = 0.75; // 10K+ views
            else if (viewCount > 1000)
                trustScore = 0.7; // 1K+ views
            else
                trustScore = 0.6; // < 1K views
        }
        // Boost score for official channels or tutorial keywords
        if (title.includes('official') || title.includes('tutorial') ||
            title.includes('guide') || title.includes('walkthrough')) {
            trustScore += 0.05;
        }
        return Math.min(trustScore, 1.0);
    }
    /**
     * Parse view count string to number
     * Handles formats like: "1.2M", "123K", "1,234"
     */
    parseViewCount(viewStr) {
        viewStr = viewStr.toUpperCase().replace(/,/g, '');
        const multipliers = {
            'K': 1000,
            'M': 1000000,
            'B': 1000000000
        };
        const match = viewStr.match(/^(\d+(?:\.\d+)?)(K|M|B)?$/);
        if (!match)
            return 0;
        const number = parseFloat(match[1]);
        const multiplier = match[2] ? multipliers[match[2]] : 1;
        return number * multiplier;
    }
    /**
     * Convert search results to YouTube video format
     * Handles various YouTube URL formats including shorts, live streams, and embeds
     */
    async convertSearchResultsToYouTubeVideos(searchResults) {
        return searchResults.map(result => {
            // Extract video ID from various YouTube URL formats
            const videoId = this.extractYouTubeVideoId(result.url);
            // Skip if we couldn't extract a video ID
            if (!videoId) {
                console.log(`⚠️ Could not extract video ID from: ${result.url}`);
                return null;
            }
            // Extract view count from snippet if available
            const viewMatch = result.snippet?.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*views?/i);
            const views = viewMatch ? this.parseViewCount(viewMatch[1]) : 0;
            // Extract channel name from snippet or title
            const channelMatch = result.snippet?.match(/(?:by|from)\s+([^·•\n]+)/i);
            const channelTitle = channelMatch ? channelMatch[1].trim() : 'Unknown';
            return {
                id: videoId,
                title: result.title,
                description: result.snippet || '',
                url: `https://www.youtube.com/watch?v=${videoId}`, // Normalize URL
                thumbnail: '', // Not available from search results
                duration: 'Unknown',
                views: views,
                likes: 0,
                channelTitle: channelTitle,
                channelId: '',
                publishedAt: '',
                trustScore: result.trustScore || 0.6
            };
        }).filter(video => video !== null);
    }
    /**
     * Extract YouTube video ID from various URL formats
     * Supports:
     * - *.youtube.com/watch?v=ID (any subdomain)
     * - youtu.be/ID
     * - *.youtube.com/embed/ID
     * - *.youtube.com/v/ID
     * - *.youtube.com/shorts/ID
     * - *.youtube.com/live/ID
     * - youtube-nocookie.com embeds
     * Note: Preserves case-sensitivity of video ID
     */
    extractYouTubeVideoId(url) {
        // Pattern for various YouTube URL formats with any subdomain
        // Use 'i' flag for case-insensitive host/path matching, but capture preserves ID case
        const patterns = [
            // Standard watch URL with any subdomain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube\.com\/watch\?.*?v=([a-zA-Z0-9_-]{11})/i,
            // YouTube nocookie domain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube-nocookie\.com\/watch\?.*?v=([a-zA-Z0-9_-]{11})/i,
            // Short URL
            /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/i,
            // Embed URL with any subdomain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
            // Old format with any subdomain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
            // YouTube Shorts with any subdomain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
            // Live streams with any subdomain
            /(?:https?:\/\/)?(?:[\w-]+\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
            // Query parameter (most generic, try last) - match original URL to preserve case
            /[?&]v=([a-zA-Z0-9_-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1]; // Return original case from URL
            }
        }
        // If no match found, log for debugging
        console.log(`⚠️ No video ID pattern matched for URL: ${url}`);
        return null;
    }
    /**
     * Filter and weight sources by trust score
     */
    filterByTrustScore(results, minTrustScore = 0.5) {
        return results
            .map(r => ({
            ...r,
            trustScore: r.trustScore || this.calculateTrustScore(r)
        }))
            .filter(r => (r.trustScore || 0) >= minTrustScore)
            .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
    }
    /**
     * Perform web search using multi-provider fallback chain with retry logic
     * SerpAPI → Brave → Cached results (robust implementation)
     */
    async search(query, numResults = 10) {
        const providers = [];
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
            // Apply quality scoring if we got results (respect dynamic limits)
            if (result.data.length > 0) {
                return await this.applyQualityScoring(query, result.data, numResults);
            }
            return result.data;
        }
        catch (error) {
            console.error('All search providers failed:', error.message);
            return [];
        }
    }
    /**
     * Apply quality scoring to search results
     * @param maxResults - Maximum number of results to return (respects dynamic limits)
     */
    async applyQualityScoring(query, results, maxResults = 30) {
        if (results.length === 0)
            return [];
        // 1) Validate links (skip broken URLs)
        const validated = await validateLinks(results.map(r => ({
            url: r.url,
            content: r.snippet,
            domainAuthority: this.getDomainScore(r.url),
            contentRelevance: this.calculateRelevance(query, `${r.title} ${r.snippet}`)
        })));
        // 2) Score and filter by threshold (70+), dedupe, and cross-verify
        const scored = validated.map(m => scoreSource(m));
        const trusted = filterTrustedSources(scored);
        const deduped = deduplicateContent(trusted);
        crossVerifyContent(deduped, 3);
        // Map back to SearchResult, preserve original order when possible
        const qualityByUrl = new Map(deduped.map(s => [s.url, s.qualityScore]));
        const filtered = results
            .filter(r => qualityByUrl.has(r.url))
            .map(r => ({ ...r, qualityScore: qualityByUrl.get(r.url) }));
        // If filtering removes too many, fall back to top-N by simple heuristics
        if (filtered.length === 0) {
            return results
                .map(r => ({
                ...r,
                qualityScore: this.getDomainScore(r.url) + this.calculateRelevance(query, `${r.title} ${r.snippet}`) / 2,
            }))
                .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
                .slice(0, Math.min(results.length, maxResults));
        }
        return filtered.slice(0, Math.min(filtered.length, maxResults));
    }
    /**
     * Get domain score for quality assessment
     */
    getDomainScore(url) {
        try {
            const domain = new URL(url).hostname;
            if (domain.includes('stackoverflow.com'))
                return 90;
            if (domain.includes('github.com'))
                return 90;
            if (domain.includes('.gov') || domain.includes('.edu'))
                return 95;
            if (domain.includes('docs.'))
                return 85;
            return 50;
        }
        catch {
            return 20;
        }
    }
    /**
     * Basic content relevance based on term overlap
     */
    calculateRelevance(query, text) {
        if (!query || !text)
            return 50;
        const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        if (terms.length === 0)
            return 50;
        const corpus = text.toLowerCase();
        let hits = 0;
        for (const t of terms) {
            if (corpus.includes(t))
                hits++;
        }
        const ratio = hits / terms.length;
        return Math.max(10, Math.min(100, Math.round(ratio * 100)));
    }
    /**
     * Search using SerpAPI (Google results)
     */
    async searchWithSerpAPI(query, numResults) {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.append('api_key', this.serpApiKey);
        url.searchParams.append('q', query);
        url.searchParams.append('num', numResults.toString());
        url.searchParams.append('engine', 'google');
        const response = await fetch(url.toString(), {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.organic_results || data.organic_results.length === 0) {
            console.warn(`⚠️ No organic results from SerpAPI for query: "${query}"`);
            return [];
        }
        return data.organic_results.map((result, index) => ({
            title: result.title || '',
            url: result.link || '',
            snippet: result.snippet || '',
            source: 'serpapi',
            position: result.position || index + 1,
            domain: this.extractDomain(result.link || '')
        }));
    }
    /**
     * Search using Brave Search API
     */
    async searchWithBrave(query, numResults) {
        const url = new URL('https://api.search.brave.com/res/v1/web/search');
        url.searchParams.append('q', query);
        url.searchParams.append('count', Math.min(numResults, 20).toString());
        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': this.braveApiKey
            }
        });
        if (!response.ok) {
            throw new Error(`Brave Search request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.web || !data.web.results || data.web.results.length === 0) {
            console.warn(`⚠️ No web results from Brave for query: "${query}"`);
            return [];
        }
        return data.web.results.map((result, index) => ({
            title: result.title || '',
            url: result.url || '',
            snippet: result.description || '',
            source: 'brave',
            position: index + 1,
            domain: this.extractDomain(result.url || '')
        }));
    }
    /**
     * Provider: Cached results (if available)
     */
    async searchFromCache(query, numResults) {
        const key = this.cacheKey(query, numResults);
        const now = Date.now();
        const cached = this.staticCache.get(key);
        if (cached && now - cached.timestamp < SearchService.CACHE_TTL_MS) {
            return cached.data.map(r => ({ ...r, source: 'cache' }));
        }
        // Force a failure to move to next provider
        throw new Error('No cached search results');
    }
    setCache(query, numResults, data) {
        const key = this.cacheKey(query, numResults);
        this.staticCache.set(key, { data, timestamp: Date.now() });
    }
    cacheKey(query, numResults) {
        return `${query}::${numResults}`;
    }
    /**
     * Last-resort: attempt to crawl a domain if present in query
     */
    async basicWebCrawlFromQuery(query, numResults) {
        const domain = this.extractDomainFromQuery(query);
        if (!domain) {
            // Give up to let caller continue gracefully
            return [];
        }
        const origin = `https://${domain}`;
        try {
            const resp = await fetch(origin, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!resp.ok)
                return [];
            const html = await resp.text();
            const $ = cheerio.load(html);
            const links = [];
            $('a[href]').each((i, el) => {
                if (links.length >= numResults)
                    return;
                const href = $(el).attr('href') || '';
                const text = $(el).text().trim();
                if (!href)
                    return;
                // Prefer documentation-like links
                const isDocLike = /doc|help|support|guide|tutorial|api|developer|faq|question|blog|article/i.test(href + ' ' + text);
                if (!isDocLike)
                    return;
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
                }
                catch { }
            });
            return links;
        }
        catch {
            return [];
        }
    }
    extractDomainFromQuery(query) {
        const m = query.match(/(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})(?:\/[\S]*)?/i);
        if (m && m[1])
            return m[1].toLowerCase();
        return null;
    }
    /**
     * Extract Stack Overflow answers from a question URL
     */
    async extractStackOverflowAnswers(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok)
                return [];
            const html = await response.text();
            const $ = cheerio.load(html);
            const answers = [];
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
                if (answers.length >= 3)
                    return; // Limit to 3 answers total
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
        }
        catch (error) {
            console.error(`Failed to extract Stack Overflow answers from ${url}:`, error.message);
            return [];
        }
    }
    /**
     * Extract GitHub issue information
     */
    async extractGitHubIssue(url) {
        try {
            // Extract owner, repo, and issue number from URL
            const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
            if (!match)
                return null;
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
            const data = await response.json();
            return {
                title: data.title,
                description: data.body?.substring(0, 2000) || '',
                state: data.state,
                url,
                labels: data.labels?.map((l) => l.name) || [],
                comments_count: data.comments || 0
            };
        }
        catch (error) {
            console.error(`Failed to extract GitHub issue from ${url}:`, error.message);
            return null;
        }
    }
    /**
     * Scrape GitHub issue (fallback method)
     */
    async scrapeGitHubIssue(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok)
                return null;
            const html = await response.text();
            const $ = cheerio.load(html);
            const title = $('.js-issue-title').text().trim();
            const description = $('.comment-body').first().text().trim();
            const state = $('.State').text().toLowerCase().includes('closed') ? 'closed' : 'open';
            const labels = $('.IssueLabel').map((i, el) => $(el).text().trim()).get();
            return {
                title,
                description: description.substring(0, 2000),
                state: state,
                url,
                labels,
                comments_count: 0
            };
        }
        catch (error) {
            console.error(`Failed to scrape GitHub issue from ${url}:`, error.message);
            return null;
        }
    }
    /**
     * Perform comprehensive research on a product with dynamic limits
     */
    async performComprehensiveResearch(productName, baseUrl, productSize = 'medium', crawledPageCount = 0, youtubeApiAccess = false, youtubeTranscripts = false, enableReddit = true, enableDevTo = true, enableCodeProject = true, enableStackExchange = true, enableQuora = true, enableForums = true) {
        // Estimate complexity if not provided
        if (crawledPageCount > 0) {
            productSize = this.estimateProductComplexity(crawledPageCount);
            console.log(`📊 Estimated product complexity: ${productSize} (based on ${crawledPageCount} pages)`);
        }
        const limits = this.getSourceLimits(productSize);
        console.log(`🎯 Using dynamic limits: SO=${limits.soQuestions}, GitHub=${limits.githubIssues}, Search=${limits.searchResults}`);
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
        // Only add YouTube search queries if NOT using YouTube API
        // This avoids wasting search slots when API provides better results
        if (!youtubeApiAccess) {
            queries.push(`"${productName}" tutorial site:youtube.com`, `"${productName}" demo site:youtube.com`, `"${productName}" walkthrough site:youtube.com`);
        }
        // Perform all searches in batches
        const allSearchResults = [];
        for (const query of queries.slice(0, 8)) { // Limit to 8 queries
            try {
                const results = await this.search(query, Math.ceil(limits.searchResults / 2)); // Dynamic results per query
                allSearchResults.push(...results);
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`Search failed for "${query}":`, error.message);
            }
        }
        // Deduplicate by URL
        let uniqueResults = this.deduplicateResults(allSearchResults);
        // Apply trust scoring and filter low-quality sources
        uniqueResults = this.filterByTrustScore(uniqueResults, 0.5);
        console.log(`✅ Filtered to ${uniqueResults.length} trusted sources (min trust: 0.5)`);
        // Extract Stack Overflow answers (dynamic limit)
        const stackOverflowUrls = uniqueResults
            .filter(r => r.domain?.includes('stackoverflow.com'))
            .slice(0, limits.soQuestions); // Dynamic SO limit
        const stackOverflowAnswers = [];
        for (const result of stackOverflowUrls) {
            try {
                const answers = await this.extractStackOverflowAnswers(result.url);
                stackOverflowAnswers.push(...answers);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
            }
            catch (error) {
                console.error(`Failed to extract SO answers:`, error.message);
            }
        }
        // Extract GitHub issues (dynamic limit)
        const gitHubUrls = uniqueResults
            .filter(r => r.domain?.includes('github.com') && r.url.includes('/issues/'))
            .slice(0, limits.githubIssues); // Dynamic GitHub limit
        const gitHubIssues = [];
        for (const result of gitHubUrls) {
            try {
                const issue = await this.extractGitHubIssue(result.url);
                if (issue)
                    gitHubIssues.push(issue);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
            }
            catch (error) {
                console.error(`Failed to extract GitHub issue:`, error.message);
            }
        }
        // Extract YouTube videos with fallback mechanism
        let youtubeVideos = [];
        if (youtubeApiAccess && youtubeService.isAvailable()) {
            try {
                console.log(`🎥 Searching YouTube via API for "${productName}"...`);
                const youtubeResults = await youtubeService.searchVideos(`${productName} tutorial`, limits.youtubeVideos);
                youtubeVideos = youtubeResults.videos.slice(0, limits.youtubeVideos);
                // Get transcripts if enabled
                if (youtubeTranscripts) {
                    console.log(`📝 Extracting transcripts for ${youtubeVideos.length} videos...`);
                    const transcriptPromises = youtubeVideos.map(async (video, index) => {
                        try {
                            // Stagger requests to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, index * 1000));
                            const transcript = await youtubeService.getVideoTranscript(video.id);
                            if (transcript) {
                                video.transcript = transcript;
                            }
                        }
                        catch (error) {
                            console.error(`Failed to get transcript for ${video.id}:`, error.message);
                        }
                    });
                    await Promise.all(transcriptPromises);
                }
                // Perform comprehensive video content analysis
                console.log(`🎬 Analyzing video content for ${youtubeVideos.length} videos...`);
                youtubeVideos = await youtubeService.analyzeVideoBatch(youtubeVideos, youtubeTranscripts);
                console.log(`✅ Found ${youtubeVideos.length} YouTube videos`);
            }
            catch (error) {
                console.error('YouTube API failed:', error.message);
                console.log('📡 Falling back to SerpAPI YouTube search...');
                // Fallback to SerpAPI YouTube search
                try {
                    const fallbackResults = await this.search(`"${productName}" tutorial site:youtube.com`, limits.youtubeVideos);
                    const youtubeSearchResults = fallbackResults.filter(r => r.domain?.includes('youtube.com'));
                    // Convert SearchResults to YouTubeVideo format (basic conversion)
                    youtubeVideos = await this.convertSearchResultsToYouTubeVideos(youtubeSearchResults);
                    console.log(`✅ Fallback successful: ${youtubeVideos.length} videos found via SerpAPI`);
                }
                catch (fallbackError) {
                    console.error('YouTube fallback search also failed:', fallbackError.message);
                }
            }
        }
        else if (!youtubeApiAccess) {
            // Free tier: Use YouTube search results from SerpAPI
            const youtubeSearchResults = uniqueResults.filter(r => r.domain?.includes('youtube.com'));
            youtubeVideos = await this.convertSearchResultsToYouTubeVideos(youtubeSearchResults.slice(0, limits.youtubeVideos));
            console.log(`📺 Found ${youtubeVideos.length} YouTube videos via search (Free tier)`);
        }
        // Extract Reddit posts (community insights)
        let redditPosts = [];
        if (enableReddit) {
            try {
                console.log(`🔍 Searching Reddit for "${productName}"...`);
                const redditResults = await redditService.searchPosts(`${productName}`, limits.redditPosts);
                redditPosts = redditResults.posts.slice(0, limits.redditPosts);
                console.log(`✅ Found ${redditPosts.length} Reddit posts`);
            }
            catch (error) {
                console.error('Reddit search failed:', error.message);
            }
        }
        // Extract DEV.to articles (tutorials and best practices)
        let devToArticles = [];
        if (enableDevTo) {
            try {
                console.log(`📝 Searching DEV.to for "${productName}"...`);
                const devToResults = await devToService.searchArticles(productName, limits.devToArticles);
                devToArticles = devToResults.articles.slice(0, limits.devToArticles);
                console.log(`✅ Found ${devToArticles.length} DEV.to articles`);
            }
            catch (error) {
                console.error('DEV.to search failed:', error.message);
            }
        }
        // Extract CodeProject articles (code examples)
        let codeProjectArticles = [];
        if (enableCodeProject) {
            try {
                console.log(`💻 Searching CodeProject for "${productName}"...`);
                const codeProjectResults = await codeProjectService.searchArticles(productName, limits.codeProjectArticles);
                codeProjectArticles = codeProjectResults.articles.slice(0, limits.codeProjectArticles);
                console.log(`✅ Found ${codeProjectArticles.length} CodeProject articles`);
            }
            catch (error) {
                console.error('CodeProject search failed:', error.message);
            }
        }
        // Extract Stack Exchange questions (specialized Q&A)
        let stackExchangeQuestions = [];
        if (enableStackExchange) {
            try {
                console.log(`❓ Searching Stack Exchange for "${productName}"...`);
                const stackExchangeResults = await stackExchangeService.searchQuestions(productName, limits.stackExchangeQuestions);
                stackExchangeQuestions = stackExchangeResults.questions.slice(0, limits.stackExchangeQuestions);
                console.log(`✅ Found ${stackExchangeQuestions.length} Stack Exchange questions`);
            }
            catch (error) {
                console.error('Stack Exchange search failed:', error.message);
            }
        }
        // Extract Quora answers (expert insights)
        let quoraAnswers = [];
        if (enableQuora) {
            try {
                console.log(`🤔 Searching Quora for "${productName}"...`);
                const quoraResults = await quoraService.searchAnswers(productName, limits.quoraAnswers);
                quoraAnswers = quoraResults.answers.slice(0, limits.quoraAnswers);
                console.log(`✅ Found ${quoraAnswers.length} Quora answers`);
            }
            catch (error) {
                console.error('Quora search failed:', error.message);
            }
        }
        // Extract forum posts (official communities)
        let forumPosts = [];
        if (enableForums) {
            try {
                console.log(`🏢 Searching official forums for "${productName}"...`);
                const forumResults = await forumsService.searchForums(productName, limits.forumPosts);
                forumPosts = forumResults.posts.slice(0, limits.forumPosts);
                console.log(`✅ Found ${forumPosts.length} forum posts`);
            }
            catch (error) {
                console.error('Forum search failed:', error.message);
            }
        }
        // Calculate comprehensive quality score including all sources
        const allSources = [
            ...uniqueResults,
            ...stackOverflowAnswers,
            ...gitHubIssues,
            ...youtubeVideos,
            ...redditPosts,
            ...devToArticles,
            ...codeProjectArticles,
            ...stackExchangeQuestions,
            ...quoraAnswers,
            ...forumPosts
        ];
        const qualityScore = this.calculateQualityScore(allSources);
        const totalSources = allSources.length;
        console.log(`📊 Research complete: ${totalSources} sources, quality score: ${qualityScore.toFixed(2)}`);
        console.log(`📈 Source breakdown: ${uniqueResults.length} search, ${stackOverflowAnswers.length} SO, ${gitHubIssues.length} GitHub, ${youtubeVideos.length} YouTube, ${redditPosts.length} Reddit, ${devToArticles.length} DEV.to, ${codeProjectArticles.length} CodeProject, ${stackExchangeQuestions.length} StackExchange, ${quoraAnswers.length} Quora, ${forumPosts.length} forums`);
        return {
            searchResults: uniqueResults,
            stackOverflowAnswers,
            gitHubIssues,
            youtubeVideos,
            redditPosts,
            devToArticles,
            codeProjectArticles,
            stackExchangeQuestions,
            quoraAnswers,
            forumPosts,
            qualityScore,
            totalSources,
            productComplexity: productSize
        };
    }
    /**
     * Deduplicate search results by URL
     */
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            const normalized = result.url.toLowerCase().split('?')[0]; // Remove query params
            if (seen.has(normalized))
                return false;
            seen.add(normalized);
            return true;
        });
    }
    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname.replace('www.', '');
        }
        catch {
            return '';
        }
    }
    /**
     * Convert any source type to a SearchResult-compatible format for quality scoring
     */
    convertToSearchResult(source) {
        // Already a SearchResult
        if (source.snippet && source.source) {
            return source;
        }
        // Handle different source types
        let url = source.url || '';
        let title = source.title || source.question || '';
        let snippet = source.snippet || source.answer || source.content || source.description || source.summary || '';
        return {
            title,
            url,
            snippet,
            source: 'cache',
            domain: this.extractDomain(url)
        };
    }
    /**
     * Calculate quality score for any type of sources
     */
    calculateQualityScore(sources) {
        if (sources.length === 0)
            return 0;
        // Convert all sources to SearchResult format for uniform processing
        const results = sources.map(source => this.convertToSearchResult(source));
        let score = 0;
        const weights = {
            stackoverflow: 2,
            stackexchange: 2, // Stack Exchange sites have similar authority
            github: 2,
            documentation: 3,
            youtube: 1.5,
            reddit: 1.2, // Community insights
            devto: 1.3, // Quality tutorials
            codeproject: 1.3, // Code examples
            quora: 1.0, // Expert answers
            forums: 1.4, // Official community support
            blog: 1,
            other: 0.5
        };
        results.forEach(result => {
            const domain = result.domain || '';
            if (domain.includes('stackoverflow.com')) {
                score += weights.stackoverflow;
            }
            else if (domain.includes('stackexchange.com')) {
                score += weights.stackexchange;
            }
            else if (domain.includes('github.com')) {
                score += weights.github;
            }
            else if (domain.includes('docs') || domain.includes('documentation')) {
                score += weights.documentation;
            }
            else if (domain.includes('youtube.com')) {
                score += weights.youtube;
            }
            else if (domain.includes('reddit.com')) {
                score += weights.reddit;
            }
            else if (domain.includes('dev.to')) {
                score += weights.devto;
            }
            else if (domain.includes('codeproject.com')) {
                score += weights.codeproject;
            }
            else if (domain.includes('quora.com')) {
                score += weights.quora;
            }
            else if (domain.includes('community.') || domain.includes('forum')) {
                score += weights.forums;
            }
            else if (domain.includes('blog') || domain.includes('medium.com')) {
                score += weights.blog;
            }
            else {
                score += weights.other;
            }
        });
        // Normalize to 0-1 scale
        return Math.min(score / (results.length * 3), 1);
    }
}
// Export singleton instance
export const searchService = new SearchService();
