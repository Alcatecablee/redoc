import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from './storage';
import { searchService, SearchResult, StackOverflowAnswer, GitHubIssue } from './search-service';
import { youtubeService, YouTubeVideo } from './youtube-service';
import { redditService, RedditPost } from './reddit-service';
import { devToService, DevToArticle } from './devto-service';
import { codeProjectService, CodeProjectArticle } from './codeproject-service';
import { quoraService, QuoraAnswer } from './quora-service';
import { forumsService, ForumPost } from './forums-service';
import { stackExchangeService, StackExchangeQuestion } from './stackexchange-service';
import { pipelineMonitor } from './utils/pipeline-monitor';
import { progressTracker } from './progress-tracker';
import { createAIProvider } from './ai-provider';
import { seoService } from './seo-service';
import { schemaService } from './schema-service';
import { sitemapService } from './sitemap-service';
import { contentRefreshService } from './content-refresh-service';
import { calculateSmartScaling, enforceTierLimits } from './tier-config';
import { qualityScoringService } from './quality-scoring-service';
import {
  shouldSkipImage,
  fetchImageMetadata,
  deduplicateImages,
  generateShortCaption,
  sanitizeImageUrl,
  imageCache,
  type ImageMetadata
} from './image-utils';
import {
  composeImagesIntoDocumentation,
  type EnhancedImage,
  type DocumentSection
} from './image-composition';
import { enhanceImagesWithCaptions } from './image-caption-generator';
import { processConcurrently } from './utils/concurrent-fetch';
import { 
  validateExtractedStructure, 
  validateSuggestedSections, 
  validateWrittenDocs,
  validateMetadata
} from './utils/ai-validation';
import { withPipelineTimeout, withStageTimeout, checkAbortSignal, TimeoutError } from './utils/pipeline-timeout';

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
  
  // Parallelize sitemap fetching
  const { processConcurrently } = await import('./utils/concurrent-fetch');
  const sitemapCombos = roots.flatMap(root => paths.map(p => ({ root, path: p })));
  
  const results = await processConcurrently(
    sitemapCombos,
    async (combo, _index, signal) => {
      const target = new URL(combo.path, combo.root).href;
      try {
        const resp = await fetch(target, { signal });
        if (resp.ok) {
          const xml = await resp.text();
          return extractUrlsFromSitemap(xml, combo.root);
        }
      } catch {}
      return [];
    },
    { concurrency: 10, timeoutMs: 5000 }
  );
  
  const urls = results
    .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
  
  return Array.from(new Set(urls));
}

// Enhanced site discovery and crawling
export async function discoverSiteStructure(baseUrl: string, sessionId?: string) {
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
    
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `📱 Analyzing ${productName}...`,
        type: 'info'
      }, 1, 'Site Discovery');
    }
    
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

    // Probe common subdomains for docs/help content (PARALLELIZED)
    const base = new URL(baseUrl);
    const baseHost = base.hostname.replace(/^www\./, '');
    const subdomains = ['docs','help','support','developer','dev','community','forum','status','api','blog'];
    
    console.log(`🔍 Probing ${subdomains.length} subdomains in parallel...`);
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `🔍 Scanning ${subdomains.length} subdomains for documentation...`,
        type: 'info'
      }, 1, 'Site Discovery');
    }
    
    const { processConcurrently } = await import('./utils/concurrent-fetch');
    
    const subdomainResults = await processConcurrently(
      subdomains,
      async (sub, _index, signal) => {
        const host = `${sub}.${baseHost}`;
        const testUrl = `${base.protocol}//${host}/`;
        const resp = await headOrGet(testUrl);
        return resp ? host : null;
      },
      { concurrency: 10, timeoutMs: 3000 }
    );
    
    const discoveredHosts = subdomainResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
    
    console.log(`✅ Discovered ${discoveredHosts.length} subdomains`);
    if (sessionId && discoveredHosts.length > 0) {
      progressTracker.emitActivity(sessionId, {
        message: `✅ Found ${discoveredHosts.length} active ${discoveredHosts.length === 1 ? 'subdomain' : 'subdomains'}: ${discoveredHosts.slice(0, 3).join(', ')}${discoveredHosts.length > 3 ? '...' : ''}`,
        type: 'success'
      }, 1, 'Site Discovery');
    }
    
    // Find valid documentation URLs on base and discovered subdomains (PARALLELIZED)
    const rootsToTest = [baseUrl, ...discoveredHosts.map(h => `${base.protocol}//${h}`)];
    const pathTestCombos = rootsToTest.flatMap(root => 
      docPaths.map(path => ({ root, path }))
    );
    
    console.log(`🔍 Testing ${pathTestCombos.length} documentation paths in parallel...`);
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `🔍 Testing ${pathTestCombos.length} potential documentation paths...`,
        type: 'info'
      }, 1, 'Site Discovery');
    }
    
    const pathResults = await processConcurrently(
      pathTestCombos,
      async (combo, _index, signal) => {
        try {
          const testUrl = new URL(combo.path, combo.root).href;
          const response = await headOrGet(testUrl);
          return response ? testUrl : null;
        } catch {
          return null;
        }
      },
      { concurrency: 10, timeoutMs: 3000 }
    );
    
    const validUrls = pathResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
    
    console.log(`✅ Found ${validUrls.length} valid documentation paths`);
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `📄 Discovered ${validUrls.length} documentation ${validUrls.length === 1 ? 'page' : 'pages'} on domain`,
        type: 'success',
        data: { urlsDiscovered: validUrls.length }
      }, 1, 'Site Discovery');
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
    
    if (sessionId && sitemapUrls.length > 0) {
      progressTracker.emitActivity(sessionId, {
        message: `📑 Found sitemap with ${sitemapUrls.length} additional URLs`,
        type: 'success'
      }, 1, 'Site Discovery');
    }

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

