// Error recovery and fallback mechanisms for YouTube integration

export interface ErrorRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  fallbackEnabled: boolean;
}

export class ErrorRecoveryService {
  private static defaultOptions: ErrorRecoveryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackEnabled: true
  };

  /**
   * Execute function with retry logic and fallback
   */
  static async executeWithRecovery<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    options: Partial<ErrorRecoveryOptions> = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt}/${config.maxRetries} failed:`, error);
        
        if (attempt < config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
        }
      }
    }

    // All retries failed, try fallback if enabled
    if (config.fallbackEnabled) {
      try {
        console.log('Attempting fallback operation...');
        return await fallback();
      } catch (fallbackError) {
        console.error('Fallback operation also failed:', fallbackError);
        throw lastError || fallbackError;
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * YouTube-specific error recovery
   */
  static async recoverYouTubeOperation<T>(
    operation: () => Promise<T>,
    fallbackData: T
  ): Promise<T> {
    return this.executeWithRecovery(
      operation,
      async () => {
        console.log('Using fallback data for YouTube operation');
        return fallbackData;
      },
      {
        maxRetries: 2,
        retryDelay: 2000
      }
    );
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverableError(error: any): boolean {
    if (!error) return false;
    
    const recoverablePatterns = [
      /timeout/i,
      /network/i,
      /rate limit/i,
      /temporary/i,
      /service unavailable/i,
      /502/i,
      /503/i,
      /504/i
    ];

    const errorMessage = error.message || error.toString();
    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    if (!error) return 'An unknown error occurred';

    const message = error.message || error.toString();
    
    if (message.includes('API key')) {
      return 'YouTube API is not configured. Some video features may be limited.';
    }
    
    if (message.includes('rate limit')) {
      return 'YouTube API rate limit reached. Please try again later.';
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    if (message.includes('network')) {
      return 'Network error. Please check your connection.';
    }
    
    return 'An error occurred while processing video content.';
  }
}

// Export singleton instance
export const errorRecovery = ErrorRecoveryService;
