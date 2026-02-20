# ⚡ Configuration Immédiate Vercel (Preview)

## 🎯 Configuration en 3 Minutes

### Étape 1 : Obtenir un Token Vercel (1 minute)

1. **Allez sur** https://vercel.com/account/tokens
2. **Cliquez** sur **"Create Token"**
3. **Remplissez** :
   - Name: `Setup Script` (ou ce que vous voulez)
   - Scope: **Full Account**
   - Expiration: **30 days**
4. **Copiez** le token (il commence par `vercel_...`)

### Étape 2 : Exécuter le Script (30 secondes)

\`\`\`bash
# Sur votre machine locale
cd /path/to/neosaas-website
bash scripts/vercel-api-setup.sh YOUR_VERCEL_TOKEN
\`\`\`

**C'est tout !** Le script configure automatiquement toutes les variables pour l'environnement Preview.

---

## 🔧 Alternative : Commandes Curl Directes

Si vous préférez le contrôle total, utilisez ces commandes :

### Prérequis

\`\`\`bash
export VERCEL_TOKEN="votre_token_ici"
export TEAM_ID="__VERCEL_TEAM_ID_FROM_VAULT__"
export PROJECT_NAME="neosaas-website"
\`\`\`

### 1. Obtenir l'ID du Projet

\`\`\`bash
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.id')

echo "Project ID: $PROJECT_ID"
\`\`\`

### 2. Ajouter DATABASE_URL

\`\`\`bash
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "DATABASE_URL",
    "value": "postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require",
    "type": "encrypted",
    "target": ["preview"]
  }'
\`\`\`

### 3. Ajouter NEXTAUTH_SECRET

\`\`\`bash
# Générer une clé secrète
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Clé générée: $NEXTAUTH_SECRET"

curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"NEXTAUTH_SECRET\",
    \"value\": \"$NEXTAUTH_SECRET\",
    \"type\": \"encrypted\",
    \"target\": [\"preview\"]
  }"
\`\`\`

### 4. Ajouter ADMIN_SECRET_KEY

\`\`\`bash
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ADMIN_SECRET_KEY",
    "value": "change-this-in-production",
    "type": "encrypted",
    "target": ["preview"]
  }'
\`\`\`

### 5. Vérifier les Variables

\`\`\`bash
curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq '.envs[] | {key: .key, target: .target}'
\`\`\`

---

## 📋 Script Complet Copier-Coller

Remplacez `YOUR_TOKEN_HERE` et exécutez :

\`\`\`bash
#!/bin/bash

# Configuration
export VERCEL_TOKEN="YOUR_TOKEN_HERE"
export TEAM_ID="__VERCEL_TEAM_ID_FROM_VAULT__"
export PROJECT_NAME="neosaas-website"

# Obtenir l'ID du projet
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.id')

echo "Project ID: $PROJECT_ID"

# Générer NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Ajouter DATABASE_URL
echo "Adding DATABASE_URL..."
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "DATABASE_URL",
    "value": "postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require",
    "type": "encrypted",
    "target": ["preview"]
  }'

# Ajouter NEXTAUTH_SECRET
echo "Adding NEXTAUTH_SECRET..."
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"NEXTAUTH_SECRET\",
    \"value\": \"$NEXTAUTH_SECRET\",
    \"type\": \"encrypted\",
    \"target\": [\"preview\"]
  }"

# Ajouter ADMIN_SECRET_KEY
echo "Adding ADMIN_SECRET_KEY..."
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ADMIN_SECRET_KEY",
    "value": "change-this-in-production",
    "type": "encrypted",
    "target": ["preview"]
  }'

echo "✅ Done! Variables configured for Preview environment."
echo "🔄 Vercel will auto-redeploy. Check in ~2 minutes."
\`\`\`

---

## 🧪 Vérification Immédiate

Après configuration (attendez le redéploiement ~2 min) :

### 1. Vérifier les Variables

\`\`\`bash
curl https://neosaas-website-git-claude-verify-login-drizzle-[...].vercel.app/api/debug/env
\`\`\`

**Réponse attendue :**
\`\`\`json
{
  "variables": {
    "DATABASE_URL": { "status": "✅ CONFIGURED" },
    "NEXTAUTH_SECRET": { "status": "✅ CONFIGURED" },
    "ADMIN_SECRET_KEY": { "status": "✅ CONFIGURED" }
  }
}
\`\`\`

### 2. Initialiser la Base

\`\`\`bash
curl -X POST https://[votre-url-preview].vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "change-this-in-production"}'
\`\`\`

### 3. Tester l'Inscription

\`\`\`bash
curl -X POST https://[votre-url-preview].vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "Test",
    "role": "admin"
  }'
\`\`\`

---

## 🔍 Trouver l'URL Preview

L'URL Preview de votre branche est visible dans :

1. **GitHub** : Pull Request → Checks → Vercel → Details
2. **Vercel Dashboard** : Deployments → Cliquez sur le déploiement Preview
3. **Format** : `https://neosaas-website-git-[branch-name]-[team-slug].vercel.app`

