import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertDocumentationSchema } from "@shared/schema";
import archiver from "archiver";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function verifySupabaseAuth(req: any, res: any, next: any) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    const token = auth && typeof auth === 'string' ? auth.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing access token' });
    }

    if (!SUPABASE_URL) {
      return res.status(500).json({ error: 'SUPABASE_URL not configured on server' });
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    if (!userResp.ok) {
      const text = await userResp.text();
      console.warn('Supabase auth verify failed:', userResp.status, text);
      return res.status(401).json({ error: 'Unauthorized', details: text });
    }

    const userData = await userResp.json();
    req.user = userData;
    return next();
  } catch (err: any) {
    console.error('Error verifying supabase token', err);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

// Helper function to parse JSON with retry logic
async function parseJSONWithRetry(apiKey: string, content: string, retryPrompt: string, maxRetries = 2): Promise<any> {
  let lastError: Error | null = null;
  
  // First, try to parse the content directly
  try {
    return JSON.parse(content);
  } catch (error) {
    console.log('Initial JSON parse failed, attempting to clean and retry...');
    
    // Try to extract JSON from markdown code blocks or other formatting
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.log('Extracted JSON parse failed');
      }
    }
    
    // If still failing, retry with AI to fix the JSON
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Retry attempt ${i + 1} to fix JSON...`);
        
        const retryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are a JSON formatting expert. Fix the provided content to be valid JSON. Return ONLY valid JSON, no markdown formatting or explanations.'
              },
              {
                role: 'user',
                content: `Fix this JSON:\n\n${content}\n\n${retryPrompt}`
              }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
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

// Generate documentation endpoint
router.post("/api/generate-docs", verifySupabaseAuth, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    // Fetch website content
    console.log("Fetching website content...");
    const websiteResponse = await fetch(url);
    if (!websiteResponse.ok) {
      return res.status(500).json({ error: `Failed to fetch website: ${websiteResponse.statusText}` });
    }
    const htmlContent = await websiteResponse.text();

    // Extract images from HTML
    const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;
    while ((match = imageRegex.exec(htmlContent)) !== null) {
      const imgSrc = match[1];
      // Convert relative URLs to absolute
      try {
        const absoluteUrl = new URL(imgSrc, url).href;
        images.push(absoluteUrl);
      } catch {
        // Skip invalid image URLs
      }
    }
    
    // Extract theme colors from HTML/CSS with enhanced detection
    const extractTheme = (html: string) => {
      const colors: string[] = [];
      const fonts: string[] = [];
      
      // Extract hex colors (including 3 and 6 digit)
      const hexRegex = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g;
      let hexMatch;
      while ((hexMatch = hexRegex.exec(html)) !== null) {
        colors.push(hexMatch[0]);
      }
      
      // Extract rgb/rgba colors
      const rgbRegex = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g;
      let rgbMatch;
      while ((rgbMatch = rgbRegex.exec(html)) !== null) {
        colors.push(rgbMatch[0]);
      }
      
      // Extract hsl/hsla colors
      const hslRegex = /hsla?\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)/g;
      let hslMatch;
      while ((hslMatch = hslRegex.exec(html)) !== null) {
        colors.push(hslMatch[0]);
      }
      
      // Extract colors from background-color, color properties
      const colorPropRegex = /(?:background-color|color|border-color):\s*([^;}"']+)/gi;
      let colorMatch;
      while ((colorMatch = colorPropRegex.exec(html)) !== null) {
        const colorValue = colorMatch[1].trim();
        if (colorValue && !colorValue.includes('var(') && !colorValue.includes('inherit') && !colorValue.includes('transparent')) {
          colors.push(colorValue);
        }
      }
      
      // Extract CSS custom properties (CSS variables)
      const cssVarRegex = /--[a-zA-Z0-9-]+:\s*([#a-zA-Z0-9(),.\s%]+);/g;
      let cssVarMatch;
      while ((cssVarMatch = cssVarRegex.exec(html)) !== null) {
        const value = cssVarMatch[1].trim();
        if (value.match(/^#[0-9A-Fa-f]{3,6}$/) || value.match(/^rgb/) || value.match(/^hsl/)) {
          colors.push(value);
        }
      }
      
      // Extract font families from multiple sources
      const fontRegex = /font-family:\s*([^;}"']+)/gi;
      let fontMatch;
      while ((fontMatch = fontRegex.exec(html)) !== null) {
        const fontFamily = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '');
        if (fontFamily && !fontFamily.includes('var(') && fontFamily.length < 50) {
          fonts.push(fontFamily);
        }
      }
      
      // Extract fonts from @font-face rules
      const fontFaceRegex = /font-family:\s*["']([^"']+)["']/gi;
      let fontFaceMatch;
      while ((fontFaceMatch = fontFaceRegex.exec(html)) !== null) {
        const fontName = fontFaceMatch[1].trim();
        if (fontName && fontName.length < 50) {
          fonts.push(fontName);
        }
      }
      
      // Get unique values and filter out common generic fonts
      const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
      const uniqueColors = [...new Set(colors)].filter(c => c && c.length > 0).slice(0, 15);
      const uniqueFonts = [...new Set(fonts)].filter(f => !genericFonts.includes(f.toLowerCase())).slice(0, 8);
      
      return {
        primaryColor: uniqueColors[0] || '#8B5CF6',
        secondaryColor: uniqueColors[1] || '#6366F1',
        accentColor: uniqueColors[2] || '#8B5CF6',
        colors: uniqueColors,
        fonts: uniqueFonts,
        primaryFont: uniqueFonts[0] || 'Inter, system-ui, sans-serif'
      };
    };
    
    const theme = extractTheme(htmlContent);
    console.log('Extracted theme:', theme);
    
    // Extract text content from HTML (basic extraction)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit content size for AI processing

    console.log("Stage 1: Extracting website structure...");

    // STAGE 1: Structure Understanding & Content Extraction
    const stage1Response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are an expert content analyzer specializing in extracting structured information from websites to create professional documentation.

Task: Analyze the provided website content and extract a comprehensive structure.

Instructions:
1. Classify the site type (SaaS, e-commerce, blog, portfolio, documentation, etc.)
2. Identify navigation hierarchy from menus, headers, and site structure
3. Extract visual elements (screenshots, diagrams, CTAs, demo videos) that should be referenced
4. Map content sections to standard documentation categories
5. Detect technical content (code snippets, API references, configuration examples)

Return ONLY valid JSON in this format:
{
  "site_classification": {
    "type": "SaaS|e-commerce|blog|documentation|portfolio|other",
    "primary_purpose": "Brief description",
    "target_audience": "Who this is for"
  },
  "navigation_hierarchy": [
    {
      "section": "Section name",
      "subsections": ["Subsection 1", "Subsection 2"]
    }
  ],
  "visual_elements": [
    {
      "type": "screenshot|diagram|video|cta",
      "url": "image_url",
      "description": "What it shows",
      "importance": "high|medium|low"
    }
  ],
  "content_structure": {
    "overview": "High-level product/service description",
    "features": [
      {
        "name": "Feature name",
        "description": "What it does",
        "benefits": ["Benefit 1", "Benefit 2"]
      }
    ],
    "how_it_works": [
      {
        "step": 1,
        "title": "Step title",
        "description": "Detailed explanation"
      }
    ],
    "technical_content": [
      {
        "type": "code|api|config|integration",
        "language": "javascript|python|etc",
        "content": "The actual code/config",
        "context": "When/why to use this"
      }
    ],
    "use_cases": [
      {
        "title": "Use case title",
        "description": "Scenario description",
        "solution": "How the product solves it"
      }
    ],
    "troubleshooting": [
      {
        "issue": "Common problem",
        "symptoms": ["Symptom 1"],
        "solution": "Step-by-step fix",
        "prevention": "How to avoid this"
      }
    ],
    "faq": [
      {
        "question": "Frequently asked question",
        "answer": "Clear, concise answer",
        "category": "general|technical|billing|account"
      }
    ],
    "prerequisites": ["Requirement 1"],
    "terminology": [
      {
        "term": "Technical term",
        "definition": "Clear explanation",
        "example": "Usage example"
      }
    ]
  },
  "missing_sections": ["List sections that should exist but weren't found"],
  "confidence_score": 0.85,
  "extraction_notes": "Any challenges or assumptions made during extraction"
}`
          },
          {
            role: 'user',
            content: `Website URL: ${url}

Website Content: ${textContent}

Available images: ${images.slice(0, 10).join(', ')}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!stage1Response.ok) {
      const errorText = await stage1Response.text();
      console.error('Stage 1 failed:', stage1Response.status, errorText);
      return res.status(500).json({ error: `Structure extraction failed: ${stage1Response.statusText}` });
    }

    const stage1Data = await stage1Response.json();
    const extractedStructure = await parseJSONWithRetry(
      GROQ_API_KEY,
      stage1Data.choices?.[0]?.message?.content || '{}',
      'Ensure the output is valid JSON matching the structure extraction format'
    );
    
    console.log("Stage 2: Writing professional documentation...");

    // STAGE 2: Professional Documentation Writing
    const stage2Response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a professional technical writer with expertise in creating Apple/Stripe-style documentation—clear, elegant, and accessible to all users.

Task: Transform the extracted content structure into professional help center documentation.

Writing Guidelines:

Tone & Style:
- Write in Apple/Stripe style: clear, concise, elegant, confident
- Use active voice and present tense
- Avoid jargon unless defined in terminology section
- Write for a reading level of Grade 8-10 (accessible to all)
- Be conversational but professional

Structure Requirements:
1. Progressive disclosure: Start with quick-start/overview, then details
2. Scannable format: Use headings, bullets, numbered lists, and visual breaks
3. Cross-references: Link related topics
4. Action-oriented: Lead with what users can do, not what the product has

Content Sections to Generate:
1. Getting Started (Quick Start) - 3-5 steps to first success, assume zero prior knowledge
2. Core Features (Detailed Guides) - What it is, Why use it, How to use it, Tips & best practices
3. How It Works (Conceptual) - Explain underlying process, use analogies for complex concepts
4. Use Cases & Examples - Real-world scenarios, show before/after or problem/solution
5. Technical Reference (if applicable) - API documentation, configuration options, code examples
6. Troubleshooting - Format as: Problem → Cause → Solution, include prevention tips
7. FAQ - Group by category, lead with most common questions, keep answers under 100 words
8. Glossary (if terminology exists) - Plain-language definitions

Return structured JSON in this format:
{
  "title": "Documentation title",
  "description": "Brief description",
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "icon": "Rocket|Star|Code|AlertCircle|HelpCircle|BookOpen|Workflow",
      "content": [
        { "type": "paragraph", "text": "..." },
        { "type": "heading", "level": 3, "text": "..." },
        { "type": "list", "items": ["..."] },
        { "type": "code", "language": "javascript", "code": "...", "caption": "..." },
        { "type": "callout", "calloutType": "info|warning|tip", "text": "..." },
        { "type": "image", "url": "...", "alt": "...", "caption": "..." }
      ]
    }
  ]
}

Use proper formatting, include relevant images, and make it professional and comprehensive. Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Source Data (Extracted Structure): ${JSON.stringify(extractedStructure)}`
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      }),
    });

    if (!stage2Response.ok) {
      const errorText = await stage2Response.text();
      console.error('Stage 2 failed:', stage2Response.status, errorText);
      return res.status(500).json({ error: `Documentation writing failed: ${stage2Response.statusText}` });
    }

    const stage2Data = await stage2Response.json();
    const writtenDocs = await parseJSONWithRetry(
      GROQ_API_KEY,
      stage2Data.choices?.[0]?.message?.content || '{}',
      'Ensure the output is valid JSON with proper documentation structure'
    );
    
    console.log("Stage 3: Generating metadata and SEO optimization...");

    // STAGE 3: Metadata Generation & Export Formatting
    const stage3Response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a documentation engineer preparing content for production deployment in a professional help center.

