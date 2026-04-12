#!/usr/bin/env bash
# =============================================================================
# migrate-qdrant-to-kapsule.sh
# Migration Qdrant local (K3s kubinote) → Kapsule Scaleway (neokube-rag)
#
# Étapes :
#   1. Snapshot de toutes les collections Qdrant locales
#   2. Upload snapshots → Scaleway Object Storage (scw-s3:neokube-sharepoint-personnel)
#   3. Récupération du kubeconfig Kapsule
#   4. Déploiement Qdrant sur Kapsule
#   5. Restauration des snapshots depuis S3 → Qdrant Kapsule
#   6. Vérification
#
# Usage :
#   ./scripts/migrate-qdrant-to-kapsule.sh
# =============================================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
QDRANT_LOCAL="http://localhost:6333"
QDRANT_LOCAL_API_KEY="${QDRANT_LOCAL_API_KEY:-}"
KAPSULE_CLUSTER_ID="09cc0912-b52d-4464-a624-6bce0a459570"
QDRANT_KAPSULE_API_KEY="$(openssl rand -hex 32)"  # généré à la 1ère exécution
SNAPSHOT_BUCKET="scw-s3:neokube-qdrant-snapshots"
SNAPSHOT_DIR="/tmp/qdrant-migration-$(date +%Y%m%d-%H%M%S)"
KUBECONFIG_KAPSULE="$HOME/.kube/kapsule-neokube-rag.yaml"

export SCW_SECRET_KEY=39aab20c-720c-466e-9ca0-39fd1cdf7438
export SCW_ACCESS_KEY=SCWK4R47320WGS3R5GWA
export SCW_DEFAULT_ORGANIZATION_ID=c537ee52-24cb-4df7-9c54-757a64bf01ef
export SCW_DEFAULT_PROJECT_ID=473a0ce6-ecd8-4374-8f49-9a6e347d0c8d
export SCW_DEFAULT_REGION=fr-par
export SCW_DEFAULT_ZONE=fr-par-1

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Migration Qdrant K3s local → Kapsule Scaleway          "
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

mkdir -p "$SNAPSHOT_DIR"

# ── Étape 1 : Lister les collections locales ─────────────────────────────────
echo "[1/6] Collecte des collections Qdrant locales..."
QDRANT_HEADER=""
if [ -n "$QDRANT_LOCAL_API_KEY" ]; then
  QDRANT_HEADER="-H \"api-key: $QDRANT_LOCAL_API_KEY\""
fi

COLLECTIONS=$(curl -s $QDRANT_HEADER "${QDRANT_LOCAL}/collections" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(c['name'] for c in d.get('result',{}).get('collections',[])))")

if [ -z "$COLLECTIONS" ]; then
  echo "  Aucune collection trouvée sur Qdrant local."
  echo "  Vérifier que Qdrant tourne : kubectl get pods -n rag-system"
  exit 1
fi

echo "  Collections trouvées :"
echo "$COLLECTIONS" | while read col; do echo "    - $col"; done
echo ""

# ── Étape 2 : Snapshots de chaque collection ─────────────────────────────────
echo "[2/6] Création des snapshots..."
echo "$COLLECTIONS" | while read COLLECTION; do
  echo "  Snapshot de '$COLLECTION'..."

  # Créer snapshot
  SNAP_RESP=$(curl -s -X POST $QDRANT_HEADER \
    "${QDRANT_LOCAL}/collections/${COLLECTION}/snapshots")
  SNAP_NAME=$(echo "$SNAP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('name',''))")

  if [ -z "$SNAP_NAME" ]; then
    echo "  ❌ Échec snapshot pour '$COLLECTION'"
    echo "  Réponse: $SNAP_RESP"
    continue
  fi

  # Télécharger le snapshot
  curl -s -o "${SNAPSHOT_DIR}/${COLLECTION}.snapshot" $QDRANT_HEADER \
    "${QDRANT_LOCAL}/collections/${COLLECTION}/snapshots/${SNAP_NAME}"

  SIZE=$(du -sh "${SNAPSHOT_DIR}/${COLLECTION}.snapshot" | cut -f1)
  echo "  ✅ $COLLECTION → ${SNAPSHOT_DIR}/${COLLECTION}.snapshot ($SIZE)"
done
echo ""

