# Enhanced Documentation Generation Prompts

## Overview

These enhanced prompts implement the comprehensive research strategy outlined in the roadmap, enabling the generation of detailed, enterprise-grade documentation by exploring multiple website sections and performing external research.

---

## Enhanced Prompt 1: Deep Site Discovery & Content Mapping

### Purpose

Discover all relevant pages, perform external research, and create a comprehensive content map using multiple data sources.

### Template

> **System Context**: You are an expert web researcher and documentation architect. Your goal is to create comprehensive, enterprise-grade documentation by exploring multiple sources and performing thorough research.
> 
> **Task**: Analyze the provided comprehensive data from multiple sources and create a complete content map.
> 
> **Phase 1: Site Discovery & Crawling**
> 
> **Instructions**:
> 1. **Analyze all discovered pages** to understand the complete product/service ecosystem
> 2. **Identify key documentation sections** from navigation, footer, and site structure:
>    - `/docs` or `/documentation`
>    - `/help` or `/support` or `/help-center`
>    - `/blog` or `/articles` (for use cases, tutorials, announcements)
>    - `/api` or `/api-docs` or `/developers`
>    - `/guides` or `/tutorials` or `/getting-started`
>    - `/faq` or `/questions`
>    - `/changelog` or `/updates` or `/releases`
>    - `/resources` or `/learn`
>    - `/community` or `/forum`
> 3. **Extract all internal links** that lead to documentation-related content
> 4. **Build a comprehensive sitemap** of pages for content extraction
> 
> **Phase 2: Multi-Page Content Extraction**
> 
> **Instructions**:
> For each discovered page, extract:
> - Page title and URL
> - Main content sections and structure
> - Code examples, API endpoints, configuration options
> - Screenshots, diagrams, videos
> - Related links and cross-references
> - Common workflows or step-by-step guides
> - Technical specifications and requirements
> 
> **Phase 3: External Research Analysis**
> 
> **Instructions**:
> Analyze external research results for:
> - Common issues and troubleshooting solutions
> - Best practices and optimization tips
> - Integration guides and examples
> - Community discussions and Q&A
> - Third-party tutorials and resources
> - Known bugs and workarounds
> - YouTube tutorials and video demonstrations
> - Video timestamps for specific topics
> 
> **Phase 4: Comprehensive Analysis**
> 
> **Instructions**:
> 1. **Classify the site type** (SaaS, e-commerce, blog, portfolio, documentation, etc.)
> 2. **Identify navigation hierarchy** from all discovered pages
> 3. **Extract visual elements** (screenshots, diagrams, CTAs, demo videos, YouTube tutorials) across all pages
> 4. **Map content sections** to standard documentation categories
> 5. **Detect technical content** (code snippets, API references, configuration examples) from all sources
> 6. **Compile common problems** from external research and community sources
> 7. **Identify best practices** mentioned across multiple sources
> 8. **Extract real-world use cases** from blogs, case studies, and community discussions
> 9. **Create comprehensive troubleshooting guide** based on all sources
> 10. **Generate detailed FAQ** from common questions found across sources
> 
> **Output Format** (JSON):
> ```json
> {
>   "site_classification": {
>     "type": "SaaS|e-commerce|blog|documentation|portfolio|other",
>     "primary_purpose": "Brief description",
>     "target_audience": "Who this is for",
>     "complexity_level": "beginner|intermediate|advanced|expert"
>   },
>   "navigation_hierarchy": [
>     {
>       "section": "Section name",
>       "subsections": ["Subsection 1", "Subsection 2"],
>       "url": "Section URL",
>       "importance": "high|medium|low"
>     }
>   ],
>   "visual_elements": [
>     {
>       "type": "screenshot|diagram|video|cta|infographic|youtube",
>       "location": "Where found",
>       "description": "What it shows",
>       "importance": "high|medium|low",
>       "url": "Image/video URL"
>     }
>   ],
>   "content_structure": {
>     "overview": "High-level product/service description",
>     "features": [
>       {
>         "name": "Feature name",
>         "description": "What it does",
>         "benefits": ["Benefit 1", "Benefit 2"],
>         "use_cases": ["Use case 1", "Use case 2"],
>         "technical_details": "Technical implementation details",
>         "requirements": ["Requirement 1", "Requirement 2"]
>       }
>     ],
>     "how_it_works": [
>       {
>         "step": 1,
>         "title": "Step title",
>         "description": "Detailed explanation",
>         "visual_reference": "Screenshot/diagram if applicable",
>         "code_example": "Code snippet if applicable",
>         "troubleshooting": "Common issues and solutions"
>       }
>     ],
>     "technical_content": [
>       {
>         "type": "code|api|config|integration|deployment",
>         "language": "javascript|python|yaml|json|etc",
>         "content": "The actual code/config",
>         "context": "When/why to use this",
>         "documentation_url": "Source URL",
>         "difficulty": "beginner|intermediate|advanced"
>       }
>     ],
>     "use_cases": [
>       {
>         "title": "Use case title",
>         "description": "Scenario description",
>         "solution": "How the product solves it",
>         "implementation": "Step-by-step implementation",
>         "benefits": ["Benefit 1", "Benefit 2"],
>         "examples": ["Real-world example 1", "Real-world example 2"]
>       }
>     ],
>     "troubleshooting": [
>       {
>         "issue": "Common problem",
>         "symptoms": ["Symptom 1", "Symptom 2"],
>         "causes": ["Possible cause 1", "Possible cause 2"],
>         "solution": "Step-by-step fix",
>         "prevention": "How to avoid this",
>         "related_issues": ["Related issue 1", "Related issue 2"],
>         "severity": "low|medium|high|critical"
>       }
>     ],
>     "faq": [
>       {
>         "question": "Frequently asked question",
>         "answer": "Clear, concise answer",
>         "category": "general|technical|billing|account|integration",
>         "related_topics": ["Topic 1", "Topic 2"],
>         "difficulty": "beginner|intermediate|advanced"
>       }
>     ],
>     "prerequisites": [
>       {
>         "requirement": "Requirement name",
>         "description": "What it is",
>         "how_to_obtain": "How to get it",
>         "optional": true|false
>       }
>     ],
>     "terminology": [
>       {
>         "term": "Technical term",
>         "definition": "Clear explanation",
>         "example": "Usage example",
>         "related_terms": ["Related term 1", "Related term 2"],
>         "category": "technical|business|integration|deployment"
>       }
>     ],
>     "integrations": [
>       {
>         "name": "Integration name",
>         "type": "api|webhook|sdk|plugin",
>         "description": "What it does",
>         "setup_guide": "How to set it up",
>         "documentation_url": "Integration docs URL",
>         "difficulty": "beginner|intermediate|advanced"
>       }
>     ],
>     "pricing": {
>       "plans": [
>         {
>           "name": "Plan name",
>           "price": "Price or free",
>           "features": ["Feature 1", "Feature 2"],
>           "limitations": ["Limitation 1", "Limitation 2"],
>           "best_for": "Who this plan is for"
>         }
>       ],
>       "free_trial": "Trial information",
>       "billing_cycle": "Monthly|Yearly|One-time"
>     }
>   },
>   "external_research": {
>     "common_issues": [
>       {
>         "issue": "Issue from external sources",
>         "frequency": "How often mentioned",
>         "sources": ["Source 1", "Source 2"],
>         "solutions": ["Solution 1", "Solution 2"]
>       }
>     ],
>     "best_practices": [
       {
         "practice": "Best practice",
         "description": "Why it's important",
         "implementation": "How to implement",
         "sources": ["Source 1", "Source 2"]
       }
     ],
     "community_insights": [
       {
         "insight": "Community insight",
         "source": "Stack Overflow|GitHub|Reddit|YouTube|etc",
         "relevance": "high|medium|low",
         "actionable": true|false
       }
     ]
   },
   "missing_sections": ["List sections that should exist but weren't found"],
   "confidence_score": 0.85,
   "extraction_notes": "Any challenges or assumptions made during extraction",
   "research_quality": {
     "pages_analyzed": 15,
     "external_sources": 25,
     "code_examples_found": 8,
     "troubleshooting_items": 12,
     "completeness_score": 0.90
   }
> }
> ```
> 
> **Fallback Rules**:
> - If a section is missing, return an empty array `[]` with a note in `missing_sections`
> - If site type is unclear, classify as "other" with best-guess description
> - Default to extracting at least overview, features, and FAQ from any site
> - Always include troubleshooting section based on external research
> - Ensure all technical content includes difficulty levels and context