Task: Generate comprehensive metadata and enhance the documentation with SEO optimization.

Return JSON with this structure:
{
  "metadata": {
    "title": "Primary document title (SEO-optimized)",
    "description": "150-160 character meta description for search engines",
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "version": "1.0.0",
    "language": "en",
    "estimated_read_time": "8 minutes",
    "site_source": "URL"
  },
  "searchability": {
    "primary_tags": ["getting-started", "features", "api"],
    "search_keywords": ["All important terms for search indexing"]
  },
  "enhanced_sections": []
}

The enhanced_sections should be the same sections from the input but with added SEO-friendly slugs and ordering.
Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Documentation to enhance: ${JSON.stringify(writtenDocs)}
            
Source URL: ${url}`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!stage3Response.ok) {
      const errorText = await stage3Response.text();
      console.error('Stage 3 failed:', stage3Response.status, errorText);
      return res.status(500).json({ error: `Metadata generation failed: ${stage3Response.statusText}` });
    }

    const stage3Data = await stage3Response.json();
    const finalMetadata = await parseJSONWithRetry(
      GROQ_API_KEY,
      stage3Data.choices?.[0]?.message?.content || '{}',
      'Ensure the output is valid JSON with metadata and searchability fields'
    );
    
    console.log("Stage 4: Quality validation and refinement...");

    // STAGE 4: Validation & Refinement (Quality Checks)
    const documentationForValidation = {
      title: finalMetadata.metadata?.title || writtenDocs.title || 'Documentation',
      description: finalMetadata.metadata?.description || writtenDocs.description || '',
      sections: finalMetadata.enhanced_sections && finalMetadata.enhanced_sections.length > 0 
        ? finalMetadata.enhanced_sections 
        : writtenDocs.sections || [],
      metadata: finalMetadata.metadata || {},
    };

    const stage4Response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a quality assurance specialist for technical documentation.

Task: Review the generated documentation and validate quality, then apply refinements if needed.

Validation Checklist:
✓ Logical Flow: Does each section flow naturally? Are prerequisites mentioned before they're needed?
✓ Clarity: Can a beginner understand without external help? No undefined jargon?
✓ Completeness: Are all features documented? Do troubleshooting sections address common issues?
✓ Consistency: Is terminology used consistently? Is formatting uniform?
✓ Accessibility: Are instructions specific and actionable?

Return JSON with this structure:
{
  "validation_results": {
    "logical_flow": { "score": 0-100, "issues": [] },
    "clarity": { "score": 0-100, "issues": [] },
    "completeness": { "score": 0-100, "issues": [] },
    "consistency": { "score": 0-100, "issues": [] },
    "accessibility": { "score": 0-100, "issues": [] },
    "overall_score": 0-100
  },
  "refined_sections": [],
  "improvements_made": []
}

The refined_sections should be the improved version of the input sections. Only make changes if validation finds issues (score < 85).
Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Documentation to validate: ${JSON.stringify(documentationForValidation)}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    let validationResults = null;
    let refinedSections = documentationForValidation.sections;

    if (stage4Response.ok) {
      const stage4Data = await stage4Response.json();
      const validationData = await parseJSONWithRetry(
        GROQ_API_KEY,
        stage4Data.choices?.[0]?.message?.content || '{}',
        'Ensure the output is valid JSON with validation results and refined sections'
      );
      validationResults = validationData.validation_results;
      
      // Use refined sections if validation found issues
      if (validationData.refined_sections && validationData.refined_sections.length > 0 && 
          validationResults?.overall_score < 85) {
        refinedSections = validationData.refined_sections;
        console.log(`Quality improvements applied (score: ${validationResults?.overall_score})`);
      }
    } else {
      console.log('Stage 4 validation skipped due to API error, using original content');
    }
    
    // Combine all stages into final documentation
    const finalDoc = {
      title: documentationForValidation.title,
      description: documentationForValidation.description,
      sections: refinedSections,
      metadata: finalMetadata.metadata || {},
      searchability: finalMetadata.searchability || {},
      validation: validationResults,
      theme: theme,
      extractedStructure: extractedStructure
    };
    
    const title = finalDoc.title;
    const description = finalDoc.description;
    
    // Save to database (store as JSON string for now)
    const documentation = await storage.createDocumentation({
      url,
      title,
      content: JSON.stringify(finalDoc),
      user_id: req.user?.id || null,
    });

    console.log("Documentation generated successfully with 4-stage AI pipeline (Extract → Write → Metadata → Quality Check)");

    res.json({
      id: documentation.id,
      title: documentation.title,
      description: description,
      sections: finalDoc.sections || [],
      url: documentation.url,
      generatedAt: documentation.generatedAt,
      theme: theme,
      metadata: finalDoc.metadata,
      searchability: finalDoc.searchability,
    });
  } catch (error) {
    console.error('Error in generate-docs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get all documentations
router.get("/api/documentations", verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const docs = await storage.getAllDocumentations(userId);
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documentations:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch documentations'
    });
  }
});

// Get single documentation
router.get("/api/documentations/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching documentation:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch documentation'
    });
  }
});

// Export documentation as JSON
router.get("/api/export/json/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(doc.content);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9]/gi, '_')}.json"`);
    res.json(parsedContent);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

