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

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) {
      return res.status(500).json({ error: "LOVABLE_API_KEY is not configured" });
    }

    // Fetch website content
    console.log("Fetching website content...");
    const websiteResponse = await fetch(url);
    if (!websiteResponse.ok) {
      return res.status(500).json({ error: `Failed to fetch website: ${websiteResponse.statusText}` });
    }
    const htmlContent = await websiteResponse.text();

    // Extract text content from HTML (basic extraction)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit content size for AI processing

    console.log("Generating documentation with AI...");

    // Use Lovable AI to generate professional documentation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional technical writer creating enterprise-quality documentation. 
            Generate comprehensive, well-structured documentation in HTML format with:
            - Clear sections (Overview, Features, Getting Started, FAQ, Support)
            - Professional formatting with headings, bullet points, and paragraphs
            - User-friendly language similar to Microsoft or Twitter help centers
            - Proper HTML structure using semantic tags (h2, h3, p, ul, li, etc.)
            - No markdown, only clean HTML`
          },
          {
            role: 'user',
            content: `Create professional help center documentation for this website content:\n\n${textContent}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return res.status(500).json({ error: `AI generation failed: ${aiResponse.statusText}` });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || '';

    // Extract title from content or use default
    const titleMatch = generatedContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 'Documentation';

    // Save to database
    const documentation = await storage.createDocumentation({
      url,
      title,
      content: generatedContent,
    });

    console.log("Documentation generated successfully");

    res.json({
      id: documentation.id,
      title: documentation.title,
      content: documentation.content,
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
