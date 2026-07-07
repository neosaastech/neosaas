/**
 * API Endpoint: GET /api/auth/oauth/config
 * 
 * Retourne la liste des providers OAuth actifs et configurés
 * Utilisé par les pages login/register pour afficher dynamiquement
 * les boutons de connexion sociale
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { serviceApiConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Force cette route à être dynamique (pas de cache statique)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('[OAuth Config API] Fetching active OAuth providers...');

    // Récupérer tous les services OAuth actifs
    const oauthConfigs = await db
      .select({
        serviceName: serviceApiConfigs.serviceName,
        serviceType: serviceApiConfigs.serviceType,
        isActive: serviceApiConfigs.isActive,
        environment: serviceApiConfigs.environment,
      })
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceType, 'oauth'),
          eq(serviceApiConfigs.isActive, true),
          eq(serviceApiConfigs.environment, 'production')
        )
      );

    // Transformer en format simple - SEULEMENT les actifs
    const activeProviders = oauthConfigs.reduce((acc, config) => {
      // Double vérification que isActive est bien true
      if (config.isActive === true) {
        acc[config.serviceName] = {
          enabled: true,
          environment: config.environment,
        };
        console.log(`[OAuth Config API] ✅ Provider active: ${config.serviceName}`);
      } else {
        console.log(`[OAuth Config API] ❌ Provider inactif: ${config.serviceName}`);
      }
      return acc;
    }, {} as Record<string, { enabled: boolean; environment: string }>);

    const response = {
      success: true,
      providers: activeProviders,
      // Pour compatibilité avec le code existant
      github: activeProviders.github?.enabled || false,
      google: activeProviders.google?.enabled || false,
      facebook: activeProviders.facebook?.enabled || false,
      microsoft: activeProviders.microsoft?.enabled || false,
    };

    console.log('[OAuth Config API] Response:', {
      github: response.github,
      google: response.google,
      facebook: response.facebook,
      microsoft: response.microsoft,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[OAuth Config API] Error fetching OAuth configurations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch OAuth configurations',
        providers: {},
        github: false,
        google: false,
        facebook: false,
        microsoft: false,
      },
      { status: 500 }
    );
  }
}
