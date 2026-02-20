'use server'

import { db } from "@/db"
import { users, companies, roles, userRoles, systemLogs, termsOfService, paymentMethods, userInvitations } from "@/db/schema"
import { eq, and, ne, or, inArray, isNotNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { hashPassword, verifyPassword, getCurrentUser } from "@/lib/auth"
import { emailRouter, emailTemplateRepository } from "@/lib/email"
import { getPlatformConfig } from "@/lib/config"
import { ensureStripeCustomer, updateStripeCustomerMetadata, deleteStripeCustomer } from "@/lib/stripe-customers"

export async function getUsers() {
  try {
    const allUsers = await db.query.users.findMany({
      with: {
        company: true,
        userRoles: {
          with: {
            role: true
          }
        }
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })
    return { success: true, data: allUsers }
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}

export async function createUser(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const username = formData.get("username") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const password = formData.get("password") as string
    const roleName = formData.get("role") as string
    const companyIdRaw = formData.get("companyId") as string
    // Handle "none" value as null for companyId
    const companyId = companyIdRaw && companyIdRaw !== "none" ? companyIdRaw : null

    if (!email || !firstName || !lastName || !password) {
      return { success: false, error: "Missing required fields" }
    }

    // Check if user exists (email or username)
    const conditions = [eq(users.email, email)]
    if (username) {
      conditions.push(eq(users.username, username))
    }

    const existingUser = await db.query.users.findFirst({
      where: conditions.length > 1 ? or(...conditions) : conditions[0]
    })

    if (existingUser) {
      return { success: false, error: "User with this email or username already exists" }
    }

    const hashedPassword = await hashPassword(password)

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      username: username || null,
      firstName,
      lastName,
      password: hashedPassword,
      companyId,
    }).returning()

    // Assign role if provided
    if (roleName) {
      const role = await db.query.roles.findFirst({
        where: eq(roles.name, roleName)
      })

      if (role) {
        await db.insert(userRoles).values({
          userId: newUser.id,
          roleId: role.id
        })
      }
    }

    revalidatePath("/admin/users")
    return { success: true, message: "User created successfully" }
  } catch (error) {
    console.error("Failed to create user:", error)
    return { success: false, error: "Failed to create user" }
  }
}

export async function setSiteManager(userId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.includes('super_admin')) {
      return { success: false, error: "Unauthorized" }
    }

    // 1. Unset isSiteManager for ALL users
    await db.update(users)
      .set({ isSiteManager: false })
      .where(ne(users.id, userId)) // Optimization: don't update the target user yet if we can avoid it, but actually we want to clear everyone else.
      // Actually, simpler to clear everyone first or use a transaction.
      // Let's just clear everyone who is currently a manager (should be max 1)
    
    await db.update(users)
      .set({ isSiteManager: false })
      .where(eq(users.isSiteManager, true))

    // 2. Set isSiteManager for the target user
    await db.update(users)
      .set({ isSiteManager: true })
      .where(eq(users.id, userId))

    revalidatePath("/admin/users")
    revalidatePath("/legal/privacy")
    return { success: true, message: "Site manager updated successfully" }
  } catch (error) {
    console.error("Failed to set site manager:", error)
    return { success: false, error: "Failed to set site manager" }
  }
}

export async function setDpo(userId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.includes('super_admin')) {
      return { success: false, error: "Unauthorized" }
    }

    // Verify the target user has admin or super_admin role (GDPR: DPO must be a platform admin)
    const targetUserRoles = await db.query.userRoles.findMany({
      where: eq(userRoles.userId, userId),
      with: { role: true },
    })
    const isAdminOrSuperAdmin = targetUserRoles.some(
      (ur) => ur.role.name === 'admin' || ur.role.name === 'super_admin'
    )
    if (!isAdminOrSuperAdmin) {
      return {
        success: false,
        error: "The DPO must be a platform administrator (admin or super_admin)",
      }
    }

    // 1. Unset isDpo for ALL users
    await db.update(users)
      .set({ isDpo: false })
      .where(eq(users.isDpo, true))

    // 2. Set isDpo for the target user
    await db.update(users)
      .set({ isDpo: true })
      .where(eq(users.id, userId))

    revalidatePath("/admin/users")
    revalidatePath("/legal/privacy")
    return { success: true, message: "DPO updated successfully" }
  } catch (error) {
    console.error("Failed to set DPO:", error)
    return { success: false, error: "Failed to set DPO" }
  }
}

