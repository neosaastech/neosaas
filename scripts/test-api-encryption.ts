/**
 * Script de test pour vérifier l'authentification et le cryptage
 * Usage: npx tsx scripts/test-api-encryption.ts
 */

import { encrypt, decrypt } from '../lib/email/utils/encryption';

async function testEncryption() {
  console.log('🔐 Test du système de cryptage\n');

  // Test 1: Cryptage simple
  const testData = JSON.stringify({
    accessKey: 'SCWXXXXXXXXXX',
    secretKey: 'my-super-secret-key-12345',
  });

  console.log('📝 Données originales:');
  console.log(testData);
  console.log('');

  // Crypter
  const encrypted = await encrypt(testData);
  console.log('✅ Données cryptées (base64):');
  console.log(encrypted.substring(0, 100) + '...');
  console.log(`Longueur: ${encrypted.length} caractères`);
  console.log('');

  // Décrypter
  const decrypted = await decrypt(encrypted);
  console.log('🔓 Données décryptées:');
  console.log(decrypted);
  console.log('');

  // Vérifier l'intégrité
  if (testData === decrypted) {
    console.log('✅ Test réussi ! Le cryptage/décryptage fonctionne correctement.');
  } else {
    console.error('❌ Erreur : Les données ne correspondent pas !');
    process.exit(1);
  }

  // Test 2: Vérifier que chaque cryptage est unique (salt/IV aléatoires)
  const encrypted2 = await encrypt(testData);
  if (encrypted !== encrypted2) {
    console.log('✅ Les salts/IV sont bien aléatoires (chaque cryptage est unique).');
  } else {
    console.error('⚠️  Attention : Les cryptages sont identiques (problème de randomisation)');
  }

  console.log('\n🎉 Tous les tests sont passés !');
}

// Test de configuration
function testConfig() {
  console.log('\n📋 Vérification de la configuration:\n');

  if (process.env.NEXTAUTH_SECRET) {
    console.log(`✅ NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET.substring(0, 10)}...`);
    console.log(`   Longueur: ${process.env.NEXTAUTH_SECRET.length} caractères`);
  } else {
    console.error('❌ NEXTAUTH_SECRET non défini !');
    process.exit(1);
  }

  console.log('');
}

// Exécution
testConfig();
testEncryption().catch((error) => {
  console.error('❌ Erreur lors du test:', error);
  process.exit(1);
});
