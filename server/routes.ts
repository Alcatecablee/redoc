import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertDocumentationSchema } from "@shared/schema";
import { generateDocumentationPipeline } from './generator';
import archiver from "archiver";
import { progressTracker } from './progress-tracker';
import { v4 as uuidv4 } from 'uuid';
import themesRouter from './routes/themes';
import extractThemeRouter from './routes/extract-theme';
import subscriptionsRouter from './routes/subscriptions';
import apiKeysRouter from './routes/api-keys';
import webhooksRouter from './routes/webhooks';
import supportRouter from './routes/support';
import organizationsRouter from './routes/organizations';
import billingRouter from './routes/billing';
import activityRouter from './routes/activity';
import enterpriseRouter from './routes/enterprise';
import jobsRouter from './routes/jobs';
import healthRouter from './routes/health';
import versionsRouter from './routes/versions';
import incrementalUpdatesRouter from './routes/incremental-updates';
import searchRouter from './routes/search';
import analyticsRouter from './routes/analytics';
import auditRouter from './routes/audit';
import dashboardRouter from './routes/dashboard';
import validationRouter from './routes/validation';
import adminRouter from './routes/admin';
import { fetchImagesForExport, limitImagesForExport } from './image-utils';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { canGenerateDocumentation, calculateSmartScaling, enforceTierLimits } from './tier-config';
import { idempotencyMiddleware, generateIdempotencyKey } from './middleware/idempotency';
import { validate } from './middleware/validation';
import { generateDocsSchema } from './validation/schemas';
import { verifySupabaseAuth, verifyApiKey } from './middleware/auth';

// Guard against undefined db
function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Auth functions moved to ./middleware/auth.ts to avoid circular dependencies

