'use server'

import { db } from "@/db"
import { users, userInvitations, userRoles, roles } from "@/db/schema"
import { eq, and, inArray, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/auth"
import { logSystemEvent } from "@/app/actions/logs"

export async function cancelInvitation(invitationId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify the invitation belongs to the user's company
    const invitation = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.id, invitationId),
    })

    if (!invitation) {
      return { success: false, error: "Invitation not found" }
    }

    // Check permissions: User must be admin/super_admin OR be in the same company with invite permissions
    // For simplicity here, we check if the user is in the same company
    // In a real scenario, we should check for specific permissions
    
    // If user is platform admin, they can delete any invitation
    const isPlatformAdmin = currentUser.roles?.some(r => ['admin', 'super_admin'].includes(r));
    
    if (!isPlatformAdmin && invitation.companyId !== currentUser.companyId) {
      return { success: false, error: "You do not have permission to cancel this invitation" }
    }

    await db.delete(userInvitations).where(eq(userInvitations.id, invitationId))

    revalidatePath("/dashboard/company-management")
    return { success: true, message: "Invitation cancelled successfully" }
  } catch (error) {
    console.error("Failed to cancel invitation:", error)
    return { success: false, error: "Failed to cancel invitation" }
  }
}

export async function removeUserFromCompany(userId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!targetUser) {
      return { success: false, error: "User not found" }
    }

    // Check permissions
    const isPlatformAdmin = currentUser.roles?.some(r => ['admin', 'super_admin'].includes(r));
    
    if (!isPlatformAdmin) {
        if (targetUser.companyId !== currentUser.companyId) {
            return { success: false, error: "You can only remove users from your own company" }
        }
        // Also check if current user has 'manage_users' permission (omitted for brevity, assuming writer/admin role implies it or UI handles it)
    }

    // Incident NeoStudio du 25/10/2026 : un super admin s'est retiré lui-même de son entreprise (la corbeille était
    // affichée sur sa propre ligne) et a perdu rôle d'entreprise, droits et entreprise, sans trace. Ni soi-même, ni le
    // dernier membre d'une entreprise.
    let refusal: string | null = null
    if (targetUser.id === currentUser.userId) {
      refusal = "You cannot remove yourself from your company"
    } else if (targetUser.companyId) {
      const others = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.companyId, targetUser.companyId), ne(users.id, targetUser.id)))
        .limit(1)
      if (!others.length) refusal = "A company cannot lose its last member"
    }
    if (refusal) {
      await logSystemEvent({
        category: 'auth',
        level: 'warning',
        message: `Removal from company refused: ${targetUser.email} — ${refusal}`,
        metadata: { targetUserId: targetUser.id, companyId: targetUser.companyId },
        userId: currentUser.userId,
        resourceId: targetUser.id,
      }).catch(() => {})
      return { success: false, error: refusal }
    }

    // 1. Remove company-scoped roles
    const companyRoles = await db.select({ id: roles.id }).from(roles).where(eq(roles.scope, 'company'));
    const companyRoleIds = companyRoles.map(r => r.id);

    if (companyRoleIds.length > 0) {
        await db.delete(userRoles)
            .where(and(
                eq(userRoles.userId, userId),
                inArray(userRoles.roleId, companyRoleIds)
            ));
    }

    // 2. Set companyId to null
    await db.update(users)
      .set({ companyId: null })
      .where(eq(users.id, userId))

    await logSystemEvent({
      category: 'auth',
      level: 'warning',
      message: `User removed from company: ${targetUser.email}`,
      metadata: { targetUserId: targetUser.id, companyId: targetUser.companyId },
      userId: currentUser.userId,
      resourceId: targetUser.id,
    }).catch(() => {})

    revalidatePath("/dashboard/company-management")
    return { success: true, message: "User removed from company successfully" }
  } catch (error) {
    console.error("Failed to remove user from company:", error)
    return { success: false, error: "Failed to remove user from company" }
  }
}
