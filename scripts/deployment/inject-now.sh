#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# inject-now.sh — Injection immédiate de DATABASE_URL dans Vercel
#
# À exécuter UNE SEULE FOIS depuis votre machine locale :
#   bash scripts/deployment/inject-now.sh [VERCEL_TOKEN]
#
# Si le token est expiré, créez-en un sur : https://vercel.com/account/tokens
#   Scope: Full Account | Expiration: 30 days
# ═══════════════════════════════════════════════════════════════════════════════
set -e

VERCEL_TOKEN="${1:-${VERCEL_TOKEN:-__VERCEL_TOKEN_REDACTED__}}"
TEAM_ID="__VERCEL_TEAM_ID_FROM_VAULT__"
PROJECT_NAME="neosaas-website"

# ─── Variables Neon ───────────────────────────────────────────────────────────
DB_POOLED="postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require"
DB_DIRECT="postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>/neondb?sslmode=require"
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Injection DATABASE_URL → Vercel (preview + development)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Vérifier le token ──────────────────────────────────────────────────────
echo "🔍 Vérification du token Vercel..."
user_resp=$(curl -s "https://api.vercel.com/v2/user" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

if ! echo "$user_resp" | jq -e '.user' >/dev/null 2>&1; then
  echo "❌ Token invalide ou expiré."
  echo "   Créez un nouveau token sur : https://vercel.com/account/tokens"
  echo "   Puis relancez : bash scripts/deployment/inject-now.sh NEW_TOKEN"
  exit 1
fi
username=$(echo "$user_resp" | jq -r '.user.username // .user.email')
echo "✅ Connecté en tant que : $username"
echo ""

# ── 2. Récupérer l'ID du projet ───────────────────────────────────────────────
echo "🔍 Récupération du projet '$PROJECT_NAME'..."
proj_resp=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN")
PROJECT_ID=$(echo "$proj_resp" | jq -r '.id // empty')

if [ -z "$PROJECT_ID" ]; then
  # Réessayer sans teamId
  proj_resp=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_NAME" \
    -H "Authorization: Bearer $VERCEL_TOKEN")
  PROJECT_ID=$(echo "$proj_resp" | jq -r '.id // empty')
fi

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Projet '$PROJECT_NAME' introuvable."
  exit 1
fi
echo "✅ Projet : $PROJECT_ID ($(echo "$proj_resp" | jq -r '.name'))"
echo ""

# ── Fonction upsert ───────────────────────────────────────────────────────────
upsert_env() {
  local key=$1
  local value=$2
  local targets='["preview","development"]'

  printf "   %-30s" "$key"

  # Essayer de créer
  resp=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$key\",\"value\":\"$value\",\"type\":\"encrypted\",\"target\":$targets}")

  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    echo "✅ créé"
    return 0
  fi

  err=$(echo "$body" | jq -r '.error.code // empty')
  if [ "$err" = "ENV_ALREADY_EXISTS" ]; then
    # Récupérer tous les IDs (une entrée par target)
    ids=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      | jq -r ".envs[] | select(.key==\"$key\") | .id")

    if [ -z "$ids" ]; then
      echo "⚠️  existe mais ID introuvable"
      return 1
    fi

    for id in $ids; do
      curl -s -X PATCH \
        "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"value\":\"$value\",\"target\":$targets}" >/dev/null
    done
    echo "✅ mis à jour"
    return 0
  fi

  echo "❌ erreur $code"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  return 1
}

# ── 3. Injecter les variables ─────────────────────────────────────────────────
echo "🔧 Injection des variables (preview + development) :"
upsert_env "DATABASE_URL"          "$DB_POOLED"
upsert_env "DATABASE_URL_UNPOOLED" "$DB_DIRECT"
echo ""

# ── 4. Vérification ──────────────────────────────────────────────────────────
echo "🔍 Vérification dans Vercel..."
env_list=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

for key in DATABASE_URL DATABASE_URL_UNPOOLED; do
  found=$(echo "$env_list" | jq -r ".envs[] | select(.key==\"$key\") | .target[]" | sort | tr '\n' ' ')
  if [ -n "$found" ]; then
    printf "   %-30s targets: %s\n" "$key" "$found"
  else
    echo "   ⚠️  $key non trouvé dans Vercel"
  fi
done
echo ""

# ── 5. Déclencher un redéploiement ───────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Variables injectées !"
echo ""
echo "⚠️  ÉTAPE OBLIGATOIRE : Redéployez maintenant (l'injection n'est pas rétroactive)"
echo ""

# Récupérer le dernier déploiement preview pour le branch courant
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "claude/stripe-payment-migration-e5Ojg")
echo "   Branch détectée : $BRANCH"
echo ""
last_deploy=$(curl -s "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$TEAM_ID&target=preview&limit=1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | jq -r '.deployments[0].uid // empty')

if [ -n "$last_deploy" ]; then
  echo "   Lancement du redéploiement ($last_deploy)..."
  redeploy_resp=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PROJECT_NAME\",\"deploymentId\":\"$last_deploy\",\"target\":\"preview\"}")
  redeploy_code=$(echo "$redeploy_resp" | tail -n1)
  if [ "$redeploy_code" = "200" ] || [ "$redeploy_code" = "201" ]; then
    echo "   ✅ Redéploiement lancé — suivez la progression sur Vercel Dashboard"
  else
    echo "   ⚠️  Redéploiement automatique échoué (code $redeploy_code)"
    echo "   👉 Lancez manuellement depuis Vercel Dashboard :"
    echo "      Deployments → le dernier deploy preview → '...' → Redeploy"
  fi
else
  echo "   👉 Lancez manuellement depuis Vercel Dashboard :"
  echo "      Deployments → le dernier deploy preview → '...' → Redeploy"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
