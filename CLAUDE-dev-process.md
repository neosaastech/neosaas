# CLAUDE-dev-process.md — Process de Développement NeoKube

> Référence normative pour Charlotte, Camille, Guillaume, Alain et l'équipe dev humaine.
> Toute modification de code ou d'infrastructure DOIT suivre cette boucle.

---

## Boucle de développement obligatoire

```
LIRE → DIAGNOSTIQUER → MODIFIER → APPLIQUER → VÉRIFIER → DOCUMENTER
```

Chaque étape est obligatoire. Sauter une étape = anti-pattern.

### 1. LIRE — Avant toute modification

```python
# K8s : lire l'état actuel AVANT d'écrire quoi que ce soit
kubectl get deployment <name> -n <ns> -o yaml          # état live
kubectl describe deployment <name> -n <ns>             # événements
kubectl get pods -n <ns> -l app=<name>                 # pods actuels
cat ~/Kubinote-GitOps/apps/<ns>/base/<manifest>.yaml   # GitOps source
```

**Règle** : si l'état live ≠ GitOps → résoudre la divergence AVANT de modifier.

### 2. DIAGNOSTIQUER — Comprendre avant d'agir

- Lire les logs du pod concerné (`kubectl logs`)
- Lire les events K8s (`kubectl describe pod`)
- Chercher dans le RAG : `k8s-knowledge`, `dev-process`, `sre-charlotte-incidents`
- Consulter CLAUDE-antipatterns.md pour les pièges connus

### 3. MODIFIER — Écrire le changement

**Ordre obligatoire :**
1. Modifier le fichier dans `~/Kubinote-GitOps/` (source de vérité)
2. Valider syntaxe YAML : `python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"` 
3. Valider manifeste K8s : `kubectl apply --dry-run=client -f <file>`

**Jamais :**
- `kubectl edit` directement en production (divergence GitOps immédiate)
- Modifier sans avoir lu l'état actuel
- Changer plusieurs ressources simultanément sans coordination

### 4. APPLIQUER — Déployer

```bash
# Via apply_gitops_fix (Charlotte) — commit + push + kubectl apply atomique
apply_gitops_fix(path="apps/ns/base/deployment.yaml", content="...", commit_message="fix: ...")

# Ou manuellement
git add <file> && git commit -m "fix: description" && git push origin main
kubectl apply -f ~/Kubinote-GitOps/apps/<ns>/base/<file>.yaml
```

**Attendre 30 secondes** avant de vérifier (rollout time).

### 5. VÉRIFIER — Confirmer le déploiement

```bash
kubectl rollout status deployment/<name> -n <ns> --timeout=120s
kubectl get pods -n <ns> -l app=<name>           # tous Running ?
kubectl logs -n <ns> <pod> --tail=20             # pas d'erreur ?
curl -s http://<service>.<ns>.svc.cluster.local:<port>/health  # 200 ?
```

**Si KO → rollback immédiat :**
```bash
kubectl rollout undo deployment/<name> -n <ns>
```
Puis analyser la cause avant de ré-essayer.

**RÈGLE ABSOLUE** : `verify_pod_healthy` après chaque `apply_gitops_fix`. Sans exception.

### 6. DOCUMENTER — Capitaliser

```python
# Charlotte : stocker dans charlotte-memory après toute mission réussie
_memory_store(
    content="[EXPERIENCE] Problème: {description}\nCause: {root_cause}\nFix: {solution}\nCommande: {cmd}",
    mem_type="experience",
    score=8.5
)
```

---

## Standards K8s NeoKube

### Template Deployment obligatoire

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <agent-name>
  namespace: <namespace>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <agent-name>
  template:
    metadata:
      labels:
        app: <agent-name>
    spec:
      serviceAccountName: sa-<agent-name>
      containers:
      - name: <agent-name>
        image: python:3.12-slim
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        # Probes OBLIGATOIRES — sans probe, K8s ne sait pas si l'app tourne
        readinessProbe:
          httpGet:
            path: /health
            port: <port>
          initialDelaySeconds: 10
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /health
            port: <port>
          initialDelaySeconds: 30
          periodSeconds: 30
          failureThreshold: 3
        envFrom:
        - configMapRef:
            name: <agent-name>-config
        ports:
        - containerPort: <port>
