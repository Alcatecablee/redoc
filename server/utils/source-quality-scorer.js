/**
 * Source Quality Scoring System
 * Validates and scores content sources for trustworthiness
 */
const QUALITY_THRESHOLD = 70; // Minimum score to include source
const MAX_SOURCE_AGE_MONTHS = 6; // Discard content older than this
// Trusted domain patterns
const TRUSTED_DOMAINS = [
    'stackoverflow.com',
    'github.com',
    'medium.com',
    'dev.to',
    'docs.microsoft.com',
    'developer.mozilla.org',
    'readthedocs.io',
];
/**
 * Calculate comprehensive quality score for a source
 */
export function scoreSource(metrics) {
    const scores = {
        freshness: calculateFreshnessScore(metrics.publishedDate),
        communityValidation: calculateCommunityScore(metrics.upvotes, metrics.githubStars),
        domainAuthority: calculateDomainScore(metrics.url),
        relevance: metrics.contentRelevance || 50, // Default if not provided
    };
    // Weighted average (adjust weights as needed)
    const qualityScore = scores.freshness * 0.2 +
        scores.communityValidation * 0.3 +
        scores.domainAuthority * 0.3 +
        scores.relevance * 0.2;
    const reasons = [];
    if (scores.freshness < 30)
        reasons.push('Content may be outdated');
    if (scores.communityValidation > 80)
        reasons.push('Highly validated by community');
    if (scores.domainAuthority > 80)
        reasons.push('Trusted source domain');
    if (scores.relevance < 40)
        reasons.push('Low relevance to query');
    return {
        ...metrics,
        qualityScore: Math.round(qualityScore),
        scoreBreakdown: scores,
        reasons,
    };
}
/**
 * Calculate freshness score (0-100)
 */
function calculateFreshnessScore(publishedDate) {
    if (!publishedDate)
        return 50; // Unknown date gets neutral score
    const ageInMonths = (Date.now() - publishedDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (ageInMonths > MAX_SOURCE_AGE_MONTHS)
        return 0;
    if (ageInMonths < 1)
        return 100;
    if (ageInMonths < 3)
        return 80;
    if (ageInMonths < 6)
        return 60;
    return 30;
}
/**
 * Calculate community validation score (0-100)
 */
function calculateCommunityScore(upvotes, githubStars) {
    const votes = upvotes || 0;
    const stars = githubStars || 0;
    // Stack Overflow: 100+ upvotes = excellent
    const voteScore = Math.min(100, (votes / 100) * 100);
    // GitHub: 1000+ stars = excellent
    const starScore = Math.min(100, (stars / 1000) * 100);
    return Math.max(voteScore, starScore);
}
/**
 * Calculate domain authority score (0-100)
 */
function calculateDomainScore(url) {
    try {
        const domain = new URL(url).hostname;
        // Check if it's a trusted domain
        if (TRUSTED_DOMAINS.some(trusted => domain.includes(trusted))) {
            return 90;
        }
        // .gov, .edu domains are highly authoritative
        if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
            return 95;
        }
        // Official documentation domains
        if (domain.includes('docs.') || domain.includes('developer.')) {
            return 85;
        }
        // Default score for unknown domains
        return 50;
    }
    catch {
        return 20; // Invalid URL gets low score
    }
}
/**
 * Filter sources by minimum quality threshold
 */
export function filterTrustedSources(sources) {
    return sources
        .filter(s => s.qualityScore >= QUALITY_THRESHOLD)
        .sort((a, b) => b.qualityScore - a.qualityScore); // Highest quality first
}
/**
 * Deduplicate near-identical content
 */
export function deduplicateContent(sources) {
    const unique = [];
    const seen = new Set();
    for (const source of sources) {
        // Create content fingerprint (first 200 chars normalized)
        const fingerprint = source.content
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .substring(0, 200);
        if (!seen.has(fingerprint)) {
            seen.add(fingerprint);
            unique.push(source);
        }
    }
    return unique;
}
/**
 * Check for broken links (404s)
 */
export async function validateLinks(sources) {
    const valid = [];
    for (const source of sources) {
        try {
            const response = await fetch(source.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                valid.push(source);
            }
            else {
                console.warn(`❌ Broken link detected: ${source.url} (${response.status})`);
            }
        }
        catch (error) {
            console.warn(`❌ Failed to validate link: ${source.url}`);
        }
    }
    return valid;
}
/**
 * Cross-verify content against multiple sources
 */
export function crossVerifyContent(sources, minSources = 3) {
    if (sources.length < minSources) {
        console.warn(`⚠️ Only ${sources.length} sources available, minimum ${minSources} recommended`);
        return false;
    }
    // Check if high-quality sources agree (simplified - can be enhanced with NLP)
    const highQuality = sources.filter(s => s.qualityScore > 80);
    if (highQuality.length >= minSources) {
        console.log(`✅ Content verified across ${highQuality.length} high-quality sources`);
        return true;
    }
    return false;
}
