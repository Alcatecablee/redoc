import fetch from 'node-fetch';
import { YoutubeTranscript } from 'youtube-transcript';
import { videoContentAnalyzer } from './video-content-analyzer';
export class YouTubeService {
    apiKey;
    baseUrl = 'https://www.googleapis.com/youtube/v3';
    quotaUsed = 0;
    quotaLimit = 10000;
    quotaResetTime = new Date();
    transcriptCache = new Map();
    static TRANSCRIPT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
        if (!this.apiKey) {
            console.warn('YouTube API key not provided. YouTube API features will be disabled.');
        }
        // Reset quota daily
        const now = new Date();
        this.quotaResetTime.setHours(24, 0, 0, 0);
        if (this.quotaResetTime <= now) {
            this.quotaResetTime.setDate(this.quotaResetTime.getDate() + 1);
        }
    }
    /**
     * Track API quota usage
     */
    trackQuota(units, operation) {
        this.quotaUsed += units;
        const percentUsed = (this.quotaUsed / this.quotaLimit) * 100;
        if (percentUsed >= 90) {
            console.warn(`⚠️ YouTube API quota at ${this.quotaUsed}/${this.quotaLimit} (${percentUsed.toFixed(1)}%) - ${operation}`);
        }
        else if (percentUsed >= 50) {
            console.log(`📊 YouTube API quota: ${this.quotaUsed}/${this.quotaLimit} (${percentUsed.toFixed(1)}%) - ${operation}`);
        }
        // Check if we need to reset quota
        const now = new Date();
        if (now >= this.quotaResetTime) {
            this.quotaUsed = 0;
            this.quotaResetTime.setDate(this.quotaResetTime.getDate() + 1);
            console.log(`🔄 YouTube API quota reset`);
        }
    }
    /**
     * Get current quota usage
     */
    getQuotaStatus() {
        return {
            used: this.quotaUsed,
            limit: this.quotaLimit,
            remaining: this.quotaLimit - this.quotaUsed,
            percentUsed: (this.quotaUsed / this.quotaLimit) * 100
        };
    }
    /**
     * Validate YouTube API key
     */
    async validateApiKey() {
        if (!this.apiKey) {
            return false;
        }
        try {
            const testUrl = `${this.baseUrl}/search?part=snippet&q=test&maxResults=1&key=${this.apiKey}`;
            const response = await fetch(testUrl);
            if (response.ok) {
                console.log('✅ YouTube API key validated successfully');
                return true;
            }
            else {
                console.error(`❌ YouTube API key validation failed: ${response.status}`);
                return false;
            }
        }
        catch (error) {
            console.error('❌ YouTube API key validation error:', error);
            return false;
        }
    }
    /**
     * Search for videos related to a product/service with fallback to SerpAPI
     */
    async searchVideos(query, maxResults = 10) {
        // If no API key, immediately fallback to SerpAPI search
        if (!this.apiKey) {
            console.log('⚠️ YouTube API key not configured, using SerpAPI fallback');
            return this.searchVideosViaSerpApiFallback(query, maxResults);
        }
        try {
            // Track quota for search operation (100 units)
            this.trackQuota(100, 'search');
            // Search for videos with timeout protection
            const searchUrl = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${this.apiKey}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            const searchResponse = await fetch(searchUrl, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!searchResponse.ok) {
                // Check for quota errors
                if (searchResponse.status === 403) {
                    console.error('❌ YouTube API quota exceeded, falling back to SerpAPI');
                    return this.searchVideosViaSerpApiFallback(query, maxResults);
                }
                throw new Error(`YouTube API search failed: ${searchResponse.status}`);
            }
            const searchData = await searchResponse.json();
            if (!searchData.items || searchData.items.length === 0) {
                console.log('⚠️ YouTube API returned no results, trying SerpAPI fallback');
                return this.searchVideosViaSerpApiFallback(query, maxResults);
            }
            // Get video IDs for detailed information
            const videoIds = searchData.items.map((item) => item.id.videoId).join(',');
            // Track quota for video details operation (1 unit per video)
            this.trackQuota(searchData.items.length, 'video details');
            // Get detailed video information
            const detailsUrl = `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            if (!detailsResponse.ok) {
                console.error('❌ YouTube API details failed, falling back to SerpAPI');
                return this.searchVideosViaSerpApiFallback(query, maxResults);
            }
            const detailsData = await detailsResponse.json();
            // Process videos
            const videos = detailsData.items.map((video) => {
                const snippet = video.snippet;
                const statistics = video.statistics;
                const contentDetails = video.contentDetails;
                return {
                    id: video.id,
                    title: snippet.title,
                    description: snippet.description,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                    thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
                    duration: this.parseDuration(contentDetails.duration),
                    views: parseInt(statistics.viewCount || '0'),
                    likes: parseInt(statistics.likeCount || '0'),
                    channelTitle: snippet.channelTitle,
                    channelId: snippet.channelId,
                    publishedAt: snippet.publishedAt,
                    trustScore: this.calculateTrustScore(statistics, snippet)
                };
            });
            // Sort by trust score (highest first)
            videos.sort((a, b) => b.trustScore - a.trustScore);
            const qualityScore = this.calculateOverallQuality(videos);
            return {
                videos,
                totalResults: searchData.pageInfo?.totalResults || videos.length,
                qualityScore
            };
        }
        catch (error) {
            console.error('YouTube API search error:', error.message);
            console.log('📡 Falling back to SerpAPI search...');
            return this.searchVideosViaSerpApiFallback(query, maxResults);
        }
    }
    /**
     * Fallback search using SerpAPI when YouTube API is unavailable
     * This method uses dynamic import to avoid circular dependency
     */
    async searchVideosViaSerpApiFallback(query, maxResults) {
        try {
            // Dynamic import to avoid circular dependency
            const { searchService } = await import('./search-service');
            // Search YouTube via SerpAPI
            const searchQuery = `${query} site:youtube.com`;
            const searchResults = await searchService.search(searchQuery, maxResults);
            // Filter for YouTube results
            const youtubeResults = searchResults.filter(r => r.domain?.includes('youtube.com'));
            // Convert search results to YouTube video format
            const videos = this.convertSearchResultsToYouTubeVideos(youtubeResults);
            console.log(`✅ SerpAPI fallback found ${videos.length} YouTube videos`);
            return {
                videos,
                totalResults: videos.length,
                qualityScore: videos.length > 0 ? 0.6 : 0 // Lower quality score for fallback results
            };
        }
        catch (error) {
            console.error('SerpAPI fallback also failed:', error.message);
            return { videos: [], totalResults: 0, qualityScore: 0 };
        }
    }
    /**
     * Convert search results to YouTube video format
     * Handles various YouTube URL formats including shorts, live streams, and embeds
     */
    convertSearchResultsToYouTubeVideos(searchResults) {
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
     * Get video transcript using youtube-transcript library
     * Includes caching to reduce API calls
     */
    async getVideoTranscript(videoId) {
        try {
            // Check cache first
            const cached = this.transcriptCache.get(videoId);
            if (cached && Date.now() - cached.timestamp < YouTubeService.TRANSCRIPT_CACHE_TTL_MS) {
                console.log(`📦 Using cached transcript for ${videoId}`);
                return cached.transcript;
            }
            console.log(`🎬 Fetching transcript for video: ${videoId}`);
            // Fetch transcript using youtube-transcript library
            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
            if (!transcriptData || transcriptData.length === 0) {
                console.log(`⚠️ No transcript available for ${videoId}`);
                return undefined;
            }
            // Convert transcript segments to full text
            const fullTranscript = transcriptData.map((segment) => segment.text).join(' ');
            // Cache the transcript
            this.transcriptCache.set(videoId, {
                transcript: fullTranscript,
                timestamp: Date.now()
            });
            console.log(`✅ Transcript fetched (${fullTranscript.length} chars) for ${videoId}`);
            return fullTranscript;
        }
        catch (error) {
            console.error(`YouTube transcript error for ${videoId}:`, error);
            // Transcript not available is a common case, not an error
            if (error.message?.includes('Transcript is disabled') ||
                error.message?.includes('No transcripts available')) {
                console.log(`ℹ️ Transcripts not available for ${videoId}`);
            }
            return undefined;
        }
    }
    /**
     * Extract video timestamps from transcript or description
     * Improved regex to handle various timestamp formats
     */
    async extractVideoTimestamps(videoId, description) {
        const timestamps = [];
        // Try to extract timestamps from description
        if (description) {
            // Enhanced regex to match various formats:
            // 0:00 Title, (0:00) Title, [0:00] Title, 0:00 - Title, 0:00: Title
            const timestampRegex = /[([]*(\d{1,2}:\d{2}(?::\d{2})?)[)\]]*[\s\-–—:]+(.+?)(?=\n|[([]*\d{1,2}:\d{2}|$)/g;
            let match;
            while ((match = timestampRegex.exec(description)) !== null) {
                const timeStr = match[1];
                const title = match[2].trim();
                // Skip if title is too short (likely not a real timestamp)
                if (title.length < 3)
                    continue;
                const seconds = this.timeStringToSeconds(timeStr);
                timestamps.push({
                    time: timeStr,
                    title,
                    seconds
                });
            }
        }
        return timestamps;
    }
    /**
     * Convert time string (MM:SS or HH:MM:SS) to seconds
     */
    timeStringToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        }
        else if (parts.length === 3) {
            // HH:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
    /**
     * Calculate trust score for a video based on engagement metrics
     */
    calculateTrustScore(statistics, snippet) {
        const views = parseInt(statistics.viewCount || '0');
        const likes = parseInt(statistics.likeCount || '0');
        const dislikes = parseInt(statistics.dislikeCount || '0');
        let score = 0.5; // Base score
        // View count scoring (logarithmic)
        if (views > 1000000)
            score += 0.3;
        else if (views > 100000)
            score += 0.2;
        else if (views > 10000)
            score += 0.1;
        else if (views < 1000)
            score -= 0.2;
        // Like ratio scoring
        const totalReactions = likes + dislikes;
        if (totalReactions > 0) {
            const likeRatio = likes / totalReactions;
            if (likeRatio > 0.9)
                score += 0.2;
            else if (likeRatio > 0.8)
                score += 0.1;
            else if (likeRatio < 0.5)
                score -= 0.1;
        }
        // Channel authority (basic check)
        const channelTitle = snippet.channelTitle.toLowerCase();
        if (channelTitle.includes('official') || channelTitle.includes('tutorial')) {
            score += 0.1;
        }
        return Math.min(Math.max(score, 0), 1);
    }
    /**
     * Calculate overall quality score for search results
     */
    calculateOverallQuality(videos) {
        if (videos.length === 0)
            return 0;
        const avgTrustScore = videos.reduce((sum, video) => sum + video.trustScore, 0) / videos.length;
        const highQualityVideos = videos.filter(video => video.trustScore > 0.7).length;
        const qualityRatio = highQualityVideos / videos.length;
        return (avgTrustScore + qualityRatio) / 2;
    }
    /**
     * Parse YouTube duration format (PT4M13S) to readable format
     */
    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return 'Unknown';
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    /**
     * Perform comprehensive video content analysis
     */
    async analyzeVideoContent(video, enableTranscripts = false) {
        try {
            console.log(`🎬 Analyzing video content: ${video.title}`);
            // Get transcript if enabled
            if (enableTranscripts) {
                video.transcript = await this.getVideoTranscript(video.id);
            }
            // Extract timestamps
            video.timestamps = await this.extractVideoTimestamps(video.id, video.description);
            // Generate AI analysis
            const analysis = await videoContentAnalyzer.analyzeVideoContent(video);
            video.analysis = analysis;
            video.summary = analysis.summary;
            video.keyTopics = analysis.keyTopics;
            console.log(`✅ Video analysis complete: ${video.title}`);
            return video;
        }
        catch (error) {
            console.error('Video content analysis error:', error);
            return video;
        }
    }
    /**
     * Batch analyze multiple videos with tier-aware concurrency
     */
    async analyzeVideoBatch(videos, enableTranscripts = false, tierLevel = 'pro') {
        const analyzedVideos = [];
        // Tier-aware concurrent limits
        const concurrencyLimits = {
            free: 1,
            pro: 3,
            enterprise: 5
        };
        const maxConcurrent = concurrencyLimits[tierLevel];
        // Tier-aware delays
        const delayLimits = {
            free: 3000, // 3 seconds for free tier
            pro: 2000, // 2 seconds for pro tier
            enterprise: 1000 // 1 second for enterprise tier
        };
        const delayBetweenBatches = delayLimits[tierLevel];
        for (let i = 0; i < videos.length; i += maxConcurrent) {
            const batch = videos.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(async (video) => {
                try {
                    const analyzed = await this.analyzeVideoContent(video, enableTranscripts);
                    return analyzed;
                }
                catch (error) {
                    console.error(`Failed to analyze video ${video.id}:`, error);
                    return video; // Return original video if analysis fails
                }
            });
            const batchResults = await Promise.all(batchPromises);
            analyzedVideos.push(...batchResults);
            // Rate limiting between batches
            if (i + maxConcurrent < videos.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
        return analyzedVideos;
    }
    /**
     * Check if YouTube API is available
     */
    isAvailable() {
        return !!this.apiKey;
    }
}
// Export singleton instance
export const youtubeService = new YouTubeService();
