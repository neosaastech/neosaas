#!/bin/bash

# Configuration automatique des variables Vercel via API REST
# Team: team_CcA0AyPtSPVhRijEsDRmyjpa

set -e

echo "🚀 Configuration automatique de Vercel (Preview Environment)"
echo "============================================================="
echo ""

# Vérifier si le token est fourni
VERCEL_TOKEN=${1:-$VERCEL_TOKEN}

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Token Vercel requis !"
    echo ""
    echo "📝 Comment obtenir un token :"
    echo "   1. Allez sur https://vercel.com/account/tokens"
    echo "   2. Cliquez sur 'Create Token'"
    echo "   3. Nom: 'Setup Script' (ou autre)"
    echo "   4. Scope: Full Account"
    echo "   5. Expiration: 30 days"
    echo "   6. Copiez le token"
    echo ""
    echo "💻 Utilisation :"
    echo "   bash scripts/vercel-api-setup.sh YOUR_TOKEN"
    echo ""
    echo "   ou"
    echo ""
    echo "   export VERCEL_TOKEN='your_token'"
    echo "   bash scripts/vercel-api-setup.sh"
    exit 1
fi

TEAM_ID="team_CcA0AyPtSPVhRijEsDRmyjpa"
PROJECT_NAME="neosaas-website"

echo "🔍 Recherche du projet..."

# Obtenir l'ID du projet
PROJECT_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.id')

if [ "$PROJECT_ID" = "null" ] || [ -z "$PROJECT_ID" ]; then
    echo "❌ Projet non trouvé. Vérifiez le nom du projet."
    exit 1
fi

echo "✅ Projet trouvé: $PROJECT_ID"
echo ""

# Fonction pour ajouter une variable d'environnement
add_env_var() {
    local key=$1
    local value=$2
    local target=$3

    echo "📝 Ajout de $key pour $target..."

    response=$(curl -s -w "\n%{http_code}" -X POST \
      "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"key\": \"$key\",
        \"value\": \"$value\",
        \"type\": \"encrypted\",
        \"target\": [\"$target\"]
      }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "   ✅ $key configuré"
    else
        echo "   ⚠️  Réponse: $http_code"
        if echo "$body" | jq -e '.error.code' >/dev/null 2>&1; then
            error_code=$(echo "$body" | jq -r '.error.code')
            if [ "$error_code" = "ENV_ALREADY_EXISTS" ]; then
                echo "   ℹ️  Variable existe déjà, mise à jour..."
                # Tenter de mettre à jour
                update_env_var "$key" "$value" "$target"
            else
                echo "   ⚠️  Erreur: $error_code"
            fi
        fi
    fi
}

# Fonction pour mettre à jour une variable existante
update_env_var() {
    local key=$1
    local value=$2
    local target=$3

    # Obtenir l'ID de la variable
    env_id=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r ".envs[] | select(.key==\"$key\") | .id" | head -1)

    if [ -n "$env_id" ] && [ "$env_id" != "null" ]; then
        echo "   🔄 Mise à jour de $key..."
        curl -s -X PATCH \
          "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$env_id?teamId=$TEAM_ID" \
          -H "Authorization: Bearer $VERCEL_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{
            \"value\": \"$value\",
            \"target\": [\"$target\"]
          }" >/dev/null
        echo "   ✅ $key mis à jour"
    fi
}

echo "🔧 Configuration des variables d'environnement..."
echo ""

# DATABASE_URL
echo "1️⃣  DATABASE_URL"
add_env_var "DATABASE_URL" \
  "postgresql://neondb_owner:npg_cRzIrOmJwo38@ep-calm-lab-agkv7stu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require" \
  "preview"

# NEXTAUTH_SECRET
echo ""
echo "2️⃣  NEXTAUTH_SECRET"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "   Clé générée: ${NEXTAUTH_SECRET:0:20}..."
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "preview"

# ADMIN_SECRET_KEY
echo ""
echo "3️⃣  ADMIN_SECRET_KEY"
add_env_var "ADMIN_SECRET_KEY" "change-this-in-production" "preview"

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📌 Prochaines étapes :"
echo "   1. Attendez le redéploiement automatique (~2 min)"
echo "   2. Testez : https://neosaas-website-git-[branch]-[team].vercel.app/api/debug/env"
echo "   3. Initialisez : curl -X POST https://[url]/api/setup -H 'Content-Type: application/json' -d '{\"secretKey\":\"change-this-in-production\"}'"
echo "   4. Testez l'inscription : https://[url]/auth/register"
echo ""
