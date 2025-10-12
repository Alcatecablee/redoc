# AI Knowledge Base Generator – Prompt Templates

# Overview

These prompts power an AI-driven knowledge base generator that scrapes website content and transforms it into professional help center documentation.

---

## Prompt 1: Deep Site Discovery & Content Mapping

### Purpose

Discover all relevant pages, perform external research, and create a comprehensive content map.

### Template

> **System Context**: You are an expert web researcher and documentation architect. Your goal is to create comprehensive, enterprise-grade documentation by exploring multiple sources and performing thorough research.
> 

> 
> 

> **Task**: Analyze the provided website URL, discover all relevant documentation pages, perform external research, and create a complete content map.
> 

> 
> 

> **Phase 1: Site Discovery & Crawling**
> 

> 
> 

> **Initial URL**: [INSERT_URL]
> 

> 
> 

> **Instructions**:
> 

> 1. **Analyze the homepage** to understand the product/service
> 

> 2. **Identify key documentation sections** from the navigation menu, footer, and site structure:
> 

> - `/docs` or `/documentation`
> 

> - `/help` or `/support` or `/help-center`
> 

> - `/blog` or `/articles` (for use cases, tutorials, announcements)
> 

> - `/api` or `/api-docs` or `/developers`
> 

> - `/guides` or `/tutorials` or `/getting-started`
> 

> - `/faq` or `/questions`
> 

> - `/changelog` or `/updates` or `/releases`
> 

> - `/resources` or `/learn`
> 

> - `/community` or `/forum`
> 

> 3. **Extract all internal links** from the homepage that lead to documentation-related content
> 

> 4. **Build a sitemap** of pages to visit for comprehensive content extraction
> 

> 
> 

> **Phase 2: Multi-Page Content Extraction**
> 

> 
> 

> **Instructions**:
> 

> For each discovered page, extract:
> 

> - Page title and URL
> 

> - Main content sections
> 

> - Code examples, API endpoints, configuration options
> 

> - Screenshots, diagrams, videos
> 

> - Related links and cross-references
> 

> - Common workflows or step-by-step guides
> 

> 
> 

> **Phase 3: External Research (Google Search)**
> 

> 
> 

> **Search Queries to Execute**:
> 

> 1. `"[PRODUCT_NAME] documentation"`
> 

> 2. `"[PRODUCT_NAME] getting started tutorial"`
> 

> 3. `"[PRODUCT_NAME] common issues"`
> 

> 4. `"[PRODUCT_NAME] troubleshooting"`
> 

> 5. `"[PRODUCT_NAME] best practices"`
> 

> 6. `"[PRODUCT_NAME] vs alternatives"` (to understand unique features)
> 

> 7. `"[PRODUCT_NAME] integration guide"`
> 

> 8. `"[PRODUCT_NAME] API examples"`
> 

> 9. `"how to use [PRODUCT_NAME]"`
> 

> 10. `"[PRODUCT_NAME] problems" OR "[PRODUCT_NAME] not working"`
> 

> 
> 

> **Extract from search results**:
> 

> - Stack Overflow questions and answers
> 

> - GitHub issues and discussions
> 

> - Reddit threads
> 

> - Third-party tutorials and guides
> 

> - YouTube video transcripts (if available)
> 

> - Official blog posts and announcements
> 

> 
> 

> **Phase 4: Comprehensive Analysis**
> 

> 
> 

> **Instructions**:
> 

> 1. **Classify the site type** (SaaS, e-commerce, blog, portfolio, documentation, etc.)
> 

> 2. **Identify navigation hierarchy** from all discovered pages
> 

> 3. **Extract visual elements** (screenshots, diagrams, CTAs, demo videos) across all pages
> 

> 4. **Map content sections** to standard documentation categories
> 

> 5. **Detect technical content** (code snippets, API references, configuration examples) from all sources
> 

> 6. **Compile common problems** from external research (Stack Overflow, GitHub, forums)
> 

> 7. **Identify best practices** mentioned across multiple sources
> 

> 8. **Extract real-world use cases** from blogs, case studies, and community discussions
> 

> 
> 

> **Output Format** (JSON):
> 

> `json
> 

> {
> 

> "site_classification": {
> 

> "type": "SaaS|e-commerce|blog|documentation|portfolio|other",
> 

> "primary_purpose": "Brief description",
> 

> "target_audience": "Who this is for"
> 

> },
> 

> "navigation_hierarchy": [
> 

> {
> 

> "section": "Section name",
> 

> "subsections": ["Subsection 1", "Subsection 2"]
> 

> }
> 

> ],
> 

> "visual_elements": [
> 

> {
> 

> "type": "screenshot|diagram|video|cta",
> 

> "location": "Where found",
> 

> "description": "What it shows",
> 

> "importance": "high|medium|low"
> 

> }
> 

> ],
> 

> "content_structure": {
> 

> "overview": "High-level product/service description",
> 

> "features": [
> 

> {
> 

> "name": "Feature name",
> 

> "description": "What it does",
> 

> "benefits": ["Benefit 1", "Benefit 2"]
> 

> }
> 

> ],
> 

> "how_it_works": [
> 

> {
> 

> "step": 1,
> 

> "title": "Step title",
> 

> "description": "Detailed explanation",
> 

> "visual_reference": "Screenshot/diagram if applicable"
> 

> }
> 

> ],
> 

> "technical_content": [
> 

> {
> 

> "type": "code|api|config|integration",
> 

> "language": "javascript|python|etc",
> 

> "content": "The actual code/config",
> 

> "context": "When/why to use this"
> 

> }
> 

> ],
> 

> "use_cases": [
> 

> {
> 

> "title": "Use case title",
> 

> "description": "Scenario description",
> 

> "solution": "How the product solves it"
> 

> }
> 

> ],
> 

> "troubleshooting": [
> 

> {
> 

> "issue": "Common problem",
> 

> "symptoms": ["Symptom 1", "Symptom 2"],
> 

> "solution": "Step-by-step fix",
> 

> "prevention": "How to avoid this"
> 

> }
> 

> ],
> 

> "faq": [
> 

> {
> 

> "question": "Frequently asked question",
> 

> "answer": "Clear, concise answer",
> 

> "category": "general|technical|billing|account"
> 

> }
> 

> ],
> 

> "prerequisites": [
> 

> "Requirement 1",
> 

> "Requirement 2"
> 

> ],
> 

> "terminology": [
> 

> {
> 

> "term": "Technical term",
> 

> "definition": "Clear explanation",
> 

> "example": "Usage example"
> 

> }
> 

> ]
> 

> },
> 

> "missing_sections": ["List sections that should exist but weren't found"],
> 

> "confidence_score": 0.85,
> 

> "extraction_notes": "Any challenges or assumptions made during extraction"
> 

> }
> 

> `
> 

