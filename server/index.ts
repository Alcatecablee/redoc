import express from "express";
import { createServer } from "http";
import routes from "./routes";
import { setupVite } from "./vite";

const app = express();
const port = process.env.PORT || 5000;
console.log('ENV: DATABASE_URL set:', !!process.env.DATABASE_URL, ' SUPABASE_URL set:', !!process.env.SUPABASE_URL, ' DEEPSEEK_API_KEY set:', !!process.env.DEEPSEEK_API_KEY, ' OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY, ' GROQ_API_KEY set:', !!process.env.GROQ_API_KEY);

// Log incoming HTTP requests for debugging
app.use((req, res, next) => {
  try {
    console.log('[HTTP]', req.method, req.originalUrl, 'from', req.ip);
  } catch (e) {}
  next();
});

app.use(express.json());

// Subdomain routing middleware - serves documentation on custom subdomains
app.use(async (req, res, next) => {
  try {
    const hostname = req.hostname || req.get('host') || '';
    const parts = hostname.split('.');
    
    // Check if this is a subdomain request (e.g., docs-example-abc123.replit.app)
    // Skip if it's the main domain or localhost
    if (parts.length > 2 && !hostname.includes('localhost')) {
      const subdomain = parts[0];
      
      // Skip certain system subdomains
      if (['www', 'api', 'admin'].includes(subdomain.toLowerCase())) {
        return next();
      }
      
      // Try to find documentation by subdomain
      const { storage } = await import('./storage');
      const doc = await storage.getDocumentationBySubdomain(subdomain);
      
      if (doc) {
        // Serve the documentation
        const parsedContent = JSON.parse(doc.content);
        
        // Helper function to escape HTML to prevent XSS
        const escapeHtml = (text: string): string => {
          if (!text) return '';
          return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };
        
        // Helper function to validate and sanitize URLs - only allow safe protocols
        const sanitizeUrl = (url: string): string => {
          if (!url) return '#';
          const urlStr = String(url).trim();
          
          // Block protocol-relative URLs (//evil.com) - XSS risk
          if (urlStr.startsWith('//')) {
            return '#';
          }
          
          // Check for dangerous protocols (including URL-encoded variants)
          const lowerUrl = urlStr.toLowerCase().replace(/%20/g, ' ').replace(/\s/g, '');
          const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
          
          for (const protocol of dangerousProtocols) {
            if (lowerUrl.startsWith(protocol) || lowerUrl.includes(':' + protocol)) {
              return '#';
            }
          }
          
          // Only allow explicitly safe protocols and relative URLs
          if (urlStr.startsWith('http://') || 
              urlStr.startsWith('https://') || 
              urlStr.startsWith('mailto:') ||
              urlStr.startsWith('/') ||
              urlStr.startsWith('#')) {
            return escapeHtml(urlStr);
          }
          
          // Block everything else including ambiguous cases
          return '#';
        };
        
        // Return a simple HTML page with the documentation
        return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: white; padding: 30px; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { font-size: 2.5em; margin-bottom: 10px; color: #1a1a1a; }
    .description { color: #666; font-size: 1.1em; }
    .content { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section { margin-bottom: 40px; }
    .section h2 { color: #2563eb; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .section h3 { color: #1e40af; margin: 20px 0 10px; }
    .section p { margin-bottom: 15px; }
    .section ul, .section ol { margin: 15px 0 15px 30px; }
    .section li { margin-bottom: 8px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #1f2937; color: #f9fafb; padding: 20px; border-radius: 6px; overflow-x: auto; margin: 15px 0; }
    pre code { background: none; color: inherit; padding: 0; }
    .callout { padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid; }
    .callout.info { background: #eff6ff; border-color: #3b82f6; }
    .callout.warning { background: #fef3c7; border-color: #f59e0b; }
    .callout.tip { background: #d1fae5; border-color: #10b981; }
    img { max-width: 100%; height: auto; border-radius: 6px; margin: 15px 0; }
    .footer { text-align: center; padding: 30px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="description">${escapeHtml(parsedContent.description || '')}</p>
    </div>
    <div class="content">
      ${(parsedContent.sections || []).map((section: any) => `
        <div class="section">
          <h2>${escapeHtml(section.title || '')}</h2>
          ${(section.content || []).map((block: any) => {
            if (block.type === 'paragraph') return `<p>${escapeHtml(block.text || '')}</p>`;
            if (block.type === 'heading' && block.level === 3) return `<h3>${escapeHtml(block.text || '')}</h3>`;
            if (block.type === 'list') return `<ul>${(block.items || []).map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
            if (block.type === 'code') return `<pre><code>${escapeHtml(block.code || '')}</code></pre>${block.caption ? `<p><em>${escapeHtml(block.caption)}</em></p>` : ''}`;
            if (block.type === 'callout') return `<div class="callout ${escapeHtml(block.calloutType || 'info')}">${escapeHtml(block.text || '')}</div>`;
            if (block.type === 'image') return `<img src="${sanitizeUrl(block.url || '')}" alt="${escapeHtml(block.alt || '')}" />${block.caption ? `<p><em>${escapeHtml(block.caption)}</em></p>` : ''}`;
            return '';
          }).join('')}
        </div>
      `).join('')}
    </div>
    <div class="footer">
      <p>Documentation hosted on ${escapeHtml(subdomain)}.${escapeHtml(parts.slice(1).join('.'))}</p>
      <p>Generated from: <a href="${sanitizeUrl(doc.url)}">${escapeHtml(doc.url)}</a></p>
    </div>
  </div>
</body>
</html>
        `);
      }
    }
  } catch (err) {
    console.error('Subdomain routing error:', err);
  }
  
  next();
});

// Note: routes are registered after Vite is setup in start() to ensure Vite HMR endpoints and middleware
// are mounted before application routes, avoiding HMR ping/fetch failures behind proxies.

const server = createServer(app);

// Initialize background job queue (in-memory fallback)
import { initInMemoryQueue } from './queue';
import { generateDocumentationPipeline } from './generator';

initInMemoryQueue(async (job: any) => {
  try {
    console.log('Processing job', job.id, job.name);
    const { url, userId } = job.payload || {};
    if (job.name === 'generate-docs' && url) {
      const result = await generateDocumentationPipeline(url, userId || null);
      job.result = { documentationId: result.documentation.id };
      console.log('Job completed', job.id, job.result);
    } else {
      throw new Error('Unknown job or missing payload');
    }
  } catch (err: any) {
    job.error = err?.message || String(err);
    console.error('Job failed', job.id, job.error);
    throw err;
  }
});

async function start() {
  await setupVite(app, server);
  // Register application routes after Vite middleware to ensure HMR endpoints are handled correctly
  app.use(routes);

  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
