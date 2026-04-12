#!/bin/bash
# k3s-watchdog.sh — Redémarre k3s si l'API ou le socket gRPC se verrouille
# Installé via systemd timer (toutes les 2 minutes)

LOGFILE="/var/log/k3s-watchdog.log"
KUBECTL="/usr/local/bin/kubectl"
MAX_FAILS=2   # nombre de checks consécutifs échoués avant restart

_log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOGFILE"; }

# Test 1 : API server répond ?
if ! $KUBECTL get nodes --request-timeout=5s &>/dev/null; then
    _log "WARN API server non-réponse — check socket k3s"

    # Test 2 : socket /run/k3s/containerd/containerd.sock accessible ?
    if ! test -S /run/k3s/containerd/containerd.sock; then
        _log "ERROR socket containerd manquant — restart k3s"
        systemctl restart k3s
        _log "INFO k3s redémarré"
        exit 0
    fi

    # Test 3 : processus k3s vivant mais API morte → restart
    if ! pgrep -x k3s &>/dev/null; then
        _log "ERROR k3s process mort — restart"
        systemctl restart k3s
        _log "INFO k3s redémarré"
        exit 0
    fi

    # API morte mais process vivant : attendre un 2ème cycle avant de taper
    FAIL_FILE="/tmp/k3s-watchdog-fail"
    FAILS=$(cat "$FAIL_FILE" 2>/dev/null || echo 0)
    FAILS=$((FAILS + 1))
    echo $FAILS > "$FAIL_FILE"
    _log "WARN API non-disponible (fails=$FAILS/$MAX_FAILS)"

    if [ "$FAILS" -ge "$MAX_FAILS" ]; then
        _log "ERROR $MAX_FAILS échecs consécutifs — restart k3s"
        systemctl restart k3s
        rm -f "$FAIL_FILE"
        _log "INFO k3s redémarré"
    fi
else
    # API OK : reset compteur
    rm -f /tmp/k3s-watchdog-fail
fi
