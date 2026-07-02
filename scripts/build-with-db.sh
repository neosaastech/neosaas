#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoSaaS - Build with Database Sync (Vercel)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Vercel builds CANNOT use TCP connections to Neon on non-standard ports
# (e.g., 48278) - they are blocked/unreachable (ETIMEDOUT).
#
# Strategy: HTTP-only via Neon HTTP API (HTTPS port 443, always works)
#   1. HTTP connectivity test
#   2. Safety net - ensure critical columns exist (HTTP)
#   3. Full HTTP schema sync - create missing tables/columns (HTTP)
#   4. Seed data (email templates, page permissions)
#
# Full schema sync with drizzle-kit push (TCP) is handled by GitHub Actions
# CI workflow (db-migrate.yml) which CAN reach Neon on any port.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Global: prefer IPv4 DNS resolution to avoid ENETUNREACH on IPv6
export NODE_OPTIONS="${NODE_OPTIONS:-} --dns-result-order=ipv4first"

echo "🔍 Vérification de l'environnement..."

# ─── Helper: retry with exponential backoff ───
retry_with_backoff() {
  local max_attempts=$1
  local base_wait=$2
  shift 2
  local attempt=1
  local wait_time=$base_wait

  while [ $attempt -le $max_attempts ]; do
    if [ $attempt -gt 1 ]; then
      echo "  📡 Tentative $attempt/$max_attempts..."
    fi
    if eval "$@"; then
      return 0
    fi
    if [ $attempt -lt $max_attempts ]; then
      echo "  ⏳ Échec, nouvelle tentative dans ${wait_time}s..."
      sleep $wait_time
      wait_time=$((wait_time * 2))
    fi
    attempt=$((attempt + 1))
  done

  return 1
}

