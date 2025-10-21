export const tierPackages = [
    {
        id: 'standard',
        name: 'Standard',
        price: 500,
        description: 'Perfect for basic documentation needs',
        features: [
            '8-12 documentation sections',
            'Standard research depth',
            'PDF & Markdown formats',
            'Basic branding',
            '72-hour delivery',
            'Stack Overflow & GitHub research',
            'Web search integration',
        ],
        config: {
            sections: '8-12',
            sourceDepth: 'standard',
            delivery: 'standard',
            formats: ['pdf', 'markdown'],
            branding: 'basic',
            youtubeOptions: [],
            seoOptions: [],
            enterpriseFeatures: [],
        }
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 1200,
        description: 'Comprehensive documentation with multimedia',
        popular: true,
        features: [
            '13-20 documentation sections',
            'Deep research across all sources',
            'All export formats (PDF, HTML, DOCX, MD, JSON)',
            'Advanced branding & theming',
            '24-hour rush delivery',
            'YouTube integration & transcripts',
            'Complete SEO optimization',
            'Schema markup & metadata',
        ],
        config: {
            sections: '13-20',
            sourceDepth: 'deep',
            delivery: 'rush',
            formats: ['pdf', 'markdown', 'html', 'docx', 'json'],
            branding: 'advanced',
            youtubeOptions: ['youtubeSearch', 'youtubeApi', 'youtubeTranscripts'],
            seoOptions: ['seoMetadata', 'schemaMarkup', 'keywordTargeting', 'sitemapIndexing'],
            enterpriseFeatures: [],
        }
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 2500,
        description: 'Premium service with dedicated support',
        features: [
            '20+ comprehensive sections',
            'Maximum research depth',
            'All formats & customization',
            'Premium branded themes',
            'Same-day delivery (12 hours)',
            'Full YouTube & video analysis',
            'Advanced SEO & content refresh',
            'Dedicated account manager',
            '3 revision rounds included',
            'Priority API documentation',
            'Compliance & security docs',
        ],
        config: {
            sections: '20+',
            sourceDepth: 'deep',
            delivery: 'same-day',
            formats: ['pdf', 'markdown', 'html', 'docx', 'json'],
            branding: 'advanced',
            youtubeOptions: ['youtubeSearch', 'youtubeApi', 'youtubeTranscripts'],
            seoOptions: ['seoMetadata', 'schemaMarkup', 'keywordTargeting', 'sitemapIndexing', 'contentRefresh'],
            enterpriseFeatures: ['accountManager', 'revisions', 'apiPriority', 'compliance'],
        }
    }
];
export const enterpriseFeaturesPricing = {
    accountManager: { name: 'Dedicated Account Manager', price: 500 },
    revisions: { name: 'Multiple Revision Rounds', price: 200 },
    apiPriority: { name: 'API Documentation Priority', price: 300 },
    compliance: { name: 'Compliance/Security Documentation', price: 500 },
};
export const calculatePrice = (config, currency = 'USD') => {
    let basePrice = 500;
    let tierName;
    // If a tier is selected, use that as the base price
    if (config.tier && config.tier !== 'custom') {
        const tier = tierPackages.find(t => t.id === config.tier);
        if (tier) {
            basePrice = tier.price;
            tierName = tier.name;
            // For pre-packaged tiers, return the tier price with minimal add-ons
            const total = currency === 'ZAR' ? Math.round(basePrice * 18) : basePrice;
            return {
                basePrice: currency === 'ZAR' ? basePrice * 18 : basePrice,
                sectionsAddon: 0,
                depthAddon: 0,
                deliveryAddon: 0,
                formatsAddon: 0,
                brandingAddon: 0,
                complexityAddon: 0,
                youtubeAddon: 0,
                seoAddon: 0,
                enterpriseFeaturesAddon: 0,
                total,
                currency,
                tierName
            };
        }
    }
    // Custom pricing calculation (existing logic)
    let sectionsAddon = 0;
    if (config.sections === '13-20')
        sectionsAddon = 200;
    if (config.sections === '20+')
        sectionsAddon = 400;
    let depthAddon = 0;
    if (config.sourceDepth === 'standard')
        depthAddon = 50;
    if (config.sourceDepth === 'deep')
        depthAddon = 150;
    let deliveryAddon = 0;
    if (config.delivery === 'rush')
        deliveryAddon = 100;
    if (config.delivery === 'same-day')
        deliveryAddon = 200;
    const formatsAddon = config.formats.length * 50;
    const brandingAddon = config.branding === 'advanced' ? 100 : 0;
    let complexityAddon = 0;
    if (config.customRequirements) {
        const complexityKeywords = ['compliance', 'regulation', 'legal', 'security', 'audit', 'enterprise', 'integration'];
        const hasComplexity = complexityKeywords.some(keyword => config.customRequirements.toLowerCase().includes(keyword));
        if (hasComplexity)
            complexityAddon = 100;
    }
    // YouTube options pricing
    let youtubeAddon = 0;
    const youtubePricing = {
        youtubeSearch: 50,
        youtubeApi: 100,
        youtubeTranscripts: 200,
    };
    config.youtubeOptions.forEach(option => {
        youtubeAddon += youtubePricing[option] || 0;
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
        seoAddon += seoPricing[option] || 0;
    });
    // Calculate enterprise features addon
    let enterpriseFeaturesAddon = 0;
    if (config.enterpriseFeatures && config.enterpriseFeatures.length > 0) {
        config.enterpriseFeatures.forEach(feature => {
            const featurePrice = enterpriseFeaturesPricing[feature];
            if (featurePrice) {
                enterpriseFeaturesAddon += featurePrice.price;
            }
        });
    }
    const totalUSD = basePrice + sectionsAddon + depthAddon + deliveryAddon + formatsAddon + brandingAddon + complexityAddon + youtubeAddon + seoAddon + enterpriseFeaturesAddon;
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
        enterpriseFeaturesAddon: currency === 'ZAR' ? enterpriseFeaturesAddon * 18 : enterpriseFeaturesAddon,
        total,
        currency,
        tierName
    };
};
export const getSourceLimits = (sourceDepth) => {
    const limits = {
        basic: { soQuestions: 5, githubIssues: 5, searchResults: 10 },
        standard: { soQuestions: 10, githubIssues: 10, searchResults: 15 },
        deep: { soQuestions: 20, githubIssues: 15, searchResults: 20 }
    };
    return limits[sourceDepth];
};
export const getSectionCount = (sections) => {
    if (sections === '20+')
        return 20;
    if (sections === '13-20')
        return 15;
    return 10;
};
export const getDeliveryHours = (delivery) => {
    if (delivery === 'same-day')
        return 12;
    if (delivery === 'rush')
        return 24;
    return 72;
};
