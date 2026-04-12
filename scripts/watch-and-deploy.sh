#!/usr/bin/env bash
# =============================================================================
# watch-and-deploy.sh — Hot-reload penpot-sidecar
#
# Surveille les modifications dans /scripts, rebuilde l'image Docker locale,
# l'importe dans containerd (K3s) et restart le déploiement K8s.
#
# Usage :
#   chmod +x scripts/watch-and-deploy.sh
#   ./scripts/watch-and-deploy.sh
#
# Variables d'environnement optionnelles :
#   POLL_INTERVAL   Intervalle de polling en secondes (défaut: 3)
#   NAMESPACE       Namespace K8s (défaut: open-webui)
#   IMAGE           Image Docker (défaut: neokube/penpot-sidecar:latest)
# =============================================================================
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCH_DIR="${SCRIPT_DIR}"
DOCKERFILE="${SCRIPT_DIR}/Dockerfile.penpot-sidecar"
IMAGE="${IMAGE:-neokube/penpot-sidecar:latest}"
NAMESPACE="${NAMESPACE:-open-webui}"
DEPLOYMENT="penpot-sidecar"
POLL_INTERVAL="${POLL_INTERVAL:-3}"

# ── Couleurs ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }
step() { echo -e "\n${BOLD}${YELLOW}── $* ──${NC}"; }

# ── Vérifie les dépendances ───────────────────────────────────────────────────
check_deps() {
    local missing=()
    for cmd in docker kubectl sha256sum sudo; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        err "Dépendances manquantes : ${missing[*]}"
        exit 1
    fi
    # ctr (containerd) — optionnel si docker push vers registry locale
    command -v ctr &>/dev/null || \
        log "${YELLOW}⚠${NC}  'ctr' introuvable — import containerd désactivé"
}

# ── Calcule le checksum de tous les fichiers dans WATCH_DIR ──────────────────
compute_checksum() {
    find "${WATCH_DIR}" -maxdepth 1 -type f \
        | sort \
        | xargs sha256sum 2>/dev/null \
        | sha256sum \
        | awk '{print $1}'
}

# ── Build + Import + Restart ──────────────────────────────────────────────────
do_deploy() {
    local ts
    ts="$(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║  Changement détecté — déploiement lancé  ║${NC}"
    echo -e "${BOLD}║  ${ts}              ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

    # 1. Build de l'image
    step "1/3 Docker build"
    if docker build \
        --tag "${IMAGE}" \
        --file "${DOCKERFILE}" \
        "${SCRIPT_DIR}" \
        2>&1 | sed 's/^/    /'; then
        ok "Image buildée : ${IMAGE}"
    else
        err "Build échoué — déploiement annulé"
        return 1
    fi

    # 2. Import dans containerd K3s
    # Prérequis : sudo bash scripts/setup-k3s-access.sh (une seule fois)
    step "2/3 Import containerd (K3s)"
    if docker save "${IMAGE}" \
        | sudo k3s ctr -n k8s.io images import - 2>&1 | sed 's/^/    /'; then
        ok "Image importée dans containerd (k3s ctr)"
    else
        err "Import containerd échoué — rollout restart quand même tenté"
        log "   Si sudo échoue, lancez : sudo bash scripts/setup-k3s-access.sh"
    fi

    # 3. Patch l'image dans le déploiement + rollout restart
    step "3/3 kubectl rollout restart"
    if kubectl patch deployment "${DEPLOYMENT}" \
        --namespace "${NAMESPACE}" \
        --type=json \
        --patch="[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/image\",\"value\":\"${IMAGE}\"}]" \
        2>/dev/null; then
        log "Image patchée → ${IMAGE}"
    else
        log "${YELLOW}⚠${NC}  Patch image échoué (déjà à jour ou container path différent)"
    fi

    if kubectl rollout restart deployment/"${DEPLOYMENT}" \
        --namespace "${NAMESPACE}" 2>&1; then
        ok "Rollout restart déclenché"
    else
        err "Rollout restart échoué"
        return 1
    fi

    kubectl rollout status deployment/"${DEPLOYMENT}" \
        --namespace "${NAMESPACE}" \
        --timeout=90s 2>&1 | sed 's/^/    /' || true

    echo ""
    ok "Déploiement terminé à $(date '+%H:%M:%S')"
    echo ""
}

# ── Boucle principale ─────────────────────────────────────────────────────────
main() {
    check_deps

    log "Watcher démarré"
    log "Répertoire surveillé : ${WATCH_DIR}"
    log "Image              : ${IMAGE}"
    log "Déploiement        : ${NAMESPACE}/${DEPLOYMENT}"
    log "Intervalle polling : ${POLL_INTERVAL}s"
    echo ""

    if [[ ! -f "${DOCKERFILE}" ]]; then
        err "Dockerfile introuvable : ${DOCKERFILE}"
        exit 1
    fi

    local prev_checksum=""
    local current_checksum

    # Checksum initial (sans déployer au démarrage)
    prev_checksum="$(compute_checksum)"
    log "Checksum initial : ${prev_checksum:0:12}… — en attente de modifications"

    while true; do
        sleep "${POLL_INTERVAL}"
        current_checksum="$(compute_checksum)"

        if [[ "${current_checksum}" != "${prev_checksum}" ]]; then
            prev_checksum="${current_checksum}"
            do_deploy || log "${RED}Déploiement en erreur — watcher continue${NC}"
        fi
    done
}

# ── Gestion propre du SIGINT/SIGTERM ─────────────────────────────────────────
trap 'echo ""; log "Watcher arrêté."; exit 0' SIGINT SIGTERM

main "$@"
