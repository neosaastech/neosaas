'use server'

import { db } from "@/db"
import { termsOfService, userTosAcceptance, users, companies, roles, userRoles } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { headers } from "next/headers"

export async function getLatestTos() {
  try {
    const tos = await db.query.termsOfService.findFirst({
      where: eq(termsOfService.isActive, true),
      orderBy: [desc(termsOfService.publishedAt)],
    })
    return { success: true, data: tos }
  } catch (error) {
    console.error("Failed to fetch latest ToS:", error)
    return { success: false, error: "Failed to fetch Terms of Service" }
  }
}

export async function getAllTosVersions() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    const allTos = await db.query.termsOfService.findMany({
      orderBy: [desc(termsOfService.createdAt)],
      with: {
        creator: true
      }
    })
    return { success: true, data: allTos }
  } catch (error) {
    console.error("Failed to fetch ToS versions:", error)
    return { success: false, error: "Failed to fetch versions" }
  }
}

export async function createTos(data: { version: string, content: string }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    await db.insert(termsOfService).values({
      version: data.version,
      content: data.content,
      createdBy: currentUser.userId,
      isActive: false, // Draft by default
    })

    revalidatePath("/admin/legal")
    return { success: true, message: "ToS version created successfully" }
  } catch (error) {
    console.error("Failed to create ToS:", error)
    return { success: false, error: "Failed to create ToS version" }
  }
}

export async function publishTos(id: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.roles?.some(r => ['admin', 'super_admin'].includes(r))) {
      return { success: false, error: "Unauthorized" }
    }

    // Deactivate all others
    await db.update(termsOfService)
      .set({ isActive: false })
      .where(eq(termsOfService.isActive, true))

    // Activate this one
    await db.update(termsOfService)
      .set({ 
        isActive: true, 
        publishedAt: new Date() 
      })
      .where(eq(termsOfService.id, id))

    revalidatePath("/admin/legal")
    return { success: true, message: "ToS version published successfully" }
  } catch (error) {
    console.error("Failed to publish ToS:", error)
    return { success: false, error: "Failed to publish ToS version" }
  }
}

export async function acceptTos(tosId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    await db.insert(userTosAcceptance).values({
      userId: currentUser.userId,
      tosId: tosId,
      ipAddress: ip,
      userAgent: userAgent,
    })

    revalidatePath("/")
    return { success: true, message: "ToS accepted" }
  } catch (error) {
    console.error("Failed to accept ToS:", error)
    return { success: false, error: "Failed to accept ToS" }
  }
}

import { getPlatformConfig } from "@/lib/config"

export async function checkTosAcceptance() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: true, accepted: true } // Skip for guests
    }

    const latestTos = await db.query.termsOfService.findFirst({
      where: eq(termsOfService.isActive, true),
      orderBy: [desc(termsOfService.publishedAt)],
    })

    if (!latestTos) {
      return { success: true, accepted: true } // No active ToS to accept
    }

    const acceptance = await db.query.userTosAcceptance.findFirst({
      where: and(
        eq(userTosAcceptance.userId, currentUser.userId),
        eq(userTosAcceptance.tosId, latestTos.id)
      )
    })

    const config = await getPlatformConfig()

    return { 
      success: true, 
      accepted: !!acceptance, 
      tos: !acceptance ? latestTos : undefined,
      position: config.tosPosition || 'center'
    }
  } catch (error) {
    console.error("Failed to check ToS acceptance:", error)
    return { success: false, error: "Failed to check acceptance" }
  }
}

export async function getLegalCompanyDetails() {
  try {
    // First try to find the designated site manager
    const siteManager = await db.query.users.findFirst({
      where: eq(users.isSiteManager, true),
      with: {
        company: true
      }
    })

    // Find the DPO / Super Admin for privacy contact
    const dpoUser = await db.query.users.findFirst({
      where: eq(users.isDpo, true)
    })

    // Fallback to first super admin if no DPO
    const superAdmin = !dpoUser ? await db
      .select({
        user: users
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'super_admin'))
      .limit(1)
      .then(res => res[0]?.user) : null

    const privacyContactName = dpoUser 
      ? `${dpoUser.firstName} ${dpoUser.lastName}`
      : superAdmin 
        ? `${superAdmin.firstName} ${superAdmin.lastName}`
        : null

    if (siteManager) {
      return {
        name: siteManager.company?.name || `${siteManager.firstName} ${siteManager.lastName}`,
        address: siteManager.company?.address || siteManager.address,
        city: siteManager.company?.city || siteManager.city,
        zipCode: siteManager.company?.zipCode || siteManager.postalCode,
        siret: siteManager.company?.siret,
        vatNumber: siteManager.company?.vatNumber,
        email: siteManager.company?.email || siteManager.email,
        phone: siteManager.company?.phone || siteManager.phone,
        isPerson: !siteManager.company,
        superAdminName: privacyContactName
      }
    }

    // Fallback to first super admin's company if no site manager designated
    const superAdmins = await db
      .select({
        company: companies
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(roles.name, 'super_admin'))
      .limit(1)
      
    if (superAdmins.length > 0 && superAdmins[0].company) {
        return {
          ...superAdmins[0].company,
          superAdminName: privacyContactName
        }
    }
    
    return null
  } catch (error) {
    console.error("Failed to fetch legal company details:", error)
    return null
  }
}

