# ⚠️ DEPRECATED - SEE VERCEL-SETUP.md

# Configuration Vercel - Variables d'Environnement

## ⚠️ IMPORTANT : 3 Étapes Obligatoires

Pour que l'authentification fonctionne sur Vercel, vous devez :

1. ✅ **Configurer les variables d'environnement** (voir ci-dessous)
2. ✅ **Créer les tables dans la base de données** (exécuter `database-setup.sql`)
3. ✅ **Tester avec `/api/health`** pour vérifier que tout fonctionne

## Problème Résolu

Le build échouait avec l'erreur :
\`\`\`
Error: DATABASE_URL environment variable is not set
\`\`\`

Cela se produit car les variables d'environnement du fichier `.env.local` ne sont pas disponibles sur Vercel.

## Solution Appliquée

### 1. Code Modifié

Le fichier `db/index.ts` a été modifié pour utiliser un placeholder pendant le build et valider la DATABASE_URL au runtime uniquement. Cela permet au build de réussir sur Vercel.

### 2. Configuration Requise sur Vercel

Vous devez ajouter les variables d'environnement suivantes dans votre projet Vercel :

#### Étapes pour Configurer les Variables d'Environnement sur Vercel

1. **Accédez à votre projet sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Sélectionnez votre projet `neosaas-website`

2. **Ouvrez les Paramètres**
   - Cliquez sur "Settings" dans le menu du projet
   - Sélectionnez "Environment Variables" dans la barre latérale

3. **Ajoutez les Variables Suivantes**

#### Variables Obligatoires

**DATABASE_URL** (Production, Preview, Development)
\`\`\`
postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require
\`\`\`

**NEXTAUTH_SECRET** (Production, Preview, Development)
\`\`\`
Générez une clé secrète aléatoire sécurisée
\`\`\`

Pour générer une clé sécurisée, utilisez :
\`\`\`bash
openssl rand -base64 32
\`\`\`

**NEXTAUTH_URL** (Production uniquement)
\`\`\`
https://votre-domaine-vercel.vercel.app
\`\`\`

#### Variables Optionnelles

**ADMIN_SECRET_KEY** (Production, Preview, Development)
\`\`\`
Générez une autre clé secrète pour la promotion d'admin SaaS
\`\`\`

### 3. Capture d'Écran de la Configuration

Votre configuration devrait ressembler à ceci :

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| DATABASE_URL | postgresql://neondb_owner:... | Production, Preview, Development |
| NEXTAUTH_SECRET | votre-clé-générée | Production, Preview, Development |
| NEXTAUTH_URL | https://... | Production |
| ADMIN_SECRET_KEY | votre-clé-admin-générée | Production, Preview, Development |

### 4. Sélection des Environnements

Pour chaque variable, cochez les cases appropriées :
- ✅ **Production** : Pour le déploiement en production
- ✅ **Preview** : Pour les branches de preview (recommandé)
- ✅ **Development** : Pour le développement local avec `vercel dev`

### 5. Redéployer

Après avoir ajouté les variables d'environnement :

1. **Option 1 : Redéploiement Automatique**
   - Vercel redéploiera automatiquement après l'ajout des variables

2. **Option 2 : Redéploiement Manuel**
   - Allez dans "Deployments"
   - Cliquez sur les trois points (...) du dernier déploiement
   - Sélectionnez "Redeploy"

## Vérification

Une fois les variables ajoutées et le déploiement effectué :

1. Le build devrait réussir
2. Visitez votre site : `https://votre-projet.vercel.app`
3. Testez l'inscription : `/auth/register`
4. Testez la connexion : `/auth/login`

## Sécurité

⚠️ **Important** :
- Ne jamais commiter `.env.local` dans Git
- Utiliser des clés secrètes différentes pour chaque environnement
- Régénérer `NEXTAUTH_SECRET` en production avec une valeur forte
- Protéger l'accès aux variables d'environnement dans Vercel

## Commandes Utiles

### Générer une clé secrète
\`\`\`bash
openssl rand -base64 32
\`\`\`

### Tester localement avec Vercel CLI
\`\`\`bash
vercel env pull .env.local
\`\`\`

### Voir les variables d'environnement
\`\`\`bash
vercel env ls
\`\`\`

## Dépannage

### Le build échoue toujours
- Vérifiez que `DATABASE_URL` est bien définie
- Assurez-vous d'avoir coché "Production" et "Preview"
- Redéployez manuellement

### Les routes API renvoient une erreur DATABASE_URL
- La validation runtime détecte que la variable n'est pas configurée
- Vérifiez les variables d'environnement dans les Settings Vercel

### Problème de connexion à la base de données
- Vérifiez que l'URL de connexion est correcte
- Assurez-vous que Neon Database accepte les connexions depuis Vercel
- Vérifiez que le paramètre `?sslmode=require` est présent

## Environnements Multiples

Si vous utilisez plusieurs bases de données pour différents environnements :

**Production**
\`\`\`
DATABASE_URL=postgresql://...neon.tech/neondb_prod?sslmode=require
\`\`\`

**Preview**
\`\`\`
DATABASE_URL=postgresql://...neon.tech/neondb_staging?sslmode=require
\`\`\`

**Development**
\`\`\`
DATABASE_URL=postgresql://...neon.tech/neondb_dev?sslmode=require
\`\`\`

## Notes Additionnelles

- Les variables d'environnement sont chiffrées par Vercel
- Elles sont injectées au moment du build et du runtime
- Les modifications de variables nécessitent un redéploiement
- Les variables Preview sont héritées de Production si non définies

## Liens Utiles

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Neon Database Documentation](https://neon.tech/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## ⚠️ ÉTAPE CRITIQUE : CRÉER LES TABLES

**Si votre authentification ne fonctionne pas, c'est probablement parce que les tables n'existent pas !**

### Comment Créer les Tables

1. **Allez sur Neon Console**
   - [console.neon.tech](https://console.neon.tech/)

2. **Ouvrez le SQL Editor**
   - Cliquez sur votre projet
   - Sélectionnez "SQL Editor"

3. **Exécutez le fichier `database-setup.sql`**
   - Copiez le contenu de `database-setup.sql`
   - Collez-le dans l'éditeur
   - Cliquez sur "Run"

4. **Vérifiez avec `/api/health`**
   \`\`\`
   https://votre-projet.vercel.app/api/health
   \`\`\`

### Si Vous Voyez "tables missing"

C'est normal ! Retournez à l'étape 3 et exécutez `database-setup.sql` dans Neon.

📖 **Pour plus de détails, consultez :** `TROUBLESHOOTING.md`
