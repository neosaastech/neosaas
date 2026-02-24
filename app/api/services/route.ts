/**
 * API Routes for Service Configuration Management
 * GET /api/services - List all service configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { serviceApiRepository } from '@/lib/services';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manage service configurations
    // You can add role check here if needed

    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get('service');

    const configs = await serviceApiRepository.listConfigs(
      serviceName as any
    );

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error fetching service configurations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
