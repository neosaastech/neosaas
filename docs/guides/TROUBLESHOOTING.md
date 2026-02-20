# Guide de Dépannage - Authentification Ne Crée Rien

## Problème : L'authentification ne crée rien dans la base de données

Si vous testez l'inscription/connexion et que rien ne se passe ou que vous obtenez des erreurs, suivez ces étapes :

---

## Étape 1 : Vérifier les Logs Vercel

### Option A : Via l'Interface Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Ouvrez votre projet `neosaas-website`
3. Cliquez sur **Deployments**
4. Cliquez sur le déploiement actuel
5. Allez dans l'onglet **Functions**
6. Cherchez `/api/auth/register` ou `/api/auth/login`
7. Cliquez dessus pour voir les logs

### Option B : Via la Console du Navigateur

1. Ouvrez votre site sur Vercel
2. Ouvrez la Console du Navigateur (F12)
3. Allez dans l'onglet **Network**
4. Essayez de vous inscrire
5. Regardez la requête `/api/auth/register` :
   - **Status Code** : Devrait être 200 si succès
   - **Response** : Cliquez pour voir la réponse JSON
   - **Preview** : Voyez-vous une erreur ?

### Erreurs Courantes

**Erreur : "DATABASE_URL environment variable is not set"**
- ❌ La variable `DATABASE_URL` n'est pas configurée sur Vercel
- ✅ Solution : Ajoutez-la dans Settings → Environment Variables

**Erreur : "relation 'users' does not exist"**
- ❌ Les tables n'ont pas été créées dans la base de données
- ✅ Solution : Suivez l'Étape 2 ci-dessous

**Erreur : "User with this email already exists"**
- ✅ C'est bon signe ! La base fonctionne
- ℹ️ Essayez avec un autre email

---

## Étape 2 : Créer les Tables dans Neon Database

**C'est probablement votre problème !** Les tables doivent être créées manuellement.

### Méthode 1 : Via Neon SQL Editor (Recommandé)

