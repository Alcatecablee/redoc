export interface PricingConfig {
  sections: '8-12' | '13-20' | '20+';
  sourceDepth: 'basic' | 'standard' | 'deep';
  delivery: 'standard' | 'rush' | 'same-day';
  formats: string[];
  branding: 'basic' | 'advanced';
  customRequirements: string;
  youtubeOptions: string[];
  seoOptions: string[];
}

export interface PricingBreakdown {
  basePrice: number;
  sectionsAddon: number;
  depthAddon: number;
  deliveryAddon: number;
  formatsAddon: number;
  brandingAddon: number;
  complexityAddon: number;
  youtubeAddon: number;
  seoAddon: number;
  total: number;
  currency: 'USD' | 'ZAR';
}

export const calculatePrice = (config: PricingConfig, currency: 'USD' | 'ZAR' = 'USD'): PricingBreakdown => {
  const basePrice = 500;
  
  let sectionsAddon = 0;
  if (config.sections === '13-20') sectionsAddon = 200;
  if (config.sections === '20+') sectionsAddon = 400;
  
  let depthAddon = 0;
  if (config.sourceDepth === 'standard') depthAddon = 50;
  if (config.sourceDepth === 'deep') depthAddon = 150;
  
  let deliveryAddon = 0;
  if (config.delivery === 'rush') deliveryAddon = 100;
  if (config.delivery === 'same-day') deliveryAddon = 200;
  
  const formatsAddon = config.formats.length * 50;
  
  const brandingAddon = config.branding === 'advanced' ? 100 : 0;
  
  let complexityAddon = 0;
  if (config.customRequirements) {
    const complexityKeywords = ['compliance', 'regulation', 'legal', 'security', 'audit', 'enterprise', 'integration'];
    const hasComplexity = complexityKeywords.some(keyword => 
      config.customRequirements.toLowerCase().includes(keyword)
    );
    if (hasComplexity) complexityAddon = 100;
  }
  
  // YouTube options pricing
  let youtubeAddon = 0;
  const youtubePricing = {
    youtubeSearch: 50,
    youtubeApi: 100,
    youtubeTranscripts: 200,
  };
  
  config.youtubeOptions.forEach(option => {
    youtubeAddon += youtubePricing[option as keyof typeof youtubePricing] || 0;
  });
  
    // Calculate SEO addon
    let seoAddon = 0;
    const seoPricing = {
      seoMetadata: 100,
      schemaMarkup: 50,
      keywordTargeting: 75,
      sitemapIndexing: 50,
      contentRefresh: 100,
    };
    
    config.seoOptions.forEach(option => {
      seoAddon += seoPricing[option as keyof typeof seoPricing] || 0;
    });
    
    const totalUSD = basePrice + sectionsAddon + depthAddon + deliveryAddon + formatsAddon + brandingAddon + complexityAddon + youtubeAddon + seoAddon;
  
  const total = currency === 'ZAR' ? Math.round(totalUSD * 18) : totalUSD;
  
  return {
    basePrice: currency === 'ZAR' ? basePrice * 18 : basePrice,
    sectionsAddon: currency === 'ZAR' ? sectionsAddon * 18 : sectionsAddon,
    depthAddon: currency === 'ZAR' ? depthAddon * 18 : depthAddon,
    deliveryAddon: currency === 'ZAR' ? deliveryAddon * 18 : deliveryAddon,
    formatsAddon: currency === 'ZAR' ? formatsAddon * 18 : formatsAddon,
    brandingAddon: currency === 'ZAR' ? brandingAddon * 18 : brandingAddon,
    complexityAddon: currency === 'ZAR' ? complexityAddon * 18 : complexityAddon,
    youtubeAddon: currency === 'ZAR' ? youtubeAddon * 18 : youtubeAddon,
    seoAddon: currency === 'ZAR' ? seoAddon * 18 : seoAddon,
    total,
    currency
  };
};

export const getSourceLimits = (sourceDepth: PricingConfig['sourceDepth']) => {
  const limits = {
    basic: { soQuestions: 5, githubIssues: 5, searchResults: 10 },
    standard: { soQuestions: 10, githubIssues: 10, searchResults: 15 },
    deep: { soQuestions: 20, githubIssues: 15, searchResults: 20 }
  };
  
  return limits[sourceDepth];
};

export const getSectionCount = (sections: PricingConfig['sections']): number => {
  if (sections === '20+') return 20;
  if (sections === '13-20') return 15;
  return 10;
};

export const getDeliveryHours = (delivery: PricingConfig['delivery']): number => {
  if (delivery === 'same-day') return 12;
  if (delivery === 'rush') return 24;
  return 72;
};
