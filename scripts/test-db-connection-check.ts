
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(dbUrl);

async function main() {
  console.log('Testing database connection...');
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Connection successful:', result);

    console.log('Checking for email_templates table...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'email_templates';
    `;

    if (tables.length > 0) {
      console.log('✅ email_templates table exists.');
    } else {
      console.log('❌ email_templates table DOES NOT exist.');
    }

  } catch (error) {
    console.error('Connection failed:', error);
  }
}

main();
