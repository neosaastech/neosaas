#!/bin/bash
set -e

# ============================================
# Configuration Vercel Preview - À exécuter localement
# ============================================

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
TEAM_ID="${TEAM_ID:-}"
PROJECT_NAME="neosaas-website"

DATABASE_URL="${DATABASE_URL:-}"
DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-}"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN manquant."
  echo "   Chargez-le depuis votre vault/secret manager puis relancez le script."
  exit 1
fi

if [ -z "$TEAM_ID" ]; then
  echo "❌ TEAM_ID manquant."
  echo "   Chargez-le depuis votre vault/secret manager avant execution."
  exit 1
fi

if [ -z "$DATABASE_URL" ] || [ -z "$DATABASE_URL_UNPOOLED" ]; then
  echo "❌ DATABASE_URL / DATABASE_URL_UNPOOLED manquantes."
  echo "   Chargez ces secrets depuis votre vault/secret manager avant execution."
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Configuration Vercel Preview Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test du token
echo "🔍 Vérification du token..."
user_response=$(curl -s "https://api.vercel.com/v2/user" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

if echo "$user_response" | jq -e '.user' >/dev/null 2>&1; then
    username=$(echo "$user_response" | jq -r '.user.username // .user.email')
    echo "✅ Token valide - Connecté en tant que: $username"
else
    echo "❌ Token invalide ou expiré"
    echo "$user_response"
    echo ""
    echo "📝 Créez un nouveau token sur: https://vercel.com/account/tokens"
    echo "   Scope: Full Account | Expiration: 30 days"
    exit 1
fi

echo ""
echo "🔍 Récupération du projet '$PROJECT_NAME'..."

# Essayer avec le team ID
project_response=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

PROJECT_ID=$(echo "$project_response" | jq -r '.id // empty')

# Si pas trouvé, essayer sans team ID
if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  Tentative sans teamId..."
    project_response=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME" \
      -H "Authorization: Bearer $VERCEL_TOKEN")
    PROJECT_ID=$(echo "$project_response" | jq -r '.id // empty')
fi

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Projet introuvable"
    echo "$project_response" | jq '.'
    exit 1
fi

echo "✅ Projet trouvé: $PROJECT_ID"
echo "   Nom: $(echo "$project_response" | jq -r '.name')"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Configuration des variables d'environnement"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Fonction pour ajouter/mettre à jour une variable sur preview + development
# Usage: add_env_var KEY VALUE
add_env_var() {
    local key=$1
    local value=$2
    # Cibles : preview ET development (les deux branches qui lancent des builds hors production)
    local targets='["preview","development"]'

    echo "📝 Configuration de $key (preview + development)..."

    response=$(curl -s -w "\n%{http_code}" -X POST \
      "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"key\": \"$key\",
        \"value\": \"$value\",
        \"type\": \"encrypted\",
        \"target\": $targets
      }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "   ✅ $key configuré avec succès"
        return 0
    fi

    # Variable déjà existante → récupérer tous les IDs (une par target) et patcher chacun
    error_code=$(echo "$body" | jq -r '.error.code // empty')
    if [ "$error_code" = "ENV_ALREADY_EXISTS" ]; then
        echo "   ℹ️  $key existe déjà — mise à jour de chaque target..."

        # L'API retourne un id par target : on met à jour chaque entrée séparément
        env_ids=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
          -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r ".envs[] | select(.key==\"$key\") | .id")

        if [ -z "$env_ids" ]; then
            echo "   ⚠️  Impossible de trouver l'ID de $key"
            return 1
        fi

        for env_id in $env_ids; do
            curl -s -X PATCH \
              "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$env_id?teamId=$TEAM_ID" \
              -H "Authorization: Bearer $VERCEL_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{\"value\": \"$value\", \"target\": $targets}" >/dev/null
        done
        echo "   ✅ $key mis à jour"
        return 0
    fi

    echo "   ⚠️  Erreur HTTP: $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
}

# 1. DATABASE_URL  (pooler — pour l'app Next.js en serverless)
echo "1️⃣  DATABASE_URL (pooler)"
add_env_var "DATABASE_URL" "$DATABASE_URL"
echo ""

# 2. DATABASE_URL_UNPOOLED  (connexion directe — pour drizzle-kit et les migrations)
echo "2️⃣  DATABASE_URL_UNPOOLED (direct, pour migrations)"
add_env_var "DATABASE_URL_UNPOOLED" "$DATABASE_URL_UNPOOLED"
echo ""

# 4. NEXTAUTH_SECRET
echo "4️⃣  NEXTAUTH_SECRET"
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "   Clé générée: ${NEXTAUTH_SECRET:0:20}..."
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
echo ""

# 5. ADMIN_SECRET_KEY
echo "5️⃣  ADMIN_SECRET_KEY"
add_env_var "ADMIN_SECRET_KEY" "change-this-in-production"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration terminée avec succès !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT : L'injection de variables via API n'est PAS rétroactive."
echo "   Un redéploiement manuel est OBLIGATOIRE pour que les variables soient visibles."
echo ""
echo "📌 Prochaines étapes :"
echo ""
echo "1️⃣  Redéployez MAINTENANT (obligatoire — les variables ne prennent effet qu'au prochain build) :"
echo "   vercel redeploy --target preview"
echo "   — ou —"
echo "   Vercel Dashboard → Deployments → '...' → Redeploy"
echo ""
echo "2️⃣  Trouvez votre URL Preview :"
echo "   - GitHub: Pull Request → Checks → Vercel → Details"
echo "   - Format: neosaas-website-git-[branch]-[team].vercel.app"
echo ""
echo "3️⃣  Vérifiez les variables :"
echo "   curl https://[preview-url]/api/debug/env"
echo ""
echo "4️⃣  Initialisez la base de données :"
echo "   curl -X POST https://[preview-url]/api/setup \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"secretKey\":\"change-this-in-production\"}'"
echo ""
echo "5️⃣  Testez l'inscription :"
echo "   Ouvrez: https://[preview-url]/auth/register"
echo ""