> 
> 

> **Fallback Rules**:
> 

> - If a section is missing, return an empty array `[]` with a note in `missing_sections`
> 

> - If site type is unclear, classify as "other" with best-guess description
> 

> - Default to extracting at least overview, features, and FAQ from any site
> 

---

## Prompt 2: Professional Documentation Writing

### Purpose

Transform the extracted structure into polished, user-friendly documentation.

### Template

> **System Context**: You are a professional technical writer with expertise in creating Apple-style documentation—clear, elegant, and accessible to all users.
> 

> 
> 

> **Task**: Transform the extracted content structure into professional help center documentation.
> 

> 
> 

> **Source Data**: [OUTPUT_FROM_PROMPT_1]
> 

> 
> 

> **Writing Guidelines**:
> 

> 
> 

> **Tone & Style**:
> 

> - Write in Apple/Stripe style: clear, concise, elegant, confident
> 

> - Use active voice and present tense
> 

> - Avoid jargon unless defined in terminology section
> 

> - Write for a reading level of Grade 8-10 (accessible to all)
> 

> - Be conversational but professional
> 

> 
> 

> **Structure Requirements**:
> 

> 1. **Progressive disclosure**: Start with quick-start/overview, then details
> 

> 2. **Scannable format**: Use headings, bullets, numbered lists, and visual breaks
> 

> 3. **Cross-references**: Link related topics (e.g., "Learn more about [Feature X]")
> 

> 4. **Action-oriented**: Lead with what users can do, not what the product has
> 

> 
> 

> **Content Sections to Generate**:
> 

> 
> 

> ### 1. Getting Started (Quick Start)
> 

> - 3-5 steps to first success
> 

> - Assume zero prior knowledge
> 

> - Include expected outcome
> 

> 
> 

> ### 2. Core Features (Detailed Guides)
> 

> - One section per major feature
> 

> - Include: What it is, Why use it, How to use it, Tips & best practices
> 

> - Add "Common mistakes" or "What to avoid" where relevant
> 

> 
> 

> ### 3. How It Works (Conceptual)
> 

> - Explain the underlying process/flow
> 

> - Use analogies for complex concepts
> 

> - Reference visual elements from Prompt 1 output
> 

> 
> 

> ### 4. Use Cases & Examples
> 

> - Real-world scenarios
> 

> - Show before/after or problem/solution
> 

> - Include industry-specific examples if applicable
> 

> 
> 

> ### 5. Technical Reference (if applicable)
> 

> - API documentation
> 

> - Configuration options
> 

> - Code examples with comments
> 

> - Use proper syntax highlighting markers: `language
> 

> 
> 

> ### 6. Troubleshooting
> 

> - Format as: Problem → Cause → Solution
> 

> - Include "Still stuck? Contact support" fallback
> 

> - Add prevention tips
> 

> 
> 

> ### 7. FAQ
> 

> - Group by category (General, Technical, Billing, etc.)
> 

> - Lead with most common questions
> 

> - Keep answers under 100 words
> 

> 
> 

> ### 8. Glossary (if terminology exists)
> 

> - Alphabetical list
> 

> - Plain-language definitions
> 

> - Link terms when first mentioned in docs
> 

> 
> 

> **Formatting Standards**:
> 

> - Use `## Heading 2` for main sections
> 

> - Use `### Heading 3` for subsections
> 

> - Use `#### Heading 4` for detailed breakdowns
> 

> - Bold **important actions** or **key concepts**
> 

> - Use `inline code` for technical terms, file names, UI elements
> 

> - Use blockquotes `>` for tips, warnings, or notes
> 

> - Number lists for sequential steps, bullet lists for unordered items
> 

> 
> 

> **SEO Optimization**:
> 

> - Include target keywords naturally in first 100 words
> 

> - Use descriptive headings that match user search intent
> 

> - Add alt text descriptions for referenced images
> 

> 
> 

> **Output Format**: Full Markdown documentation organized by section
> 

---

## Prompt 3: Metadata Generation & Export Formatting

### Purpose

Package the documentation with professional metadata for deployment.

### Template

> **System Context**: You are a documentation engineer preparing content for production deployment in a professional help center.
> 

> 
> 

> **Task**: Generate comprehensive metadata and format the documentation for export.
> 

> 
> 

> **Source Data**: [OUTPUT_FROM_PROMPT_2]
> 

> 
> 

