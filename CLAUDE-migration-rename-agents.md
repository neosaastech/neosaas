# CLAUDE-migration-rename-agents.md — Plan de migration nommage agents

**Statut** : À exécuter — approuvé 2026-06-01
**Projet Zoho** : NeoKube — Refactoring Architecture Agents v2 (Phase 1)

---

## Règle générale

Un renommage d'agent = mise à jour **atomique** de tous les fichiers listés ci-dessous.
Ne jamais renommer partiellement. Charlotte ou Claude Code peut exécuter ce plan en entier.

---

## Migration 1 — `vera` → `qa-service`

### Mapping exact

| Ancien | Nouveau |
|---|---|
| `vera` | `qa-service` |
| `vera-queue` | `qa-service-queue` |
| `vera_review` (activity Temporal) | `qa_service_review` |
| `VERA_QUEUE` | `QA_SERVICE_QUEUE` |
| `LITELLM_KEY_VERA` | `LITELLM_KEY_QA_SERVICE` |
| `vera-qa` (prompt Langfuse) | `qa-service` |
| `agent-vera` (LiteLLM alias) | `agent-qa-service` |
| `vera@neokube.fr` (Stalwart) | `qa-service@neokube.fr` |
| port 8487 | 8487 (inchangé) |

### Fichiers GitOps à renommer/modifier

```
apps/agent-system/base/
  configmap-vera-script.yaml        → configmap-qa-service-script.yaml
  deployment-vera.yaml              → deployment-qa-service.yaml
  service-vera.yaml                 → service-qa-service.yaml
  serviceaccount-vera.yaml          → serviceaccount-qa-service.yaml
  kustomization.yaml                → remplacer refs vera par qa-service
  configmap-dispatcher-config.yaml  → VERA_QUEUE → QA_SERVICE_QUEUE
  configmap-dispatcher-script.yaml  → vera_review → qa_service_review, "vera-queue" → "qa-service-queue"
  configmap-agent-eval-cron.yaml    → "vera" dans AGENT_KEYS, AGENT_MODELS, FALLBACK_PROMPTS, SCENARIOS
  configmap-agent-policies.yaml     → vera → qa-service
  configmap-agent-registry.yaml     → vera → qa-service
  configmap-sre-script.yaml         → vera.agent-system → qa-service.agent-system (URLs health)

apps/agent-catalog/
  vera.yaml                         → qa-service.yaml (renommer + contenu)
  dispatcher.yaml                   → mettre à jour ref vera → qa-service

apps/interfaces/base/
  configmap-neostudio.yaml          → vera → qa-service dans NEOSTUDIO_AGENTS_CONFIG
```

### Fichiers locaux à modifier

```
scripts/agent_eval_cron.py    → "vera" dans AGENT_KEYS, AGENT_MODELS, FALLBACK_PROMPTS, SCENARIOS
scripts/agent_eval.py         → AgentSpec vera
scripts/charlotte_eval.py     → refs vera
CLAUDE.md                     → table agents, namespaces, budgets LiteLLM
CLAUDE-agents.md              → refs vera
CLAUDE-cluster.md             → refs vera
CLAUDE-neostudio.md           → vera dans agents exposés
CLAUDE-architecture-target.md → vera → qa-service
```

### Langfuse prompts à mettre à jour

```
vera-qa          → renommer en "qa-service" (créer nouvelle version)
charlotte-sre    → AGENTS SSII-DEV : "Vera (QA, 8487)" → "qa-service (QA, 8487)"
leon-pm          → refs vera → qa-service
dispatcher-orchestrator → vera → qa-service
```

### Actions K8s / LiteLLM / Stalwart

```bash
# LiteLLM : créer nouvelle clé agent-qa-service
POST /key/generate {key_alias: "agent-qa-service", models: ["mistral-large-2407"], max_budget: 0.5, budget_duration: "1d"}

# K8s secret litellm-agent-keys : ajouter LITELLM_KEY_QA_SERVICE
kubectl patch secret litellm-agent-keys -n agent-system ...

# CronJob agent-eval-nightly : remplacer LITELLM_KEY_VERA → LITELLM_KEY_QA_SERVICE

# Stalwart : créer compte qa-service@neokube.fr (garder vera@ pour compatibilité 30j)

# Restart pods après migration :
kubectl rollout restart deployment/qa-service -n agent-system
kubectl rollout restart deployment/dispatcher -n agent-system  # recharge QA_SERVICE_QUEUE
```

### Vera script interne (vera.py → qa_service.py)

```python
# Avant                              # Après
TASK_QUEUE = "vera-queue"        →   TASK_QUEUE = "qa-service-queue"
@activity.defn(name="vera_review") → @activity.defn(name="qa_service_review")
log = logging.getLogger("vera")  →   log = logging.getLogger("qa-service")
```

---

## Migration 2 — `dispatcher` → `dev-project-workflow`

### Mapping exact

