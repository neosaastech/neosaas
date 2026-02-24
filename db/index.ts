import { drizzle } from 'drizzle-orm/neon-http';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import * as schema from './schema';

// Lazy initialization for database connection to avoid build-time errors
let _sql: NeonQueryFunction<false, false> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      'DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. ' +
      'Configure it in Vercel → Settings → Environment Variables, then redeploy. ' +
      'Expected format: postgresql://neondb_owner:PASSWORD@ep-calm-lab-agkv7stu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    );
  }
  // Detect wrong role — 'authenticator' has no CREATE/ALTER rights
  if (url.includes('://authenticator') || url.includes('//authenticator@')) {
    throw new Error(
      "DATABASE_URL uses role 'authenticator' which lacks DDL permissions. " +
      "Update the variable in Vercel to use 'neondb_owner' instead."
    );
  }
  // Remove unsupported query parameters for Neon HTTP driver
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '');
}

// Lazy getter for db - only connects when first accessed
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!_db) {
      const connectionString = getConnectionString();
      _sql = neon(connectionString);
      _db = drizzle(_sql, { schema });
    }
    return (_db as Record<string | symbol, unknown>)[prop];
  }
});

// Export validation function to be called before database operations
export function validateDatabaseUrl() {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    throw new Error(
      'DATABASE_URL (or DATABASE_URL_UNPOOLED) environment variable is not set. Please configure it in your environment variables.'
    );
  }
}