> **Output Format** (JSON):
> 

> `json
> 

> {
> 

> "metadata": {
> 

> "title": "Primary document title (SEO-optimized)",
> 

> "description": "150-160 character meta description for search engines",
> 

> "keywords": ["keyword1", "keyword2", "keyword3"],
> 

> "version": "1.0.0",
> 

> "last_updated": "2025-10-12T03:42:26Z",
> 

> "author": "Generated by [Your App Name]",
> 

> "language": "en",
> 

> "readability_score": {
> 

> "flesch_reading_ease": 65,
> 

> "grade_level": "8-9",
> 

> "interpretation": "Easy to read for general audience"
> 

> },
> 

> "estimated_read_time": "8 minutes",
> 

> "site_source": "[https://example.com](https://example.com)",
> 

> "generated_at": "2025-10-12T03:42:26Z"
> 

> },
> 

> "searchability": {
> 

> "primary_tags": ["getting-started", "features", "api"],
> 

> "synonyms": {
> 

> "setup": ["install", "configure", "initialize"],
> 

> "troubleshoot": ["debug", "fix", "resolve", "error"]
> 

> },
> 

> "search_keywords": ["All important terms for search indexing"]
> 

> },
> 

> "structure": {
> 

> "sections": [
> 

> {
> 

> "id": "getting-started",
> 

> "title": "Getting Started",
> 

> "slug": "getting-started",
> 

> "order": 1,
> 

> "subsections": [
> 

> {
> 

> "id": "quick-start",
> 

> "title": "Quick Start Guide",
> 

> "slug": "quick-start",
> 

> "order": 1
> 

> }
> 

> ]
> 

> },
> 

> {
> 

> "id": "features",
> 

> "title": "Features",
> 

> "slug": "features",
> 

> "order": 2,
> 

> "subsections": []
> 

> }
> 

> ],
> 

> "cross_references": [
> 

> {
> 

> "from": "getting-started",
> 

> "to": "features",
> 

> "type": "see-also"
> 

> }
> 

> ]
> 

> },
> 

> "analytics": {
> 

> "predicted_popular_sections": ["getting-started", "troubleshooting", "faq"],
> 

> "priority_order": ["Quick start", "Common issues", "Core features"],
> 

> "content_gaps": ["Missing: Video tutorials", "Missing: Integration examples"]
> 

> },
> 

> "export_formats": {
> 

> "markdown": "Full markdown content",
> 

> "html": "<div>Formatted HTML with proper semantic tags</div>",
> 

> "json": "Structured JSON for API consumption",
> 

> "notion": "Notion-flavored markdown for import"
> 

> },
> 

> "changelog": [
> 

> {
> 

> "version": "1.0.0",
> 

> "date": "2025-10-12",
> 

> "changes": ["Initial documentation generated"],
> 

> "sections_modified": ["all"]
> 

> }
> 

> ],
> 

> "validation": {
> 

> "broken_links": [],
> 

> "missing_prerequisites": [],
> 

> "unclear_instructions": [],
> 

> "accessibility_score": 95,
> 

> "status": "ready_for_deployment"
> 

> }
> 

> }
> 

> `
> 

> 
> 

> **Quality Checks**:
> 

> 1. Verify all cross-references point to existing sections
> 

> 2. Ensure code blocks have language identifiers
> 

> 3. Check that technical terms are defined before use
> 

> 4. Validate readability score is 60+ (Flesch Reading Ease)
> 

> 5. Confirm all sections have proper heading hierarchy
> 

> 6. Check for broken or placeholder content
> 

> 
> 

> **Export Specifications**:
> 

> - **Markdown**: Preserve all formatting, include frontmatter with metadata
> 

> - **HTML**: Use semantic tags (`<article>`, `<section>`, `<code>`), add classes for styling
> 

> - **JSON**: Flatten for API consumption, include separate content + metadata objects
> 

> - **Notion**: Convert to Notion-flavored markdown with proper block syntax
> 

---

## Prompt 4: Validation & Refinement (Optional)

### Purpose

Perform quality checks and refine based on user feedback.

### Template

> **System Context**: You are a quality assurance specialist for technical documentation.
> 

> 
> 

> **Task**: Review the generated documentation and apply refinements based on feedback.
> 

> 
> 

> **Documentation to Review**: [OUTPUT_FROM_PROMPTS_1-3]
> 

> 
> 

> **User Feedback** (if provided): [USER_FEEDBACK]
> 

> 
> 

> **Validation Checklist**:
> 

> 
> 

> ✓ **Logical Flow**
> 

> - Does each section flow naturally to the next?
> 

> - Are prerequisites mentioned before they're needed?
> 

> - Do steps follow a logical sequence?
> 

> 
> 

> ✓ **Clarity**
> 

> - Can a beginner understand without external help?
> 

> - Are there undefined jargon terms?
> 

> - Are instructions specific and actionable?
> 

> 
> 

> ✓ **Completeness**
> 

> - Are all promises/features mentioned actually documented?
> 

> - Do troubleshooting sections address common issues?
> 

> - Are edge cases covered?
> 

> 
> 

> ✓ **Consistency**
> 

> - Is terminology used consistently throughout?
> 

> - Is formatting uniform (headings, code blocks, lists)?
> 

> - Is tone consistent across sections?
> 

> 
> 

> ✓ **Accessibility**
> 

> - Is there alt text for images?
> 

> - Are links descriptive (not "click here")?
> 

> - Is contrast sufficient in code examples?
> 

> 
> 

> **Refinement Options** (apply based on feedback):
> 

> - "Make more formal" → Increase business tone, reduce contractions
> 