export async function deleteUser(userId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.userId === userId) {
      return { success: false, error: "You cannot delete your own account" }
    }

    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        company: true,
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    if (!userToDelete) {
      return { success: false, error: "User not found" }
    }

    // Check if user is the last owner of a company
    if (userToDelete.companyId) {
      // Assuming 'admin' role with 'company' scope is the owner
      const isOwner = userToDelete.userRoles.some(ur => ur.role.name === 'admin' && ur.role.scope === 'company')
      
      if (isOwner) {
        // Check if there are other owners in the same company
        const otherOwners = await db.query.userRoles.findMany({
          where: and(
            ne(userRoles.userId, userId),
            eq(userRoles.roleId, userToDelete.userRoles.find(ur => ur.role.name === 'admin' && ur.role.scope === 'company')?.roleId!)
          ),
          with: {
            user: true
          }
        })

        const otherCompanyOwners = otherOwners.filter(ur => ur.user.companyId === userToDelete.companyId)

        if (otherCompanyOwners.length === 0) {
          // Last owner, delete company
          await db.delete(companies).where(eq(companies.id, userToDelete.companyId))
          // Users are deleted via cascade if configured, but let's be safe and delete the user explicitly if not
          // Actually, if we delete company, and users have companyId as FK, what happens?
          // Schema: companyId: uuid("company_id").references(() => companies.id)
          // It doesn't say onDelete cascade. So we might need to delete users first or update them.
          // But wait, if we delete the user first, then we delete the company.
          // Let's delete the user first.
        }
      }
    }

    // Nullify FK references in tables using ON DELETE NO ACTION
    // (avoids FK violation when deleting the user row)
    await Promise.all([
      db.update(systemLogs)
        .set({ userId: null })
        .where(eq(systemLogs.userId, userId)),
      db.update(termsOfService)
        .set({ createdBy: null })
        .where(eq(termsOfService.createdBy, userId)),
      db.update(paymentMethods)
        .set({ addedBy: null })
        .where(eq(paymentMethods.addedBy, userId)),
      db.update(userInvitations)
        .set({ invitedBy: null })
        .where(eq(userInvitations.invitedBy, userId)),
    ])

    await db.delete(users).where(eq(users.id, userId))

    // Send deletion email
    try {
      const template = await emailTemplateRepository.getTemplate('account_deletion')
      if (template) {
        let htmlContent = template.htmlContent || ""
        let textContent = template.textContent || ""
        const subject = template.subject.replace('{{siteName}}', 'NeoSaaS')

        // Replace variables
        const variables = {
          firstName: userToDelete.firstName,
          siteName: 'NeoSaaS'
        }

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
          htmlContent = htmlContent.replace(regex, value)
          textContent = textContent.replace(regex, value)
        })

        const platformConfig = await getPlatformConfig()

        await emailRouter.sendEmail({
          to: [userToDelete.email],
          from: template.fromEmail || platformConfig.defaultSenderEmail || "no-reply@neosaas.tech",
          fromName: template.fromName || undefined,
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent,
        })
      }
    } catch (emailError) {
      console.error("Failed to send deletion email:", emailError)
      // Don't fail the deletion if email fails
    }
    
    revalidatePath("/admin/users")
    return { success: true, message: "User deleted successfully" }
  } catch (error) {
    console.error("Failed to delete user:", error)
    return { success: false, error: "Failed to delete user" }
  }
}