// Multi-page content extraction (PARALLELIZED - 10x faster!)
export async function extractMultiPageContent(urls: string[], sessionId?: string) {
  const urlsToProcess = urls.slice(0, 40); // Limit to 40 pages for broader coverage
  
  console.log(`🚀 Parallel crawling ${urlsToProcess.length} pages with 10 concurrent workers...`);
  if (sessionId) {
    progressTracker.emitActivity(sessionId, {
      message: `🚀 Crawling ${urlsToProcess.length} pages in parallel...`,
      type: 'info'
    }, 2, 'Content Extraction');
  }
  
  const startTime = Date.now();
  
  // Process pages concurrently (10 at a time, 5-second timeout per page)
  const results = await processConcurrently(
    urlsToProcess,
    async (url, _index, signal) => {
      const response = await fetch(url, { 
        signal, // AbortSignal for proper timeout handling
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
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
      
      // Extract images/screenshots with advanced filtering
      const imagePromises: Promise<ImageMetadata>[] = [];
      $('img').each((i, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt') || '';
        
        if (!src) return;
        
        try {
          const absoluteUrl = new URL(src, url).href;
          const sanitizedUrl = sanitizeImageUrl(absoluteUrl);
          
          if (!sanitizedUrl || shouldSkipImage(sanitizedUrl, alt)) {
            return;
          }
          
          // Check cache first
          const cached = imageCache.get(sanitizedUrl);
          if (cached) {
            if (cached.isValid) {
              imagePromises.push(Promise.resolve(cached));
            }
            return;
          }
          
          // Fetch and validate image
          imagePromises.push(
            fetchImageMetadata(sanitizedUrl, alt, url).then(metadata => {
              imageCache.set(sanitizedUrl, metadata);
              return metadata;
            })
          );
        } catch (e) {
          console.error(`Invalid image URL: ${src}`, e);
        }
      });
      
      // Wait for all image metadata fetches to complete (with timeout)
      const imagesMetadata = await Promise.allSettled(imagePromises);
      const validImages = imagesMetadata
        .filter((result): result is PromiseFulfilledResult<ImageMetadata> => 
          result.status === 'fulfilled' && result.value.isValid === true
        )
        .map(result => result.value);
      
      // Deduplicate images using perceptual hashing
      const uniqueImages = deduplicateImages(validImages);
      
      // Sort by importance
      const images = uniqueImages
        .sort((a, b) => {
          const importanceOrder = { high: 0, medium: 1, low: 2 };
          return importanceOrder[a.importance || 'low'] - importanceOrder[b.importance || 'low'];
        })
        .slice(0, 20) // Limit to top 20 images per page
        .map(img => ({
          src: img.url,
          alt: img.alt,
          caption: generateShortCaption(img.alt, img.url),
          width: img.width,
          height: img.height,
          importance: img.importance,
          hash: img.hash
        }));
      
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
      
      return {
        url,
        title: $('title').text() || $('h1').first().text() || 'Untitled',
        content: content.substring(0, 5000), // Limit content length
        excerpt: $('meta[name="description"]').attr('content') || '',
        codeBlocks,
        images,
        headings,
        wordCount: content.split(/\s+/).length
      };
    },
    {
      concurrency: 10,      // 10 pages at once
      timeoutMs: 5000,      // 5 second timeout per page
      onProgress: (completed, total) => {
        if (completed % 10 === 0 || completed === total) {
          console.log(`   📄 Crawled ${completed}/${total} pages...`);
        }
      }
    }
  );
  
  // Extract successful results
  const extracted = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value);
  
  const failedCount = results.length - extracted.length;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`✅ Parallel crawling complete in ${duration}s (${extracted.length} success, ${failedCount} failed)`);
  console.log(`   ⚡ Speed improvement: ~${(urlsToProcess.length / parseFloat(duration)).toFixed(1)} pages/second`);
  
  if (sessionId) {
    const totalCodeBlocks = extracted.reduce((sum, page) => sum + (page.codeBlocks?.length || 0), 0);
    const totalImages = extracted.reduce((sum, page) => sum + (page.images?.length || 0), 0);
    progressTracker.emitActivity(sessionId, {
      message: `✅ Extracted content from ${extracted.length} pages • ${totalCodeBlocks} code examples • ${totalImages} images`,
      type: 'success',
      data: { pagesProcessed: extracted.length }
    }, 2, 'Content Extraction');
  }
  
  return extracted;
}

