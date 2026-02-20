/**
 * Unified OAuth User Service
 * 
 * Gère la création/mise à jour des utilisateurs et entreprises pour TOUS les providers OAuth
 * (GitHub, Google, Facebook, Microsoft, LinkedIn, etc.)
 * 
 * Responsabilités:
 * 1. Synchroniser le profil utilisateur (firstName, lastName, email, avatar)
 * 2. Synchroniser les données de l'entreprise (nom, email)
 * 3. Gérer les connexions OAuth (créer/mettre à jour)
 * 4. Assigner les rôles (writer par défaut)
 * 5. Générer les tokens JWT
 * 
 * Patron réutilisable pour tous les providers sociaux
 */

import { db } from "@/db";
import {
  users,
  companies,
  oauthConnections,
  userRoles,
  roles,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, createToken } from "@/lib/auth";
import crypto from "crypto";

/**
 * Informations d'entreprise provenant des providers OAuth
 */
export interface OAuthCompanyData {
  name?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

/**
 * Données fournies par n'importe quel provider OAuth
 * Structure unifiée indépendante du provider
 */
export interface OAuthProviderData {
  // Identifiant unique du provider
  providerId: string; // 'github', 'google', 'facebook', etc.
  providerUserId: string; // ID unique utilisateur chez le provider

  // Informations utilisateur
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null; // URL vers l'avatar

  // Informations entreprise (si disponible)
  companyInfo?: OAuthCompanyData;

  // Tokens
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string;

