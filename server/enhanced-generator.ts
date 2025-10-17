import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from './storage';
import { searchService, SearchResult, StackOverflowAnswer, GitHubIssue } from './search-service';
import { progressTracker } from './progress-tracker';
import { createAIProvider } from './ai-provider';

// Utility: attempt HEAD then GET to verify URL exists
async function headOrGet(url: string): Promise<Response | null> {
  try {
    const headResp = await fetch(url, { method: 'HEAD' });
    if (headResp.ok) return headResp;
  } catch {}
  try {
    const getResp = await fetch(url, { method: 'GET' });
    if (getResp.ok) return getResp;
  } catch {}
  return null;
}

// Utility: naive sitemap XML parser for <loc> entries
function extractUrlsFromSitemap(xml: string, baseUrl: string): string[] {
  const locMatches = Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)).map(m => m[1].trim());
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
  const allowedPatterns = /(doc|help|support|guide|tutorial|api|developer|faq|question|blog|article|changelog|release|update|resource|learn|integration|pricing|security|status|knowledge|kb)/i;
  return locMatches
    .filter(u => {
      try {
        const url = new URL(u);
        const host = url.hostname.replace(/^www\./, '');
        return host.endsWith(baseHost) && (allowedPatterns.test(url.pathname) || allowedPatterns.test(url.href));
      } catch {
        return false;
      }
    })
    .slice(0, 200);
}

async function fetchSitemaps(baseUrl: string, extraHosts: string[] = []): Promise<string[]> {
  const roots = [baseUrl, ...extraHosts.map(host => {
    const b = new URL(baseUrl);
    return `${b.protocol}//${host}`;
  })];
  const paths = ['/sitemap.xml', '/sitemap_index.xml'];
  const urls: string[] = [];
  for (const root of roots) {
    for (const p of paths) {
      const target = new URL(p, root).href;
      try {
        const resp = await fetch(target);
        if (resp.ok) {
          const xml = await resp.text();
          // If this is an index, it may contain sitemap <loc> entries too
          const extracted = extractUrlsFromSitemap(xml, root);
          urls.push(...extracted);
        }
      } catch {}
    }
  }
  return Array.from(new Set(urls));
}

