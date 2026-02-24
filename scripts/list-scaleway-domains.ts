
import 'dotenv/config';
import { db } from '../db';
import { emailProviderConfigs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../lib/email/utils/encryption';

async function listScalewayDomains() {
  console.log('🔍 Checking Scaleway Domains...\n');

  const configs = await db.select().from(emailProviderConfigs).where(eq(emailProviderConfigs.provider, 'scaleway-tem'));
  const config = configs.find(c => c.isActive) || configs[0];

  if (!config) {
    console.log('❌ No Scaleway configuration found.');
    return;
  }

  console.log(`Using configuration ID: ${config.id}`);

  try {
    const encrypted = (config.config as any)?.encrypted;
    if (!encrypted) {
      console.log('❌ No encrypted config found.');
      return;
    }

    const decrypted = await decrypt(encrypted);
    const credentials = JSON.parse(decrypted);
    
    const projectId = credentials.projectId;
    const secretKey = credentials.secretKey;
    const region = credentials.region || 'fr-par';

    if (!projectId || !secretKey) {
      console.log('❌ Missing projectId or secretKey in config.');
      return;
    }

    console.log(`Project ID: ${projectId}`);
    console.log(`Region: ${region}`);
    console.log('Fetching domains from Scaleway API...');

    const apiUrl = 'https://api.scaleway.com/transactional-email/v1alpha1';
    const url = `${apiUrl}/regions/${region}/domains?project_id=${projectId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Token': secretKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('\n📋 Domains List:');
    
    if (!data.domains || data.domains.length === 0) {
        console.log('No domains found for this project/region.');
    } else {
        data.domains.forEach((d: any) => {
            console.log(`- ${d.name} (Status: ${d.status})`);
            if (d.status !== 'checked') {
                console.log(`  ⚠️  Warning: Domain is not 'checked'. Current status: ${d.status}`);
                if (d.last_error) console.log(`  Last Error: ${d.last_error}`);
            } else {
                console.log(`  ✅ Ready to send`);
            }
            console.log(`  ID: ${d.id}`);
            console.log(`  Created At: ${d.created_at}`);
            console.log('---');
        });
    }

  } catch (e) {
    console.error('Error:', e);
  }
}

listScalewayDomains()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