// Export documentation as Markdown
router.get("/api/export/markdown/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(doc.content);
    const theme = parsedContent.theme || {};

    // Add YAML frontmatter with theme metadata
    let markdown = `---\n`;
    markdown += `title: "${parsedContent.title}"\n`;
    if (parsedContent.description) {
      markdown += `description: "${parsedContent.description}"\n`;
    }
    markdown += `theme:\n`;
    markdown += `  primaryColor: "${theme.primaryColor || '#8B5CF6'}"\n`;
    markdown += `  secondaryColor: "${theme.secondaryColor || '#6366F1'}"\n`;
    markdown += `  accentColor: "${theme.accentColor || '#8B5CF6'}"\n`;
    markdown += `  primaryFont: "${theme.primaryFont || 'Inter, system-ui, sans-serif'}"\n`;
    if (theme.colors && theme.colors.length > 0) {
      markdown += `  colors:\n`;
      theme.colors.forEach((color: string) => {
        markdown += `    - "${color}"\n`;
      });
    }
    if (theme.fonts && theme.fonts.length > 0) {
      markdown += `  fonts:\n`;
      theme.fonts.forEach((font: string) => {
        markdown += `    - "${font}"\n`;
      });
    }
    markdown += `---\n\n`;
    
    markdown += `# ${parsedContent.title}\n\n`;
    
    if (parsedContent.description) {
      markdown += `${parsedContent.description}\n\n`;
    }
    
    parsedContent.sections?.forEach((section: any) => {
      markdown += `## ${section.title}\n\n`;
      section.content?.forEach((block: any) => {
        switch (block.type) {
          case 'paragraph':
            markdown += `${block.text}\n\n`;
            break;
          case 'heading':
            markdown += `${'#'.repeat(block.level || 3)} ${block.text}\n\n`;
            break;
          case 'list':
            block.items?.forEach((item: string) => {
              markdown += `- ${item}\n`;
            });
            markdown += '\n';
            break;
          case 'code':
            markdown += `\`\`\`${block.language || ''}\n${block.code || block.text}\n\`\`\`\n\n`;
            break;
          case 'image':
            markdown += `![${block.alt || 'Image'}](${block.url})\n`;
            if (block.caption) markdown += `*${block.caption}*\n`;
            markdown += '\n';
            break;
        }
      });
    });
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9]/gi, '_')}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('Error exporting Markdown:', error);
    res.status(500).json({ error: 'Failed to export Markdown' });
  }
});

