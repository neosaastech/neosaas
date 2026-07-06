import type { AuthUser } from "@/lib/auth/server"
import type { SessionUser } from "@/lib/contexts/user-context"

export function sessionUserFromAuth(authUser: AuthUser): SessionUser {
  return {
    id: authUser.userId,
    email: authUser.email,
    firstName: null,
    lastName: null,
    companyId: authUser.companyId ?? null,
    isActive: true,
    roles: (authUser.roles ?? []).map((roleName) => ({
      roleName,
      roleDescription: "",
    })),
    permissions: (authUser.permissions ?? []).map((permissionName) => ({
      permissionName,
      permissionDescription: "",
    })),
  }
}
