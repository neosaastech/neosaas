/**
 * Quick check for user roles using Node.js
 */
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
const TARGET_EMAIL = process.env.TARGET_EMAIL;

async function checkUser() {
  try {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is required (load it from your vault/secret manager)');
    }
    if (!TARGET_EMAIL) {
      throw new Error('TARGET_EMAIL is required (do not hardcode personal emails in repository scripts)');
    }

    const sql = neon(DATABASE_URL);

    console.log(`🔍 Checking user: ${TARGET_EMAIL}\n`);

    const result = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.company_id,
        r.name as role_name,
        r.scope as role_scope
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = ${TARGET_EMAIL}
    `;

    if (result.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result[0];
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.first_name, user.last_name);
    console.log('🔑 User ID:', user.id);
    console.log('🏢 Company ID:', user.company_id);
    console.log('✅ Active:', user.is_active);
    console.log('\n📋 Roles:');

    if (!user.role_name) {
      console.log('  ⚠️  NO ROLES ASSIGNED');
    } else {
      result.forEach(r => {
        if (r.role_name) {
          console.log(`  - ${r.role_name} (scope: ${r.role_scope})`);
        }
      });
    }

    // Check if has admin role
    const hasAdmin = result.some(r => r.role_name === 'admin' || r.role_name === 'super_admin');
    console.log('\n🔐 Has Admin Role:', hasAdmin ? '❌ YES' : '✅ NO');

    // Check all admin users
    console.log('\n\n👑 All Admin Users in Database:');
    const admins = await sql`
      SELECT u.email, u.first_name, u.last_name, r.name as role_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('admin', 'super_admin')
      ORDER BY u.email
    `;

    if (admins.length === 0) {
      console.log('  ℹ️  No admin users found in database');
    } else {
      admins.forEach(a => {
        console.log(`  - ${a.email} (${a.first_name} ${a.last_name}) - ${a.role_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser().then(() => process.exit(0));
