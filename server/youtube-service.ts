import fetch from 'node-fetch';
import { videoContentAnalyzer, VideoAnalysis } from './video-content-analyzer';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration: string;
  views: number;
  likes: number;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  transcript?: string;
  timestamps?: Array<{time: string, title: string, seconds: number}>;
  trustScore: number;
  summary?: string;
  keyTopics?: string[];
  analysis?: VideoAnalysis;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  totalResults: number;
  qualityScore: number;
}

export class YouTubeService {
  private apiKey: string | undefined;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY;
    if (!this.apiKey) {
      console.warn('YouTube API key not provided. YouTube API features will be disabled.');
    }
  }

  /**
   * Search for videos related to a product/service
   */
  async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult> {
    if (!this.apiKey) {
      return { videos: [], totalResults: 0, qualityScore: 0 };
    }

    try {
      // Search for videos
      const searchUrl = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${this.apiKey}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        throw new Error(`YouTube API search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return { videos: [], totalResults: 0, qualityScore: 0 };
      }

      // Get video IDs for detailed information
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      
      // Get detailed video information
      const detailsUrl = `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (!detailsResponse.ok) {
        throw new Error(`YouTube API details failed: ${detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();
      
      // Process videos
      const videos: YouTubeVideo[] = detailsData.items.map((video: any) => {
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

    } catch (error) {
      console.error('YouTube API search error:', error);
      return { videos: [], totalResults: 0, qualityScore: 0 };
    }
  }

  /**
   * Get video transcript if available
   */
  async getVideoTranscript(videoId: string): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // Get available captions
      const captionsUrl = `${this.baseUrl}/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
      const captionsResponse = await fetch(captionsUrl);
      
      if (!captionsResponse.ok) {
        return null;
      }

      const captionsData = await captionsResponse.json();
      
      if (!captionsData.items || captionsData.items.length === 0) {
        return null;
      }

      // Find auto-generated or manual captions
      const caption = captionsData.items.find((item: any) => 
        item.snippet.trackKind === 'asr' || item.snippet.trackKind === 'standard'
      );

      if (!caption) {
        return null;
      }

      // For now, we'll use a placeholder that indicates transcript availability
      // In a production environment, you'd need to use the YouTube Transcript API
      // or a service like youtube-transcript-api to get the actual transcript content
      return `[Transcript available for ${videoId} - ${caption.snippet.name}]`;

    } catch (error) {
      console.error('YouTube transcript error:', error);
      return null;
    }
  }

  /**
   * Extract video timestamps from transcript or description
   */
  async extractVideoTimestamps(videoId: string, description?: string): Promise<Array<{time: string, title: string, seconds: number}>> {
    const timestamps: Array<{time: string, title: string, seconds: number}> = [];
    
    // Try to extract timestamps from description
    if (description) {
      const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/g;
      let match;
      
      while ((match = timestampRegex.exec(description)) !== null) {
        const timeStr = match[1];
        const title = match[2].trim();
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
  private timeStringToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return 0;
  }

  /**
   * Calculate trust score for a video based on engagement metrics
   */
  private calculateTrustScore(statistics: any, snippet: any): number {
    const views = parseInt(statistics.viewCount || '0');
    const likes = parseInt(statistics.likeCount || '0');
    const dislikes = parseInt(statistics.dislikeCount || '0');
    
    let score = 0.5; // Base score

    // View count scoring (logarithmic)
    if (views > 1000000) score += 0.3;
    else if (views > 100000) score += 0.2;
    else if (views > 10000) score += 0.1;
    else if (views < 1000) score -= 0.2;

    // Like ratio scoring
    const totalReactions = likes + dislikes;
    if (totalReactions > 0) {
      const likeRatio = likes / totalReactions;
      if (likeRatio > 0.9) score += 0.2;
      else if (likeRatio > 0.8) score += 0.1;
      else if (likeRatio < 0.5) score -= 0.1;
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
  private calculateOverallQuality(videos: YouTubeVideo[]): number {
    if (videos.length === 0) return 0;

    const avgTrustScore = videos.reduce((sum, video) => sum + video.trustScore, 0) / videos.length;
    const highQualityVideos = videos.filter(video => video.trustScore > 0.7).length;
    const qualityRatio = highQualityVideos / videos.length;

    return (avgTrustScore + qualityRatio) / 2;
  }

  /**
   * Parse YouTube duration format (PT4M13S) to readable format
   */
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Perform comprehensive video content analysis
   */
  async analyzeVideoContent(video: YouTubeVideo, enableTranscripts: boolean = false): Promise<YouTubeVideo> {
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

    } catch (error) {
      console.error('Video content analysis error:', error);
      return video;
    }
  }

  /**
   * Batch analyze multiple videos
   */
  async analyzeVideoBatch(videos: YouTubeVideo[], enableTranscripts: boolean = false): Promise<YouTubeVideo[]> {
    const analyzedVideos: YouTubeVideo[] = [];
    
    for (const video of videos) {
      try {
        const analyzed = await this.analyzeVideoContent(video, enableTranscripts);
        analyzedVideos.push(analyzed);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze video ${video.id}:`, error);
        analyzedVideos.push(video);
      }
    }
    
    return analyzedVideos;
  }

  /**
   * Check if YouTube API is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const youtubeService = new YouTubeService();
