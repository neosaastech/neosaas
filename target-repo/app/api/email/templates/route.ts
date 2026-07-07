/**
 * Routes API pour gérer les templates d'emails
 * GET /api/email/templates - Récupérer tous les templates
 * POST /api/email/templates - Sauvegarder un template
 * DELETE /api/email/templates - Supprimer un template
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailTemplateRepository } from '@/lib/email/repositories/template.repository';

export async function GET() {
  try {
    const templates = await emailTemplateRepository.getAllTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, description, fromName, fromEmail, subject, htmlContent, textContent, isActive, provider } = body;

    if (!type || !name || !fromName || !fromEmail || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await emailTemplateRepository.saveTemplate({
      type,
      name,
      description,
      fromName,
      fromEmail,
      subject,
      htmlContent,
      textContent,
      isActive,
      provider,
    });

    return NextResponse.json({ success: true, message: 'Template saved successfully' });
  } catch (error: any) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: type' },
        { status: 400 }
      );
    }

    await emailTemplateRepository.deleteTemplate(type);

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