// Export documentation as HTML
router.get("/api/export/html/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(doc.content);
    const theme = parsedContent.theme || {};
    const primaryColor = theme.primaryColor || '#8B5CF6';
    const secondaryColor = theme.secondaryColor || '#6366F1';
    const primaryFont = theme.primaryFont || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsedContent.title}</title>
  <style>
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --primary-font: ${primaryFont};
    }
    body { 
      font-family: var(--primary-font); 
      line-height: 1.6; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px; 
      color: #333; 
    }
    h1 { 
      border-bottom: 3px solid var(--primary-color); 
      padding-bottom: 10px; 
      color: var(--primary-color);
    }
    h2 { 
      color: var(--primary-color); 
      margin-top: 30px; 
    }
    h3 { 
      color: var(--secondary-color); 
    }
    code { 
      background: #f4f4f4; 
      padding: 2px 6px; 
      border-radius: 3px; 
      font-family: 'Courier New', monospace; 
    }
    pre { 
      background: #1e1e1e; 
      color: #d4d4d4; 
      padding: 15px; 
      border-radius: 5px; 
      overflow-x: auto; 
    }
    img { 
      max-width: 100%; 
      height: auto; 
      border-radius: 8px; 
    }
    ul { 
      padding-left: 20px; 
    }
    a { 
      color: var(--primary-color); 
    }
    .callout {
      border-left: 4px solid var(--primary-color);
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 4px;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <h1>${parsedContent.title}</h1>
  ${parsedContent.description ? `<p><em>${parsedContent.description}</em></p>` : ''}
`;
    
    parsedContent.sections?.forEach((section: any) => {
      html += `  <h2>${section.title}</h2>\n`;
      section.content?.forEach((block: any) => {
        switch (block.type) {
          case 'paragraph':
            html += `  <p>${block.text}</p>\n`;
            break;
          case 'heading':
            html += `  <h${block.level || 3}>${block.text}</h${block.level || 3}>\n`;
            break;
          case 'list':
            html += '  <ul>\n';
            block.items?.forEach((item: string) => {
              html += `    <li>${item}</li>\n`;
            });
            html += '  </ul>\n';
            break;
          case 'code':
            html += `  <pre><code>${block.code || block.text}</code></pre>\n`;
            break;
          case 'image':
            html += `  <figure>\n    <img src="${block.url}" alt="${block.alt || 'Image'}">\n`;
            if (block.caption) html += `    <figcaption>${block.caption}</figcaption>\n`;
            html += '  </figure>\n';
            break;
        }
      });
    });
    
    html += `</body>\n</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9]/gi, '_')}.html"`);
    res.send(html);
  } catch (error) {
    console.error('Error exporting HTML:', error);
    res.status(500).json({ error: 'Failed to export HTML' });
  }
});

