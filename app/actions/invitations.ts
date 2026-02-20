'use server'

import { db } from "@/db"
import { userInvitations, users, companies, roles, userRoles } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getCurrentUser, hashPassword, createToken, setAuthCookie } from "@/lib/auth"
import { emailRouter, emailTemplateRepository } from "@/lib/email"
import { headers } from "next/headers"
import { getPlatformConfig } from "@/lib/config"

export async function resendInvitation(invitationId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    // Get invitation details
    const invitation = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.id, invitationId),
      with: {
        company: true,
        role: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invitation not found" }
    }

    // Check permissions (must be admin of the company or platform admin)
    // Simplified check: if user is in the same company or is super_admin
    // In a real app, you'd check specific permissions
    const isPlatformAdmin = currentUser.roles?.some(r => ['admin', 'super_admin'].includes(r))
    const isCompanyAdmin = currentUser.companyId === invitation.companyId // Assuming basic check for now

    if (!isPlatformAdmin && !isCompanyAdmin) {
      return { success: false, error: "You do not have permission to manage this invitation" }
    }

    // Send invitation email
    try {
      const template = await emailTemplateRepository.getTemplate("user_invitation")
      if (template && template.isActive) {
        let host = "localhost:3000"
        try {
          const headersList = await headers()
          host = headersList.get("host") || "localhost:3000"
        } catch (e) {
          console.error("Error getting headers:", e)
        }
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
        const inviteUrl = `${protocol}://${host}/auth/accept-invite?token=${invitation.token}`

        let htmlContent = template.htmlContent || ""
        let textContent = template.textContent || ""
        const subject = template.subject.replace("{{siteName}}", "NeoSaaS")

        // Get inviter info (current user doing the resend)
        const inviter = await db.query.users.findFirst({
          where: eq(users.id, currentUser.userId),
        })

        // Replace variables
        const variables = {
          inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "Someone",
          companyName: invitation.company?.name || "the team",
          actionUrl: inviteUrl,
          siteName: "NeoSaaS",
          roleName: invitation.role?.name === "writer" ? "Writer (Read & Write)" : "Reader (Read only)",
        }

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
          htmlContent = htmlContent.replace(regex, value)
          textContent = textContent.replace(regex, value)
        })

        const platformConfig = await getPlatformConfig()

        await emailRouter.sendEmail({
          to: [invitation.email],
          from: template.fromEmail || platformConfig.defaultSenderEmail || "no-reply@neosaas.tech",
          fromName: template.fromName || undefined,
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent,
        })
        
        return { success: true, message: "Invitation resent successfully" }
      } else {
        return { success: false, error: "Email template not found or inactive" }
      }
    } catch (emailError) {
      console.error("Failed to resend invitation email:", emailError)
      return { success: false, error: "Failed to send email" }
    }
  } catch (error) {
    console.error("Resend invitation error:", error)
    return { success: false, error: "An error occurred while resending the invitation" }
  }
}

export async function getPendingInvitations() {
    try {
        const invitations = await db.query.userInvitations.findMany({
            where: eq(userInvitations.status, 'pending'),
            with: {
                company: true,
                role: true
            },
            orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
        })
        return { success: true, data: invitations }
    } catch (error) {
        console.error("Failed to fetch pending invitations:", error)
        return { success: false, error: "Failed to fetch invitations" }
    }
}

export async function cancelInvitation(invitationId: string) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: "Not authenticated" }
        }

        // Check permissions similar to resend
        const invitation = await db.query.userInvitations.findFirst({
            where: eq(userInvitations.id, invitationId)
        })

        if (!invitation) {
            return { success: false, error: "Invitation not found" }
        }

        const isPlatformAdmin = currentUser.roles?.some(r => ['admin', 'super_admin'].includes(r))
        const isCompanyAdmin = currentUser.companyId === invitation.companyId

        if (!isPlatformAdmin && !isCompanyAdmin) {
            return { success: false, error: "Permission denied" }
        }

        await db.delete(userInvitations).where(eq(userInvitations.id, invitationId))
        
        revalidatePath("/admin/users")
        return { success: true, message: "Invitation cancelled successfully" }
    } catch (error) {
        console.error("Cancel invitation error:", error)
        return { success: false, error: "Failed to cancel invitation" }
    }
}

export async function acceptInvitation(token: string, data: { firstName: string, lastName: string, password: string }) {
  try {
    // Find invitation
    const invitation = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.token, token),
      with: {
        role: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invalid or expired invitation" }
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: "Invitation already accepted or expired" }
    }

    if (new Date() > invitation.expiresAt) {
      return { success: false, error: "Invitation expired" }
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, invitation.email)
    })

    if (existingUser) {
      // If user exists, just add them to company/role?
      // For now, let's assume invitation is for NEW user.
      // If user exists, they should probably login and accept invite from dashboard?
      // Or we just link them.
      return { success: false, error: "User with this email already exists. Please login to accept invitation." }
    }

    const hashedPassword = await hashPassword(data.password)

    // Create user
    const [newUser] = await db.insert(users).values({
      email: invitation.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashedPassword,
      companyId: invitation.companyId,
      isActive: true,
      emailVerified: new Date(), // Auto verify email since they clicked the link
    }).returning()

    // Assign role
    let roleName = "reader"
    if (invitation.roleId) {
      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: invitation.roleId
      })
      
      const role = await db.query.roles.findFirst({
        where: eq(roles.id, invitation.roleId)
      })
      if (role) roleName = role.name
    }

    // Update invitation status
    await db.update(userInvitations)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(userInvitations.id, invitation.id))

    // Create session and login
    const permissions = roleName === "writer" ? ["read", "write", "invite"] : ["read"]
    const sessionToken = createToken({
      userId: newUser.id,
      email: newUser.email,
      companyId: newUser.companyId || undefined,
      roles: [roleName],
      permissions: permissions,
    })

    await setAuthCookie(sessionToken)

    return { success: true, message: "Invitation accepted successfully" }
  } catch (error) {
    console.error("Accept invitation error:", error)
    return { success: false, error: "Failed to accept invitation" }
  }
}

export async function getInvitationByToken(token: string) {
  try {
    const invitation = await db.query.userInvitations.findFirst({
      where: eq(userInvitations.token, token),
      with: {
        company: true,
        role: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invitation not found" }
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: "Invitation is no longer valid" }
    }

    if (new Date() > invitation.expiresAt) {
      return { success: false, error: "Invitation expired" }
    }

    return { success: true, invitation }
  } catch (error) {
    console.error("Get invitation error:", error)
    return { success: false, error: "Failed to fetch invitation" }
  }
}
