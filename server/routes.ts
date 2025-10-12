import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertDocumentationSchema } from "@shared/schema";

const router = Router();

// Generate documentation endpoint
router.post("/api/generate-docs", async (req, res) => {
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
    
    // Extract text content from HTML (basic extraction)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit content size for AI processing

    console.log("Step 1: Analyzing structure...");

    // Step 1: Generate Structured Documentation
    const structureResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `You are an expert technical writer creating enterprise-quality documentation like Microsoft or Twitter help centers. 

Analyze this website and create comprehensive, well-structured documentation in JSON format with these sections:

{
  "title": "Clear product/service name",
  "description": "One-sentence description",
  "sections": [
    {
      "id": "overview",
      "title": "Overview",
      "icon": "BookOpen",
      "content": [
        { "type": "paragraph", "text": "..." },
        { "type": "heading", "level": 3, "text": "..." },
        { "type": "list", "items": ["..."] }
      ]
    },
    {
      "id": "getting-started", 
      "title": "Getting Started",
      "icon": "Rocket",
      "content": [...]
    },
    {
      "id": "key-features",
      "title": "Key Features", 
      "icon": "Star",
      "content": [...]
    },
    {
      "id": "how-it-works",
      "title": "How It Works",
      "icon": "Workflow",
      "content": [...]
    },
    {
      "id": "api-reference",
      "title": "API Reference",
      "icon": "Code",
      "content": [...]
    },
    {
      "id": "troubleshooting",
      "title": "Troubleshooting",
      "icon": "AlertCircle",
      "content": [...]
    },
    {
      "id": "faq",
      "title": "FAQ",
      "icon": "HelpCircle",
      "content": [...]
    }
  ]
}

Content types supported:
- paragraph: Regular text
- heading: level 2-4 headings
- list: Bullet points
- code: Code blocks with language
- callout: Info/warning/tip boxes with type and text
- table: Rows and columns
- image: Images with url, alt text, and optional caption

For images, use this format:
{ "type": "image", "url": "image_url_here", "alt": "description", "caption": "optional caption" }

Available images from the website: ${images.slice(0, 10).join(', ')}

Use relevant images throughout the documentation to enhance clarity. Make it professional, clear, and comprehensive. Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `Analyze and create documentation for: ${textContent}`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error('Structure analysis failed:', structureResponse.status, errorText);
      return res.status(500).json({ error: `Structure analysis failed: ${structureResponse.statusText}` });
    }

    const structureData = await structureResponse.json();
    const structuredJSON = structureData.choices?.[0]?.message?.content || '{}';
    
    // Parse the structured documentation
    let structuredDoc;
    try {
      structuredDoc = JSON.parse(structuredJSON);
    } catch (parseError) {
      console.error('Failed to parse structured documentation:', parseError);
      return res.status(500).json({ error: 'Failed to parse AI-generated documentation' });
    }

    const title = structuredDoc.title || 'Documentation';
    const description = structuredDoc.description || '';
    
    // Save to database (store as JSON string for now)
    const documentation = await storage.createDocumentation({
      url,
      title,
      content: JSON.stringify(structuredDoc),
    });

    console.log("Documentation generated successfully");

    res.json({
      id: documentation.id,
      title: documentation.title,
      description: description,
      sections: structuredDoc.sections || [],
      url: documentation.url,
      generatedAt: documentation.generatedAt,
    });
  } catch (error) {
    console.error('Error in generate-docs:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get all documentations
router.get("/api/documentations", async (req, res) => {
  try {
    const docs = await storage.getAllDocumentations();
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documentations:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch documentations'
    });
  }
});

// Get single documentation
router.get("/api/documentations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }

    res.json(doc);
  } catch (error) {
    console.error('Error fetching documentation:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch documentation'
    });
  }
});

export default router;
