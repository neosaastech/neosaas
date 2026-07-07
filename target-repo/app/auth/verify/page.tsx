import { db } from "@/db"
import { users, verificationTokens, userRoles } from "@/db/schema"
import { eq, and, gt } from "drizzle-orm"
import { redirect } from "next/navigation"
import { createToken, setAuthCookie } from "@/lib/auth"

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams

  if (!token || !email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-2xl font-bold text-red-500">Invalid Request</h1>
        <p className="mt-4">Missing verification token or email.</p>
      </div>
    )
  }

  // Verify token
  const storedToken = await db.query.verificationTokens.findFirst({
    where: and(
      eq(verificationTokens.identifier, email),
      eq(verificationTokens.token, token),
      gt(verificationTokens.expires, new Date())
    ),
  })

  if (!storedToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-2xl font-bold text-red-500">Verification Failed</h1>
        <p className="mt-4">This verification link is invalid or has expired.</p>
      </div>
    )
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-2xl font-bold text-red-500">User Not Found</h1>
        <p className="mt-4">We could not find a user associated with this email.</p>
      </div>
    )
  }

  // Update user
  await db.update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, user.id))

  // Delete token
  await db.delete(verificationTokens)
    .where(and(
      eq(verificationTokens.identifier, email),
      eq(verificationTokens.token, token)
    ))

  // Get roles for token
  const userRolesList = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, user.id),
    with: {
      role: true,
    },
  })
  
  const roleNames = userRolesList.map(ur => ur.role.name)
  // Simplified permissions for now, ideally fetch from DB
  const permissions = roleNames.includes("writer") ? ["read", "write", "invite", "manage_users"] : ["read"]

  // Create session
  const sessionToken = createToken({
    userId: user.id,
    email: user.email,
    companyId: user.companyId || undefined,
    roles: roleNames,
    permissions: permissions,
  })

  await setAuthCookie(sessionToken)

  redirect("/dashboard")
}