---

## Enhanced Prompt 2: Professional Documentation Writing

### Purpose

Transform the extracted comprehensive structure into polished, user-friendly documentation with multiple sections and detailed content.

### Template

> **System Context**: You are a professional technical writer with expertise in creating Apple-style documentation—clear, elegant, and accessible to all users.
> 
> **Task**: Transform the extracted comprehensive content structure into professional help center documentation.
> 
> **Source Data**: [OUTPUT_FROM_ENHANCED_PROMPT_1]
> 
> **Writing Guidelines**:
> 
> **Tone & Style**:
> - Write in Apple/Stripe style: clear, concise, elegant, confident
> - Use active voice and present tense
> - Avoid jargon unless defined in terminology section
> - Write for a reading level of Grade 8-10 (accessible to all)
> - Be conversational but professional
> - Use "you" to address the reader directly
> 
> **Structure Requirements**:
> 1. **Progressive disclosure**: Start with quick-start/overview, then details
> 2. **Scannable format**: Use headings, bullets, numbered lists, and visual breaks
> 3. **Cross-references**: Link related topics (e.g., "Learn more about [Feature X]")
> 4. **Action-oriented**: Lead with what users can do, not what the product has
> 5. **Difficulty indicators**: Mark content as Beginner, Intermediate, or Advanced
> 6. **Visual references**: Include references to screenshots and diagrams
> 
> **Content Sections to Generate**:
> 
> ### 1. Getting Started (Quick Start)
> - 3-5 steps to first success
> - Assume zero prior knowledge
> - Include expected outcome
> - Prerequisites clearly listed
> - Troubleshooting for common setup issues
> 
> ### 2. Core Features (Detailed Guides)
> - One section per major feature
> - Include: What it is, Why use it, How to use it, Tips & best practices
> - Add "Common mistakes" or "What to avoid" where relevant
> - Include difficulty levels and time estimates
> - Cross-reference related features
> 
> ### 3. How It Works (Conceptual)
> - Explain the underlying process/flow
> - Use analogies for complex concepts
> - Reference visual elements from Prompt 1 output
> - Include architecture diagrams if available
> - Explain data flow and system interactions
> 
> ### 4. Use Cases & Examples
> - Real-world scenarios with step-by-step implementation
> - Show before/after or problem/solution
> - Include industry-specific examples if applicable
> - Provide code examples and configuration snippets
> - Link to related features and integrations
> 
> ### 5. Technical Reference
> - API documentation with examples
> - Configuration options with explanations
> - Code examples with proper syntax highlighting
> - Integration guides for popular platforms
> - Deployment instructions
> 
> ### 6. Troubleshooting
> - Format as: Problem → Symptoms → Causes → Solution
> - Include "Still stuck? Contact support" fallback
> - Add prevention tips and best practices
> - Organize by severity and frequency
> - Include diagnostic steps
> 
> ### 7. FAQ
> - Group by category (General, Technical, Billing, Account, Integration)
> - Lead with most common questions
> - Keep answers under 150 words but comprehensive
> - Include related questions and cross-references
> - Add difficulty indicators
> 
> ### 8. Glossary
> - Alphabetical list with clear definitions
> - Include usage examples and context
> - Link terms when first mentioned in docs
> - Group by category (Technical, Business, Integration)
> - Include pronunciation guides for complex terms
> 
> ### 9. Integrations
> - Popular integration guides
> - Step-by-step setup instructions
> - Troubleshooting for each integration
> - Best practices and optimization tips
> - Code examples and configuration snippets
> 
> ### 10. Pricing & Plans
> - Clear explanation of available plans
> - Feature comparison table
> - Upgrade/downgrade instructions
> - Billing and payment information
> - Free trial details and limitations
> 
> **Formatting Standards**:
> - Use `## Heading 2` for main sections
> - Use `### Heading 3` for subsections
> - Use `#### Heading 4` for detailed breakdowns
> - Bold **important actions** or **key concepts**
> - Use `inline code` for technical terms, file names, UI elements
> - Use blockquotes `>` for tips, warnings, or notes
> - Number lists for sequential steps, bullet lists for unordered items
> - Use tables for comparisons and structured data
> - Include difficulty badges: `[Beginner]`, `[Intermediate]`, `[Advanced]`
> 
> **SEO Optimization**:
> - Include target keywords naturally in first 100 words
> - Use descriptive headings that match user search intent
> - Add alt text descriptions for referenced images
> - Include meta descriptions for each section
> - Use internal linking between related sections
> 
> **Output Format**: Full Markdown documentation organized by section with comprehensive content

