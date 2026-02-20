#!/bin/bash

# Script de test du flux complet d'enregistrement de clé API
# Usage: bash scripts/test-api-flow.sh

echo "🧪 Test du flux complet d'enregistrement de clé API"
echo "=================================================="
echo ""

# 1. Démarrer le serveur en arrière-plan
echo "📡 Démarrage du serveur Next.js..."
npm run dev &
SERVER_PID=$!
sleep 5

# Attendre que le serveur soit prêt
until curl -s http://localhost:3000 > /dev/null; do
  echo "⏳ Attente du serveur..."
  sleep 2
done

echo "✅ Serveur prêt !"
echo ""

# 2. Tester l'endpoint de vérification (sans auth)
echo "🔍 Test 1: Endpoint de santé"
curl -s http://localhost:3000/api/health | jq . || echo "❌ Erreur: endpoint /api/health"
echo ""

# 3. Tester l'enregistrement d'une clé (nécessite auth)
echo "🔐 Test 2: Enregistrement de clé Scaleway (nécessite authentification)"
echo "Note: Ce test échouera avec 401 si non authentifié (comportement attendu)"

RESPONSE=$(curl -s -X POST http://localhost:3000/api/services/scaleway \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "storage",
    "environment": "production",
    "isActive": true,
    "isDefault": true,
    "config": {
      "accessKey": "SCWTEST123",
      "secretKey": "test-secret-key-456"
    }
  }')

echo "Réponse:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "Unauthorized"; then
  echo "✅ Authentification requise fonctionne correctement (401 reçu)"
else
  echo "⚠️  Réponse inattendue (vérifier si vous êtes authentifié)"
fi

echo ""
echo "🧹 Arrêt du serveur..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "✅ Tests terminés !"
echo ""
echo "Pour tester avec authentification:"
echo "1. Lancez: npm run dev"
echo "2. Connectez-vous sur http://localhost:3000/auth/login"
echo "3. Testez sur http://localhost:3000/admin/api"
