import crypto from 'node:crypto';
import sizeOf from 'image-size';
// Make sharp optional - gracefully degrade if not available
let sharp = null;
try {
    sharp = (await import('sharp')).default;
}
catch (error) {
    console.warn('Sharp module not available - perceptual hashing disabled. Using fallback image processing.');
}
// Heuristics for filtering out logos, icons, avatars, and other non-meaningful images
const SKIP_PATTERNS = {
    filename: [
        /logo/i,
        /icon/i,
        /avatar/i,
        /favicon/i,
        /sprite/i,
        /badge/i,
        /button/i,
        /banner/i,
        /ad[_-]?/i,
        /advertisement/i,
        /social/i,
        /emoji/i,
        /dot\.png/i,
        /pixel\.png/i,
        /spacer/i,
        /blank/i,
        /transparent/i,
        /\d+x\d+\.(?:png|gif|jpg|jpeg)/i, // Common pattern for pixel tracking images
    ],
    alt: [
        /logo/i,
        /icon/i,
        /avatar/i,
        /emoji/i,
        /badge/i,
    ],
};
// Minimum dimensions for meaningful images (in pixels)
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
// Maximum dimensions to avoid extremely large images
const MAX_WIDTH = 4000;
const MAX_HEIGHT = 4000;
// Maximum file size (in bytes) - 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Check if an image should be skipped based on filename/alt heuristics
 */
export function shouldSkipImage(url, alt = '') {
    // Check filename patterns
    for (const pattern of SKIP_PATTERNS.filename) {
        if (pattern.test(url)) {
            return true;
        }
    }
    // Check alt text patterns
    for (const pattern of SKIP_PATTERNS.alt) {
        if (pattern.test(alt)) {
            return true;
        }
    }
    // Skip data URLs and very short URLs
    if (url.startsWith('data:') || url.length < 10) {
        return true;
    }
    // Skip common tracking pixels
    if (url.includes('track') || url.includes('pixel') || url.includes('analytics')) {
        return true;
    }
    return false;
}
/**
 * Validate image dimensions
 */
export function isValidImageSize(width, height) {
    if (!width || !height) {
        return false;
    }
    return (width >= MIN_WIDTH &&
        height >= MIN_HEIGHT &&
        width <= MAX_WIDTH &&
        height <= MAX_HEIGHT);
}
/**
 * Calculate perceptual hash for image deduplication
 * Uses average hash (aHash) algorithm which is fast and works well for near-duplicates
 */
export async function calculateImageHash(imageBuffer) {
    // If sharp is not available, use fallback content hash
    if (!sharp) {
        return crypto.createHash('md5').update(imageBuffer).digest('hex');
    }
    try {
        // Resize to 8x8 grayscale for perceptual hashing
        const resized = await sharp(imageBuffer)
            .resize(8, 8, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer();
        // Calculate average pixel value
        const avg = resized.reduce((sum, val) => sum + val, 0) / resized.length;
        // Create hash based on whether each pixel is above or below average
        let hash = '';
        for (let i = 0; i < resized.length; i++) {
            hash += resized[i] >= avg ? '1' : '0';
        }
        // Convert binary string to hex
        return Buffer.from(hash, 'binary').toString('hex');
    }
    catch (error) {
        console.error('Error calculating image hash:', error);
        // Fallback to content hash if perceptual hash fails
        return crypto.createHash('md5').update(imageBuffer).digest('hex');
    }
}
/**
 * Calculate Hamming distance between two hashes (for similarity detection)
 */
export function hammingDistance(hash1, hash2) {
    if (hash1.length !== hash2.length) {
        return Infinity;
    }
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
}
/**
 * Check if two images are similar based on their perceptual hashes
 * Threshold of 5 means up to 5 bits can be different (out of 64 bits for 8x8 hash)
 */
export function areImagesSimilar(hash1, hash2, threshold = 5) {
    return hammingDistance(hash1, hash2) <= threshold;
}
/**
 * Fetch image and extract metadata
 */
export async function fetchImageMetadata(url, alt = '', sourceUrl, timeout = 10000) {
    const metadata = {
        url,
        alt,
        sourceUrl,
        isValid: false,
    };
    try {
        // Fetch image with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            metadata.error = `HTTP ${response.status}: ${response.statusText}`;
            return metadata;
        }
        // Check content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            metadata.error = `Invalid content type: ${contentType}`;
            return metadata;
        }
        metadata.type = contentType.split('/')[1];
        // Get content length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            metadata.size = parseInt(contentLength, 10);
            if (metadata.size > MAX_FILE_SIZE) {
                metadata.error = `Image too large: ${(metadata.size / 1024 / 1024).toFixed(2)}MB`;
                return metadata;
            }
        }
        // Fetch image buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Double-check size after fetching
        if (buffer.length > MAX_FILE_SIZE) {
            metadata.error = `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`;
            return metadata;
        }
        // Get image dimensions
        try {
            const dimensions = sizeOf(buffer);
            metadata.width = dimensions.width;
            metadata.height = dimensions.height;
            // Validate dimensions
            if (!isValidImageSize(metadata.width, metadata.height)) {
                metadata.error = `Invalid dimensions: ${metadata.width}x${metadata.height}`;
                return metadata;
            }
        }
        catch (error) {
            metadata.error = 'Failed to read image dimensions';
            return metadata;
        }
        // Calculate perceptual hash
        try {
            metadata.hash = await calculateImageHash(buffer);
        }
        catch (error) {
            console.error('Error calculating hash:', error);
            // Continue without hash - not critical
        }
        // Determine importance based on size and position
        metadata.importance = determineImageImportance(metadata.width, metadata.height, alt);
        metadata.isValid = true;
        return metadata;
    }
    catch (error) {
        metadata.error = error.message || 'Failed to fetch image';
        return metadata;
    }
}
/**
 * Determine image importance based on size and alt text
 */