// Export documentation as PDF
router.get("/api/export/pdf/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(doc.content);
    const theme = parsedContent.theme || {};

    // Helper function to convert color to hex format for PDFKit
    const toHexColor = (color: string): string => {
      if (!color) return '#8B5CF6';
      
      // If already hex, return as is
      if (color.startsWith('#')) return color;
      
      // If rgb/rgba, convert to hex
      if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]).toString(16).padStart(2, '0');
          const g = parseInt(matches[1]).toString(16).padStart(2, '0');
          const b = parseInt(matches[2]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
      
      // If hsl/hsla, convert to hex
      if (color.startsWith('hsl')) {
        const matches = color.match(/[\d.]+/g);
        if (matches && matches.length >= 3) {
          const h = parseFloat(matches[0]) / 360;
          const s = parseFloat(matches[1]) / 100;
          const l = parseFloat(matches[2]) / 100;
          
          // HSL to RGB conversion
          let r, g, b;
          if (s === 0) {
            r = g = b = l;
          } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          
          const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }
      }
      
      return '#8B5CF6';
    };
    
    const primaryColor = toHexColor(theme.primaryColor || '#8B5CF6');
    const secondaryColor = toHexColor(theme.secondaryColor || '#6366F1');
    
    const pdfDoc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    
    pdfDoc.pipe(res);
    
    // Title with theme color
    pdfDoc.fontSize(24).fillColor(primaryColor).text(parsedContent.title, { align: 'left' });
    pdfDoc.moveDown();
    
    // Description
    if (parsedContent.description) {
      pdfDoc.fontSize(12).fillColor('#333333').text(parsedContent.description, { align: 'left' });
      pdfDoc.moveDown();
    }
    
    // Sections
    parsedContent.sections?.forEach((section: any) => {
      pdfDoc.fontSize(18).fillColor(primaryColor).text(section.title, { underline: true });
      pdfDoc.moveDown(0.5);
      
      section.content?.forEach((block: any) => {
        switch (block.type) {
          case 'paragraph':
            pdfDoc.fontSize(11).fillColor('#333333').text(block.text, { align: 'left' });
            pdfDoc.moveDown(0.5);
            break;
          case 'heading':
            pdfDoc.fontSize(14).fillColor(secondaryColor).text(block.text, { bold: true });
            pdfDoc.moveDown(0.3);
            break;
          case 'list':
            block.items?.forEach((item: string) => {
              pdfDoc.fontSize(11).fillColor('#333333').text(`• ${item}`, { indent: 20 });
            });
            pdfDoc.moveDown(0.5);
            break;
          case 'code':
            pdfDoc.fontSize(9).fillColor('#1e1e1e').font('Courier').text(block.code || block.text);
            pdfDoc.font('Helvetica');
            pdfDoc.moveDown(0.5);
            break;
        }
      });
      pdfDoc.moveDown();
    });
    
    pdfDoc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export documentation as DOCX
