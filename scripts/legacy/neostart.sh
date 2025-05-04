#!/bin/bash

echo ""
echo "🚀 Lancement NeoSaaS en cours..."
echo ""

pnpm docker:up
if [ $? -ne 0 ]; then
  echo "❌ Erreur au lancement de Docker."
  exit 1
fi

pnpm db:push
if [ $? -ne 0 ]; then
  echo "❌ Erreur lors du push de la base de données."
  exit 1
fi

pnpm dev
if [ $? -ne 0 ]; then
  echo "❌ Erreur lors du démarrage du serveur Next.js."
  exit 1
fi