export function determineImageImportance(width, height, alt = '') {
    if (!width || !height) {
        return 'low';
    }
    const area = width * height;
    // High importance: large images or screenshots/diagrams
    if (area > 500000 || // > 500k pixels (e.g., 800x625)
        alt.toLowerCase().includes('screenshot') ||
        alt.toLowerCase().includes('diagram') ||
        alt.toLowerCase().includes('architecture') ||
        alt.toLowerCase().includes('dashboard')) {
        return 'high';
    }
    // Medium importance: moderate-sized images
    if (area > 200000) { // > 200k pixels (e.g., 500x400)
        return 'medium';
    }
    return 'low';
}
/**
 * Deduplicate images using perceptual hashing
 */
export function deduplicateImages(images) {
    const uniqueImages = [];
    const seenHashes = new Set();
    for (const image of images) {
        if (!image.hash) {
            // If no hash, include it (edge case)
            uniqueImages.push(image);
            continue;
        }
        // Check if we've seen a similar hash
        let isDuplicate = false;
        for (const seenHash of seenHashes) {
            if (areImagesSimilar(image.hash, seenHash)) {
                isDuplicate = true;
                break;
            }
        }
        if (!isDuplicate) {
            uniqueImages.push(image);
            seenHashes.add(image.hash);
        }
    }
    return uniqueImages;
}
/**
 * Sanitize image URL for safe display
 */
export function sanitizeImageUrl(url) {
    try {
        const parsed = new URL(url);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol');
        }
        return parsed.href;
    }
    catch (error) {
        console.error('Invalid image URL:', url);
        return '';
    }
}
/**
 * Generate a short caption from alt text or URL
 */
export function generateShortCaption(alt, url, maxLength = 120) {
    let caption = alt.trim();
    if (!caption) {
        // Extract filename from URL as fallback
        try {
            const pathname = new URL(url).pathname;
            const filename = pathname.split('/').pop() || '';
            caption = filename
                .replace(/\.[^.]+$/, '') // Remove extension
                .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
                .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
        }
        catch (error) {
            caption = 'Image';
        }
    }
    // Truncate if too long
    if (caption.length > maxLength) {
        caption = caption.substring(0, maxLength - 3) + '...';
    }
    return caption;
}
/**
 * Fetch multiple images in parallel for exports
 * Uses image proxy service for caching and optimization
 */
export async function fetchImagesForExport(imageBlocks, timeout = 5000, maxConcurrency = 10, useProxy = true) {
    const imageBuffers = new Map();
    // Import image proxy service dynamically to avoid circular dependencies
    let imageProxyService = null;
    if (useProxy) {
        try {
            const proxyModule = await import('./image-proxy');
            imageProxyService = proxyModule.imageProxyService;
        }
        catch (error) {
            console.warn('Image proxy service not available, using direct fetch');
        }
    }
    async function fetchImage(block) {
        try {
            if (!block.url)
                return;
            // Try to use proxy service first for caching and optimization
            if (imageProxyService) {
                try {
                    const result = await imageProxyService.fetchAndCacheImage(block.url);
                    imageBuffers.set(block.url, result.data);
                    if (result.cached) {
                        console.log(`✓ Image served from cache: ${block.url.substring(0, 60)}...`);
                    }
                    return;
                }
                catch (proxyError) {
                    console.warn(`Proxy fetch failed for ${block.url}, falling back to direct fetch`);
                }
            }
            // Fallback to direct fetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(block.url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                console.warn(`Failed to fetch image for export: ${block.url}`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            imageBuffers.set(block.url, buffer);
        }
        catch (error) {
            console.error(`Error fetching image for export: ${block.url}`, error);
        }
    }
    // Process in batches with concurrency limit
    for (let i = 0; i < imageBlocks.length; i += maxConcurrency) {
        const batch = imageBlocks.slice(i, i + maxConcurrency);
        await Promise.all(batch.map(fetchImage));
    }
    return imageBuffers;
}
/**
 * Limit images in export to prevent bloated files
 */
export function limitImagesForExport(sections, maxImages = 30) {
    let imageCount = 0;
    let limitedCount = 0;
    const limitedSections = sections.map(section => {
        if (!section.content || !Array.isArray(section.content)) {
            return section;
        }
        const limitedContent = section.content.filter(block => {
            if (block.type === 'image') {
                imageCount++;
                if (imageCount > maxImages) {
                    limitedCount++;
                    return false;
                }
            }
            return true;
        });
        return { ...section, content: limitedContent };
    });
    if (limitedCount > 0) {
        console.log(`⚠️ Limited ${limitedCount} images in export (max: ${maxImages})`);
    }
    return { sections: limitedSections, limitedCount };
}
/**
 * Cache images to avoid re-downloading
 */
export class ImageCache {
    cache = new Map();
    TTL = 24 * 60 * 60 * 1000; // 24 hours
    set(url, metadata) {
        this.cache.set(url, {
            metadata,
            timestamp: Date.now(),
        });
    }
    get(url) {
        const cached = this.cache.get(url);
        if (!cached) {
            return null;
        }
        // Check if expired
        if (Date.now() - cached.timestamp > this.TTL) {
            this.cache.delete(url);
            return null;
        }
        return cached.metadata;
    }
    clear() {
        this.cache.clear();
    }
    // Cleanup expired entries
    cleanup() {
        const now = Date.now();
        for (const [url, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.TTL) {
                this.cache.delete(url);
            }
        }
    }
}
// Global image cache instance
export const imageCache = new ImageCache();
// Cleanup cache every hour
setInterval(() => imageCache.cleanup(), 60 * 60 * 1000);