---

## 📊 Gestion des Variables

### Lister Toutes les Variables

\`\`\`bash
curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq '.'
\`\`\`

### Supprimer une Variable

\`\`\`bash
# Obtenir l'ID de la variable
ENV_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.envs[] | select(.key=="DATABASE_URL") | .id' | head -1)

# Supprimer
curl -X DELETE "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"
\`\`\`

### Mettre à Jour une Variable

\`\`\`bash
# Obtenir l'ID
ENV_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.envs[] | select(.key=="DATABASE_URL") | .id' | head -1)

# Mettre à jour
curl -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "nouvelle_valeur"
  }'
\`\`\`

---

## ⚙️ Pour Production et Development

Pour ajouter les variables à Production et Development aussi :

\`\`\`bash
# Remplacez "preview" par ["preview", "production", "development"]
"target": ["preview", "production", "development"]
\`\`\`

---

## 🔐 Sécurité du Token

**⚠️ Important :**
- Ne commitez JAMAIS votre token Vercel
- Ne le partagez avec personne
- Révoquez-le après utilisation (https://vercel.com/account/tokens)
- Utilisez des tokens avec expiration courte

**Révocation :**
1. https://vercel.com/account/tokens
2. Cliquez sur les `...` du token
3. Cliquez sur "Delete"

---

## 🚀 Workflow Complet

\`\`\`bash
# 1. Obtenir token sur https://vercel.com/account/tokens
# 2. Exécuter le script
bash scripts/vercel-api-setup.sh YOUR_TOKEN

# 3. Attendre le redéploiement (~2 min)
# 4. Vérifier
curl https://[preview-url]/api/debug/env

# 5. Initialiser la base
curl -X POST https://[preview-url]/api/setup \
  -H "Content-Type: application/json" \
  -d '{"secretKey": "change-this-in-production"}'

# 6. Tester
curl -X POST https://[preview-url]/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"Test","lastName":"User","role":"admin"}'

# 7. Révoquer le token
# Aller sur https://vercel.com/account/tokens
\`\`\`

---

## 📞 Support API Vercel

Documentation complète : https://vercel.com/docs/rest-api

**Endpoints Utilisés :**
- `GET /v9/projects/:id` - Info du projet
- `GET /v9/projects/:id/env` - Liste des variables
- `POST /v10/projects/:id/env` - Ajouter une variable
- `PATCH /v9/projects/:id/env/:envId` - Modifier une variable
- `DELETE /v9/projects/:id/env/:envId` - Supprimer une variable

---

**Temps total : ~3 minutes** ⏱️

**Avantages :**
- ✅ Configuration immédiate
- ✅ Pas besoin de l'interface web
- ✅ Scriptable et reproductible
- ✅ Fonctionne sur Preview uniquement
- ✅ Sécurisé avec token temporaire
