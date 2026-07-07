/**
 * OAuth Helpers - Fonctions utilitaires communes pour OAuth
 * 
 * Ce fichier contient les fonctions partagées par tous les providers OAuth
 */

import { db } from "@/db";
import { users, oauthConnections, userRoles, roles, rolePermissions, permissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createToken } from "@/lib/auth";
import type { OAuthUserInfo, OAuthProvider } from "./types";

/**
 * Crée ou met à jour un utilisateur OAuth et retourne un JWT token
 */
export async function handleOAuthUser(
  oauthUserInfo: OAuthUserInfo,
  accessToken: string
): Promise<{ userId: string; token: string; isNewUser: boolean }> {
  const { id: providerUserId, email, name, firstName, lastName, avatar, provider } = oauthUserInfo;

  // Vérifier si une connexion OAuth existe déjà
  const existingOAuthConnection = await db
    .select()
    .from(oauthConnections)
    .where(eq(oauthConnections.providerUserId, providerUserId))
    .limit(1);

  let userId: string;
  let isNewUser = false;

  if (existingOAuthConnection.length > 0) {
    // Connexion existante - Mettre à jour le token
    console.log(`✅ [OAuth ${provider}] Connexion existante trouvée`);
    userId = existingOAuthConnection[0].userId;

    await db
      .update(oauthConnections)
      .set({
        accessToken,
        metadata: {
          name,
          firstName,
          lastName,
          avatar,
        },
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, existingOAuthConnection[0].id));
  } else {
    // Nouvelle connexion - Vérifier si l'utilisateur existe par email
    console.log(`🔄 [OAuth ${provider}] Nouvelle connexion, vérification utilisateur par email...`);
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // Utilisateur existe - Lier le compte OAuth
      console.log(`✅ [OAuth ${provider}] Utilisateur existant trouvé, liaison du compte`);
      userId = existingUser[0].id;

      await db.insert(oauthConnections).values({
        userId,
        provider,
        providerUserId,
        email,
        accessToken,
        metadata: {
          name,
          firstName,
          lastName,
          avatar,
        },
        isActive: true,
      });
    } else {
      // Nouvel utilisateur - Créer le compte
      console.log(`🆕 [OAuth ${provider}] Nouvel utilisateur, création du compte...`);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          firstName: firstName || name?.split(" ")[0] || email.split("@")[0],
          lastName: lastName || name?.split(" ").slice(1).join(" ") || "",
          isEmailVerified: true, // Email vérifié par le provider OAuth
          isActive: true,
        })
        .returning();

      userId = newUser.id;
      isNewUser = true;

      // Créer la connexion OAuth
      await db.insert(oauthConnections).values({
        userId,
        provider,
        providerUserId,
        email,
        accessToken,
        metadata: {
          name,
          firstName,
          lastName,
          avatar,
        },
        isActive: true,
      });

      console.log(`✅ [OAuth ${provider}] Nouvel utilisateur créé: ${userId}`);
    }
  }

  // Récupérer les rôles et permissions de l'utilisateur
  const userRolesData = await db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const userRoleNames = userRolesData.map(r => r.roleName);

  const userPermissionsData = await db
    .select({ permissionName: permissions.name })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  const userPermissionNames = [...new Set(userPermissionsData.map(p => p.permissionName))];

  // Récupérer les infos complètes de l'utilisateur
  const [fullUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Créer le JWT token
  const token = createToken({
    userId: fullUser.id,
    email: fullUser.email,
    companyId: fullUser.companyId || undefined,
    roles: userRoleNames,
    permissions: userPermissionNames,
  });

  console.log(`✅ [OAuth ${provider}] Token JWT créé`);
  console.log(`   - User ID: ${userId}`);
  console.log(`   - Email: ${email}`);
  console.log(`   - Roles: ${userRoleNames.join(', ') || 'none'}`);
  console.log(`   - Permissions: ${userPermissionNames.length} permissions`);

  return { userId, token, isNewUser };
}

/**
 * Vérifie le state CSRF pour prévenir les attaques
 */
export function verifyOAuthState(
  savedState: string | undefined,
  receivedState: string | null
): boolean {
  if (!savedState || !receivedState) {
    console.error("❌ [OAuth] State manquant");
    return false;
  }

  if (savedState !== receivedState) {
    console.error("❌ [OAuth] State invalide (possible attaque CSRF)");
    return false;
  }

  return true;
}

/**
 * Génère le nom du cookie de state pour un provider
 */
export function getOAuthStateCookieName(provider: OAuthProvider): string {
  return `${provider}_oauth_state`;
}
