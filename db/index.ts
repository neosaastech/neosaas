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

// The Neon HTTP driver (@neondatabase/serverless) derives its HTTPS API
// endpoint from the connection string host assuming Neon's own naming
// scheme (*.neon.tech) -- pointed at any other host (self-hosted Postgres,
// a raw IP, localhost...) it builds a garbage URL and fails at connect
// time. Only use it for genuine Neon hosts; everything else goes through
// standard node-postgres over TCP.
function isNeonHost(url: string): boolean {
  return /\.neon\.tech/.test(url);
}

function initDb() {
  if (_db) return _db;
  const connectionString = getConnectionString();
  if (isNeonHost(connectionString)) {
    _sql = neon(connectionString);
    _db = drizzleNeon(_sql, { schema });
  } else {
    _pool = new Pool({ connectionString });
    _db = drizzlePg(_pool, { schema });
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
