
import { db } from '../db';
import { emailProviderConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/email/utils/encryption';

async function checkEmailConfig() {
  console.log('🔍 Checking email configuration...\n');

  const configs = await db.select().from(emailProviderConfigs);

  if (configs.length === 0) {
    console.log('❌ No email provider configurations found in database.');
    return;
  }

  console.log(`Found ${configs.length} configurations:`);

  for (const config of configs) {
    console.log(`\nProvider: ${config.provider}`);
    console.log(`Active: ${config.isActive}`);
    console.log(`Default: ${config.isDefault}`);
    
    try {
      const encrypted = (config.config as any)?.encrypted;
      if (encrypted) {
        const decrypted = await decrypt(encrypted);
        const credentials = JSON.parse(decrypted);
        console.log('Credentials found: Yes');
        console.log('Configuration details:', Object.keys(credentials).join(', '));
        
        if (config.provider === 'scaleway-tem') {
            console.log('Scaleway Project ID:', credentials.projectId ? 'Set' : 'Missing');
            console.log('Scaleway Secret Key:', credentials.secretKey ? 'Set' : 'Missing');
            console.log('Scaleway Region:', credentials.region || 'Default (fr-par)');
        }
      } else {
        console.log('Credentials found: No (Missing encrypted config)');
      }
    } catch (e) {
      console.log('Error decrypting credentials:', e);
    }
  }
}

checkEmailConfig()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
