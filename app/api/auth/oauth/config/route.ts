/**
 * API Endpoint: GET /api/auth/oauth/config
 *
 * Returns the list of active and configured OAuth providers.
 * Used by the login/register pages to dynamically display
 * social login buttons.
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { serviceApiConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Force this route to be dynamic (no static cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('[OAuth Config API] Fetching active OAuth providers...');

    // Fetch all active OAuth services
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

    // Transform to simple format - active providers ONLY
    const activeProviders = oauthConfigs.reduce((acc, config) => {
      // Double-check that isActive is indeed true
      if (config.isActive === true) {
        acc[config.serviceName] = {
          enabled: true,
          environment: config.environment,
        };
        console.log(`[OAuth Config API] ✅ Provider active: ${config.serviceName}`);
      } else {
        console.log(`[OAuth Config API] ❌ Provider inactive: ${config.serviceName}`);
      }
      return acc;
    }, {} as Record<string, { enabled: boolean; environment: string }>);

    const response = {
      success: true,
      providers: activeProviders,
      // For backward compatibility with existing code
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