```

### Probes — règles

| Type | Rôle | Sans probe |
|---|---|---|
| `readinessProbe` | Le pod reçoit du trafic ? | Trafic envoyé avant que l'app soit prête → erreurs 502 |
| `livenessProbe` | L'app répond encore ? | Pod zombie non redémarré → service mort silencieux |
| `startupProbe` | Utile si démarrage long (>30s) | Liveness tue le pod avant qu'il soit prêt |

**Règle** : tout pod exposant un endpoint HTTP doit avoir readiness + liveness sur `/health`.

### Resource limits — barème NeoKube

| Type d'agent | Memory request | Memory limit | CPU request | CPU limit |
|---|---|---|---|---|
| Agent conversationnel (CLASS A) | 512Mi | 1Gi | 200m | 500m |
| Builder Temporal (CLASS B) | 256Mi | 512Mi | 100m | 500m |
| SRE Charlotte | 1Gi | 2Gi | 500m | 1000m |
| Connector/Engine | 128Mi | 256Mi | 50m | 200m |
| CronJob one-shot | 128Mi | 256Mi | 50m | 200m |

### ServiceAccount + RBAC — template

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa-<agent-name>
  namespace: <namespace>
---
# Pas de ClusterRole sauf si absolument nécessaire — toujours namespace-scoped
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: role-<agent-name>
  namespace: <namespace>
rules:
- apiGroups: [""]
  resources: ["pods", "configmaps"]
  verbs: ["get", "list", "watch"]
```

### CronJob — anti-patterns critiques

```yaml
# ✅ CORRECT
spec:
  schedule: "0 2 * * *"
  timeZone: "Europe/Paris"   # toujours expliciter
  concurrencyPolicy: Forbid  # évite les doublons
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure  # jamais Always dans un Job
          containers:
          - name: job
            env:
            - name: TEMPORAL_HOST
              value: "temporal.agent-system.svc.cluster.local:7233"  # ✅ bon endpoint

# ❌ JAMAIS
# - temporal-frontend.temporal-system.svc.cluster.local (n'existe pas)
# - restartPolicy: Always dans un Job
# - concurrencyPolicy: Allow (doublons)
```

---

## Standards Python — Agents NeoKube

### FastAPI — template endpoint

```python
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel

app = FastAPI(title="NeoKube <AgentName>")

class MissionRequest(BaseModel):
    message: str                    # TOUJOURS message, jamais mission
    session_id: str | None = None
    interface: str = "openwebui"
    context: dict = {}

# Routes spécifiques AVANT le catch-all (anti-pattern #62)
@app.get("/health")
def health():
    return {"status": "ok", "agent": AGENT_NAME, "version": VERSION}

@app.post("/mission")
async def mission(body: MissionRequest):
    ...

# Catch-all EN DERNIER si besoin
@app.api_route("/{path:path}", methods=["GET","POST"])
async def proxy(path: str, request: Request):  # request.method (anti-pattern #63)
    ...
```

### PydanticAI — pattern agent

```python
from pydantic_ai import Agent
from pydantic_ai.models.fallback import FallbackModel

# FallbackModel : toujours prévoir 2+ modèles
agent = Agent(
    model=FallbackModel(
        "openai:gpt-4o",          # primaire
        "mistral:mistral-large",  # fallback
    ),
    system_prompt=SYSTEM_PROMPT,
    retries={"tools": 2},         # pas tool_retries= (deprecated)
)
```

### Temporal — pattern worker

```python
from temporalio.client import Client
from temporalio.worker import Worker

async def main():
    client = await Client.connect(
        os.getenv("TEMPORAL_HOST", "temporal.agent-system.svc.cluster.local:7233"),
        namespace=os.getenv("TEMPORAL_NAMESPACE", "dispatcher"),
    )
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        activities=[my_activity],   # lister toutes les activités
        workflows=[MyWorkflow],
        workflow_runner=UnsandboxedWorkflowRunner(),
    )
    # Toujours combiner avec le serveur HTTP (asyncio.gather)
    config = uvicorn.Config(app, host="0.0.0.0", port=AGENT_PORT)
    server = uvicorn.Server(config)
    await asyncio.gather(worker.run(), server.serve())
```

### httpx — pattern appel service interne

```python
import httpx

# Timeout explicite TOUJOURS
async with httpx.AsyncClient(timeout=30.0) as c:
    r = await c.post(
        f"{SERVICE_URL}/endpoint",
        json={"message": "...", **context},  # message pas mission
    )
if r.status_code not in (200, 201):
    raise RuntimeError(f"Service {r.status_code}: {r.text[:200]}")
return r.json()
```

