# CLAUDE-vault.md — Carte complète Vault NeoKube

## Règle absolue avant de déclarer un secret "manquant"

**Toujours consulter ce fichier avant de conclure qu'une clé n'est pas dans Vault.**

Les K8s secrets marqués **[sync]** sont des *outputs générés automatiquement* depuis Vault.
Leur présence en K8s ne signifie pas qu'ils sont "hors Vault" — ils EN VIENNENT.

```
Vault (source of truth)
  └─ llm-key-sync CronJob (cockpit, toutes les heures)
       ├─ openai-secret       (cockpit) ← OUTPUT
       ├─ anthropic-secret    (cockpit) ← OUTPUT
       └─ cockpit-secrets     (cockpit) ← OUTPUT partiel (MISTRAL + GEMINI)
```

---

## Chemins Vault actifs — `secret/neokube/`

### Clés LLM — source unique pour tous les providers

| Chemin | Clés | K8s secret(s) résultants | Mécanisme |
|---|---|---|---|
| `secret/neokube/llm-api-keys` | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY` | `openai-secret` (cockpit) [sync], `anthropic-secret` (cockpit) [sync], `cockpit-secrets` MISTRAL+GEMINI (cockpit) [sync] | CronJob `llm-key-sync` — toutes les heures |
| `secret/neokube/llm-key-status` | `openai`, `anthropic`, `mistral`, `gemini` (JSON status + timestamp) | — | Écrit par CronJob `llm-key-validation` (6h30 UTC) |

> `openai-secret` et `anthropic-secret` en K8s sont des outputs gérés. Ne **jamais** les modifier manuellement — le prochain sync les écraserait. Pour changer une clé : `vault kv patch secret/neokube/llm-api-keys OPENAI_API_KEY="<new>"`.

---

### Image registry — pull secret GHCR

| K8s secret | Namespace | Origine Vault | Sync |
|---|---|---|---|
| `ghcr-pull-secret` | `agent-system` | `infrastructure/github.GITHUB_TOKEN` | CronJob `registry-sync` (management) |

**Usage** : pull de `ghcr.io/neomnia/neokube-agent-base:latest` depuis les deployments agents.
**Renouvellement** : le CronJob `registry-sync` recrée le secret chaque nuit depuis Vault.

```bash
# Créer manuellement (bootstrap ou urgence)
GITHUB_TOKEN=$(kubectl exec -n security vault-0 -- vault kv get -field=GITHUB_TOKEN secret/neokube/infrastructure/github)
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=neomnia \
  --docker-password="$GITHUB_TOKEN" \
  -n agent-system --dry-run=client -o yaml | kubectl apply -f -
