import express from "express";
import { createServer } from "http";
import routes from "./routes";
import { setupVite } from "./vite";

const app = express();
const port = process.env.PORT || 5000;
console.log('ENV: DATABASE_URL set:', !!process.env.DATABASE_URL, ' SUPABASE_URL set:', !!process.env.SUPABASE_URL, ' DEEPSEEK_API_KEY set:', !!process.env.DEEPSEEK_API_KEY, ' OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY);

// Log incoming HTTP requests for debugging
app.use((req, res, next) => {
  try {
    console.log('[HTTP]', req.method, req.originalUrl, 'from', req.ip);
  } catch (e) {}
  next();
});

app.use(express.json());

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
