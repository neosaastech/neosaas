# Initialisation Automatique de la Base de Données

## 🚀 Méthode Automatisée (Recommandée)

Au lieu de créer les tables manuellement, vous pouvez utiliser l'endpoint `/api/setup` qui les crée automatiquement.

---

## Étape 1 : Vérifier le Statut

Vérifiez d'abord si les tables existent :

\`\`\`bash
curl https://votre-projet.vercel.app/api/setup
\`\`\`

**Réponse si les tables n'existent pas :**
\`\`\`json
{
  "status": "needs_setup",
  "database": "connected",
  "tables": {
    "exist": false,
    "found": [],
    "missing": ["companies", "users"]
  },
  "message": "Database needs initialization",
  "instruction": "POST /api/setup with body: { \"secretKey\": \"your-secret-key\" }"
}
\`\`\`

**Réponse si les tables existent déjà :**
\`\`\`json
{
  "status": "initialized",
  "database": "connected",
  "tables": {
    "exist": true,
    "found": ["companies", "users"],
    "missing": []
  },
  "message": "Database is ready"
}
\`\`\`

---

## Étape 2 : Initialiser la Base de Données

Si les tables n'existent pas, appelez l'endpoint avec votre clé secrète :

### Option A : Via curl

\`\`\`bash
curl -X POST https://votre-projet.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "change-this-in-production"}'
\`\`\`

### Option B : Via la Console du Navigateur

1. Ouvrez votre site sur Vercel
2. Appuyez sur `F12` pour ouvrir la console
3. Exécutez ce code :

\`\`\`javascript
fetch('/api/setup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'change-this-in-production' })
})
.then(r => r.json())
.then(data => {
  console.log('Setup result:', data);
  if (data.status === 'success') {
    console.log('✅ Database initialized successfully!');
    console.log('Tables created:', data.tables.created);
  }
});
\`\`\`

### Option C : Via Postman/Insomnia

1. **Méthode** : `POST`
2. **URL** : `https://votre-projet.vercel.app/api/setup`
3. **Headers** : `Content-Type: application/json`
4. **Body** (raw JSON) :
   \`\`\`json
   {
     "secretKey": "change-this-in-production"
   }
   \`\`\`

---

## Réponse Attendue

**Succès :**
\`\`\`json
{
  "status": "success",
  "message": "Database initialized successfully",
  "tables": {
    "created": ["companies", "users"],
    "total": 2
  },
  "next_steps": [
    "Test the health endpoint: GET /api/health",
    "Test registration: POST /api/auth/register",
    "This endpoint can now be removed or disabled for security"
  ]
}
\`\`\`

**Déjà initialisé :**
\`\`\`json
{
  "status": "already_initialized",
  "message": "Database tables already exist",
  "tables": ["companies", "users"]
}
\`\`\`

**Erreur - Clé invalide :**
\`\`\`json
{
  "error": "Unauthorized",
  "message": "Invalid or missing secret key"
}
\`\`\`

---

## Étape 3 : Vérifier que Tout Fonctionne

### Test 1 : Health Check

\`\`\`bash
curl https://votre-projet.vercel.app/api/health
\`\`\`

Vous devriez voir :
\`\`\`json
{
  "status": "ok",
  "database": "connected",
  "tables": {
    "exist": true,
    "found": ["companies", "users"]
  }
}
\`\`\`

### Test 2 : Inscription

Testez l'inscription d'un utilisateur :

\`\`\`bash
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

---

## Configuration de la Clé Secrète

### Utiliser la Clé Existante

L'endpoint `/api/setup` utilise soit :
- `SETUP_SECRET_KEY` (si définie)
- `ADMIN_SECRET_KEY` (en fallback)

Si vous avez déjà configuré `ADMIN_SECRET_KEY` sur Vercel, vous pouvez l'utiliser.

### Définir une Clé Dédiée

Pour plus de sécurité, ajoutez une clé spécifique dans Vercel :

1. Allez sur Vercel → Settings → Environment Variables
2. Ajoutez :
   - **Name** : `SETUP_SECRET_KEY`
   - **Value** : `change-this-in-production` (ou générez une clé avec `openssl rand -base64 32`)
   - **Environments** : ✅ Production, ✅ Preview

3. Redéployez votre projet

---

## Sécurité

### ⚠️ Important

1. **Clé Secrète** : Changez `change-this-in-production` par une vraie clé secrète
2. **Accès Limité** : Seules les personnes avec la clé peuvent initialiser la DB
3. **Une Seule Fois** : L'endpoint détecte si les tables existent déjà
4. **Retrait Optionnel** : Vous pouvez supprimer cet endpoint après l'initialisation

### Retirer l'Endpoint Après Initialisation

Une fois la base de données initialisée, vous pouvez :

**Option 1 : Supprimer le fichier**
\`\`\`bash
rm app/api/setup/route.ts
git commit -m "Remove setup endpoint after initialization"
git push
\`\`\`

**Option 2 : Désactiver avec une variable d'environnement**

Modifiez `app/api/setup/route.ts` :
\`\`\`typescript
export async function POST(request: NextRequest) {
  // Désactiver en production après l'initialisation
  if (process.env.DISABLE_SETUP === 'true') {
    return NextResponse.json(
      { error: 'Setup endpoint is disabled' },
      { status: 403 }
    );
  }
  // ... reste du code
}
\`\`\`

Puis dans Vercel, ajoutez :
- **Name** : `DISABLE_SETUP`
- **Value** : `true`
- **Environments** : ✅ Production

---

## Workflow Complet

\`\`\`mermaid
graph TD
    A[Déployer sur Vercel] --> B[Configurer Variables d'Environnement]
    B --> C[Vérifier GET /api/setup]
    C --> D{Tables existent?}
    D -->|Non| E[POST /api/setup avec secretKey]
    D -->|Oui| F[Base prête!]
    E --> F
    F --> G[Tester /api/health]
    G --> H[Tester /auth/register]
    H --> I[Optionnel: Retirer /api/setup]
\`\`\`

---

## Comparaison des Méthodes

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **Endpoint /api/setup** | ✅ Automatique<br>✅ Sécurisé<br>✅ Vérifiable<br>✅ Peut être retiré | ⚠️ Nécessite une clé secrète |
| **Neon SQL Editor** | ✅ Simple<br>✅ Visuel<br>✅ Direct | ⚠️ Manuel<br>⚠️ Risque d'oubli |
| **pnpm db:push** | ✅ Local<br>✅ Drizzle natif | ❌ Ne fonctionne pas sur Vercel<br>❌ Nécessite accès réseau |

---

## Dépannage

### Erreur : "Invalid or missing secret key"

**Problème** : La clé secrète n'est pas correcte

**Solution** :
1. Vérifiez que `SETUP_SECRET_KEY` ou `ADMIN_SECRET_KEY` est définie sur Vercel
2. Utilisez la même valeur dans votre requête POST
3. Vérifiez qu'il n'y a pas d'espaces ou de caractères cachés

### Erreur : "DATABASE_URL environment variable is not set"

**Problème** : La variable DATABASE_URL n'est pas configurée

**Solution** :
1. Allez dans Vercel → Settings → Environment Variables
2. Ajoutez `DATABASE_URL` avec votre URL de connexion Neon
3. Redéployez

### Erreur : "Database connection error"

**Problème** : Impossible de se connecter à Neon

**Solution** :
1. Vérifiez que votre URL Neon est correcte
2. Assurez-vous que votre projet Neon est actif
3. Vérifiez que le paramètre `?sslmode=require` est présent

### Status "already_initialized" mais pas de tables

**Problème** : Rare, mais peut arriver si la création a échoué partiellement

**Solution** :
1. Connectez-vous à Neon SQL Editor
2. Supprimez les tables existantes :
   \`\`\`sql
   DROP TABLE IF EXISTS users CASCADE;
   DROP TABLE IF EXISTS companies CASCADE;
   DROP TYPE IF EXISTS role CASCADE;
   \`\`\`
3. Appelez `/api/setup` à nouveau

---

## Pour Aller Plus Loin

### Migrations Futures

Pour ajouter de nouvelles tables ou colonnes plus tard :

1. Créez un nouveau fichier de migration SQL
2. Exécutez-le dans Neon SQL Editor
3. Ou créez un endpoint `/api/migrate` similaire à `/api/setup`

### Script npm pour Setup

Vous pouvez créer un script npm pour simplifier :

**package.json :**
\`\`\`json
{
  "scripts": {
    "db:init": "node scripts/init-db.js"
  }
}
\`\`\`

**scripts/init-db.js :**
\`\`\`javascript
const VERCEL_URL = process.env.VERCEL_URL || 'http://localhost:3000';
const SECRET_KEY = process.env.SETUP_SECRET_KEY || 'change-this-in-production';

fetch(`${VERCEL_URL}/api/setup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: SECRET_KEY })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
\`\`\`

Puis :
\`\`\`bash
npm run db:init
\`\`\`

---

## Résumé des Commandes

\`\`\`bash
# 1. Vérifier le statut
curl https://votre-projet.vercel.app/api/setup

# 2. Initialiser la base
curl -X POST https://votre-projet.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "change-this-in-production"}'

# 3. Vérifier la santé
curl https://votre-projet.vercel.app/api/health

# 4. Tester l'inscription
curl -X POST https://votre-projet.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"John","lastName":"Doe","role":"admin"}'
\`\`\`

---

## Support

Si vous avez des problèmes :

1. Consultez `TROUBLESHOOTING.md`
2. Vérifiez les logs Vercel
3. Testez `/api/health`
4. Vérifiez les variables d'environnement

**Tout fonctionne ?** Vous pouvez maintenant retirer l'endpoint `/api/setup` pour plus de sécurité ! 🎉
