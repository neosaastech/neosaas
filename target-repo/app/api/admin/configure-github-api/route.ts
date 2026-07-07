import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";
import { serviceApiRepository } from "@/lib/services";

/**
 * API Route pour configurer GitHub Personal Access Token
 *
 * Cette route permet de :
 * 1. Sauvegarder un GitHub PAT pour les interactions serveur avec l'API GitHub
 * 2. Permettre la récupération de logs GitHub, gestion de repos, etc.
 *
 * Accès : Admin uniquement
 */

export async function POST(request: NextRequest) {
  console.log("📥 [GitHub API Config] Requête reçue");

  // Vérifier l'authentification admin
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    console.log("❌ [GitHub API Config] Auth failed");
    return authResult;
  }

  console.log("✅ [GitHub API Config] Auth successful");

  try {
    const body = await request.json();
    const { personalAccessToken } = body;

    if (!personalAccessToken || typeof personalAccessToken !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Personal Access Token is required",
        },
        { status: 400 }
      );
    }

    // Validate token format (GitHub PAT starts with ghp_)
    if (!personalAccessToken.startsWith('ghp_') && !personalAccessToken.startsWith('github_pat_')) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token format. GitHub tokens start with 'ghp_' or 'github_pat_'",
        },
        { status: 400 }
      );
    }

    console.log("💾 [GitHub API Config] Saving token to database...");

    // Save to database using serviceApiRepository (encrypted automatically)
    const result = await serviceApiRepository.upsertConfig({
      serviceName: "github_api",
      serviceType: "api",
      environment: "production",
      isActive: true,
      isDefault: true,
      config: {
        personalAccessToken,
      },
      metadata: {
        configuredAt: new Date().toISOString(),
        updatedVia: "admin-ui",
        tokenType: "personal_access_token",
      },
    });

    // Mark as tested
    await serviceApiRepository.markTested(result.id);

    console.log("✅ [GitHub API Config] Token saved successfully");

    return NextResponse.json(
      {
        success: true,
        message: "GitHub API Token saved successfully",
        details: {
          configId: result.id,
          encrypted: true,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub API Config] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save token",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/configure-github-api
 * Retrieve GitHub API configuration status
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Retrieve configuration from database
    const config = await serviceApiRepository.getConfig("github_api", "production");

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub API not configured",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "GitHub API configured",
        details: {
          isActive: config.isActive,
          lastTested: config.metadata?.lastTested,
          configuredAt: config.metadata?.configuredAt,
          hasToken: !!config.config.personalAccessToken,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