| Ancien | Nouveau |
|---|---|
| `dispatcher` (K8s nom) | `dev-project-workflow` |
| `DISPATCHER_URL` | `DEV_PROJECT_WORKFLOW_URL` |
| `dispatcher-queue` (Temporal) | `dispatcher-queue` ⚠️ **GARDER** (voir note) |
| Temporal namespace `dispatcher` | `dispatcher` ⚠️ **GARDER** (voir note) |
| port 8484 | 8484 (inchangé) |

> **Note Temporal** : Le Temporal namespace `dispatcher` et la TASK_QUEUE `dispatcher-queue` sont
> partagés avec Camille, Guillaume, Alain, Domi, Vera/qa-service. Les renommer casse tous ces workers.
> → On renomme uniquement les ressources K8s (deployment/service/configmap).
> → Le Temporal namespace sera renommé dans une phase dédiée (Phase 2) avec downtime planifié.

### Fichiers GitOps à renommer/modifier

```
apps/agent-system/base/
  configmap-dispatcher-script.yaml  → configmap-dev-project-workflow-script.yaml
  configmap-dispatcher-config.yaml  → configmap-dev-project-workflow-config.yaml
  deployment-dispatcher.yaml        → deployment-dev-project-workflow.yaml
  service-dispatcher.yaml           → service-dev-project-workflow.yaml
  serviceaccount-dispatcher.yaml    → serviceaccount-dev-project-workflow.yaml
  kustomization.yaml                → remplacer refs dispatcher par dev-project-workflow
  configmap-camille-script.yaml     → DISPATCHER_URL → DEV_PROJECT_WORKFLOW_URL
  configmap-guillaume-script.yaml   → idem
  configmap-alain-script.yaml       → idem
  configmap-domi-config.yaml        → idem
  configmap-leon-config.yaml        → DISPATCHER_URL → DEV_PROJECT_WORKFLOW_URL
  configmap-leon-script.yaml        → refs dispatcher
  configmap-agent-eval-cron.yaml    → "dispatcher" dans AGENT_KEYS, MODELS
  configmap-agent-policies.yaml     → dispatcher → dev-project-workflow
  configmap-agent-registry.yaml     → dispatcher → dev-project-workflow
  configmap-sre-script.yaml         → Charlotte : trigger_dispatcher_workflow → trigger_dev_project_workflow
                                       URL dispatcher → dev-project-workflow

apps/agent-catalog/
  dispatcher.yaml                   → dev-project-workflow.yaml

apps/interfaces/base/
  configmap-neostudio.yaml          → dispatcher → dev-project-workflow

apps/connector-system/base/
  configmap-penpot-engine.yaml      → si ref dispatcher
  configmap-scaleway-engine-script.yaml → si ref dispatcher
```

### Fichiers locaux

```
CLAUDE.md                     → table agents dispatcher → dev-project-workflow
CLAUDE-agents.md              → refs dispatcher
CLAUDE-connector.md           → refs dispatcher
CLAUDE-pipeline.md            → refs dispatcher
CLAUDE-architecture-target.md → dispatcher → dev-project-workflow
scripts/agent_eval_cron.py    → "dispatcher" entries
```

### Langfuse prompts

```
dispatcher-orchestrator   → renommer en "dev-project-workflow" (créer nouvelle version)
charlotte-sre             → trigger_dispatcher_workflow → trigger_dev_project_workflow
                            URL dispatcher → dev-project-workflow
leon-pm                   → refs dispatcher
```

### Actions K8s / Charlotte tools

```python
# charlotte-sre prompt + sre_script.py :
# trigger_dispatcher_workflow(spec) appelle http://dispatcher:8484/trigger
# → trigger_dev_project_workflow(spec) appelle http://dev-project-workflow:8484/run
# Renommer le endpoint /trigger → /run (plus clair)
# Renommer signal /approve, /reject → garder tels quels
```

---

## Ordre d'exécution recommandé

```
1. GitOps : renommer/modifier tous les fichiers YAML
2. K8s apply : kubectl replace -f sur chaque fichier
3. LiteLLM : créer nouvelles clés
4. Langfuse : créer nouvelles versions des prompts
5. Secrets K8s : patcher litellm-agent-keys
6. CronJob eval : mettre à jour les env vars
7. Scripts locaux : modifier + commit
8. CLAUDE-*.md : mettre à jour + sync RAG
9. Restart pods dans l'ordre :
   qa-service → dispatcher/dev-project-workflow → camille → guillaume → alain → domi → charlotte → leon
10. Vérification : health check tous les agents + test workflow end-to-end
```

---

## Vérification post-migration

```bash
# Aucune référence vera (K8s)
kubectl get all -n agent-system | grep vera  # doit être vide

# Aucune référence dispatcher (K8s)
kubectl get all -n agent-system | grep dispatcher  # doit être vide

# qa-service et dev-project-workflow running
kubectl get pods -n agent-system | grep -E "qa-service|dev-project"

# Health checks
curl http://qa-service.agent-system:8487/health
curl http://dev-project-workflow.agent-system:8484/health

# Aucune ref aria/nox/vera/dispatcher dans les scripts actifs
kubectl get configmap dispatcher-script -n agent-system -o jsonpath='{.data.dev_project_workflow\.py}' | grep -c "vera\|dispatcher"  # doit être 0
```