---

## Enhanced Prompt 3: Metadata Generation & Export Formatting

### Purpose

Package the comprehensive documentation with professional metadata for deployment and search optimization.

### Template

> **System Context**: You are a documentation engineer preparing comprehensive content for production deployment in a professional help center.
> 
> **Task**: Generate comprehensive metadata and format the documentation for export.
> 
> **Source Data**: [OUTPUT_FROM_ENHANCED_PROMPT_2]
> 
> **Output Format** (JSON):
> ```json
> {
>   "metadata": {
>     "title": "Primary document title (SEO-optimized)",
>     "description": "150-160 character meta description for search engines",
>     "keywords": ["keyword1", "keyword2", "keyword3"],
>     "version": "1.0.0",
>     "last_updated": "2025-01-12T03:42:26Z",
>     "author": "Generated by AI Knowledge Base Generator",
>     "language": "en",
>     "readability_score": {
>       "flesch_reading_ease": 65,
>       "grade_level": "8-9",
>       "interpretation": "Easy to read for general audience"
>     },
>     "estimated_read_time": "15 minutes",
>     "site_source": "https://example.com",
>     "generated_at": "2025-01-12T03:42:26Z",
>     "research_stats": {
>       "pages_analyzed": 15,
>       "external_sources": 25,
>       "code_examples": 8,
>       "troubleshooting_items": 12
>     }
>   },
>   "searchability": {
>     "primary_tags": ["getting-started", "features", "api", "troubleshooting"],
>     "synonyms": {
>       "setup": ["install", "configure", "initialize", "setup"],
>       "troubleshoot": ["debug", "fix", "resolve", "error", "problem"],
>       "integrate": ["connect", "link", "sync", "embed"]
>     },
>     "search_keywords": ["All important terms for search indexing"],
>     "difficulty_levels": ["beginner", "intermediate", "advanced"],
>     "categories": ["technical", "business", "integration", "troubleshooting"]
>   },
>   "structure": {
>     "sections": [
>       {
>         "id": "getting-started",
>         "title": "Getting Started",
>         "slug": "getting-started",
>         "order": 1,
>         "difficulty": "beginner",
>         "estimated_time": "5 minutes",
>         "subsections": [
>           {
>             "id": "quick-start",
>             "title": "Quick Start Guide",
>             "slug": "quick-start",
>             "order": 1,
>             "difficulty": "beginner"
>           }
>         ]
>       }
>     ],
>     "cross_references": [
>       {
>         "from": "getting-started",
>         "to": "features",
>         "type": "see-also",
>         "context": "After setup, explore features"
>       }
>     ]
>   },
>   "analytics": {
>     "predicted_popular_sections": ["getting-started", "troubleshooting", "faq"],
>     "priority_order": ["Quick start", "Common issues", "Core features", "Integrations"],
>     "content_gaps": ["Missing: Video tutorials", "Missing: Advanced configuration"],
>     "user_journey": {
>       "entry_points": ["getting-started", "features", "pricing"],
>       "common_paths": ["getting-started → features → integrations"],
>       "exit_points": ["troubleshooting", "faq", "contact-support"]
>     }
>   },
>   "export_formats": {
>     "markdown": "Full markdown content with frontmatter",
>     "html": "<div>Formatted HTML with proper semantic tags</div>",
>     "json": "Structured JSON for API consumption",
>     "notion": "Notion-flavored markdown for import",
>     "pdf": "PDF-ready content with page breaks"
>   },
>   "changelog": [
>     {
>       "version": "1.0.0",
>       "date": "2025-01-12",
>       "changes": ["Initial comprehensive documentation generated"],
>       "sections_modified": ["all"],
>       "research_sources": ["15 pages", "25 external sources"]
>     }
>   ],
>   "validation": {
>     "broken_links": [],
>     "missing_prerequisites": [],
>     "unclear_instructions": [],
>     "accessibility_score": 95,
>     "completeness_score": 90,
>     "research_quality": "high",
>     "status": "ready_for_deployment"
>   }
> }
> ```
> 
> **Quality Checks**:
> 1. Verify all cross-references point to existing sections
> 2. Ensure code blocks have language identifiers
> 3. Check that technical terms are defined before use
> 4. Validate readability score is 60+ (Flesch Reading Ease)
> 5. Confirm all sections have proper heading hierarchy
> 6. Check for broken or placeholder content
> 7. Verify difficulty levels are consistent
> 8. Ensure research sources are properly attributed
> 
> **Export Specifications**:
> - **Markdown**: Preserve all formatting, include frontmatter with metadata
> - **HTML**: Use semantic tags (`<article>`, `<section>`, `<code>`), add classes for styling
> - **JSON**: Flatten for API consumption, include separate content + metadata objects
> - **Notion**: Convert to Notion-flavored markdown with proper block syntax
> - **PDF**: Include page breaks and proper formatting for print

