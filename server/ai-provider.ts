import fetch from 'node-fetch';
import { retryWithFallback } from './utils/retry-with-fallback';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: 'deepseek' | 'openai' | 'groq' | 'ollama';
  model: string;
}

interface AIProviderConfig {
  deepseekApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  providerOrder?: string[]; // e.g. ['openai','groq','deepseek','ollama']
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
    const { jsonMode = false, maxRetries = 3, timeoutMs = 30000 } = options;

    // Build provider call chain based on configured order and available credentials
    const order = (this.config.providerOrder && this.config.providerOrder.length > 0)
      ? this.config.providerOrder
      : ['openai', 'groq', 'deepseek', 'ollama'];

    const providers: Array<() => Promise<AIResponse>> = [];

    for (const p of order) {
      if (p === 'openai' && this.config.openaiApiKey) {
        providers.push(() => this.callOpenAI(messages, jsonMode));
      }
      if (p === 'groq' && this.config.groqApiKey) {
        providers.push(() => this.callGroq(messages, jsonMode));
      }
      if (p === 'deepseek' && this.config.deepseekApiKey) {
        providers.push(() => this.callDeepSeek(messages, jsonMode));
      }
      if (p === 'ollama' && (this.config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL)) {
        providers.push(() => this.callOllama(messages, jsonMode));
      }
    }

    if (providers.length === 0) {
      throw new Error('No AI providers configured. Set at least one of OPENAI_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, or OLLAMA_BASE_URL');
    }

    const result = await retryWithFallback<AIResponse>(providers, {
      maxRetries,
      timeout: timeoutMs,
      cacheResults: false,
    });

    return result.data;
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

  private async callOllama(messages: AIMessage[], jsonMode: boolean): Promise<AIResponse> {
    const baseUrl = (this.config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = this.config.ollamaModel || process.env.OLLAMA_MODEL || 'llama3.1:8b-instruct';

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        // Ollama is OpenAI-compatible; send response_format only when needed
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'ollama',
      model,
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
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
    providerOrder: (process.env.AI_PROVIDER_ORDER || '').split(',').map(s => s.trim()).filter(Boolean),
  });
}