### Logging — pattern standard

```python
import logging
log = logging.getLogger(AGENT_NAME)
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s — %(message)s"
)
# Langfuse trace sur chaque appel LLM
json={"model": LLM_MODEL, "messages": messages, "user": AGENT_NAME,
      "metadata": {"agent": AGENT_NAME, "workflow": workflow_name}}
```

---

## Standards CI/CD NeoKube

### GitHub Actions — workflow type agent

```yaml
name: Build & Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Build & push image
      uses: docker/build-push-action@v5
      with:
        push: true
        tags: ghcr.io/neomnia/<agent>:latest,ghcr.io/neomnia/<agent>:${{ github.sha }}
    - name: Deploy K8s
      run: |
        curl -X POST https://ops.neokube.fr/execute \
          -H "X-Admin-Sys-Token: ${{ secrets.ADMIN_SYS_TOKEN }}" \
          -d '{"command": "kubectl rollout restart deployment/<agent> -n <ns>"}'
```

### Rollout strategy

```yaml
# Deployment — stratégie progressive obligatoire pour les agents avec état
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0    # jamais de downtime
    maxSurge: 1          # 1 pod en plus pendant le rollout
```

### Rollback procedure

```bash
# 1. Identifier la révision stable
kubectl rollout history deployment/<name> -n <ns>

# 2. Rollback à la révision précédente
kubectl rollout undo deployment/<name> -n <ns>

# 3. Ou rollback à une révision spécifique
kubectl rollout undo deployment/<name> -n <ns> --to-revision=<N>

# 4. Vérifier
kubectl rollout status deployment/<name> -n <ns>
```

---

## Checklist déploiement — obligatoire avant merge/apply

- [ ] Lu l'état actuel (kubectl get / describe)
- [ ] Lu le fichier GitOps existant
- [ ] Syntaxe YAML valide (`--dry-run=client`)
- [ ] Probes définies (readiness + liveness)
- [ ] Resource limits définies
- [ ] ServiceAccount dédié (pas default)
- [ ] Endpoint Temporal correct (`temporal.agent-system.svc.cluster.local:7233`)
- [ ] `apply_gitops_fix` + `verify_pod_healthy` enchaînés
- [ ] `/health` répond 200 après déploiement
- [ ] Expérience stockée dans `{agent}-memory` (type=experience)

---

## Collections RAG disponibles pour les agents dev

| Collection | Contenu | Requête type |
|---|---|---|
| `k8s-knowledge` | Docs K8s officielles, best practices | "readinessProbe configuration" |
| `temporal-knowledge` | Temporal Python SDK, patterns NeoKube | "workflow nondeterminism error" |
| `python-agent-patterns` | FastAPI, PydanticAI, httpx patterns | "FallbackModel PydanticAI" |
| `dev-process` | Cette doc + anti-patterns | "boucle développement" |
| `neokube-architecture` | CLAUDE-*.md indexés | "zoho-engine endpoint" |
| `sre-charlotte-incidents` | Incidents résolus | "embed-service crash" |

---

## Anti-patterns critiques dev K8s (rappel rapide)

| # | Piège | Règle |
|---|---|---|
| K8s-1 | Modifier sans lire l'état actuel | Toujours `kubectl get -o yaml` avant |
| K8s-2 | Déployer sans probe | readiness + liveness obligatoires |
| K8s-3 | `kubectl edit` en prod | Toujours passer par GitOps |
| K8s-4 | CronJob endpoint Temporal mauvais | `temporal.agent-system.svc.cluster.local:7233` |
| K8s-5 | `restartPolicy: Always` dans Job | Utiliser `OnFailure` |
| K8s-6 | Pas de `verify_pod_healthy` après apply | Toujours vérifier après déploiement |
| K8s-7 | Resource limits absentes | OOMKilled sans warning |
| K8s-8 | Pas de rollback plan | Tester `rollout undo` avant besoin |
| Py-1 | `mission` au lieu de `message` dans body | Champ s'appelle `message` |
| Py-2 | Route catch-all avant `/health` | `/health` en premier (anti-pattern #62) |
| Py-3 | `method: str` query param | Utiliser `request.method` (anti-pattern #63) |
| Py-4 | `tool_retries=` dans Agent() | Utiliser `retries={"tools": N}` (deprecated) |
