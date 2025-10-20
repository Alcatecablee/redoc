import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export interface SitemapConfig {
  baseUrl: string;
  entries: SitemapEntry[];
  includeImages?: boolean;
  includeVideos?: boolean;
}

export class SitemapService {
  private baseDir: string;

  constructor(baseDir: string = './public/sitemaps') {
    this.baseDir = baseDir;
  }

  /**
   * Generate XML sitemap for documentation
   */
  async generateSitemap(config: SitemapConfig): Promise<string> {
    try {
      console.log(`🗺️ Generating sitemap for ${config.baseUrl}...`);

      const sitemap = this.buildSitemapXML(config);
      
      // Save sitemap to file
      const sitemapPath = join(this.baseDir, `${this.extractDomain(config.baseUrl)}.xml`);
      await writeFile(sitemapPath, sitemap, 'utf8');

      console.log(`✅ Sitemap generated: ${sitemapPath}`);
      return sitemap;

    } catch (error) {
      console.error('Sitemap generation error:', error);
      throw error;
    }
  }

  /**
   * Generate sitemap index for multiple subdomains
   */
  async generateSitemapIndex(subdomains: string[], baseUrl: string): Promise<string> {
    try {
      console.log(`🗺️ Generating sitemap index for ${subdomains.length} subdomains...`);

      const sitemapIndex = this.buildSitemapIndexXML(subdomains, baseUrl);
      
      // Save sitemap index to file
      const indexPath = join(this.baseDir, 'sitemap-index.xml');
      await writeFile(indexPath, sitemapIndex, 'utf8');

      console.log(`✅ Sitemap index generated: ${indexPath}`);
      return sitemapIndex;

    } catch (error) {
      console.error('Sitemap index generation error:', error);
      throw error;
    }
  }

  /**
   * Submit sitemap to Google Search Console
   * Uses Google Search Console API with OAuth2 or ping fallback
   */
  async submitToGoogleSearchConsole(sitemapUrl: string, siteUrl: string): Promise<boolean> {
    try {
      console.log(`📤 Submitting sitemap to Google Search Console: ${sitemapUrl}`);

      const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_TOKEN;
      
      if (!accessToken) {
        console.warn('⚠️ GOOGLE_SEARCH_CONSOLE_TOKEN not set - using ping method');
        return await this.pingGoogle(sitemapUrl);
      }

      // Submit via Google Search Console API
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`GSC API error: ${response.status} - ${error}`);
        
        // Fallback to ping method
        return await this.pingGoogle(sitemapUrl);
      }