> - "Make more casual" → Add conversational elements, use "you" more
> 

> - "Add more examples" → Insert 2-3 real-world scenarios per section
> 

> - "Simplify language" → Lower grade level, define all technical terms
> 

> - "Add technical depth" → Include architecture diagrams, API specs
> 

> - "Shorten" → Remove redundancy, combine similar sections
> 

> - "Expand" → Add detail, more step-by-step breakdowns
> 

> 
> 

> **Output**: Updated documentation with changes highlighted + summary of improvements made
> 

---

## Implementation Tips

### Prompt Chaining Strategy

1. **Run Prompt 1** → Parse JSON output
2. **Feed to Prompt 2** → Generate markdown docs
3. **Feed to Prompt 3** → Create final export package
4. **Optional: Run Prompt 4** → Refine based on user feedback

### API Integration

```jsx
const response1 = await ai.complete(prompt1, { url: userUrl });
const structure = JSON.parse(response1);

const response2 = await ai.complete(prompt2, { structure });
const docs = response2;

const response3 = await ai.complete(prompt3, { docs });
const finalPackage = JSON.parse(response3);
```

### Error Handling

- If JSON parsing fails → Retry with "Ensure valid JSON output"
- If content is thin → Re-scrape with different selectors
- If validation fails → Apply Prompt 4 automatically

---

## Deep Research Implementation Architecture

### Overview

To create comprehensive documentation like Microsoft or X, you need a multi-stage research pipeline that goes beyond single-page scraping.

### Implementation Flow

```
User Input URL
    ↓
[Stage 1] Site Discovery & Crawling
    → Scrape homepage
    → Extract all internal links
    → Identify documentation sections
    → Build crawl queue
    ↓
[Stage 2] Multi-Page Scraping
    → Visit each discovered page
    → Extract content, code, images
    → Store in structured format
    ↓
[Stage 3] External Research
    → Google search for common issues
    → Scrape Stack Overflow, GitHub
    → Extract community insights
    ↓
[Stage 4] Content Synthesis
    → Combine all sources
    → Feed to AI for documentation generation
    ↓
[Stage 5] Generate Final Docs
```

---

### Stage 1: Site Discovery & Crawling

### Implementation

```jsx
import axios from 'axios';
import * as cheerio from 'cheerio';

async function discoverSiteStructure(baseUrl) {
  const homepage = await axios.get(baseUrl);
  const $ = cheerio.load([homepage.data](http://homepage.data));
  
  // Extract product name
  const productName = $('title').text().split('|')[0].trim();
  
  // Common documentation paths to check
  const docPaths = [
    '/docs', '/documentation', '/help', '/support', 
    '/help-center', '/blog', '/articles', '/api', 
    '/api-docs', '/developers', '/guides', '/tutorials',
    '/getting-started', '/faq', '/questions', '/changelog',
    '/updates', '/releases', '/resources', '/learn',
    '/community', '/forum'
  ];
  
  // Find valid documentation URLs
  const validUrls = [];
  for (const path of docPaths) {
    try {
      const testUrl = new URL(path, baseUrl).href;
      const response = await axios.head(testUrl, { timeout: 5000 });
      if (response.status === 200) {
        validUrls.push(testUrl);
      }
    } catch (error) {
      // Path doesn't exist, skip
    }
  }
  
  // Extract links from navigation menu
  const navLinks = [];
  $('nav a, header a, .menu a, .navigation a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (
      href.includes('doc') || 
      href.includes('help') || 
      href.includes('support') ||
      href.includes('guide') ||
      href.includes('tutorial')
    )) {
      navLinks.push(new URL(href, baseUrl).href);
    }
  });
  
  // Extract all internal links from homepage
  const allLinks = [];
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
  
  return {
    productName,
    baseUrl,
    validDocPaths: validUrls,
    navLinks: [...new Set(navLinks)],
    allInternalLinks: [...new Set(allLinks)].slice(0, 50) // Limit to 50
  };
}
```

---

### Stage 2: Multi-Page Content Extraction

### Implementation

```jsx
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async function extractMultiPageContent(urls) {
  const extracted = [];
  
  for (const url of urls) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const dom = new JSDOM([response.data](http://response.data), { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      const $ = cheerio.load([response.data](http://response.data));
      
      // Extract code blocks
      const codeBlocks = [];
      $('pre code, pre, .code-block').each((i, el) => {
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
        if (src && !src.includes('logo') && !src.includes('icon')) {
          images.push({ 
            src: new URL(src, url).href, 
            alt: alt || 'Screenshot' 
          });
        }
      });
      
      // Extract headings for structure
      const headings = [];
      $('h1, h2, h3').each((i, el) => {
        headings.push({
          level: el.tagName.toLowerCase(),
          text: $(el).text().trim()
        });
      });
      
      extracted.push({
        url,
        title: article?.title || $('title').text(),
        content: article?.textContent || $('body').text(),
        excerpt: article?.excerpt || '',
        codeBlocks,
        images,
        headings,
        wordCount: article?.textContent?.split(/\s+/).length || 0
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to extract from ${url}:`, error.message);
    }
  }
  
  return extracted;
}
```

---

### Stage 3: External Research (Google Search)

### Implementation

```jsx
// Option 1: Using SerpAPI (paid but reliable)
import { getJson } from 'serpapi';

