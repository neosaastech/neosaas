/**
 * Neon HTTP Migration Runner
 *
 * Applies Drizzle SQL migrations from ./drizzle folder using the Neon HTTP driver
 * (HTTPS port 443). Safe to run on Vercel builds where TCP is blocked.
 *
 * - IDEMPOTENT: tracks applied migrations in __drizzle_migrations table
 * - NON-DESTRUCTIVE: only applies new migrations, never drops data
 * - ORDERED: applies migrations in idx order from the journal
 *
 * Usage:
 *   pnpm db:migrate              # apply pending migrations
 *   DATABASE_URL=... pnpm db:migrate
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Clean DATABASE_URL ───────────────────────────────────────────────────────
function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '');
}

const rawUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}
const connectionString = cleanDatabaseUrl(rawUrl);

// ─── Setup ───────────────────────────────────────────────────────────────────
const sql = neon(connectionString);
const DRIZZLE_DIR = join(process.cwd(), 'drizzle');

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
  breakpoints: boolean;
}
interface Journal {
  entries: JournalEntry[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Drizzle HTTP Migration Runner');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id        SERIAL PRIMARY KEY,
      tag       TEXT NOT NULL UNIQUE,
      idx       INTEGER NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // 2. Load journal
  const journalPath = join(DRIZZLE_DIR, 'meta', '_journal.json');
  let journal: Journal;
  try {
    journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
  } catch {
    console.error('❌ Cannot read drizzle/meta/_journal.json');
    process.exit(1);
  }

  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);

  // 3. Get already-applied migrations
  const applied = await sql<{ tag: string }[]>`
    SELECT tag FROM __drizzle_migrations ORDER BY idx
  `;
  const appliedSet = new Set(applied.map((r) => r.tag));

  const pending = entries.filter((e) => !appliedSet.has(e.tag));

  if (pending.length === 0) {
    console.log('✅ No pending migrations — database is up to date');
    return;
  }

  console.log(`📋 ${pending.length} pending migration(s):`);
  pending.forEach((e) => console.log(`   [${e.idx}] ${e.tag}`));
  console.log('');

  // 4. Apply each pending migration
  for (const entry of pending) {
    const sqlFile = join(DRIZZLE_DIR, `${entry.tag}.sql`);
    let sqlContent: string;
    try {
      sqlContent = readFileSync(sqlFile, 'utf-8');
    } catch {
      console.error(`❌ Migration file not found: ${entry.tag}.sql`);
      process.exit(1);
    }

    // Split on Drizzle breakpoints
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`⚙️  Applying [${entry.idx}] ${entry.tag} (${statements.length} statements)...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await sql.query(stmt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Tolerate "already exists" errors — idempotent safety
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate column') ||
          msg.includes('duplicate key value')
        ) {
          console.log(`   ⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          continue;
        }
        console.error(`   ❌ Statement ${i + 1}/${statements.length} failed:`);
        console.error(`   ${msg}`);
        console.error(`   SQL: ${stmt.slice(0, 120)}...`);
        process.exit(1);
      }
    }

    // Mark as applied
    await sql`
      INSERT INTO __drizzle_migrations (tag, idx) VALUES (${entry.tag}, ${entry.idx})
      ON CONFLICT (tag) DO NOTHING
    `;
    console.log(`   ✅ Applied`);
  }

  console.log('');
  console.log(`✅ ${pending.length} migration(s) applied successfully`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