      console.log(`✅ Sitemap submitted to Google Search Console for ${siteUrl}`);
      return true;

    } catch (error) {
      console.error('Google Search Console submission error:', error);
      // Fallback to ping method
      return await this.pingGoogle(sitemapUrl);
    }
  }

  /**
   * Ping Google to index sitemap (fallback method)
   */
  private async pingGoogle(sitemapUrl: string): Promise<boolean> {
    try {
      const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const response = await fetch(pingUrl);
      
      if (response.ok) {
        console.log(`✅ Pinged Google with sitemap: ${sitemapUrl}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Google ping error:', error);
      return false;
    }
  }

  /**
   * Get sitemap submission status from Google Search Console
   */
  async getSitemapStatus(siteUrl: string, sitemapUrl: string): Promise<any> {
    try {
      const accessToken = process.env.GOOGLE_SEARCH_CONSOLE_TOKEN;
      
      if (!accessToken) {
        return { status: 'unknown', message: 'API token not configured' };
      }

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { status: 'error', message: `HTTP ${response.status}` };
      }

      const data = await response.json();
      return {
        status: 'success',
        lastSubmitted: data.lastSubmitted,
        isPending: data.isPending,
        errors: data.errors || [],
        warnings: data.warnings || [],
      };

    } catch (error: any) {
      console.error('GSC status check error:', error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Generate robots.txt file
   */
  async generateRobotsTxt(baseUrl: string, sitemapUrl?: string): Promise<string> {
    try {
      const robotsContent = this.buildRobotsTxt(baseUrl, sitemapUrl);
      
      // Save robots.txt to file
      const robotsPath = join(this.baseDir, 'robots.txt');
      await writeFile(robotsPath, robotsContent, 'utf8');

      console.log(`✅ Robots.txt generated: ${robotsPath}`);
      return robotsContent;

    } catch (error) {
      console.error('Robots.txt generation error:', error);
      throw error;
    }
  }

  /**
   * Build XML sitemap content
   */
  private buildSitemapXML(config: SitemapConfig): string {
    let header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;

    if (config.includeImages) {
      header += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`;
    }

    if (config.includeVideos) {
      header += ` xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`;
    }

    header += `>`;

    const entries = config.entries.map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('');

    return header + entries + `
</urlset>`;
  }

  /**
   * Build sitemap index XML content
   */
  private buildSitemapIndexXML(subdomains: string[], baseUrl: string): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    const sitemaps = subdomains.map(subdomain => `
  <sitemap>
    <loc>${baseUrl}/sitemaps/${subdomain}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('');

    return header + sitemaps + `
</sitemapindex>`;
  }

  /**
   * Build robots.txt content
   */
  private buildRobotsTxt(baseUrl: string, sitemapUrl?: string): string {
    let robots = `User-agent: *
Allow: /

# Sitemap
`;

    if (sitemapUrl) {
      robots += `Sitemap: ${sitemapUrl}
`;
    } else {
      robots += `Sitemap: ${baseUrl}/sitemap.xml
`;
    }

    robots += `
# Crawl delay
Crawl-delay: 1

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/
`;

    return robots;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '-');
    } catch (error) {
      return 'default';
    }
  }

  /**
   * Create sitemap entry for documentation page
   */
  createSitemapEntry(
    url: string,
    lastModified?: Date,
    changeFrequency: SitemapEntry['changeFrequency'] = 'weekly',
    priority: number = 0.8
  ): SitemapEntry {
    return {
      url,
      lastModified: (lastModified || new Date()).toISOString(),
      changeFrequency,
      priority
    };
  }

  /**
   * Generate sitemap entries for documentation sections
   */
  generateDocumentationEntries(
    baseUrl: string,
    sections: Array<{ name: string; slug: string; lastModified?: Date }>
  ): SitemapEntry[] {
    const entries: SitemapEntry[] = [];

    // Add main documentation page
    entries.push(this.createSitemapEntry(baseUrl, undefined, 'daily', 1.0));

    // Add section pages
    sections.forEach(section => {
      const sectionUrl = `${baseUrl}/${section.slug}`;
      entries.push(this.createSitemapEntry(
        sectionUrl,
        section.lastModified,
        'weekly',
        0.8
      ));
    });

    return entries;
  }

  /**
   * Validate sitemap entries
   */
  validateSitemapEntries(entries: SitemapEntry[]): { valid: SitemapEntry[]; invalid: SitemapEntry[] } {
    const valid: SitemapEntry[] = [];
    const invalid: SitemapEntry[] = [];

    entries.forEach(entry => {
      try {
        new URL(entry.url);
        if (entry.priority >= 0 && entry.priority <= 1) {
          valid.push(entry);
        } else {
          invalid.push(entry);
        }
      } catch (error) {
        invalid.push(entry);
      }
    });

    return { valid, invalid };
  }

  /**
   * Get sitemap statistics
   */
  getSitemapStats(entries: SitemapEntry[]): {
    totalUrls: number;
    averagePriority: number;
    frequencyDistribution: Record<string, number>;
  } {
    const totalUrls = entries.length;
    const averagePriority = entries.reduce((sum, entry) => sum + entry.priority, 0) / totalUrls;
    
    const frequencyDistribution: Record<string, number> = {};
    entries.forEach(entry => {
      frequencyDistribution[entry.changeFrequency] = (frequencyDistribution[entry.changeFrequency] || 0) + 1;
    });

    return {
      totalUrls,
      averagePriority,
      frequencyDistribution
    };
  }
}

// Export singleton instance
export const sitemapService = new SitemapService();
