/**
 * NeoSaaS - Base Data Seeder (Neon HTTP)
 *
 * Seeds essential reference data that must exist for the app to work:
 *   - Roles (reader, writer, admin, super_admin)
 *   - Permissions (read, write, invite, manage_users, manage_platform, ...)
 *   - Role → Permission assignments
 *   - VAT rates (France 20%, France 5.5%, Exonéré)
 *   - Platform config defaults
 *
 * Uses Neon HTTP driver → safe to run on Vercel builds (port 443 only).
 * All operations are IDEMPOTENT (ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   pnpm db:seed-base        # from package.json
 *   DATABASE_URL=... npx tsx scripts/seed-base-data.ts
 */

import { neon } from '@neondatabase/serverless';

function cleanUrl(url: string): string {
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
const sql = neon(cleanUrl(rawUrl));

async function main() {
  console.log('🌱 NeoSaaS Base Data Seeder (HTTP)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // ── 1. Roles ────────────────────────────────────────────────────────────────
  console.log('\n📍 Seeding roles...');
  await sql`
    INSERT INTO roles (name, scope, description) VALUES
      ('reader',      'company',  'Read-only access to company data'),
      ('writer',      'company',  'Read and write access to company data'),
      ('admin',       'platform', 'Platform administrator - can manage companies and users'),
      ('super_admin', 'platform', 'Super administrator - full platform access')
    ON CONFLICT (name) DO NOTHING
  `;
  console.log('  ✓ Roles OK');

  // ── 2. Permissions ─────────────────────────────────────────────────────────
  console.log('\n📍 Seeding permissions...');
  await sql`
    INSERT INTO permissions (name, scope, description) VALUES
      ('read',             'company',  'View company data and analytics'),
      ('write',            'company',  'Create and update company data'),
      ('invite',           'company',  'Invite new users to the company'),
      ('manage_users',     'company',  'Manage users within the company'),
      ('manage_platform',  'platform', 'Manage platform settings and features'),
      ('manage_companies', 'platform', 'View and manage all companies'),
      ('manage_all_users', 'platform', 'Manage any user on the platform'),
      ('manage_admins',    'platform', 'Create and manage other administrators'),
      ('manage_emails',    'platform', 'Configure email providers and templates'),
      ('view_analytics',   'platform', 'Access platform-wide analytics and statistics')
    ON CONFLICT (name) DO NOTHING
  `;
  console.log('  ✓ Permissions OK');

  // ── 3. Role → Permission assignments ────────────────────────────────────────
  console.log('\n📍 Assigning permissions to roles...');

  // reader → read
  await sql`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'reader' AND p.name = 'read'
    ON CONFLICT DO NOTHING
  `;

  // writer → all company permissions
  await sql`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'writer' AND p.scope = 'company'
    ON CONFLICT DO NOTHING
  `;

  // admin → all platform permissions except manage_admins
  await sql`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'admin' AND p.scope = 'platform' AND p.name != 'manage_admins'
    ON CONFLICT DO NOTHING
  `;

  // super_admin → all platform permissions
  await sql`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
    WHERE r.name = 'super_admin' AND p.scope = 'platform'
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ Role permissions OK');

  // ── 4. VAT rates ────────────────────────────────────────────────────────────
  console.log('\n📍 Seeding VAT rates...');
  await sql`
    INSERT INTO vat_rates (name, country, rate, description, is_default, is_active) VALUES
      ('France Standard', 'FR',  2000, 'TVA standard française 20%',  true,  true),
      ('France Réduit',   'FR',   550, 'TVA réduite française 5.5%',  false, true),
      ('France Super Réduit', 'FR', 210, 'TVA super réduite 2.1%',   false, true),
      ('Exonéré',         'ALL',    0, 'Exonération de TVA (0%)',     false, true)
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ VAT rates OK');

  // ── 5. Platform config defaults ─────────────────────────────────────────────
  console.log('\n📍 Seeding platform config...');
  await sql`
    INSERT INTO platform_config (key, value) VALUES
      ('site_name',            'NeoSaaS'),
      ('auth_enabled',         'true'),
      ('maintenance',          'false'),
      ('currency',             'EUR'),
      ('stripe_enabled',       'true'),
      ('registration_enabled', 'true'),
      ('chat_enabled',         'true'),
      ('max_file_size_mb',     '10')
    ON CONFLICT (key) DO NOTHING
  `;
  console.log('  ✓ Platform config OK');

  console.log('\n✅ Base data seeding complete!');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
