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
  maxSourcesReddit: number;
  maxSourcesDevTo: number;
  maxSourcesCodeProject: number;
  maxSourcesStackExchange: number;
  maxSourcesQuora: number;
  maxSourcesForums: number;
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
    maxSourcesReddit: 5,
    maxSourcesDevTo: 3,
    maxSourcesCodeProject: 3,
    maxSourcesStackExchange: 5,
    maxSourcesQuora: 3,
    maxSourcesForums: 3,
    allowedFormats: ['pdf'],
    features: [
      '1 documentation per month',
      'Basic research depth (5 SO + 5 GitHub + 5 YouTube + 5 Reddit + 3 DEV.to + 3 CodeProject + 5 StackExchange + 3 Quora + 3 Forums)',
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
    maxSourcesReddit: 15,
    maxSourcesDevTo: 10,
    maxSourcesCodeProject: 8,
    maxSourcesStackExchange: 12,
    maxSourcesQuora: 8,
    maxSourcesForums: 10,
    allowedFormats: ['pdf', 'docx', 'html', 'markdown', 'json'],
    features: [
      'Unlimited documentation',
      'Deep research (20 SO + 15 GitHub + 30 search + 20 YouTube + 15 Reddit + 10 DEV.to + 8 CodeProject + 12 StackExchange + 8 Quora + 10 Forums)',
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
    maxSourcesReddit: 25,
    maxSourcesDevTo: 20,
    maxSourcesCodeProject: 15,
    maxSourcesStackExchange: 20,
    maxSourcesQuora: 15,
    maxSourcesForums: 20,
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
  reddit: number;
  devTo: number;
  codeProject: number;
  stackExchange: number;
  quora: number;
  forums: number;
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
    small: { 
      stackOverflow: 5, github: 5, search: 10, youtube: 5,
      reddit: 5, devTo: 3, codeProject: 3, stackExchange: 5, quora: 3, forums: 3
    },
    medium: { 
      stackOverflow: 10, github: 10, search: 20, youtube: 10,
      reddit: 10, devTo: 6, codeProject: 6, stackExchange: 8, quora: 6, forums: 6
    },
    large: { 
      stackOverflow: 20, github: 15, search: 30, youtube: 15,
      reddit: 15, devTo: 10, codeProject: 10, stackExchange: 12, quora: 10, forums: 10
    }
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
  reddit: number;
  devTo: number;
  codeProject: number;
  stackExchange: number;
  quora: number;
  forums: number;
  limitedByTier: boolean;
  upgradeSuggestion?: string;
} {
  // Validate inputs
  if (!userPlan || typeof userPlan !== 'string') {
    console.warn('Invalid userPlan provided, defaulting to free tier');
    userPlan = 'free';
  }
  
  if (!smartScaling || typeof smartScaling !== 'object') {
    console.warn('Invalid smartScaling provided, using default values');
    smartScaling = {
      stackOverflow: 5,
      github: 5,
      search: 10,
      youtube: 5,
      complexity: 'small'
    };
  }

  const tierLimits = TIER_CONFIG[userPlan] || TIER_CONFIG.free;
  
  const enforcedLimits = {
    stackOverflow: Math.min(tierLimits.maxSourcesStackOverflow, smartScaling.stackOverflow),
    github: Math.min(tierLimits.maxSourcesGitHub, smartScaling.github),
    search: Math.min(tierLimits.maxSourcesSearch, smartScaling.search),
    youtube: Math.min(tierLimits.maxSourcesYouTube, smartScaling.youtube),
    youtubeApiAccess: tierLimits.youtubeApiAccess,
    youtubeTranscripts: tierLimits.youtubeTranscripts,
    reddit: Math.min(tierLimits.maxSourcesReddit, smartScaling.reddit),
    devTo: Math.min(tierLimits.maxSourcesDevTo, smartScaling.devTo),
    codeProject: Math.min(tierLimits.maxSourcesCodeProject, smartScaling.codeProject),
    stackExchange: Math.min(tierLimits.maxSourcesStackExchange, smartScaling.stackExchange),
    quora: Math.min(tierLimits.maxSourcesQuora, smartScaling.quora),
    forums: Math.min(tierLimits.maxSourcesForums, smartScaling.forums)
  };

  // Check if tier limits are restricting the smart scaling recommendation
  const limitedByTier = 
    enforcedLimits.stackOverflow < smartScaling.stackOverflow ||
    enforcedLimits.github < smartScaling.github ||
    enforcedLimits.search < smartScaling.search ||
    enforcedLimits.youtube < smartScaling.youtube ||
    enforcedLimits.reddit < smartScaling.reddit ||
    enforcedLimits.devTo < smartScaling.devTo ||
    enforcedLimits.codeProject < smartScaling.codeProject ||
    enforcedLimits.stackExchange < smartScaling.stackExchange ||
    enforcedLimits.quora < smartScaling.quora ||
    enforcedLimits.forums < smartScaling.forums;

  let upgradeSuggestion: string | undefined;
  if (limitedByTier) {
    if (userPlan === 'free') {
      upgradeSuggestion = `This ${smartScaling.complexity} product needs comprehensive research from ${smartScaling.stackOverflow} SO + ${smartScaling.github} GitHub + ${smartScaling.youtube} YouTube + ${smartScaling.reddit} Reddit + ${smartScaling.devTo} DEV.to + ${smartScaling.codeProject} CodeProject + ${smartScaling.stackExchange} StackExchange + ${smartScaling.quora} Quora + ${smartScaling.forums} Forums sources. Upgrade to Pro for deeper research!`;
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
