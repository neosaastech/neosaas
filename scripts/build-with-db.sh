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
#   2. Full DB rebuild — drop all tables, re-apply migrations, seed core data
#   3. Seed reference data (VAT, platform config, email templates, page permissions)
#   4. ALWAYS ensure bootstrap super_admin (even when migrations are external)
#
# At this stage every Vercel/CI build runs `pnpm db:hard-reset` (destructive)
# unless DB_MIGRATIONS_STRATEGY=github-actions or SKIP_DB_MIGRATIONS is set.
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

# ─── Helper: ensure bootstrap super_admin (always runs when DATABASE_URL set) ───
ensure_bootstrap_super_admin() {
  echo "🔐 Vérification du compte bootstrap super_admin..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if ! DATABASE_URL="$MIGRATION_DATABASE_URL" npx tsx scripts/db-connectivity-test.ts; then
    echo "❌ Base de données inaccessible — impossible de vérifier le compte bootstrap."
    if [ "$VERCEL_ENV" = "production" ]; then
      exit 1
    fi
    echo "⚠️  Build preview/dev continue sans vérification bootstrap."
    return 1
  fi

  export DATABASE_URL="$MIGRATION_DATABASE_URL"

  echo "🌱 Vérification des rôles de base (idempotent)..."
  if ! retry_with_backoff 2 3 "pnpm db:seed-base"; then
    echo "❌ Impossible d'initialiser les rôles — build annulé."
    exit 1
  fi

  if ! npx tsx scripts/ensure-bootstrap-super-admin.ts; then
    echo "❌ Le compte bootstrap n'a pas le rôle super_admin — build annulé."
    exit 1
  fi

  echo "✅ Compte bootstrap super_admin vérifié (admin@exemple.com / admin)"
  echo ""
}

# Vérifier si on est sur Vercel ou en CI
if [ -n "$VERCEL" ] || [ -n "$CI" ]; then
  echo "✅ Build CI/CD détecté (Env: ${VERCEL_ENV:-${CI_ENVIRONMENT:-unknown}})"

  SKIP_MIGRATIONS=false
  if [ "${SKIP_DB_MIGRATIONS:-}" = "true" ] || [ "${SKIP_DB_MIGRATIONS:-}" = "1" ] || [ "${DB_MIGRATIONS_STRATEGY:-}" = "github-actions" ]; then
    SKIP_MIGRATIONS=true
    echo "⏭️  Migrations DB gérées par un runner externe (hard-reset ignoré)"
    echo ""
  fi

  if [ -n "$DATABASE_URL" ]; then
  # ── Vérifier le rôle dans l'URL ──────────────────────────────────────────
  if echo "$DATABASE_URL" | grep -q "@authenticator\|//authenticator"; then
    echo "❌ DATABASE_URL utilise le rôle 'authenticator' qui n'a pas les droits CREATE/ALTER."
    echo "   Corrigez la variable dans Vercel pour utiliser 'neondb_owner'."
    exit 1
  fi

  echo "✅ DATABASE_URL configuré (rôle OK)"

  MIGRATION_DATABASE_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

  if [ -n "$DATABASE_URL_UNPOOLED" ]; then
    echo "✅ DATABASE_URL_UNPOOLED disponible (connexion directe pour migrations)"
  else
    echo "ℹ️  Utilisation de DATABASE_URL poolée pour les migrations"
  fi
  echo ""

  if [ "$SKIP_MIGRATIONS" = "false" ]; then
    # ─── ÉTAPE 1: Test de connectivité via HTTP (port 443) ───
    echo "🔌 Étape 1/4 : Test de connectivité (HTTP, port 443)..."
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
      export DATABASE_URL="$MIGRATION_DATABASE_URL"

      # ─── ÉTAPE 2/4: RECONSTRUCTION COMPLÈTE (destructive) ───
      echo "🔄 Étape 2/4 : Reconstruction complète de la base de données"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "⚠️  Mode destructif : toutes les tables seront supprimées puis recréées"
      if pnpm db:hard-reset; then
        echo "✅ Base de données reconstruite (reset + migrations + seed)"
      else
        echo ""
        echo "❌ Reconstruction de la base échouée — build annulé."
        exit 1
      fi
      echo ""

      # ─── ÉTAPE 3/4: SEEDING — Données de référence ───
      echo "🌱 Étape 3/4 : Initialisation des données de référence (rôles, TVA, config)..."
      if retry_with_backoff 2 3 "pnpm db:seed-base"; then
        echo "✅ Données de base initialisées"
      else
        echo "⚠️  Seeding données de base échoué (non bloquant)"
      fi
      echo ""

      # ─── ÉTAPE 4/4: SEEDING — Templates email & permissions de pages ───
      echo "🌱 Étape 4/4 : Templates d'email et permissions de pages..."
      if retry_with_backoff 2 3 "pnpm seed:email-templates"; then
        echo "✅ Templates d'email initialisés"
      else
        echo "⚠️  Seeding email templates échoué (non bloquant)"
      fi
      echo ""

      echo "⏳ Attente de la fermeture des connexions..."
      sleep 3

      echo "🔐 Initialisation des permissions de pages..."
      if retry_with_backoff 2 3 "pnpm seed:pages"; then
        echo "✅ Permissions de pages initialisées"
      else
        echo "⚠️  Synchronisation des pages échouée (non bloquant)"
      fi
      echo ""
    else
      echo "❌ Base de données non accessible — build annulé en production."
      if [ "$VERCEL_ENV" = "production" ]; then
        exit 1
      fi
      echo "⚠️  Build preview/dev continue sans hard-reset."
      echo ""
    fi
  fi

  # ALWAYS ensure bootstrap admin — even when migrations are external/skipped
  ensure_bootstrap_super_admin

  if [ "$VERCEL_ENV" = "preview" ] || [ "$VERCEL_ENV" = "development" ]; then
    echo "🔧 Correction des configurations email (Preview/Dev)..."
    npx tsx scripts/fix-email-provider-defaults.ts
    echo "✅ Configurations email corrigées"
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
else
  echo "ℹ️  Build local détecté - synchronisation ignorée"
  echo "   Utilisez 'pnpm db:push' manuellement si nécessaire"
  echo ""
fi

echo "🏗️  Compilation de Next.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm exec next build
