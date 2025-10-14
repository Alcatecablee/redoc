import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { storage } from './storage';
import { searchService, SearchResult, StackOverflowAnswer, GitHubIssue } from './search-service';

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
    const homepage = await fetch(baseUrl);
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
    return {
      productName: 'Unknown Product',
      baseUrl,
      validDocPaths: [],
      navLinks: [],
      allInternalLinks: [],
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

// Enhanced JSON parsing with retry
export async function parseJSONWithRetry(apiKey: string, content: string, retryPrompt: string, maxRetries = 2): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;

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

    for (let i = 0; i < maxRetries; i++) {
      try {
        const retryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.' },
              { role: 'user', content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}` }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          }),
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const fixedContent = retryData.choices?.[0]?.message?.content || '{}';
          return JSON.parse(fixedContent);
        }
      } catch (retryError) {
        lastError = retryError as Error;
        console.log(`Retry ${i + 1} failed:`, retryError);
      }
    }

    throw lastError || new Error('Failed to parse JSON after retries');
  }
}

// Enhanced documentation generation pipeline
export async function generateEnhancedDocumentation(url: string, userId: string | null) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  console.log('Stage 1: Discovering site structure...');
  const siteStructure = await discoverSiteStructure(url);
  
  console.log('Stage 2: Extracting multi-page content...');
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
  const externalResearch = await performExternalResearch(siteStructure.productName, url);
  
  console.log('Stage 4: Synthesizing comprehensive data...');
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

  // Stage 1: Enhanced structure extraction with comprehensive data
  const stage1Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { 
          role: 'system', 
          content: `You are an expert web researcher and documentation architect. Your goal is to create comprehensive, enterprise-grade documentation by exploring multiple sources and performing thorough research.

TASK: Analyze the provided comprehensive data from multiple sources and create a complete content map.

PHASE 1: SITE DISCOVERY & CRAWLING
- Analyze all discovered pages and their content
- Identify key documentation sections from navigation, footer, and site structure
- Include subdomains (docs., help., support., developer., dev., community., forum., status., api., blog.) and sitemap-derived pages
- Extract technical content, code examples, visual elements, and workflows

PHASE 2: MULTI-PAGE CONTENT EXTRACTION
- Process content from all scraped pages (target at least 15 unique pages)
- Extract code examples, API endpoints, configuration options
- Identify screenshots, diagrams, and related resources

PHASE 3: EXTERNAL RESEARCH
- Analyze search results for common issues and solutions
- Extract best practices and troubleshooting information
- Identify community insights and real-world use cases
- Require per-item source URLs for citation

PHASE 4: COMPREHENSIVE ANALYSIS
- Classify the site type and target audience
- Map content sections to standard documentation categories
- Compile common problems and solutions from all sources
- Extract real-world use cases and best practices
- Provide coverage stats and explicit gaps

Return ONLY valid JSON in the specified structure. The JSON MUST include fields: explored_urls, source_citations, coverage, gaps.`
        },
        { 
          role: 'user', 
          content: `COMPREHENSIVE DATA ANALYSIS:

PRODUCT: ${comprehensiveData.product_name}
BASE URL: ${comprehensiveData.base_url}

SITE CONTENT:
- Pages analyzed: ${comprehensiveData.site_content.pages_scraped}
- Total words: ${comprehensiveData.site_content.total_words.toLocaleString()}
- Code examples found: ${comprehensiveData.site_content.code_examples.length}
- Images found: ${comprehensiveData.site_content.images.length}

DETAILED PAGE CONTENT:
${JSON.stringify(comprehensiveData.site_content.pages, null, 2)}

EXTERNAL RESEARCH:
- Search results: ${comprehensiveData.external_research.search_results.length}
- Stack Overflow answers: ${comprehensiveData.external_research.stackoverflow_answers.length}
- GitHub issues: ${comprehensiveData.external_research.github_issues.length}
- Total external sources: ${comprehensiveData.external_research.total_sources}
- Research quality score: ${(comprehensiveData.external_research.quality_score * 100).toFixed(1)}%

SEARCH RESULTS:
${JSON.stringify(comprehensiveData.external_research.search_results.slice(0, 20), null, 2)}

STACK OVERFLOW ANSWERS (Common Issues & Solutions):
${JSON.stringify(comprehensiveData.external_research.stackoverflow_answers, null, 2)}

GITHUB ISSUES (Known Problems & Discussions):
${JSON.stringify(comprehensiveData.external_research.github_issues, null, 2)}

TASK: Create comprehensive documentation structure that includes:
1. All features found across official pages
2. Common problems and solutions from external research
3. Best practices and troubleshooting information
4. Step-by-step tutorials combining all sources
5. Real-world use cases and examples

Additionally, return:
- explored_urls: list of URLs considered with origin (nav|sitemap|subdomain|internal)
- source_citations: map of section ids to arrays of URLs
- coverage: { pages_analyzed, min_pages_target: 15, external_sources, min_external_sources_target: 15, sections_detected }
- gaps: list of missing or thin sections

Output in the JSON format specified in the system prompt.`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage1Resp.ok) {
    const text = await stage1Resp.text();
    throw new Error('Enhanced structure extraction failed: ' + (stage1Resp.statusText || text));
  }

  const stage1Data = await stage1Resp.json();
  const extractedStructure = await parseJSONWithRetry(
    GROQ_API_KEY, 
    stage1Data.choices?.[0]?.message?.content || '{}', 
    'Ensure the output is valid JSON matching the comprehensive structure extraction format'
  );

  // Stage 2: Enhanced documentation writing
  const stage2Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { 
          role: 'system', 
          content: `You are a professional technical writer with expertise in creating Apple-style documentation—clear, elegant, and accessible to all users.

TASK: Transform the extracted content structure into professional help center documentation.

WRITING GUIDELINES:
- Write in Apple/Stripe style: clear, concise, elegant, confident
- Use active voice and present tense
- Write for a reading level of Grade 8-10 (accessible to all)
- Be conversational but professional

STRUCTURE REQUIREMENTS:
1. Progressive disclosure: Start with quick-start/overview, then details
2. Scannable format: Use headings, bullets, numbered lists, and visual breaks
3. Cross-references: Link related topics
4. Action-oriented: Lead with what users can do, not what the product has

CONTENT SECTIONS TO GENERATE:
1. Getting Started (Quick Start) - 3-5 steps to first success
2. Core Features (Detailed Guides) - One section per major feature
3. How It Works (Conceptual) - Explain underlying process/flow
4. Use Cases & Examples - Real-world scenarios
5. Technical Reference (if applicable) - API docs, code examples
6. Troubleshooting - Problem → Cause → Solution format
7. FAQ - Group by category, lead with most common questions
8. Glossary (if terminology exists) - Alphabetical list with definitions

For each section and content block, include an optional "citations" array of URLs supporting the content.

Return structured JSON with comprehensive documentation.`
        },
        { 
          role: 'user', 
          content: `Source Data (Enhanced Structure): ${JSON.stringify(extractedStructure)}` 
        }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage2Resp.ok) {
    const text = await stage2Resp.text();
    throw new Error('Enhanced documentation writing failed: ' + (stage2Resp.statusText || text));
  }

  const stage2Data = await stage2Resp.json();
  const writtenDocs = await parseJSONWithRetry(
    GROQ_API_KEY, 
    stage2Data.choices?.[0]?.message?.content || '{}', 
    'Ensure the output is valid JSON with proper comprehensive documentation structure'
  );

  // Stage 3: Enhanced metadata generation
  const stage3Resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { 
          role: 'system', 
          content: `You are a documentation engineer preparing content for production deployment in a professional help center.

TASK: Generate comprehensive metadata and format the documentation for export.

OUTPUT FORMAT (JSON):
{
  "metadata": {
    "title": "Primary document title (SEO-optimized)",
    "description": "150-160 character meta description",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "version": "1.0.0",
    "last_updated": "ISO timestamp",
    "author": "Generated by AI Knowledge Base Generator",
    "language": "en",
    "readability_score": {
      "flesch_reading_ease": 65,
      "grade_level": "8-9",
      "interpretation": "Easy to read for general audience"
    },
    "estimated_read_time": "X minutes",
    "site_source": "source URL",
    "generated_at": "ISO timestamp"
  },
  "searchability": {
    "primary_tags": ["getting-started", "features", "api"],
    "synonyms": {
      "setup": ["install", "configure", "initialize"],
      "troubleshoot": ["debug", "fix", "resolve", "error"]
    },
    "search_keywords": ["All important terms for search indexing"]
  },
  "structure": {
    "sections": [/* section structure */],
    "cross_references": [/* cross-reference links */]
  },
  "analytics": {
    "predicted_popular_sections": ["getting-started", "troubleshooting", "faq"],
    "priority_order": ["Quick start", "Common issues", "Core features"],
    "content_gaps": ["Missing sections identified"]
  },
  "validation": {
    "broken_links": [],
    "missing_prerequisites": [],
    "unclear_instructions": [],
    "accessibility_score": 95,
    "status": "ready_for_deployment"
  }
}

Return ONLY valid JSON.`
        },
        { 
          role: 'user', 
          content: `Documentation to enhance: ${JSON.stringify(writtenDocs)}

Source URL: ${url}
Pages analyzed: ${comprehensiveData.site_content.pages_scraped}
External sources: ${comprehensiveData.external_research.total_sources}`
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!stage3Resp.ok) {
    const text = await stage3Resp.text();
    throw new Error('Enhanced metadata generation failed: ' + (stage3Resp.statusText || text));
  }

  const stage3Data = await stage3Resp.json();
  const finalMetadata = await parseJSONWithRetry(
    GROQ_API_KEY, 
    stage3Data.choices?.[0]?.message?.content || '{}', 
    'Ensure the output is valid JSON with metadata and searchability fields'
  );

  // Extract theme from the original site
  const theme = extractThemeFromContent(comprehensiveData.site_content.pages);

  // Final comprehensive documentation
  const finalDoc = {
    title: finalMetadata.metadata?.title || writtenDocs.title || 'Comprehensive Documentation',
    description: finalMetadata.metadata?.description || writtenDocs.description || '',
    sections: finalMetadata.enhanced_sections && finalMetadata.enhanced_sections.length > 0 ? 
              finalMetadata.enhanced_sections : writtenDocs.sections || [],
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

  // Save to database
  const documentation = await storage.createDocumentation({
    url,
    title: finalDoc.title,
    content: JSON.stringify(finalDoc),
    user_id: userId,
  });

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