#!/usr/bin/env bash
# =============================================================================
# NeoSaaS - Full Database Reset
# Drops everything and rebuilds from db/setup/full-reset.sql
# Usage: bash scripts/deployment/reset-database.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$ROOT_DIR/db/setup/full-reset.sql"

# Load .env.local first, fallback to .env
if [ -f "$ROOT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env.local" | grep -E "DATABASE_URL" | xargs)
elif [ -f "$ROOT_DIR/.env" ]; then
  export $(grep -v '^#' "$ROOT_DIR/.env" | grep -E "DATABASE_URL" | xargs)
fi

DB_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

# Strip channel_binding (not supported by psql)
DB_URL=$(echo "$DB_URL" | sed \
  -e "s/&channel_binding=require//" \
  -e "s/channel_binding=require&//" \
  -e "s/?channel_binding=require//" \
  -e "s/'//g")

if [ -z "$DB_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not found in .env or .env.local"
  exit 1
fi

echo "=============================================="
echo "  NeoSaaS Full Database Reset"
echo "=============================================="
echo "  SQL file : $SQL_FILE"
echo "  Database : $(echo "$DB_URL" | sed 's|://.*@|://***@|')"
echo ""
echo "⚠️  WARNING: This will DROP all tables and recreate them."
read -p "  Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "▶ Running full reset..."
psql "$DB_URL" -f "$SQL_FILE"

echo ""
echo "✅ Database reset complete!"
echo "   All tables created, roles/permissions seeded."
echo ""
echo "📌 Next: re-run your app seeder if needed (admin user, etc.)"
