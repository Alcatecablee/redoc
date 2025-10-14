import fetch from 'node-fetch';
import { storage } from './storage';
import { generateEnhancedDocumentation } from './enhanced-generator';

// Reusable JSON parsing with AI retry (copied/adapted)
export async function parseJSONWithRetry(apiKey: string, content: string, retryPrompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;

  try {
    return JSON.parse(content);
  } catch (error) {
    // try to extract JSON from code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('Extracted JSON parse failed');
      }
    }

    for (let i = 0; i < maxRetries; i++) {
      try {
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5',
            messages: [
              { role: 'system', content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.' },
              { role: 'user', content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}` }
            ],
            response_format: { type: 'json_object' }
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const fixedContent = retryData.choices?.[0]?.message?.content || '{}';
          return JSON.parse(fixedContent);
        }
      } catch (retryError) {
        lastError = retryError as Error;
        console.log(`Retry ${i + 1} failed:`, retryError);
      }
    }

    throw lastError || new Error('Failed to parse JSON after retries');
  }
}

export async function generateDocumentationPipeline(url: string, userId: string | null, sessionId?: string) {
  // Use the enhanced documentation generation system
  return await generateEnhancedDocumentation(url, userId, sessionId);
}
