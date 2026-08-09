import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

let _sql: NeonQueryFunction<false, false> | null = null;
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>> | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      'DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set. ' +
      'Configure it in Vercel → Settings → Environment Variables, then redeploy. ' +
      'Expected format: postgresql://neondb_owner:PASSWORD@ep-calm-lab-agkv7stu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
    );
  }
  if (url.includes('://authenticator') || url.includes('//authenticator@')) {
    throw new Error(
      "DATABASE_URL uses role 'authenticator' which lacks DDL permissions. " +
      "Update the variable in Vercel to use 'neondb_owner' instead."
    );
  }
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '');
}

function wantsNodePostgres(url: string): boolean {
  // Neon HTTP driver only works with Neon cloud endpoints (*.neon.tech).
  // Self-hosted Postgres (Supabase, local, Dokploy) must use node-postgres.
  if (/localhost|127\.0\.0\.1/.test(url)) return true;
  if (!/\.neon\.tech/.test(url)) return true;
  return false;
}

function initDb() {
  if (_db) return _db;
  const connectionString = getConnectionString();
  if (wantsNodePostgres(connectionString)) {
    _pool = new Pool({ connectionString });
    _db = drizzlePg(_pool, { schema });
  } else {
    _sql = neon(connectionString);
    _db = drizzleNeon(_sql, { schema });
  }
  return _db;
}

// Lazy getter for db - only connects when first accessed
export const db = new Proxy({} as ReturnType<typeof drizzleNeon<typeof schema>>, {
  get(_, prop) {
    const instance = initDb();
    return (instance as Record<string | symbol, unknown>)[prop];
  }
});

export function validateDatabaseUrl() {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    throw new Error(
      'DATABASE_URL (or DATABASE_URL_UNPOOLED) environment variable is not set. Please configure it in your environment variables.'
    );
  }
}