1. **Accédez à Neon Console**
   - Allez sur [console.neon.tech](https://console.neon.tech/)
   - Connectez-vous à votre compte
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Cliquez sur **SQL Editor** dans le menu
   - Ou cliquez sur votre base de données → **Query**

3. **Exécutez le Script SQL**
   - Ouvrez le fichier `database-setup.sql` dans ce projet
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL de Neon
   - Cliquez sur **Run** ou appuyez sur `Ctrl+Enter`

4. **Vérifiez la Création**
   - Vous devriez voir des messages de confirmation
   - Vérifiez que les tables apparaissent dans la liste

### Méthode 2 : Via pnpm (Local uniquement)

Si vous développez en local et avez accès réseau :

\`\`\`bash
# Depuis votre ordinateur local
pnpm db:push
\`\`\`

⚠️ **Note** : Cette commande ne fonctionnera pas dans l'environnement sandbox.

### Méthode 3 : Via psql (Ligne de commande)

Si vous avez `psql` installé :

\`\`\`bash
psql "postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require" < database-setup.sql
\`\`\`

---

## Étape 3 : Vérifier la Connexion à la Base de Données

### Test avec un Outil SQL

1. **Téléchargez un Client SQL** (optionnel)
   - [DBeaver](https://dbeaver.io/) (gratuit)
   - [TablePlus](https://tableplus.com/) (gratuit avec limitations)
   - [pgAdmin](https://www.pgadmin.org/) (gratuit)

2. **Connectez-vous avec ces paramètres :**
   \`\`\`
   Host: <your-neon-host>
   Port: 5432
   Database: neondb
   Username: neondb_owner
   Password: __NEON_PASSWORD_REDACTED__
   SSL Mode: require
   \`\`\`

3. **Vérifiez les Tables**
   \`\`\`sql
   SELECT * FROM information_schema.tables
   WHERE table_schema = 'public';
   \`\`\`

   Vous devriez voir :
   - `companies`
   - `users`

### Test Rapide dans Neon Console

Dans le SQL Editor de Neon, exécutez :

\`\`\`sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Vérifier le type enum
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'role');

-- Compter les utilisateurs
SELECT COUNT(*) as user_count FROM users;
\`\`\`

---

## Étape 4 : Tester l'API Directement

### Test avec curl

\`\`\`bash
# Test d'inscription
curl -X POST https://votre-projet.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  }'
\`\`\`

### Test avec Postman/Insomnia

1. **Créez une requête POST**
   - URL : `https://votre-projet.vercel.app/api/auth/register`
   - Method : `POST`
   - Headers : `Content-Type: application/json`

2. **Body (JSON) :**
   \`\`\`json
   {
     "email": "test@example.com",
     "password": "password123",
     "firstName": "John",
     "lastName": "Doe",
     "companyName": "Test Company",
     "companyEmail": "contact@test.com",
     "role": "admin"
   }
   \`\`\`

3. **Envoyez la Requête**
   - ✅ Status 200 : Succès !
   - ❌ Status 500 : Erreur serveur (vérifiez les logs)
   - ❌ Status 400 : Champs manquants
   - ❌ Status 409 : Email déjà utilisé

---

## Étape 5 : Vérifications de Sécurité Vercel

### Vérifier les Variables d'Environnement

1. Allez sur Vercel → Settings → Environment Variables
2. Vérifiez que ces variables sont définies :
   - ✅ `DATABASE_URL`
   - ✅ `NEXTAUTH_SECRET`
   - ✅ `NEXTAUTH_URL` (Production)
   - ✅ `ADMIN_SECRET_KEY` (Optionnel)

3. Vérifiez que les environnements sont cochés :
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optionnel)

### Redéployer si Nécessaire

Si vous avez ajouté/modifié des variables :

1. Allez dans **Deployments**
2. Cliquez sur **...** du dernier déploiement
3. Sélectionnez **Redeploy**

---

## Étape 6 : Test Complet de l'Inscription

1. **Ouvrez votre site sur Vercel**
   \`\`\`
   https://votre-projet.vercel.app/auth/register
   \`\`\`

2. **Remplissez le Formulaire**
   - First Name : John
   - Last Name : Doe
   - Email : john@example.com
   - Company Name : Acme Inc. (optionnel)
   - Company Email : contact@acme.com (optionnel)
   - Role : Admin
   - Password : password123
   - Confirm Password : password123
   - ✅ Accept Terms

3. **Cliquez sur "Create account"**

4. **Résultats Attendus**
   - ✅ Message de succès : "Account created successfully!"
   - ✅ Redirection vers `/dashboard-exemple`
   - ✅ Vous êtes connecté

5. **Vérifier dans la Base de Données**
   \`\`\`sql
   SELECT * FROM users WHERE email = 'john@example.com';
   \`\`\`

---

## Erreurs Spécifiques et Solutions

### "Failed to fetch" / Network Error

**Problème** : Le navigateur ne peut pas joindre l'API

**Solutions :**
1. Vérifiez que votre déploiement Vercel est actif
2. Vérifiez l'URL dans le navigateur
3. Ouvrez la console réseau (F12 → Network)
4. Regardez si la requête est bloquée par CORS

### "Invalid email or password"

**Problème** : Lors du login, les identifiants ne correspondent pas

**Solutions :**
1. Assurez-vous d'utiliser le bon email/mot de passe
2. Vérifiez dans la base de données que l'utilisateur existe
3. Essayez de vous réinscrire avec un nouvel email

### "User with this email already exists"

**Problème** : L'email est déjà enregistré

**Solutions :**
1. ✅ C'est normal ! Essayez de vous connecter au lieu de vous inscrire
2. Ou utilisez un autre email pour tester

### Rien ne se passe, pas d'erreur

**Problème** : Le formulaire ne réagit pas

**Solutions :**
1. Ouvrez la console (F12)
2. Regardez s'il y a des erreurs JavaScript
3. Vérifiez que les boutons ne sont pas désactivés
4. Essayez de recharger la page (Ctrl+F5)

---

## Checklist Complète

Cochez au fur et à mesure :

- [ ] Variables d'environnement ajoutées sur Vercel
- [ ] DATABASE_URL configurée
- [ ] NEXTAUTH_SECRET configurée (générée avec openssl)
- [ ] Tables créées dans Neon Database (exécuté database-setup.sql)
- [ ] Build Vercel réussi (pas d'erreur rouge)
- [ ] Déploiement actif sur Vercel
- [ ] Page /auth/register accessible
- [ ] Page /auth/login accessible
- [ ] Formulaire d'inscription fonctionnel
- [ ] Utilisateur créé dans la base de données
- [ ] Login fonctionnel
- [ ] Redirection après login fonctionne

---

## Outils de Débogage

### Logs en Temps Réel

Pour voir les logs de votre API en temps réel :

1. **Vercel CLI** (local)
   \`\`\`bash
   vercel logs --follow
   \`\`\`

2. **Vercel Dashboard**
   - Deployments → Functions → Sélectionnez la fonction
   - Activez "Real-time Logs"

### Test de Santé de la Base

Créez un endpoint de test temporaire :

\`\`\`typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db, validateDatabaseUrl } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    validateDatabaseUrl();

    // Test simple : SELECT 1
    const result = await db.execute(sql`SELECT 1 as test`);

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      result: result.rows
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    }, { status: 500 });
  }
}
\`\`\`

Testez : `https://votre-projet.vercel.app/api/health`

---

## Support

Si le problème persiste après avoir suivi ces étapes :

1. **Vérifiez les logs Vercel** (étape 1)
2. **Copiez l'erreur exacte** que vous voyez
3. **Vérifiez que les tables existent** dans Neon
4. **Testez l'API directement** avec curl/Postman

Le problème le plus courant est : **Les tables n'ont pas été créées dans Neon Database.**

✅ **Solution** : Exécutez `database-setup.sql` dans le SQL Editor de Neon Console.
