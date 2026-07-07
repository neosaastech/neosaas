/**
 * Google OAuth Callback Route
 * 
 * GET /api/auth/oauth/google/callback
 * 
 * Gère le callback Google après l'authentification.
 * Échange le code contre un access token et crée/lie le compte utilisateur.
 * Utilise les credentials de la BDD (pas d'ENV variables).
 */

import { NextRequest, NextResponse } from "next/server";
import { googleOAuthProvider } from "@/lib/oauth/providers/google";
import { serviceApiRepository } from "@/lib/services";
import { db } from "@/db";
import { users, oauthConnections, userRoles, roles, companies } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createToken, hashPassword } from "@/lib/auth";
import crypto from "crypto";

// Force cette route à être dynamique (pas de cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔄 [Google OAuth Callback] Réception du callback");
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Gérer les erreurs de Google
    if (error) {
      console.error(`❌ [Google OAuth Callback] Erreur Google: ${error}`);

      // Special handling for redirect_uri_mismatch error
      if (error === "redirect_uri_mismatch") {
        console.error(`❌ [Google OAuth Callback] REDIRECT_URI_MISMATCH ERROR`);
        console.error(`   This means the redirect_uri sent in the OAuth request does not match`);
        console.error(`   an "Authorized redirect URI" configured in your Google Cloud Console.`);
        console.error(`   `);
        console.error(`   To fix this:`);
        console.error(`   1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials`);
        console.error(`   2. Select your OAuth 2.0 Client ID`);
        console.error(`   3. Add this to "Authorized redirect URIs":`);
        console.error(`      ${request.nextUrl.origin}/api/auth/oauth/google/callback`);
        console.error(`   4. Save the changes and try again`);
      }

      return NextResponse.redirect(
        new URL(`/auth/login?error=google_${error}`, request.url)
      );
    }

    // Valider le code
    if (!code) {
      console.error("❌ [Google OAuth Callback] Code manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Vérifier le state (protection CSRF)
    const savedState = request.cookies.get("google_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      console.error("❌ [Google OAuth Callback] State invalide ou manquant");
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    console.log(`✅ [Google OAuth Callback] Code et state validés`);

    // Récupérer la configuration depuis la BDD avec auto-détection du domaine
    const config = await googleOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      console.error("❌ [Google OAuth Callback] Configuration non trouvée");
      console.error("   Please configure Google OAuth in /admin/api");
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Log the configuration for debugging
    console.log(`📋 [Google OAuth Callback] Configuration loaded:`);
    console.log(`   - Client ID: ${config.clientId.substring(0, 10)}...`);
    console.log(`   - Callback URL: ${config.callbackUrl}`);
    console.log(`   - Expected callback: ${request.nextUrl.origin}/api/auth/oauth/google/callback`);

    // ÉTAPE 1 : Échanger le code contre un access token
    console.log("🔄 [Google OAuth Callback] Échange du code contre un access token...");
    const tokenData = await googleOAuthProvider.exchangeCodeForToken(code, config);

    if (!tokenData || !tokenData.accessToken) {
      console.error("❌ [Google OAuth Callback] Échec de l'échange de token");
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const accessToken = tokenData.accessToken;
    console.log("✅ [Google OAuth Callback] Access token obtenu");

    // ÉTAPE 2 : Récupérer les informations de l'utilisateur Google
    console.log("🔄 [Google OAuth Callback] Récupération des infos utilisateur...");
    const googleUser = await googleOAuthProvider.getUserInfo(accessToken);

    if (!googleUser || !googleUser.email) {
      console.error("❌ [Google OAuth Callback] Impossible de récupérer les informations utilisateur");
      return NextResponse.redirect(
        new URL("/auth/login?error=user_fetch_failed", request.url)
      );
    }

    console.log(`✅ [Google OAuth Callback] Utilisateur Google: ${googleUser.email}`);

    // ÉTAPE 3 : Vérifier si une connexion OAuth existe déjà
    console.log("🔄 [Google OAuth Callback] Vérification connexion OAuth existante...");
    const existingOAuthConnection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.provider, "google"),
          eq(oauthConnections.providerUserId, googleUser.id)
        )
      )
      .limit(1);

    let userId: string;

    if (existingOAuthConnection.length > 0) {
      // Connexion existante - Mettre à jour le token
      console.log("✅ [Google OAuth Callback] Connexion OAuth existante trouvée");
      userId = existingOAuthConnection[0].userId;

      await db
        .update(oauthConnections)
        .set({
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, existingOAuthConnection[0].id));
    } else {
      // Nouvelle connexion - Vérifier si l'utilisateur existe par email
      console.log("🔄 [Google OAuth Callback] Nouvelle connexion, vérification utilisateur par email...");
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        // Utilisateur existe - Lier le compte Google
        console.log("✅ [Google OAuth Callback] Utilisateur existant trouvé, liaison du compte");
        userId = existingUser[0].id;

        await db.insert(oauthConnections).values({
          userId,
          provider: "google",
          providerUserId: googleUser.id,
          email: googleUser.email,
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          isActive: true,
        });
      } else {
        // Nouvel utilisateur - Créer le compte
        console.log("🆕 [Google OAuth Callback] Nouvel utilisateur, création du compte...");
        
        // ÉTAPE A : Créer la company (comme register classique)
        const firstName = googleUser.firstName || googleUser.name?.split(" ")[0] || googleUser.email.split("@")[0];
        const lastName = googleUser.lastName || googleUser.name?.split(" ").slice(1).join(" ") || "";
        
        let company;
        try {
          // Vérifier si une company avec cet email existe déjà
          const existingCompany = await db.query.companies.findFirst({
            where: eq(companies.email, googleUser.email)
          });

          if (existingCompany) {
            company = existingCompany;
            console.log(`✅ [Google OAuth Callback] Company existante trouvée: ${company.id}`);
          } else {
            [company] = await db
              .insert(companies)
              .values({
                name: `${firstName}'s Company`,
                email: googleUser.email,
              })
              .returning();
            console.log(`✅ [Google OAuth Callback] Company créée: ${company.id}`);
          }
        } catch (companyError) {
          console.error("❌ [Google OAuth Callback] Erreur création company:", companyError);
          return NextResponse.redirect(
            new URL("/auth/login?error=company_creation_failed", request.url)
          );
        }
        
        // ÉTAPE B : Créer l'utilisateur avec companyId
        // Générer un mot de passe aléatoire pour les utilisateurs OAuth
        const randomPassword = crypto.randomUUID();
        const hashedPassword = await hashPassword(randomPassword);

        const [newUser] = await db
          .insert(users)
          .values({
            email: googleUser.email,
            firstName,
            lastName,
            password: hashedPassword,
            companyId: company.id,
            emailVerified: new Date(), // Email vérifié par Google
            isActive: true,
            profileImage: googleUser.avatar,
          })
          .returning();

        userId = newUser.id;
        console.log(`✅ [Google OAuth Callback] Utilisateur créé: ${userId}`);

        // ÉTAPE C : Assigner le rôle writer (comme register classique)
        try {
          const writerRole = await db.query.roles.findFirst({
            where: eq(roles.name, "writer"),
          });

          if (writerRole) {
            await db.insert(userRoles).values({
              userId,
              roleId: writerRole.id,
            });
            console.log(`✅ [Google OAuth Callback] Rôle writer assigné`);
          } else {
            console.warn("⚠️ [Google OAuth Callback] Rôle writer non trouvé, compte créé sans rôle");
          }
        } catch (roleError) {
          console.error("❌ [Google OAuth Callback] Erreur assignation rôle:", roleError);
          // Ne pas bloquer la création du compte
        }

        // ÉTAPE D : Créer la connexion OAuth
        await db.insert(oauthConnections).values({
          userId,
          provider: "google",
          providerUserId: googleUser.id,
          email: googleUser.email,
          accessToken,
          refreshToken: tokenData.refreshToken,
          metadata: {
            name: googleUser.name,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
          },
          isActive: true,
        });

        console.log(`✅ [Google OAuth Callback] Connexion OAuth créée pour: ${userId}`);
      }
    }

    // ÉTAPE 4 : Récupérer les rôles et permissions de l'utilisateur
    console.log("🔄 [Google OAuth Callback] Récupération des rôles et permissions...");
    
    const userRolesData = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const userRoleNames = userRolesData.map(r => r.roleName);

    // Récupérer les permissions via les rôles
    const userPermissionsQuery = `
      SELECT DISTINCT p.name as permission_name
      FROM user_roles ur
      INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `;
    
    const userPermissionsResult = await db.execute({
      sql: userPermissionsQuery,
      args: [userId],
    });

    const userPermissionNames = (userPermissionsResult.rows as any[]).map(row => row.permission_name);

    // Récupérer les infos complètes de l'utilisateur pour le token
    const [fullUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // ÉTAPE 5 : Créer le JWT token avec les fonctions standard
    console.log("🔄 [Google OAuth Callback] Génération du JWT...");
    const token = createToken({
      userId: fullUser.id,
      email: fullUser.email,
      companyId: fullUser.companyId || undefined,
      roles: userRoleNames,
      permissions: userPermissionNames,
    });

    console.log("✅ [Google OAuth Callback] Authentification réussie");
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Email: ${fullUser.email}`);
    console.log(`   - Roles: ${userRoleNames.join(', ') || 'none'}`);
    console.log(`   - Permissions: ${userPermissionNames.length} permissions`);

    // Log successful OAuth callback to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_callback",
          status: "success",
          statusCode: "200",
          requestData: {
            googleEmail: googleUser.email,
          },
          responseData: {
            userId,
            newUser: existingOAuthConnection.length === 0,
          },
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth Callback] Failed to log usage:", logError);
      // Don't fail the request if logging fails
    }

    // Redirection vers le dashboard avec cookie d'authentification
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    // Définir le cookie d'authentification (doit être sur la réponse pour les redirections)
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: "/",
    });
    
    // Supprimer le cookie de state CSRF
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error: any) {
    console.error("❌ [Google OAuth Callback] Erreur:", error);

    // Log error to database
    try {
      const configRecord = await serviceApiRepository.getConfig("google", "production");
      if (configRecord && (configRecord as any).id) {
        await serviceApiRepository.trackUsage({
          configId: (configRecord as any).id,
          serviceName: "google",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error.message,
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Google OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error&details=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