// Enhanced site discovery and crawling
export async function discoverSiteStructure(baseUrl: string) {
  try {
    const homepage = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!homepage.ok) throw new Error(`Failed to fetch homepage: ${homepage.statusText}`);
    
    const html = await homepage.text();
    const $ = cheerio.load(html);
    
    // Extract product name
    const productName = $('title').text().split('|')[0].trim() || 
                       $('h1').first().text().trim() || 
                       'Unknown Product';
    
    // Common documentation paths to check
    const docPaths = [
      '/docs', '/documentation', '/help', '/support',
      '/help-center', '/blog', '/articles', '/api',
      '/api-docs', '/developers', '/guides', '/tutorials',
      '/getting-started', '/faq', '/questions', '/changelog',
      '/updates', '/releases', '/resources', '/learn',
      '/community', '/forum', '/knowledge-base', '/kb',
      '/integrations', '/pricing', '/security', '/status', '/release-notes', '/roadmap'
    ];

    // Probe common subdomains for docs/help content
    const base = new URL(baseUrl);
    const baseHost = base.hostname.replace(/^www\./, '');
    const subdomains = ['docs','help','support','developer','dev','community','forum','status','api','blog'];
    const discoveredHosts: string[] = [];
    for (const sub of subdomains) {
      const host = `${sub}.${baseHost}`;
      const testUrl = `${base.protocol}//${host}/`;
      const resp = await headOrGet(testUrl);
      if (resp) discoveredHosts.push(host);
    }
    
    // Find valid documentation URLs on base and discovered subdomains
    const validUrls: string[] = [];
    const rootsToTest = [baseUrl, ...discoveredHosts.map(h => `${base.protocol}//${h}`)];
    for (const root of rootsToTest) {
      for (const path of docPaths) {
        try {
          const testUrl = new URL(path, root).href;
          const response = await headOrGet(testUrl);
          if (response) validUrls.push(testUrl);
        } catch {}
      }
    }
    
    // Extract links from navigation menu
    const navLinks = [];
    $('nav a, header a, .menu a, .navigation a, .navbar a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (
        href.includes('doc') || 
        href.includes('help') || 
        href.includes('support') ||
        href.includes('guide') ||
        href.includes('tutorial') ||
        href.includes('blog') ||
        href.includes('api')
      )) {
        try {
          navLinks.push(new URL(href, baseUrl).href);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    
    // Extract all internal links from homepage
    const allLinks: string[] = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      try {
        const url = new URL(href, baseUrl);
        if (url.hostname === new URL(baseUrl).hostname) {
          allLinks.push(url.href);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Parse sitemaps from base and discovered hosts
    const sitemapUrls = await fetchSitemaps(baseUrl, discoveredHosts);

    return {
      productName,
      baseUrl,
      validDocPaths: Array.from(new Set(validUrls)),
      navLinks: [...new Set(navLinks)],
      allInternalLinks: [...new Set(allLinks)].slice(0, 200),
      sitemapUrls
    };
  } catch (error) {
    console.error('Site discovery failed:', error);
    // Return fallback with base URL to continue pipeline
    return {
      productName: 'Unknown Product',
      baseUrl,
      validDocPaths: [baseUrl], // Include base URL as fallback
      navLinks: [],
      allInternalLinks: [baseUrl],
      sitemapUrls: []
    };
  }
}

// Multi-page content extraction
export async function extractMultiPageContent(urls: string[]) {
  const extracted = [];
  
  for (const url of urls.slice(0, 40)) { // Limit to 40 pages for broader coverage
    try {
      const response = await fetch(url, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract code blocks
      const codeBlocks = [];
      $('pre code, pre, .code-block, .highlight').each((i, el) => {
        const code = $(el).text().trim();
        const language = $(el).attr('class')?.match(/language-(\w+)/)?.[1] || 'text';
        if (code.length > 10) {
          codeBlocks.push({ language, code });
        }
      });
      
      // Extract images/screenshots
      const images = [];
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt');
        if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('avatar')) {
          try {
            images.push({ 
              src: new URL(src, url).href, 
              alt: alt || 'Screenshot' 
            });
          } catch (e) {
            // Invalid image URL, skip
          }
        }
      });
      
      // Extract headings for structure
      const headings = [];
      $('h1, h2, h3, h4').each((i, el) => {
        headings.push({
          level: el.tagName.toLowerCase(),
          text: $(el).text().trim()
        });
      });
      
      // Extract main content
      const content = $('main, article, .content, .post-content, .entry-content').text() || 
                     $('body').text();
      
      extracted.push({
        url,
        title: $('title').text() || $('h1').first().text() || 'Untitled',
        content: content.substring(0, 5000), // Limit content length
        excerpt: $('meta[name="description"]').attr('content') || '',
        codeBlocks,
        images,
        headings,
        wordCount: content.split(/\s+/).length
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error.message);
    }
  }
  
  return extracted;
}

// External research using real search APIs (SerpAPI primary, Brave fallback)
export async function performExternalResearch(productName: string, baseUrl: string) {
  console.log(`🔬 Performing comprehensive external research for: ${productName}`);
  
  try {
    const research = await searchService.performComprehensiveResearch(productName, baseUrl);
    
    console.log(`✅ Research complete:
    - Search results: ${research.searchResults.length}
    - Stack Overflow answers: ${research.stackOverflowAnswers.length}
    - GitHub issues: ${research.gitHubIssues.length}`);
    
    // Calculate research quality score
    const qualityScore = searchService.calculateQualityScore(research.searchResults);
    console.log(`📊 Research quality score: ${(qualityScore * 100).toFixed(1)}%`);
    
    return {
      search_results: research.searchResults,
      stackoverflow_answers: research.stackOverflowAnswers,
      github_issues: research.gitHubIssues,
      quality_score: qualityScore,
      total_sources: research.searchResults.length + 
                     research.stackOverflowAnswers.length + 
                     research.gitHubIssues.length
    };
  } catch (error) {
    console.error('❌ External research failed:', error.message);
    return {
      search_results: [],
      stackoverflow_answers: [],
      github_issues: [],
      quality_score: 0,
      total_sources: 0
    };
  }
}

// Enhanced JSON parsing with retry using AI provider
export async function parseJSONWithRetry(aiProvider: ReturnType<typeof createAIProvider>, content: string, retryPrompt: string, maxRetries = 2): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(content);
  } catch (error) {
    // try to extract JSON from code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('Extracted JSON parse failed');
      }
    }

    return await aiProvider.parseJSONWithRetry(content, retryPrompt, maxRetries);
  }
}

