import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "./server";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware utilitaire pour vérifier l'authentification admin
 * Utilisé dans les API Routes /api/admin/*
 */

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  roles?: string[];
  error?: string;
}

/**
 * Vérifie si l'utilisateur est authentifié et a les permissions admin
 * 
 * @param request - NextRequest
 * @returns AdminAuthResult
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // Utiliser verifyAuth() au lieu de faire un fetch
    const user = await verifyAuth();

    if (!user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        error: "Non authentifié - token manquant ou invalide",
      };
    }

    // Vérifier les rôles depuis la base de données (vérification en temps réel)
    const userRolesData = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.userId));

    const roleNames = userRolesData.map((r) => r.roleName);
    const hasAdminRole = roleNames.includes("admin") || roleNames.includes("super_admin");

    if (!hasAdminRole) {
      return {
        isAuthenticated: true,
        isAdmin: false,
        userId: user.userId,
        roles: roleNames,
        error: "Accès refusé - permissions admin requises",
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      userId: user.userId,
      roles: roleNames,
    };
  } catch (error: any) {
    console.error("[ADMIN AUTH] Erreur de vérification:", error);
    return {
      isAuthenticated: false,
      isAdmin: false,
      error: `Erreur interne: ${error.message}`,
    };
  }
}

/**
 * Middleware à utiliser dans les API Routes admin
 * Retourne une réponse 401 ou 403 si l'utilisateur n'est pas autorisé
 * 
 * Utilisation :
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAdminAuth(request);
 *   if (authResult instanceof NextResponse) {
 *     return authResult; // Erreur d'auth
 *   }
 *   // L'utilisateur est admin, continuer...
 * }
 * ```
 */
export async function requireAdminAuth(
  request: NextRequest
): Promise<AdminAuthResult | NextResponse> {
  const authResult = await verifyAdminAuth(request);

  if (!authResult.isAuthenticated) {
    return NextResponse.json(
      {
        success: false,
        error: authResult.error || "Authentification requise",
      },
      { status: 401 }
    );
  }

  if (!authResult.isAdmin) {
    return NextResponse.json(
      {
        success: false,
        error: authResult.error || "Accès refusé - permissions admin requises",
      },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Alternative simplifiée : HOF (Higher-Order Function) pour wrapper les handlers
 * 
 * Utilisation :
 * ```typescript
 * export const POST = withAdminAuth(async (request, authResult) => {
 *   // authResult contient userId et roles
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAdminAuth(
  handler: (request: NextRequest, auth: AdminAuthResult) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await verifyAdminAuth(request);

    if (!authResult.isAuthenticated || !authResult.isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Accès refusé",
        },
        { status: authResult.isAuthenticated ? 403 : 401 }
      );
    }

    return handler(request, authResult);
  };
}
