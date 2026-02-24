import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Clean DATABASE_URL: strip unsupported parameters for some drivers
function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '');
}

const databaseUrlRaw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!databaseUrlRaw) {
  throw new Error('Missing DATABASE_URL (or DATABASE_URL_UNPOOLED) for drizzle-kit.');
}

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: cleanDatabaseUrl(databaseUrlRaw),
  },
} satisfies Config;
