import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const databaseUrlRaw = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrlRaw) {
  throw new Error('DATABASE_URL (or DATABASE_URL_UNPOOLED) is not defined');
}

const databaseUrl = databaseUrlRaw
  .replace('&channel_binding=require', '')
  .replace('channel_binding=require&', '')
  .replace('?channel_binding=require', '');

const sql = neon(databaseUrl);

async function resetDatabase() {
  console.log('🗑️  Resetting database (dropping all tables)...');

  try {
    // Get all tables in public schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE';
    `;

    if (tables.length === 0) {
      console.log('  ℹ️  Database is already empty');
    } else {
      // Disable triggers/constraints temporarily if needed, but CASCADE handles most
      for (const table of tables) {
        const tableName = table.table_name;
        console.log(`  🔥 Dropping table: ${tableName}`);
        // Use sql as a function call is deprecated, but for dynamic table names we need a workaround
        // We can't use tagged template for table name identifier easily with this driver
        // Trying to use the raw query execution if possible, or just constructing the query
        // The error message suggested sql.query
        await (sql as any).query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
    }

    // Drop all enum types in public schema (otherwise migrations can fail with "type already exists")
    const enumTypes = await sql`
      SELECT t.typname AS name
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      AND t.typtype = 'e';
    `;

    for (const row of enumTypes as Array<{ name: string }>) {
      const typeName = row.name;
      console.log(`  🔥 Dropping enum type: ${typeName}`);
      await (sql as any).query(`DROP TYPE IF EXISTS "public"."${typeName}" CASCADE`);
    }

    console.log('✅ Database reset complete. Ready for schema push.');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
