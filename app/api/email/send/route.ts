/**
 * Route API pour envoyer des emails
 * POST /api/email/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailRouter } from '@/lib/email/services/email-router.service';
import { emailHistoryRepository } from '@/lib/email/repositories/history.repository';
import type { EmailMessage, EmailProvider } from '@/lib/email/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { to, cc, bcc, from, fromName, subject, htmlContent, textContent, provider, tags } = body;

    // Validation
    if (!to || !from || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, from, subject' },
        { status: 400 }
      );
    }

    // Créer le message
    const message: EmailMessage = {
      to,
      cc,
      bcc,
      from,
      fromName,
      subject,
      htmlContent,
      textContent,
      tags,
    };

    // Créer l'enregistrement d'historique
    const historyRecord = await emailHistoryRepository.create(
      message,
      provider || ('resend' as EmailProvider),
      undefined,
      undefined
    );

    // Envoyer l'email
    const result = provider
      ? await emailRouter.sendEmail(message, provider as EmailProvider)
      : await emailRouter.sendWithFallback(message);

    // Mettre à jour l'historique
    if (result.success) {
      await emailHistoryRepository.updateStatus(
        historyRecord.id,
        'sent' as any,
        undefined,
        result.messageId
      );
    } else {
      await emailHistoryRepository.updateStatus(
        historyRecord.id,
        'failed' as any,
        result.error
      );
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      historyId: historyRecord.id,
      provider: result.provider,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
