import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb(retries = 10, delayMs = 500) {
  if (dbInstance) return dbInstance;
  
  while (retries-- > 0) {
    const url = process.env.DATABASE_URL;
    if (url) {
      pool = new Pool({ connectionString: url });
      dbInstance = drizzle({ client: pool, schema });
      return dbInstance;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  
  throw new Error("DATABASE_URL not available after retry window.");
}