// Legacy API Key Authentication for backward compatibility
async function legacyVerifyApiKey(req: any, res: any, next: any) {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({ 
        error: 'Unauthorized: missing API key',
        message: 'Please provide your API key in the X-API-Key header'
      });
    }

    const database = ensureDb();
    const userResults = await database.select().from(users).where(eq(users.api_key, apiKey));
    
    if (userResults.length === 0) {
      return res.status(401).json({ 
        error: 'Unauthorized: invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    const user = userResults[0];
    
    // Check if user is on Enterprise plan
    if (user.plan !== 'enterprise') {
      return res.status(403).json({ 
        error: 'Forbidden: API access requires Enterprise plan',
        message: 'Please upgrade to Enterprise to use the API',
        upgradeUrl: '/pricing'
      });
    }

    // Check subscription status
    if (user.subscription_status !== 'active') {
      return res.status(403).json({ 
        error: 'Forbidden: inactive subscription',
        message: `Your subscription is ${user.subscription_status}. Please reactivate to use the API.`
      });
    }

    // Attach user info to request
    req.apiUser = {
      id: user.id,
      email: user.email,
      plan: user.plan,
      api_usage: user.api_usage,
      balance: user.balance
    };

    return next();
  } catch (err: any) {
    console.error('Error verifying API key', err);
    return res.status(500).json({ error: 'API key verification failed' });
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
        // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5',
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

// SSE endpoint for progress updates
router.get("/api/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const onProgress = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  progressTracker.on(`progress:${sessionId}`, onProgress);

  req.on('close', () => {
    progressTracker.off(`progress:${sessionId}`, onProgress);
    progressTracker.endSession(sessionId);
  });
});

// Generate documentation endpoint
router.post("/api/generate-docs", 
  verifySupabaseAuth,
  validate(generateDocsSchema, 'body'),
  idempotencyMiddleware({ 
    ttlSeconds: 86400,
    generateKey: generateIdempotencyKey
  }), 
  async (req, res) => {
  try {
    // Log incoming request for debugging
    console.log('/api/generate-docs called', {
      headers: Object.keys(req.headers).reduce((acc: any, key) => ({ ...acc, [key]: req.headers[key] }), {}),
      body: req.body,
      ip: req.ip,
    });

    const { url, sessionId: clientSessionId, subdomain: requestedSubdomain } = req.body;

    if (!url) {
      console.warn('generate-docs: missing url in request body');
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      console.warn('generate-docs: invalid url format', url, err?.message || err);
      return res.status(400).json({ error: "Invalid URL format", details: String(url) });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!OPENAI_API_KEY && !GROQ_API_KEY && !DEEPSEEK_API_KEY) {
      console.error('generate-docs: No AI provider API key configured');
      return res.status(500).json({ error: "AI provider API key is not configured (GROQ/OPENAI/DEEPSEEK)" });
    }

    // Use client-provided sessionId or generate one
    const sessionId = clientSessionId || uuidv4();
    progressTracker.createSession(sessionId);

    try {
      const userId = req.user?.databaseId || null;
      const userEmail = req.user?.email || null;

      // Tier enforcement: Check user's plan and limits
      let userPlan = 'free';
      let generationCount = 0;
      let upgradeSuggestion: string | undefined;

      if (userEmail) {
        const database = ensureDb();
        const existingUsers = await database.select().from(users).where(eq(users.email, userEmail));
        
        if (existingUsers.length > 0) {
          const user = existingUsers[0];
          userPlan = user.plan || 'free';
          generationCount = user.generation_count || 0;
        } else {
          // Create new free user
          await database.insert(users).values({
            email: userEmail,
            plan: 'free',
            generation_count: 0
          });
        }

        // Check if user can generate documentation based on tier limits
        const canGenerate = canGenerateDocumentation(userPlan, generationCount);
        if (!canGenerate.allowed) {
          progressTracker.endSession(sessionId, 'error');
          return res.status(403).json({ 
            error: canGenerate.reason,
            plan: userPlan,
            generationCount,
            upgradeUrl: '/pricing'
          });
        }
      }

      // Calculate smart scaling recommendation (will be applied in pipeline)
      // For now, we'll pass tier info to the pipeline
      const tierInfo = {
        plan: userPlan,
        userEmail
      };

      // Prefer enhanced research-driven pipeline; fallback to legacy flow only if it fails
      try {
        const result = await generateDocumentationPipeline(url, userId, sessionId, userPlan);
        
        // Save documentation and update user count atomically in transaction
        const { createDocumentationWithTransaction, cleanupFailedGeneration } = await import('./utils/documentation-transaction');
        
        try {
          const { documentation } = await createDocumentationWithTransaction({
            documentationData: result.documentationData as any,
            userEmail,
            metadata: {
              url,
              userPlan,
              sessionId,
            },
          });

          const parsed = JSON.parse(documentation.content);
          progressTracker.endSession(sessionId, 'complete');

          return res.json({
            id: documentation.id,
            title: documentation.title,
            description: parsed.description,
            sections: parsed.sections || [],
            url: documentation.url,
            generatedAt: documentation.generatedAt,
            theme: parsed.theme,
            metadata: parsed.metadata,
            searchability: parsed.searchability,
            sessionId: sessionId,
          });
        } catch (transactionError: any) {
          console.error('❌ Transaction failed:', transactionError);
          // Clean up orphaned resources
          await cleanupFailedGeneration(sessionId);
          throw transactionError;
        }
      } catch (e: any) {
        console.error('Enhanced pipeline failed, continuing with legacy flow:', e?.message || e);
        // Don't end session yet, let legacy flow continue
      }

    // Fetch website content
    console.log("Fetching website content for:", url);
    const websiteResponse = await fetch(url).catch((fetchErr) => {
      console.error('generate-docs: fetch failed', fetchErr?.message || fetchErr);
      return null as any;
    });

    if (!websiteResponse) {
      return res.status(500).json({ error: 'Failed to fetch website: network error' });
    }

    if (!websiteResponse.ok) {
      const text = await websiteResponse.text().catch(() => websiteResponse.statusText);
      console.error('generate-docs: fetch returned non-ok', websiteResponse.status, text);
      return res.status(500).json({ error: `Failed to fetch website: ${websiteResponse.status} ${websiteResponse.statusText}`, details: text });
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
    const stage1Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
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
        response_format: { type: "json_object" }
      }),
    });

    if (!stage1Response.ok) {
      const errorText = await stage1Response.text().catch(() => '');
      const statusMsg = stage1Response.statusText || '';
      const snippet = (errorText || '').slice(0, 500);
      console.error('Stage 1 failed:', stage1Response.status, statusMsg, snippet);
      return res.status(500).json({
        error: `Structure extraction failed: ${statusMsg || stage1Response.status}`,
        details: snippet
      });
    }

    const stage1Data = await stage1Response.json();
    const extractedStructure = await parseJSONWithRetry(
      OPENAI_API_KEY,
      stage1Data.choices?.[0]?.message?.content || '{}',
      'Ensure the output is valid JSON matching the structure extraction format'
    );
    
    console.log("Stage 2: Writing professional documentation...");

    // STAGE 2: Professional Documentation Writing
    const stage2Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
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
        response_format: { type: "json_object" }
      }),
    });

    if (!stage2Response.ok) {
      const errorText = await stage2Response.text().catch(() => '');
      const statusMsg = stage2Response.statusText || '';
      const snippet = (errorText || '').slice(0, 500);
      console.error('Stage 2 failed:', stage2Response.status, statusMsg, snippet);
      return res.status(500).json({
        error: `Documentation writing failed: ${statusMsg || stage2Response.status}`,
        details: snippet
      });
    }

    const stage2Data = await stage2Response.json();
    const writtenDocs = await parseJSONWithRetry(
      OPENAI_API_KEY,
      stage2Data.choices?.[0]?.message?.content || '{}',
      'Ensure the output is valid JSON with proper documentation structure'
    );
    
    console.log("Stage 3: Generating metadata and SEO optimization...");

    // STAGE 3: Metadata Generation & Export Formatting
    const stage3Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
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
        response_format: { type: "json_object" }
      }),
    });

    if (!stage3Response.ok) {
      const errorText = await stage3Response.text().catch(() => '');
      const statusMsg = stage3Response.statusText || '';
      const snippet = (errorText || '').slice(0, 500);
      console.error('Stage 3 failed:', stage3Response.status, statusMsg, snippet);
      return res.status(500).json({
        error: `Metadata generation failed: ${statusMsg || stage3Response.status}`,
        details: snippet
      });
    }

    const stage3Data = await stage3Response.json();
    const finalMetadata = await parseJSONWithRetry(
      OPENAI_API_KEY,
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

    const stage4Response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5',
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
        response_format: { type: "json_object" }
      }),
    });

    let validationResults = null;
    let refinedSections = documentationForValidation.sections;

    if (stage4Response.ok) {
      const stage4Data = await stage4Response.json();
      const validationData = await parseJSONWithRetry(
        OPENAI_API_KEY,
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
    
    // Save to database
    const documentation = await storage.createDocumentation({
      url,
      title,
      content: JSON.stringify(finalDoc),
      user_id: req.user?.databaseId || null,
    } as any);

    console.log("Documentation generated successfully with 4-stage AI pipeline (Extract → Write �� Metadata → Quality Check)");

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
    } finally {
      // Ensure session is always cleaned up, even on errors
      if (sessionId) {
        progressTracker.endSession(sessionId, 'error');
      }
    }
  } catch (error) {
    console.error('Error in generate-docs (outer):', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Enqueue generate-docs (background)
router.post("/api/generate-docs-enqueue", 
  verifySupabaseAuth,
  validate(generateDocsSchema, 'body'),
  idempotencyMiddleware({ 
    ttlSeconds: 86400,
    generateKey: generateIdempotencyKey
  }), 
  async (req, res) => {
  try {
    const { url, sessionId, subdomain: requestedSubdomain } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }

    const userId = req.user?.databaseId || null;
    const { getUnifiedQueue } = await import('./queue/unified-queue');
    const queue = getUnifiedQueue();
    const job = await queue.enqueue('generate-docs', { url, userId, sessionId, subdomain: requestedSubdomain, userPlan: 'free' });

    res.json({ jobId: job.id, status: job.status });
  } catch (error) {
    console.error('Failed to enqueue generate-docs job', error);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
});

// Get all documentations
router.get("/api/documentations", verifySupabaseAuth, async (req, res) => {
  try {
    const userId = req.user?.databaseId || null;
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

    const userId = req.user?.databaseId;
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

// Delete documentation
router.delete("/api/documentations/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const existing = await storage.getDocumentation(id);
    if (!existing) {
      return res.status(404).json({ error: 'Documentation not found' });
    }

    const userId = req.user?.databaseId;
    if (existing.user_id && userId && existing.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await storage.deleteDocumentation(id, userId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete documentation' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting documentation:', error);
    res.status(500).json({ error: 'Failed to delete documentation' });
  }
});

// Get user profile with subscription details
router.get("/api/user/profile", verifySupabaseAuth, async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Email not found in token' });
    }

    const database = ensureDb();
    const existingUsers = await database.select().from(users).where(eq(users.email, userEmail));
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = existingUsers[0];
    
    // Return user profile with subscription details
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      subscription_id: user.subscription_id,
      subscription_status: user.subscription_status,
      generation_count: user.generation_count,
      api_key: user.plan === 'enterprise' ? user.api_key : null,
      api_usage: user.api_usage,
      balance: user.balance,
      last_reset_at: user.last_reset_at,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user profile'
    });
  }
});

