import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
// Make sharp optional - gracefully degrade if not available
let sharp = null;
try {
    sharp = (await import('sharp')).default;
}
catch (error) {
    console.warn('Sharp module not available in image-proxy - image optimization disabled.');
}
const DEFAULT_CONFIG = {
    cacheDir: path.join(process.cwd(), '.cache', 'images'),
    maxCacheSize: 500 * 1024 * 1024, // 500MB
    maxImageSize: 10 * 1024 * 1024, // 10MB
    cacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
};
export class ImageProxyService {
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize the proxy service (create cache directory)
     */
    async initialize() {
        try {
            await fs.mkdir(this.config.cacheDir, { recursive: true });
            console.log(`Image cache directory created: ${this.config.cacheDir}`);
        }
        catch (error) {
            console.error('Failed to create cache directory:', error);
        }
    }
    /**
     * Generate a cache key from URL
     */
    getCacheKey(url) {
        return crypto.createHash('sha256').update(url).digest('hex');
    }
    /**
     * Get cached image path
     */
    getCachePath(cacheKey, extension = 'bin') {
        return path.join(this.config.cacheDir, `${cacheKey}.${extension}`);
    }
    /**
     * Get cached metadata path
     */
    getMetadataPath(cacheKey) {
        return path.join(this.config.cacheDir, `${cacheKey}.meta.json`);
    }
    /**
     * Check if URL is allowed
     */
    isAllowedDomain(url) {
        if (!this.config.allowedDomains || this.config.allowedDomains.length === 0) {
            return true;
        }
        try {
            const parsedUrl = new URL(url);
            const hostname = parsedUrl.hostname.toLowerCase();
            return this.config.allowedDomains.some(domain => {
                const lowerDomain = domain.toLowerCase();
                return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
            });
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if cached image is still valid
     */
    async isCacheValid(metadataPath) {
        try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            const age = Date.now() - metadata.cachedAt;
            return age < this.config.cacheDuration;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Fetch and cache an image
     */
    async fetchAndCacheImage(url) {
        // Validate URL
        if (!this.isAllowedDomain(url)) {
            throw new Error('Domain not allowed');
        }
        const cacheKey = this.getCacheKey(url);
        const metadataPath = this.getMetadataPath(cacheKey);
        // Check cache first
        const cacheValid = await this.isCacheValid(metadataPath);
        if (cacheValid) {
            try {
                const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                const cachePath = this.getCachePath(cacheKey, metadata.extension);
                const data = await fs.readFile(cachePath);
                return {
                    data,
                    contentType: metadata.contentType,
                    cached: true
                };
            }
            catch (error) {
                console.error('Cache read failed:', error);
                // Continue to fetch from source
            }
        }
        // Fetch from source
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            if (!contentType.startsWith('image/')) {
                throw new Error(`Invalid content type: ${contentType}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length > this.config.maxImageSize) {
                throw new Error(`Image too large: ${buffer.length} bytes`);
            }
            // Optimize and cache image
            try {
                const optimized = await this.optimizeImage(buffer, contentType);
                const extension = this.getExtensionFromContentType(contentType);
                const cachePath = this.getCachePath(cacheKey, extension);
                // Save image
                await fs.writeFile(cachePath, optimized);
                // Save metadata
                const metadata = {
                    url,
                    contentType,
                    extension,
                    cachedAt: Date.now(),
                    size: optimized.length,
                    originalSize: buffer.length
                };
                await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
                return {
                    data: optimized,
                    contentType,
                    cached: false
                };
            }
            catch (error) {
                console.error('Image optimization failed:', error);
                // Return unoptimized image
                return {
                    data: buffer,
                    contentType,
                    cached: false
                };
            }
        }
        catch (fetchError) {
            console.error('Image fetch failed:', fetchError.message);
            throw fetchError;
        }
    }
    /**
     * Optimize image using sharp
     */
    async optimizeImage(buffer, contentType) {
        // If sharp is not available, return original buffer
        if (!sharp) {
            return buffer;
        }
        try {
            const image = sharp(buffer);
            const metadata = await image.metadata();
            // Skip optimization for small images
            if (buffer.length < 100 * 1024) {
                return buffer;
            }
            // Resize if too large
            if (metadata.width && metadata.width > 2000) {
                image.resize(2000, null, { withoutEnlargement: true });
            }
            // Optimize based on format
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                return await image.jpeg({ quality: 85, progressive: true }).toBuffer();
            }
            else if (contentType.includes('png')) {
                return await image.png({ compressionLevel: 8 }).toBuffer();
            }
            else if (contentType.includes('webp')) {
                return await image.webp({ quality: 85 }).toBuffer();
            }
            // Return original if format not recognized
            return buffer;
        }
        catch (error) {
            console.error('Sharp optimization failed:', error);
            return buffer;
        }
    }
    /**
     * Get file extension from content type
     */
    getExtensionFromContentType(contentType) {
        const type = contentType.split('/')[1]?.split(';')[0];
        const extensions = {
            'jpeg': 'jpg',
            'jpg': 'jpg',
            'png': 'png',
            'gif': 'gif',
            'webp': 'webp',
            'svg+xml': 'svg',
            'bmp': 'bmp',
            'tiff': 'tiff'
        };
        return extensions[type] || 'bin';
    }
    /**
     * Clean up old cache entries
     */
    async cleanupCache() {
        try {
            const files = await fs.readdir(this.config.cacheDir);
            const now = Date.now();
            let deletedCount = 0;
            for (const file of files) {
                if (!file.endsWith('.meta.json'))
                    continue;
                const metadataPath = path.join(this.config.cacheDir, file);
                try {
                    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                    const metadata = JSON.parse(metadataContent);
                    const age = now - metadata.cachedAt;
                    if (age > this.config.cacheDuration) {
                        // Delete metadata file
                        await fs.unlink(metadataPath);
                        // Delete image file
                        const imagePath = path.join(this.config.cacheDir, file.replace('.meta.json', `.${metadata.extension}`));
                        await fs.unlink(imagePath).catch(() => { });
                        deletedCount++;
                    }
                }
                catch (error) {
                    console.error(`Failed to process ${file}:`, error);
                }
            }
            console.log(`Cleaned up ${deletedCount} old cache entries`);
        }
        catch (error) {
            console.error('Cache cleanup failed:', error);
        }
    }
    /**
     * Get cache size in bytes
     */
    async getCacheSize() {
        try {
            const files = await fs.readdir(this.config.cacheDir);
            let totalSize = 0;
            for (const file of files) {
                const filePath = path.join(this.config.cacheDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
            return totalSize;
        }
        catch (error) {
            console.error('Failed to calculate cache size:', error);
            return 0;
        }
    }
    /**
     * Clear entire cache
     */
    async clearCache() {
        try {
            await fs.rm(this.config.cacheDir, { recursive: true, force: true });
            await fs.mkdir(this.config.cacheDir, { recursive: true });
            console.log('Cache cleared successfully');
        }
        catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
    /**
     * Proxy an image URL to a safe local URL
     */
    proxyUrl(originalUrl, baseUrl = '/api/proxy/image') {
        const encodedUrl = encodeURIComponent(originalUrl);
        return `${baseUrl}?url=${encodedUrl}`;
    }
    /**
     * Batch proxy multiple URLs
     */
    proxyUrls(urls, baseUrl = '/api/proxy/image') {
        const proxied = new Map();
        for (const url of urls) {
            proxied.set(url, this.proxyUrl(url, baseUrl));
        }
        return proxied;
    }
}
// Global instance
export const imageProxyService = new ImageProxyService();
// Initialize on module load
imageProxyService.initialize();
// Cleanup every 24 hours
setInterval(() => imageProxyService.cleanupCache(), 24 * 60 * 60 * 1000);
