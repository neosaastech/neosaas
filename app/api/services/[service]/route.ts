/**
 * API Routes for Specific Service Configuration
 * GET /api/services/[service] - Get service configuration
 * POST /api/services/[service] - Create/Update service configuration
 * DELETE /api/services/[service] - Delete service configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { serviceApiRepository } from '@/lib/services';
import type { ServiceConfig, ServiceEnvironment } from '@/lib/services/types';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const environment = (searchParams.get('environment') || 'production') as ServiceEnvironment;

    const config = await serviceApiRepository.getConfig(
      service as any,
      environment
    );

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching service configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service } = await params;
    const body = await request.json();

    // Validate service name
    const validServices = ['stripe', 'paypal', 'scaleway', 'resend', 'aws', 'lago'];
    if (!validServices.includes(service)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service name' },
        { status: 400 }
      );
    }

    // Prepare config object
    const config: ServiceConfig = {
      serviceName: service as any,
      serviceType: body.serviceType,
      environment: body.environment || 'production',
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
      config: body.config,
      metadata: body.metadata,
    };

    // Save configuration
    const result = await serviceApiRepository.upsertConfig(config);

    return NextResponse.json({
      success: true,
      data: { id: result.id },
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving service configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await params; // await params even if not used
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    await serviceApiRepository.deleteConfig(id);

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting service configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