  // Métadonnées additionnelles
  metadata?: Record<string, any>;
}

/**
 * Résultat unifié après traitement OAuth
 */
export interface OAuthUserResult {
  userId: string;
  token: string;
  isNewUser: boolean;
  isNewCompany: boolean;
  companyId: string;
}

/**
 * Service OAuth unifié - Créé une seule fois, réutilisé pour tous les providers
 */
export class OAuthUserService {
  /**
   * Traite l'authentification d'un utilisateur OAuth
   * Crée ou met à jour l'utilisateur, l'entreprise et la connexion OAuth
   */
  static async processOAuthUser(
    providerData: OAuthProviderData,
    options?: { preventCreation?: boolean }
  ): Promise<OAuthUserResult | null> {
    const {
      providerId,
      providerUserId,
      email,
      firstName,
      lastName,
      avatar,
      companyInfo,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
      metadata = {},
    } = providerData;

    console.log(`🔐 [OAuthUserService] Traitement ${providerId} pour ${email}`);

    let userId: string;
    let isNewUser = false;
    let isNewCompany = false;
    let companyId: string;

    // =========================================================================
    // ÉTAPE 1: Vérifier s'il existe une connexion OAuth pour ce provider
    // =========================================================================
    const existingOAuthConnection = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.provider, providerId),
          eq(oauthConnections.providerUserId, providerUserId)
        )
      )
      .limit(1);

    if (existingOAuthConnection.length > 0) {
      // =====================================================================
      // CAS 1: Connexion OAuth existante - MISE À JOUR
      // =====================================================================
      console.log(
        `✅ [OAuthUserService] Connexion ${providerId} existante trouvée`
      );
      userId = existingOAuthConnection[0].userId;

      // Récupérer les infos actuelles de l'utilisateur
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser[0]) {
        throw new Error(`User not found for existing OAuth connection`);
      }

      companyId = existingUser[0].companyId!;

      // 1a. Mettre à jour le token OAuth et les métadonnées
      await db
        .update(oauthConnections)
        .set({
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: expiresAt || undefined,
          scope: scope || undefined,
          metadata: {
            ...existingOAuthConnection[0].metadata,
            firstName,
            lastName,
            avatar,
            ...metadata,
          },
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, existingOAuthConnection[0].id));

      console.log(`✅ [OAuthUserService] Token ${providerId} mis à jour`);

      // 1b. Synchroniser le profil utilisateur
      //     (au cas où le user aurait changé son nom/avatar chez le provider)
      const profileUpdates: any = {
        updatedAt: new Date(),
      };

      // Mettre à jour le nom si fourni et différent
      if (firstName && firstName !== existingUser[0].firstName) {
        profileUpdates.firstName = firstName;
      }
      if (lastName && lastName !== existingUser[0].lastName) {
        profileUpdates.lastName = lastName;
      }

      // Mettre à jour l'avatar si fourni
      if (avatar && avatar !== existingUser[0].profileImage) {
        profileUpdates.profileImage = avatar;
      }

      if (Object.keys(profileUpdates).length > 1) {
        // Plus que juste updatedAt
        await db
          .update(users)
          .set(profileUpdates)
          .where(eq(users.id, userId));

        console.log(
          `✅ [OAuthUserService] Profil utilisateur synchronisé pour ${email}`
        );
      }

      // 1c. Synchroniser les données de l'entreprise (email, nom, localisation)
      //     (au cas où le user aurait changé ses infos chez le provider)
      if (companyId) {
        const companyUpdates: any = {};

        // Récupérer la company actuelle
        const existingCompany = await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);

        if (existingCompany[0]) {
          // Mettre à jour l'email de la company si changé
          if (email && email !== existingCompany[0].email) {
            companyUpdates.email = email;
          }

          // Mettre à jour le nom de la company si elle porte encore le nom générique OU si on a un nom OAuth
          const genericPattern = /^.+'s Company$/;
          if (companyInfo?.name) {
            // Priorité aux données OAuth si disponibles
            companyUpdates.name = companyInfo.name;
            console.log(`✅ [OAuthUserService] Updating company name to: ${companyInfo.name}`);
          } else if (genericPattern.test(existingCompany[0].name) && firstName) {
            // Sinon, mettre à jour seulement si nom générique
            companyUpdates.name = `${firstName}${lastName ? " " + lastName : ""}'s Company`;
          }

          // Mettre à jour la localisation si disponible et non définie
          if (companyInfo?.location && !existingCompany[0].city) {
            companyUpdates.city = companyInfo.location;
            console.log(`✅ [OAuthUserService] Adding company location: ${companyInfo.location}`);
          }

          if (Object.keys(companyUpdates).length > 0) {
            companyUpdates.updatedAt = new Date();
            await db
              .update(companies)
              .set(companyUpdates)
              .where(eq(companies.id, companyId));

            console.log(
              `✅ [OAuthUserService] Company mise à jour pour ${email}`
            );
          }
        }
      }

      // 1d. Mettre à jour l'email de l'utilisateur si changé
      if (email && email !== existingUser[0].email) {
        await db
          .update(users)
          .set({
            email,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        console.log(
          `✅ [OAuthUserService] Email utilisateur mis à jour: ${email}`
        );
      }

      // 1e. Mettre à jour l'email de la connexion OAuth aussi
      await db
        .update(oauthConnections)
        .set({
          email,
        })
        .where(eq(oauthConnections.id, existingOAuthConnection[0].id));
    } else {
      // =====================================================================
      // CAS 2: Nouvelle connexion OAuth
      // =====================================================================
      console.log(`🔄 [OAuthUserService] Nouvelle connexion ${providerId}`);

      // 2a. Vérifier si l'utilisateur existe par email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        // ===================================================================
        // CAS 2A: Utilisateur existant - LIAISON
        // ===================================================================
        console.log(
          `✅ [OAuthUserService] Utilisateur existant trouvé par email`
        );
        userId = existingUser[0].id;
        companyId = existingUser[0].companyId!;

        // Enrichir la company avec les données OAuth si disponibles
        if (companyId && companyInfo) {
          const companyUpdates: any = {};

          const existingCompany = await db
            .select()
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);

          if (existingCompany[0]) {
            // Mettre à jour le nom si données OAuth disponibles et nom générique
            const genericPattern = /^.+'s Company$/;
            if (companyInfo.name && genericPattern.test(existingCompany[0].name)) {
              companyUpdates.name = companyInfo.name;
              console.log(`✅ [OAuthUserService] Enriching company name: ${companyInfo.name}`);
            }

            // Ajouter la localisation si disponible et non définie
            if (companyInfo.location && !existingCompany[0].city) {
              companyUpdates.city = companyInfo.location;
              console.log(`✅ [OAuthUserService] Adding company location: ${companyInfo.location}`);
            }

            if (Object.keys(companyUpdates).length > 0) {
              companyUpdates.updatedAt = new Date();
              await db
                .update(companies)
                .set(companyUpdates)
                .where(eq(companies.id, companyId));

              console.log(`✅ [OAuthUserService] Company enriched with OAuth data`);
            }
          }
        }

        // Créer la connexion OAuth
        await db.insert(oauthConnections).values({
          userId,
          provider: providerId,
          providerUserId,
          email,
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: expiresAt || undefined,
          scope: scope || undefined,
          metadata: {
            firstName,
            lastName,
            avatar,
            ...metadata,
          },
          isActive: true,
        });

        console.log(
          `✅ [OAuthUserService] Connexion ${providerId} créée pour utilisateur existant`
        );

        // Vérifier si l'utilisateur a déjà un rôle, sinon assigner "writer"
        const existingRole = await db
          .select()
          .from(userRoles)
          .where(eq(userRoles.userId, userId))
          .limit(1);

        if (existingRole.length === 0) {
          // Pas de rôle assigné, assigner "writer" par défaut
          try {
            const writerRole = await db.query.roles.findFirst({
              where: eq(roles.name, "writer"),
            });

            if (writerRole) {
              await db.insert(userRoles).values({
                userId,
                roleId: writerRole.id,
              });
              console.log(
                `✅ [OAuthUserService] Rôle "writer" assigné à l'utilisateur existant`
              );
            }
          } catch (roleError) {
            console.error(
              "❌ [OAuthUserService] Erreur assignation rôle:",
              roleError
            );
          }
        }
      } else {
        // ===================================================================
        // CAS 2B: Nouvel utilisateur - CRÉATION
        // ===================================================================
        
        // Si l'option preventCreation est active, ne pas créer le compte
        if (options?.preventCreation) {
          console.log(`ℹ️ [OAuthUserService] Création de compte bloquée par preventCreation`);
          return null;
        }

        console.log(
          `🆕 [OAuthUserService] Nouvel utilisateur pour ${providerId}`
        );

        // 2b-1. Créer la company
        let company;
        try {
          // Vérifier si une company avec cet email existe déjà
          const existingCompany = await db.query.companies.findFirst({
            where: eq(companies.email, email),
          });

          if (existingCompany) {
            company = existingCompany;
            console.log(
              `✅ [OAuthUserService] Company existante trouvée: ${company.id}`
            );
          } else {
            // Préparer les données de la company
            const companyData: any = {
              email,
            };

            // Utiliser les données OAuth si disponibles, sinon valeur par défaut
            if (companyInfo?.name) {
              companyData.name = companyInfo.name;
              console.log(`✅ [OAuthUserService] Company name from OAuth: ${companyInfo.name}`);
            } else {
              companyData.name = `${firstName}${lastName ? " " + lastName : ""}'s Company`;
              console.log(`✅ [OAuthUserService] Company name (default): ${companyData.name}`);
            }

            // Ajouter la localisation si disponible
            if (companyInfo?.location) {
              companyData.city = companyInfo.location;
              console.log(`✅ [OAuthUserService] Company location: ${companyInfo.location}`);
            }

            [company] = await db
              .insert(companies)
              .values(companyData)
              .returning();

            isNewCompany = true;
            console.log(
              `✅ [OAuthUserService] Company créée: ${company.id} (${companyData.name})`
            );
          }
        } catch (companyError) {
          console.error(
            "❌ [OAuthUserService] Erreur création company:",
            companyError
          );
          throw new Error("Failed to create company");
        }

        companyId = company.id;

        // 2b-2. Créer l'utilisateur
        try {
          // Générer un mot de passe aléatoire pour les utilisateurs OAuth
          const randomPassword = crypto.randomUUID();
          const hashedPassword = await hashPassword(randomPassword);

          [{ userId }] = await db
            .insert(users)
            .values({
              email,
              firstName,
              lastName,
              password: hashedPassword,
              companyId: company.id,
              emailVerified: new Date(), // Email vérifié par provider
              isActive: true,
              profileImage: avatar || undefined,
            })
            .returning();

          isNewUser = true;
          console.log(`✅ [OAuthUserService] Utilisateur créé: ${userId}`);
        } catch (userError) {
          console.error(
            "❌ [OAuthUserService] Erreur création utilisateur:",
            userError
          );
          throw new Error("Failed to create user");
        }

        // 2b-3. Assigner le rôle "writer" par défaut
        try {
          const writerRole = await db.query.roles.findFirst({
            where: eq(roles.name, "writer"),
          });

          if (writerRole) {
            await db.insert(userRoles).values({
              userId,
              roleId: writerRole.id,
            });
            console.log(
              `✅ [OAuthUserService] Rôle "writer" assigné à l'utilisateur`
            );
          } else {
            console.warn(
              `⚠️ [OAuthUserService] Rôle "writer" non trouvé en base`
            );
          }
        } catch (roleError) {
          console.error(
            "❌ [OAuthUserService] Erreur assignation rôle:",
            roleError
          );
          // Non-blocking - continue même si l'assignation du rôle échoue
        }

        // 2b-4. Créer la connexion OAuth
        try {
          await db.insert(oauthConnections).values({
            userId,
            provider: providerId,
            providerUserId,
            email,
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: expiresAt || undefined,
            scope: scope || undefined,
            metadata: {
              firstName,
              lastName,
              avatar,
              ...metadata,
            },
            isActive: true,
          });

          console.log(
            `✅ [OAuthUserService] Connexion ${providerId} créée pour nouvel utilisateur`
          );
        } catch (connectionError) {
          console.error(
            "❌ [OAuthUserService] Erreur création connexion OAuth:",
            connectionError
          );
          throw new Error("Failed to create OAuth connection");
        }
      }
    }

    // =========================================================================
    // ÉTAPE 2: Générer le JWT token
    // =========================================================================
    const token = createToken({
      userId,
      email,
      companyId,
    });

    console.log(
      `✅ [OAuthUserService] Authentification réussie pour ${providerId}`
    );

    return {
      userId,
      token,
      isNewUser,
      isNewCompany,
      companyId,
    };
  }

  /**
   * Récupère un utilisateur par sa connexion OAuth
   * Utile pour vérifier si un utilisateur a une connexion avec un provider
   */
  static async getOAuthUser(
    providerId: string,
    providerUserId: string
  ) {
    return db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.provider, providerId),
          eq(oauthConnections.providerUserId, providerUserId)
        )
      )
      .limit(1);
  }

  /**
   * Récupère toutes les connexions OAuth d'un utilisateur
   * Utile pour afficher les providers connectés dans les settings
   */
  static async getUserOAuthConnections(userId: string) {
    return db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.userId, userId));
  }

  /**
   * Déconnecte un provider OAuth d'un utilisateur
   * Utile pour le bouton "Disconnect from GitHub" dans les settings
   */
  static async disconnectOAuthProvider(
    userId: string,
    providerId: string
  ) {
    return db
      .update(oauthConnections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(oauthConnections.userId, userId),
          eq(oauthConnections.provider, providerId)
        )
      );
  }
}