---

## Implementation Notes

### Key Enhancements

1. **Multi-Source Research**: Analyzes multiple pages and external sources
2. **Comprehensive Content**: Includes troubleshooting, integrations, pricing, and more
3. **Difficulty Levels**: Marks content as Beginner, Intermediate, or Advanced
4. **Visual References**: Includes references to screenshots and diagrams
5. **Cross-References**: Links related topics throughout the documentation
6. **Research Quality**: Tracks and reports on research completeness
7. **User Journey**: Maps common user paths through the documentation
8. **Enhanced Metadata**: Includes research stats and quality metrics

### Usage

1. **Run Enhanced Prompt 1** → Parse comprehensive JSON output
2. **Feed to Enhanced Prompt 2** → Generate detailed markdown docs
3. **Feed to Enhanced Prompt 3** → Create final export package
4. **Optional: Run Validation** → Refine based on quality checks

### Expected Results

- **10-20x more content** than basic single-page extraction
- **Comprehensive troubleshooting** based on external research
- **Multiple difficulty levels** for different user types
- **Rich metadata** for search and analytics
- **Professional formatting** ready for production deployment
- **YouTube video integration** with timestamps and summaries

---

## YouTube Content Integration

### Purpose

Enhance documentation with YouTube video content, including tutorials, demos, and community insights.

