/**
 * API Route for Service Usage Statistics
 * GET /api/services/[service]/usage - Get usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { serviceApiRepository } from '@/lib/services';
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

    await params; // await params even if not used
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'Config ID is required' },
        { status: 400 }
      );
    }

    const stats = await serviceApiRepository.getUsageStats(configId, limit);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching usage statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
