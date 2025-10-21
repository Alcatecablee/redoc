import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export interface TTSOptions {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
  format: string;
  voice: string;
}

/**
 * Text-to-Speech Service for Enterprise tier
 * Generates audio narration of documentation using OpenAI TTS API
 */
export class TextToSpeechService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1/audio/speech';
  private audioDir: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.audioDir = join(process.cwd(), 'public', 'audio');
    
    if (!this.apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set - TTS features disabled');
    }
  }

  /**
   * Check if TTS is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(options: TTSOptions): Promise<TTSResult> {
    if (!this.isAvailable()) {
      throw new Error('TTS service not available - OPENAI_API_KEY not configured');
    }

    try {
      console.log(`🎙️ Generating speech (${options.voice || 'alloy'}) - ${options.text.length} chars`);

      // Ensure audio directory exists
      await mkdir(this.audioDir, { recursive: true });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: options.text,
          voice: options.voice || 'alloy',
          speed: options.speed || 1.0,
          response_format: options.format || 'mp3',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`TTS API error: ${response.status} - ${error}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `tts_${timestamp}.${options.format || 'mp3'}`;
      const filepath = join(this.audioDir, filename);

      // Write audio to file
      const buffer = await response.arrayBuffer();
      const nodeBuffer = Buffer.from(buffer);
      
      await writeFile(filepath, nodeBuffer);

      // Estimate duration (rough approximation: ~150 words per minute)
      const wordCount = options.text.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60;

      console.log(`✅ Speech generated: ${filename} (${Math.round(estimatedDuration)}s)`);

      return {
        audioUrl: `/audio/${filename}`,
        duration: estimatedDuration,
        format: options.format || 'mp3',
        voice: options.voice || 'alloy',
      };
    } catch (error) {
      console.error('TTS generation error:', error);
      throw error;
    }
  }

  /**
   * Generate speech for documentation sections
   */
  async generateDocumentationAudio(sections: { title: string; content: string }[]): Promise<TTSResult[]> {
    const results: TTSResult[] = [];
    
    for (const section of sections) {
      const text = `${section.title}. ${section.content}`;
      
      // Skip very short sections
      if (text.length < 100) continue;
      
      try {
        const result = await this.generateSpeech({
          text: text.slice(0, 4096), // OpenAI limit
          voice: 'alloy',
          format: 'mp3',
        });
        
        results.push(result);
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate audio for section: ${section.title}`, error);
      }
    }
    
    return results;
  }

  /**
   * List available voices with descriptions
   */
  getAvailableVoices(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
      { id: 'echo', name: 'Echo', description: 'Clear and professional' },
      { id: 'fable', name: 'Fable', description: 'Warm and expressive' },
      { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', description: 'Energetic and friendly' },
      { id: 'shimmer', name: 'Shimmer', description: 'Soft and soothing' },
    ];
  }

  /**
   * Clean up old audio files
   */
  async cleanupOldFiles(olderThanDays: number = 7): Promise<number> {
    try {
      const { readdir, stat, unlink } = await import('fs/promises');
      const files = await readdir(this.audioDir);
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      let deleted = 0;
      for (const file of files) {
        if (!file.startsWith('tts_')) continue;
        
        const filepath = join(this.audioDir, file);
        const stats = await stat(filepath);
        
        if (stats.mtimeMs < cutoffTime) {
          await unlink(filepath);
          deleted++;
        }
      }
      
      console.log(`🧹 Cleaned up ${deleted} old audio files`);
      return deleted;
    } catch (error) {
      console.error('Audio cleanup error:', error);
      return 0;
    }
  }
}

export const ttsService = new TextToSpeechService();
