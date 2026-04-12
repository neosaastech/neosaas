#!/usr/bin/env bash
# =============================================================================
# migrate-sharepoint-personnel.sh
# Migration SharePoint/Personnel → Scaleway Object Storage
#
# Usage :
#   ./scripts/migrate-sharepoint-personnel.sh            # dry-run (aperçu)
#   ./scripts/migrate-sharepoint-personnel.sh --run      # migration réelle
#   ./scripts/migrate-sharepoint-personnel.sh --run --delete  # + supprime local après vérif
#
# Remote rclone cible : scw-s3:neokube-sharepoint-personnel
# Bucket créé en : fr-par / ONEZONE_IA (moins cher que STANDARD)
# =============================================================================

set -euo pipefail

SRC_DIR="$HOME/SharePoint/Personnel"
REMOTE="scw-s3:neokube-sharepoint-personnel"
LOG_FILE="$HOME/.local/share/rclone-migration/sharepoint-personnel-$(date +%Y%m%d-%H%M%S).log"
DRY_RUN=true
DELETE_AFTER=false

# ── Parse arguments ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --run)    DRY_RUN=false ;;
    --delete) DELETE_AFTER=true ;;
  esac
done

mkdir -p "$(dirname "$LOG_FILE")"

# ── Affichage de l'état avant ─────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Migration SharePoint/Personnel → Scaleway Object Storage"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Source  : $SRC_DIR"
echo "Dest    : $REMOTE"
echo "Log     : $LOG_FILE"
echo "Mode    : $([ "$DRY_RUN" = true ] && echo 'DRY-RUN (aucune modification)' || echo 'RÉEL')"
echo "Suppression locale après : $([ "$DELETE_AFTER" = true ] && echo 'OUI (après vérification checksum)' || echo 'NON')"
echo ""

SIZE_LOCAL=$(du -sh "$SRC_DIR" 2>/dev/null | cut -f1)
echo "Taille à migrer : $SIZE_LOCAL"
echo ""

# ── Flags rclone ─────────────────────────────────────────────────────────────
RCLONE_FLAGS=(
  --progress
  --transfers 4          # 4 fichiers en parallèle
  --checkers 8
  --checksum             # vérification checksum end-to-end
  --log-file "$LOG_FILE"
  --log-level INFO
  --stats 10s
  --stats-one-line
  --exclude "**/.DS_Store"
  --exclude "**/Thumbs.db"
  --exclude "**/*.tmp"
)

if [ "$DRY_RUN" = true ]; then
  RCLONE_FLAGS+=(--dry-run)
  echo "⚠️  Mode DRY-RUN — aucun fichier ne sera copié."
  echo "   Relancer avec --run pour exécuter la migration."
  echo ""
fi

# ── Copie ─────────────────────────────────────────────────────────────────────
echo "Démarrage de la copie..."
rclone copy "$SRC_DIR" "$REMOTE" "${RCLONE_FLAGS[@]}" 2>&1 | tee -a "$LOG_FILE"

echo ""
echo "✅ Copie terminée. Log : $LOG_FILE"

# ── Vérification post-copie ──────────────────────────────────────────────────
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "Vérification des checksums (comparaison locale ↔ remote)..."
  rclone check "$SRC_DIR" "$REMOTE" --checksum 2>&1 | tee -a "$LOG_FILE"

  ERRORS=$(grep -c "ERROR\|CRITICAL" "$LOG_FILE" 2>/dev/null || echo 0)
  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "❌ $ERRORS erreur(s) détectée(s) dans le log. Suppression locale annulée."
    echo "   Vérifier : $LOG_FILE"
    exit 1
  fi

  echo ""
  echo "✅ Vérification OK — aucune erreur."

  # ── Suppression locale (seulement si --delete et vérif OK) ──────────────────
  if [ "$DELETE_AFTER" = true ]; then
    echo ""
    echo "Taille disque avant suppression :"
    df -h / | tail -1

    echo "Suppression des fichiers locaux migrés..."
    rclone delete "$SRC_DIR" --rmdirs 2>&1 | tee -a "$LOG_FILE"

    echo ""
    echo "Taille disque après suppression :"
    df -h / | tail -1
    echo ""
    echo "✅ Migration + suppression locale terminées."
    echo "   Les données sont disponibles dans : $REMOTE"
    echo ""
    echo "   Pour restaurer un fichier :"
    echo "   rclone copy '$REMOTE/chemin/fichier' ~/SharePoint/Personnel/"
  fi
fi