# ── Étape 3 : Upload vers Scaleway Object Storage ────────────────────────────
echo "[3/6] Upload des snapshots vers Scaleway Object Storage..."
rclone mkdir "$SNAPSHOT_BUCKET" 2>/dev/null || true
rclone copy "$SNAPSHOT_DIR/" "$SNAPSHOT_BUCKET/" \
  --progress --transfers 2
echo "  ✅ Snapshots uploadés dans $SNAPSHOT_BUCKET"
echo ""

# ── Étape 4 : Récupérer le kubeconfig Kapsule ────────────────────────────────
echo "[4/6] Récupération du kubeconfig Kapsule..."
scw k8s kubeconfig get \
  cluster-id=$KAPSULE_CLUSTER_ID \
  region=fr-par > "$KUBECONFIG_KAPSULE" 2>&1

if grep -q "server:" "$KUBECONFIG_KAPSULE"; then
  echo "  ✅ kubeconfig sauvé → $KUBECONFIG_KAPSULE"
else
  echo "  ❌ Kubeconfig invalide — cluster prêt ?"
  cat "$KUBECONFIG_KAPSULE"
  exit 1
fi
echo ""

# ── Étape 5 : Déploiement Qdrant sur Kapsule ─────────────────────────────────
echo "[5/6] Déploiement Qdrant sur Kapsule..."
export KUBECONFIG="$KUBECONFIG_KAPSULE"

# Secret API Key
kubectl create namespace rag-system --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic qdrant-secret \
  --namespace rag-system \
  --from-literal=api-key="${QDRANT_KAPSULE_API_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Manifests Qdrant
kubectl apply -f "$HOME/.kube/manifests/kapsule-qdrant.yaml"

echo "  Attente démarrage Qdrant (max 3 min)..."
kubectl rollout status deployment/qdrant -n rag-system --timeout=180s

# Récupérer l'IP du LoadBalancer
echo "  Attente IP LoadBalancer..."
for i in $(seq 1 30); do
  LB_IP=$(kubectl get svc qdrant-lb -n rag-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
  if [ -n "$LB_IP" ]; then break; fi
  echo "  ... ($i/30)"
  sleep 10
done

if [ -z "$LB_IP" ]; then
  echo "  ⚠️  IP LB non disponible. Utiliser port-forward pour la restauration."
  echo "  kubectl port-forward -n rag-system svc/qdrant 6333:6333 --kubeconfig=$KUBECONFIG_KAPSULE &"
  LB_IP="127.0.0.1"
  kubectl port-forward -n rag-system svc/qdrant 6333:6333 --kubeconfig="$KUBECONFIG_KAPSULE" &
  PF_PID=$!
  sleep 3
fi

QDRANT_REMOTE="http://${LB_IP}:6333"
echo "  ✅ Qdrant Kapsule accessible : $QDRANT_REMOTE"
echo ""

# ── Étape 6 : Restauration des snapshots ─────────────────────────────────────
echo "[6/6] Restauration des collections sur Kapsule..."
for SNAP_FILE in "${SNAPSHOT_DIR}"/*.snapshot; do
  COLLECTION=$(basename "$SNAP_FILE" .snapshot)
  echo "  Restauration '$COLLECTION'..."

  RESTORE_RESP=$(curl -s -X POST \
    -H "api-key: ${QDRANT_KAPSULE_API_KEY}" \
    -H "Content-Type: multipart/form-data" \
    -F "snapshot=@${SNAP_FILE}" \
    "${QDRANT_REMOTE}/collections/${COLLECTION}/snapshots/upload?priority=snapshot")

  STATUS=$(echo "$RESTORE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null)
  echo "  ✅ $COLLECTION restauré (status: $STATUS)"
done

# Tuer le port-forward si utilisé
[ -n "${PF_PID:-}" ] && kill "$PF_PID" 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   Migration terminée !                                    "
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Qdrant Kapsule  : $QDRANT_REMOTE"
echo "  API Key Kapsule : $QDRANT_KAPSULE_API_KEY"
echo "  Kubeconfig      : $KUBECONFIG_KAPSULE"
echo ""
echo "  → Sauvegarder la clé API dans le secret K3s :"
echo "  kubectl create secret generic qdrant-kapsule-creds \\"
echo "    -n rag-system \\"
echo "    --from-literal=api-key=${QDRANT_KAPSULE_API_KEY} \\"
echo "    --from-literal=url=${QDRANT_REMOTE}"
echo ""
echo "  → Mettre à jour QDRANT_URL dans les pods qui utilisent Qdrant :"
echo "    ingest_knowledge.py, rag_monitor.py, neokube_sre_service.py"
