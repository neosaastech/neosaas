import { db } from '../db';
import { roles, permissions, rolePermissions, users, userRoles } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // =============================================================================
    // 1. SEED DEFAULT ROLES
    // =============================================================================
    console.log('\n📍 Seeding roles...');
    
    const defaultRoles = [
      { name: 'reader', scope: 'company', description: 'Read-only access to company data' },
      { name: 'writer', scope: 'company', description: 'Read and write access to company data' },
      { name: 'admin', scope: 'platform', description: 'Platform administrator - can manage companies and users' },
      { name: 'super_admin', scope: 'platform', description: 'Super administrator - full platform access including admin management' }
    ];

    for (const role of defaultRoles) {
      await db.insert(roles).values(role).onConflictDoNothing();
    }
    console.log('  ✓ Roles seeded');

    // =============================================================================
    // 2. SEED DEFAULT PERMISSIONS
    // =============================================================================
    console.log('\n📍 Seeding permissions...');

    const defaultPermissions = [
      // Company scope
      { name: 'read', scope: 'company', description: 'View company data and analytics' },
      { name: 'write', scope: 'company', description: 'Create and update company data' },
      { name: 'invite', scope: 'company', description: 'Invite new users to the company' },
      { name: 'manage_users', scope: 'company', description: 'Manage users within the company' },
      
      // Platform scope
      { name: 'manage_platform', scope: 'platform', description: 'Manage platform settings and features' },
      { name: 'manage_companies', scope: 'platform', description: 'View and manage all companies' },
      { name: 'manage_all_users', scope: 'platform', description: 'Manage any user on the platform' },
      { name: 'manage_admins', scope: 'platform', description: 'Create and manage other administrators' },
      { name: 'manage_emails', scope: 'platform', description: 'Configure email providers and templates' },
      { name: 'view_analytics', scope: 'platform', description: 'Access platform-wide analytics and statistics' }
    ];

    for (const permission of defaultPermissions) {
      await db.insert(permissions).values(permission).onConflictDoNothing();
    }
    console.log('  ✓ Permissions seeded');

    // =============================================================================
    // 3. ASSIGN PERMISSIONS TO ROLES
    // =============================================================================
    console.log('\n📍 Assigning permissions to roles...');

    // Helper to get IDs
    const getRole = async (name: string) => {
      const result = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
      return result[0];
    };

    const getPermission = async (name: string) => {
      const result = await db.select().from(permissions).where(eq(permissions.name, name)).limit(1);
      return result[0];
    };

    // Define mappings
    const rolePermissionMappings = [
      // Reader
      { role: 'reader', permissions: ['read'] },
      // Writer
      { role: 'writer', permissions: ['read', 'write', 'invite', 'manage_users'] },
      // Admin
      { role: 'admin', permissions: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_emails', 'view_analytics'] },
      // Super Admin
      { role: 'super_admin', permissions: ['manage_platform', 'manage_companies', 'manage_all_users', 'manage_admins', 'manage_emails', 'view_analytics'] }
    ];

    for (const mapping of rolePermissionMappings) {
      const role = await getRole(mapping.role);
      if (!role) continue;

      for (const permName of mapping.permissions) {
        const permission = await getPermission(permName);
        if (!permission) continue;

        await db.insert(rolePermissions)
          .values({ roleId: role.id, permissionId: permission.id })
          .onConflictDoNothing();
      }
    }
    console.log('  ✓ Role permissions assigned');

    // =============================================================================
    // 4. SEED PROVISORY SUPER ADMIN
    // =============================================================================
    console.log('\n📍 Creating provisory super admin...');

    const adminEmail = 'admin@exemple.com';
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

    let adminUser = existingAdmin[0];

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      const [newUser] = await db.insert(users).values({
        email: adminEmail,
        username: 'admin',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        isDpo: true,
        isSiteManager: true
      }).returning();

      adminUser = newUser;
      console.log('  ✓ Provisory super admin created');
    } else {
      console.log('  ℹ️  Bootstrap user already exists');
    }

    const superAdminRole = await getRole('super_admin');
    if (!superAdminRole) {
      console.error('  ❌ super_admin role not found');
      process.exit(1);
    }

    await db.insert(userRoles).values({
      userId: adminUser.id,
      roleId: superAdminRole.id
    }).onConflictDoNothing();

    const hasSuperAdmin = await db.query.userRoles.findFirst({
      where: (userRoles, { and, eq }) => and(
        eq(userRoles.userId, adminUser.id),
        eq(userRoles.roleId, superAdminRole.id),
      ),
    });

    if (!hasSuperAdmin) {
      console.error('  ❌ Failed to assign super_admin role to bootstrap user');
      process.exit(1);
    }

    console.log('  ✓ super_admin role assigned');
    console.log('  📧 Email: admin@exemple.com');
    console.log('  🔑 Password: admin');

    console.log('\n✅ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
