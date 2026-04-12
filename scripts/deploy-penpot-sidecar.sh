#!/usr/bin/env bash
# deploy-penpot-sidecar.sh
# Déploie le micro-service Penpot Agent comme sidecar du pod open-webui.
set -euo pipefail

NAMESPACE="open-webui"
CONFIGMAP="penpot-agent-service"
SERVICE_PY="$(dirname "$0")/penpot_service.py"

echo "[1/4] Création/mise à jour du ConfigMap..."
kubectl create configmap "$CONFIGMAP" \
  --namespace "$NAMESPACE" \
  --from-file=penpot_service.py="$SERVICE_PY" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "      ✓ ConfigMap $CONFIGMAP mis à jour"

echo ""
echo "[2/4] Application du patch sidecar..."
# Récupérer le nom du volume 'data' existant dans le pod
DATA_VOLUME=$(kubectl get deploy open-webui -n "$NAMESPACE" \
  -o jsonpath='{.spec.template.spec.volumes[?(@.persistentVolumeClaim)].name}' 2>/dev/null || echo "data")

kubectl patch deployment open-webui \
  --namespace "$NAMESPACE" \
  --type=strategic \
  --patch "
spec:
  template:
    spec:
      volumes:
      - name: penpot-agent-code
        configMap:
          name: ${CONFIGMAP}
      containers:
      - name: penpot-agent
        image: ghcr.io/open-webui/open-webui:main
        command:
        - sh
        - -c
        - pip install anthropic -q && python3 -m uvicorn penpot_service:app --host 0.0.0.0 --port 8000 --app-dir /app/penpot
        ports:
        - containerPort: 8000
          name: penpot-agent
        env:
        - name: PENPOT_TOKEN
          value: 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0.1DB04WA3A6UeKt_ijd6Eaf7j1UgxbbcIigVyAMAJIJsqcn30sizaaA.XsWqhZdFBeQwZSF_.aP9GDzuQY1d6L2SrblgP5NG9ZvHbQ7xbOsMLKlxNlXvMXnRS9Pwe8ftu5Vh6-z7nnd3j6OQALlEMVpQss7bsxI6qCakUZh4TvXUZRVQl2dpdzrgnYCvz-HIPXdgez-DjvJbXA4xG8oLHwzzQ7TCKgDjSSAnmbarmg0vYCHuLvrq5D1Sq9KGbtP281oMkEfWul629XABLtzAd.gHQ6JQayWT5JnF880RBbbg'
        - name: PENPOT_BACKEND
          value: 'http://penpot-backend.penpot.svc.cluster.local:6060'
        - name: CONTEXT_PATH
          value: '/data/sharepoint/Service-Marketing'
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: anthropic-api-key
              key: api-key
              optional: true
        volumeMounts:
        - name: penpot-agent-code
          mountPath: /app/penpot
        - name: ${DATA_VOLUME}
          mountPath: /data/sharepoint
        resources:
          requests:
            memory: 64Mi
            cpu: 50m
          limits:
            memory: 256Mi
            cpu: 200m
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 8
          periodSeconds: 15
"
echo "      ✓ Patch appliqué"

echo ""
echo "[3/4] Attente du rollout..."
kubectl rollout status deployment/open-webui -n "$NAMESPACE" --timeout=120s

echo ""
echo "[4/4] Vérification du sidecar..."
POD=$(kubectl get pod -n "$NAMESPACE" -l app=open-webui -o jsonpath='{.items[0].metadata.name}')
echo "      Pod actif : $POD"
sleep 5

# Test health
HEALTH=$(kubectl exec -n "$NAMESPACE" "$POD" -c penpot-agent -- \
  curl -s --max-time 3 http://localhost:8000/health 2>/dev/null || echo '{"status":"not_ready"}')
echo "      Health check : $HEALTH"

# Test action
PROFILE=$(kubectl exec -n "$NAMESPACE" "$POD" -c penpot-agent -- \
  curl -s -X POST http://localhost:8000/action \
    -H "Content-Type: application/json" \
    -d '{"prompt":"get_profile"}' 2>/dev/null || echo '{"error":"not_ready"}')
echo "      Penpot profile : $PROFILE" | head -c 300

echo ""
echo ""
echo "======================================================"
echo " Penpot Agent v3.0 déployé (LLMManager multi-provider) !"
echo " POST /action         → intent parser direct"
echo " POST /v1/orchestrate → Master Agent (LLMManager + Tool Use)"
echo " Providers dispo      → anthropic (actif) | openai (stub) | ollama (stub)"
echo "======================================================"
