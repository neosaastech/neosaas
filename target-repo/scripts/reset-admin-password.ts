/**
 * Script pour réinitialiser le mot de passe de l'admin
 * Usage: npx tsx scripts/reset-admin-password.ts
 */

import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'contact@exemple.com';
const ADMIN_PASSWORD = 'admin';

async function resetAdminPassword() {
  console.log('🔐 Réinitialisation du mot de passe admin\n');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Vérifier si l'utilisateur existe
    console.log(`🔍 Recherche de l'utilisateur: ${ADMIN_EMAIL}`);
    const user = await db.query.users.findFirst({
      where: eq(users.email, ADMIN_EMAIL),
    });

    if (!user) {
      console.log('');
      console.log(`❌ Utilisateur ${ADMIN_EMAIL} non trouvé !`);
      console.log('');
      console.log('💡 Solution: Exécutez le script de création de la base de données:');
      console.log('   npm run db:push');
      console.log('');
      process.exit(1);
    }

    console.log('✅ Utilisateur trouvé');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Actif: ${user.isActive}`);
    console.log('');

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      console.log('⚠️  L\'utilisateur est désactivé. Activation...');
      await db
        .update(users)
        .set({ isActive: true })
        .where(eq(users.id, user.id));
      console.log('✅ Utilisateur activé');
      console.log('');
    }

    // Hasher le nouveau mot de passe
    console.log('🔒 Hashage du nouveau mot de passe...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('✅ Mot de passe hashé');
    console.log('');

    // Mettre à jour le mot de passe
    console.log('💾 Mise à jour du mot de passe en base de données...');
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log('');
    console.log('='.repeat(50));
    console.log('');
    console.log('🎉 Connexion admin réinitialisée !');
    console.log('');
    console.log('📝 Informations de connexion:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion !');
    console.log('');
    console.log('🌐 URL de connexion:');
    console.log('   Local: http://localhost:3000/auth/login');
    console.log('   Production: https://votre-domaine.com/auth/login');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Erreur lors de la réinitialisation:', error);
    console.error('');
    process.exit(1);
  }
}

// Exécuter le script
resetAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