# Vérifier si on est sur Vercel ou en CI
if [ -n "$VERCEL" ] || [ -n "$CI" ]; then
  echo "✅ Build CI/CD détecté (Env: ${VERCEL_ENV:-${CI_ENVIRONMENT:-unknown}})"

  if [ "${SKIP_DB_MIGRATIONS:-}" = "true" ] || [ "${SKIP_DB_MIGRATIONS:-}" = "1" ] || [ "${DB_MIGRATIONS_STRATEGY:-}" = "github-actions" ]; then
    echo "⏭️  Migrations DB ignorées (gérées par un runner externe)"
    echo ""
  else

  # Vérifier si DATABASE_URL est défini
  if [ -n "$DATABASE_URL" ]; then
    # ── Vérifier le rôle dans l'URL ──────────────────────────────────────────
    if echo "$DATABASE_URL" | grep -q "@authenticator\|//authenticator"; then
      echo "❌ DATABASE_URL utilise le rôle 'authenticator' qui n'a pas les droits CREATE/ALTER."
      echo "   Corrigez la variable dans Vercel pour utiliser 'neondb_owner'."
      echo "   URL attendue: postgresql://neondb_owner:PASSWORD@<your-neon-host>-pooler..."
      exit 1
    fi

    echo "✅ DATABASE_URL configuré (rôle OK)"

    # Prefer unpooled Neon URL for migrations if available
    MIGRATION_DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

    if [ -n "$DATABASE_URL_UNPOOLED" ]; then
      echo "✅ DATABASE_URL_UNPOOLED disponible (connexion directe pour migrations)"
    else
      echo "ℹ️  Utilisation de DATABASE_URL poolée pour les migrations"
    fi
    echo ""

    # ─── ÉTAPE 1: Test de connectivité via HTTP (port 443) ───
    echo "🔌 Étape 1/3 : Test de connectivité (HTTP, port 443)..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if DATABASE_URL="$MIGRATION_DATABASE_URL" npx tsx scripts/db-connectivity-test.ts; then
      echo "✅ Connexion HTTP à Neon OK"
      DB_REACHABLE=true
    else
      echo "⚠️  Test de connectivité échoué"
      DB_REACHABLE=false
    fi
    echo ""

    if [ "$DB_REACHABLE" = "true" ]; then

      # ─── ÉTAPE 2/3: SÉCURITÉ — Colonnes critiques (ALTER TABLE IF NOT EXISTS) ───
      echo "🛡️  Étape 2/3 : Vérification des colonnes critiques"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      # Garantit que les colonnes ajoutées après la création initiale des tables
      # sont bien présentes en base (ex : colonnes Stripe sur companies).
      # Nécessaire car migrate.ts skippe les CREATE TABLE "already exists"
      # et ne peut donc pas ajouter les nouvelles colonnes d'une table existante.
      if DATABASE_URL="$MIGRATION_DATABASE_URL" npx tsx scripts/db-ensure-columns.ts; then
        echo "✅ Colonnes critiques vérifiées"
      else
        echo "⚠️  db-ensure-columns échoué (non bloquant)"
      fi
      echo ""

      # ─── ÉTAPE 3/3: MIGRATIONS SQL (non-destructives, via Neon HTTP) ───
      echo "🔄 Étape 3/3 : Application des migrations SQL"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      if DATABASE_URL="$MIGRATION_DATABASE_URL" npx tsx scripts/migrate.ts; then
        echo "✅ Migrations appliquées"
      else
        echo ""
        echo "❌ Migration échouée — build annulé."
        echo "   💡 Vérifiez drizzle/meta/_journal.json et les fichiers .sql dans ./drizzle/"
        echo "   💡 Assurez-vous que DATABASE_URL utilise le rôle 'neondb_owner'"
        exit 1
      fi
      echo ""

      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ Schéma de base de données traité"
      echo ""

      # ─── SEEDING: Données de base (rôles, permissions, TVA, config) ───
      echo "🌱 Initialisation des données de base (rôles, TVA, config)..."
      if retry_with_backoff 2 3 "pnpm db:seed-base"; then
        echo "✅ Données de base initialisées"
      else
        echo "⚠️  Seeding données de base échoué (non bloquant)"
      fi
      echo ""

      # ─── SEEDING: Templates d'email ───
      echo "🌱 Initialisation des templates d'email..."
      if retry_with_backoff 2 3 "pnpm seed:email-templates"; then
        echo "✅ Templates d'email initialisés"
      else
        echo "⚠️  Seeding email templates échoué (non bloquant)"
      fi
      echo ""

      # Add delay to allow database connections to close properly
      echo "⏳ Attente de la fermeture des connexions..."
      sleep 3

      # ─── SEEDING: Permissions de pages ───
      echo "🔐 Initialisation des permissions de pages..."
      if retry_with_backoff 2 3 "pnpm seed:pages"; then
        echo "✅ Permissions de pages initialisées"
      else
        echo "⚠️  Synchronisation des pages échouée (non bloquant)"
      fi
      echo ""

      # Correction des configurations email pour les environnements de prévisualisation/dev
      if [ "$VERCEL_ENV" = "preview" ] || [ "$VERCEL_ENV" = "development" ]; then
          echo "🔧 Correction des configurations email (Preview/Dev)..."
          npx tsx scripts/fix-email-provider-defaults.ts
          echo "✅ Configurations email corrigées"
          echo ""

          # ─── SEEDING: Compte admin de test (Preview/Dev uniquement — jamais en prod) ───
          echo "🔐 Initialisation du compte admin de test (Preview/Dev)..."
          if retry_with_backoff 2 3 "pnpm seed:dev-admin"; then
            echo "✅ Compte admin de test prêt (admin@exemple.com / admin)"
          else
            echo "⚠️  Seeding admin de test échoué (non bloquant)"
          fi
          echo ""
      fi

    else
      echo "⚠️  Base de données non accessible - synchronisation ignorée"
      echo "   Le build continuera sans mise à jour du schéma"
      echo "   💡 Vérifiez DATABASE_URL dans Vercel"
      echo ""
    fi
  else
    if [ "$VERCEL_ENV" = "preview" ] || [ "$VERCEL_ENV" = "development" ]; then
      echo "ℹ️  DATABASE_URL non définie — migrations ignorées (env: ${VERCEL_ENV})"
    else
      echo "❌ DATABASE_URL manquante en production — migrations impossibles."
      echo "   Vercel Dashboard → Settings → Environment Variables → DATABASE_URL"
      exit 1
    fi
  fi
  fi
else
  echo "ℹ️  Build local détecté - synchronisation ignorée"
  echo "   Utilisez 'pnpm db:push' manuellement si nécessaire"
  echo ""
fi

echo "🏗️  Compilation de Next.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm exec next build
