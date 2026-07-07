/**
 * Routes API pour gérer les configurations des providers
 * GET /api/email/config - Récupérer toutes les configurations
 * POST /api/email/config - Sauvegarder une configuration
 * DELETE /api/email/config - Supprimer une configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailConfigRepository } from '@/lib/email/repositories/config.repository';
import type { EmailProvider, EmailProviderConfig } from '@/lib/email/types';
import { maskSensitiveData } from '@/lib/email/utils/encryption';

export async function GET() {
  try {
    const configs = await emailConfigRepository.getAllConfigs();

    // Masquer les données sensibles
    const sanitizedConfigs = configs.map((config) => {
      const sanitized: any = {
        provider: config.provider,
        isActive: config.isActive,
        isDefault: config.isDefault,
      };

      if (config.awsSes) {
        sanitized.awsSes = {
          region: config.awsSes.region,
          accessKeyId: maskSensitiveData(config.awsSes.accessKeyId),
          method: config.awsSes.method,
        };
      }

      if (config.resend) {
        sanitized.resend = {
          apiKey: maskSensitiveData(config.resend.apiKey),
        };
      }

      if (config.scalewayTem) {
        sanitized.scalewayTem = {
          projectId: config.scalewayTem.projectId,
          secretKey: maskSensitiveData(config.scalewayTem.secretKey),
          plan: config.scalewayTem.plan,
        };
      }

      return sanitized;
    });

    return NextResponse.json({ success: true, configs: sanitizedConfigs });
  } catch (error: any) {
    console.error('Error getting email configs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, isActive, isDefault, config: providerConfig } = body;

    // Validation
    if (!provider || !providerConfig) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: provider, config' },
        { status: 400 }
      );
    }

    // Construire la configuration
    const emailConfig: EmailProviderConfig = {
      provider: provider as EmailProvider,
      isActive: isActive !== false,
      isDefault: isDefault === true,
    };

    // Ajouter la configuration spécifique au provider
    if (provider === 'aws-ses') {
      emailConfig.awsSes = providerConfig;
    } else if (provider === 'resend') {
      emailConfig.resend = providerConfig;
    } else if (provider === 'scaleway-tem') {
      emailConfig.scalewayTem = providerConfig;
    }

    // Sauvegarder
    await emailConfigRepository.saveConfig(emailConfig);

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error: any) {
    console.error('Error saving email config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save config' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: provider' },
        { status: 400 }
      );
    }

    await emailConfigRepository.deleteConfig(provider as EmailProvider);

    return NextResponse.json({ success: true, message: 'Configuration deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting email config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete config' },
      { status: 500 }
    );
  }
}
