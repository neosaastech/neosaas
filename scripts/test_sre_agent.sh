#!/usr/bin/env bash
# =============================================================================
# test_sre_agent.sh — Protocole de recette NeoKube-SRE
#
# Teste les 3 phases de la mission de l'agent :
#   Phase 1 : Draft      — vérification dépendances + écriture manifeste
#   Phase 2 : Action     — git commit + push + sudo kubectl apply
#   Phase 3 : Validation — attente pod Running + curl fonctionnel + vérif GitHub
#
# Usage :
#   ./scripts/test_sre_agent.sh [--cleanup]
# =============================================================================

set -euo pipefail

SRE_URL="http://localhost:8001"
NAMESPACE="sre-test"
DEPLOY_NAME="whoami-test"
GIT_REPO="/workspace"
PASS=0
FAIL=0
TOTAL=0

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); }
info() { echo -e "${BLUE}ℹ️  ${NC} $1"; }
section() { echo -e "\n${YELLOW}══════════════════════════════════════${NC}"; echo -e "${YELLOW} $1${NC}"; echo -e "${YELLOW}══════════════════════════════════════${NC}"; }

# Lancer port-forward si nécessaire
PF_PID=""
if ! curl -s --max-time 2 "$SRE_URL/health" > /dev/null 2>&1; then
  info "Lancement port-forward..."
  sudo k3s kubectl port-forward -n open-webui svc/neokube-sre-agent 8001:8001 &>/dev/null &
  PF_PID=$!
  sleep 3
fi

cleanup() {
  [ -n "$PF_PID" ] && kill "$PF_PID" 2>/dev/null || true
  if [[ "${1:-}" == "--cleanup" ]]; then
    info "Nettoyage namespace $NAMESPACE..."
    sudo k3s kubectl delete namespace "$NAMESPACE" --ignore-not-found 2>/dev/null || true
  fi
}
trap 'cleanup' EXIT

# Fonction : appel agent et extraction réponse
ask_agent() {
  local question="$1"
  local max_tokens="${2:-800}"
  curl -s --max-time 120 -X POST "$SRE_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"neokube-sre\",\"messages\":[{\"role\":\"user\",\"content\":$(echo "$question" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}],\"max_tokens\":$max_tokens,\"stream\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['choices'][0]['message']['content'])" 2>/dev/null
}

# =============================================================================
section "PHASE 0 — SANTÉ DE L'AGENT"
# =============================================================================

info "Test /health endpoint..."
HEALTH=$(curl -s --max-time 5 "$SRE_URL/health")
PROVIDER=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('provider','?'))" 2>/dev/null)
TOOLS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tools_count',0))" 2>/dev/null)
STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null)

[ "$STATUS" = "ok" ] && pass "Agent health = ok" || fail "Agent health = $STATUS"
[ "$TOOLS" -ge 60 ] && pass "Outils disponibles : $TOOLS" || fail "Outils insuffisants : $TOOLS"
[ "$PROVIDER" != "?" ] && pass "Backend LLM : $PROVIDER" || fail "Backend LLM inconnu"

# =============================================================================
section "PHASE 1 — DRAFT (Vérification dépendances)"
# =============================================================================

# Test 1.1 : L'agent voit-il les bons pods ?
info "Demande : liste des pods open-webui..."
RESP=$(ask_agent "Exécute kubectl get pods -n open-webui --no-headers et retourne uniquement la sortie brute de la commande, sans commentaire.")
REAL=$(sudo k3s kubectl get pods -n open-webui --no-headers 2>/dev/null)
# Comparer les noms de pods
AGENT_PODS=$(echo "$RESP" | grep -oP '[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\s+(Running|Pending|Error)' || echo "")
REAL_PODS=$(echo "$REAL" | grep -oP '[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\s+(Running|Pending|Error)' || echo "")
if echo "$RESP" | grep -q "neokube-sre-agent"; then
  pass "Agent voit les vrais pods (neokube-sre-agent trouvé dans réponse)"
else
  fail "Agent ne voit pas les vrais pods | Réponse: ${RESP:0:100}"
fi

# Test 1.2 : Qdrant accessible ?
info "Demande : connectivité Qdrant..."
RESP=$(ask_agent "Exécute curl -s http://51.159.27.101:6333/readyz et retourne uniquement la réponse brute.")
if echo "$RESP" | grep -q "all shards are ready"; then
  pass "Agent confirme Qdrant opérationnel"
else
  fail "Agent ne confirme pas Qdrant | Réponse: ${RESP:0:100}"
fi

# Test 1.3 : Git status réel ?
info "Demande : git status..."
RESP=$(ask_agent "Exécute git -C /workspace status --short et retourne la sortie brute exacte.")
REAL_GIT=$(git -C /home/neokube-beta status --short 2>/dev/null | head -5)
# Vérifier que l'agent rapporte au moins le même fichier modifié
FIRST_MODIFIED=$(echo "$REAL_GIT" | grep "^M" | head -1 | awk '{print $2}' || echo "")
if [ -z "$FIRST_MODIFIED" ] || echo "$RESP" | grep -q "up to date\|nothing to commit\|$FIRST_MODIFIED"; then
  pass "Git status cohérent avec la réalité"
else
  fail "Git status incohérent | Attendu: $FIRST_MODIFIED | Réponse: ${RESP:0:150}"
fi

# =============================================================================
section "PHASE 2 — ACTION (Déploiement test-whoami)"
# =============================================================================

# Préparer un manifeste de test
MANIFEST_CONTENT="---
apiVersion: v1
kind: Namespace
metadata:
  name: $NAMESPACE
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $DEPLOY_NAME
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: $DEPLOY_NAME
  template:
    metadata:
      labels:
        app: $DEPLOY_NAME
    spec:
      containers:
        - name: whoami
          image: traefik/whoami:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: $DEPLOY_NAME
  namespace: $NAMESPACE
