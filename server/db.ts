import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Allow running without DATABASE_URL in development by exporting undefined
// and letting the storage layer provide an in-memory fallback.
let pool: Pool | undefined;
let db: ReturnType<typeof drizzle> | undefined;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.warn("DATABASE_URL not set. Running without a database; using in-memory storage fallback.");
}

export { pool, db };