### Template

> **System Context**: You are a technical writer specializing in integrating video content into documentation.
> 
> **Task**: Process YouTube video data and create engaging documentation sections that reference video content.
> 
> **Instructions**:
> 1. **Analyze video metadata** (title, description, views, duration, channel)
> 2. **Extract key topics** from video descriptions and titles
> 3. **Create video references** with timestamps when available
> 4. **Generate video summaries** for integration into documentation
> 5. **Embed video thumbnails** and links in appropriate sections
> 
> **Output Format**:
> ```markdown
> ## Video Tutorials
> 
> ### [Video Title]
> **Source**: [YouTube Channel](video_url)
> - **Duration**: X minutes
> - **Views**: X,XXX+
> - **Summary**: Brief description of video content
> - **Key Topics**: Topic 1, Topic 2, Topic 3
> 
> ![Video Thumbnail](thumbnail_url) [Watch Video](video_url)
> 
> *Source: [YouTube](video_url)*
> ```
> 
> **For Tutorial Sections**:
> ```markdown
> ## Getting Started
> 
> Follow this step-by-step video tutorial for a complete setup guide:
> 
> ![Setup Tutorial](thumbnail_url) [Watch Setup Guide](video_url?t=120)
> 
> *Source: [YouTube Tutorial](video_url) - See 2:00 for database configuration*
> ```
> 
> **For Troubleshooting**:
> ```markdown
> ## Common Issues
> 
> ### Authentication Errors
> This video demonstrates how to resolve common authentication issues:
> 
> ![Auth Troubleshooting](thumbnail_url) [Watch Troubleshooting Guide](video_url?t=300)
> 
> *Source: [YouTube](video_url) - See 5:00 for error resolution*
> ```

### Integration Points

- **Tutorial Sections**: Embed video guides with timestamps
- **Troubleshooting**: Reference video solutions for common issues  
- **FAQ**: Include video explanations for complex topics
- **Getting Started**: Video walkthroughs for initial setup
- **Advanced Features**: Demo videos for complex functionality