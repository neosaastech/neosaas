/**
 * Creates a provisory super_admin (admin@exemple.com / admin) if no user with
 * that email exists yet. Preview/development builds only — see build-with-db.sh.
 * Never run this against a production database: the password is public knowledge.
 */
import { db } from '../db';
import { roles, users, userRoles } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

async function seedDevAdmin() {
  const adminEmail = 'admin@exemple.com';
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (existingAdmin.length > 0) {
    console.log('  ℹ️  Dev admin already exists');
    process.exit(0);
  }

  const superAdminRole = await db.select().from(roles).where(eq(roles.name, 'super_admin')).limit(1);
  if (!superAdminRole[0]) {
    console.error('  ❌ Role super_admin not found — run db:seed-base first');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash('admin', 10);
  const [newUser] = await db.insert(users).values({
    email: adminEmail,
    username: 'admin',
    password: hashedPassword,
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true,
    isDpo: true,
    isSiteManager: true,
  }).returning();

  await db.insert(userRoles).values({
    userId: newUser.id,
    roleId: superAdminRole[0].id,
  });

  console.log('  ✓ Dev admin created — admin@exemple.com / admin');
  process.exit(0);
}

seedDevAdmin().catch((error) => {
  console.error('  ❌ Dev admin seeding failed:', error);
  process.exit(1);
});