// Enterprise API: Generate documentation with API key authentication
router.post("/api/v1/generate", verifyApiKey, async (req, res) => {
  try {
    console.log('/api/v1/generate called with API key auth');

    const { url, subdomain } = req.body;

    if (!url) {
      return res.status(400).json({ 
        error: "URL is required",
        message: "Please provide a 'url' field in the request body"
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ 
        error: "Invalid URL format", 
        message: "Please provide a valid HTTP/HTTPS URL" 
      });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (!OPENAI_API_KEY && !GROQ_API_KEY && !DEEPSEEK_API_KEY) {
      console.error('Enterprise API: No AI provider API key configured');
      return res.status(500).json({ 
        error: "AI provider not configured",
        message: "Please contact support - AI service configuration issue"
      });
    }

    const sessionId = uuidv4();
    progressTracker.createSession(sessionId);

    try {
      const apiUser = req.apiUser;
      const userId = apiUser.id.toString();
      const userEmail = apiUser.email;

      // Enterprise users always get unlimited generations
      const userPlan = 'enterprise';

      // Generate documentation using enterprise tier
      const result = await generateDocumentationPipeline(url, userId, sessionId, userPlan);
      const parsed = JSON.parse(result.documentation.content);

      // Track API usage (simplified - you can add token counting here)
      const database = ensureDb();
      await database.update(users)
        .set({ 
          api_usage: apiUser.api_usage + 1000, // Increment by estimated tokens
          updated_at: new Date()
        })
        .where(eq(users.id, apiUser.id));

      progressTracker.endSession(sessionId, 'completed');

      // Return enterprise-friendly API response
      res.json({
        success: true,
        documentation: {
          id: result.documentation.id,
          title: parsed.title,
          description: parsed.description,
          url: url,
          sections: parsed.sections,
          generated_at: result.documentation.generatedAt,
          format: 'json'
        },
        meta: {
          session_id: sessionId,
          api_usage: apiUser.api_usage + 1000,
          plan: 'enterprise'
        }
      });
    } catch (error: any) {
      console.error('Enterprise API generation error:', error);
      progressTracker.endSession(sessionId, 'error');

      res.status(500).json({
        error: 'Documentation generation failed',
        message: error?.message || 'An unexpected error occurred',
        session_id: sessionId
      });
    }
  } catch (error: any) {
    console.error('Enterprise API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'An unexpected error occurred'
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

    const userId = req.user?.databaseId;
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

    const userId = req.user?.databaseId;
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
    
    // Helper: flexible citations structure can be an object (by section) or an array
    const _citationsRoot = parsedContent.citations || parsedContent.source_citations || {};

    parsedContent.sections?.forEach((section: any) => {
      markdown += `## ${section.title}\n\n`;
      // Render section blocks
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

      // Collect citations for this section from multiple possible structures
      let sectionCites: any[] = [];
      try {
        if (Array.isArray(_citationsRoot)) {
          // global list - include all (caller can trim later)
          sectionCites = _citationsRoot;
        } else if (_citationsRoot) {
          if (section.id && _citationsRoot[section.id]) sectionCites.push(..._citationsRoot[section.id]);
          if (section.title && _citationsRoot[section.title]) sectionCites.push(..._citationsRoot[section.title]);
          if (_citationsRoot.sections && section.id && _citationsRoot.sections[section.id]) sectionCites.push(..._citationsRoot.sections[section.id]);
        }
        if (section.citations && Array.isArray(section.citations)) sectionCites.push(...section.citations);
      } catch (e) {
        // ignore malformed citation structures
      }

      // Deduplicate and normalize
      const seen = new Set();
      const normalized: string[] = [];
      sectionCites.forEach((c: any) => {
        if (!c) return;
        let s = '';
        if (typeof c === 'string') s = c;
        else if (c.url && c.title) s = `[${c.title}](${c.url})`;
        else if (c.url) s = c.url;
        else s = JSON.stringify(c);
        if (!seen.has(s)) { seen.add(s); normalized.push(s); }
      });

      if (normalized.length > 0) {
        markdown += `**Sources:**\n\n`;
        normalized.forEach((s) => {
          markdown += `- ${s}\n`;
        });
        markdown += '\n';
      }
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

    const userId = req.user?.databaseId;
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
    
    const _citationsRoot = parsedContent.citations || parsedContent.source_citations || {};

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

      // Collect citations for this section
      let sectionCites: any[] = [];
      try {
        if (Array.isArray(_citationsRoot)) {
          sectionCites = _citationsRoot;
        } else if (_citationsRoot) {
          if (section.id && _citationsRoot[section.id]) sectionCites.push(..._citationsRoot[section.id]);
          if (section.title && _citationsRoot[section.title]) sectionCites.push(..._citationsRoot[section.title]);
          if (_citationsRoot.sections && section.id && _citationsRoot.sections[section.id]) sectionCites.push(..._citationsRoot.sections[section.id]);
        }
        if (section.citations && Array.isArray(section.citations)) sectionCites.push(...section.citations);
      } catch (e) {}

      const seen = new Set();
      const normalized: string[] = [];
      sectionCites.forEach((c: any) => {
        if (!c) return;
        let s = '';
        if (typeof c === 'string') s = c;
        else if (c.title && c.url) s = `<a href="${c.url}">${c.title}</a>`;
        else if (c.url) s = `<a href="${c.url}">${c.url}</a>`;
        else s = `<code>${JSON.stringify(c)}</code>`;
        if (!seen.has(s)) { seen.add(s); normalized.push(s); }
      });

      if (normalized.length > 0) {
        html += '  <div class="callout">\n    <strong>Sources:</strong>\n    <ul>\n';
        normalized.forEach((s) => { html += `      <li>${s}</li>\n`; });
        html += '    </ul>\n  </div>\n';
      }
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
    const pdfModule = await import('pdfkit');
    const PDFDocument = (pdfModule && (pdfModule.default || pdfModule)) as any;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.databaseId;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(doc.content);
    const theme = parsedContent.theme || {};
    
    // Apply image count limit to prevent bloated PDFs
    const { sections: limitedSections } = limitImagesForExport(parsedContent.sections || [], 30);
    parsedContent.sections = limitedSections;

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
    
    // Collect all image blocks for parallel fetching
    const allImageBlocks: Array<{ url: string; alt?: string; caption?: string; width?: number; height?: number }> = [];
    for (const section of parsedContent.sections || []) {
      for (const block of section.content || []) {
        if (block.type === 'image' && block.url) {
          allImageBlocks.push(block);
        }
      }
    }
    
    // Fetch all images in parallel (much faster!)
    console.log(`📥 Fetching ${allImageBlocks.length} images in parallel for PDF export...`);
    const imageBuffers = await fetchImagesForExport(allImageBlocks, 5000, 10);
    console.log(`✅ Successfully fetched ${imageBuffers.size}/${allImageBlocks.length} images`);
    
    // Process sections with pre-fetched images
    const processSections = async () => {
      for (const section of parsedContent.sections || []) {
        pdfDoc.fontSize(18).fillColor(primaryColor).text(section.title, { underline: true });
        pdfDoc.moveDown(0.5);
        
        for (const block of section.content || []) {
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
            case 'image':
              try {
                const imageUrl = block.url;
                if (!imageUrl) break;
                
                // Get pre-fetched image buffer
                const buffer = imageBuffers.get(imageUrl);
                if (!buffer) {
                  console.warn(`Image not available in cache: ${imageUrl}`);
                  break;
                }
                
                const pageWidth = pdfDoc.page.width - pdfDoc.page.margins.left - pdfDoc.page.margins.right;
                const maxImageWidth = pageWidth * 0.9;
                const maxImageHeight = 400;
                
                let imageOptions: any = { fit: [maxImageWidth, maxImageHeight], align: 'center' };
                
                if (block.width && block.height) {
                  const aspectRatio = block.width / block.height;
                  let finalWidth = Math.min(block.width, maxImageWidth);
                  let finalHeight = finalWidth / aspectRatio;
                  
                  if (finalHeight > maxImageHeight) {
                    finalHeight = maxImageHeight;
                    finalWidth = finalHeight * aspectRatio;
                  }
                  
                  imageOptions = { width: finalWidth, align: 'center' };
                }
                
                pdfDoc.image(buffer, imageOptions);
                pdfDoc.moveDown(0.3);
                
                if (block.caption || block.alt) {
                  pdfDoc.fontSize(9).fillColor('#666666').text(block.caption || block.alt, { align: 'center', italics: true });
                  pdfDoc.moveDown(0.5);
                }
                
                pdfDoc.fillColor('#333333');
              } catch (error) {
                console.error(`Error embedding image in PDF: ${block.url}`, error);
              }
              break;
          }
        }
        pdfDoc.moveDown();
      }
    };
    
    await processSections();
    pdfDoc.end();
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export documentation as DOCX
router.get("/api/export/docx/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const docxModule = await import('docx');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } = docxModule as any;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const docData = await storage.getDocumentation(id);
    if (!docData) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.databaseId;
    if (docData.user_id && userId && docData.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedContent = JSON.parse(docData.content);
    
    // Apply image count limit to prevent bloated DOCX files
    const { sections: limitedSections } = limitImagesForExport(parsedContent.sections || [], 30);
    parsedContent.sections = limitedSections;
    
    // Collect all image blocks for parallel fetching
    const allImageBlocks: Array<{ url: string; alt?: string; caption?: string; width?: number; height?: number }> = [];
    for (const section of parsedContent.sections || []) {
      for (const block of section.content || []) {
        if (block.type === 'image' && block.url) {
          allImageBlocks.push(block);
        }
      }
    }
    
    // Fetch all images in parallel (much faster!)
    console.log(`📥 Fetching ${allImageBlocks.length} images in parallel for DOCX export...`);
    const imageBuffers = await fetchImagesForExport(allImageBlocks, 5000, 10);
    console.log(`✅ Successfully fetched ${imageBuffers.size}/${allImageBlocks.length} images`);
    
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
    
    // Process sections with pre-fetched images
    for (const section of parsedContent.sections || []) {
      paragraphs.push(
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_2,
        })
      );
      
      for (const block of section.content || []) {
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
          case 'image':
            try {
              const imageUrl = block.url;
              if (!imageUrl) break;
              
              // Get pre-fetched image buffer
              const buffer = imageBuffers.get(imageUrl);
              if (!buffer) {
                console.warn(`Image not available in cache: ${imageUrl}`);
                break;
              }
              
              const maxWidth = 600;
              const maxHeight = 400;
              
              let width = block.width || maxWidth;
              let height = block.height || maxHeight;
              
              if (block.width && block.height) {
                const aspectRatio = block.width / block.height;
                if (width > maxWidth) {
                  width = maxWidth;
                  height = width / aspectRatio;
                }
                if (height > maxHeight) {
                  height = maxHeight;
                  width = height * aspectRatio;
                }
              } else {
                width = maxWidth;
                height = maxHeight;
              }
              
              paragraphs.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: buffer,
                      transformation: {
                        width: Math.round(width),
                        height: Math.round(height),
                      },
                      altText: { title: block.alt || 'Image', description: block.caption || block.alt || '' },
                    }),
                  ],
                })
              );
              
              if (block.caption || block.alt) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: block.caption || block.alt,
                        italics: true,
                        size: 18,
                        color: '666666',
                      }),
                    ],
                  })
                );
              }
              
              paragraphs.push(new Paragraph({ text: '' }));
            } catch (error) {
              console.error(`Error embedding image in DOCX: ${block.url}`, error);
            }
            break;
        }
      }
    }
    
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

    const userId = req.user?.databaseId;
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

