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

    // Extract text content from HTML (basic extraction)
    const textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit content size for AI processing

    console.log("Step 1: Analyzing structure...");

    // Step 1: Structure Understanding
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
            content: `Analyze this website content. Identify its purpose, main features, user flows, and terminology. Output as JSON with keys: overview, features, how_it_works, troubleshooting, faq.`
          },
          {
            role: 'user',
            content: textContent
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error('Structure analysis failed:', structureResponse.status, errorText);
      return res.status(500).json({ error: `Structure analysis failed: ${structureResponse.statusText}` });
    }

    const structureData = await structureResponse.json();
    const structuredInfo = structureData.choices?.[0]?.message?.content || '';

    console.log("Step 2: Writing documentation...");

    // Step 2: Write Professional Docs
    const docsResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `You are a professional technical writer. Rewrite this structured data into clear, human, Apple-style documentation. Use professional tone, consistent formatting, and HTML with semantic tags (h1, h2, h3, p, ul, li). Create beautiful, user-friendly documentation similar to Apple or Microsoft help centers.`
          },
          {
            role: 'user',
            content: `Transform this structured information into professional documentation:\n\n${structuredInfo}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!docsResponse.ok) {
      const errorText = await docsResponse.text();
      console.error('Documentation writing failed:', docsResponse.status, errorText);
      return res.status(500).json({ error: `Documentation writing failed: ${docsResponse.statusText}` });
    }

    const docsData = await docsResponse.json();
    const rawDocs = docsData.choices?.[0]?.message?.content || '';

    console.log("Step 3: Formatting for export...");

    // Step 3: Format for Export
    const formatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `Format this documentation for web export. Ensure clean HTML with proper structure, metadata-ready format. Polish the formatting, ensure consistent spacing, proper heading hierarchy (h1, h2, h3), and professional presentation. Return only the formatted HTML content.`
          },
          {
            role: 'user',
            content: rawDocs
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!formatResponse.ok) {
      const errorText = await formatResponse.text();
      console.error('Formatting failed:', formatResponse.status, errorText);
      return res.status(500).json({ error: `Formatting failed: ${formatResponse.statusText}` });
    }

    const formatData = await formatResponse.json();
    const generatedContent = formatData.choices?.[0]?.message?.content || '';

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
