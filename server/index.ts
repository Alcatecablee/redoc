import express from "express";
import { createServer } from "http";
import routes from "./routes";
import { setupVite } from "./vite";
import { logger } from "./logger";

const app = express();
const port = process.env.PORT || 3001;
logger.info('Environment check', {
  DATABASE_URL: !!process.env.DATABASE_URL,
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  GROQ_API_KEY: !!process.env.GROQ_API_KEY
});

// Log incoming HTTP requests for debugging
app.use((req, res, next) => {
  try {
    logger.http(req.method, req.originalUrl, req.ip);
  } catch (e) {
    logger.error('Failed to log HTTP request', e);
  }
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
    logger.info('Processing job', { jobId: job.id, jobName: job.name });
    const { url, userId } = job.payload || {};
    if (job.name === 'generate-docs' && url) {
      const result = await generateDocumentationPipeline(url, userId || null);
      job.result = { documentationId: result.documentation.id };
      logger.info('Job completed', { jobId: job.id, result: job.result });
    } else {
      throw new Error('Unknown job or missing payload');
    }
  } catch (err: any) {
    job.error = err?.message || String(err);
    logger.error('Job failed', { jobId: job.id, error: job.error });
    throw err;
  }
});

async function start() {
  await setupVite(app, server);
  // Register application routes after Vite middleware to ensure HMR endpoints are handled correctly
  app.use(routes);

  server.listen(Number(port), "0.0.0.0", () => {
    logger.info(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

export default app;