```

> **Règle** : ne jamais hardcoder le GITHUB_TOKEN dans un manifest GitOps — toujours lire depuis Vault au runtime.

---

### Infrastructure — connectors et services externes

| Chemin | Clés principales | Consommateur |
|---|---|---|
| `secret/neokube/infrastructure/cloudflare` | `CF_GLOBAL_KEY`, `CF_API_TOKEN`, `CF_DNS_TOKEN`, `CF_ACCOUNT_EMAIL`, `CF_ACCOUNT_ID` | cloudflare-connector (8006) |
| `secret/neokube/infrastructure/github` | `GITHUB_TOKEN` | github-connector (8001) |
| `secret/neokube/infrastructure/vercel` | `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | vercel-connector (8002) |
| `secret/neokube/infrastructure/neon` | `NEON_API_KEY` | neon-connector (8003) |
| `secret/neokube/infrastructure/zoho` | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNTS_SERVER`, `ZOHO_PORTAL_ID` | zoho-engine (8000) → `leon-zoho-secrets` + `zoho-secrets` (agent-system) [manuels] |
| `secret/neokube/infrastructure/penpot` | `PENPOT_EMAIL`, `PENPOT_PASSWORD` | penpot-connector (8004) |
| `secret/neokube/infrastructure/openprovider` | `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` | openprovider-connector (8005) |
| `secret/neokube/infrastructure/scaleway` | `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_ORG_ID`, `SCW_DEFAULT_PROJECT_ID`, `SCW_DEFAULT_REGION/ZONE`, `SCW_TEM_SMTP_HOST/PORT/USER/PASS` | Charlotte (Vault agent injection), stalwart relay, CronJobs billing/audit (via `scaleway-billing-secret`) |
| `secret/neokube/infrastructure/langfuse` | `LANGFUSE_PUBLIC_KEY` (`pk-lf-b1a84594…`), `LANGFUSE_SECRET_KEY` | `cluster-manager-secrets` (agent-system) [manuel], sidecars tool-validator/output-guard |
| `secret/neokube/infrastructure/litellm` | `LITELLM_MASTER_KEY` | LiteLLM, `cockpit-secrets` |
| `secret/neokube/infrastructure/google` | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CX_ID` | google-discovery-connector (8008) |
| `secret/neokube/infrastructure/dataforseo` | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_API_KEY` | dataforseo-connector (8010) |
| `secret/neokube/infrastructure/openwebui` | `OPENWEBUI_EMAIL`, `OPENWEBUI_PASSWORD` | Charlotte (accès Open WebUI) |
| `secret/neokube/infrastructure/qdrant` | _(credentials Qdrant)_ | agents RAG |

---

### Applications — services internes

| Chemin | Clés principales | Consommateur |
|---|---|---|
| `secret/neokube/apps/stalwart` | `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `DKIM_PUBKEY_DNS`, `NOREPLY_PASSWORD` | stalwart-connector (8007) |
| `secret/neokube/apps/ntfy` | `NTFY_ADMIN_PASSWORD`, `NTFY_AGENT_PASSWORD`, `NTFY_TOPIC` | `ntfy-agent-secret` (cockpit + interfaces) [manuel] |
| `secret/neokube/apps/surfsense` | `SECRET_KEY`, `DB_PASSWORD`, `ZERO_ADMIN_PASSWORD`, `SEARXNG_SECRET` | namespace surfsense |
| `secret/neokube/apps/monitoring` | `GRAFANA_ADMIN_PASSWORD`, `SMTP_PASSWORD` | namespace monitoring |
| `secret/neokube/apps/notion` | `NOTION_TOKEN` | notion-connector |

---

### Agents — virtual keys LiteLLM + identité

> Chemin standard : `secret/neokube/agents/{name}/llm`

| Chemin | Clés | K8s secret résultant |
|---|---|---|
| `secret/neokube/agents/{name}/llm` | `LITELLM_API_KEY` (virtual key), `LLM_MODEL`, `BUDGET_EUR` | `litellm-agent-keys` (agent-system) clé `LITELLM_KEY_{NAME}` [manuel] |
| `secret/neokube/agents/{name}/credentials` | `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | `cluster-manager-secrets` (agent-system) [manuel] |
| `secret/neokube/agents/{name}/config` | `AGENT_ID`, ... | — |

Agents avec sous-chemins actifs : `charlotte`, `leon`, `dispatcher`, `aria`, `nox`, `vera`, `penpot`, `domi`, `neo`, `admin-sys`.

---

## K8s secrets et leur origine Vault

| K8s secret | Namespace | Origine Vault | Sync |
|---|---|---|---|
| `openai-secret` | cockpit | `llm-api-keys.OPENAI_API_KEY` | ✅ CronJob llm-key-sync |
| `anthropic-secret` | cockpit | `llm-api-keys.ANTHROPIC_API_KEY` | ✅ CronJob llm-key-sync |
| `cockpit-secrets` | cockpit | `llm-api-keys` (MISTRAL+GEMINI) + `infrastructure/litellm` + `infrastructure/langfuse` | ✅ CronJob llm-key-sync (partiel) |
| `cluster-manager-secrets` | agent-system | `infrastructure/langfuse` | Manuel |
| `litellm-agent-keys` | agent-system | `agents/{name}/llm.LITELLM_API_KEY` | Manuel |
| `leon-zoho-secrets` | agent-system | `infrastructure/zoho` | Manuel |
| `zoho-secrets` | agent-system | `infrastructure/zoho` | Manuel |
| `ntfy-agent-secret` | cockpit, interfaces | `apps/ntfy.NTFY_AGENT_PASSWORD` | Manuel |
| `vault-root-token` | connector-system, agent-system | `vault-init-keys` (security) | Manuel (bootstrap) |
| `scaleway-billing-secret` | management | `infrastructure/scaleway.SCW_SECRET_KEY + SCW_ORG_ID` | Manuel + **Vault agent injection** sur Charlotte |

> **`scaleway-billing-secret`** : source pour les CronJobs billing/audit (management). Charlotte, elle, ne lit PAS ce secret via kubectl — ses credentials Scaleway arrivent via **Vault agent injection** (`/vault/secrets/scaleway` sourcé au démarrage → env vars `SCW_SECRET_KEY` et `SCW_ORG_ID`).

---

## Vault Agent Injection — Charlotte

Charlotte est le **premier agent** avec une injection Vault agent native (depuis 2026-05-19).

| Composant | Valeur |
|---|---|
| Vault role | `charlotte` (kubernetes auth, SA `agent-sre-sa` / `agent-system`) |
| Vault policy | `charlotte-policy` : `read secret/neokube/infrastructure/scaleway` |
| Secret injecté | `secret/neokube/infrastructure/scaleway` → `/vault/secrets/scaleway` |
| Mécanisme | `vault.hashicorp.com/agent-inject: "true"` + `agent-pre-populate-only: "true"` (init container) |
| Sourcing | Script démarrage Charlotte : `. /vault/secrets/scaleway` → `SCW_SECRET_KEY`, `SCW_ORG_ID` en env vars |

**Règle** : Charlotte ne doit JAMAIS lire un secret K8s via `kubectl get secret` pour en extraire une valeur et l'utiliser dans du code. Toujours passer par une env var injectée par Vault, ou par un outil dédié (`scw_org_id()`) qui lit l'env var.

```bash
# Modifier les credentials Scaleway → propagation automatique au prochain redémarrage Charlotte
vault kv patch secret/neokube/infrastructure/scaleway SCW_SECRET_KEY="<new>"
# Pour forcer la mise à jour immédiate :
kubectl rollout restart deployment/agent-charlotte -n agent-system
```

---

## Comment modifier une clé

```bash
# Clé LLM (OPENAI, ANTHROPIC, MISTRAL, GEMINI) — sera propagée à la prochaine heure
vault kv patch secret/neokube/llm-api-keys OPENAI_API_KEY="<new>"

