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
    
    // Add theme to the structured documentation
    structuredDoc.theme = theme;
    
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
      theme: theme,
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

// Export documentation as JSON
router.get("/api/export/json/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
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
router.get("/api/export/markdown/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
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
router.get("/api/export/html/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const doc = await storage.getDocumentation(id);
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
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
router.get("/api/export/pdf/:id", async (req, res) => {
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

    const parsedContent = JSON.parse(doc.content);
    const theme = parsedContent.theme || {};
    
    // Helper function to convert color to hex format for PDFKit
    const toHexColor = (color: string): string => {
      if (!color) return '#8B5CF6';
      // If already hex, return as is
      if (color.startsWith('#')) return color;
      // If rgb/rgba, convert to hex (basic conversion)
      if (color.startsWith('rgb')) {
        const matches = color.match(/\d+/g);
        if (matches && matches.length >= 3) {
          const r = parseInt(matches[0]).toString(16).padStart(2, '0');
          const g = parseInt(matches[1]).toString(16).padStart(2, '0');
          const b = parseInt(matches[2]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
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
router.get("/api/export/docx/:id", async (req, res) => {
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

export default router;