// Helper function to generate subdomain
function generateSubdomain(url: string, title?: string): string {
  try {
    const urlObj = new URL(url);
    let base = urlObj.hostname
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
      
    if (title) {
      base = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 20);
    }
    
    const random = Math.random().toString(36).substring(2, 8);
    let subdomain = `${base}-${random}`
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 50);
    
    if (subdomain.length < 3) {
      subdomain = `docs-${random}`;
    }
    
    if (!/^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/.test(subdomain) || /--/.test(subdomain)) {
      return `docs-${Math.random().toString(36).substring(2, 15)}`;
    }
    
    return subdomain;
  } catch {
    return `docs-${Math.random().toString(36).substring(2, 15)}`;
  }
}

// On-demand subdomain export endpoint
router.post("/api/export/subdomain/:id", verifySupabaseAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    const userId = req.user?.databaseId;
    if (doc.user_id && userId && doc.user_id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if subdomain already exists
    const currentSubdomain = (doc as any).subdomain;
    if (currentSubdomain) {
      // Already has a subdomain, return it
      const hostname = req.hostname || req.get('host') || '';
      const baseDomain = hostname.split('.').slice(1).join('.');
      return res.json({
        subdomain: currentSubdomain,
        url: `https://${currentSubdomain}.${baseDomain || 'replit.app'}`
      });
    }

    // Generate new subdomain with retry logic
    let subdomain = generateSubdomain(doc.url, doc.title);
    
    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
    const hasConsecutiveHyphens = /--/.test(subdomain);
    
    if (!subdomainRegex.test(subdomain) || hasConsecutiveHyphens) {
      subdomain = `docs-${Math.random().toString(36).substring(2, 15)}`;
    }

    // Try to update with retry logic for collisions
    let retryCount = 0;
    const maxRetries = 3;
    let updatedDoc: any = null;

    while (retryCount < maxRetries) {
      try {
        // Update the documentation with the subdomain
        updatedDoc = await storage.updateDocumentation(id, { subdomain } as any);
        console.log(`[SUBDOMAIN] On-demand: Successfully assigned subdomain "${subdomain}" to doc ${id}`);
        break;
      } catch (err: any) {
        if ((err?.message?.includes('unique') || err?.code === '23505') && retryCount < maxRetries - 1) {
          const previousSubdomain = subdomain;
          subdomain = generateSubdomain(doc.url, doc.title);
          retryCount++;
          console.log(`[SUBDOMAIN] On-demand: Collision on "${previousSubdomain}". Retry ${retryCount}/${maxRetries} with: "${subdomain}"`);
        } else if (err?.message?.includes('unique') || err?.code === '23505') {
          console.error(`[SUBDOMAIN] On-demand: Failed to find unique subdomain after ${maxRetries} attempts`);
          return res.status(409).json({ 
            error: 'Unable to generate unique subdomain',
            details: 'Please try again or contact support if this persists'
          });
        } else {
          console.error(`[SUBDOMAIN] On-demand: Update error:`, err?.message || err);
          return res.status(500).json({ 
            error: 'Failed to create custom domain',
            details: err?.message || 'Unknown error'
          });
        }
      }
    }

    if (!updatedDoc) {
      return res.status(500).json({ error: 'Failed to create custom domain' });
    }

    const hostname = req.hostname || req.get('host') || '';
    const baseDomain = hostname.split('.').slice(1).join('.');
    
    res.json({
      subdomain: subdomain,
      url: `https://${subdomain}.${baseDomain || 'replit.app'}`
    });
  } catch (error) {
    console.error('Error in subdomain export:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create custom domain'
    });
  }
});

