#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoSaaS - Safe DB Migration (GitHub Actions / CI with TCP access)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Appelé par : .github/workflows/db-migrate.yml
# Contexte  : Le runner GitHub Actions peut atteindre Neon sur tous les ports
#             (TCP direct + HTTP).
#
# Pipeline en 4 étapes (cf. docs/MIGRATION_ARCHITECTURE.md) :
#
#   STEP 1 — SAFETY NET       : db-ensure-columns.ts
#     └→ CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
#     └→ Exécuté EN PREMIER pour éviter tout crash si les tables manquent
#
#   STEP 2 — SQL MIGRATIONS   : scripts/migrate.ts
#     └→ Applique les .sql en attente depuis drizzle/ (journal-based, idem Vercel)
#     └→ Met à jour __drizzle_migrations → évite que Vercel re-joue les mêmes
#
#   STEP 3 — SCHEMA PUSH      : drizzle-kit push (TCP only, GitHub Actions)
#     └→ Clôture les écarts résiduels entre db/schema.ts et la DB
#     └→ NON exécuté sur Vercel (port TCP bloqué)
#
#   STEP 4 — VERIFICATION     : db-verify-schema.ts
#     └→ Échoue le build si des colonnes/tables critiques sont absentes
#
# DIFFÉRENCE avec build-with-db.sh (Vercel, HTTP only) :
#   Vercel  : ensure-columns → migrate.ts  (pas de drizzle-kit push)
#   CI/GH   : ensure-columns → migrate.ts → drizzle-kit push → verify
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "❌ DATABASE_URL_UNPOOLED or DATABASE_URL must be set."
  exit 1
fi

export NODE_OPTIONS="${NODE_OPTIONS:-} --dns-result-order=ipv4first"

# ─── Debug: show which URL is used (password masked) ──────────────────────────
SAFE_URL=$(echo "$DB_URL" | sed 's|://[^:]*:[^@]*@|://***:***@|')
echo "🔗 DB URL: $SAFE_URL"

# ─── TCP connectivity test ────────────────────────────────────────────────────
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^/:?]+).*|\1|')
echo "🔌 Testing TCP to $DB_HOST:5432 ..."
if timeout 10 bash -c "echo > /dev/tcp/$DB_HOST/5432" 2>/dev/null; then
  echo "✅ TCP reachable"
else
  echo "⚠️  TCP not reachable from CI — drizzle-kit push may fail"
fi

echo "🔌 Testing DB connectivity (HTTP)..."
if npx tsx scripts/db-connectivity-test.ts; then
  echo "✅ HTTP connectivity OK"
else
  echo "⚠️  HTTP connectivity test failed, attempting TCP anyway..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛡️  Step 1/4 : Safety net (tables + colonnes)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pnpm db:ensure

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Step 2/4 : SQL migrations (journal-based)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Applique les .sql en attente ET met à jour __drizzle_migrations.
# INDISPENSABLE : sans cette étape, Vercel build tenterait de re-jouer
# toutes les migrations (car __drizzle_migrations resterait vide).
if pnpm db:migrate; then
  echo "✅ SQL migrations appliquées"
else
  echo "❌ SQL migration échouée — abandon"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Step 3/4 : drizzle-kit push (schema sync TCP)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FORCE="${FORCE_PUSH:-true}"
if [ "$FORCE" = "true" ] || [ "$FORCE" = "1" ]; then
  # En CI (pas de TTY), drizzle-kit push peut demander confirmation → pipe 'y'
  # Non-bloquant : si échec (DNS, SSL, conflit schéma) on log et on continue
  # Les mises à jour critiques sont déjà traitées par l'étape 1+2.
  if printf 'y\n' | pnpm db:push -- --verbose; then
    echo "✅ drizzle-kit push réussi"
  else
    echo "⚠️  drizzle-kit push échoué (non-bloquant — migrations déjà appliquées)"
    echo "   Vérifiez que DATABASE_URL utilise le rôle neondb_owner"
  fi
else
  echo "ℹ️  FORCE_PUSH=false — drizzle-kit push ignoré"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 4/4 : Vérification du schéma"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm db:verify; then
  echo "✅ Schéma vérifié"
else
  echo "❌ Vérification schéma échouée — colonnes/tables manquantes"
  echo "   Lancez : pnpm db:ensure"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Pipeline de migration terminé avec succès"
