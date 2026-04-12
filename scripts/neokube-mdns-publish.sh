#!/bin/bash
# neokube-mdns-publish.sh
# Publie tous les alias *.neokube.local via avahi-publish (mDNS)
# Chaque hostname résout sur 192.168.1.28 (IP LAN du nœud kubinote)

NODE_IP="192.168.1.28"

HOSTS=(
  "langfuse.neokube.local"
  "litellm.neokube.local"
  "qdrant.neokube.local"
  "temporal.neokube.local"
  "penpot.neokube.local"
  "headlamp.neokube.local"
  "api.neokube.local"
)

# Tuer les publications précédentes proprement
pkill -f "avahi-publish.*neokube.local" 2>/dev/null || true
sleep 1

# Publier chaque hostname en arrière-plan
PIDS=()
for host in "${HOSTS[@]}"; do
  avahi-publish --address --no-fail -R "${host}" "${NODE_IP}" &
  PIDS+=($!)
  echo "$(date '+%H:%M:%S') [mDNS] Published ${host} → ${NODE_IP}"
done

echo "$(date '+%H:%M:%S') [mDNS] All ${#HOSTS[@]} hostnames published. PIDs: ${PIDS[*]}"

# Attendre tous les processus (ils tournent indéfiniment jusqu'à signal)
wait "${PIDS[@]}"
