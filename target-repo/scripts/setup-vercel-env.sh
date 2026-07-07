#!/bin/bash

# Script to configure Vercel environment variables
# Run this script from your local machine where you're logged into Vercel CLI

echo "🚀 Configuration des variables d'environnement Vercel"
echo "======================================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé."
    echo "📦 Installation..."
    npm install -g vercel
fi

# Check if user is logged in
echo "🔐 Vérification de l'authentification..."
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Vous n'êtes pas connecté à Vercel."
    echo "🔑 Connexion en cours..."
    vercel login
fi

echo ""
echo "📋 Configuration des variables d'environnement..."
echo ""

# DATABASE_URL
echo "1️⃣  Configuration de DATABASE_URL..."
echo "postgresql://neondb_owner:npg_cRzIrOmJwo38@ep-calm-lab-agkv7stu-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require" | \
  vercel env add DATABASE_URL production preview development

# NEXTAUTH_SECRET
echo ""
echo "2️⃣  Configuration de NEXTAUTH_SECRET..."
SECRET=$(openssl rand -base64 32)
echo "   Clé générée: $SECRET"
echo "$SECRET" | vercel env add NEXTAUTH_SECRET production preview development

# NEXTAUTH_URL (Production only)
echo ""
echo "3️⃣  Configuration de NEXTAUTH_URL..."
echo "⚠️  Entrez votre URL Vercel (ex: https://neosaas-website.vercel.app)"
read -p "   URL: " NEXTAUTH_URL
echo "$NEXTAUTH_URL" | vercel env add NEXTAUTH_URL production

# ADMIN_SECRET_KEY
echo ""
echo "4️⃣  Configuration de ADMIN_SECRET_KEY..."
echo "change-this-in-production" | vercel env add ADMIN_SECRET_KEY production preview development

echo ""
echo "✅ Variables d'environnement configurées !"
echo ""
echo "📌 Prochaines étapes:"
echo "   1. Vérifiez les variables: vercel env ls"
echo "   2. Redéployez: vercel --prod"
echo "   3. Testez: https://votre-projet.vercel.app/api/debug/env"
echo ""
