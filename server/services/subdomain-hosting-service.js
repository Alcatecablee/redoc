import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { db } from '../db';
import { documentations } from '@shared/schema';
import { eq } from 'drizzle-orm';
/**
 * Subdomain Hosting Service for Enterprise tier
 * Manages multi-tenant static hosting for documentation
 */
export class SubdomainHostingService {
    hostingDir;
    baseUrl;
    constructor() {
        this.hostingDir = join(process.cwd(), 'hosted-docs');
        this.baseUrl = process.env.BASE_DOMAIN || 'docsnap.app';
    }
    /**
     * Deploy documentation to subdomain
     */
    async deployToSubdomain(config) {
        try {
            console.log(`🚀 Deploying documentation to subdomain: ${config.subdomain}`);
            // Validate subdomain format
            if (!this.isValidSubdomain(config.subdomain)) {
                throw new Error('Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.');
            }
            // Check if subdomain is available
            const isAvailable = await this.isSubdomainAvailable(config.subdomain);
            if (!isAvailable) {
                throw new Error('Subdomain is already taken');
            }
            // Get documentation content
            const database = db;
            if (!database) {
                throw new Error('Database not configured');
            }
            const [doc] = await database
                .select()
                .from(documentations)
                .where(eq(documentations.id, config.documentationId))
                .limit(1);
            if (!doc) {
                throw new Error('Documentation not found');
            }
            // Create subdomain directory
            const subdomainPath = join(this.hostingDir, config.subdomain);
            await mkdir(subdomainPath, { recursive: true });
            // Generate static HTML
            const html = this.generateStaticHTML(doc, config);
            await writeFile(join(subdomainPath, 'index.html'), html);
            // Generate assets
            await this.generateAssets(subdomainPath, doc);
            // Configure SSL if enabled
            const sslStatus = config.sslEnabled ? await this.provisionSSL(config.subdomain) : 'disabled';
            // Update subdomain mapping
            await this.updateSubdomainMapping(config);
            const url = config.customDomain || `https://${config.subdomain}.${this.baseUrl}`;
            console.log(`✅ Documentation deployed to: ${url}`);
            return {
                subdomain: config.subdomain,
                url,
                deployedAt: new Date(),
                sslStatus,
            };
        }
        catch (error) {
            console.error('Deployment error:', error);
            throw error;
        }
    }
    /**
     * Validate subdomain format
     */
    isValidSubdomain(subdomain) {
        // Lowercase letters, numbers, hyphens only
        // Must start with letter, no consecutive hyphens
        const pattern = /^[a-z][a-z0-9-]{2,62}$/;
        return pattern.test(subdomain) && !subdomain.includes('--');
    }
    /**
     * Check if subdomain is available
     */
    async isSubdomainAvailable(subdomain) {
        try {
            const mappingFile = join(this.hostingDir, 'subdomain-mapping.json');
            try {
                const data = await readFile(mappingFile, 'utf-8');
                const mapping = JSON.parse(data);
                return !mapping[subdomain];
            }
            catch {
                // File doesn't exist, subdomain is available
                return true;
            }
        }
        catch (error) {
            console.error('Availability check error:', error);
            return false;
        }
    }
    /**
     * Update subdomain mapping
     */
    async updateSubdomainMapping(config) {
        const mappingFile = join(this.hostingDir, 'subdomain-mapping.json');
        await mkdir(this.hostingDir, { recursive: true });
        let mapping = {};
        try {
            const data = await readFile(mappingFile, 'utf-8');
            mapping = JSON.parse(data);
        }
        catch {
            // File doesn't exist, start fresh
        }
        mapping[config.subdomain] = {
            userId: config.userId,
            documentationId: config.documentationId,
            customDomain: config.customDomain,
            createdAt: new Date().toISOString(),
        };
        await writeFile(mappingFile, JSON.stringify(mapping, null, 2));
    }
    /**
     * Generate static HTML for documentation
     */
    generateStaticHTML(doc, config) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title || 'Documentation'}</title>
  <meta name="description" content="${doc.description || 'Generated documentation'}">
  <link rel="stylesheet" href="/styles.css">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      color: #1a202c;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    h2 { font-size: 2rem; margin-top: 2rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h3 { font-size: 1.5rem; margin-top: 1.5rem; }
    code { background: #f7fafc; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'Fira Code', monospace; }
    pre { background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    a { color: #3182ce; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <h1>${doc.title || 'Documentation'}</h1>
    <p style="color: #718096;">${doc.description || ''}</p>
  </header>
  <main>
    ${doc.content || ''}
  </main>
  <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; color: #718096;">
    <p>Generated with DocSnap &bull; <a href="https://${this.baseUrl}">Create your own documentation</a></p>
  </footer>
</body>
</html>`;
    }
    /**
     * Generate additional assets (CSS, JS, etc.)
     */
    async generateAssets(path, doc) {
        // Generate robots.txt
        const robotsTxt = `User-agent: *\nAllow: /\nSitemap: https://${doc.subdomain || 'docs'}.${this.baseUrl}/sitemap.xml`;
        await writeFile(join(path, 'robots.txt'), robotsTxt);
        // Generate minimal CSS
        const css = `/* Additional styles can be added here */`;
        await writeFile(join(path, 'styles.css'), css);
    }
    /**
     * Provision SSL certificate for subdomain
     * In production, this would integrate with Let's Encrypt or cloud provider
     */
    async provisionSSL(subdomain) {
        console.log(`🔒 SSL provisioning for ${subdomain} (simulated in development)`);
        // In production:
        // 1. Use certbot/Let's Encrypt for automatic SSL
        // 2. Or integrate with cloud provider (Cloudflare, AWS ACM, etc.)
        // 3. Verify domain ownership via DNS challenge
        // 4. Install certificate
        return 'active'; // Simulated
    }
    /**
     * Remove subdomain deployment
     */
    async removeSubdomain(subdomain) {
        console.log(`🗑️ Removing subdomain: ${subdomain}`);
        const { rm } = await import('fs/promises');
        const subdomainPath = join(this.hostingDir, subdomain);
        try {
            await rm(subdomainPath, { recursive: true, force: true });
            // Update mapping
            const mappingFile = join(this.hostingDir, 'subdomain-mapping.json');
            const data = await readFile(mappingFile, 'utf-8');
            const mapping = JSON.parse(data);
            delete mapping[subdomain];
            await writeFile(mappingFile, JSON.stringify(mapping, null, 2));
            console.log(`✅ Subdomain removed: ${subdomain}`);
        }
        catch (error) {
            console.error('Subdomain removal error:', error);
            throw error;
        }
    }
    /**
     * List all active subdomains for a user
     */
    async listUserSubdomains(userId) {
        try {
            const mappingFile = join(this.hostingDir, 'subdomain-mapping.json');
            const data = await readFile(mappingFile, 'utf-8');
            const mapping = JSON.parse(data);
            return Object.keys(mapping).filter(sub => mapping[sub].userId === userId);
        }
        catch {
            return [];
        }
    }
}
export const subdomainHostingService = new SubdomainHostingService();
