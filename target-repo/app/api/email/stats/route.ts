/**
 * Route API pour récupérer les statistiques des emails
 * GET /api/email/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailHistoryRepository } from '@/lib/email/repositories/history.repository';
import type { EmailProvider } from '@/lib/email/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const provider = searchParams.get('provider') as EmailProvider | undefined;
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;

    const stats = await emailHistoryRepository.getStatistics(provider, from, to);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error getting email stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get stats' },
      { status: 500 }
    );
  }
}
