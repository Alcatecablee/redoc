import { createAIProvider } from './ai-provider';
import { YouTubeVideo } from './youtube-service';

export interface VideoAnalysis {
  summary: string;
  keyTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  timestamps: Array<{time: string, title: string, seconds: number}>;
  actionableInsights: string[];
  relatedConcepts: string[];
}

export class VideoContentAnalyzer {
  private aiProvider: ReturnType<typeof createAIProvider>;

  constructor() {
    try {
      this.aiProvider = createAIProvider();
    } catch (error) {
      console.error('Failed to initialize AI provider for video analysis:', error);
      // Fallback to null - will use default analysis
      this.aiProvider = null as any;
    }
  }

  /**
   * Analyze video content and generate comprehensive insights
   */
  async analyzeVideoContent(video: YouTubeVideo): Promise<VideoAnalysis> {
    try {
      console.log(`🎬 Analyzing video: ${video.title}`);

      // Prepare content for analysis
      const contentToAnalyze = this.prepareContentForAnalysis(video);
      
      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(contentToAnalyze, video);
      
      // Extract timestamps if not already present
      if (!video.timestamps || video.timestamps.length === 0) {
        analysis.timestamps = await this.extractTimestampsFromContent(video);
      }

      console.log(`✅ Video analysis complete: ${video.title}`);
      return analysis;

    } catch (error) {
      console.error('Video analysis error:', error);
      return this.getDefaultAnalysis(video);
    }
  }

  /**
   * Generate AI-powered summary of video content
   */
  async generateVideoSummary(video: YouTubeVideo): Promise<string> {
    try {
      if (!this.aiProvider) {
        return `Video tutorial covering ${video.title} by ${video.channelTitle}`;
      }

      const prompt = `Analyze this YouTube video and create a concise, professional summary:

Title: ${video.title}
Description: ${video.description.substring(0, 1000)}...
Duration: ${video.duration}
Views: ${video.views.toLocaleString()}
Channel: ${video.channelTitle}

Create a 2-3 sentence summary that captures:
1. What the video teaches
2. Who it's for (beginner/intermediate/advanced)
3. Key value proposition

Format as a professional documentation summary.`;

      const response = await this.aiProvider.generateContent(prompt);
      return response.trim();
    } catch (error) {
      console.error('Video summary generation error:', error);
      return `Video tutorial covering ${video.title} by ${video.channelTitle}`;
    }
  }

  /**
   * Extract key topics from video content
   */
  async extractKeyTopics(video: YouTubeVideo): Promise<string[]> {
    try {
      const prompt = `Extract the main technical topics and concepts from this YouTube video:

Title: ${video.title}
Description: ${video.description.substring(0, 1000)}...

Return a JSON array of 3-5 key topics that would be relevant for documentation.
Focus on technical concepts, tools, frameworks, or methodologies mentioned.

Example: ["React Hooks", "State Management", "useEffect", "Custom Hooks", "Performance Optimization"]`;

      const response = await this.aiProvider.generateContent(prompt);
      
      try {
        const topics = JSON.parse(response);
        return Array.isArray(topics) ? topics.slice(0, 5) : [];
      } catch {
        // Fallback: extract topics from title and description
        return this.extractTopicsFromText(video.title + ' ' + video.description);
      }
    } catch (error) {
      console.error('Key topics extraction error:', error);
      return this.extractTopicsFromText(video.title);
    }
  }

  /**
   * Prepare content for AI analysis
   */
  private prepareContentForAnalysis(video: YouTubeVideo): string {
    const parts = [
      `Title: ${video.title}`,
      `Channel: ${video.channelTitle}`,
      `Duration: ${video.duration}`,
      `Views: ${video.views.toLocaleString()}`,
      `Description: ${video.description.substring(0, 2000)}`
    ];

    if (video.transcript) {
      parts.push(`Transcript: ${video.transcript.substring(0, 3000)}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate comprehensive AI analysis
   */
  private async generateAIAnalysis(content: string, video: YouTubeVideo): Promise<VideoAnalysis> {
    const prompt = `Analyze this YouTube video content and provide a comprehensive analysis:

${content}

Provide analysis in this JSON format:
{
  "summary": "2-3 sentence professional summary",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "difficulty": "beginner|intermediate|advanced",
  "category": "tutorial|demo|explanation|walkthrough",
  "actionableInsights": ["insight1", "insight2"],
  "relatedConcepts": ["concept1", "concept2"]
}

Focus on technical content and educational value.`;

    try {
      const response = await this.aiProvider.generateContent(prompt);
      const analysis = JSON.parse(response);
      
      return {
        summary: analysis.summary || `Video tutorial: ${video.title}`,
        keyTopics: analysis.keyTopics || [],
        difficulty: analysis.difficulty || 'intermediate',
        category: analysis.category || 'tutorial',
        timestamps: [],
        actionableInsights: analysis.actionableInsights || [],
        relatedConcepts: analysis.relatedConcepts || []
      };
    } catch (error) {
      console.error('AI analysis parsing error:', error);
      return this.getDefaultAnalysis(video);
    }
  }

  /**
   * Extract timestamps from video description or transcript
   */
  private async extractTimestampsFromContent(video: YouTubeVideo): Promise<Array<{time: string, title: string, seconds: number}>> {
    const timestamps: Array<{time: string, title: string, seconds: number}> = [];
    
    // Extract from description
    const description = video.description;
    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/g;
    let match;
    
    while ((match = timestampRegex.exec(description)) !== null) {
      const timeStr = match[1];
      const title = match[2].trim();
      const seconds = this.timeStringToSeconds(timeStr);
      
      timestamps.push({ time: timeStr, title, seconds });
    }
    
    return timestamps;
  }

  /**
   * Extract topics from text using simple keyword extraction
   */
  private extractTopicsFromText(text: string): string[] {
    const commonTechTerms = [
      'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'Python', 'Node.js',
      'API', 'Database', 'Authentication', 'Security', 'Testing', 'Deployment',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'Git', 'CI/CD', 'DevOps'
    ];
    
    const foundTopics = commonTechTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    
    return foundTopics.slice(0, 5);
  }

  /**
   * Convert time string to seconds
   */
  private timeStringToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    
    return 0;
  }

  /**
   * Get default analysis when AI analysis fails
   */
  private getDefaultAnalysis(video: YouTubeVideo): VideoAnalysis {
    return {
      summary: `Video tutorial: ${video.title}`,
      keyTopics: this.extractTopicsFromText(video.title),
      difficulty: 'intermediate',
      category: 'tutorial',
      timestamps: [],
      actionableInsights: [],
      relatedConcepts: []
    };
  }
}

// Export singleton instance
export const videoContentAnalyzer = new VideoContentAnalyzer();