// Mount health monitoring router
router.use('/api/health', healthRouter);

// Mount version management router
router.use(versionsRouter);

// TIER 3: Competitive Features
// Mount incremental updates router (3.2)
router.use(incrementalUpdatesRouter);

// Mount search router (3.3)
router.use(searchRouter);

// Mount analytics router (3.4)
router.use(analyticsRouter);

// Mount audit logs router (3.5)
router.use(auditRouter);

// Mount dashboard router
router.use('/api/dashboard', dashboardRouter);

// Mount validation router
router.use('/api/validate', validationRouter);

// Mount admin router
router.use(adminRouter);

// Mount themes router
router.use('/api/themes', themesRouter);

// Mount extract-theme router
router.use('/api/extract-theme', extractThemeRouter);

// Mount subscriptions router
router.use('/api/subscriptions', subscriptionsRouter);

// Mount enterprise feature routers
router.use(apiKeysRouter);
  router.use(webhooksRouter);
  router.use(supportRouter);

  // Team & Org management
  router.use(organizationsRouter);

  // Billing endpoints
  router.use(billingRouter);

  // Activity and metrics
  router.use(activityRouter);

  // Enterprise white-label and branding
  router.use(enterpriseRouter);

  // Job status and queue monitoring
  router.use(jobsRouter);