async function performExternalResearch(productName) {
  const queries = [
    `"${productName}" documentation`,
    `"${productName}" getting started tutorial`,
    `"${productName}" common issues`,
    `"${productName}" troubleshooting`,
    `"${productName}" best practices`,
    `"${productName}" vs alternatives`,
    `"${productName}" integration guide`,
    `"${productName}" API examples`,
    `how to use "${productName}"`,
    `"${productName}" problems OR "${productName}" not working`
  ];
  
  const allResults = [];
  
  for (const query of queries) {
    try {
      const results = await getJson({
        engine: "google",
        q: query,
        api_key: process.env.SERPAPI_KEY,
        num: 10
      });
      
      allResults.push({
        query,
        results: [results.organic](http://results.organic)_results || []
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Search failed for "${query}":`, error.message);
    }
  }
  
  return allResults;
}

// Option 2: Using Brave Search API (cheaper alternative)
async function searchBrave(productName) {
  const queries = [
    `${productName} documentation`,
    `${productName} common issues site:[stackoverflow.com](http://stackoverflow.com)`,
    `${productName} site:[github.com](http://github.com) issues`,
    `${productName} tutorial`,
    `${productName} troubleshooting`
  ];
  
  const results = [];
  
  for (const query of queries) {
    const response = await axios.get('[https://api.search.brave.com/res/v1/web/search](https://api.search.brave.com/res/v1/web/search)', {
      params: { q: query, count: 10 },
      headers: { 
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY
      }
    });
    
    results.push({
      query,
      results: [response.data](http://response.data).web?.results || []
    });
  }
  
  return results;
}
```

---

### Stage 4: Extract Community Insights

### Scrape Stack Overflow

```jsx
async function scrapeStackOverflow(productName) {
  const searchUrl = `[https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(productName)}&site=stackoverflow&key=${process.env.STACKOVERFLOW_KEY}`](https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(productName)}&site=stackoverflow&key=${process.env.STACKOVERFLOW_KEY}`);
  
  const response = await axios.get(searchUrl);
  const questions = [response.data](http://response.data).items || [];
  
  const insights = [];
  
  for (const q of questions.slice(0, 20)) {
    const answersUrl = `[https://api.stackexchange.com/2.3/questions/${q.question_id}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody&key=${process.env.STACKOVERFLOW_KEY}`](https://api.stackexchange.com/2.3/questions/${q.question_id}/answers?order=desc&sort=votes&site=stackoverflow&filter=withbody&key=${process.env.STACKOVERFLOW_KEY}`);
    const answersResponse = await axios.get(answersUrl);
    
    insights.push({
      title: q.title,
      question: q.body,
      tags: q.tags,
      views: q.view_count,
      score: q.score,
      answers: [answersResponse.data.items.map](http://answersResponse.data.items.map)(a => ({
        body: a.body,
        score: a.score,
        accepted: [a.is](http://a.is)_accepted
      }))
    });
  }
  
  return insights;
}
```

### Scrape GitHub Issues

```jsx
import { Octokit } from '@octokit/rest';

async function scrapeGitHubIssues(productName) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  // Search for repositories
  const repoSearch = await [octokit.search](http://octokit.search).repos({
    q: productName,
    sort: 'stars',
    per_page: 5
  });
  
  const issues = [];
  
  for (const repo of [repoSearch.data](http://repoSearch.data).items) {
    const issuesResponse = await octokit.issues.listForRepo({
      owner: repo.owner.login,
      repo: [repo.name](http://repo.name),
      state: 'all',
      sort: 'comments',
      per_page: 30,
      labels: 'bug,question,help wanted,documentation'
    });
    
    for (const issue of [issuesResponse.data](http://issuesResponse.data)) {
      if (issue.pull_request) continue; // Skip PRs
      
      const comments = await octokit.issues.listComments({
        owner: repo.owner.login,
        repo: [repo.name](http://repo.name),
        issue_number: issue.number
      });
      
      issues.push({
        title: issue.title,
        body: issue.body,
        state: issue.state,
        labels: [issue.labels.map](http://issue.labels.map)(l => [l.name](http://l.name)),
        comments: [comments.data.map](http://comments.data.map)(c => c.body),
        reactions: issue.reactions
      });
    }
  }
  
  return issues;
}
```

---

### Stage 5: Content Synthesis & AI Processing

### Complete Pipeline

```jsx
async function generateComprehensiveDocs(userUrl) {
  console.log('Stage 1: Discovering site structure...');
  const siteStructure = await discoverSiteStructure(userUrl);
  
  console.log('Stage 2: Extracting multi-page content...');
  const urlsToScrape = [
    ...siteStructure.validDocPaths,
    ...siteStructure.navLinks
  ].slice(0, 30); // Limit to 30 pages
  
  const extractedContent = await extractMultiPageContent(urlsToScrape);
  
  console.log('Stage 3: Performing external research...');
  const searchResults = await searchBrave(siteStructure.productName);
  
  console.log('Stage 4: Gathering community insights...');
  const [stackOverflow, gitHubIssues] = await Promise.all([
    scrapeStackOverflow(siteStructure.productName),
    scrapeGitHubIssues(siteStructure.productName)
  ]);
  
  console.log('Stage 5: Synthesizing content...');
  const comprehensiveData = {
    product_name: siteStructure.productName,
    base_url: userUrl,
    site_content: {
      pages_scraped: extractedContent.length,
      total_words: extractedContent.reduce((sum, p) => sum + p.wordCount, 0),
      pages: extractedContent,
      code_examples: extractedContent.flatMap(p => p.codeBlocks),
      images: extractedContent.flatMap(p => p.images)
    },
    external_research: {
      search_results: searchResults,
      total_sources: searchResults.reduce((sum, r) => sum + r.results.length, 0)
    },
    community_insights: {
      stackoverflow: {
        questions_analyzed: stackOverflow.length,
        common_issues: stackOverflow.filter(q => q.score > 5),
        top_questions: stackOverflow.slice(0, 10)
      },
      github: {
        issues_analyzed: gitHubIssues.length,
        open_bugs: gitHubIssues.filter(i => i.state === 'open' && i.labels.includes('bug')),
        common_problems: gitHubIssues.filter(i => i.reactions['+1'] > 5)
      }
    }
  };
  
  // Feed to AI with enhanced prompt
  const prompt = createEnhancedPrompt1(comprehensiveData);
  const aiResponse = await callAI(prompt);
  
  return aiResponse;
}

function createEnhancedPrompt1(data) {
  return `
You are creating comprehensive documentation for ${data.product_name}.

SOURCES ANALYZED:
- ${[data.site](http://data.site)_content.pages_scraped} official pages (${[data.site](http://data.site)_[content.total](http://content.total)_words.toLocaleString()} words)
- ${data.external_[research.total](http://research.total)_sources} external resources
- ${[data.community](http://data.community)_insights.stackoverflow.questions_analyzed} Stack Overflow discussions
- ${[data.community](http://data.community)_insights.github.issues_analyzed} GitHub issues

EXTRACTED CONTENT:
${JSON.stringify([data.site](http://data.site)_content.pages, null, 2)}

COMMON ISSUES FROM STACKOVERFLOW:
${JSON.stringify([data.community](http://data.community)_[insights.stackoverflow.top](http://insights.stackoverflow.top)_questions.slice(0, 5), null, 2)}

GITHUB PROBLEMS:
${JSON.stringify([data.community](http://data.community)_insights.github.common_problems.slice(0, 5), null, 2)}

TASK: Create comprehensive documentation that includes:
1. All features found across official pages
2. Common problems and solutions from Stack Overflow
3. Known bugs and workarounds from GitHub
4. Best practices mentioned in external resources
5. Step-by-step tutorials combining all sources

Output in the JSON format specified in Prompt 1.
`;
}
```

---

### Full API Integration Example

```jsx
// main.js - Complete implementation
import express from 'express';

const app = express();

[app.post](http://app.post)('/generate-docs', async (req, res) => {
  const { url } = req.body;
  
  try {
    // Stage 1-4: Deep research
    const comprehensiveData = await generateComprehensiveDocs(url);
    
    // Stage 5: AI processing (Prompt 1)
    const structure = await callAI('prompt1', comprehensiveData);
    
    // Prompt 2: Write docs
    const documentation = await callAI('prompt2', structure);
    
    // Prompt 3: Generate metadata & exports
    const finalPackage = await callAI('prompt3', documentation);
    
    res.json({
      success: true,
      data: finalPackage,
      stats: {
        pages_analyzed: [comprehensiveData.site](http://comprehensiveData.site)_content.pages_scraped,
        external_sources: comprehensiveData.external_[research.total](http://research.total)_sources,
        community_insights: {
          stackoverflow: [comprehensiveData.community](http://comprehensiveData.community)_insights.stackoverflow.questions_analyzed,
          github: [comprehensiveData.community](http://comprehensiveData.community)_insights.github.issues_analyzed
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Documentation generator running on port 3000');
});
```

---

### Error Handling & Rate Limiting

```jsx
// Rate limiter to avoid being blocked
import pLimit from 'p-limit';

const limit = pLimit(3); // Max 3 concurrent requests

async function scrapeWithRateLimit(urls) {
  return Promise.all(
    [urls.map](http://urls.map)(url => limit(() => extractSinglePage(url)))
  );
}

// Retry logic for failed requests
import pRetry from 'p-retry';

async function fetchWithRetry(url) {
  return pRetry(
    async () => {
      const response = await axios.get(url, { timeout: 10000 });
      if (response.status !== 200) {
        throw new Error(`Status ${response.status}`);
      }
      return response;
    },
    {
      retries: 3,
      onFailedAttempt: error => {
        console.log(`Attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}`);
      }
    }
  );
}

// Caching to avoid re-scraping
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

async function getCachedOrScrape(url) {
  const cached = cache.get(url);
  if (cached) return cached;
  
  const content = await extractSinglePage(url);
  cache.set(url, content);
  return content;
}
```

---

### Performance Optimization

**Parallel Processing**:

```jsx
async function optimizedPipeline(url) {
  const siteStructure = await discoverSiteStructure(url);
  
  // Run scraping and research in parallel
  const [extractedContent, searchResults, stackOverflow, gitHubIssues] = 
    await Promise.all([
      extractMultiPageContent(siteStructure.validDocPaths),
      searchBrave(siteStructure.productName),
      scrapeStackOverflow(siteStructure.productName),
      scrapeGitHubIssues(siteStructure.productName)
    ]);
  
  return { extractedContent, searchResults, stackOverflow, gitHubIssues };
}
```

**Background Jobs** (for large sites):

```jsx
import Queue from 'bull';

const docQueue = new Queue('documentation-generation');

docQueue.process(async (job) => {
  const { url } = [job.data](http://job.data);
  
  job.progress(10);
  const siteStructure = await discoverSiteStructure(url);
  
  job.progress(30);
  const content = await extractMultiPageContent(siteStructure.validDocPaths);
  
  job.progress(60);
  const research = await performExternalResearch(siteStructure.productName);
  
  job.progress(90);
  const docs = await generateDocs(content, research);
  
  job.progress(100);
  return docs;
});

// Client submits job and gets job ID
[app.post](http://app.post)('/generate-docs-async', async (req, res) => {
  const job = await docQueue.add({ url: req.body.url });
  res.json({ job_id: [job.id](http://job.id) });
});

// Client polls for progress
app.get('/job/:id', async (req, res) => {
  const job = await docQueue.getJob([req.params.id](http://req.params.id));
  const state = await job.getState();
  const progress = job.progress();
  
  res.json({ state, progress, result: await job.finished() });
});
```

---

### Cost & API Requirements

| Service | Purpose | Cost | Alternative |
| --- | --- | --- | --- |
| **SerpAPI** | Google search | $50/month (5000 searches) | Brave Search API ($5/month) |
| **Stack Overflow API** | Community Q&A | Free (10,000 requests/day) | - |
| **GitHub API** | Issues/discussions | Free (5,000 requests/hour) | - |
| **OpenAI/Anthropic** | AI processing | ~$0.50-2 per doc | Open-source LLM (Llama, Mistral) |
| **Proxy Service** | Avoid blocking | $10-30/month | Rotating user agents + delays |

**Total monthly cost for 1000 docs**: ~$100-150

---

### Recommended Tech Stack

```json
{
  "scraping": ["axios", "cheerio", "puppeteer", "@mozilla/readability"],
  "search": ["serpapi", "brave-search-api"],
  "apis": ["@octokit/rest", "axios"],
  "ai": ["openai", "anthropic", "@huggingface/inference"],
  "queue": ["bull", "redis"],
  "cache": ["node-cache", "redis"],
  "rate_limiting": ["p-limit", "p-retry", "bottleneck"],
  "parsing": ["jsdom", "turndown", "html-to-text"]
}
```

---

**Next Steps**: Test these prompts with diverse websites (SaaS, e-commerce, docs sites) and iterate based on output quality.

---

## Export Formats & Theme System

### Supported Formats

PDF, DOCX, HTML, Markdown, JSON (all with customizable themes applied)

### Theme Architecture

### Theme Configuration Structure

```json
{
  "theme": {
    "name": "Modern Light",
    "id": "modern-light",
    "colors": {
      "primary": "#2563eb",
      "secondary": "#64748b",
      "accent": "#0ea5e9",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#0f172a",
      "text_secondary": "#475569",
      "border": "#e2e8f0",
      "code_bg": "#f1f5f9",
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444"
    },
    "typography": {
      "font_family": "Inter, -apple-system, system-ui, sans-serif",
      "heading_font": "Inter, -apple-system, system-ui, sans-serif",
      "code_font": "Fira Code, Monaco, Consolas, monospace",
      "base_size": "16px",
      "line_height": "1.6",
      "heading_weights": {
        "h1": 700,
        "h2": 600,
        "h3": 600
      }
    },
    "spacing": {
      "section": "3rem",
      "paragraph": "1.5rem",
      "list_item": "0.5rem"
    },
    "styling": {
      "border_radius": "8px",
      "code_border_radius": "6px",
      "shadow": "0 1px 3px rgba(0,0,0,0.1)"
    }
  }
}
```

### Implementation by Format

### 1. **Markdown Export**

**Approach**: Extended frontmatter + standard markdown

```jsx
function exportMarkdown(content, theme) {
  const frontmatter = `---
title: ${content.metadata.title}
theme: ${[theme.id](http://theme.id)}
colors:
  primary: ${theme.colors.primary}
  accent: ${theme.colors.accent}
generated: ${content.metadata.generated_at}
---

`;
  
  return frontmatter + content.markdown;
}
```

**Libraries**:

- `gray-matter` (frontmatter parsing)
- `remark` (markdown processing)

**Theme Application**: Store theme in frontmatter for later HTML/PDF conversion

---

### 2. **HTML Export**

**Approach**: Semantic HTML with embedded CSS

```jsx
function exportHTML(content, theme) {
  const css = generateCSS(theme);
  
  return `<!DOCTYPE html>
<html lang="${content.metadata.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.metadata.title}</title>
  <style>${css}</style>
</head>
<body>
  <article class="documentation">
    ${marked.parse(content.markdown)}
  </article>
</body>
</html>`;
}

function generateCSS(theme) {
  return `
    :root {
      --color-primary: ${theme.colors.primary};
      --color-text: ${theme.colors.text};
      --font-family: ${theme.typography.font_family};
      /* ... all theme variables */
    }
    
    body {
      font-family: var(--font-family);
      color: var(--color-text);
      line-height: ${theme.typography.line_height};
      background: ${theme.colors.background};
    }
    
    /* Component styles using CSS variables */
  `;
}
```

**Libraries**:

- `marked` or `markdown-it` (markdown → HTML)
- `prismjs` or `highlight.js` (code highlighting)
- `tailwindcss` or custom CSS (styling)

**Theme Application**: CSS variables for easy theme switching

---

### 3. **PDF Export**

**Approach**: HTML → PDF with proper page breaks and styling

```jsx
import puppeteer from 'puppeteer';

async function exportPDF(content, theme) {
  const html = exportHTML(content, theme); // Reuse HTML generator
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'A4',
    margin: {
      top: '2cm',
      right: '2cm',
      bottom: '2cm',
      left: '2cm'
    },
    printBackground: true, // Apply theme colors
    preferCSSPageSize: true
  });
  
  await browser.close();
  return pdf;
}
```

**Alternative Libraries**:

- `puppeteer` or `playwright` (recommended - best CSS support)
- `pdfkit` (programmatic PDF creation)
- `html-pdf-node` (simpler but less control)
- `@react-pdf/renderer` (if using React)

**Theme Application**: Full CSS support via HTML rendering

**PDF-Specific CSS**:

```css
@media print {
  h1, h2, h3 { page-break-after: avoid; }
  pre, code { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
}
```

---

### 4. **DOCX Export**

**Approach**: Convert markdown to DOCX with theme-based styling

```jsx
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

function exportDOCX(content, theme) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: theme.typography.font_family.split(',')[0],
            size: parseInt(theme.typography.base_size) * 2, // Half-points
            color: theme.colors.text.replace('#', '')
          }
        },
        heading1: {
          run: {
            color: theme.colors.primary.replace('#', ''),
            bold: true,
            size: 32
          }
        }
        // ... more styles
      }
    },
    sections: [{
      properties: {},
      children: parseMarkdownToDOCX(content.markdown, theme)
    }]
  });
  
  return Packer.toBuffer(doc);
}
```

**Libraries**:

- `docx` (create DOCX files)
- `mammoth` (convert existing DOCX)
- `pandoc` (universal document converter via CLI)

**Theme Application**: Map theme to DOCX styles (fonts, colors, spacing)

**Limitations**: DOCX has limited styling compared to HTML/PDF

---

### 5. **JSON Export**

**Approach**: Structured data with embedded theme metadata

```jsx
function exportJSON(content, theme) {
  return JSON.stringify({
    version: "1.0",
    generated_at: new Date().toISOString(),
    theme: {
      id: [theme.id](http://theme.id),
      name: [theme.name](http://theme.name),
      colors: theme.colors,
      typography: theme.typography
    },
    metadata: content.metadata,
    content: {
      raw_markdown: content.markdown,
      structured: parseMarkdownToAST(content.markdown),
      sections: content.structure.sections
    },
    searchability: content.searchability,
    analytics: [content.analytics](http://content.analytics)
  }, null, 2);
}
```

**Libraries**:

- `unified` + `remark-parse` (markdown AST)
- `mdast-util-to-hast` (convert to HTML AST)

**Theme Application**: Include full theme object for client-side rendering

---

### Theme Presets

Create a library of professional themes:

```jsx
const themes = {
  "apple-light": {
    name: "Apple Light",
    colors: { primary: "#007aff", background: "#ffffff", ... }
  },
  "github-dark": {
    name: "GitHub Dark",
    colors: { primary: "#58a6ff", background: "#0d1117", ... }
  },
  "stripe-modern": {
    name: "Stripe Modern",
    colors: { primary: "#635bff", background: "#ffffff", ... }
  },
  "notion-default": {
    name: "Notion Default",
    colors: { primary: "#2383e2", background: "#ffffff", ... }
  }
};
```

---

### Feature Suggestions

### **1. Live Preview with Theme Switching**

Allow users to preview docs in different themes before exporting:

```jsx
<ThemeSwitcher themes={themes} onChange={setActiveTheme} />
<DocumentPreview content={docs} theme={activeTheme} />
```

### **2. Custom Theme Builder**

Let users create custom themes via UI:

- Color picker for each semantic color
- Font selector (Google Fonts integration)
- Spacing/sizing controls
- Real-time preview

### **3. Theme Import/Export**

Users can save and share custom themes:

```jsx
// Export theme
downloadTheme(customTheme, 'my-company-theme.json');

// Import theme
const imported = await uploadTheme('my-company-theme.json');
```

### **4. Brand Kit Integration**

Extract brand colors from uploaded logo:

```jsx
import ColorThief from 'colorthief';

async function generateThemeFromLogo(logoUrl) {
  const palette = await ColorThief.getPalette(logoUrl, 5);
  return createThemeFromPalette(palette);
}
```

### **5. Accessibility Checker**

Validate theme contrast ratios (WCAG AA/AAA):

```jsx
import { calculateContrast } from 'wcag-contrast';

function validateTheme(theme) {
  const ratio = calculateContrast(theme.colors.text, theme.colors.background);
  return {
    passes_aa: ratio >= 4.5,
    passes_aaa: ratio >= 7,
    ratio
  };
}
```

### **6. Batch Export**

Export all sections in all formats at once:

```jsx
async function batchExport(content, theme) {
  return {
    '[docs.md](http://docs.md)': await exportMarkdown(content, theme),
    'docs.html': await exportHTML(content, theme),
    'docs.pdf': await exportPDF(content, theme),
    'docs.docx': await exportDOCX(content, theme),
    'docs.json': await exportJSON(content, theme)
  };
}
```

---

### Architecture Recommendation

```
/src
  /exporters
    /markdown
      - exporter.ts
      - template.ts
    /html
      - exporter.ts
      - template.ts
      - styles.ts
    /pdf
      - exporter.ts
      - page-config.ts
    /docx
      - exporter.ts
      - styles.ts
    /json
      - exporter.ts
      - schema.ts
  /themes
    - presets.ts
    - validator.ts
    - generator.ts
  /core
    - theme-engine.ts (applies theme to all formats)
    - export-manager.ts (orchestrates exports)
```

---

### Performance Tips

1. **Cache HTML generation**: Reuse for both HTML and PDF exports
2. **Lazy load exporters**: Only import needed format on demand
3. **Web Workers**: Generate exports in background thread
4. **Streaming**: Stream large PDFs instead of loading into memory
5. **CDN fonts**: Reference fonts via CDN in HTML/PDF to reduce file size

---

### Monetization Ideas

**Free Tier**:

- 3 theme presets
- Markdown + HTML export
- Basic customization

**Pro Tier**:

- All theme presets
- PDF + DOCX export
- Custom theme builder
- Batch export
- Brand kit extraction

**Enterprise**:

- White-label themes
- API access
- Custom fonts
- Priority rendering
- Bulk operations