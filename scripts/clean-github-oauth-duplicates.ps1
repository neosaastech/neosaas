# Script de nettoyage des doublons - GitHub OAuth

Write-Host "🧹 Nettoyage des fichiers en double..." -ForegroundColor Yellow

$baseDir = "app/api/admin/configure-github-oauth"

# Fichiers à supprimer
$filesToDelete = @(
    "$baseDir/route-new.ts",
    "$baseDir/route-fixed.ts",
    "$baseDir/route.ts.backup"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Write-Host "  🗑️  Suppression: $file" -ForegroundColor Red
        Remove-Item $file -Force
    } else {
        Write-Host "  ℹ️  Déjà supprimé: $file" -ForegroundColor Gray
    }
}

# Vérification finale
Write-Host "`n✅ Fichiers restants:" -ForegroundColor Green
Get-ChildItem $baseDir | Select-Object Name, Length | Format-Table -AutoSize

Write-Host "`n✨ Nettoyage terminé!" -ForegroundColor Green
Write-Host "📋 Il devrait rester uniquement:" -ForegroundColor Cyan
Write-Host "   - route.ts" -ForegroundColor White
Write-Host "   - README_ACTIONS.md" -ForegroundColor White
