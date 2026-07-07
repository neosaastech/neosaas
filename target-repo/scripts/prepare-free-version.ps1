# Script pour préparer la version gratuite de NeoSaaS
# Ce script supprime les modules non essentiels (ecommerce, calendrier, chat)
# et ne garde que: Auth, Users, Lago, Emails transactionnels, et UI

Write-Host "🚀 Préparation de la version gratuite NeoSaaS..." -ForegroundColor Cyan

# 1. Supprimer les dossiers E-Commerce
Write-Host "`n📦 Suppression des composants E-Commerce..." -ForegroundColor Yellow

Remove-Item -Path "components/checkout" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/dashboard/checkout" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/dashboard/checkout-lago" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/dashboard/cart" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/products" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/orders" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/coupons" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/vat-rates" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/test-checkout" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Supprimer les actions E-Commerce
Write-Host "🗑️  Suppression des actions E-Commerce..." -ForegroundColor Yellow
Remove-Item -Path "app/actions/ecommerce.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/actions/coupons.ts" -Force -ErrorAction SilentlyContinue

# 3. Supprimer les composants Calendrier/Appointments
Write-Host "`n📅 Suppression des composants Calendrier/Appointments..." -ForegroundColor Yellow
Remove-Item -Path "app/(private)/dashboard/calendar" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/dashboard/appointments" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/appointments" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/actions/appointments.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "lib/calendar" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "lib/notifications/appointment-notifications.ts" -Force -ErrorAction SilentlyContinue

# 4. Supprimer les composants Chat
Write-Host "`n💬 Suppression des composants Chat..." -ForegroundColor Yellow
Remove-Item -Path "components/chat" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/dashboard/chat" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/(private)/admin/chat" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "app/api/chat" -Recurse -Force -ErrorAction SilentlyContinue

# 5. Supprimer la documentation complète
Write-Host "`n📚 Suppression de la documentation..." -ForegroundColor Yellow
Remove-Item -Path "docs" -Recurse -Force -ErrorAction SilentlyContinue

# 6. Supprimer les scripts de test spécifiques
Write-Host "`n🧪 Suppression des scripts de test E-Commerce..." -ForegroundColor Yellow
Remove-Item -Path "scripts/test-checkout-flow.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "check-admin-debug.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "check-templates-debug.ts" -Force -ErrorAction SilentlyContinue

# 7. Nettoyer contexts non utilisés
Write-Host "`n🔧 Nettoyage des contexts..." -ForegroundColor Yellow
Remove-Item -Path "contexts/cart-context.tsx" -Force -ErrorAction SilentlyContinue

# 8. Supprimer les fichiers Cypress (tests)
Write-Host "`n🧹 Suppression des tests Cypress..." -ForegroundColor Yellow
Remove-Item -Path "cypress" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "cypress.config.ts" -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host "`n⚠️  PROCHAINES ÉTAPES MANUELLES:" -ForegroundColor Magenta
Write-Host "1. Nettoyer db/schema.ts (supprimer tables: products, orders, carts, appointments, chat, llm)"
Write-Host "2. Créer un simple formulaire de contact pour remplacer le chat"
Write-Host "3. Vérifier et nettoyer le fichier .env"
Write-Host "4. Créer un nouveau README.md minimal"
Write-Host "5. Vérifier package.json et supprimer les dépendances inutiles"
Write-Host "6. Tester la compilation: pnpm build"