router.get("/api/export/docx/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const docData = await storage.getDocumentation(id);
    if (!docData) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.id;
    if (docData.user_id && userId && docData.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(docData.content);
    const paragraphs: any[] = [];
    
    // Title
    paragraphs.push(
      new Paragraph({
        text: parsedContent.title,
        heading: HeadingLevel.HEADING_1,
      })
    );
    
    // Description
    if (parsedContent.description) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: parsedContent.description, italics: true })],
        })
      );
    }
    
    // Sections
    parsedContent.sections?.forEach((section: any) => {
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
        })
      );
      
      section.content?.forEach((block: any) => {
        switch (block.type) {
          case 'paragraph':
            paragraphs.push(new Paragraph({ text: block.text }));
            break;
          case 'heading':
            paragraphs.push(
              new Paragraph({
                text: block.text,
                heading: HeadingLevel.HEADING_3,
              })
            );
            break;
          case 'list':
            block.items?.forEach((item: string) => {
              paragraphs.push(
                new Paragraph({
                  text: `• ${item}`,
                  bullet: { level: 0 },
                })
              );
            });
            break;
          case 'code':
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.code || block.text,
                    font: 'Courier New',
                  }),
                ],
              })
            );
            break;
        }
      });
    });
    
    const docx = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });
    
    const buffer = await Packer.toBuffer(docx);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${docData.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting DOCX:', error);
    res.status(500).json({ error: 'Failed to export DOCX' });
  }
});

