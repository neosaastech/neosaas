/**
 * Route API pour récupérer l'historique des emails
 * GET /api/email/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailHistoryRepository } from '@/lib/email/repositories/history.repository';
import type { EmailProvider, EmailDeliveryStatus } from '@/lib/email/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const provider = searchParams.get('provider') as EmailProvider | undefined;
    const status = searchParams.get('status') as EmailDeliveryStatus | undefined;
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const query = {
      provider,
      status,
      from: fromStr ? new Date(fromStr) : undefined,
      to: toStr ? new Date(toStr) : undefined,
      limit,
      offset,
    };

    const result = await emailHistoryRepository.search(query);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error getting email history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get history' },
      { status: 500 }
    );
  }
}
