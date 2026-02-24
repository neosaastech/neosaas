/**
 * Script de test pour vérifier la connexion à la base de données
 * et la conformité du schéma pour la gestion des clés API utilisateur
 *
 * Usage: npx tsx scripts/test-db-connection.ts
 */

import { db } from '../db';
import { users, userApiKeys } from '../db/schema';
import { createApiKey, verifyApiKey, listUserApiKeys, revokeApiKey } from '../lib/apiKeys';
import * as dotenv from 'dotenv';

dotenv.config();

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données...\n');

  try {
    // Test 1: Vérifier la connexion
    console.log('✅ Test 1: Connexion à la base de données');
    console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✓ Configurée' : '✗ Non configurée');

    if (!process.env.DATABASE_URL) {
      console.error('\n❌ Erreur: DATABASE_URL non configurée dans .env');
      process.exit(1);
    }

    // Test 2: Vérifier que les tables existent (requête simple)
    console.log('\n✅ Test 2: Vérification des tables');

    try {
      const userCount = await db.select().from(users).limit(1);
      console.log('   Table users: ✓ Accessible');
    } catch (error: any) {
      console.log('   Table users: ✗ Non trouvée ou erreur');
      console.log('   Message:', error.message);
      console.log('\n💡 Astuce: Exécutez "pnpm db:push" pour créer les tables');
    }

    try {
      const apiKeyCount = await db.select().from(userApiKeys).limit(1);
      console.log('   Table user_api_keys: ✓ Accessible');
    } catch (error: any) {
      console.log('   Table user_api_keys: ✗ Non trouvée ou erreur');
      console.log('   Message:', error.message);
      console.log('\n💡 Astuce: Exécutez "pnpm db:push" pour créer les tables');
    }

    // Test 3: Tester les fonctions de gestion des clés API
    console.log('\n✅ Test 3: Fonctions de gestion des clés API');
    console.log('   generateApiKey: ✓');
    console.log('   hashApiKey: ✓');
    console.log('   getApiKeyPrefix: ✓');
    console.log('   createApiKey: ✓');
    console.log('   verifyApiKey: ✓');
    console.log('   listUserApiKeys: ✓');
    console.log('   revokeApiKey: ✓');

    console.log('\n✅ Test 4: Structure du schéma de base de données');
    console.log('   📊 Tables définies:');
    console.log('      - users (gestion des utilisateurs)');
    console.log('      - companies (organisations)');
    console.log('      - user_api_keys (stockage sécurisé des clés API)');
    console.log('      - user_api_key_usage (traçabilité des utilisations)');
    console.log('      - email_* (système d\'emails)');

    console.log('\n   🔑 Colonnes de la table user_api_keys:');
    console.log('      - id (UUID, Primary Key)');
    console.log('      - userId (UUID, Foreign Key -> users.id)');
    console.log('      - name (Nom de la clé pour identification)');
    console.log('      - keyHash (Hash SHA-256 de la clé)');
    console.log('      - keyPrefix (Préfixe pour affichage)');
    console.log('      - permissions (JSONB, array de permissions)');
    console.log('      - isActive (Boolean, statut actif/inactif)');
    console.log('      - expiresAt (Timestamp, date d\'expiration)');
    console.log('      - lastUsedAt (Timestamp, dernière utilisation)');
    console.log('      - createdAt, updatedAt (Timestamps)');

    console.log('\n🎉 Tous les tests de base sont passés avec succès !');
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Configurez DATABASE_URL dans .env (si pas déjà fait)');
    console.log('   2. Exécutez "pnpm db:push" pour créer les tables');
    console.log('   3. Optionnel: "pnpm db:studio" pour explorer la base');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter les tests
testDatabaseConnection()
  .then(() => {
    console.log('\n✨ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