export async function updateUserRole(userId: string, roleName: string) {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.userId === userId) {
      return { success: false, error: "You cannot change your own role" }
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.name, roleName)
    })

    if (!role) {
      return { success: false, error: "Role not found" }
    }

    // Remove existing roles (simplified for single role per user scenario, though schema supports multiple)
    await db.delete(userRoles).where(eq(userRoles.userId, userId))

    // Add new role
    await db.insert(userRoles).values({
      userId,
      roleId: role.id
    })

    revalidatePath("/admin/users")
    return { success: true, message: "User role updated successfully" }
  } catch (error) {
    console.error("Failed to update user role:", error)
    return { success: false, error: "Failed to update user role" }
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.password)

    if (!isPasswordValid) {
      return { success: false, error: "Incorrect current password" }
    }

    const hashedPassword = await hashPassword(newPassword)

    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))

    return { success: true, message: "Password updated successfully" }
  } catch (error) {
    console.error("Failed to update password:", error)
    return { success: false, error: "Failed to update password" }
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk update user status (activate/deactivate)
 */
export async function bulkUpdateUserStatus(userIds: string[], isActive: boolean) {
  try {
    if (!userIds || userIds.length === 0) {
      return { success: false, error: "No users selected" }
    }

    const currentUser = await getCurrentUser()
    if (currentUser && userIds.includes(currentUser.userId)) {
      return { success: false, error: "You cannot change your own status" }
    }

    const updatedUsers = await Promise.all(
      userIds.map(async (userId) => {
        const [updated] = await db
          .update(users)
          .set({ isActive, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning()
        return updated
      })
    )

    revalidatePath("/admin/users")
    return {
      success: true,
      message: `${updatedUsers.length} user(s) ${isActive ? 'activated' : 'deactivated'} successfully`,
      count: updatedUsers.length
    }
  } catch (error) {
    console.error("Failed to bulk update user status:", error)
    return { success: false, error: "Failed to update user status" }
  }
}

/**
 * Update single user status (activate/deactivate)
 */
export async function updateUserStatus(userId: string, isActive: boolean) {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.userId === userId) {
      return { success: false, error: "You cannot change your own status" }
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      return { success: false, error: "User not found" }
    }

    revalidatePath("/admin/users")
    return {
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    }
  } catch (error) {
    console.error("Failed to update user status:", error)
    return { success: false, error: "Failed to update user status" }
  }
}

/**
 * Update user details
 */
export async function updateUser(userId: string, data: {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  position?: string
  companyId?: string | null
}) {
  try {
    // Get current user data to check for changes
    const currentUserData = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!currentUserData) {
      return { success: false, error: "User not found" }
    }

    // Check if email or username is being changed and if it's already taken
    if (data.email || data.username) {
      const conditions = []
      if (data.email && data.email !== currentUserData.email) conditions.push(eq(users.email, data.email))
      if (data.username && data.username !== currentUserData.username) conditions.push(eq(users.username, data.username))

      if (conditions.length > 0) {
        const existingUser = await db.query.users.findFirst({
          where: and(
            conditions.length > 1 ? or(...conditions) : conditions[0],
            ne(users.id, userId)
          )
        })
        if (existingUser) {
          return { success: false, error: "Email or username already in use by another user" }
        }
      }
    }

    const [updatedUser] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()

    if (!updatedUser) {
      return { success: false, error: "User not found" }
    }

    // Send email notification if email changed
    if (data.email && data.email !== currentUserData.email) {
      try {
        const template = await emailTemplateRepository.getTemplate('email_update_notification')
        if (template) {
          let htmlContent = template.htmlContent || ""
          let textContent = template.textContent || ""
          const subject = template.subject.replace('{{siteName}}', 'NeoSaaS')

          const variables = {
            firstName: updatedUser.firstName,
            siteName: 'NeoSaaS',
            newEmail: updatedUser.email,
            companyName: 'NeoSaaS'
          }

          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g')
            htmlContent = htmlContent.replace(regex, value)
            textContent = textContent.replace(regex, value)
          })

          // Send to the NEW email
          await emailRouter.sendEmail({
            to: [updatedUser.email],
            from: template.fromEmail,
            fromName: template.fromName || undefined,
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent,
          })
          
          // Optional: Send to OLD email as well for security
        }
      } catch (emailError) {
        console.error("Failed to send email update notification:", emailError)
      }
    }

    revalidatePath("/admin/users")
    return { success: true, message: "User updated successfully", data: updatedUser }
  } catch (error) {
    console.error("Failed to update user:", error)
    return { success: false, error: "Failed to update user" }
  }
}

// =============================================================================
// COMPANY OPERATIONS
// =============================================================================

/**
 * Get all companies
 */
export async function getCompanies() {
  try {
    const allCompanies = await db.query.companies.findMany({
      with: {
        users: {
          with: {
            userRoles: {
              with: {
                role: true
              }
            }
          }
        }
      },
      orderBy: (companies, { desc }) => [desc(companies.createdAt)],
    })
    return { success: true, data: allCompanies }
  } catch (error) {
    console.error("Failed to fetch companies:", error)
    return { success: false, error: "Failed to fetch companies" }
  }
}

/**
 * Update single company status (activate/deactivate)
 */
