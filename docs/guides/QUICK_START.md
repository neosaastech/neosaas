# 🚀 Quick Start - Initialisation en 3 Minutes

Ce guide vous permet de démarrer rapidement avec l'authentification NeoSaaS.

---

## Prérequis

✅ Projet déployé sur Vercel
✅ Base de données Neon active
✅ Variables d'environnement configurées sur Vercel

---

## Méthode 1 : Initialisation Automatique ⚡ (Recommandée)

### Étape 1 : Vérifier les Variables d'Environnement

Sur Vercel → Settings → Environment Variables, vérifiez que ces variables sont définies :

- ✅ `DATABASE_URL`
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL` (Production)
- ✅ `ADMIN_SECRET_KEY` (ou `SETUP_SECRET_KEY`)

### Étape 2 : Initialiser la Base de Données

**Option A : Via curl** (Terminal)
\`\`\`bash
curl -X POST https://votre-projet.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "change-this-in-production"}'
\`\`\`

**Option B : Via Browser** (Console F12)
\`\`\`javascript
fetch('/api/setup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'change-this-in-production' })
})
.then(r => r.json())
.then(console.log);
\`\`\`

### Étape 3 : Vérifier que Ça Fonctionne

\`\`\`bash
# Test 1 : Health check
curl https://votre-projet.vercel.app/api/health

# Test 2 : Inscription
curl -X POST https://votre-projet.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
\`\`\`

✅ **C'est tout !** Votre système d'authentification est prêt.

---

## Méthode 2 : Initialisation Manuelle

Si vous préférez créer les tables manuellement :

1. Allez sur [console.neon.tech](https://console.neon.tech/)
2. Ouvrez le **SQL Editor**
3. Copiez le contenu de `database-setup.sql`
4. Exécutez-le avec **Run** (Ctrl+Enter)

---

## Que Faire Après l'Initialisation ?

### 1. Tester l'Authentification

**Inscription :**
\`\`\`
https://votre-projet.vercel.app/auth/register
\`\`\`

**Connexion :**
\`\`\`
https://votre-projet.vercel.app/auth/login
\`\`\`

### 2. Créer un Admin SaaS

Connectez-vous, puis dans la console du navigateur :

\`\`\`javascript
fetch('/api/auth/make-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'change-this-in-production' })
})
.then(r => r.json())
.then(console.log);
\`\`\`

Ensuite, visitez : `/admin`

### 3. (Optionnel) Retirer l'Endpoint Setup

Pour plus de sécurité, après l'initialisation :

\`\`\`bash
rm app/api/setup/route.ts
git commit -m "Remove setup endpoint after initialization"
git push
\`\`\`

Ou ajoutez une variable d'environnement sur Vercel :
- **Name** : `DISABLE_SETUP`
- **Value** : `true`

---

## Vérifications

### ✅ Base de Données Initialisée

\`\`\`bash
curl https://votre-projet.vercel.app/api/health
\`\`\`

Réponse attendue :
\`\`\`json
{
  "status": "ok",
  "tables": { "exist": true }
}
\`\`\`

### ✅ Inscription Fonctionne

Allez sur `/auth/register` et créez un compte.

### ✅ Connexion Fonctionne

Allez sur `/auth/login` et connectez-vous.

---

## Dépannage Rapide

### Problème : "tables missing"

**Solution** : Appelez `/api/setup` avec votre clé secrète

### Problème : "Invalid secret key"

**Solution** : Vérifiez que `ADMIN_SECRET_KEY` ou `SETUP_SECRET_KEY` est définie sur Vercel

### Problème : "DATABASE_URL not set"

**Solution** : Ajoutez `DATABASE_URL` dans Vercel → Settings → Environment Variables

---

## Documentation Complète

- 📘 **[SETUP_AUTOMATED.md](SETUP_AUTOMATED.md)** - Guide détaillé de l'initialisation automatique
- 📘 **[AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)** - Configuration complète de l'authentification
- 📘 **[VERCEL_SETUP.md](VERCEL_SETUP.md)** - Configuration des variables d'environnement
- 📘 **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Guide de dépannage complet

---

## Architecture

\`\`\`
┌─────────────────┐
│  Vercel Deploy  │
└────────┬────────┘
         │
         ├─ Configure Env Vars (DATABASE_URL, NEXTAUTH_SECRET)
         │
         ├─ Call POST /api/setup
         │  └─ Creates tables automatically
         │
         ├─ Test GET /api/health
         │  └─ Verify tables exist
         │
         └─ Use /auth/register & /auth/login
            └─ Authentication ready! 🎉
\`\`\`

---

## Support

Besoin d'aide ? Consultez :
- `/api/health` - Status de la base de données
- `/api/setup` (GET) - Status de l'initialisation
- `TROUBLESHOOTING.md` - Guide de dépannage

---

**Temps estimé : 3 minutes** ⏱️
**Difficulté : Facile** 🟢
**Automatique : Oui** ✅
