import { NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
      return NextResponse.json({
        status: 'error',
        database: 'not_configured',
        message: 'DATABASE_URL environment variable is not configured',
        hint: 'Add DATABASE_URL to your Vercel environment variables'
      }, { status: 500 });
    }

    validateDatabaseUrl();

    // Test database connection with a simple query
    const result = await db.execute(sql`SELECT 1 as test, NOW() as timestamp`);

    // Check if tables exist
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'companies')
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((row: any) => row.table_name);
    const tablesExist = tables.includes('users') && tables.includes('companies');

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0],
      tables: {
        exist: tablesExist,
        found: tables,
        missing: tablesExist ? [] : ['users', 'companies'].filter(t => !tables.includes(t))
      },
      message: tablesExist
        ? 'Database is ready for authentication'
        : 'Database connected but tables are missing. Run database-setup.sql'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'error',
      error: error.message,
      hint: 'Check your DATABASE_URL and ensure Neon database is accessible'
    }, { status: 500 });
  }
}
