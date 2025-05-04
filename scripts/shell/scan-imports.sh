#!/bin/bash

echo "🚀 Scan des imports cassés démarré..."

# Lister tous les imports @/components/ dans les fichiers .tsx
grep -r --include=\*.tsx 'from "@/components/' ./app ./components | while read -r line; do
  # Extraire le chemin importé
  imported_path=$(echo "$line" | sed -E 's/.*from "(.*?)".*/\1/')

  # Convertir l'import en chemin réel
  real_path="./$(echo "$imported_path" | sed 's|@/||').tsx"

  # Tester si le fichier existe
  if [ ! -f "$real_path" ]; then
    echo "❌ Problème trouvé: $imported_path (fichier attendu: $real_path)"
  fi
done

echo "✅ Scan terminé."
