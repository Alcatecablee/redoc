import fetch from 'node-fetch';
import { withTimeout } from './utils/retry-with-fallback';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: 'deepseek' | 'openai' | 'groq';
  model: string;
}

interface AIProviderConfig {
  deepseekApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
}

export class AIProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async generateCompletion(
    messages: AIMessage[],
    options: {
      jsonMode?: boolean;
      maxRetries?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<AIResponse> {
    const { jsonMode = false, maxRetries = 3, timeoutMs = 60000 } = options;

    const providers: Array<{
      name: AIResponse['provider'];
      fn: () => Promise<AIResponse>;
      enabled: boolean;
    }> = [
      { name: 'groq', enabled: !!this.config.groqApiKey, fn: () => this.callGroq(messages, jsonMode) },
      { name: 'openai', enabled: !!this.config.openaiApiKey, fn: () => this.callOpenAI(messages, jsonMode) },
      { name: 'deepseek', enabled: !!this.config.deepseekApiKey, fn: () => this.callDeepSeek(messages, jsonMode) },
    ];

    const activeProviders = providers.filter(p => p.enabled);
    if (activeProviders.length === 0) {
      throw new Error('No AI provider API keys configured. Please set GROQ_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY');
    }

    let lastError: Error | null = null;
    for (const provider of activeProviders) {
      for (let attempt = 0; attempt < Math.max(1, maxRetries); attempt++) {
        try {
          console.log(`🔄 AI call via ${provider.name} (attempt ${attempt + 1}/${maxRetries})`);
          const response = await withTimeout(provider.fn(), timeoutMs, `${provider.name} timed out after ${timeoutMs}ms`);
          console.log(`✅ ${provider.name} succeeded`);
          return response;
        } catch (err) {
          lastError = err as Error;
          console.warn(`⚠️ ${provider.name} attempt ${attempt + 1} failed:`, lastError.message);
          // small linear backoff between attempts
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }
      console.log(`❌ ${provider.name} failed after ${maxRetries} attempts, trying next provider...`);
    }

    throw lastError || new Error('All AI providers failed');
  }

  private async callDeepSeek(messages: AIMessage[], jsonMode: boolean): Promise<AIResponse> {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'deepseek',
      model: 'deepseek-chat',
    };
  }

  private async callOpenAI(messages: AIMessage[], jsonMode: boolean): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'openai',
      model: 'gpt-5',
    };
  }

  private async callGroq(messages: AIMessage[], jsonMode: boolean): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
    };
  }

  async parseJSONWithRetry(content: string, retryPrompt: string, maxRetries: number = 3): Promise<any> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await this.generateCompletion(
          [
            { role: 'system', content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.' },
            { role: 'user', content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}` }
          ],
          { jsonMode: true }
        );

        const parsed = JSON.parse(response.content);
        console.log(`✅ JSON parsed successfully using ${response.provider} (attempt ${i + 1})`);
        return parsed;
      } catch (error) {
        lastError = error as Error;
        console.log(`Retry ${i + 1} failed:`, (error as Error).message);
      }
    }

    throw lastError || new Error('Failed to parse JSON after retries');
  }
}

export function createAIProvider(): AIProvider {
  return new AIProvider({
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
  });
}
