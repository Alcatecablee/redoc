import fetch from 'node-fetch';
import { storage } from './storage';
import { generateEnhancedDocumentation } from './enhanced-generator';
import { createAIProvider } from './ai-provider';

// Reusable JSON parsing with AI retry using the provider abstraction
export async function parseJSONWithRetry(aiProvider: ReturnType<typeof createAIProvider>, content: string, retryPrompt: string, maxRetries = 2): Promise<any> {
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

    return await aiProvider.parseJSONWithRetry(content, retryPrompt, maxRetries);
  }
}

export async function generateDocumentationPipeline(url: string, userId: string | null, sessionId?: string, userPlan: string = 'free') {
  // Use the enhanced documentation generation system
  return await generateEnhancedDocumentation(url, userId, sessionId, userPlan);
}
