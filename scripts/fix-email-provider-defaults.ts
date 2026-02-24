import { db } from '../db';
import { emailProviderConfigs, serviceApiConfigs, emailTemplates } from '../db/schema';
import { eq } from 'drizzle-orm';

async function fixEmailProviderDefaults() {
  console.log('🔧 Fixing email provider defaults...');

  try {
    // 1. Disable default flag for all legacy providers
    console.log('  - Disabling default flag for legacy providers...');
    await db
      .update(emailProviderConfigs)
      .set({ isDefault: false })
      .where(eq(emailProviderConfigs.isDefault, true));
    
    // 2. Enable default flag for Scaleway service
    console.log('  - Enabling default flag for Scaleway service...');
    const scalewayConfig = await db
      .select()
      .from(serviceApiConfigs)
      .where(eq(serviceApiConfigs.serviceName, 'scaleway'))
      .limit(1);

    if (scalewayConfig.length > 0) {
      await db
        .update(serviceApiConfigs)
        .set({ isDefault: true })
        .where(eq(serviceApiConfigs.serviceName, 'scaleway'));
      console.log('  ✅ Scaleway set as default provider');
    } else {
      console.warn('  ⚠️ Scaleway config not found in service_api_configs');
    }

    // 3. Fix email templates using 'resend'
    console.log('  - Fixing email templates using "resend"...');
    await db
      .update(emailTemplates)
      .set({ provider: null }) // Reset to use system default
      .where(eq(emailTemplates.provider, 'resend'));
    console.log('  ✅ Email templates fixed (resend -> system default)');

    console.log('🎉 Defaults fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing defaults:', error);
    process.exit(1);
  }
}

fixEmailProviderDefaults()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
