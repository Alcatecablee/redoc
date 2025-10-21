import fetch from 'node-fetch';
import { withTimeout, retryWithFallback } from './utils/retry-with-fallback';
export class AIProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async generateCompletion(messages, options = {}) {
        const { jsonMode = false, maxRetries = 3, timeoutMs = 60000 } = options;
        // Build provider order from config with sensible default
        const order = (this.config.providerOrder && this.config.providerOrder.length > 0)
            ? this.config.providerOrder
            : ['groq', 'openai', 'deepseek', 'ollama'];
        const providers = [];
        for (const p of order) {
            if (p === 'groq' && this.config.groqApiKey) {
                providers.push(() => withTimeout(this.callGroq(messages, jsonMode), timeoutMs, 'groq timed out'));
            }
            if (p === 'openai' && this.config.openaiApiKey) {
                providers.push(() => withTimeout(this.callOpenAI(messages, jsonMode), timeoutMs, 'openai timed out'));
            }
            if (p === 'deepseek' && this.config.deepseekApiKey) {
                providers.push(() => withTimeout(this.callDeepSeek(messages, jsonMode), timeoutMs, 'deepseek timed out'));
            }
            if (p === 'ollama' && (this.config.ollamaBaseUrl || process.env.OLLAMA_BASE_URL)) {
                providers.push(() => withTimeout(this.callOllama(messages, jsonMode), timeoutMs, 'ollama timed out'));
            }
        }
        if (providers.length === 0) {
            throw new Error('No AI providers configured. Set at least one of GROQ_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or OLLAMA_BASE_URL');
        }
        const result = await retryWithFallback(providers, {
            maxRetries,
            timeout: timeoutMs,
            cacheResults: false,
        });
        return result.data;
    }
    async callDeepSeek(messages, jsonMode) {
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
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return {
            content,
            provider: 'deepseek',
            model: 'deepseek-chat',
        };
    }
    async callOpenAI(messages, jsonMode) {
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
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return {
            content,
            provider: 'openai',
            model: 'gpt-5',
        };
    }
    async callGroq(messages, jsonMode) {
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
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return {
            content,
            provider: 'groq',
            model: 'llama-3.3-70b-versatile',
        };
    }
    async callOllama(messages, jsonMode) {
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
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return {
            content,
            provider: 'ollama',
            model,
        };
    }
    async parseJSONWithRetry(content, retryPrompt, maxRetries = 3) {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await this.generateCompletion([
                    { role: 'system', content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.' },
                    { role: 'user', content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}` }
                ], { jsonMode: true });
                const parsed = JSON.parse(response.content);
                console.log(`✅ JSON parsed successfully using ${response.provider} (attempt ${i + 1})`);
                return parsed;
            }
            catch (error) {
                lastError = error;
                console.log(`Retry ${i + 1} failed:`, error.message);
            }
        }
        throw lastError || new Error('Failed to parse JSON after retries');
    }
}
export function createAIProvider() {
    return new AIProvider({
        deepseekApiKey: process.env.DEEPSEEK_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        groqApiKey: process.env.GROQ_API_KEY,
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
        ollamaModel: process.env.OLLAMA_MODEL,
        providerOrder: (process.env.AI_PROVIDER_ORDER || '').split(',').map(s => s.trim()).filter(Boolean),
    });
}