router.get('/api/export/batch/:id', verifySupabaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const docData = await storage.getDocumentation(parseInt(id, 10));

    if (!docData) {
      return res.status(404).json({ error: 'Documentation not found' });
    }

    const userId = req.user?.id;
    if (docData.user_id && userId && docData.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const filename = docData.title.replace(/[^a-z0-9]/gi, '_');
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_documentation.zip"`);
    
    archive.pipe(res);

    const theme = docData.theme || {};
    
    const generateMarkdown = () => {
      let markdown = `---\ntitle: ${docData.title}\n`;
      
      if (theme.colors?.length > 0) {
        markdown += `theme:\n  primaryColor: ${theme.primaryColor || theme.colors[0]}\n`;
        markdown += `  colors: ${JSON.stringify(theme.colors)}\n`;
      }
      if (theme.fonts?.length > 0) {
        markdown += `  fonts: ${JSON.stringify(theme.fonts)}\n`;
      }
      
      markdown += `---\n\n# ${docData.title}\n\n`;
      
      if (docData.description) {
        markdown += `${docData.description}\n\n`;
      }
      
      docData.sections?.forEach((section: any) => {
        markdown += `## ${section.title}\n\n`;
        
        section.content?.forEach((block: any) => {
          switch (block.type) {
            case 'paragraph':
              markdown += `${block.text}\n\n`;
              break;
            case 'heading':
              const level = '#'.repeat(Math.min(block.level || 2, 6));
              markdown += `${level} ${block.text}\n\n`;
              break;
            case 'list':
              block.items?.forEach((item: string) => {
                markdown += `- ${item}\n`;
              });
              markdown += '\n';
              break;
            case 'code':
              markdown += `\`\`\`${block.language || ''}\n${block.code || block.text}\n\`\`\`\n\n`;
              break;
          }
        });
      });
      
      return markdown;
    };

    const generateHTML = () => {
      const primaryColor = theme.primaryColor || '#8B5CF6';
      const secondaryColor = theme.secondaryColor || '#6366F1';
      const primaryFont = theme.primaryFont || 'Inter, system-ui, sans-serif';
      
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docData.title}</title>
  <style>
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --font-family: ${primaryFont};
    }
    body {
      font-family: var(--font-family);
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 { color: var(--primary-color); font-size: 2.5rem; margin-bottom: 1rem; }
    h2 { color: var(--primary-color); font-size: 2rem; margin-top: 2rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem; }
    h3 { color: var(--secondary-color); font-size: 1.5rem; margin-top: 1.5rem; }
    code { background: #f4f4f4; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <h1>${docData.title}</h1>`;
      
      if (docData.description) {
        html += `<p>${docData.description}</p>`;
      }
      
      docData.sections?.forEach((section: any) => {
        html += `<h2>${section.title}</h2>`;
        section.content?.forEach((block: any) => {
          if (block.type === 'paragraph') {
            html += `<p>${block.text}</p>`;
          } else if (block.type === 'code') {
            html += `<pre><code>${block.code || block.text}</code></pre>`;
          }
        });
      });
      
      html += '</body></html>';
      return html;
    };

    const generateJSON = () => {
      return JSON.stringify({
        title: docData.title,
        description: docData.description,
        sections: docData.sections,
        theme: theme,
        metadata: {
          generatedAt: docData.generatedAt,
          sourceUrl: docData.url
        }
      }, null, 2);
    };

    archive.append(generateMarkdown(), { name: `${filename}.md` });
    archive.append(generateHTML(), { name: `${filename}.html` });
    archive.append(generateJSON(), { name: `${filename}.json` });
    
    await archive.finalize();
  } catch (error) {
    console.error('Error creating batch export:', error);
    res.status(500).json({ error: 'Failed to create batch export' });
  }
});

export default router;
