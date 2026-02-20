import { NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { platformConfig } from '@/db/schema';

/**
 * GET /api/config
 * Public API to retrieve platform configuration (site name, logo)
 * No authentication required - returns only public data
 */
export async function GET() {
  try {
    validateDatabaseUrl();

    const configs = await db.select().from(platformConfig);

    // Convert array to object
    const configMap: Record<string, any> = {};
    configs.forEach(c => {
      try {
        configMap[c.key] = JSON.parse(c.value || 'null');
      } catch {
        configMap[c.key] = c.value;
      }
    });

    // Return public configuration data including maintenance status
    return NextResponse.json({
      siteName: configMap['site_name'] || 'NeoSaaS',
      logo: configMap['logo'] || null,
      maintenanceMode: configMap['maintenance_mode'] === 'true' || configMap['maintenance_mode'] === true,
    });
  } catch (error) {
    console.error('Get public config error:', error);
    // Return default values on error
    return NextResponse.json({
      siteName: 'NeoSaaS',
      logo: null,
      maintenanceMode: false,
    });
  }
}
