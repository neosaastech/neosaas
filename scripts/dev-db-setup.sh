#!/usr/bin/env bash
# Démarre Postgres local (Docker), applique le schéma Drizzle et seed minimal pour Puck.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCAL_URL="postgresql://neosaas:neosaas@localhost:5433/neosaas_dev"

echo "🐘 Démarrage Postgres local (port 5433)..."
docker compose -f docker-compose.dev.yml up -d

echo "⏳ Attente santé Postgres..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U neosaas -d neosaas_dev >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export DATABASE_URL="$LOCAL_URL"
export DATABASE_URL_UNPOOLED="$LOCAL_URL"
export NEOSAAS_OFFLINE_DEV=false

echo "📦 Migration schéma (drizzle push)..."
pnpm db:push

echo "🌱 Seed base + admin (drizzle/pg — compatible Postgres local)..."
pnpm db:seed

echo "📄 Seed page_layers homepage (/, fr + en)..."
pnpm seed:page-layers

echo ""
echo "✅ Base locale prête."
echo "   DATABASE_URL=$LOCAL_URL"
echo "   NEOSAAS_OFFLINE_DEV=false"
echo "   Login admin : admin@exemple.com / admin"
echo "   Builder Puck : http://localhost:3000/admin/pilotage/builder"