// External research using real search APIs with dynamic limits
export async function performExternalResearch(
  productName: string, 
  baseUrl: string, 
  crawledPageCount: number = 0,
  youtubeApiAccess: boolean = false,
  youtubeTranscripts: boolean = false,
  sessionId?: string
) {
  console.log(`🔬 Performing comprehensive external research for: ${productName}`);
  
  if (sessionId) {
    progressTracker.emitActivity(sessionId, {
      message: `🔬 Starting comprehensive research for ${productName}...`,
      type: 'info'
    }, 3, 'Research & Analysis');
  }
  
  try {
    const research = await searchService.performComprehensiveResearch(
      productName, 
      baseUrl, 
      'medium', // Will be auto-estimated based on crawledPageCount
      crawledPageCount,
      youtubeApiAccess,
      youtubeTranscripts
    );
    
    console.log(`✅ Research complete (${research.productComplexity} product):
    - Search results: ${research.searchResults.length}
    - Stack Overflow answers: ${research.stackOverflowAnswers.length}
    - GitHub issues: ${research.gitHubIssues.length}
    - YouTube videos: ${research.youtubeVideos.length}
    - Total sources: ${research.totalSources}`);
    
    console.log(`📊 Research quality score: ${(research.qualityScore * 100).toFixed(1)}%`);
    
    if (sessionId) {
      if (research.searchResults.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `🔍 Analyzed ${research.searchResults.length} search results from Google...`,
          type: 'success'
        }, 3, 'Research & Analysis');
      }
      
      if (research.stackOverflowAnswers.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `💡 Found ${research.stackOverflowAnswers.length} Stack Overflow ${research.stackOverflowAnswers.length === 1 ? 'answer' : 'answers'} with solutions`,
          type: 'success',
          data: { sourcesFound: research.stackOverflowAnswers.length }
        }, 3, 'Research & Analysis');
      }
      
      if (research.gitHubIssues.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `🐛 Reading GitHub issues... ${research.gitHubIssues.length} common ${research.gitHubIssues.length === 1 ? 'problem' : 'problems'} identified`,
          type: 'success'
        }, 3, 'Research & Analysis');
      }
      
      if (research.youtubeVideos.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `📹 Watching YouTube tutorials... ${research.youtubeVideos.length} ${research.youtubeVideos.length === 1 ? 'video' : 'videos'} analyzed`,
          type: 'success'
        }, 3, 'Research & Analysis');
      }
      
      if (research.redditPosts && research.redditPosts.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `💬 Analyzed ${research.redditPosts.length} Reddit discussions`,
          type: 'success'
        }, 3, 'Research & Analysis');
      }
      
      if (research.devToArticles && research.devToArticles.length > 0) {
        progressTracker.emitActivity(sessionId, {
          message: `📝 Found ${research.devToArticles.length} DEV.to articles`,
          type: 'success'
        }, 3, 'Research & Analysis');
      }
      
      progressTracker.emitActivity(sessionId, {
        message: `✨ Synthesizing ${research.totalSources} sources with AI...`,
        type: 'info',
        data: { sourcesFound: research.totalSources }
      }, 3, 'Research & Analysis');
    }
    
    return {
      search_results: research.searchResults,
      stackoverflow_answers: research.stackOverflowAnswers,
      github_issues: research.gitHubIssues,
      youtube_videos: research.youtubeVideos,
      reddit_posts: research.redditPosts || [],
      devto_articles: research.devToArticles || [],
      codeproject_articles: research.codeProjectArticles || [],
      stackexchange_questions: research.stackExchangeQuestions || [],
      quora_answers: research.quoraAnswers || [],
      forum_posts: research.forumPosts || [],
      quality_score: research.qualityScore,
      total_sources: research.totalSources,
      product_complexity: research.productComplexity
    };
  } catch (error) {
    console.error('❌ External research failed:', error.message);
    return {
      search_results: [],
      stackoverflow_answers: [],
      github_issues: [],
      youtube_videos: [],
      reddit_posts: [],
      devto_articles: [],
      codeproject_articles: [],
      stackexchange_questions: [],
      quora_answers: [],
      forum_posts: [],
      quality_score: 0,
      total_sources: 0,
      product_complexity: 'small' as const
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
export async function generateEnhancedDocumentation(
  url: string, 
  userId: string | null, 
  sessionId?: string,
  userPlan: string = 'free',
  abortSignal?: AbortSignal
) {
  const aiProvider = createAIProvider();
  // Allow any configured provider via provider rotation

  console.log('Stage 1: Discovering site structure...');
  const pmId = sessionId || `sess_${Math.random().toString(36).slice(2)}`;
  pipelineMonitor.startPipeline(pmId);
  pipelineMonitor.updateStage(pmId, 1, { status: 'in_progress', progress: 10 });
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 1,
      stageName: 'Site Discovery',
      description: 'Crawling website and mapping content',
      progress: 10,
    });
  }
  const siteStructure = await discoverSiteStructure(url, sessionId);
  pipelineMonitor.updateStage(pmId, 1, { status: 'completed', progress: 100, details: { itemsProcessed: siteStructure.allInternalLinks.length, itemsTotal: siteStructure.allInternalLinks.length } });
  
  console.log('Stage 2: Extracting multi-page content...');
  pipelineMonitor.updateStage(pmId, 2, { status: 'in_progress', progress: 30 });
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
  let extractedContent = await extractMultiPageContent(candidateUrls.slice(0, 60), sessionId);
  pipelineMonitor.updateStage(pmId, 2, { status: 'partial', progress: Math.min(60, Math.round((extractedContent.length / Math.max(candidateUrls.length, 1)) * 100)), warnings: extractedContent.length < 15 ? ['Low page coverage, attempting second pass'] : [] });
  // Coverage target
  const MIN_PAGES = 15;
  if (extractedContent.length < MIN_PAGES) {
    // Second pass: expand pool
    const expanded = candidateUrls.slice(60, 200);
    if (expanded.length > 0) {
      const more = await extractMultiPageContent(expanded, sessionId);
      extractedContent = Array.from(new Set([...extractedContent, ...more]));
    }
  }
  pipelineMonitor.updateStage(pmId, 2, { status: 'completed', progress: 100, details: { itemsProcessed: extractedContent.length, itemsTotal: candidateUrls.length } });
  
  console.log('Stage 3: Performing external research...');
  pipelineMonitor.updateStage(pmId, 3, { status: 'in_progress', progress: 50 });
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 3,
      stageName: 'Research & Analysis',
      description: 'Gathering external insights and community knowledge',
      progress: 50,
    });
  }
  // Enforce tier limits for YouTube access
  const smartScaling = calculateSmartScaling(extractedContent.length);
  const tierLimits = enforceTierLimits(userPlan, smartScaling);
  
  const externalResearch = await performExternalResearch(
    siteStructure.productName, 
    url, 
    extractedContent.length,
    tierLimits.youtubeApiAccess,
    tierLimits.youtubeTranscripts,
    sessionId
  );
  // Partial success notification via progress and pipeline monitor if sources missing
  const missing: string[] = [];
  if (!process.env.SERPAPI_KEY && !process.env.BRAVE_API_KEY) missing.push('Search APIs');
  if (externalResearch.github_issues.length === 0) missing.push('GitHub issues');
  const hasSources = (externalResearch.total_sources || 0) > 0;
  if (sessionId) {
    const totalSources = externalResearch.total_sources || 0;
    const youtubeCount = externalResearch.youtube_videos?.length || 0;
    const desc = totalSources === 0
      ? 'External research unavailable (API limits) – proceeding with site content only'
      : `Research complete: ${totalSources} sources${youtubeCount > 0 ? ` (${youtubeCount} YouTube videos)` : ''}${missing.length ? ` – missing ${missing.join(', ')}` : ''}`;
    progressTracker.emitProgress(sessionId, {
      stage: 3,
      stageName: 'Research & Analysis',
      description: desc,
      progress: totalSources === 0 ? 55 : 58,
      status: 'progress'
    } as any);
  }
  pipelineMonitor.updateStage(pmId, 3, { 
    status: hasSources ? 'completed' : 'partial', 
    progress: hasSources ? 100 : 70,
    details: { itemsProcessed: externalResearch.total_sources, itemsTotal: 1, warnings: missing.length ? [`Missing: ${missing.join(', ')}`] : [] }
  });
  
  console.log('Stage 4: Synthesizing comprehensive data...');
  pipelineMonitor.updateStage(pmId, 4, { status: 'in_progress', progress: 70 });
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

  // Increased limits for richer context (GPT-4 can handle ~128K tokens)
  // All truncation set to 1000 chars, search results scaled: small (10), medium (20), large (30)
  // These limits MUST match SearchService.SOURCE_LIMITS for consistency
  const productComplexity = externalResearch.product_complexity || 'medium';
  const limits = productComplexity === 'large' ? { pages: 10, search: 30, so: 20, gh: 15, truncate: 1000 }
               : productComplexity === 'medium' ? { pages: 8, search: 20, so: 10, gh: 10, truncate: 1000 }
               : { pages: 5, search: 10, so: 5, gh: 5, truncate: 1000 };

  const limitedPages = comprehensiveData.site_content.pages.slice(0, limits.pages);
  const limitedSearchResults = comprehensiveData.external_research.search_results.slice(0, limits.search);
  const limitedSOAnswers = comprehensiveData.external_research.stackoverflow_answers.slice(0, limits.so);
  const limitedGitHubIssues = comprehensiveData.external_research.github_issues.slice(0, limits.gh);

  console.log(`📊 Sending to AI (${productComplexity} complexity): ${limits.pages} pages, ${limits.so} SO answers, ${limits.gh} GH issues`);

  const stage1Response = await aiProvider.generateCompletion(
    [
      {
        role: 'system',
        content: `Create comprehensive documentation with 8+ sections: Getting Started, Features, Tutorials, Troubleshooting, FAQ, Best Practices, API Reference, Use Cases. Include real examples, code, and solutions. Include SOURCE ATTRIBUTION for all technical solutions (link to Stack Overflow, GitHub, or official docs). Return valid JSON with: title, description, sections array, metadata, theme, searchability.`
        },
        {
          role: 'user',
          content: `PRODUCT: ${comprehensiveData.product_name}
URL: ${comprehensiveData.base_url}
COMPLEXITY: ${productComplexity}

SITE DATA (${comprehensiveData.site_content.pages_scraped} pages, ${comprehensiveData.site_content.total_words} words):
${JSON.stringify(limitedPages, null, 2)}

RESEARCH (${comprehensiveData.external_research.search_results.length} results):
SEARCH: ${JSON.stringify(limitedSearchResults.map(r => ({title: r.title, url: r.url, snippet: r.snippet?.substring(0, limits.truncate), trustScore: r.trustScore})), null, 2)}
STACKOVERFLOW: ${JSON.stringify(limitedSOAnswers.map(a => ({question: a.question?.substring(0, 200), answer: a.answer?.substring(0, limits.truncate), url: a.url, votes: a.votes, accepted: a.accepted})), null, 2)}
GITHUB: ${JSON.stringify(limitedGitHubIssues.map(i => ({title: i.title?.substring(0, 200), description: i.description?.substring(0, limits.truncate), url: i.url, state: i.state})), null, 2)}

Create 8-12 comprehensive sections tailored to this ${productComplexity}-complexity product. Prioritize sections based on product needs (e.g., "Webhooks" for payment APIs, "Database Migrations" for databases). Include: getting started, core features, configuration, tutorials, troubleshooting (${limits.so}+ issues with SOURCES), FAQ (${Math.max(10, limits.so * 2)}+ questions), best practices, API reference.

IMPORTANT: Add source attribution for all solutions - format as "Source: [Stack Overflow #123](url)" or "Source: [GitHub Issue #456](url)" or "Source: [Official Docs](url)". Return JSON with sections array.`
        }
      ],
    { jsonMode: true, maxRetries: 2, timeoutMs: 90000 } // Increased timeout for more complex inputs
  );

  console.log(`✅ Stage 4b: AI response received (${stage1Response.provider}), validating data...`);
  const extractedStructure = validateExtractedStructure(stage1Response.content);
  
  console.log('✅ Stage 4c: Structure extracted successfully');
  pipelineMonitor.updateStage(pmId, 5, { status: 'in_progress', progress: 75 });

  // Stage 1.5: Dynamic section generation based on product type
  console.log('Stage 4b: Analyzing product for dynamic sections...');
  const sectionsPrompt = `Analyze this ${productComplexity}-complexity product and suggest 8-12 documentation sections tailored to its needs.

PRODUCT: ${comprehensiveData.product_name}
TYPE: ${extractedStructure.metadata?.type || 'SaaS'}
FEATURES: ${JSON.stringify(extractedStructure.features?.slice(0, 5) || [], null, 2)}

Suggest relevant sections. Examples:
- Payment API → Include "Webhooks", "Security", "Testing"
- Database → Include "Migrations", "Query Optimization", "Backups"
- SaaS → Include "Integrations", "API Reference", "Pricing"

Return JSON array of sections: [{id: string, title: string, priority: "high"|"medium"|"low", rationale: string}]`;

  const sectionsResponse = await aiProvider.generateCompletion([
    { role: 'system', content: 'You are a documentation architect. Analyze products and suggest the most relevant documentation sections.' },
    { role: 'user', content: sectionsPrompt }
  ], { jsonMode: true, timeoutMs: 30000 });

  const suggestedSections = validateSuggestedSections(sectionsResponse.content);
  console.log(`✅ Suggested ${suggestedSections.sections?.length || 8} dynamic sections based on product analysis`);

  // Stage 5: SEO optimization (if not free tier)
  let seoMetadata;
  let schemaMarkup;
  let sitemapEntries;
  
  if (userPlan !== 'free') {
    console.log('Stage 5: Generating SEO metadata and schema markup...');
    if (sessionId) {
      progressTracker.emitProgress(sessionId, {
        stage: 5,
        stageName: 'SEO Optimization',
        description: 'Generating SEO metadata and schema markup',
        progress: 50,
      });
    }

    try {
      console.log('🔍 Generating SEO metadata...');
      seoMetadata = await seoService.generateSEOMetadata(
        siteStructure.productName,
        url,
        extractedContent.map(c => c.content).join(' ').substring(0, 5000),
        {
          stackOverflow: externalResearch.stackoverflow_answers?.length || 0,
          github: externalResearch.github_issues?.length || 0,
          youtube: externalResearch.youtube_videos?.length || 0,
          reddit: externalResearch.reddit_posts?.length || 0,
          devTo: externalResearch.devto_articles?.length || 0,
          codeProject: externalResearch.codeproject_articles?.length || 0,
          stackExchange: externalResearch.stackexchange_questions?.length || 0,
          quora: externalResearch.quora_answers?.length || 0,
          forums: externalResearch.forum_posts?.length || 0
        }
      );

      console.log('📋 Generating schema markup...');
      const sections = [
        { name: 'Getting Started', content: 'Setup and installation guide' },
        { name: 'API Reference', content: 'API endpoints and methods' },
        { name: 'Tutorials', content: 'Step-by-step tutorials' },
        { name: 'FAQ', content: 'Frequently asked questions' }
      ];
      
      schemaMarkup = await schemaService.generateSchemaMarkup(
        siteStructure.productName,
        sections,
        externalResearch.youtube_videos || [],
        url
      );

      console.log('🗺️ Generating sitemap entries...');
      sitemapEntries = sitemapService.generateDocumentationEntries(url, sections.map(s => ({
        name: s.name,
        slug: s.name.toLowerCase().replace(/\s+/g, '-'),
        lastModified: new Date()
      })));

      console.log('✅ SEO optimization complete');
    } catch (error) {
      console.error('SEO generation error:', error);
      // Continue without SEO if it fails
    }
  }

  // Stage 6: Enhanced documentation writing with source attribution
  console.log('Stage 6: Writing documentation with source attribution...');
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 6,
      stageName: 'Documentation Writing',
      description: 'Creating professional documentation with sources',
      progress: 85,
    });
  }
  const stage2Response = await aiProvider.generateCompletion(
    [
        {
          role: 'system',
          content: `Write professional Apple-style documentation with the suggested sections. Each section has content blocks (paragraph, heading, list, code, callout, table). 

CRITICAL: For every technical solution, code example, or troubleshooting tip, include SOURCE ATTRIBUTION in markdown format:
- "Source: [Stack Overflow](url)" for SO answers
- "Source: [GitHub Issue #123](url)" for GitHub
- "Source: [Official Docs](url)" for documentation
- Add sources at the end of each solution/example

Example:
**Solution**: Increase retry delay to 5 seconds...
\`\`\`javascript
// Retry logic
\`\`\`
*Source: [Stack Overflow #123456](url), [GitHub #789](url)*

Return JSON: {title, description, sections: [{id, title, icon, content, sources?: [{title, url, type}]}]}.`
        },
        {
          role: 'user',
          content: `Create comprehensive documentation from this structure using suggested sections: ${JSON.stringify(suggestedSections.sections || [], null, 2)}.

Use the extracted data: ${JSON.stringify(extractedStructure, null, 2).substring(0, 3000)}

REQUIREMENTS:
- Include setup guide with prerequisites
- Feature detailed guides with examples
- Tutorials with step-by-step instructions
- Troubleshooting with ${limits.so}+ issues AND their sources
- FAQ with ${Math.max(10, limits.so * 2)}+ Q&A
- Best practices from community insights
- API reference with code examples
- Add clickable source links for ALL technical content

Return valid JSON with source attribution embedded in content.`
        }
      ],
    { jsonMode: true, timeoutMs: 90000 }
  );

  console.log(`✅ Stage 2 response received (${stage2Response.provider}), validating documentation...`);
  const writtenDocs = validateWrittenDocs(stage2Response.content);

  // Integrate images into sections
  console.log('📸 Composing images into documentation...');
  let enhancedSections = writtenDocs.sections || [];
  const allImages: ImageMetadata[] = [];
  
  // Collect all images from extracted content
  for (const page of extractedContent) {
    if (page.images && Array.isArray(page.images)) {
      for (const img of page.images) {
        allImages.push({
          url: img.src,
          alt: img.alt || '',
          sourceUrl: page.url,
          caption: img.caption,
          width: img.width,
          height: img.height,
          importance: img.importance,
          hash: img.hash,
          isValid: true
        });
      }
    }
  }
  
  console.log(`Found ${allImages.length} total images from ${extractedContent.length} pages`);
  
  if (allImages.length > 0) {
    try {
      // Enhance images with AI-generated captions for those without alt text
      const enhancedImages = await enhanceImagesWithCaptions(allImages);
      
      // Convert sections to DocumentSection format
      const documentSections: DocumentSection[] = enhancedSections.map((section: any, index: number) => ({
        id: section.id || `section-${index}`,
        title: section.title || '',
        content: section.content?.map((block: any) => block.text || '').join(' ') || '',
        blocks: section.content || [],
        headingLevel: 2
      }));
      
      // Compose images into documentation
      const compositionResult = composeImagesIntoDocumentation(
        documentSections,
        enhancedImages as EnhancedImage[]
      );
      
      // Update sections with composed images
      enhancedSections = compositionResult.sections.map(section => ({
        id: section.id,
        title: section.title,
        icon: enhancedSections.find((s: any) => s.id === section.id)?.icon || 'BookOpen',
        content: section.blocks || []
      }));
      
      console.log(`✅ Image composition complete: ${compositionResult.stats.placedImages}/${compositionResult.stats.totalImages} images placed`);
    } catch (error) {
      console.error('Image composition failed:', error);
      // Continue without images rather than failing
    }
  }

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

  console.log(`✅ Stage 3 response received (${stage3Response.provider}), validating metadata...`);
  const finalMetadata = validateMetadata(stage3Response.content);

  // Extract theme from the original site
  const theme = extractThemeFromContent(comprehensiveData.site_content.pages);

  // Final comprehensive documentation
  const finalDoc = {
    title: finalMetadata.metadata?.title || writtenDocs.title || 'Comprehensive Documentation',
    description: finalMetadata.metadata?.description || writtenDocs.description || '',
    sections: enhancedSections,
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
      images: allImages.length
    }
  };
  
  console.log(`✅ Final doc assembled: ${finalDoc.sections.length} sections, title: ${finalDoc.title}`);
  
  // Calculate quality score for generated documentation with fallback
  console.log('📊 Calculating documentation quality score...');
  let qualityScore;
  try {
    qualityScore = await qualityScoringService.scoreGeneratedDocs({
      sections: finalDoc.sections.map((s: any) => ({
        name: s.title || '',
        content: JSON.stringify(s.content || ''),
        codeBlocks: Array.isArray(s.content) ? s.content.filter((block: any) => block.type === 'code') : []
      })),
      images: allImages,
      metadata: finalDoc.metadata
    });
    
    console.log(`✨ Documentation Quality Score: ${qualityScore.overall}/100`);
    console.log(`   - Code Examples: ${qualityScore.breakdown.codeExamples}/100`);
    console.log(`   - Readability: ${qualityScore.breakdown.readability}/100`);
    console.log(`   - Completeness: ${qualityScore.breakdown.completeness}/100`);
    console.log(`   - Troubleshooting: ${qualityScore.breakdown.troubleshooting}/100`);
    console.log(`   - Visual Aids: ${qualityScore.breakdown.visualAids}/100`);
    console.log(`   - SEO: ${qualityScore.breakdown.seo}/100`);
    
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `📊 Documentation Quality Score: ${qualityScore.overall}/100`,
        type: 'success',
        data: {
          qualityScore: qualityScore.overall,
          qualityBreakdown: qualityScore.breakdown
        }
      }, 6, 'Documentation Writing');
      
      if (qualityScore.overall >= 90) {
        progressTracker.emitActivity(sessionId, {
          message: `🏆 Excellent quality! ${qualityScore.strengths.join(', ')}`,
          type: 'success'
        }, 6, 'Documentation Writing');
      } else if (qualityScore.overall >= 70) {
        progressTracker.emitActivity(sessionId, {
          message: `✅ Good quality! Top strength: ${qualityScore.strengths[0] || 'Well-structured'}`,
          type: 'success'
        }, 6, 'Documentation Writing');
      }
    }
  } catch (scoringError: any) {
    console.error('⚠️ Quality scoring failed, using default score:', scoringError.message);
    // Fallback: Export with default quality score
    qualityScore = {
      overall: 70,
      breakdown: {
        codeExamples: 60,
        readability: 75,
        completeness: 70,
        troubleshooting: 65,
        visualAids: 60,
        seo: 70
      },
      strengths: ['Comprehensive research', 'Multi-source synthesis'],
      improvements: ['Quality scoring unavailable'],
      recommendations: []
    };
    
    if (sessionId) {
      progressTracker.emitActivity(sessionId, {
        message: `⚠️ Quality scoring failed - documentation exported with default score (70/100)`,
        type: 'warning'
      }, 6, 'Documentation Writing');
    }
  }
  
  pipelineMonitor.updateStage(pmId, 6, { status: 'completed', progress: 100 });

  // Save to database
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 6,
      stageName: 'Finalizing',
      description: 'Saving documentation and preparing export',
      progress: 95,
    });
  }
  
  // Return documentation data (will be saved in transaction by caller)
  if (sessionId) {
    progressTracker.emitProgress(sessionId, {
      stage: 7,
      stageName: 'Complete',
      description: 'Documentation generated successfully!',
      progress: 100,
    });
  }
  pipelineMonitor.completePipeline(pmId);

  // Return data to be saved in transaction
  return { 
    documentationData: {
      url,
      title: finalDoc.title,
      content: JSON.stringify(finalDoc),
      user_id: userId,
    },
    finalDoc,
    seoMetadata,
    schemaMarkup,
    sitemapEntries
  };
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