// Enhanced documentation generation pipeline
export async function generateEnhancedDocumentation(url: string, userId: string | null, sessionId?: string) {
  const aiProvider = createAIProvider();
  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    throw new Error('No AI provider API keys configured. Please set GROQ_API_KEY or DEEPSEEK_API_KEY/OPENAI_API_KEY');
  }

  console.log('Stage 1: Discovering site structure...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 1,
      stageName: 'Site Discovery',
      description: 'Crawling website and mapping content',
      progress: 10,
    });
  }
  const siteStructure = await discoverSiteStructure(url);
  
  console.log('Stage 2: Extracting multi-page content...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 2,
      stageName: 'Content Extraction',
      description: 'Extracting content from multiple pages',
      progress: 30,
    });
  }
  const docLikePatterns = /(doc|help|support|guide|tutorial|api|developer|faq|question|blog|article|changelog|release|update|resource|learn|integration|pricing|security|status|knowledge|kb)/i;
  const candidateUrls = Array.from(new Set([
    ...siteStructure.validDocPaths,
    ...siteStructure.navLinks,
    ...(siteStructure.sitemapUrls || []),
    ...siteStructure.allInternalLinks.filter((u: string) => docLikePatterns.test(u))
  ]));

  // First pass
  let extractedContent = await extractMultiPageContent(candidateUrls.slice(0, 60));
  // Coverage target
  const MIN_PAGES = 15;
  if (extractedContent.length < MIN_PAGES) {
    // Second pass: expand pool
    const expanded = candidateUrls.slice(60, 200);
    if (expanded.length > 0) {
      const more = await extractMultiPageContent(expanded);
      extractedContent = Array.from(new Set([...extractedContent, ...more]));
    }
  }
  
  console.log('Stage 3: Performing external research...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 3,
      stageName: 'Research & Analysis',
      description: 'Gathering external insights and community knowledge',
      progress: 50,
    });
  }
  const externalResearch = await performExternalResearch(siteStructure.productName, url);
  // Partial success notification via progress if sources missing
  if (sessionId) {
    const totalSources = externalResearch.total_sources || 0;
    if (totalSources === 0) {
      progressTracker.emitProgress(sessionId, {
        stage: 3,
        stageName: 'Research & Analysis',
        description: 'External research unavailable (API limits) – proceeding with site content only',
        progress: 55,
        status: 'progress'
      } as any);
    } else if (totalSources < 5) {
      progressTracker.emitProgress(sessionId, {
        stage: 3,
        stageName: 'Research & Analysis',
        description: `Partial research: ${totalSources} sources found – results may be limited`,
        progress: 58,
        status: 'progress'
      } as any);
    }
  }
  
  console.log('Stage 4: Synthesizing comprehensive data...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 4,
      stageName: 'AI Processing',
      description: 'Synthesizing data and generating documentation',
      progress: 70,
    });
  }
  const comprehensiveData = {
    product_name: siteStructure.productName,
    base_url: url,
    site_content: {
      pages_scraped: extractedContent.length,
      total_words: extractedContent.reduce((sum, p) => sum + p.wordCount, 0),
      pages: extractedContent,
      code_examples: extractedContent.flatMap(p => p.codeBlocks),
      images: extractedContent.flatMap(p => p.images)
    },
    external_research: {
      search_results: externalResearch.search_results,
      stackoverflow_answers: externalResearch.stackoverflow_answers,
      github_issues: externalResearch.github_issues,
      quality_score: externalResearch.quality_score,
      total_sources: externalResearch.total_sources
    }
  };

  // Stage 1: Enhanced structure extraction with optimized data for Groq token limits
  console.log('Stage 4a: Calling AI API for structure extraction...');

  // Limit data to prevent token overload on Groq
  const limitedPages = comprehensiveData.site_content.pages.slice(0, 5);
  const limitedSearchResults = comprehensiveData.external_research.search_results.slice(0, 5);
  const limitedSOAnswers = comprehensiveData.external_research.stackoverflow_answers.slice(0, 3);
  const limitedGitHubIssues = comprehensiveData.external_research.github_issues.slice(0, 3);

  const stage1Response = await aiProvider.generateCompletion(
    [
      {
        role: 'system',
        content: `Create comprehensive documentation with 8+ sections: Getting Started, Features, Tutorials, Troubleshooting, FAQ, Best Practices, API Reference, Use Cases. Include real examples, code, and solutions. Return valid JSON with: title, description, sections array, metadata, theme, searchability.`
        },
        {
          role: 'user',
          content: `PRODUCT: ${comprehensiveData.product_name}
URL: ${comprehensiveData.base_url}

SITE DATA (${comprehensiveData.site_content.pages_scraped} pages, ${comprehensiveData.site_content.total_words} words):
${JSON.stringify(limitedPages, null, 2)}

RESEARCH (${comprehensiveData.external_research.search_results.length} results):
SEARCH: ${JSON.stringify(limitedSearchResults.map(r => ({title: r.title, snippet: r.snippet?.substring(0, 100)})), null, 2)}
STACKOVERFLOW: ${JSON.stringify(limitedSOAnswers.map(a => ({question: a.question?.substring(0, 80), answer: a.answer?.substring(0, 100)})), null, 2)}
GITHUB: ${JSON.stringify(limitedGitHubIssues.map(i => ({title: i.title?.substring(0, 80), body: i.body?.substring(0, 100)})), null, 2)}

Create 8-10 comprehensive sections covering: getting started, core features, configuration, tutorials, troubleshooting (5+ issues), FAQ (10+ questions), best practices, API reference. Include real examples. Return JSON with sections array.`
        }
      ],
    { jsonMode: true, maxRetries: 2, timeoutMs: 60000 }
  );

  console.log(`✅ Stage 4b: AI response received (${stage1Response.provider}), parsing data...`);
  const extractedStructure = await parseJSONWithRetry(
    aiProvider, 
    stage1Response.content, 
    'Ensure the output is valid JSON matching the comprehensive structure extraction format'
  );
  
  console.log('✅ Stage 4c: Structure extracted successfully');

  // Stage 2: Enhanced documentation writing
  console.log('Stage 5: Writing documentation...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 5,
      stageName: 'Documentation Writing',
      description: 'Creating professional documentation content',
      progress: 85,
    });
  }
  const stage2Response = await aiProvider.generateCompletion(
    [
        {
          role: 'system',
          content: `Write professional Apple-style documentation with 8+ sections: Getting Started, Features, Tutorials, Configuration, Troubleshooting (5+ issues), FAQ (10+ Q&A), Best Practices, API Reference. Each section has content blocks (paragraph, heading, list, code, callout, table). Return JSON: {title, description, sections: [{id, title, icon, content}]}.`
        },
        {
          role: 'user',
          content: `Create comprehensive documentation from this structure. Include setup guide, features detailed, tutorials, troubleshooting with solutions, FAQ, best practices, API. Return valid JSON.`
        }
      ],
    { jsonMode: true }
  );

  console.log(`✅ Stage 2 response received (${stage2Response.provider})`);
  const writtenDocs = await parseJSONWithRetry(
    aiProvider, 
    stage2Response.content, 
    'Ensure the output is valid JSON with proper comprehensive documentation structure'
  );

  // Stage 3: Metadata generation
  const stage3Response = await aiProvider.generateCompletion(
    [
        {
          role: 'system',
          content: `Generate metadata for documentation. Return JSON with: metadata (title, description, keywords), searchability (primary_tags, synonyms, search_keywords), validation (status).
Return JSON: {metadata: {title, description, keywords}, searchability: {primary_tags, search_keywords}, validation: {status}}.`
        },
        {
          role: 'user',
          content: `Generate metadata for documentation. URL: ${url}, pages: ${comprehensiveData.site_content.pages_scraped}, sources: ${comprehensiveData.external_research.total_sources}. Return metadata JSON.`
        }
      ],
    { jsonMode: true }
  );

  console.log(`✅ Stage 3 response received (${stage3Response.provider})`);
  const finalMetadata = await parseJSONWithRetry(
    aiProvider, 
    stage3Response.content, 
    'Ensure the output is valid JSON with metadata and searchability fields'
  );

  // Extract theme from the original site
  const theme = extractThemeFromContent(comprehensiveData.site_content.pages);

  // Final comprehensive documentation
  const finalDoc = {
    title: finalMetadata.metadata?.title || writtenDocs.title || 'Comprehensive Documentation',
    description: finalMetadata.metadata?.description || writtenDocs.description || '',
    sections: writtenDocs.sections || [],
    metadata: finalMetadata.metadata || {},
    searchability: finalMetadata.searchability || {},
    validation: finalMetadata.validation || {},
    theme: theme,
    extractedStructure: extractedStructure,
    citations: extractedStructure?.source_citations || {},
    researchStats: {
      pages_analyzed: comprehensiveData.site_content.pages_scraped,
      external_sources: comprehensiveData.external_research.total_sources,
      total_words: comprehensiveData.site_content.total_words,
      code_examples: comprehensiveData.site_content.code_examples.length,
      images: comprehensiveData.site_content.images.length
    }
  };
  
  console.log(`✅ Final doc assembled: ${finalDoc.sections.length} sections, title: ${finalDoc.title}`);

  // Save to database
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 6,
      stageName: 'Finalizing',
      description: 'Saving documentation and preparing export',
      progress: 95,
    });
  }
  
  // Save to database
  const documentation = await storage.createDocumentation({
    url,
    title: finalDoc.title,
    content: JSON.stringify(finalDoc),
    user_id: userId,
  } as any);
  
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 7,
      stageName: 'Complete',
      description: 'Documentation generated successfully!',
      progress: 100,
    });
  }

  return { documentation, finalDoc };
}

// Extract theme from content
function extractThemeFromContent(pages: Array<{ content: string }>) {
  const allColors: string[] = [];
  const allFonts: string[] = [];
  
  pages.forEach(page => {
    // Extract colors from content (simplified)
    const colorMatches = page.content.match(/#[0-9A-Fa-f]{3,6}/g) || [];
    allColors.push(...colorMatches);
    
    // Extract fonts from content (simplified)
    const fontMatches = page.content.match(/font-family:\s*([^;]+)/gi) || [];
    fontMatches.forEach(match => {
      const font = match.replace(/font-family:\s*/i, '').split(',')[0].trim().replace(/['"]/g, '');
      if (font && font.length < 50) allFonts.push(font);
    });
  });
  
  const uniqueColors = [...new Set(allColors)].slice(0, 10);
  const uniqueFonts = [...new Set(allFonts)].slice(0, 5);
  
  return {
    primaryColor: uniqueColors[0] || '#8B5CF6',
    secondaryColor: uniqueColors[1] || '#6366F1',
    accentColor: uniqueColors[2] || '#8B5CF6',
    colors: uniqueColors,
    fonts: uniqueFonts,
    primaryFont: uniqueFonts[0] || 'Inter, system-ui, sans-serif'
  };
}
