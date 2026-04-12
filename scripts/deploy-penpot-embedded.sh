#!/usr/bin/env bash
# =============================================================================
# deploy-penpot-embedded.sh — NeoKube Embedded Graph
# Orchestre le déploiement complet du penpot-sidecar v2.0 en mode souverain.
#
# Usage :
#   chmod +x scripts/deploy-penpot-embedded.sh
#   ./scripts/deploy-penpot-embedded.sh
#   ./scripts/deploy-penpot-embedded.sh --skip-cleanup   # sauter l'étape 1
# =============================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
NAMESPACE="open-webui"
AGENT_NS="agent-system"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/../.kube/manifests/penpot-sidecar-v2.yaml"
SERVICE_PY="$SCRIPT_DIR/penpot_service.py"
SKIP_CLEANUP="${1:-}"

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${CYAN}[$1/5]${NC} ${YELLOW}$2${NC}"; }
ok()   { echo -e "      ${GREEN}✓${NC} $1"; }
warn() { echo -e "      ${RED}⚠${NC}  $1"; }

# ── Pré-requis ────────────────────────────────────────────────────────────────
if [[ ! -f "$SERVICE_PY" ]]; then
  echo -e "${RED}ERREUR : $SERVICE_PY introuvable.${NC}"; exit 1
fi
if [[ ! -f "$MANIFEST" ]]; then
  echo -e "${RED}ERREUR : $MANIFEST introuvable.${NC}"; exit 1
fi

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║    NeoKube — Déploiement Embedded Graph (Gratuit)    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 1 — Nettoyage des anciennes briques LangGraph Server
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_CLEANUP" != "--skip-cleanup" ]]; then
  step 1 "Nettoyage — Briques LangGraph Server (agent-system)"

  for dep in langgraph-api langgraph-postgres langgraph-redis; do
    if kubectl get deployment "$dep" -n "$AGENT_NS" &>/dev/null; then
      kubectl delete deployment "$dep" -n "$AGENT_NS" --ignore-not-found
      ok "deployment/$dep supprimé"
    fi
    if kubectl get service "$dep" -n "$AGENT_NS" &>/dev/null; then
      kubectl delete service "$dep" -n "$AGENT_NS" --ignore-not-found
      ok "service/$dep supprimé"
    fi
  done

  kubectl delete secret  langgraph-secrets      -n "$AGENT_NS" --ignore-not-found 2>/dev/null && ok "secret/langgraph-secrets supprimé"      || true
  kubectl delete pvc     langgraph-postgres-pvc  -n "$AGENT_NS" --ignore-not-found 2>/dev/null && ok "pvc/langgraph-postgres-pvc supprimé"    || true
  kubectl delete pv      langgraph-postgres-pv               --ignore-not-found 2>/dev/null && ok "pv/langgraph-postgres-pv supprimé"       || true

  # Ancien PVC penpot-state (renommé en neokube-state dans cette version)
  kubectl delete pvc penpot-state-pvc -n "$NAMESPACE" --ignore-not-found 2>/dev/null && ok "pvc/penpot-state-pvc (ancien) supprimé" || true
  kubectl delete pv  penpot-state-pv               --ignore-not-found 2>/dev/null && ok "pv/penpot-state-pv (ancien) supprimé"   || true
else
  step 1 "Nettoyage ignoré (--skip-cleanup)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 2 — ConfigMap penpot-service-code
# Injecte penpot_service.py (LangGraph Embedded) dans le namespace open-webui.
# ─────────────────────────────────────────────────────────────────────────────
step 2 "ConfigMap penpot-service-code ← $SERVICE_PY"

kubectl create configmap penpot-service-code \
  --namespace "$NAMESPACE" \
  --from-file=penpot_service.py="$SERVICE_PY" \
  --dry-run=client -o yaml | kubectl apply -f -

CM_SIZE=$(wc -c < "$SERVICE_PY")
ok "ConfigMap mise à jour (${CM_SIZE} octets)"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 3 — PV / PVC / Secret / Deployment / Service
# ─────────────────────────────────────────────────────────────────────────────
step 3 "Manifeste K8s → $MANIFEST"

kubectl apply -f "$MANIFEST"
ok "Manifeste appliqué"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 4 — Rollout
# Le démarrage est lent (~90s) car pip install s'exécute au démarrage.
# ─────────────────────────────────────────────────────────────────────────────
step 4 "Rollout deployment/penpot-sidecar (timeout 5 min — pip install inclus)"

kubectl rollout status deployment/penpot-sidecar \
  -n "$NAMESPACE" --timeout=300s
ok "Rollout terminé"

# ─────────────────────────────────────────────────────────────────────────────
# ÉTAPE 5 — Vérification
# ─────────────────────────────────────────────────────────────────────────────
step 5 "Vérification du service"

POD=$(kubectl get pod -n "$NAMESPACE" -l app=penpot-sidecar \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [[ -z "$POD" ]]; then
  warn "Aucun pod trouvé pour app=penpot-sidecar"
else
  ok "Pod actif : $POD"
  sleep 3

  HEALTH=$(kubectl exec -n "$NAMESPACE" "$POD" -- \
    curl -s --max-time 5 http://localhost:8000/health 2>/dev/null \
    || echo '{"status":"not_ready"}')
  ok "Health : $HEALTH"

  # Vérification du port 8000 via le Service
  SVC_PORT=$(kubectl get service penpot-sidecar -n "$NAMESPACE" \
    -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "?")
  ok "Service penpot-sidecar expose le port : $SVC_PORT"

  # Vérification du PVC
  PVC_STATUS=$(kubectl get pvc neokube-state-pvc -n "$NAMESPACE" \
    -o jsonpath='{.status.phase}' 2>/dev/null || echo "?")
  ok "PVC neokube-state-pvc : $PVC_STATUS"

  # Vérification du fichier SQLite
  DB_CHECK=$(kubectl exec -n "$NAMESPACE" "$POD" -- \
    ls -lh /data/neokube_state.db 2>/dev/null || echo "pas encore créé (normal au 1er démarrage)")
  ok "SQLite /data/neokube_state.db : $DB_CHECK"
fi

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  NeoKube Embedded Graph — Déployé avec succès !              ║"
echo "║                                                              ║"
echo "║  Endpoints disponibles :                                     ║"
echo "║    GET  /health         → Santé du service                   ║"
echo "║    POST /action         → Intent parser direct (Penpot)      ║"
echo "║    POST /v1/orchestrate → Graphe LangGraph (designer+SEO)    ║"
echo "║                                                              ║"
echo "║  Persistance : /data/neokube_state.db (PVC neokube-state)    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
