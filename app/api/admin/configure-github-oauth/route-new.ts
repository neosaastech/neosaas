import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";
import { db } from "@/db";
import { serviceApiConfigs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type {
  GitHubConfigRequest,
  GitHubConfigResponse,
  GitHubUser,
  GitHubOAuthApp,
} from "@/types/github-config";

/**
 * API Route pour configurer automatiquement GitHub OAuth
 * 
 * Cette route permet de :
 * 1. Valider une clé API GitHub (PAT)
 * 2. Créer une OAuth App GitHub automatiquement
 * 3. Stocker les credentials en BDD (comme Stripe, PayPal, etc.)
 * 
 * Accès : Admin uniquement
 */

export async function POST(request: NextRequest) {
  console.log("📥 [GitHub OAuth Config] Requête reçue");
  
  // Vérifier l'authentification admin
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    console.log("❌ [GitHub OAuth Config] Auth failed");
    return authResult;
  }
  
  console.log("✅ [GitHub OAuth Config] Auth successful");
  
  try {
    const body: GitHubConfigRequest = await request.json();
    const { githubPat } = body;

    console.log("📝 [GitHub OAuth Config] GitHub PAT reçu:", githubPat ? `${githubPat.substring(0, 10)}...` : "VIDE");

    if (!githubPat || typeof githubPat !== "string") {
      console.log("❌ [GitHub OAuth Config] PAT invalide");
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: "Clé API GitHub manquante ou invalide",
        },
        { status: 400 }
      );
    }

    // Détection de l'URL de base pour le callback OAuth
    const headers = request.headers;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
      (headers.has("host") ? `https://${headers.get("host")}` : "") ||
      "https://neosaas.tech"
    
    const siteUrl = baseUrl.replace(/\/$/, "")
    const callbackUrl = `${siteUrl}/api/auth/callback/github`
    
    console.log(`🌐 [GitHub OAuth Config] Configuration:`, {
      siteUrl,
      callbackUrl,
    });

    let oauthAppCreated = false;
    let dbStored = false;

    // ÉTAPE 1 : Valider le PAT GitHub
    console.log("🔑 [GitHub OAuth Config] ÉTAPE 1 - Validation du PAT GitHub...");
    let githubUser: GitHubUser;
    
    try {
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubPat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      console.log(`📡 [GitHub OAuth Config] GitHub API response: ${userResponse.status} ${userResponse.statusText}`);

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Clé API GitHub invalide");
      }

      githubUser = await userResponse.json();
      console.log(`✅ [GitHub OAuth Config] PAT valide - utilisateur: ${githubUser.login}`);

      // Vérifier les permissions nécessaires (admin:org pour créer des OAuth Apps)
      const scopeHeader = userResponse.headers.get("x-oauth-scopes") || "";
      const scopes = scopeHeader.split(",").map((s) => s.trim());
      console.log(`🔐 [GitHub OAuth Config] Scopes: ${scopes.join(", ")}`);

      if (!scopes.includes("admin:org") && !scopes.includes("write:org")) {
        throw new Error(
          "Le PAT doit avoir les permissions 'admin:org' ou 'write:org' pour créer des OAuth Apps"
        );
      }
    } catch (error: any) {
      console.error("❌ [GitHub OAuth Config] Erreur validation PAT:", error.message);
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: `Validation GitHub échouée : ${error.message}`,
        },
        { status: 401 }
      );
    }

    // ÉTAPE 2 : Créer l'OAuth App GitHub
    console.log("🔧 [GitHub OAuth Config] ÉTAPE 2 - Création de l'OAuth App GitHub...");
    let oauthApp: GitHubOAuthApp | null = null;

    try {
      const githubOrg = process.env.GITHUB_ORG || "NEOMIA";
      console.log(`📋 [GitHub OAuth Config] Organisation GitHub: ${githubOrg}`);
      console.log(`🌐 [GitHub OAuth Config] Base URL: ${baseUrl}`);
      console.log(`🔗 [GitHub OAuth Config] Callback URL: ${callbackUrl}`);

      const createAppResponse = await fetch(
        `https://api.github.com/orgs/${githubOrg}/settings/apps`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${githubPat}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `NeoSAS OAuth ${Date.now()}`,
            url: baseUrl,
            callback_urls: [callbackUrl],
            public: false,
            default_permissions: {
              metadata: "read",
              emails: "read",
            },
            default_events: [],
          }),
        }
      );
      
      console.log(`📡 [GitHub OAuth Config] Réponse création OAuth App: ${createAppResponse.status} ${createAppResponse.statusText}`);

      if (!createAppResponse.ok) {
        const errorData = await createAppResponse.json().catch(() => ({}));
        console.log(`⚠️ [GitHub OAuth Config] Erreur création app: ${JSON.stringify(errorData)}`);
        
        // Si l'app existe déjà, essayer avec OAuth App classique
        if (createAppResponse.status === 422 || createAppResponse.status === 409) {
          console.log("⚠️ [GitHub OAuth Config] Tentative de création d'une OAuth App classique...");
          
          const classicAppResponse = await fetch(
            `https://api.github.com/user/applications`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${githubPat}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: `NeoSAS-${Date.now()}`,
                url: baseUrl,
                callback_url: callbackUrl,
              }),
            }
          );
          
          console.log(`📡 [GitHub OAuth Config] Réponse OAuth App classique: ${classicAppResponse.status} ${classicAppResponse.statusText}`);

          if (!classicAppResponse.ok) {
            throw new Error(
              `Impossible de créer l'OAuth App : ${errorData.message || classicAppResponse.statusText}`
            );
          }

          oauthApp = await classicAppResponse.json();
        } else {
          throw new Error(
            errorData.message || `Erreur ${createAppResponse.status} lors de la création de l'app`
          );
        }
      } else {
        oauthApp = await createAppResponse.json();
      }

      if (!oauthApp || !oauthApp.client_id || !oauthApp.client_secret) {
        throw new Error("Réponse invalide de l'API GitHub (client_id ou client_secret manquant)");
      }

      oauthAppCreated = true;
      console.log(`✅ [GitHub OAuth Config] OAuth App créée avec succès`);
      console.log(`🔑 [GitHub OAuth Config] Client ID: ${oauthApp.client_id}`);
      console.log(`🔐 [GitHub OAuth Config] Client Secret: ${oauthApp.client_secret ? '***' + oauthApp.client_secret.slice(-4) : 'MANQUANT'}`);
    } catch (error: any) {
      console.error("❌ [GitHub OAuth Config] Erreur création OAuth App:", error.message);
      console.error("📋 [GitHub OAuth Config] Stack trace:", error.stack);
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: `Création OAuth App échouée : ${error.message}`,
          details: { oauthAppCreated, vercelEnvUpdated: dbStored },
        },
        { status: 500 }
      );
    }

    // ÉTAPE 3 : Stocker les credentials en base de données
    console.log("💾 [GitHub OAuth Config] ÉTAPE 3 - Stockage en BDD...");
    
    try {
      const config = {
        clientId: oauthApp.client_id,
        clientSecret: oauthApp.client_secret,
      };
      
      console.log(`📝 [GitHub OAuth Config] Configuration à stocker:`, {
        clientId: config.clientId,
        hasSecret: !!config.clientSecret,
      });

      // Vérifier si une config existe déjà
      const existingConfig = await db
        .select()
        .from(serviceApiConfigs)
        .where(
          and(
            eq(serviceApiConfigs.serviceName, "github"),
            eq(serviceApiConfigs.environment, "production")
          )
        )
        .limit(1);

      if (existingConfig.length > 0) {
        console.log(`🔄 [GitHub OAuth Config] Mise à jour de la configuration existante (ID: ${existingConfig[0].id})`);
        
        await db
          .update(serviceApiConfigs)
          .set({
            config,
            metadata: {
              callbackUrl,
              baseUrl: siteUrl,
              oauthAppId: oauthApp.id,
              updatedVia: "automatic-pat",
            },
            isActive: true,
            lastTestedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(serviceApiConfigs.id, existingConfig[0].id));
      } else {
        console.log(`➕ [GitHub OAuth Config] Création d'une nouvelle configuration`);
        
        await db.insert(serviceApiConfigs).values({
          serviceName: "github",
          serviceType: "oauth",
          environment: "production",
          isActive: true,
          isDefault: true,
          config,
          metadata: {
            callbackUrl,
            baseUrl: siteUrl,
            oauthAppId: oauthApp.id,
            createdVia: "automatic-pat",
          },
          lastTestedAt: new Date(),
        });
      }

      dbStored = true;
      console.log("✅ [GitHub OAuth Config] Configuration stockée en BDD avec succès");
    } catch (error: any) {
      console.error("❌ [GitHub OAuth Config] Erreur stockage BDD:", error.message);
      console.error("📋 [GitHub OAuth Config] Stack trace:", error.stack);
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: `Stockage en BDD échoué : ${error.message}`,
          details: { oauthAppCreated, vercelEnvUpdated: dbStored },
        },
        { status: 500 }
      );
    }

    // Succès complet
    console.log("🎉 [GitHub OAuth Config] Configuration terminée avec succès !");
    console.log("📊 [GitHub OAuth Config] Résumé:");
    console.log(`  - OAuth App créée: ${oauthAppCreated}`);
    console.log(`  - Configuration stockée en BDD: ${dbStored}`);
    
    return NextResponse.json<GitHubConfigResponse>(
      {
        success: true,
        message: "Configuration GitHub OAuth terminée avec succès. Les credentials sont stockés en base de données sécurisée.",
        details: {
          oauthAppCreated: true,
          vercelEnvUpdated: true,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub OAuth Config] Erreur inattendue:", error.message);
    console.error("📋 [GitHub OAuth Config] Stack trace:", error.stack);
    return NextResponse.json<GitHubConfigResponse>(
      {
        success: false,
        error: error.message || "Erreur interne du serveur",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/configure-github-oauth
 * Récupère le statut de la configuration GitHub OAuth actuelle
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Récupérer la configuration GitHub depuis la BDD
    const githubConfig = await db
      .select()
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceName, "github"),
          eq(serviceApiConfigs.environment, "production")
        )
      )
      .limit(1);

    if (githubConfig.length === 0) {
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: "GitHub OAuth not configured",
        },
        { status: 404 }
      );
    }

    const config = githubConfig[0];

    return NextResponse.json<GitHubConfigResponse>(
      {
        success: true,
        message: "GitHub OAuth configuré",
        details: {
          oauthAppCreated: true,
          vercelEnvUpdated: true,
          isActive: config.isActive,
          lastTested: config.lastTestedAt?.toISOString(),
          metadata: config.metadata,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json<GitHubConfigResponse>(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