// Idempotency stats endpoint (monitoring)
router.get('/api/idempotency/stats', verifySupabaseAuth, async (req, res) => {
  try {
    const { getIdempotencyStats } = await import('./middleware/idempotency');
    const stats = getIdempotencyStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Custom Orders Routes (Phase 1 Enhanced)
const customOrdersRouter = (await import('./routes/custom-orders')).default;
router.use('/api/custom-orders', customOrdersRouter);

// Complexity Analysis Route (Pay-per-doc model)
const analyzeComplexityRouter = (await import('./routes/analyze-complexity')).default;
router.use('/api/analyze-complexity', analyzeComplexityRouter);

// Legacy pricing calculation endpoint (keep for backward compatibility)
router.post('/api/pricing/calculate', async (req, res) => {
  try {
    const { calculatePrice } = await import('./pricing');
    const pricing = calculatePrice(req.body, req.body.currency || 'USD');
    res.json(pricing);
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

// Create consulting order with PayPal
router.post('/api/consulting/order', async (req, res) => {
  try {
    const { url, githubRepo, sections, sourceDepth, delivery, formats, branding, customRequirements, currency, email } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    const { calculatePrice } = await import('./pricing');
    
    const serverPricing = calculatePrice({
      sections,
      sourceDepth,
      delivery,
      formats,
      branding,
      customRequirements,
    }, currency || 'USD');

    // DEV MODE: Skip PayPal if environment variable is set
    const DEV_SKIP_PAYMENT = process.env.DEV_SKIP_PAYMENT === 'true';
    
    if (DEV_SKIP_PAYMENT) {
      console.log('🧪 [DEV MODE] Skipping PayPal payment - test mode enabled');
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const mockOrderId = `TEST_ORDER_${Date.now()}`;
      const { v4: uuidv4 } = await import('uuid');
      const sessionId = uuidv4();
      
      // Start documentation generation immediately in test mode
      const { generateDocumentationPipeline } = await import('./generator');
      
      console.log(`🧪 [DEV MODE] Starting doc generation for session: ${sessionId}`);
      
      // Start generation in background
      setImmediate(async () => {
        try {
          const result = await generateDocumentationPipeline(
            url,
            null,
            sessionId,
            'enterprise'
          );
          console.log(`🧪 [DEV MODE] Documentation generated successfully`, result);
        } catch (error: any) {
          console.error(`🧪 [DEV MODE] Doc generation failed:`, error.message);
        }
      });
      
      // Return session ID to redirect to progress page
      return res.json({
        paypalOrderId: mockOrderId,
        approvalUrl: `${baseUrl}/generation/${sessionId}`,
        amount: serverPricing.total,
        currency: currency || 'USD',
        testMode: true,
        sessionId,
      });
    }

    const { createOrder } = await import('./paypal-client');
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const orderData = await createOrder({
      amount: serverPricing.total.toString(),
      currency: currency || 'USD',
      description: `Custom Documentation for ${url} - ${sections} sections, ${sourceDepth} research`,
      returnUrl: `${baseUrl}/api/consulting/success`,
      cancelUrl: `${baseUrl}/api/consulting/cancel`,
      metadata: {
        url,
        githubRepo,
        sections,
        sourceDepth,
        delivery,
        formats,
        branding,
        customRequirements,
        calculatedPrice: serverPricing.total,
        currency: currency || 'USD',
      },
    });

    res.json({
      paypalOrderId: orderData.orderId,
      approvalUrl: orderData.approvalUrl,
      amount: serverPricing.total,
      currency: currency || 'USD',
    });
  } catch (error: any) {
    console.error('Consulting order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Handle PayPal success callback
router.get('/api/consulting/success', async (req, res) => {
  try {
    const { token, test, metadata: testMetadata } = req.query;
    
    if (!token) {
      return res.status(400).send('Invalid payment session');
    }

    // Handle test mode
    if (test === 'true' && testMetadata) {
      console.log('🧪 [DEV MODE] Processing test payment success');
      const metadata = JSON.parse(decodeURIComponent(testMetadata as string));
      
      const { getSectionCount, getSourceLimits } = await import('./pricing');
      const sessionId = uuidv4();
      const sectionCount = getSectionCount(metadata.sections);
      const sourceLimits = getSourceLimits(metadata.sourceDepth);
      
      console.log(`🧪 [DEV MODE] Simulated payment for ${token}. Starting doc generation:`, {
        url: metadata.url,
        sections: sectionCount,
        sourceLimits,
        email: metadata.email
      });
      
      // Start documentation generation in background
      setImmediate(async () => {
        try {
          const result = await generateDocumentationPipeline(
            metadata.url,
            null, // No payer ID in test mode
            sessionId,
            'enterprise' // Test orders get enterprise features
          );
          console.log(`🧪 [DEV MODE] Documentation generated successfully`, result);
        } catch (error: any) {
          console.error(`🧪 [DEV MODE] Doc generation failed:`, error.message);
        }
      });
      
      // Return success page
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Payment Successful</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px; text-align: center; }
            .test-badge { background: #fbbf24; color: #78350f; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 20px; }
            .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .success-icon svg { width: 50px; height: 50px; color: white; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            p { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
            .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
            .details strong { color: #1f2937; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 500; }
            .button:hover { background: #5568d3; }
            .redirect-msg { color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
          <script>
            // Store generation data in localStorage
            const sessionId = '${sessionId}';
            const generationData = {
              url: '${metadata.url.replace(/'/g, "\\'")}',
              timestamp: Date.now(),
              sessionId: sessionId,
              testMode: true
            };
            localStorage.setItem('generation_' + sessionId, JSON.stringify(generationData));
            
            // Auto-redirect after 2 seconds
            setTimeout(function() {
              window.location.href = '/generation/' + sessionId;
            }, 2000);
          </script>
        </head>
        <body>
          <div class="container">
            <div class="test-badge">🧪 TEST MODE</div>
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h1>Test Payment Successful!</h1>
            <p>Your test documentation order has been received and we're processing it now.</p>
            <div class="details">
              <p><strong>Order ID:</strong> ${token}</p>
              <p><strong>Amount:</strong> ${metadata.currency} ${metadata.calculatedPrice}</p>
              <p><strong>Website:</strong> ${metadata.url}</p>
              <p><strong>Sections:</strong> ${metadata.sections}</p>
              <p><strong>Research Depth:</strong> ${metadata.sourceDepth}</p>
            </div>
            <p>This is a test order - no payment was charged. The documentation generation is running in the background.</p>
            <p class="redirect-msg">Redirecting to generation progress in 2 seconds...</p>
            <a href="/generation/${sessionId}" class="button">View Generation Progress Now</a>
            <a href="/" class="button" style="background: #6b7280; margin-left: 10px;">Return Home</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // Regular PayPal flow
    const { captureOrder, getOrder } = await import('./paypal-client');
    
    const orderDetails = await getOrder(token as string);
    const metadata = JSON.parse(orderDetails.purchase_units[0]?.custom_id || '{}');
    
    const { calculatePrice, getSectionCount, getSourceLimits } = await import('./pricing');
    const serverPricing = calculatePrice({
      sections: metadata.sections,
      sourceDepth: metadata.sourceDepth,
      delivery: metadata.delivery,
      formats: metadata.formats,
      branding: metadata.branding,
      customRequirements: metadata.customRequirements,
    }, metadata.currency || 'USD');

    if (Math.abs(serverPricing.total - metadata.calculatedPrice) > 0.5) {
      console.error('[CONSULTING] Price tampering detected - rejecting payment:', {
        server: serverPricing.total,
        client: metadata.calculatedPrice,
        orderId: token
      });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html><head><title>Payment Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Payment Validation Failed</h1>
          <p>There was a discrepancy in the payment amount. Please try again or contact support.</p>
          <a href="/" style="color: blue;">Return to Homepage</a>
        </body></html>
      `);
    }

    const captureResult = await captureOrder(token as string);

    if (captureResult.status === 'COMPLETED') {
      const sessionId = uuidv4();
      const sectionCount = getSectionCount(metadata.sections);
      const sourceLimits = getSourceLimits(metadata.sourceDepth);

      console.log(`[CONSULTING] Payment captured for order ${captureResult.orderId}. Starting doc generation:`, {
        url: metadata.url,
        sections: sectionCount,
        sourceLimits,
        payerEmail: captureResult.payerEmail
      });

      setImmediate(async () => {
        try {
          const result = await generateDocumentationPipeline(
            metadata.url,
            captureResult.payerId || null,
            sessionId,
            'enterprise' // Consulting orders get enterprise features
          );
          console.log(`[CONSULTING] Documentation generated successfully for order ${captureResult.orderId}`, result);
        } catch (error: any) {
          console.error(`[CONSULTING] Doc generation failed for order ${captureResult.orderId}:`, error.message);
        }
      });

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Successful</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
            .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px; text-align: center; }
            .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .success-icon svg { width: 50px; height: 50px; color: white; }
            h1 { color: #1f2937; margin-bottom: 10px; }
            p { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
            .details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
            .details strong { color: #1f2937; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 500; }
            .button:hover { background: #5568d3; }
            .redirect-msg { color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
          <script>
            // Store generation data in localStorage
            const sessionId = '${sessionId}';
            const generationData = {
              url: '${metadata.url.replace(/'/g, "\\'")}',
              timestamp: Date.now(),
              sessionId: sessionId,
              payerEmail: '${captureResult.payerEmail}'
            };
            localStorage.setItem('generation_' + sessionId, JSON.stringify(generationData));
            
            // Auto-redirect after 2 seconds
            setTimeout(function() {
              window.location.href = '/generation/' + sessionId;
            }, 2000);
          </script>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="width" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h1>Payment Successful!</h1>
            <p>Your custom documentation order has been received and we're processing it now.</p>
            <div class="details">
              <p><strong>Order ID:</strong> ${captureResult.orderId}</p>
              <p><strong>Amount:</strong> ${captureResult.amount?.currency_code} ${captureResult.amount?.value}</p>
              <p><strong>Website:</strong> ${metadata.url}</p>
              <p><strong>Delivery:</strong> ${metadata.delivery === 'same-day' ? '12 hours' : metadata.delivery === 'rush' ? '24 hours' : '3 days'}</p>
            </div>
            <p>We're generating your documentation now. Check your email (${captureResult.payerEmail}) for the download link when it's ready!</p>
            <p class="redirect-msg">Redirecting to generation progress in 2 seconds...</p>
            <a href="/generation/${sessionId}" class="button">View Generation Progress Now</a>
            <a href="/" class="button" style="background: #6b7280; margin-left: 10px;">Return Home</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(400).send('Payment was not completed');
    }
  } catch (error: any) {
    console.error('Payment success handler error:', error);
    res.status(500).send('An error occurred processing your payment');
  }
});

// Handle PayPal cancel callback
router.get('/api/consulting/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Cancelled</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px; text-align: center; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        p { color: #6b7280; margin-bottom: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Payment Cancelled</h1>
        <p>Your payment was cancelled. No charges were made.</p>
        <a href="/" class="button">Return to Homepage</a>
      </div>
    </body>
    </html>
  `);
});


export default router;
