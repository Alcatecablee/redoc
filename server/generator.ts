import fetch from 'node-fetch';
import { storage } from './storage';
import { generateEnhancedDocumentation } from './enhanced-generator';
import { createAIProvider } from './ai-provider';
import { withPipelineTimeout, TimeoutError } from './utils/pipeline-timeout';
import { progressTracker } from './progress-tracker';
import { pipelineMonitor } from './utils/pipeline-monitor';

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
  // Ensure we have a consistent session ID for both progress tracker and pipeline monitor
  const effectiveSessionId = sessionId || `sess_${Math.random().toString(36).slice(2)}`;
  let timeoutHandled = false;
  
  try {
    // Wrap pipeline with 10-minute timeout
    const result = await withPipelineTimeout(
      async (abortSignal) => {
        // Pass the effective session ID to ensure ID consistency
        return await generateEnhancedDocumentation(url, userId, effectiveSessionId, userPlan, abortSignal);
      },
      {
        totalTimeoutMs: 10 * 60 * 1000, // 10 minutes
        onTimeout: async () => {
          console.error(`⏱️ Pipeline timeout for session ${effectiveSessionId}`);
          timeoutHandled = true;
          
          // Cleanup progress tracker
          progressTracker.endSession(effectiveSessionId, 'error');
          
          // Cleanup pipeline monitor - mark as failed
          for (let stage = 1; stage <= 7; stage++) {
            pipelineMonitor.failStage(effectiveSessionId, stage, 'Pipeline timeout exceeded');
          }
          pipelineMonitor.failPipeline(effectiveSessionId, 'Pipeline timeout exceeded (10 minutes)');
        }
      }
    );
    
    // Success path - mark pipeline as completed
    pipelineMonitor.completePipeline(effectiveSessionId);
    
    return result;
  } catch (error: any) {
    // Skip cleanup if timeout already handled it
    if (timeoutHandled) {
      throw error;
    }
    
    // Cleanup on error - both progress tracker and pipeline monitor
    console.error('Pipeline error:', error.message);
    
    // Cleanup progress tracker
    progressTracker.endSession(effectiveSessionId, 'error');
    
    // Cleanup pipeline monitor - mark as failed
    for (let stage = 1; stage <= 7; stage++) {
      pipelineMonitor.failStage(effectiveSessionId, stage, error.message);
    }
    pipelineMonitor.failPipeline(effectiveSessionId, error.message);
    
    throw error;
  }
}