export async function updateCompanyStatus(companyId: string, isActive: boolean) {
  try {
    const [updatedCompany] = await db
      .update(companies)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning()

    if (!updatedCompany) {
      return { success: false, error: "Company not found" }
    }

    // Also update all users belonging to this company
    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.companyId, companyId))

    revalidatePath("/admin/users")
    revalidatePath("/admin/companies")
    return {
      success: true,
      message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`
    }
  } catch (error) {
    console.error("Failed to update company status:", error)
    return { success: false, error: "Failed to update company status" }
  }
}

/**
 * Bulk update company status (activate/deactivate)
 */
export async function bulkUpdateCompanyStatus(companyIds: string[], isActive: boolean) {
  try {
    if (!companyIds || companyIds.length === 0) {
      return { success: false, error: "No companies selected" }
    }

    const results = await Promise.all(
      companyIds.map(async (companyId) => {
        // Update company
        const [updated] = await db
          .update(companies)
          .set({ isActive, updatedAt: new Date() })
          .where(eq(companies.id, companyId))
          .returning()

        // Also update all users belonging to this company
        await db
          .update(users)
          .set({ isActive, updatedAt: new Date() })
          .where(eq(users.companyId, companyId))

        return updated
      })
    )

    revalidatePath("/admin/users")
    revalidatePath("/admin/companies")
    return {
      success: true,
      message: `${results.length} company(ies) ${isActive ? 'activated' : 'deactivated'} successfully`,
      count: results.length
    }
  } catch (error) {
    console.error("Failed to bulk update company status:", error)
    return { success: false, error: "Failed to update company status" }
  }
}

/**
 * Update company details
 */
export async function updateCompany(companyId: string, data: {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  zipCode?: string
  siret?: string
  vatNumber?: string
}) {
  try {
    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingCompany = await db.query.companies.findFirst({
        where: and(eq(companies.email, data.email), ne(companies.id, companyId))
      })
      if (existingCompany) {
        return { success: false, error: "Email already in use by another company" }
      }
    }

    const [updatedCompany] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning()

    if (!updatedCompany) {
      return { success: false, error: "Company not found" }
    }

    // Sync to Stripe (non-blocking)
    // Already linked → push updated fields (name, email, phone, address...)
    // Not yet linked → create the customer now so the current data is used immediately
    if (updatedCompany.stripeCustomerId) {
      updateStripeCustomerMetadata(companyId, true).catch((err) =>
        console.error('[updateCompany] Stripe sync error:', err?.message)
      )
    } else {
      ensureStripeCustomer(companyId).catch((err) =>
        console.error('[updateCompany] Stripe customer creation error:', err?.message)
      )
    }

    revalidatePath("/admin/users")
    revalidatePath("/admin/companies")
    return { success: true, message: "Company updated successfully", data: updatedCompany }
  } catch (error) {
    console.error("Failed to update company:", error)
    return { success: false, error: "Failed to update company" }
  }
}

/**
 * Create a new company
 */
export async function createCompany(data: {
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  zipCode?: string
  siret?: string
  vatNumber?: string
}) {
  try {
    // Check if email is already taken
    const existingCompany = await db.query.companies.findFirst({
      where: eq(companies.email, data.email)
    })
    if (existingCompany) {
      return { success: false, error: "A company with this email already exists" }
    }

    const [newCompany] = await db
      .insert(companies)
      .values(data)
      .returning()

    // Create Stripe customer immediately (non-blocking)
    ensureStripeCustomer(newCompany.id).catch((err) =>
      console.error('[createCompany] Stripe customer creation error:', err?.message)
    )

    revalidatePath("/admin/companies")
    return { success: true, message: "Company created successfully", data: newCompany }
  } catch (error) {
    console.error("Failed to create company:", error)
    return { success: false, error: "Failed to create company" }
  }
}

/**
 * Delete a company
 */
export async function deleteCompany(companyId: string) {
  try {
    // First check if company has users
    const companyUsers = await db.query.users.findMany({
      where: eq(users.companyId, companyId)
    })

    if (companyUsers.length > 0) {
      return {
        success: false,
        error: `Cannot delete company with ${companyUsers.length} active user(s). Please reassign or delete users first.`
      }
    }

    // Delete Stripe customer before removing from DB (non-blocking)
    deleteStripeCustomer(companyId).catch((err) =>
      console.error('[deleteCompany] Stripe customer deletion error:', err?.message)
    )

    await db.delete(companies).where(eq(companies.id, companyId))

    revalidatePath("/admin/companies")
    return { success: true, message: "Company deleted successfully" }
  } catch (error) {
    console.error("Failed to delete company:", error)
    return { success: false, error: "Failed to delete company" }
  }
}
