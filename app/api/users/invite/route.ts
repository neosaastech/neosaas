import { type NextRequest, NextResponse } from "next/server"
import { db, validateDatabaseUrl } from "@/db"
import { users, userRoles, roles, rolePermissions, permissions, userInvitations, companies } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq, and } from "drizzle-orm"
import crypto from "crypto"
import { emailRouter, emailTemplateRepository } from "@/lib/email"
import { getPlatformConfig } from "@/lib/config"

/**
 * POST /api/users/invite
 * Invite a new user to the company
 */
export async function POST(request: NextRequest) {
  try {
    validateDatabaseUrl()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is platform admin (super_admin or admin)
    const isPlatformAdmin = currentUser.roles?.some(role => ["super_admin", "admin"].includes(role));

    if (!isPlatformAdmin) {
      const hasInvitePermission = await db
        .select({ permissionName: permissions.name })
        .from(userRoles)
        .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(and(eq(userRoles.userId, currentUser.userId), eq(permissions.name, "invite")))
        .limit(1)

      if (hasInvitePermission.length === 0) {
        return NextResponse.json({ error: "You do not have permission to invite users" }, { status: 403 })
      }
    }

    const body = await request.json()
    const { email, role: roleName, companyId } = body

    // Validate fields
    if (!email || !roleName) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }

    // Fetch fresh user data from DB to ensure we have the latest companyId
    // (The token might be stale if the user just created a company)
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.userId),
      columns: {
        companyId: true
      }
    });

    // Determine target company ID
    // If user has a company, use it. If not (platform admin), use the one provided in body.
    const targetCompanyId = dbUser?.companyId || companyId;

    if (!targetCompanyId) {
      return NextResponse.json({ error: "Company ID is required for platform admins" }, { status: 400 })
    }

    // Validate role - only company-scope roles allowed (reader, writer)
    // Platform roles (admin, super_admin) cannot be assigned via user invitation
    if (!["reader", "writer"].includes(roleName)) {
      return NextResponse.json({ error: "Invalid role. Must be reader or writer" }, { status: 400 })
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const roleData = await db.query.roles.findFirst({
      where: eq(roles.name, roleName),
    })

    if (!roleData) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const [invitation] = await db
      .insert(userInvitations)
      .values({
        email,
        companyId: targetCompanyId,
        roleId: roleData.id,
        invitedBy: currentUser.userId,
        token,
        status: "pending",
        expiresAt,
      })
      .returning()

    console.log(`[v0] Invitation created for ${email} with token: ${token}`)

    // Send invitation email
    try {
      const template = await emailTemplateRepository.getTemplate("user_invitation")
      if (template && template.isActive) {
        const host = request.headers.get("host") || "localhost:3000"
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
        const inviteUrl = `${protocol}://${host}/auth/accept-invite?token=${token}`

        let htmlContent = template.htmlContent || ""
        let textContent = template.textContent || ""
        const subject = template.subject.replace("{{siteName}}", "NeoSaaS")

        // Get current user info for the inviter name
        const inviter = await db.query.users.findFirst({
          where: eq(users.id, currentUser.userId),
        })

        // Get company info
        const company = await db.query.companies.findFirst({
          where: eq(companies.id, currentUser.companyId!),
        })

        // Replace variables
        const variables = {
          inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : "Someone",
          companyName: company?.name || "the team",
          actionUrl: inviteUrl,
          siteName: "NeoSaaS",
          roleName: roleName === "writer" ? "Writer (Read & Write)" : "Reader (Read only)",
        }

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
          htmlContent = htmlContent.replace(regex, value)
          textContent = textContent.replace(regex, value)
        })

        const platformConfig = await getPlatformConfig()

        await emailRouter.sendEmail({
          to: [email],
          from: template.fromEmail || platformConfig.defaultSenderEmail || "no-reply@neosaas.tech",
          fromName: template.fromName || undefined,
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent,
        })
        console.log(`[v0] Invitation email sent to ${email}`)
      } else {
        console.warn("[v0] user_invitation template not found or inactive, invitation created but email not sent")
      }
    } catch (emailError) {
      console.error("[v0] Failed to send invitation email:", emailError)
      // Don't fail the invitation if email fails
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      message: "Invitation sent successfully",
    })
  } catch (error) {
    console.error("Invite user error:", error)
    return NextResponse.json({ error: "An error occurred while inviting the user" }, { status: 500 })
  }
}
