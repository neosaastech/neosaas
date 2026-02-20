/**
 * API: POST /api/admin/oauth/toggle
 * 
 * Toggle OAuth provider activation status in service_api_configs
 * Used by /admin/settings to enable/disable social auth providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { serviceApiConfigs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.roles?.some(role => role === 'admin' || role === 'super_admin');
    
    if (!currentUser || !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { provider, isActive } = body;

    if (!provider || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: provider and isActive' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders = ['github', 'google', 'facebook', 'microsoft', 'linkedin'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`[OAuth Toggle] ${isActive ? 'Enabling' : 'Disabling'} ${provider} OAuth`);

    // Check if config exists
    const existingConfig = await db
      .select()
      .from(serviceApiConfigs)
      .where(
        and(
          eq(serviceApiConfigs.serviceName, provider),
          eq(serviceApiConfigs.serviceType, 'oauth'),
          eq(serviceApiConfigs.environment, 'production')
        )
      )
      .limit(1);

    if (existingConfig.length === 0) {
      console.warn(`[OAuth Toggle] No configuration found for ${provider}`);
      return NextResponse.json(
        {
          error: `No ${provider} OAuth configuration found. Please configure credentials in /admin/api first.`,
          configured: false,
        },
        { status: 404 }
      );
    }

    // Update isActive status
    await db
      .update(serviceApiConfigs)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(serviceApiConfigs.id, existingConfig[0].id));

    console.log(`[OAuth Toggle] ${provider} OAuth ${isActive ? 'enabled' : 'disabled'} successfully`);

    return NextResponse.json({
      success: true,
      provider,
      isActive,
      message: `${provider} OAuth ${isActive ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    console.error('[OAuth Toggle] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to toggle OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
