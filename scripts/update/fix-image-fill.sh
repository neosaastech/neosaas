#!/bin/bash

# Dossier cible, ici ton app
TARGET_DIR="./app"

# Cherche tous les fichiers .tsx et ajoute 'relative' aux div parents des Image fill
find "$TARGET_DIR" -type f -name "*.tsx" | while read -r file; do
  echo "🔍 Vérification de $file"
  
  # Ajoute la classe 'relative' sur les div qui contiennent un <Image fill
  sed -i.bak -E '/<div[^>]*>/{
    N
    /<Image[^>]*fill[^>]*>/{
      s/className="([^"]*)"/className="relative \1"/
      s/<div>/<div className="relative"/
    }
  }' "$file"
  
  echo "✅ Fichier corrigé : $file"
done

echo "🚀 Correction terminée."
