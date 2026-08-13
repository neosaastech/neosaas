"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { authors, type AuthorSocialLinkInput } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"

// Charles (2026-08-13): "ma base utilisateur et admin/rédacteur est la
// même... on doit retrouver l'admin et sa description dans sa fiche."
// Unlike Pages/BlogPosts/Modules, an author's rich profile (bio, avatar,
// social links, visibility, siteUserId link) lives entirely on this site's
// own `authors` table — never in Payload — so these actions talk to
// Drizzle directly instead of going through lib/payload-bridge.ts.

async function requireAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.roles?.some((r) => ["admin", "super_admin"].includes(r))) {
    throw new Error("Unauthorized")
  }
}

export interface AuthorListRow {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isActive: boolean
  siteUserName: string | null
}

export async function listAuthors(): Promise<{ success: true; data: AuthorListRow[] } | { success: false; error: string }> {
  try {
    await requireAdmin()
    const rows = await db.query.authors.findMany({
      with: { siteUser: true },
      orderBy: (a, { asc }) => [asc(a.name)],
    })
    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        avatarUrl: r.avatarUrl,
        isActive: r.isActive,
        siteUserName: r.siteUser ? `${r.siteUser.firstName} ${r.siteUser.lastName}` : null,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list authors"
    return { success: false, error: message }
  }
}

export interface AuthorProfile {
  id: string
  name: string
  email: string
  bio: string | null
  avatarUrl: string | null
  socialLinks: AuthorSocialLinkInput[] | null
  siteUserId: string | null
  siteUserLabel: string | null
  showBioPublicly: boolean
  showEmailPublicly: boolean
  showPhonePublicly: boolean
  showSocialLinksPublicly: boolean
}

export async function getAuthorProfile(id: string): Promise<{ success: true; data: AuthorProfile } | { success: false; error: string }> {
  try {
    await requireAdmin()
    const row = await db.query.authors.findFirst({ where: eq(authors.id, id), with: { siteUser: true } })
    if (!row) return { success: false, error: "Author not found" }
    return {
      success: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        socialLinks: row.socialLinks as AuthorSocialLinkInput[] | null,
        siteUserId: row.siteUserId,
        siteUserLabel: row.siteUser ? `${row.siteUser.firstName} ${row.siteUser.lastName} (${row.siteUser.email})` : null,
        showBioPublicly: row.showBioPublicly,
        showEmailPublicly: row.showEmailPublicly,
        showPhonePublicly: row.showPhonePublicly,
        showSocialLinksPublicly: row.showSocialLinksPublicly,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load author"
    return { success: false, error: message }
  }
}

export interface AuthorProfileInput {
  bio?: string | null
  avatarUrl?: string | null
  socialLinks?: AuthorSocialLinkInput[] | null
  siteUserId?: string | null
  showBioPublicly?: boolean
  showEmailPublicly?: boolean
  showPhonePublicly?: boolean
  showSocialLinksPublicly?: boolean
}

export async function updateAuthorProfile(
  id: string,
  input: AuthorProfileInput,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin()
    await db.update(authors).set({ ...input, updatedAt: new Date() }).where(eq(authors.id, id))
    revalidatePath("/admin/pages")
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update author"
    return { success: false, error: message }
  }
}

export interface LinkableSiteAdmin {
  id: string
  label: string
}

// Backs the manual "re-link to a different admin" picker — automatic
// linking by email (payload-cms's syncUserAfterChange) covers the common
// case, this is only for fixing a wrong/missing auto-match. Same
// platform-scope admin/super_admin role check as requireAdmin() above, via
// the userRoles/roles join.
export async function getLinkableSiteAdmins(): Promise<{ success: true; data: LinkableSiteAdmin[] } | { success: false; error: string }> {
  try {
    await requireAdmin()
    const admins = await db.query.users.findMany({
      with: { userRoles: { with: { role: true } } },
    })
    const filtered = admins.filter((u) =>
      u.userRoles.some((ur) => ur.role?.scope === "platform" && ["admin", "super_admin"].includes(ur.role.name)),
    )
    return {
      success: true,
      data: filtered.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list site admins"
    return { success: false, error: message }
  }
}
