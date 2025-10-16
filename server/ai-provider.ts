import fetch from 'node-fetch';

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
    } = {}
  ): Promise<AIResponse> {
    const { jsonMode = false, maxRetries = 3 } = options;

    // OpenAI and DeepSeek are currently disabled
    // They will be re-enabled when explicitly activated in environment config

    // Use Groq as the primary provider
    if (this.config.groqApiKey) {
      console.log('🟠 Using Groq API...');
      try {
        const response = await this.callGroq(messages, jsonMode);
        console.log('✅ Groq API succeeded');
        return response;
      } catch (error) {
        throw new Error(`Groq API failed: ${(error as Error).message}`);
      }
    }

    throw new Error('No AI provider API keys configured. Please set GROQ_API_KEY');
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
