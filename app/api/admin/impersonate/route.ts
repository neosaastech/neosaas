import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/server"
import { db } from "@/db"
import { users, userRoles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { SignJWT } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-min-32-characters-long"
)

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    const admin = await requireAdmin()

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Empêcher l'impersonnation d'un super admin
    const isSuperAdmin = targetUser.userRoles.some(
      ur => ur.role.name === "super_admin"
    )

    if (isSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot impersonate a super admin" },
        { status: 403 }
      )
    }

    // Créer un nouveau token JWT pour l'utilisateur cible
    const token = await new SignJWT({
      userId: targetUser.id,
      email: targetUser.email,
      roles: targetUser.userRoles.map(ur => ur.role.name),
      impersonatedBy: admin.userId, // Garder trace de l'admin qui impersonne
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h") // Session d'impersonnation limitée à 2h
      .sign(JWT_SECRET)

    // Définir le cookie de session
    const cookieStore = cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 heures
      path: "/",
    })

    // Log de l'action d'impersonnation (pour audit)
    console.log(`[IMPERSONATION] Admin ${admin.email} (${admin.userId}) is now impersonating user ${targetUser.email} (${targetUser.id})`)

    return NextResponse.json({
      success: true,
      message: `Now impersonating ${targetUser.email}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName
      }
    })

  } catch (error) {
    console.error("Error during impersonation:", error)
    return NextResponse.json(
      { error: "Failed to impersonate user" },
      { status: 500 }
    )
  }
}

// Route pour terminer l'impersonnation et revenir au compte admin
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Récupérer l'ID de l'admin qui impersonne depuis le token
    const payload = await fetch(request.url, {
      headers: {
        Cookie: `auth-token=${token}`
      }
    }).then(() => {
      // Logique pour décoder le token et récupérer impersonatedBy
      // Pour l'instant, on supprime simplement le cookie
    })

    // Supprimer le cookie d'impersonnation
    cookieStore.delete("auth-token")

    return NextResponse.json({
      success: true,
      message: "Impersonation ended"
    })

  } catch (error) {
    console.error("Error ending impersonation:", error)
    return NextResponse.json(
      { error: "Failed to end impersonation" },
      { status: 500 }
    )
  }
}
