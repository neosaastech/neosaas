/**
 * Script de diagnostic pour vérifier la configuration NEXTAUTH_SECRET
 * Usage: npx tsx scripts/check-nextauth-secret.ts
 */

console.log('🔍 Diagnostic de NEXTAUTH_SECRET\n');
console.log('='.repeat(50));
console.log('');

// Vérifier la présence de la variable
const secret = process.env.NEXTAUTH_SECRET;
const authSecret = process.env.AUTH_SECRET;

console.log('📋 Variables d\'environnement:');
console.log('');

if (secret) {
  console.log('✅ NEXTAUTH_SECRET est défini');
  console.log(`   Longueur: ${secret.length} caractères`);
  console.log(`   Valeur (masquée): ${secret.substring(0, 10)}...${secret.substring(secret.length - 5)}`);

  if (secret.length < 32) {
    console.log('');
    console.log('❌ ERREUR: NEXTAUTH_SECRET est trop court !');
    console.log(`   Longueur actuelle: ${secret.length} caractères`);
    console.log(`   Longueur minimale: 32 caractères`);
    console.log(`   Manque: ${32 - secret.length} caractères`);
    console.log('');
    console.log('💡 Solution: Générez une nouvelle clé:');
    console.log('   openssl rand -base64 32');
  } else {
    console.log('');
    console.log('✅ Longueur valide (>= 32 caractères)');
  }
} else {
  console.log('❌ NEXTAUTH_SECRET n\'est PAS défini');
}

console.log('');

if (authSecret) {
  console.log('✅ AUTH_SECRET est défini (fallback)');
  console.log(`   Longueur: ${authSecret.length} caractères`);
} else {
  console.log('⚠️  AUTH_SECRET n\'est pas défini (fallback non disponible)');
}

console.log('');
console.log('='.repeat(50));
console.log('');

// Recommandations
console.log('📝 Recommandations:');
console.log('');

if (!secret && !authSecret) {
  console.log('❌ Action requise: Définir NEXTAUTH_SECRET');
  console.log('');
  console.log('1. Générer une clé sécurisée:');
  console.log('   openssl rand -base64 32');
  console.log('');
  console.log('2. Ajouter dans .env.local:');
  console.log('   NEXTAUTH_SECRET=<votre-clé-générée>');
  console.log('');
  console.log('3. Ajouter sur Vercel:');
  console.log('   Settings → Environment Variables → Add');
  console.log('   - Name: NEXTAUTH_SECRET');
  console.log('   - Value: <votre-clé-générée>');
  console.log('   - Environments: Production, Preview, Development (tous)');
  console.log('');
} else if (secret && secret.length < 32) {
  console.log('❌ Action requise: Remplacer NEXTAUTH_SECRET par une clé plus longue');
  console.log('');
  console.log('Générer une nouvelle clé:');
  console.log('openssl rand -base64 32');
  console.log('');
} else {
  console.log('✅ Tout est correctement configuré !');
  console.log('');
  console.log('Si vous voyez toujours l\'erreur sur Vercel:');
  console.log('1. Vérifiez que NEXTAUTH_SECRET est défini pour TOUS les environnements');
  console.log('2. Redéployez après avoir ajouté/modifié la variable');
  console.log('3. Vérifiez qu\'il n\'y a pas d\'espaces avant/après la valeur');
}

console.log('');
