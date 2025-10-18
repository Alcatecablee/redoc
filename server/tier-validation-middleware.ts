import { Request, Response, NextFunction } from 'express';
import { TIER_CONFIG } from './tier-config';

/**
 * Extended Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    plan?: string;
  };
}

/**
 * Tier validation middleware to enforce tier-based access controls
 */
export class TierValidationMiddleware {
  /**
   * Validate that user has access to YouTube API features
   */
  static validateYouTubeApiAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const userPlan = req.user?.plan || 'free';
    const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;

    if (!tierLimits.youtubeApiAccess) {
      return res.status(403).json({
        error: 'YouTube API access requires Pro plan or higher',
        currentPlan: userPlan,
        requiredPlan: 'pro',
        upgradeUrl: '/pricing'
      });
    }

    next();
  }

  /**
   * Validate that user has access to YouTube transcript features
   */
  static validateYouTubeTranscripts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const userPlan = req.user?.plan || 'free';
    const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;

    if (!tierLimits.youtubeTranscripts) {
      return res.status(403).json({
        error: 'YouTube transcripts require Enterprise plan',
        currentPlan: userPlan,
        requiredPlan: 'enterprise',
        upgradeUrl: '/pricing'
      });
    }

    next();
  }

  /**
   * Validate generation request against tier limits
   */
  static validateGenerationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const userPlan = req.user?.plan || 'free';
    const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;

    // Extract config from request body
    const config = req.body;

    // Validate YouTube API access
    if (config.youtubeApiAccess && !tierLimits.youtubeApiAccess) {
      return res.status(403).json({
        error: 'YouTube API access requires Pro plan or higher',
        currentPlan: userPlan,
        requiredPlan: 'pro'
      });
    }

    // Validate YouTube transcripts
    if (config.youtubeTranscripts && !tierLimits.youtubeTranscripts) {
      return res.status(403).json({
        error: 'YouTube transcripts require Enterprise plan',
        currentPlan: userPlan,
        requiredPlan: 'enterprise'
      });
    }

    // Validate format restrictions
    if (config.formats && Array.isArray(config.formats)) {
      const invalidFormats = config.formats.filter(
        (format: string) => !tierLimits.allowedFormats.includes(format)
      );

      if (invalidFormats.length > 0) {
        return res.status(403).json({
          error: `Formats ${invalidFormats.join(', ')} not available on ${userPlan} plan`,
          currentPlan: userPlan,
          allowedFormats: tierLimits.allowedFormats,
          requestedFormats: config.formats
        });
      }
    }

    // Attach validated limits to request for later use
    req.body.tierLimits = tierLimits;

    next();
  }

  /**
   * Sanitize config to remove unauthorized features
   */
  static sanitizeConfig(userPlan: string, config: any): any {
    const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;

    return {
      ...config,
      // Force tier limits
      youtubeApiAccess: config.youtubeApiAccess && tierLimits.youtubeApiAccess,
      youtubeTranscripts: config.youtubeTranscripts && tierLimits.youtubeTranscripts,
      // Filter formats
      formats: config.formats?.filter((f: string) => tierLimits.allowedFormats.includes(f)) || ['pdf']
    };
  }

  /**
   * Log tier usage for analytics
   */
  static logTierUsage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const userPlan = req.user?.plan || 'free';
    const userId = req.user?.id || 'anonymous';
    const operation = req.path;

    console.log(`📊 Tier Usage: ${userPlan} - User: ${userId} - Operation: ${operation}`);

    next();
  }
}

/**
 * Helper function to enforce tier limits on research depth
 */
export function enforceTierLimitsOnRequest(req: AuthenticatedRequest): {
  stackOverflow: number;
  github: number;
  search: number;
  youtube: number;
  youtubeApiAccess: boolean;
  youtubeTranscripts: boolean;
} {
  const userPlan = req.user?.plan || 'free';
  const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;
  const config = req.body;

  // Get smart scaling recommendation from request (if provided)
  const smartScaling = config.smartScaling || {
    stackOverflow: 10,
    github: 10,
    search: 20,
    youtube: 10
  };

  return {
    stackOverflow: Math.min(tierLimits.maxSourcesStackOverflow, smartScaling.stackOverflow),
    github: Math.min(tierLimits.maxSourcesGitHub, smartScaling.github),
    search: Math.min(tierLimits.maxSourcesSearch, smartScaling.search),
    youtube: Math.min(tierLimits.maxSourcesYouTube, smartScaling.youtube),
    youtubeApiAccess: tierLimits.youtubeApiAccess,
    youtubeTranscripts: tierLimits.youtubeTranscripts
  };
}
