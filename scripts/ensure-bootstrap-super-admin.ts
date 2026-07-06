/**
 * Ensures the bootstrap platform account exists and has super_admin.
 * Idempotent — safe to run after every hard-reset and at the end of each build.
 */
import { db } from "../db"
import { roles, userRoles, users } from "../db/schema"
import { and, eq } from "drizzle-orm"
import * as bcrypt from "bcryptjs"

const BOOTSTRAP_EMAIL = "admin@exemple.com"
const BOOTSTRAP_PASSWORD = "admin"
const BOOTSTRAP_USERNAME = "admin"

async function ensureBootstrapSuperAdmin() {
  console.log("🔐 Ensuring bootstrap super_admin account...")

  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.name, "super_admin"),
  })

  if (!superAdminRole) {
    console.error("❌ Role super_admin not found — run role seeding first")
    process.exit(1)
  }

  let bootstrapUser = await db.query.users.findFirst({
    where: eq(users.email, BOOTSTRAP_EMAIL),
  })

  if (!bootstrapUser) {
    const hashedPassword = await bcrypt.hash(BOOTSTRAP_PASSWORD, 10)
    const [createdUser] = await db
      .insert(users)
      .values({
        email: BOOTSTRAP_EMAIL,
        username: BOOTSTRAP_USERNAME,
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        isActive: true,
        isDpo: true,
        isSiteManager: true,
      })
      .returning()

    bootstrapUser = createdUser
    console.log(`  ✓ Created bootstrap user ${BOOTSTRAP_EMAIL}`)
  } else {
    console.log(`  ℹ️  Bootstrap user already exists (${BOOTSTRAP_EMAIL})`)
  }

  await db
    .insert(userRoles)
    .values({
      userId: bootstrapUser.id,
      roleId: superAdminRole.id,
    })
    .onConflictDoNothing()

  const assignment = await db.query.userRoles.findFirst({
    where: and(
      eq(userRoles.userId, bootstrapUser.id),
      eq(userRoles.roleId, superAdminRole.id),
    ),
  })

  if (!assignment) {
    console.error("❌ Failed to assign super_admin to bootstrap user")
    process.exit(1)
  }

  console.log("  ✓ Bootstrap user has super_admin role")
  console.log(`  📧 Email: ${BOOTSTRAP_EMAIL}`)
  console.log(`  🔑 Password: ${BOOTSTRAP_PASSWORD}`)
  console.log("✅ Bootstrap super_admin verified")
}

ensureBootstrapSuperAdmin().catch((error) => {
  console.error("❌ Bootstrap super_admin setup failed:", error)
  process.exit(1)
})
