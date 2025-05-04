#!/bin/bash

echo "🚀 Correction automatique de 'use client' dans les fichiers concernés..."

FILES=(
"./components/ui/carousel/carousel.tsx"
"./components/ui/navigation/sidebar.tsx"
"./components/ui/popup/PopupProvider.tsx"
"./components/ui/layout/calendar.tsx"
"./components/ui/feedback/toasts/use-toast.ts"
"./components/ui/utility/use-mobile.tsx"
"./components/common/demo-sidebar.tsx"
"./components/common/main-nav.tsx"
"./components/common/demo-mobile-nav.tsx"
"./components/common/main-mobile-nav.tsx"
"./components/common/main-sidebar.tsx"
"./components/common/site-header.tsx"
"./components/docs/sidebar.tsx"
"./components/docs/mobile-nav.tsx"
"./components/dashboard/sidebar.tsx"
"./app/auth/register/page.tsx"
"./app/auth/verify/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    if ! grep -q '"use client"' "$file"; then
      echo "➕ Ajout de 'use client' dans : $file"
      sed -i '1s/^/"use client"\n\n/' "$file"
    else
      echo "✅ Déjà présent dans : $file"
    fi
  else
    echo "❌ Fichier introuvable : $file"
  fi
done

echo "🎯 Correction terminée."
