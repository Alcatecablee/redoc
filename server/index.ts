import express from "express";
import { createServer } from "http";
import routes from "./routes";
import { setupVite } from "./vite";

const app = express();
const port = process.env.PORT || 5000;
console.log('ENV: DATABASE_URL set:', !!process.env.DATABASE_URL, ' SUPABASE_URL set:', !!process.env.SUPABASE_URL, ' GROQ_API_KEY set:', !!process.env.GROQ_API_KEY);

app.use(express.json());
app.use(routes);

const server = createServer(app);

async function start() {
  await setupVite(app, server);
  
  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