# Forcer la propagation immédiate
kubectl create job --from=cronjob/llm-key-sync llm-key-sync-manual -n cockpit

# Clé infrastructure (cloudflare, github, vercel…)
vault kv patch secret/neokube/infrastructure/cloudflare CF_DNS_TOKEN="<new>"

# Virtual key LiteLLM d'un agent
vault kv patch secret/neokube/agents/leon/llm LITELLM_API_KEY="<new>"
kubectl patch secret litellm-agent-keys -n agent-system --type='json' \
  -p='[{"op":"replace","path":"/data/LITELLM_KEY_LEON","value":"'$(echo -n "<new>" | base64 -w0)'"}]'
```

---

## Règle absolue — secret leak prevention

**Un agent NE doit JAMAIS** :
1. Appeler `kubectl get secret ... -o json/yaml` et inclure le résultat dans sa réponse texte
2. Afficher en clair une valeur de secret, clé API, ou mot de passe dans sa réponse

**Le bon pattern** :
```
Vault (source of truth)
  └─ Vault agent injection (init container, agent-pre-populate-only)
       └─ /vault/secrets/<name> (fichier exporté)
            └─ . /vault/secrets/<name> (sourcé au démarrage)
                 └─ os.environ["VAR"] (lu par le code Python)
```

Si un outil a besoin d'un secret → lire `os.environ.get("VAR")`, jamais `kubectl get secret`.  
Si l'env var est absente → fallback kubectl avec **redaction guard** (base64 masqué en `[SECRET_REDACTED]`).

---

## Gaps ouverts (P2/P3)

| Gap | Description | Impact |
|---|---|---|
| ~~P3~~ ✅ | ~~Vault Agent Injector — seul Leon utilisait les annotations~~ | Charlotte utilise Vault agent depuis 2026-05-19 |
| ~~P2~~ ✅ | ~~Pas de kubernetes auth role pour Charlotte~~ | Rôle `charlotte` créé, policy `charlotte-policy` |
| P2 | Policies Vault par agent — `leon-policy` scope trop large (`all neokube/*`) | Moindre privilège non appliqué pour Leon |
| P2 | Root token utilisé par les autres agents (connector-system) | `vault-root-token` secret = SPOF sécurité |
| P3 | Vault Agent Injection à généraliser — Leon, Dispatcher, Aria, Nox ont encore des secrets manuels | Pattern à reproduire sur chaque agent |
