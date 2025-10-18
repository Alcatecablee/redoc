// Tier-based configuration and limits

export interface TierLimits {
  name: string;
  price: number;
  maxGenerationsPerMonth: number | null; // null = unlimited
  maxSourcesStackOverflow: number;
  maxSourcesGitHub: number;
  maxSourcesSearch: number;
  maxSourcesYouTube: number;
  youtubeApiAccess: boolean;
  youtubeTranscripts: boolean;
  allowedFormats: string[];
  features: string[];
  apiAccess: boolean;
  prioritySupport: boolean;
  customVoice: boolean;
  hostedHelpCenter: boolean;
}

export const TIER_CONFIG: Record<string, TierLimits> = {
  free: {
    name: 'Free',
    price: 0,
    maxGenerationsPerMonth: 1,
    maxSourcesStackOverflow: 5,
    maxSourcesGitHub: 5,
    maxSourcesSearch: 10,
    maxSourcesYouTube: 5,
    youtubeApiAccess: false,
    youtubeTranscripts: false,
    allowedFormats: ['pdf'],
    features: [
      '1 documentation per month',
      'Basic research depth (5 SO + 5 GitHub + 5 YouTube)',
      'PDF export only',
      '8-12 sections',
      'Community support'
    ],
    apiAccess: false,
    prioritySupport: false,
    customVoice: false,
    hostedHelpCenter: false
  },
  pro: {
    name: 'Pro',
    price: 19,
    maxGenerationsPerMonth: null, // Unlimited
    maxSourcesStackOverflow: 20,
    maxSourcesGitHub: 15,
    maxSourcesSearch: 30,
    maxSourcesYouTube: 20,
    youtubeApiAccess: true,
    youtubeTranscripts: false,
    allowedFormats: ['pdf', 'docx', 'html', 'markdown', 'json'],
    features: [
      'Unlimited documentation',
      'Deep research (20 SO + 15 GitHub + 30 search + 20 YouTube)',
      'YouTube API access (metadata, views, comments)',
      'All export formats',
      'Up to 20 sections',
      'Subdomain hosting',
      'Email support'
    ],
    apiAccess: false,
    prioritySupport: false,
    customVoice: false,
    hostedHelpCenter: false
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    maxGenerationsPerMonth: null, // Unlimited
    maxSourcesStackOverflow: 20,
    maxSourcesGitHub: 15,
    maxSourcesSearch: 30,
    maxSourcesYouTube: 30,
    youtubeApiAccess: true,
    youtubeTranscripts: true,
    allowedFormats: ['pdf', 'docx', 'html', 'markdown', 'json'],
    features: [
      'Everything in Pro',
      'YouTube video transcripts and summaries',
      'API access ($0.10/1000 tokens)',
      'Custom AI voices',
      'Hosted help centers',
      'Priority support',
      'Custom branding',
      'White-label options'
    ],
    apiAccess: true,
    prioritySupport: true,
    customVoice: true,
    hostedHelpCenter: true
  }
};

export interface SmartScalingRecommendation {
  stackOverflow: number;
  github: number;
  search: number;
  youtube: number;
  complexity: 'small' | 'medium' | 'large';
}

/**
 * Calculate smart scaling recommendation based on product complexity
 */
export function calculateSmartScaling(
  pageCount: number,
  githubStars?: number,
  githubIssues?: number
): SmartScalingRecommendation {
  // Determine complexity based on crawled pages
  let complexity: 'small' | 'medium' | 'large';
  
  if (pageCount <= 10) {
    complexity = 'small';
  } else if (pageCount <= 50) {
    complexity = 'medium';
  } else {
    complexity = 'large';
  }

  // Adjust based on GitHub metrics if available
  if (githubStars && githubStars > 1000) {
    complexity = 'large';
  }

  // Return recommended sources based on complexity
  const recommendations = {
    small: { stackOverflow: 5, github: 5, search: 10, youtube: 5 },
    medium: { stackOverflow: 10, github: 10, search: 20, youtube: 10 },
    large: { stackOverflow: 20, github: 15, search: 30, youtube: 15 }
  };

  return {
    ...recommendations[complexity],
    complexity
  };
}

/**
 * Enforce tier limits on research depth using MIN(Tier Limit, Smart Scaling)
 */
export function enforceTierLimits(
  userPlan: string,
  smartScaling: SmartScalingRecommendation
): {
  stackOverflow: number;
  github: number;
  search: number;
  youtube: number;
  youtubeApiAccess: boolean;
  youtubeTranscripts: boolean;
  limitedByTier: boolean;
  upgradeSuggestion?: string;
} {
  const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;
  
  const enforcedLimits = {
    stackOverflow: Math.min(tierLimits.maxSourcesStackOverflow, smartScaling.stackOverflow),
    github: Math.min(tierLimits.maxSourcesGitHub, smartScaling.github),
    search: Math.min(tierLimits.maxSourcesSearch, smartScaling.search),
    youtube: Math.min(tierLimits.maxSourcesYouTube, smartScaling.youtube),
    youtubeApiAccess: tierLimits.youtubeApiAccess,
    youtubeTranscripts: tierLimits.youtubeTranscripts
  };

  // Check if tier limits are restricting the smart scaling recommendation
  const limitedByTier = 
    enforcedLimits.stackOverflow < smartScaling.stackOverflow ||
    enforcedLimits.github < smartScaling.github ||
    enforcedLimits.search < smartScaling.search ||
    enforcedLimits.youtube < smartScaling.youtube;

  let upgradeSuggestion: string | undefined;
  if (limitedByTier) {
    if (userPlan === 'free') {
      upgradeSuggestion = `This ${smartScaling.complexity} product needs ${smartScaling.stackOverflow} SO + ${smartScaling.github} GitHub + ${smartScaling.youtube} YouTube sources. Upgrade to Pro for deeper research!`;
    } else if (userPlan === 'pro') {
      upgradeSuggestion = `Consider Enterprise for YouTube transcripts and API access.`;
    }
  }

  return {
    ...enforcedLimits,
    limitedByTier,
    upgradeSuggestion
  };
}

/**
 * Generate API key for Enterprise users
 */
export function generateApiKey(): string {
  const prefix = 'aidoc';
  const random = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
  return `${prefix}_${random}`;
}

/**
 * Check if user can generate documentation based on tier limits
 */
export function canGenerateDocumentation(
  userPlan: string,
  generationCount: number
): { allowed: boolean; reason?: string } {
  const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;
  
  if (tierLimits.maxGenerationsPerMonth === null) {
    return { allowed: true }; // Unlimited
  }
  
  if (generationCount >= tierLimits.maxGenerationsPerMonth) {
    return {
      allowed: false,
      reason: `Free tier limit reached (${tierLimits.maxGenerationsPerMonth}/month). Upgrade to Pro for unlimited generations!`
    };
  }
  
  return { allowed: true };
}