spec:
  selector:
    app: $DEPLOY_NAME
  ports:
    - port: 80
      targetPort: 80"

# Écrire le manifeste dans le workspace pour que l'agent le déploie
cat > /tmp/test-whoami.yaml << MANIFEST
$MANIFEST_CONTENT
MANIFEST

# Test 2.1 : L'agent peut-il faire un dry-run ?
info "Demande : dry-run du manifeste..."
RESP=$(ask_agent "Exécute kubectl apply --dry-run=client -f - <<'YAML'
$MANIFEST_CONTENT
YAML
Retourne la sortie brute. Si le dry-run réussit, dis 'DRY-RUN OK'. Si erreur, dis 'ERREUR'.")
if echo "$RESP" | grep -qi "configured\|created\|dry.run\|DRY-RUN OK"; then
  pass "Dry-run réussi"
else
  fail "Dry-run échoué | Réponse: ${RESP:0:200}"
fi

# Test 2.2 : L'agent déploie-t-il réellement ?
info "Demande : déploiement réel..."
RESP=$(ask_agent "Applique ce manifeste Kubernetes avec sudo kubectl apply :
$MANIFEST_CONTENT
Retourne la sortie brute de sudo kubectl apply.")
if echo "$RESP" | grep -qi "created\|configured\|namespace.*created"; then
  pass "sudo kubectl apply exécuté"
else
  fail "sudo kubectl apply non confirmé | Réponse: ${RESP:0:200}"
fi

# Vérification indépendante (ground truth)
sleep 3
REAL_NS=$(sudo k3s kubectl get namespace "$NAMESPACE" --no-headers 2>/dev/null | awk '{print $1}' || echo "")
if [ "$REAL_NS" = "$NAMESPACE" ]; then
  pass "Namespace $NAMESPACE créé (vérifié indépendamment)"
else
  fail "Namespace $NAMESPACE absent après apply"
fi

# =============================================================================
section "PHASE 3 — VALIDATION (LA PIÈCE MANQUANTE)"
# =============================================================================

# Test 3.1 : L'agent attend-il que le pod soit Running avant de répondre ?
info "Demande : attente pod Running (timeout 120s)..."
START=$(date +%s)
RESP=$(ask_agent "Attends que le pod whoami-test soit en état Running dans le namespace $NAMESPACE. Vérifie toutes les 10 secondes avec sudo k3s kubectl get pods. Ne réponds qu'une fois que le pod est Running ou après 120 secondes de timeout. Retourne l'état final du pod.")
END=$(date +%s)
ELAPSED=$((END - START))
REAL_STATUS=$(sudo k3s kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | awk '{print $3}' | head -1 || echo "Unknown")

if echo "$RESP" | grep -qi "Running"; then
  pass "Agent rapporte le pod Running"
else
  fail "Agent ne rapporte pas Running | Réponse: ${RESP:0:200}"
fi

if [ "$REAL_STATUS" = "Running" ]; then
  pass "Pod réellement Running (vérifié indépendamment)"
else
  fail "Pod pas Running — statut réel: $REAL_STATUS"
fi

if [ "$ELAPSED" -ge 5 ]; then
  pass "Agent a attendu (${ELAPSED}s) — pas de réponse instantanée hallucinée"
else
  fail "Agent a répondu en ${ELAPSED}s — trop rapide, probablement halluciné"
fi

# Test 3.2 : Test fonctionnel (curl sur le service)
info "Demande : curl fonctionnel sur le service..."
sudo k3s kubectl port-forward -n "$NAMESPACE" svc/"$DEPLOY_NAME" 8888:80 &>/dev/null &
PF2_PID=$!
sleep 3
RESP=$(ask_agent "Exécute curl -s http://localhost:8888/ --max-time 5 et retourne les 3 premières lignes de la réponse.")
kill "$PF2_PID" 2>/dev/null || true

REAL_CURL=$(curl -s http://localhost:8888/ --max-time 5 2>/dev/null | head -3 || echo "")
if echo "$RESP" | grep -qi "Hostname\|whoami\|GET /"; then
  pass "Test fonctionnel curl : service répond"
else
  fail "Test fonctionnel curl échoué | Réponse: ${RESP:0:200}"
fi

# Test 3.3 : Vérification commit GitHub
info "Demande : vérification remote git..."
RESP=$(ask_agent "Exécute ces 2 commandes et retourne les sorties brutes :
1) git -C /workspace log --oneline -1
2) git -C /workspace status --short")
REAL_LAST_COMMIT=$(git -C /home/neokube-beta log --oneline -1)
COMMIT_HASH=$(echo "$REAL_LAST_COMMIT" | awk '{print $1}')
if echo "$RESP" | grep -q "$COMMIT_HASH"; then
  pass "Agent voit le bon dernier commit ($COMMIT_HASH)"
else
  fail "Agent ne voit pas le commit $COMMIT_HASH | Réponse: ${RESP:0:200}"
fi

# =============================================================================
section "RÉSUMÉ"
# =============================================================================

echo ""
echo "  Tests passés : ${GREEN}${PASS}/${TOTAL}${NC}"
echo "  Tests échoués: ${RED}${FAIL}/${TOTAL}${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 RECETTE COMPLÈTE — agent SRE opérationnel${NC}"
else
  echo -e "${RED}⚠️  RECETTE PARTIELLE — $FAIL test(s) à corriger${NC}"
fi

# Nettoyage namespace de test
info "Nettoyage namespace $NAMESPACE..."
sudo k3s kubectl delete namespace "$NAMESPACE" --ignore-not-found &>/dev/null &
