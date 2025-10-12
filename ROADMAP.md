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
> 
>
> **Task**: Analyze the provided website URL, discover all relevant documentation pages, perform external research, and create a complete content map.
> 
>
> 
> 
>
> **Phase 1: Site Discovery & Crawling**
> 
>
> 
> 
>
> **Initial URL**: [INSERT_URL]
> 
>
> 
> 
>
> **Instructions**:
> 
>
> 1. **Analyze the homepage** to understand the product/service
> 
>
> 2. **Identify key documentation sections** from the navigation menu, footer, and site structure:
> 
>
> - `/docs` or `/documentation`
> 
>
> - `/help` or `/support` or `/help-center`
> 
>
> - `/blog` or `/articles` (for use cases, tutorials, announcements)
> 
>
> - `/api` or `/api-docs` or `/developers`
> 
>
> - `/guides` or `/tutorials` or `/getting-started`
> 
>
> - `/faq` or `/questions`
> 
>
> - `/changelog` or `/updates` or `/releases`
> 
>
> - `/resources` or `/learn`
> 
>
> - `/community` or `/forum`
> 
>
> 3. **Extract all internal links** from the homepage that lead to documentation-related content
> 
>
> 4. **Build a sitemap** of pages to visit for comprehensive content extraction
> 
>
> 
> 
> **Phase 2: Multi-Page Content Extraction**
> 
>
> 
> 
>
> **Instructions**:
> 
>
> For each discovered page, extract:
> 
>
> - Page title and URL
> 
>
> - Main content sections
> 
>
> - Code examples, API endpoints, configuration options
> 
>
> - Screenshots, diagrams, videos
> 
>
> - Related links and cross-references
> 
>
> - Common workflows or step-by-step guides
> 
>
> 
> 
> **Phase 3: External Research (Google Search)**
> 
>
> 
> 
>
> **Search Queries to Execute**:
> 
>
> 1. `"[PRODUCT_NAME] documentation"`
> 
>
> 2. `"[PRODUCT_NAME] getting started tutorial"`
> 
>
> 3. `"[PRODUCT_NAME] common issues"`
> 
>
> 4. `"[PRODUCT_NAME] troubleshooting"`
> 
>
> 5. `"[PRODUCT_NAME] best practices"`
> 
>
> 6. `"[PRODUCT_NAME] vs alternatives"` (to understand unique features)
> 
>
> 7. `"[PRODUCT_NAME] integration guide"`
> 
>
> 8. `"[PRODUCT_NAME] API examples"`
> 
>
> 9. `"how to use [PRODUCT_NAME]"`
> 
>
> 10. `"[PRODUCT_NAME] problems" OR "[PRODUCT_NAME] not working"`
> 
>
> 
> 
> **Extract from search results**:
> 
>
> - Stack Overflow questions and answers
> 
>
> - GitHub issues and discussions
> 
>
> - Reddit threads
> 
>
> - Third-party tutorials and guides
> 
>
> - YouTube video transcripts (if available)
> 
>
> - Official blog posts and announcements
> 
>
> 
> 
> **Phase 4: Comprehensive Analysis**
> 
>
> 
> 
>
> **Instructions**:
> 
>
> 1. **Classify the site type** (SaaS, e-commerce, blog, portfolio, documentation, etc.)
> 
>
> 2. **Identify navigation hierarchy** from all discovered pages
> 
>
> 3. **Extract visual elements** (screenshots, diagrams, CTAs, demo videos) across all pages
> 
>
> 4. **Map content sections** to standard documentation categories
> 
>
> 5. **Detect technical content** (code snippets, API references, configuration examples) from all sources
> 
>
> 6. **Compile common problems** from external research (Stack Overflow, GitHub, forums)
> 
>
> 7. **Identify best practices** mentioned across multiple sources
> 
>
> 8. **Extract real-world use cases** from blogs, case studies, and community discussions
> 
>
> 
> 
> **Output Format** (JSON):
> 
>
> `json
> 
>
> {
> 
>
> "site_classification": {
> 
>
> "type": "SaaS|e-commerce|blog|documentation|portfolio|other",
> 
>
> "primary_purpose": "Brief description",
> 
>
> "target_audience": "Who this is for"
> 
>
> },
> 
>
> "navigation_hierarchy": [
> 
>
> {
> 
>
> "section": "Section name",
> 
>
> "subsections": ["Subsection 1", "Subsection 2"]
> 
>
> }
> 
>
> ],
> 
>
> "visual_elements": [
> 
>
> {
> 
>
> "type": "screenshot|diagram|video|cta",
> 
>
> "location": "Where found",
> 
>
> "description": "What it shows",
> 
>
> "importance": "high|medium|low"
> 
>
> }
> 
>
> ],
> 
>
> "content_structure": {
> 
>
> "overview": "High-level product/service description",
> 
>
> "features": [
> 
>
> {
> 
>
> "name": "Feature name",
> 
>
> "description": "What it does",
> 
>
> "benefits": ["Benefit 1", "Benefit 2"]
> 
>
> }
> 
>
> ],
> 
>
> "how_it_works": [
> 
>
> {
> 
>
> "step": 1,
> 
>
> "title": "Step title",
> 
>
> "description": "Detailed explanation",
> 
>
> "visual_reference": "Screenshot/diagram if applicable"
> 
>
> }
> 
>
> ],
> 
>
> "technical_content": [
> 
>
> {
> 
>
> "type": "code|api|config|integration",
> 
>
> "language": "javascript|python|etc",
> 
>
> "content": "The actual code/config",
> 
>
> "context": "When/why to use this"
> 
>
> }
> 
>
> ],
> 
>
> "use_cases": [
> 
>
> {
> 
>
> "title": "Use case title",
> 
>
> "description": "Scenario description",
> 
>
> "solution": "How the product solves it"
> 
>
> }
> 
>
> ],
> 
>
> "troubleshooting": [
> 
>
> {
> 
>
> "issue": "Common problem",
> 
>
> "symptoms": ["Symptom 1", "Symptom 2"],
> 
>
> "solution": "Step-by-step fix",
> 
>
> "prevention": "How to avoid this"
> 
>
> }
> 
>
> ],
> 
>
> "faq": [
> 
>
> {
> 
>
> "question": "Frequently asked question",
> 
>
> "answer": "Clear, concise answer",
> 
>
> "category": "general|technical|billing|account"
> 
>
> }
> 
>
> ],
> 
>
> "prerequisites": [
> 
>
> "Requirement 1",
> 
>
> "Requirement 2"
> 
>
> ],
> 
>
> "terminology": [
> 
>
> {
> 
>
> "term": "Technical term",
> 
>
> "definition": "Clear explanation",
> 
>
> "example": "Usage example"
> 
>
> }
> 
>
> ]
> 
>
> },
> 
>
> "missing_sections": ["List sections that should exist but weren't found"],
> 
>
> "confidence_score": 0.85,
> 
>
> "extraction_notes": "Any challenges or assumptions made during extraction"
> 
>
> }
> 
>
> `
> 
>
> 
> 
> **Fallback Rules**:
> 
>
> - If a section is missing, return an empty array `[]` with a note in `missing_sections`
> 
>
> - If site type is unclear, classify as "other" with best-guess description
> 
>
> - Default to extracting at least overview, features, and FAQ from any site
> 
>
> ---
> 
> ## Prompt 2: Professional Documentation Writing
> 
> ### Purpose
> 
> Transform the extracted structure into polished, user-friendly documentation.
> 
> ### Template
> 
> > **System Context**: You are a professional technical writer with expertise in creating Apple-style documentation—clear, elegant, and accessible to all users.
> > 
> 
> 
> > 
> 
> > **Task**: Transform the extracted content structure into professional help center documentation.
> > 
> 
> 
> > 
> 
> > **Source Data**: [OUTPUT_FROM_PROMPT_1]
> > 
> 
> 
> > 
> 
> > **Writing Guidelines**:
> > 
> 
> 
> > 
> 
> > **Tone & Style**:
> > 
> 
> 
> > - Write in Apple/Stripe style: clear, concise, elegant, confident
> > 
> 
> > - Use active voice and present tense
> > 
> 
> > - Avoid jargon unless defined in terminology section
> > 
> 
> > - Write for a reading level of Grade 8-10 (accessible to all)
> > 
> 
> > - Be conversational but professional
> > 
> 
> 
> > 
> 
> > **Structure Requirements**:
> > 
> 
> 
> > 1. **Progressive disclosure**: Start with quick-start/overview, then details
> > 
> 
> > 2. **Scannable format**: Use headings, bullets, numbered lists, and visual breaks
> > 
> 
> > 3. **Cross-references**: Link related topics (e.g., "Learn more about [Feature X]")
> > 
> 
> > 4. **Action-oriented**: Lead with what users can do, not what the product has
> > 
> 
> 
> > 
> 
> > **Content Sections to Generate**:
> > 
> 
> 
> > 
> 
> > ### 1. Getting Started (Quick Start)
> > 
> 
> > - 3-5 steps to first success
> > 
> 
> > - Assume zero prior knowledge
> > 
> 
> > - Include expected outcome
> > 
> 
> 
> > 
> 
> > ### 2. Core Features (Detailed Guides)
> > 
> 
> > - One section per major feature
> > 
> 
> > - Include: What it is, Why use it, How to use it, Tips & best practices
> > 
> 
> > - Add "Common mistakes" or "What to avoid" where relevant
> > 
> 
> 
> > 
> 
> > ### 3. How It Works (Conceptual)
> > 
> 
> > - Explain the underlying process/flow
> > 
> 
> > - Use analogies for complex concepts
> > 
> 
> > - Reference visual elements from Prompt 1 output
> > 
> 
> 
> > 
> 
> > ### 4. Use Cases & Examples
> > 
> 
> > - Real-world scenarios
> > 
> 
> > - Show before/after or problem/solution
> > 
> 
> > - Include industry-specific examples if applicable
> > 
> 
> 
> > 
> 
> > ### 5. Technical Reference (if applicable)
> > 
> 
> > - API documentation
> > 
> 
> > - Configuration options
> > 
> 
> > - Code examples with comments
> > 
> 
> > - Use proper syntax highlighting markers: `language
> > 
> > 
> > 
> > ### 6. Troubleshooting
> > 
> 
> > - Format as: Problem → Cause → Solution
> > 
> 
> > - Include "Still stuck? Contact support" fallback
> > 
> 
> > - Add prevention tips
> > 
> 
> 
> > 
> 
> > ### 7. FAQ
> > 
> 
> > - Group by category (General, Technical, Billing, etc.)
> > 
> 
> > - Lead with most common questions
> > 
> 
> > - Keep answers under 100 words
> > 
> 
> 
> > 
> 
> > ### 8. Glossary (if terminology exists)
> > 
> 
> > - Alphabetical list
> > 
> 
> > - Plain-language definitions
> > 
> 
> > - Link terms when first mentioned in docs
> > 
> 
> 
> > 
> 
> > **Formatting Standards**:
> > 
> 
> > - Use `## Heading 2` for main sections
> > 
> 
> > - Use `### Heading 3` for subsections
> > 
> 
> > - Use `#### Heading 4` for detailed breakdowns
> > 
> 
> > - Bold **important actions** or **key concepts**
> > 
> 
> > - Use `inline code` for technical terms, file names, UI elements
> > 
> 
> > - Use blockquotes `>` for tips, warnings, or notes
> > 
> 
> > - Number lists for sequential steps, bullet lists for unordered items
> > 
> 
> > 
> 
> > **SEO Optimization**:
> > 
> 
> > - Include target keywords naturally in first 100 words
> > 
> 
> > - Use descriptive headings that match user search intent
> > 
> 
> > - Add alt text descriptions for referenced images
> > 
> 
> > 
> 
> > **Output Format**: Full Markdown documentation organized by section
> > 
> > 
> > ---
> > 
> > ## Prompt 3: Metadata Generation & Export Formatting
> > 
> > ### Purpose
> > 
> > Package the documentation with professional metadata for deployment.
> > 
> > ### Template
> > 
> > > **System Context**: You are a documentation engineer preparing content for production deployment in a professional help center.
> > > 
> > 
> > 
> > > 
> > 
> > > **Task**: Generate comprehensive metadata and format the documentation for export.
> > > 
> > 
> > 
> > > 
> > 
> > > **Source Data**: [OUTPUT_FROM_PROMPT_2]
> > > 
> > 
> > 
> > > 
> > 
> > > **Output Format** (JSON):
> > > 
> > 
> > > `json
> > > 
> > 
> > > {
> > > 
> > 
> > > "metadata": {
> > > 
> > 
> > > "title": "Primary document title (SEO-optimized)",
> > > 
> > 
> > > "description": "150-160 character meta description for search engines",
> > > 
> > 
> > > "keywords": ["keyword1", "keyword2", "keyword3"],
> > > 
> > 
> > > "version": "1.0.0",
> > > 
> > 
> > > "last_updated": "2025-10-12T03:42:26Z",
> > > 
> > 
> > > "author": "Generated by [Your App Name]",
> > > 
> > 
> > > "language": "en",
> > > 
> > 
> > > "readability_score": {
> > > 
> > 
> > > "flesch_reading_ease": 65,
> > > 
> > 
> > > "grade_level": "8-9",
> > > 
> > 
> > > "interpretation": "Easy to read for general audience"
> > > 
> > > 
> > > },
> > > 
> > 
> > > "estimated_read_time": "8 minutes",
> > > 
> > 
> > > "site_source": "[https://example.com](https://example.com)",
> > > 
> > 
> > > "generated_at": "2025-10-12T03:42:26Z"
> > > 
> > 
> > > },
> > > 
> > 
> > > "searchability": {
> > > 
> > 
> > > "primary_tags": ["getting-started", "features", "api"],
> > > 
> > 
> > > "synonyms": {
> > > 
> > 
> > > "setup": ["install", "configure", "initialize"],
> > > 
> > 
> > > "troubleshoot": ["debug", "fix", "resolve", "error"]
> > > 
> > 
> > > },
> > > 
> > 
> > > "search_keywords": ["All important terms for search indexing"]
> > > 
> > 
> > > },
> > > 
> > 
> > > "structure": {
> > > 
> > 
> > > "sections": [
> > > 
> > 
> > > {
> > > 
> > 
> > > "id": "getting-started",
> > > 
> > 
> > > "title": "Getting Started",
> > > 
> > 
> > > "slug": "getting-started",
> > > 
> > 
> > > "order": 1,
> > > 
> > 
> > > "subsections": [
> > > 
> > 
> > > {
> > > 
> > 
> > > "id": "quick-start",
> > > 
> > 
> > > "title": "Quick Start Guide",
> > > 
> > 
> > > "slug": "quick-start",
> > > 
> > 
> > > "order": 1
> > > 
> > 
> > > }
> > > 
> > 
> > > ],
> > > 
> > 
> > > },
> > > 
> > 
> > > {
> > > 
> > 
> > > "id": "features",
> > > 
> > 
> > > "title": "Features",
> > > 
> > 
> > > "slug": "features",
> > > 
> > 
> > > "order": 2,
> > > 
> > 
> > > "subsections": []
> > > 
> > 
> > > }
> > > 
> > 
> > > ],
> > > 
> > 
> > > "cross_references": [
> > > 
> > 
> > > {
> > > 
> > 
> > > "from": "getting-started",
> > > 
> > 
> > > "to": "features",
> > > 
> > 
> > > "type": "see-also"
> > > 
> > 
> > > }
> > > 
> > 
> > > ]
> > > 
> > 
> > > },
> > > 
> > 
> > > "analytics": {
> > > 
> > 
> > > "predicted_popular_sections": ["getting-started", "troubleshooting", "faq"],
> > > 
> > 
> > > "priority_order": ["Quick start", "Common issues", "Core features"],
> > > 
> > 
> > > "content_gaps": ["Missing: Video tutorials", "Missing: Integration examples"]
> > > 
> > 
> > > },
> > > 
> > 
> > > "export_formats": {
> > > 
> > 
> > > "markdown": "Full markdown content",
> > > 
> > 
> > > "html": "<div>Formatted HTML with proper semantic tags</div>",
> > > 
> > 
> > > "json": "Structured JSON for API consumption",
> > > 
> > 
> > > "notion": "Notion-flavored markdown for import"
> > > 
> > 
> > > },
> > > 
> > 
> > > "changelog": [
> > > 
> > 
> > > {
> > > 
> > 
> > > "version": "1.0.0",
> > > 
> > 
> > > "date": "2025-10-12",
> > > 
> > 
> > > "changes": ["Initial documentation generated"],
> > > 
> > 
> > > "sections_modified": ["all"]
> > > 
> > 
> > > }
> > > 
> > 
> > > ],
> > > 
> > 
> > > "validation": {
> > > 
> > 
> > > "broken_links": [],
> > > 
> > 
> > > "missing_prerequisites": [],
> > > 
> > 
> > > "unclear_instructions": [],
> > > 
> > 
> > > "accessibility_score": 95,
> > > 
> > 
> > > "status": "ready_for_deployment"
> > > 
> > 
> > > }
> > > 
> > 
> > > }
> > > 
> > 
> > > `
> > > 
> > > 
> > > 
> > > **Quality Checks**:
> > > 
> > > 
> > > 1. Verify all cross-references point to existing sections
> > > 
> > > 
> > > 2. Ensure code blocks have language identifiers
> > > 
> > > 
> > > 3. Check that technical terms are defined before use
> > > 
> > > 
> > > 4. Validate readability score is 60+ (Flesch Reading Ease)
> > > 
> > > 
> > > 5. Confirm all sections have proper heading hierarchy
> > > 
> > > 
> > > 6. Check for broken or placeholder content
> > > 
> > > 
> > > 
> > > **Export Specifications**:
> > > 
> > > 
> > > - **Markdown**: Preserve all formatting, include frontmatter with metadata
> > > 
> > > 
> > > - **HTML**: Use semantic tags (`<article>`, `<section>`, `<code>`), add classes for styling
> > > 
> > > 
> > > - **JSON**: Flatten for API consumption, include separate content + metadata objects
> > > 
> > > 
> > > - **Notion**: Convert to Notion-flavored markdown with proper block syntax
> > > 
> > > 
> > > ---
> > > 
> > > ## Prompt 4: Validation & Refinement (Optional)
> > > 
> > > ### Purpose
> > > 
> > > Perform quality checks and refine based on user feedback.
> > > 
> > > ### Template
> > > 
> > > > **System Context**: You are a quality assurance specialist for technical documentation.
> > > > 
> > > 
> > > 
> > > > 
> > > 
> > > > **Task**: Review the generated documentation and apply refinements based on feedback.
> > > > 
> > > 
> > > 
> > > > 
> > > 
> > > > **Documentation to Review**: [OUTPUT_FROM_PROMPTS_1-3]
> > > > 
> > > 
> > > 
> > > > 
> > > 
> > > > **User Feedback** (if provided): [USER_FEEDBACK]
> > > > 
> > > 
> > > 
> > > > 
> > > 
> > > > **Validation Checklist**:
> > > > 
> > > > 
> > > > 
> > > > ✓ **Logical Flow**
> > > > 
> > > > 
> > > > - Does each section flow naturally to the next?
> > > > 
> > > > 
> > > > - Are prerequisites mentioned before they're needed?
> > > > 
> > > > 
> > > > - Do steps follow a logical sequence?
> > > > 
> > > > 
> > > > 
> > > > ✓ **Clarity**
> > > > 
> > > > 
> > > > - Can a beginner understand without external help?
> > > > 
> > > > 
> > > > - Are there undefined jargon terms?
> > > > 
> > > > 
> > > > - Are instructions specific and actionable?
> > > > 
> > > > 
> > > > 
> > > > ✓ **Completeness**
> > > > 
> > > > 
> > > > - Are all promises/features mentioned actually documented?
> > > > 
> > > > 
> > > > - Do troubleshooting sections address common issues?
> > > > 
> > > > 
> > > > - Are edge cases covered?
> > > > 
> > > > 
> > > > 
> > > > ✓ **Consistency**
> > > > 
> > > > 
> > > > - Is terminology used consistently throughout?
> > > > 
> > > > 
> > > > - Is formatting uniform (headings, code blocks, lists)?
> > > > 
> > > > 
> > > > - Is tone consistent across sections?
> > > > 
> > > > 
> > > > 
> > > > ✓ **Accessibility**
> > > > 
> > > > 
> > > > - Is there alt text for images?
> > > > 
> > > > 
> > > > - Are links descriptive (not "click here")?
> > > > 
> > > > 
> > > > - Is contrast sufficient in code examples?
> > > > 
> > > > 
> > > > 
> > > > **Refinement Options** (apply based on feedback):
> > > > 
> > > > 
> > > > - "Make more formal" → Increase business tone, reduce contractions
> > > > 
> > > > 
> > > > - "Make more casual" → Add conversational elements, use "you" more
> > > > 
> > > > 
> > > > - "Add more examples" → Insert 2-3 real-world scenarios per section
> > > > 
> > > > 
> > > > - "Simplify language" → Lower grade level, define all technical terms
> > > > 
> > > > 
> > > > - "Add technical depth" → Include architecture diagrams, API specs
> > > > 
> > > > 
> > > > - "Shorten" → Remove redundancy, combine similar sections
> > > > 
> > > > 
> > > > - "Expand" → Add detail, more step-by-step breakdowns
> > > > 
> > > > 
> > > > 
> > > > **Output**: Updated documentation with changes highlighted + summary of improvements made
> > > > 
> > > > 
> > > > ---
> > > > 
> > > > ## Implementation Tips
> > > > 
> > > > ### Prompt Chaining Strategy
> > > > 
> > > > 1. **Run Prompt 1** → Parse JSON output
> > > > 2. **Feed to Prompt 2** → Generate markdown docs
> > > > 3. **Feed to Prompt 3** → Create final export package
> > > > 4. **Optional: Run Prompt 4** → Refine based on user feedback
> > > > 
> > > > ### API Integration
> > > > 
> > > > ```jsx
> > > > const response1 = await ai.complete(prompt1, { url: userUrl });
> > > > const structure = JSON.parse(response1);
> > > > 
> > > > const response2 = await ai.complete(prompt2, { structure });
> > > > const docs = response2;
> > > > 
> > > > const response3 = await ai.complete(prompt3, { docs });
> > > > const finalPackage = JSON.parse(response3);
> > > > ```
> > > > 
> > > > ### Error Handling
> > > > 
> > > > - If JSON parsing fails → Retry with "Ensure valid JSON output"
> > > > - If content is thin → Re-scrape with different selectors
> > > > - If validation fails → Apply Prompt 4 automatically
> > > > 
> > > > ---
> > > > 
> > > > ## Deep Research Implementation Architecture
> > > > 
> > > > ### Overview
> > > > 
> > > > To create comprehensive documentation like Microsoft or X, you need a multi-stage research pipeline that goes beyond single-page scraping.
> > > > 
> > > > ### Implementation Flow
> > > > 
> > > > ```
> > > > User Input URL
> > > >     ↓
> > > > [Stage 1] Site Discovery & Crawling
> > > >     → Scrape homepage
> > > >     → Extract all internal links
> > > >     → Identify documentation sections
> > > >     → Build crawl queue
> > > >     ↓
> > > > [Stage 2] Multi-Page Scraping
> > > >     → Visit each discovered page
> > > >     → Extract content, code, images
> > > >     → Store in structured format
> > > >     ↓
> > > > [Stage 3] External Research
> > > >     → Google search for common issues
> > > >     → Scrape Stack Overflow, GitHub
> > > >     → Extract community insights
> > > >     ↓
> > > > [Stage 4] Content Synthesis
> > > >     → Combine all sources
> > > >     → Feed to AI for documentation generation
> > > >     ↓
> > > > [Stage 5] Generate Final Docs
> > > > ```
> > > > 
> > > > ---
> > > > 
> > > > ### Stage 1: Site Discovery & Crawling
> > > > 
> > > > ### Implementation
> > > > 
> > > > ```jsx
> > > > import axios from 'axios';
> > > > import * as cheerio from 'cheerio';
> > > > 
> > > > async function discoverSiteStructure(baseUrl) {
> > > >   const homepage = await axios.get(baseUrl);
> > > >   const $ = cheerio.load([homepage.data](http://homepage.data));
> > > >   
> > > >   // Extract product name
> > > >   const productName = $('title').text().split('|')[0].trim();
> > > >   
> > > >   // Common documentation paths to check
> > > >   const docPaths = [
> > > >     '/docs', '/documentation', '/help', '/support', 
> > > >     '/help-center', '/blog', '/articles', '/api', 
> > > >     '/api-docs', '/developers', '/guides', '/tutorials',
> > > >     '/getting-started', '/faq', '/questions', '/changelog',
> > > >     '/updates', '/releases', '/resources', '/learn',
> > > >     '/community', '/forum'
> > > >   ];
> > > >   
> > > >   // Find valid documentation URLs
> > > >   const validUrls = [];
> > > >   for (const path of docPaths) {
> > > >     try {
> > > >       const testUrl = new URL(path, baseUrl).href;
> > > >       const response = await axios.head(testUrl, { timeout: 5000 });
> > > >       if (response.status === 200) {
> > > >         validUrls.push(testUrl);
> > > >       }
> > > >     } catch (error) {
> > > >       // Path doesn't exist, skip
> > > >     }
> > > >   }
> > > >   
> > > >   // Extract links from navigation menu
> > > >   const navLinks = [];
> > > >   $('nav a, header a, .menu a, .navigation a').each((i, el) => {
> > > >     const href = $(el).attr('href');
> > > >     if (href && (
> > > >       href.includes('doc') || 
> > > >       href.includes('help') || 
> > > >       href.includes('support') ||
> > > >       href.includes('guide') ||
> > > >       href.includes('tutorial')
> > > >     )) {
> > > >       navLinks.push(new URL(href, baseUrl).href);
> > > >     }
> > > >   });
> > > >   
> > > >   // Extract all internal links from homepage
> > > >   const allLinks = [];
> > > >   $('a[href]').each((i, el) => {
> > > >     const href = $(el).attr('href');
> > > >     try {
> > > >       const url = new URL(href, baseUrl);
> > > >       if (url.hostname === new URL(baseUrl).hostname) {
> > > >         allLinks.push(url.href);
> > > >       }
> > > >     } catch (e) {
> > > >       // Invalid URL, skip
> > > >     }
> > > >   });
> > > >   
> > > >   return {
> > > >     productName,
> > > >     baseUrl,
> > > >     validDocPaths: validUrls,
> > > >     navLinks: [...new Set(navLinks)],
> > > >     allInternalLinks: [...new Set(allLinks)].slice(0, 50) // Limit to 50
> > > >   };
> > > > }
> > > > ```
> > > > 
> > > > ---
> > > > 
> > > > ### Stage 2: Multi-Page Content Extraction
> > > > 
> > > > ### Implementation
> > > > 
> > > > ```jsx
> > > > import { Readability } from '@mozilla/readability';
> > > > import { JSDOM } from 'jsdom';
> > > > 
> > > > async function extractMultiPageContent(urls) {
> > > >   const extracted = [];
> > > >   
> > > >   for (const url of urls) {
> > > >     try {
> > > >       const response = await axios.get(url, { timeout: 10000 });
> > > >       const dom = new JSDOM([response.data](http://response.data), { url });
> > > >       const reader = new Readability(dom.window.document);
> > > >       const article = reader.parse();
> > > >       
> > > >       const $ = cheerio.load([response.data](http://response.data));
> > > >       
> > > >       // Extract code blocks
> > > >       const codeBlocks = [];
> > > >       $('pre code, pre, .code-block').each((i, el) => {
> > > >         const code = $(el).text().trim();
> > > >         const language = $(el).attr('class')?.match(/language-(\w+)/)?.[1] || 'text';
> > > >         if (code.length > 10) {
> > > >           codeBlocks.push({ language, code });
> > > >         }
> > > >       });
> > > >       
> > > >       // Extract images/screenshots
> > > >       const images = [];
> > > >       $('img').each((i, el) => {
> > > >         const src = $(el).attr('src');
> > > >         const alt = $(el).attr('alt');
> > > >         if (src && !src.includes('logo') && !src.includes('icon')) {
> > > >           images.push({ 
> > > >             src: new URL(src, url).href, 
> > > >             alt: alt || 'Screenshot' 
> > > >           });
> > > >         }
> > > >       });
> > > >       
> > > >       // Extract headings for structure
> > > >       const headings = [];
> > > >       $('h1, h2, h3').each((i, el) => {
> > > >         headings.push({
> > > >           level: el.tagName.toLowerCase(),
> > > >           text: $(el).text().trim()
> > > >         });
> > > >       });
> > > >       
> > > >       extracted.push({
> > > >         url,
> > > >         title: article?.title || $('title').text(),
> > > >         content: article?.textContent || $('body').text(),
> > > >         excerpt: article?.excerpt || '',
> > > >         codeBlocks,
> > > >         images,
> > > >         headings,
> > > >         wordCount: article?.textContent?.split(/\s+/).length || 0
> > > >       });
> > > >       
> > > >       // Rate limiting
> > > >       await new Promise(resolve => setTimeout(resolve, 1000));
> > > >       
> > > >     } catch (error) {
> > > >       console.error(`Failed to extract from ${url}:`, error.message);
> > > >     }
> > > >   }
> > > >   
> > > >   return extracted;
> > > > }
> > > > ```
> > > > 
> > > > ---
> > > > 
> > > > ### Stage 3: External Research (Google Search)
> > > > 
> > > > ### Implementation
> > > > 
> > > > ```jsx
> > > > // Option 1: Using SerpAPI (paid but reliable)
> > > > import { getJson } from 'serpapi';
> > > > 
> > > > async function performExternalResearch(productName) {
> > > >   const queries = [
> > > >     `"${productName}" documentation`,
> > > >     `"${productName}" getting started tutorial`,
> > > >     `"${productName}" common issues`,
> > > >     `"${productName}" troubleshooting`,
> > > >     `"${productName}" best practices`,
> > > >     `"${productName}" vs alternatives`,
> > > >     `"${productName}" integration guide`,
> > > >     `"${productName}" API examples`,
> > > >     `how to use "${productName}"`,
> > > >     `"${productName}" problems OR "${productName}" not working`
> > > >   ];
> > > >   
> > > >   const allResults = [];
> > > >   
> > > >   for (const query of queries) {
> > > >     try {
> > > >       const results = await getJson({
> > > >         engine: "google",
> > > >         q: query,
> > > >         api_key: process.env.SERPAPI_KEY,
> > > >         num: 10
> > > >       });
> > > >       
> > > >       allResults.push({
> > > >         query,
> > > >         results: [results.organic](http://results.organic)_results || []
> > > >       });
> > > >       
> > > >       await new Promise(resolve => setTimeout(resolve, 2000));
> > > >     } catch (error) {
> > > >       console.error(`Search failed for "${query}":`, error.message);
> > > >     }
> > > >   }
> > > >   
> > > >   return allResults;
> > > > }
> > > > 
> > > > // Option 2: Using Brave Search API (cheaper alternative)
> > > > async function searchBrave(productName) {
> > > >   const queries = [
> > > >     `${productName} documentation`,
> > > >     `${productName} common issues site:[stackoverflow.com](http://stackoverflow.com)`,
> > > >     `${productName} site:[github.com](http://github.com) issues`,
> > > >     `${productName} tutorial`,
> > > >     `${productName} troubleshooting`
> > > >   ];
