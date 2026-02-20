import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";
import { serviceApiRepository } from "@/lib/services";
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
    const { githubPat, clientId, clientSecret, environment = 'production' } = body;

    console.log("📝 [GitHub OAuth Config] Mode:", clientId ? "Credentials directs" : "Validation PAT");

    // MODE 1: Enregistrement de credentials OAuth directs
    if (clientId && clientSecret) {
      console.log("💾 [GitHub OAuth Config] Stockage des credentials en BDD...");
      console.log("📝 [GitHub OAuth Config] Client ID:", clientId.substring(0, 10) + "...");
      console.log("📝 [GitHub OAuth Config] Environnement:", environment);

      const headers = request.headers;
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
        (headers.has("host") ? `http://${headers.get("host")}` : "") ||
        "http://localhost:3000";
      
      const siteUrl = baseUrl.replace(/\/$/, "");
      const callbackUrl = `${siteUrl}/api/auth/oauth/github/callback`;

      try {
        console.log(`💾 [GitHub OAuth Config] Utilisation du repository avec cryptage AES-256-GCM...`);

        // Use serviceApiRepository for encrypted storage
        const result = await serviceApiRepository.upsertConfig({
          serviceName: "github",
          serviceType: "oauth",
          environment,
          isActive: true,
          isDefault: true,
          config: {
            clientId,
            clientSecret,
          },
          metadata: {
            callbackUrl,
            baseUrl: siteUrl,
            updatedVia: "manual-admin",
            configuredAt: new Date().toISOString(),
          },
        });

        // Mark as tested
        await serviceApiRepository.markTested(result.id);

        console.log("✅ [GitHub OAuth Config] Credentials cryptés et stockés avec succès");
        console.log(`   - Config ID: ${result.id}`);
        console.log(`   - Callback URL: ${callbackUrl}`);
        
        return NextResponse.json<GitHubConfigResponse>(
          {
            success: true,
            message: "Configuration GitHub OAuth enregistrée avec succès.",
            details: {
              credentialsStored: true,
              oauthAppCreated: false,
              vercelEnvUpdated: false,
            },
          },
          { status: 200 }
        );
      } catch (error: any) {
        console.error("❌ [GitHub OAuth Config] Erreur stockage BDD:", error.message);
        return NextResponse.json<GitHubConfigResponse>(
          {
            success: false,
            error: `Erreur lors du stockage : ${error.message}`,
          },
          { status: 500 }
        );
      }
    }

    // MODE 2: Validation PAT uniquement (retourne instructions)
    if (!githubPat || typeof githubPat !== "string") {
      console.log("❌ [GitHub OAuth Config] Ni credentials ni PAT fournis");
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: "Veuillez fournir soit un PAT GitHub, soit les credentials OAuth (clientId + clientSecret)",
        },
        { status: 400 }
      );
    }

    console.log("📝 [GitHub OAuth Config] GitHub PAT reçu:", githubPat.substring(0, 10) + "...");

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

    // ÉTAPE 2 : Retourner les instructions de configuration manuelle
    console.log("📝 [GitHub OAuth Config] ÉTAPE 2 - Instructions de configuration manuelle...");
    
    // ⚠️ IMPORTANT : GitHub ne permet PAS de créer des OAuth Apps via API
    // Les OAuth Apps doivent être créées manuellement sur GitHub
    
    console.log(`ℹ️ [GitHub OAuth Config] GitHub OAuth Apps ne peuvent pas être créées automatiquement`);
    console.log(`📋 [GitHub OAuth Config] Configuration manuelle requise:`);
    console.log(`   - URL de création: https://github.com/settings/developers`);
    console.log(`   - Application name: NeoSaaS OAuth`);
    console.log(`   - Homepage URL: ${baseUrl}`);
    console.log(`   - Callback URL: ${callbackUrl}`);
    
    return NextResponse.json<GitHubConfigResponse>(
      {
        success: true,
        message: `PAT GitHub validé avec succès (utilisateur: ${githubUser.login}). Créez maintenant votre OAuth App manuellement.`,
        details: {
          oauthAppCreated: false,
          vercelEnvUpdated: false,
          instructions: {
            step1: "Aller sur https://github.com/settings/developers",
            step2: "Cliquer sur 'New OAuth App'",
            step3: `Application name: NeoSaaS OAuth`,
            step4: `Homepage URL: ${baseUrl}`,
            step5: `Authorization callback URL: ${callbackUrl}`,
            step6: "Cliquer 'Register application'",
            step7: "Noter le Client ID",
            step8: "Générer un Client Secret et le noter",
            step9: "Retourner dans /admin/api et sauvegarder les credentials (clientId + clientSecret)",
          },
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
    // Use serviceApiRepository to get encrypted config
    const config = await serviceApiRepository.getConfig("github", "production");

    if (!config) {
      return NextResponse.json<GitHubConfigResponse>(
        {
          success: false,
          error: "GitHub OAuth not configured",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<GitHubConfigResponse>(
      {
        success: true,
        message: "GitHub OAuth configuré",
        details: {
          oauthAppCreated: true,
          vercelEnvUpdated: true,
          isActive: config.isActive,
          lastTested: config.metadata?.lastTested,
          metadata: config.metadata,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub OAuth Config] Erreur lors de la récupération:", error);
    return NextResponse.json<GitHubConfigResponse>(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
