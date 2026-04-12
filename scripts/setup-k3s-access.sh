#!/usr/bin/env bash
# =============================================================================
# setup-k3s-access.sh — Déverrouille l'accès à containerd K3s sans sudo interactif
#
# À exécuter UNE SEULE FOIS en tant que root :
#   sudo bash /home/neokube-beta/scripts/setup-k3s-access.sh
#
# Ce script :
#   1. Ajoute une règle NOPASSWD pour k3s ctr (accès image sans mot de passe)
#   2. Fixe le groupe du socket containerd → groupe 'neokube' (persistant via udev)
#   3. Active les changements immédiatement
# =============================================================================
set -euo pipefail

SUDOERS_FILE="/etc/sudoers.d/neokube-k3s-ctr"
UDEV_RULE="/etc/udev/rules.d/99-k3s-containerd.rules"
SOCKET="/run/k3s/containerd/containerd.sock"
GROUP="neokube"
USER="neokube-beta"

echo "[1/3] Ajout règle sudo NOPASSWD pour k3s ctr..."
cat > "$SUDOERS_FILE" << 'EOF'
# Permet à neokube-beta d'importer des images dans containerd K3s sans mot de passe
neokube-beta ALL=(root) NOPASSWD: /usr/local/bin/k3s ctr *
EOF
chmod 0440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE" && echo "      ✓ $SUDOERS_FILE valide"

echo "[2/3] Règle udev pour socket containerd (groupe $GROUP)..."
cat > "$UDEV_RULE" << EOF
# Rend le socket containerd K3s accessible au groupe $GROUP
SUBSYSTEM=="unix", ACTION=="add", KERNEL=="containerd.sock", \
  RUN+="/bin/chown root:$GROUP %N", RUN+="/bin/chmod 660 %N"
EOF
udevadm control --reload-rules
echo "      ✓ Règle udev créée → $UDEV_RULE"

echo "[3/3] Application immédiate sur le socket existant..."
if [ -S "$SOCKET" ]; then
    chown root:"$GROUP" "$SOCKET"
    chmod 660 "$SOCKET"
    echo "      ✓ Socket $SOCKET → root:$GROUP (660)"
else
    echo "      ⚠ Socket pas encore créé (redémarrage K3s nécessaire)"
fi

echo ""
echo "======================================================"
echo " Setup terminé ! Claude Code peut maintenant exécuter :"
echo "   k3s ctr -n k8s.io images import -"
echo " sans mot de passe."
echo "======================================================"
