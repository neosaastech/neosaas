# CLAUDE-agents.md — Architecture sécurité des agents NeoKube

## Identité d'agent — modèle NeoKube

Chaque agent NeoKube possède une **identité complète et cohérente** à travers toute la stack. Ces données sont la source de vérité pour la traçabilité Langfuse, les droits d'accès K8s, et la communication mail.

### Matrice d'identité

| Agent | Mail (`MAIL_FROM`) | Stalwart | K8s SA | RBAC effectif | Sidecars | Langfuse `user_id` | Open WebUI |
|---|---|---|---|---|---|---|---|
| **Charlotte** | `charlotte@neokube.fr` | ✅ | `agent-sre-sa` | `agent-sre-role` | ✅ | `charlotte` | — |
| **Leon** | `leon@neokube.fr` | ✅ | `leon-sa` | read-only agent-system | ✅ | `leon` | — |
| **Dispatcher** | `no-reply@neokube.fr` | ✅ | `dispatcher-sa` | aucun | ✅ | `dispatcher` | — |
| **Vera** | `vera@neokube.fr` | ✅ | `vera-sa` | aucun | ❌ gap | `vera` | — |
| **Domi** | `domi@neokube.fr` | ✅ | `domi-sa` | aucun | ❌ gap | `domi` | — |
| **Neo** | `neo@neokube.fr` | ✅ SMTP+IMAP | `neo-sa` | aucun | ❌ gap | `neo` | **✅ master** |
| **Aria** | — | ❌ gap | `aria-sa` | aucun | ❌ gap | `aria` | — |
| **Nox** | — | ❌ gap | `nox-sa` | aucun | ❌ gap | `nox` | — |
| **Penpot** | — | — | `penpot-sa` | aucun | ❌ gap | `penpot` | — |

> **Agents OWU-facing** — toute interaction humaine passe exclusivement par Open WebUI :
> - **Charlotte** : Pipe SSE `charlotte_sre` — `/mission/stream` (Pattern A). Interface toujours `"openwebui"`.
> - **Neo** : endpoint OpenAI-compat `/v1/chat/completions` (Pattern B). Agent maître côté humain, accès tous connectors + polling IMAP `neo@neokube.fr`.
>
> Les autres agents (Aria, Nox, Vera, Penpot, Domi, Dispatcher, Leon) sont des workers Temporal ou des services HTTP internes — ils ne sont **jamais** exposés directement à l'utilisateur via OWU.

### Règle : cohérence identité sur les 5 dimensions

```
Vault  ──→  env var (MAIL_FROM, MAIL_PASSWORD, PERMISSIONS_SCOPE)
             ──→  appel LiteLLM  (user=AGENT_NAME, metadata inclut agent_email + scope)
                  ──→  Langfuse  (trace filtrable par user_id = nom agent, email + scope visibles)
                       ──→  Prompt Langfuse  (system prompt versionné, référencé dans chaque trace)
                            ──→  Score Langfuse  (rattaché à la trace via traceId résolu)
```

L'adresse mail de l'agent dans Langfuse **doit correspondre** au compte Stalwart actif. Si le compte Stalwart n'existe pas, ne pas déclarer de `MAIL_FROM`.

### Variables d'identité obligatoires par agent

```yaml
# ── Identité agent ────────────────────────────────────────────────────
- name: AGENT_NAME
  value: "{name}"                          # slug lowercase — stable, jamais modifié
- name: AGENT_EMAIL
  value: "{name}@neokube.fr"              # identité Langfuse + expéditeur mail
- name: MAIL_FROM
  value: "{name}@neokube.fr"              # = AGENT_EMAIL pour les agents qui envoient des mails
- name: MAIL_PASSWORD
  valueFrom:
    secretKeyRef:
      name: agent-mail-secrets            # secret K8s agent-system (Vault → agent-mail-secrets)
      key: MAIL_PASSWORD_{NAME_UPPER}
      optional: true                      # optional=true si l'agent n'envoie pas de mail
- name: PERMISSIONS_SCOPE
  value: "{scope}"                        # ex: "github+vercel" | "zoho+qdrant" | "llm_chat" | "all"
```

> `MAIL_PASSWORD` est lu depuis Vault path `secret/neokube/agents/{name}/mail` — clé `MAIL_PASSWORD`. Provisionner via : `kubectl exec -n security vault-0 -- vault kv put secret/neokube/agents/{name}/mail MAIL_PASSWORD="<pass>"`.

### Pattern LiteLLM — identité complète dans chaque appel

```python
AGENT_NAME        = os.getenv("AGENT_NAME",        "{name}")
AGENT_EMAIL       = os.getenv("AGENT_EMAIL",        "{name}@neokube.fr")
PERMISSIONS_SCOPE = os.getenv("PERMISSIONS_SCOPE",  "")

async def call_llm(messages: list, workflow: str = "") -> str:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model":    LLM_MODEL,
                "messages": messages,
                "user":     AGENT_NAME,          # → user_id Langfuse (filtrable)
                "metadata": {
                    "agent":             AGENT_NAME,
                    "agent_email":       AGENT_EMAIL,    # visible dans trace Langfuse
                    "permissions_scope": PERMISSIONS_SCOPE,
                    "workflow":          workflow,
                }
            }
        )
    return r.json()["choices"][0]["message"]["content"]
```

Ce pattern garantit que **chaque trace Langfuse** porte l'identité complète de l'agent : nom, email, périmètre de permissions, workflow en cours.

---

## Principe : sidecar de sécurité

Chaque agent de production exécute **deux sidecars** co-localisés dans le même pod :

| Sidecar | Port | Rôle |
|---|---|---|
| `tool-validator` | 8090 | Bloque les appels outils interdits avant exécution |
| `output-guard` | 8091 | Valide la structure JSON de la sortie de l'agent (mode warn) |

Les scripts vivent dans le ConfigMap `sidecar-scripts` (namespace `agent-system`).
Les policies vivent dans le ConfigMap `agent-policies` (namespace `agent-system`).

**GitOps** :
- `apps/agent-system/base/configmap-sidecar-scripts.yaml` — code `tool_validator.py` + `output_guard.py`
- `apps/agent-system/base/configmap-agent-policies.yaml` — policies JSON par agent

---

## État courant — qui a des sidecars

| Agent | tool-validator | output-guard | Note |
|---|---|---|---|
| Charlotte | ✅ | ✅ | |
| Leon | ✅ | ✅ | |
| Dispatcher | ✅ | ✅ | |
| Aria | ❌ | ❌ | **Gap — à ajouter** |
| Nox | ❌ | ❌ | **Gap — à ajouter** |
| Vera | ❌ | ❌ | **Gap — à ajouter** |
| Penpot | ❌ | ❌ | **Gap — à ajouter** |
| Domi | ❌ | ❌ | **Gap — à ajouter** |
| Neo | ❌ | ❌ | **Gap — à ajouter** |

> Priorité : Aria et Nox en premier (accès GitHub/Vercel/Neon = surface large).

---

## tool-validator — logique de décision

```
POST /validate {agent, tool, args}
→ {allowed: bool, reason: str}
```

**Ordre d'évaluation** (le premier match l'emporte) :

1. Aucune policy pour cet agent → `allowed=true` (log + trace Langfuse)
2. `tool` dans `forbidden` → `allowed=false` (le message de la policy comme raison)
3. `tool == run_kubectl` ET subcommande dans `kubectl_forbidden_subcommands` → `allowed=false`
4. `allowed` est une liste ET `tool` n'y est pas → `allowed=false`
5. Sinon → `allowed=true`

Chaque décision est tracée vers Langfuse (event `tool_validator`) si les clés LF sont présentes.

---

## output-guard — logique de validation

```
POST /validate {agent, output}
→ {valid: bool, errors: [str]}
```

Mode **warn** uniquement — ne bloque pas. L'agent continue même si `valid=false`.
Les erreurs sont tracées vers Langfuse (event `output_guard`).

**Schémas enregistrés** :

| Agent | Champs requis | Types vérifiés |
|---|---|---|
| `leon` | `summary` | `summary: str`, `actions: list`, `next_steps: list` |
| `charlotte` | `answer`, `session_id` | `answer: str`, `steps: list`, `session_id: str` |

Agents sans schéma (Dispatcher, Aria, Nox, Vera, Penpot, Domi, Neo) : `valid=true` par défaut.
Pour ajouter un schéma, modifier `SCHEMAS` dans `output_guard.py` (ConfigMap `sidecar-scripts`).

---

## Policies par agent (`configmap-agent-policies.yaml`)

### Structure d'une policy

```json
{
  "agent_name": {
    "allowed": null,                        // null = pas de restriction par liste
    "forbidden": {                          // toujours évalué en premier
      "tool_name": "raison humaine"
    },
    "kubectl_forbidden_subcommands": [],    // pour les agents avec run_kubectl
    "known_tools": [],                      // inventaire documentaire uniquement
    "note": "..."
  }
}
```

### Policies actives

| Agent | `allowed` | Forbidden notables |
|---|---|---|
| `charlotte` | `null` (tous les outils) | `kubectl delete/exec/cp/port-forward` |
| `dispatcher` | `null` (tous les outils) | — |
| `leon` | allowlist stricte (11 outils) | Tous les outils github/vercel/neon + `vault_write` |
| `aria` | `[github_*, vercel_create_project]` | — |
| `nox` | `[github_*, neon_*]` | — |
| `vera` | `[llm_chat]` | `github_push_file`, `vercel_create_project`, `neon_create_project` |

---

## Ajouter des sidecars à un déploiement

Ajouter dans `spec.template.spec.containers` du déploiement, **après** le container principal :

```yaml
      # ── Sidecar : tool-validator (port 8090) ─────────────────────────────
      - name: tool-validator
        image: python:3.12-slim
        imagePullPolicy: IfNotPresent
        command:
        - sh
        - -c
        - |
          pip install --quiet --no-cache-dir fastapi "uvicorn[standard]" httpx pydantic
          python /sidecar-scripts/tool_validator.py
        ports:
        - name: validator
          containerPort: 8090
          protocol: TCP
        env:
        - name: LANGFUSE_BASE_URL
          value: "http://langfuse.cockpit.svc.cluster.local:3000"
        - name: LANGFUSE_PUBLIC_KEY
          value: "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
        - name: LANGFUSE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: cluster-manager-secrets
              key: LANGFUSE_SECRET_KEY
              optional: true
        - name: POLICIES_PATH
          value: /policies/policies.json
        resources:
          requests:
            cpu: 10m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8090
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8090
          initialDelaySeconds: 20
          periodSeconds: 10
        volumeMounts:
        - name: sidecar-scripts
          mountPath: /sidecar-scripts
          readOnly: true
        - name: agent-policies
          mountPath: /policies
          readOnly: true

      # ── Sidecar : output-guard (port 8091) ───────────────────────────────
      - name: output-guard
        image: python:3.12-slim
        imagePullPolicy: IfNotPresent
        command:
        - sh
        - -c
        - |
          pip install --quiet --no-cache-dir fastapi "uvicorn[standard]" httpx pydantic
          python /sidecar-scripts/output_guard.py
        ports:
        - name: guard
          containerPort: 8091
          protocol: TCP
        env:
        - name: LANGFUSE_BASE_URL
          value: "http://langfuse.cockpit.svc.cluster.local:3000"
        - name: LANGFUSE_PUBLIC_KEY
          value: "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
        - name: LANGFUSE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: cluster-manager-secrets
              key: LANGFUSE_SECRET_KEY
              optional: true
        resources:
          requests:
            cpu: 10m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8091
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8091
          initialDelaySeconds: 20
          periodSeconds: 10
        volumeMounts:
        - name: sidecar-scripts
          mountPath: /sidecar-scripts
          readOnly: true
```

Ajouter dans `spec.template.spec.volumes` (si pas déjà présents) :

```yaml
      - name: sidecar-scripts
        configMap:
          name: sidecar-scripts
      - name: agent-policies
        configMap:
          name: agent-policies
```

Ajouter la policy dans `configmap-agent-policies.yaml` :

```json
"nom_agent": {
  "allowed": ["outil1", "outil2"],
  "note": "description du périmètre"
}
```

---

## Appeler les sidecars depuis le code agent

Les sidecars sont accessibles via `localhost` (même pod) :

```python
import httpx

async def _check_tool(agent: str, tool: str, args: dict) -> bool:
    try:
        r = await httpx.AsyncClient(timeout=2).post(
            "http://localhost:8090/validate",
            json={"agent": agent, "tool": tool, "args": args}
        )
        result = r.json()
        if not result["allowed"]:
            log.warning("tool blocked by validator: %s — %s", tool, result["reason"])
        return result["allowed"]
    except Exception:
        return True  # fail-open si le sidecar est down

async def _guard_output(agent: str, output: dict) -> dict:
    try:
        r = await httpx.AsyncClient(timeout=2).post(
            "http://localhost:8091/validate",
            json={"agent": agent, "output": output}
        )
        result = r.json()
        if not result["valid"]:
            output["_guard_errors"] = result["errors"]
        return output
    except Exception:
        return output  # fail-open
```

> **Fail-open** : si un sidecar est down au démarrage (pip install en cours, ~30s), l'appel échoue silencieusement. Ne jamais bloquer l'agent principal sur un timeout sidecar.

---

## Checklist — ajouter des sidecars à un agent existant

1. Vérifier si l'agent a déjà une policy dans `configmap-agent-policies.yaml`
2. Si non : définir `allowed` (liste stricte) + `forbidden` (ce qui ne doit jamais passer)
3. Ajouter les deux blocs sidecar dans `deployment-<agent>.yaml`
4. Ajouter les deux volumes `sidecar-scripts` + `agent-policies` dans `spec.volumes`
5. `kubectl apply -f apps/agent-system/base/configmap-agent-policies.yaml -n agent-system`
6. `kubectl apply -f apps/agent-system/base/deployment-<agent>.yaml -n agent-system`
7. Vérifier : `kubectl get pod -n agent-system -l app=<agent>` → 3 containers READY

---

## Synchronisation Langfuse — état et inventaire

### Prompts enregistrés (état 2026-05-06)

| Prompt Langfuse | Agent | Version | Labels |
|---|---|---|---|
| `charlotte-sre` | charlotte | v1 | production, latest |
| `leon-pm` | leon | v1 | production, latest |
| `neo-assistant` | neo | v1 | production, latest |
| `vera-qa` | vera | v1 | production, latest |
| `zoho-project-analyst` | leon | v1 | production, latest |

> **Règle** : tout nouvel agent doit avoir son system prompt enregistré dans Langfuse **avant** la première mise en production. Voir étape 8a de la checklist dans ce fichier (§Checklist).

### Scoring — état par agent (état 2026-05-06)

| Agent | Score(s) envoyés | Mécanisme | traceId résolu ? |
|---|---|---|---|
| Charlotte | `sre_health`, `severity` | `_langfuse_score()` + `_langfuse_resolve_trace_id()` | ✅ résolution par trace_name |
| Leon | — | non implémenté | — |
| Dispatcher | — | non implémenté | — |
| Aria | — | non implémenté | — |
| Nox | — | non implémenté | — |
| Vera | — | non implémenté | — |
| Penpot | — | non implémenté | — |
| Domi | — | non implémenté | — |
| Neo | — | non implémenté | — |

> **Bug corrigé le 2026-05-06** : `_langfuse_score` envoyait les scores sans `traceId` → invisibles dans Langfuse. La fonction résout désormais le `traceId` via `GET /api/public/traces?name=<trace_name>` avant de poster le score.

### Dataset `neokube-evals` (ID `cmou0e5wo000889pktwct4xhz`)

8 items de référence — charlotte (3), leon (1), vera (1), neo (2), domi (1).
Endpoint correct : `POST /api/public/dataset-items` (Langfuse v2.95).
**Ne pas utiliser** `POST /api/public/datasets/{id}/items` → 404.

### Gotchas Langfuse v2.95

| # | Piège | Règle |
|---|---|---|
| 1 | Dataset items endpoint | `POST /api/public/dataset-items` avec `datasetName`, PAS `/datasets/{id}/items` |
| 2 | Score sans traceId | Score reçu mais invisible — toujours résoudre le `traceId` avant de poster |
| 3 | Prompts endpoint | `POST /api/public/v2/prompts` (avec `/v2/`) |
| 4 | Agents absents de Langfuse | Trace `user_id` vide ou mauvaises clés — vérifier `AGENT_NAME` + `LANGFUSE_PUBLIC_KEY` dans le pod |

---

## Charlotte SRE — Architecture interne (v4.0)

`SREScanWorkflow` tourne toutes les `SRE_SCAN_INTERVAL_S` secondes (défaut 300s) via un Temporal Schedule.

| Bloc | Étapes | Activités clés |
|---|---|---|
| **A — Scan** | 1. Temporal failures · 2. Pod health · 3. Backup status · 4. LLM key status · 5. Vectorisation | `sre_scan_temporal_failures`, `sre_scan_pod_health`, `sre_verify_backup`, `sre_check_llm_key_status` |
| **B — Remédiation** | 6. Auto-restart agents CrashLoop | `sre_auto_restart_agents` |
| **C — LLM** | 7. Analyse LLM (diagnostic + sévérité) · score Langfuse `cluster_health_score` | `sre_analyze_with_llm`, `sre_push_langfuse_score` |
| **D — Reporting** | 8. Matrice agents · 9. ntfy si severity critical/warning | `sre_agent_health_matrix`, `sre_ntfy_notify` |
| **E — Eval Watch** | 10. Poll scores Langfuse (1 cycle sur `EVAL_WATCH_EVERY_N`=6) → ntfy + llm-key-sync si dégradation | `sre_check_eval_scores` |
| **F — Self-Improvement** | Workflow hebdomadaire indépendant (dimanche 3h UTC) — collecte conversations sous-optimales → analyse Mistral → rapport Zoho + ntfy | `sre_collect_conversation_samples`, `sre_analyze_quality_patterns`, `sre_publish_improvement_report` |

Variables importantes : `SRE_SCAN_INTERVAL_S` (300), `EVAL_WATCH_EVERY_N` (6), `EVAL_SCORE_THRESHOLD` (7.0), `LLM_ANALYZE_EVERY_N` (1).

### Flux Leon → Charlotte

```
ProjectSpec validé par Dispatcher
  → Charlotte : reçoit signal "project_spec_received"
  → Charlotte : déclenche SREProvisionWorkflow si infra requise
```

### admin-sys v5.0 (`interfaces` namespace, port 8000)

- `GET /health` — libre (probes K8s) — retourne aussi `"helm": true/false`
- `POST /execute {args: [...], timeout?: int}` — exécute kubectl, FORBIDDEN: exec/cp/port-forward/proxy/attach
- `POST /apply {manifest: str, namespace?: str}` — kubectl apply -f - (manifests arbitraires)
- `POST /helm {args: [...], timeout?: int}` — helm (upgrade/install/rollback/history/status/list/repo/search/get/diff/show)
- **Auth** : header `X-Admin-Sys-Token` obligatoire sur `/execute`, `/apply`, `/helm` (secret `admin-sys-token`)
- ClusterRole `admin-sys-executor` : lecture universelle + mutations workloads/config/RBAC/batch
- Helm 3.17.3 installé dans le pod via initContainer
- GitOps : `apps/interfaces/base/configmap-admin-sys-script.yaml` + `deployment-admin-sys-agent.yaml`

**Règle de fallback Charlotte** :

| Type de commande | admin-sys UP | admin-sys KO |
|---|---|---|
| `get`, `logs`, `describe`, `top`, `events` | via admin-sys | fallback local silencieux (warning dans logs) |
| `patch`, `apply`, `delete`, `rollout`, `create` | via admin-sys | erreur explicite — Charlotte ne mute pas sans admin-sys |

### RBAC agents (état 2026-04-27)

| Agent | ServiceAccount | ClusterRole effectif |
|---|---|---|
| Charlotte | `agent-sre-sa` (agent-system) | `agent-sre-role` — lecture + remédiation, secrets read-only |
| Leon | `leon-sa` (agent-system) | read-only `agent-system` (get/list/watch pods, services, deployments) |
| Dispatcher | `dispatcher-sa` (agent-system) | **aucun binding** — pas d'accès K8s |
| Aria | `aria-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Nox | `nox-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Vera | `vera-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Penpot | `penpot-sa` (agent-system) | **aucun binding** — opérations via penpot-connector |
| admin-sys | `admin-sys-agent` (interfaces) | `admin-sys-executor` — lecture universelle + mutations workloads/config/RBAC/batch/namespaces |

> **Supprimé le 2026-04-26** : `ClusterRoleBinding agent-sre-cluster-admin` (Charlotte n'a plus `cluster-admin`).
> **Ajouté le 2026-04-27** : `ClusterRole admin-sys-executor` + binding sur `admin-sys-agent` SA.
> **Posture Aria/Nox/Vera/Penpot/Dispatcher** : pas de kubectl dans les pods, toutes les opérations infra passent par les connectors via token Vault.

---

## Charlotte SRE — Protocole de remédiation sécurisé (durci 2026-05-07)

### Architecture outils — v4.0 (PydanticAI + MCP, 2026-05-14)

Charlotte v4.0 dispose de deux couches d'outils K8s, toutes exposées nativement via PydanticAI :

1. **36 outils `@charlotte_agent.tool`** — wrappers fins sur `_mission_execute_tool` (guards de sécurité inchangés)
2. **Outils K8s MCP** (`k8s_pods_list`, `k8s_events_list`, `k8s_resources_scale`, etc.) — passés via `toolsets=[MCPServerStreamableHTTP(MCP_K8S_URL)]` à chaque `Agent.run()`

Le serveur K8s MCP (`ghcr.io/containers/kubernetes-mcp-server`) expose 19-20 outils nommés `k8s_*`. Charlotte les appelle directement — les types et arguments sont validés par le protocole MCP.

Charlotte a accès aux outils suivants pour agir sur le cluster :

| Outil | Rôle | Usage |
|---|---|---|
| `run_kubectl` | kubectl via admin-sys — read + mutations. **`exec`/`cp`/`port-forward` bloqués. `delete` autorisé.** | Diagnostic, get pods, logs, delete pods éphémères |
| `kubectl_apply` | Applique un manifest YAML arbitraire via admin-sys `/apply` (≠ GitOps) | Pods éphémères de maintenance, Jobs, ressources temporaires |
| `restart_deployment` | `kubectl rollout restart` ciblé | Restart sans modifier le manifest |
| `list_cluster_state` | Vue agrégée (pods + agents + backup + analyse LLM récente) | Étape 1 obligatoire avant toute remédiation |
| `apply_gitops_fix` | **⭐ OUTIL PRINCIPAL** : atomique write+apply+verify+push en une opération | Pour toute modification manifest GitOps (persistée dans Git) |
| `verify_pod_healthy` | Validation post-fix : Ready=N/N + 0 restart pendant `stable_seconds` (défaut 30) | Utilisé en interne par `apply_gitops_fix`, ou seul après `restart_deployment` |
| `read_file` (fuzzy) | Lit `/gitops/...` ou `/var/sre/...` ; si introuvable, propose des candidats fuzzy par tokens du nom | Avant tout `apply_gitops_fix` ou `write_file` |
| `write_file` | Écrit un manifest dans `/gitops/` | Fallback si `apply_gitops_fix` non disponible |
| `git_status` / `git_push` | Commit/push vers `Kubinote-GitOps` | Fallback si `apply_gitops_fix` non disponible |
| `ask_clarification` | Retourne une question à l'utilisateur — PydanticAI s'arrête naturellement sans loop forcé | Avant toute action irréversible ou ambiguë (voir règle 6b) |
| `check_service_version` | Version courante vs dernière disponible (DockerHub/GitHub API) | Obligatoire avant toute mise à jour |
| `helm_upgrade` | Helm upgrade via admin-sys `/helm` | Uniquement traefik et vault |
| `test_agent_stream` | Smoke test streaming SSE d'un agent OWU-facing — compte les chunks SSE reçus (>3 = OK) | Étape 6 du protocole de correction code agents |
| `trigger_dispatcher_workflow` | Délègue un workflow au Dispatcher Temporal : `dev_project` (lance `DevProjectWorkflow` complet Aria+Nox+Vera+deploy) ou `check_status` (liste les workflows actifs) | Charlotte délègue le pipeline métier sans l'absorber |
| `signal_workflow` | Envoie un signal à un `DevProjectWorkflow` en attente : `approve` (déclenche déploiement Vercel) ou `reject` (annule) | Relais de l'approbation humaine vers Temporal |
| `k8s_*` (MCP) | **19 outils K8s MCP** découverts dynamiquement : `k8s_pods_list`, `k8s_pods_log`, `k8s_events_list`, `k8s_resources_scale`, `k8s_resources_create_or_update`, etc. | Opérations K8s typées via MCP — complément à `run_kubectl` |

**Philosophie des outils Charlotte (2026-05-12) :**
> Charlotte dispose de **primitives génériques** Kubernetes — pas d'outils programmés pour chaque situation.
> Avec `kubectl_apply` + `run_kubectl` (delete autorisé), Charlotte peut créer tout pod éphémère de maintenance
> par raisonnement (manifest généré par le LLM), attendre sa complétion, lire les logs, nettoyer.
> Ajouter un outil spécifique par cas = anti-pattern (voir antipattern #23).

**Frontière de sécurité : admin-sys** (pas Charlotte)
- admin-sys bloque : `exec`, `cp`, `port-forward`, `proxy`, `attach`
- Charlotte bloque en plus : `exec`, `cp`, `port-forward` (redondant, sécurité en profondeur)
- `delete` : autorisé dans Charlotte et admin-sys — récupérable (K8s recrée les pods managés par un deployment)

### Workflow remédiation pour ressource managée GitOps

**Méthode normale — `apply_gitops_fix` (atomique, git_push jamais oublié) :**

```
1. list_cluster_state()                              # qui crashe ?
2. run_kubectl(['logs', name, '-n', ns, '--tail=80'])# cause racine FATAL/Error
3. read_file('apps/<service>/base/<manifest>.yaml')  # lire le manifest source
   ↳ si introuvable, l'outil propose des candidats fuzzy
4. apply_gitops_fix(
       path='apps/<service>/base/<manifest>.yaml',
       content=<contenu complet modifié>,
       deployment=<nom>,
       namespace=<ns>,
       commit_message='fix(<service>): ...'
   )
   ↳ ✅ : write + kubectl apply + verify_pod_healthy (30s stable) + git_push (3 retries) — atomique
   ↳ ❌ apply échoue  : rollback auto du fichier, pas de commit
   ↳ ❌ pod crashe    : rollback auto + pas de commit (cluster-bootstrap revertera vers version saine)
   ↳ 🚨 push échoue x3 : alerte ÉTAT DÉGRADÉ — live fixé mais repo pas à jour, retry git_push manuel
```

**Fallback uniquement si `apply_gitops_fix` indisponible (procédure 5 étapes) :**

```
read_file → write_file → run_kubectl(['apply','-f','/gitops/...']) → verify_pod_healthy → git_push
JAMAIS oublier git_push — sans ça le fix est reverté en <5 min par cluster-bootstrap.
```

### Règles dures (encodées dans le system prompt)

1. **GitOps drift** — tout patch live d'une ressource présente dans `~/Kubinote-GitOps/apps/` est reverté en <5 min par le CronJob `cluster-bootstrap`. `apply_gitops_fix` garantit le push. Sans push, le fix disparaît.
2. **Validation post-fix** — `kubectl get pod <ancien-nom>` retourne `NotFound` après un rollout, ce n'est PAS la preuve que le fix marche. `apply_gitops_fix` appelle `verify_pod_healthy` en interne (sélection par label `app=<deployment>`, Ready=N/N pendant ≥30s sans restart).
3. **OOM différencié** — `OOMKilled` (cgroup, exit 137 dans `describe`) vs heap limit applicatif (logs : `FATAL ERROR: Reached heap limit`, `OutOfMemoryError`). Augmenter `limits.memory` ne fixe que le premier. Le second nécessite `NODE_OPTIONS=--max-old-space-size`, `JAVA_OPTS=-Xmx`, etc. Voir [CLAUDE-antipatterns.md §14](CLAUDE-antipatterns.md).
4. **Périmètre durci v8 (2026-05-13)** — `kube-system`, `security`, `monitoring`, `stalwart`, `penpot`, `dify`, `surfsense` sont tous **SIGNALER UNIQUEMENT** — `confirmation_required: true` obligatoire même si l'humain demande "corrige directement". `apply_gitops_fix` est bloqué (hard, code-level) sur ces namespaces. Aucune remédiation automatique, même sur demande explicite. *(Durci suite à hallucination Charlotte sur surfsense-zero-cache 2026-05-13 — `_NO_ACTION_NS` guard dans sre_agent.py.)*
5. **Restart Charlotte interdit** — Charlotte ne peut pas redémarrer `agent-charlotte` elle-même (`restart_deployment` retourne ⛔), cela couperait la session en cours.
6. **Auto-modification interdite (v3.15+, 2026-05-13)** — Charlotte ne peut pas modifier ses propres fichiers. Double garde :
   - **Runtime** : `write_file` et `apply_gitops_fix` appellent `_is_charlotte_file(path)` — bloque si `"charlotte" in path` ou `"sre-script" in path` ou `basename in {"serviceaccount-sre.yaml", "sre_agent.py"}` → retourne `❌ AUTO-MODIFICATION BLOQUÉE` + ntfy (priorité high)
   - **Prompt** : `RÈGLE AUTO-MODIFICATION — ABSOLUE` + `RÈGLE ANTI-BOUCLE` (stop tour 4/8 sans écriture → `ask_clarification` structuré + ntfy)
   - **Comportement attendu** : Charlotte s'arrête dès la 1ère tentative bloquée, appelle `ask_clarification` en expliquant ce que l'humain doit appliquer manuellement via GitOps. Elle ne boucle pas.
   - **Périmètre exact** : tous les fichiers contenant "charlotte" ou "sre-script" dans le path, `serviceaccount-sre.yaml`, `sre_agent.py`. Les fichiers des autres agents (Neo, Nox, Leon…) ne sont **PAS** bloqués. Voir antipattern #34.
7. **RBAC pods/exec** — `pods/exec create` ajouté au ClusterRole `agent-sre-role` (2026-05-13) — requis pour `kubectl exec` / `test_agent_stream`.

### Gotchas opérationnels Charlotte (2026-05-07)

**G1 — ConfigMap `sre-script` trop grand pour `kubectl apply`**

`configmap/sre-script` dépasse 262 Ko. `kubectl apply` échoue avec :
`The ConfigMap "sre-script" is invalid: metadata.annotations: Too long: may not be more than 262144 bytes`

→ Utiliser **`kubectl replace`** à la place :
```bash
kubectl replace -f apps/agent-system/base/configmap-sre-script.yaml
```
Le CronJob `cluster-bootstrap` utilise `kubectl apply -k` (kustomize) qui ne souffre pas de ce problème car il ne stocke pas l'annotation `last-applied-configuration`. Le problème n'affecte que les mises à jour manuelles depuis `neokube-beta`.

**G2 — Label `app=agent-charlotte` ne sélectionne pas les pods**

```bash
kubectl get pods -n agent-system -l app=agent-charlotte   # retourne "No resources found"
kubectl get pods -n agent-system | grep charlotte          # retourne le pod réel
```
Le deployment utilise un label différent du nom du deployment. Pour sélectionner Charlotte :
```bash
kubectl get pods -n agent-system | grep charlotte
# ou
kubectl get pods -n agent-system -l app=agent-sre   # à vérifier selon la version du manifest
```
`verify_pod_healthy` dans Charlotte elle-même utilise `-l app=<deployment>` — si Charlotte essaie de se vérifier elle-même avec `deployment=agent-charlotte`, elle ne trouvera aucun pod.

### Cas d'usage de référence (incident résolu 2026-05-07)

**Incident :** `surfsense-zero-cache` en CrashLoopBackOff avec `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`.

**Mauvaise remédiation initiale :** `kubectl patch` pour augmenter `limits.memory` 4Gi→8Gi (live, pas GitOps), validé via l'ancien nom de pod. Résultat : nouveau pod re-crashe immédiatement (V8 reste plafonné à ~1.7 Gi), patch live reverté par cluster-bootstrap en <5 min.

**Root cause initiale (2026-05-07) :** zero-cache démarre 2 sous-process Node.js indépendants (`syncer` + `change-streamer`), chacun avec son propre heap V8 — le heap cumulé pouvait atteindre 10 Gi sans GC. Fix initial : `--max-old-space-size=10240` + `limits.memory: 12Gi` → stable, mais consommation passive 7.1 Gi même au repos (V8 ne GC jamais avant d'atteindre la limite).

**Root cause réelle (2026-05-12) :** avec un heap de 10 Go, V8 n'active le GC agressif qu'à ~8 Gi — l'accumulateur passif colonise la RAM sans jamais libérer. La `zero.db` replica locale réelle est 124 MB (stable).

**Fix définitif (2026-05-12) :**
```yaml
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=4096"   # Force GC agressif dès 4 Gi
resources:
  requests: {memory: 1Gi}
  limits:   {memory: 5Gi}             # headroom : snapshot initial > 2 Gi
livenessProbe:  {initialDelaySeconds: 60, failureThreshold: 3}
readinessProbe: {initialDelaySeconds: 30, failureThreshold: 10}
```
Résultat : 7.1 Gi → ~1.5 Gi steady-state. Mémoire cluster : 76 % → 53 %.

**Ce qui a empêché le push initial :** le serveur neokube-beta a crashé après `kubectl apply` mais avant `git_push`. Le pod vivait avec le fix en live, mais le repo pointait vers l'ancienne config — cluster-bootstrap allait reverter. → C'est la raison d'être de `apply_gitops_fix` : rendre le push impossible à oublié.

### Routing v4.0 — PydanticAI (2026-05-14)

Charlotte v4 n'a **plus de classificateur ni de routing explicite**. PydanticAI gère le loop nativement : Claude décide lui-même s'il doit appeler des outils ou répondre en texte.

#### Flux de routing

```
POST /mission {message, session_id, interface}
  → _load_pydantic_history(session_id)       ← Qdrant charlotte-conversations
  → charlotte_agent.run(message,
        message_history=pydantic_history,
        deps=_MissionDeps(...),
        toolsets=[MCPServerStreamableHTTP(MCP_K8S_URL)])
      → Claude décide naturellement : réponse texte OU appels d'outils
  → _conversation_store(session_id, ...)     → Qdrant
  → return {answer, steps, session_id}
```

**Ce qui a été supprimé (v3 → v4) :**
- `_pending_question` heuristique (`"?" in last_assistant`) — bypass systématique du classifieur
- Classificateur binaire `sre/conv` (`tool_choice="required"` au tour 0)
- `MAX_TOOL_TURNS` for-loop (8 iterations max)
- `_MISSION_TOOLS` dict (~727 lignes JSON de specs d'outils)
- `LLM_CONV_MODEL` pour classify (plus nécessaire — Claude choisit)

**FallbackModel natif PydanticAI :**
```python
_mission_primary  = OpenAIChatModel(LLM_MODEL,    provider=_mission_provider)  # claude-sonnet
_mission_fallback = OpenAIChatModel(LLM_FALLBACK,  provider=_mission_provider)  # mistral
_mission_llm      = FallbackModel(_mission_primary, _mission_fallback)
```
Si `claude-sonnet` retourne une `ModelAPIError` (quota vide, HTTP 402), PydanticAI bascule automatiquement sur `mistral`.

### Outil `ask_clarification` (v4.0)

Charlotte retourne une question — PydanticAI s'arrête naturellement sans `break` de loop explicite.

**Quand Charlotte DOIT demander (règle 6b du system prompt) :**
- Valeur cible non précisée : *"augmente la mémoire de zero-cache"* → Charlotte demande combien
- Cible ambiguë : *"redémarre le service mail"* → Charlotte demande Stalwart ou le pod K8s ?
- Action irréversible sans confirmation explicite de l'utilisateur

**Quand Charlotte agit directement (sans demander) :**
- Actions read-only : `get`, `logs`, `describe`, `list`
- Corrections évidentes : pod CrashLoop → restart, OOM confirmé → ajuster limits
- Quand la valeur cible est explicite dans le message

---

## DevProjectWorkflow — flux complet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PLANIFICATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brief (Slack #produit / Open WebUI)
  → Charlotte : project_health_check → bilan Zoho/GitHub/Vercel/Penpot/Notion
  → Leon : dialogue de clarification (max 10 tours)
  → Leon : produit ProjectSpec JSON (12 champs validés)
  → Leon : crée tâches + jalons dans Zoho Projects
  → Charlotte : project_health_check(update_docs=True) → croise les liens
  ─────────────────── POINT DE DÉCLENCHEMENT PRODUCTION ─────────────────────
  [ACTUEL]  Leon : dispatch_project → POST /trigger Dispatcher
  [CIBLE]   Zoho project status → "Prêt pour production" (action humaine)
            → zoho-observer lit les champs Zoho → construit ProjectSpec
            → POST /trigger Dispatcher
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PRODUCTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  → Dispatcher : validate_spec (tous les champs obligatoires)
  → Dispatcher : [PARALLEL]
      Aria   : GitHub repo (template-nextjs) + Vercel project
      Nox    : GitHub repo (template-fastapi) + Neon branch (NeoBridge)
      Penpot : projet Penpot + duplication fichier template
      Domi   : provision domaine (subdomain {slug}.neomnia.net ou achat Openprovider)
  → Vera : vera_review (analyse spec + output Aria/Nox/Penpot)
  → Dispatcher : notify_approval (signal humain attendu 24h)
  → [Approbation humaine]
  → Dispatcher : deploy (rollout final)
  → Domi       : domi_link_vercel_domain (lie le domaine au projet Vercel, post-deploy)
  → Dispatcher : write_pm_decisions (Qdrant pm-decisions, inclut penpot_url + domain)
  → Dispatcher : zoho_callback (commentaire tâche Zoho + lien Design Penpot)
  → Dispatcher : send_client_mail (email post-deploy → spec.client_email, non-bloquant)

  ━━━━━━━━━━━━━━━━━━━━━━━━ DESIGN → CODE (Phase 3b) ━━━━━━━━━━━━━━━━━━━━━━━━
  Charlotte : dispatch_design_deploy(penpot_project_id="<uuid>")
              → POST dispatcher:8484/trigger-penpot
  → Dispatcher : PenpotToVercelWorkflow
      Aria (aria_export_penpot)    : exporte design Penpot via penpot-connector
      Aria (aria_generate_nextjs)  : génère Next.js (page.tsx, composants, CSS) via codestral
      Aria (aria_push_to_github)   : push sur branche design/penpot-export-{id[:8]}
  → Dispatcher : redeploy Vercel (vercel-connector) — preview deploy branche
  → Dispatcher : ntfy notification mission-done
```

**Leon ne code jamais, ne déploie jamais** — interdit par `forbidden_actions` dans l'AgentSpec.

**GitHub templates** :
- `neomnia/template-nextjs` — Next.js 15, TypeScript, Tailwind, App Router
- `neomnia/template-fastapi` — FastAPI + asyncpg + Dockerfile + `.env.example`

---

## R9 — Gouvernance LLM par agent (verrouillé 2026-05-06)

Chaque agent a son propre profil LLM dans son deployment K8s. **Jamais de modèle hardcodé dans le code Python** — toujours lu depuis les variables d'environnement.

### Profils LLM actifs

> **⚠️ TEMPORAIRE** : Dispatcher et Domi sur `mistral` (quota Gemini-flash épuisé, réinitialisation quotidienne).
> Charlotte est passée à `claude-sonnet` (2026-05-13 — Anthropic rechargé). Split LLM actif : `claude-sonnet` pour `/mission`, `mistral` pour scans Temporal.

| Agent | `LLM_MODEL` actuel | `LLM_SCAN_MODEL` | `LLM_SECONDARY` | `LLM_FALLBACK` | Modèle cible |
|---|---|---|---|---|---|
| **Charlotte** SRE v4.0 | `claude-sonnet` ✅ | `mistral` | `gpt-4o` | `mistral` | `claude-sonnet` |
| **Leon** | `mistral-large-2407` | — | — | — | `mistral-large-2407` |
| **Dispatcher** | `mistral` ⚠️ | — | — | — | `gemini-flash` |
| **Aria** Frontend | `codestral` | — | — | — | `codestral` |
| **Nox** Backend | `codestral` | — | — | — | `codestral` |
| **Vera** QA | `mistral-large-2407` | — | — | — | `mistral-large-2407` |
| **Penpot** Design | `mistral` | — | — | — | `gemini-flash` |
| **Domi** Domain | `mistral` ⚠️ | — | — | — | `gemini-flash` |
| **Neo** Assistant | `mistral-large-2407` | — | — | — | `mistral-large-2407` |

> **Restaurer Dispatcher + Domi** : quota Gemini se réinitialise auto → modifier `LLM_MODEL: "gemini-flash"` dans deployments.
> **Charlotte split LLM (v4.0 — R9.10) :**
> - `LLM_MODEL=claude-sonnet` → missions interactives `/mission` via PydanticAI `Agent.run()`
> - `LLM_SECONDARY=gpt-4o` → **2ème fallback** si claude-sonnet quota épuisé (OpenAI, bonne gestion des tool calls)
> - `LLM_FALLBACK=mistral` → **3ème fallback** si gpt-4o aussi indisponible
> - `LLM_SCAN_MODEL=mistral` → scans Temporal automatiques (`sre_analyze_with_llm`) — inchangé
> - `LLM_CONV_MODEL` n'existe plus : PydanticAI + Claude gèrent nativement conv vs SRE sans classifieur
> - **`_check_primary_llm()`** — health check toutes les 5 min + ntfy sur transition ok→down et down→ok

### Règles R9

**R9.1** — `LLM_MODEL` obligatoire dans chaque deployment. Le défaut dans le code est un secours de développement, pas une config de production.

**R9.2** — L'alias `mistral` dans LiteLLM est verrouillé sur `mistral-large-2407`. Changer la version impacte tous les agents qui l'utilisent.

**R9.3** — Neo est isolé des agents de production. Son modèle est indépendant de Charlotte, Leon, Dispatcher…

**R9.4** — Multi-LLM dans un workflow = variables séparées (ex: `LLM_MODEL` + `LLM_MODEL_REASONING`). Jamais de switch de modèle par logique conditionnelle hardcodée.

**R9.5** — Virtual keys LiteLLM actives depuis 2026-05-06. Une virtual key par agent dans Vault `secret/neokube/agents/{name}/llm`. Secret K8s `litellm-agent-keys` dans `agent-system`. Aucun agent n'utilise plus `LITELLM_MASTER_KEY`.

**R9.6** — Langfuse : toujours `cluster-manager-secrets` depuis `agent-system` (jamais `cockpit-secrets`, mauvais namespace). Public key : `pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f`. Projet : `neokube-agents`.

**R9.7** — Identité complète dans chaque trace Langfuse : nom, email (`@neokube.fr`), périmètre permissions.

**R9.8** — `LLM_FALLBACK` doit être **lu depuis l'env ET effectivement utilisé** dans `_llm_call` et `_llm_call_stream`. Le déclarer dans le deployment sans le consommer dans le code ne protège pas contre les quota épuisés. Pattern obligatoire : détection HTTP 402 / mots-clés `"credit"`, `"insufficient"`, `"quota"` → retry avec `LLM_FALLBACK` + ntfy alerte rate-limitée (1/h). Voir antipattern #32.

**R9.9** — `_llm_call_stream` doit accepter un paramètre `model: str | None = None` pour permettre l'override par `LLM_CONV_MODEL`. Sans ce paramètre, toute les variantes streaming (fast-path conversationnel, synthèse finale) brûlent le modèle premium même pour des messages triviaux.

**R9.10 — Cascade de fallback LLM (règle globale) :**
Tout agent interactif (OWU-facing) DOIT avoir une chaîne de 3 modèles avec notification ntfy automatique :
1. `LLM_MODEL` (modèle principal — ex: `claude-sonnet`, `mistral-large-2407`)
2. `LLM_SECONDARY` (2ème fallback — ex: `gpt-4o`) — optionnel si `LLM_MODEL` déjà robuste
3. `LLM_FALLBACK` (filet de sécurité — ex: `mistral`)

Comportement obligatoire :
- Sur quota/HTTP 400/402 du modèle primaire : basculement **automatique** sur secondaire, puis fallback
- **ntfy immédiat** : `f"⚠️ {LLM_MODEL} indisponible (HTTP {code}) — fallback activé ({LLM_SECONDARY} → {LLM_FALLBACK})"` — rate-limited 1/h (identique R9.8)
- **ntfy récupération** : notification quand le modèle primaire revient disponible
- Le fallback ne doit **jamais** sortir du texte parasité (tool specs en clair) — choisir des modèles qui gèrent le function calling (`gpt-4o`, `mistral-large-2407`)
- **Charlotte v4** : `FallbackModel(claude-sonnet, gpt-4o, mistral)` + `_check_primary_llm()` (health check 5 min)
- **Agents Temporal (Leon, Dispatcher, etc.)** : même logique dans `_llm_call()` — déjà implémentée pour R9.8, étendre avec LLM_SECONDARY si besoin

---

## Checklist — Intégration d'un nouvel agent NeoKube

> Aucune étape ne peut être sautée.

### 0. Décider les paramètres de base

| Paramètre | Valeurs possibles | Exemple |
|---|---|---|
| `{name}` | slug lowercase | `felix` |
| `{port}` | prochain libre après 8489 | `8491` |
| `{temporal_ns}` | si agent Temporal, sinon `—` | `dispatcher` ou nouveau |
| `{llm_model}` | voir §R9 | `mistral-large-2407` |
| `{budget_eur}` | selon charge prévue | `5` |
| `{scope}` | périmètre outils | `github+vercel` \| `zoho+qdrant` \| `llm_chat` \| `all` |

**Mettre à jour les tables :**
- `CLAUDE.md` §Architecture agents → ajouter la ligne (Rôle, Runtime, Port, Temporal NS, Status)
- `CLAUDE-agents.md` §R9 → ajouter la ligne (LLM_MODEL, justification)
- `CLAUDE-agents.md` §Identité d'agent → ajouter la ligne (mail, SA, RBAC, sidecars, Langfuse user_id)

### 1. ServiceAccount K8s

```bash
kubectl create serviceaccount {name}-sa -n agent-system
# Pas de ClusterRoleBinding par défaut — voir §RBAC agents si accès K8s requis
```

### 2. Virtual key LiteLLM + Vault + secret K8s

```bash
MASTER_KEY="sk-neokube-litellm-master"
VKEY=$(curl -s -X POST http://litellm.neokube.local/key/generate \
  -H "Authorization: Bearer $MASTER_KEY" -H "Content-Type: application/json" \
  -d "{\"key_alias\":\"agent-{name}\",\"metadata\":{\"agent\":\"{name}\"},\"models\":[\"{llm_model}\",\"gemini-flash\",\"nomic-embed-text\"],\"max_budget\":{budget_eur},\"budget_duration\":\"1mo\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")

kubectl exec -n security vault-0 -- vault kv put secret/neokube/agents/{name}/llm \
  LITELLM_API_KEY="$VKEY" LLM_MODEL="{llm_model}" BUDGET_EUR="{budget_eur}"

kubectl patch secret litellm-agent-keys -n agent-system --type='json' -p="[
  {\"op\":\"add\",\"path\":\"/data/LITELLM_KEY_{NAME_UPPER}\",\"value\":\"$(echo -n $VKEY | base64 -w0)\"}
]"
```

### 3. Deployment K8s — template complet

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {name}
  namespace: agent-system
  labels:
    app: {name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {name}
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: {name}
    spec:
      serviceAccountName: {name}-sa
      nodeSelector:
        kubernetes.io/hostname: kubinote
      containers:
      - name: {name}
        image: python:3.12-slim
        env:
        - name: LITELLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: litellm-agent-keys
              key: LITELLM_KEY_{NAME_UPPER}
        - name: LLM_MODEL
          value: "{llm_model}"
        - name: LITELLM_BASE_URL
          value: "http://litellm.cockpit.svc.cluster.local:4000"
        - name: LANGFUSE_PUBLIC_KEY
          value: "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
        - name: LANGFUSE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: cluster-manager-secrets
              key: LANGFUSE_SECRET_KEY
        - name: LANGFUSE_BASE_URL
          value: "http://langfuse.cockpit.svc.cluster.local:3000"
        - name: VAULT_ADDR
          value: "http://vault.security.svc.cluster.local:8200"
        - name: VAULT_TOKEN
          valueFrom:
            secretKeyRef:
              name: vault-root-token
              key: root-token
              optional: true
        - name: OPENWEBUI_URL
          value: "http://open-webui.interfaces.svc.cluster.local:8080"
        - name: VAULT_OPENWEBUI
          value: "secret/data/neokube/infrastructure/openwebui"
        - name: AGENT_NAME
          value: "{name}"
        - name: AGENT_EMAIL
          value: "{name}@neokube.fr"
        - name: PERMISSIONS_SCOPE
          value: "{scope}"
        - name: MAIL_FROM
          value: "{name}@neokube.fr"
        - name: MAIL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: agent-mail-secrets
              key: MAIL_PASSWORD_{NAME_UPPER}
              optional: true
        - name: AGENT_PORT
          value: "{port}"
        ports:
        - containerPort: {port}
          name: http
        livenessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 120
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 90
          periodSeconds: 15
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### 4. Service K8s

```yaml
apiVersion: v1
kind: Service
metadata:
  name: {name}
  namespace: agent-system
spec:
  selector:
    app: {name}
  ports:
  - port: {port}
    targetPort: {port}
```

### 5. Namespace Temporal (si agent Temporal uniquement)

Ajouter dans `apps/agent-system/base/configmap-temporal-namespaces.yaml` :
```yaml
- name: {name}
  retention: 7d
```

### 6. Code Python — pattern standard

```python
import os, httpx

AGENT_NAME        = os.getenv("AGENT_NAME",        "{name}")
AGENT_EMAIL       = os.getenv("AGENT_EMAIL",        "{name}@neokube.fr")
PERMISSIONS_SCOPE = os.getenv("PERMISSIONS_SCOPE",  "")
LLM_MODEL         = os.getenv("LLM_MODEL",          "mistral-large-2407")
LITELLM_BASE_URL  = os.getenv("LITELLM_BASE_URL",   "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_API_KEY   = os.getenv("LITELLM_API_KEY",    "")
LANGFUSE_PK       = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SK       = os.getenv("LANGFUSE_SECRET_KEY", "")
VAULT_ADDR        = os.getenv("VAULT_ADDR",          "http://vault.security.svc.cluster.local:8200")
VAULT_TOKEN       = os.getenv("VAULT_TOKEN",         "")

async def call_llm(messages: list, workflow: str = "") -> str:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model":    LLM_MODEL,
                "messages": messages,
                "user":     AGENT_NAME,
                "metadata": {
                    "agent":             AGENT_NAME,
                    "agent_email":       AGENT_EMAIL,
                    "permissions_scope": PERMISSIONS_SCOPE,
                    "workflow":          workflow,
                }
            }
        )
    return r.json()["choices"][0]["message"]["content"]
```

### 6b. Open WebUI — auto-enregistrement (obligatoire)

> Chaque nouvel agent DOIT s'enregistrer dans Open WebUI au démarrage. Référence canonique : **neo.py v1.2** (Charlotte utilise le même pattern).

**Variables requises dans le ConfigMap** (déjà incluses dans le template §3 ci-dessus) :
```yaml
OPENWEBUI_URL: "http://open-webui.interfaces.svc.cluster.local:8080"
VAULT_OPENWEBUI: "secret/data/neokube/infrastructure/openwebui"
VAULT_ADDR: "http://vault.security.svc.cluster.local:8200"
```

**Endpoint `/v1/models` à ajouter au FastAPI** (requis pour la découverte OWU) :
```python
@app.get("/v1/models")
async def list_models():
    return {"object": "list", "data": [{
        "id": AGENT_NAME, "object": "model",
        "created": 1700000000, "owned_by": "neokube",
        "name": f"{AGENT_NAME.capitalize()} — Agent NeoKube"
    }]}
```

**Fonctions à ajouter au code de l'agent** :
```python
import time

OPENWEBUI_URL  = os.getenv("OPENWEBUI_URL",  "http://open-webui.interfaces.svc.cluster.local:8080")
VAULT_OPENWEBUI = os.getenv("VAULT_OPENWEBUI", "secret/data/neokube/infrastructure/openwebui")
AGENT_PORT     = int(os.getenv("AGENT_PORT", "8000"))
_owu_jwt_cache: dict = {}

async def _owu_get_token() -> str:
    """Lit les credentials OWU depuis Vault, obtient un JWT (cache 20h)."""
    now = time.time()
    if _owu_jwt_cache.get("token") and now < _owu_jwt_cache.get("exp", 0):
        return _owu_jwt_cache["token"]
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"{VAULT_ADDR}/v1/{VAULT_OPENWEBUI}",
            headers={"X-Vault-Token": VAULT_TOKEN}
        )
        d = r.json().get("data", {}).get("data", {})
        pw = d.get("ADMIN_PASSWORD", "")
        email = d.get("ADMIN_EMAIL", "admin@neokube.fr")
        r2 = await c.post(
            f"{OPENWEBUI_URL}/api/v1/auths/signin",
            json={"email": email, "password": pw}
        )
        jwt = r2.json().get("token", "")
    _owu_jwt_cache["token"] = jwt
    _owu_jwt_cache["exp"] = now + 72000  # 20h
    return jwt

async def _owu_self_register() -> None:
    """Enregistre l'agent comme connexion OpenAI-compatible dans Open WebUI (idempotent)."""
    try:
        token = await _owu_get_token()
        base_url = f"http://{AGENT_NAME}.agent-system.svc.cluster.local:{AGENT_PORT}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{OPENWEBUI_URL}/api/v1/openai/config", headers=headers)
            cfg = r.json()
            urls = cfg.get("OPENAI_API_BASE_URLS", [])
            keys = cfg.get("OPENAI_API_KEYS", [])
            found = next((i for i, u in enumerate(urls) if AGENT_NAME in u), -1)
            if found >= 0:
                urls[found] = base_url
                keys[found] = "neokube"
            else:
                urls.append(base_url)
                keys.append("neokube")
            cfg["OPENAI_API_BASE_URLS"] = urls
            cfg["OPENAI_API_KEYS"]      = keys
            await c.post(
                f"{OPENWEBUI_URL}/api/v1/openai/config/update",
                headers=headers, json=cfg
            )
        print(f"[OWU] {AGENT_NAME} enregistré → {base_url}", flush=True)
    except Exception as e:
        print(f"[OWU] enregistrement échoué (non bloquant) : {e}", flush=True)
```

**Intégration dans le lifespan** — appeler `_owu_self_register()` avant la boucle principale :
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await _owu_self_register()
    # ... reste du démarrage (IMAP loop, etc.)
    yield
    # ... nettoyage
```

> **Règle** : l'enregistrement est non bloquant (exception catchée). Un échec OWU ne doit jamais empêcher le démarrage de l'agent.

### 6c. Fast-path conversationnel (obligatoire pour tout agent OWU-facing)

> **Règle** : tout agent OWU-facing DOIT implémenter un fast-path conversationnel avant son loop ReAct/outil. Sans ça, un simple "bonjour" déclenche le loop complet (6–12s de latence). Voir antipattern #21.
>
> **Deux patterns selon l'interface** :
> - **Pattern A — Pipe SSE (Charlotte)** : classificateur LLM sémantique 3-classes (`conv` / `explain` / `sre`). `explain` = réponse depuis la connaissance, sans outil. Pas de set de mots-clés — le LLM comprend l'intention.
> - **Pattern B — OpenAI-compat (Neo, Leon)** : set de mots-clés métier `_AGENT_KW`, detection sur la première ligne du dernier message uniquement.

**Pattern standard :**
```python
# 1. Set de mots-clés métier propres à l'agent (exemples)
_AGENT_KW = {
    "zoho", "github", "vercel", "neon", "projet", "project", "brief", "deploy",
    "tâche", "task", "branch", "repo", "bug", "fix", ...  # adapter au domaine
}

# 2. Dans le endpoint /v1/chat/completions — avant tout appel run_agent/loop
last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
user_text = last_user.split('\n')[0][:200].lower()  # première ligne seulement
needs_tools = any(kw in user_text for kw in _AGENT_KW)

if not needs_tools:
    # Fast-path : LLM léger, sans outils, system prompt minimal
    conv_messages = [
        {"role": "system", "content": (
            f"Tu es {AGENT_NAME}, agent IA chez Néomnia. "
            "Réponds de façon amicale, concise et naturelle en 1 à 3 phrases. "
            "Si l'utilisateur mentionne une tâche ou un projet, invite-le à préciser."
        )},
    ] + [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
    # appel LLM direct sans tools, max_tokens=256, retourner immédiatement
```

**Règles de construction du set `_AGENT_KW` :**
- PAS de noms propres ni de prénoms — ils apparaissent dans les salutations ("bonjour léon")
- Tester uniquement la **première ligne** du **dernier message** utilisateur
- Ne jamais tester l'historique complet (des mots-clés anciens polluent la détection)
- Ne jamais passer le system prompt complet dans le chemin conversationnel

**Implémentations de référence** : `configmap-leon-script.yaml` (`_LEON_KW`) · `configmap-neo-script.yaml` (`_TOOL_KW`) · `configmap-sre-script.yaml` (classifieur LLM sémantique — pas de set de mots-clés depuis v3.12)

---

### 6d. Streaming token-by-token (obligatoire pour tout agent OWU-facing)

> **Règle** : tout agent exposé à OWU DOIT streamer sa réponse token par token. Envoyer la réponse entière en un seul chunk SSE (`delta.content = full_reply`) crée une expérience figée — l'utilisateur attend en silence puis reçoit tout d'un coup. Voir antipattern #28.

Deux patterns selon l'architecture de l'agent :

#### Pattern A — Pipe SSE + PydanticAI agent.run() (Charlotte v4, 2026-05-14)

**Règle globale** : tout agent OWU-facing doit implémenter ces 3 éléments :
1. **Outils visibles** — émettre un event `{type:"tool", name:"..."}` à chaque appel d'outil
2. **Indicateur d'attente** — heartbeat 1.5s pendant la réflexion LLM
3. **Réponse progressive** — tokens delta en temps réel, PAS un seul bloc

Charlotte v4 utilise `charlotte_agent.run()` + émission mot-par-mot (antipattern #39 : `run_stream()+stream_text(delta=True)` fuit les tokens tool-call JSON avec mistral via LiteLLM).

**Pré-traitement avant agent.run()** — 2 cas gérés en Python avant l'appel LLM principal :

**1. Salutation** (`bonjour`, `hello`, etc. — ≤4 mots) :
- Réponse LLM directe contrainte à 2 phrases, sans tool call.
- Pas de `list_cluster_state` — inutile et lent pour un simple bonjour.

**2. Question d'accès/connexion** (messages courts ≤25 mots, hors salutation) :
- Un appel `LLM_SCAN_MODEL` (mistral, max 5 tokens) classifie l'intent : `zoho | cluster | none`.
- Si intent détecté : pré-exécuter l'outil, injecter le résultat, contraindre à 2 phrases.
- **Règle** : utiliser le LLM comme interprétateur, jamais du string matching — les variantes linguistiques sont infinies (accents, tirets, ordre des mots, langues).

```python
# Intent classifier (LLM_SCAN_MODEL = mistral, ~500ms, 5 tokens max)
_intent_resp = await _llm_call(
    [{"role": "system", "content": "Reply with ONE word: zoho | cluster | none"},
     {"role": "user",   "content": message[:200]}],
    temperature=0, max_tokens=5, model=LLM_SCAN_MODEL,
)
if _intent in _ACCESS_TOOL_MAP:
    _res = await _mission_execute_tool(_ACCESS_TOOL_MAP[_intent], {})
    effective_message = f"{message}\n\n[RÉSULTAT]\n{_res[:800]}\n[/RÉSULTAT]\n\nRéponds en 2 phrases MAX."
```

Table intent→outil (extensible sans maintenance de patterns) :
| Intent LLM | Outil | Ajout |
|---|---|---|
| `zoho` | `zoho_list_projects` | ✅ |
| `cluster` / `k8s` | `list_cluster_state` | ✅ |
| _(ajouter ici)_ | _(outil)_ | |

```python
# Côté agent : _ctx_session propagé aux tool wrappers via ContextVar
_ctx_session: ContextVar[str] = ContextVar("_ctx_session", default="")

async def _tool_emit(tool_name: str, text: str = "") -> None:
    sid = _ctx_session.get("")
    if sid:
        await _emit(sid, {"type": "tool", "name": tool_name, "text": text[:80]})

# Dans chaque outil :
@charlotte_agent.tool_plain
async def list_cluster_state() -> str:
    await _tool_emit("list_cluster_state")
    return await _mission_execute_tool("list_cluster_state", {})
```

Events SSE émis :
```
{"type":"step",  "text":"📂 Historique chargé"}         ← traitement initial
{"type":"tool",  "name":"run_kubectl", "text":"..."}    ← outil appelé (en temps réel)
{"type":"token", "text":"Voici "}                       ← delta LLM
{"type":"token", "text":"les pods..."}
{"type":"done",  "answer":"...", "steps":[...]}
{"type":"heartbeat"}                                    ← keep-alive 1.5s
```

**Pipe OWU — générateur** (`charlotte_pipe.py v3.0`) :
```python
def pipe(self, body: dict) -> Generator[str, None, None]:
    with requests.post(stream_url, json={...}, stream=True, timeout=180) as r:
        for line in r.iter_lines():
            if not line.startswith(b"data: "): continue
            ev = json.loads(line[6:])
            t = ev.get("type")
            if t == "tool":
                yield f"`⚙️ {ev['name']}`\n"    # outil visible
            elif t == "step":
                yield f"*{ev['text']}*\n"       # étape
            elif t == "token":
                if not in_response:
                    in_response = True
                    yield "\n"                  # séparateur après les étapes
                yield ev["text"]               # token progressif
            elif t == "done":
                yield f"\n\n`session: {sid}`"
                return
```

Résultat côté utilisateur :
```
*📂 Historique chargé*
⚙️ list_cluster_state
⚙️ run_kubectl

Voici l'état de... [tokens qui arrivent progressivement]

`session: ow-abc123`
```

#### Pattern B — OpenAI-compat `/v1/chat/completions` (Neo, Leon)

**Fast-path** (sans outils) : streaming LiteLLM direct, transparent pour OWU :
```python
async def _stream_direct():
    async with httpx.AsyncClient(timeout=60) as c:
        async with c.stream("POST", f"{LITELLM_URL}/v1/chat/completions",
                            json={"model": LLM_MODEL, "messages": messages, "stream": True}) as r:
            async for line in r.aiter_lines():
                if line.startswith("data: "):
                    raw = line[6:].strip()
                    if raw == "[DONE]":
                        yield "data: [DONE]\n\n"; break
                    chunk = json.loads(raw)
                    chunk["model"] = AGENT_NAME
                    yield f"data: {json.dumps(chunk)}\n\n"

if stream_requested:
    return StreamingResponse(_stream_direct(), media_type="text/event-stream")
```

**Agent path** (avec outils) : la réponse est assemblée avant d'être streamée. Utiliser le streaming mot-par-mot — meilleur que rien, suffisant en pratique :
```python
async def _stream_reply_words(reply: str):
    chat_id = f"{AGENT_NAME}-{uuid.uuid4().hex[:8]}"
    words = reply.split(" ")
    for i, word in enumerate(words):
        text = word + (" " if i < len(words) - 1 else "")
        chunk = {"id": chat_id, "object": "chat.completion.chunk", "model": AGENT_NAME,
                 "choices": [{"delta": {"content": text}, "index": 0, "finish_reason": None}]}
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0)  # yield event loop entre chaque mot
    done = {"id": chat_id, "object": "chat.completion.chunk", "model": AGENT_NAME,
            "choices": [{"delta": {}, "index": 0, "finish_reason": "stop"}]}
    yield f"data: {json.dumps(done)}\n\ndata: [DONE]\n\n"

if stream_requested:
    return StreamingResponse(_stream_reply_words(reply), media_type="text/event-stream")
```

**État au 2026-05-12 :**
| Agent | Fast-path | Agent-path | Statut |
|---|---|---|---|
| Charlotte | ✅ tokens réels (`_llm_call_stream`) | ✅ tokens réels | ✅ Complet |
| Neo | ✅ LiteLLM `stream=True` (`_stream_direct`) | ✅ mot-par-mot | ✅ Complet |
| Leon | ✅ `_conv_llm_stream` tokens réels | ✅ `_stream_content` mot/mot | ✅ Corrigé 2026-05-13 |

**Leon** : synchrone (thread pool `_run_sync`) — migration vers streaming async à planifier séparément. Priorité basse (agent de planification, réponses longues déjà attendues).

---

### 6e. Notification ntfy de fin de mission (obligatoire pour agents avec outils)

> **Règle** : tout agent OWU-facing qui exécute des outils DOIT envoyer une notification ntfy `priority=low` quand la mission est terminée. L'utilisateur peut changer d'onglet pendant qu'un agent travaille (30s–3min) — sans notification, il ne sait pas quand revenir.

**Pattern** (commun à tous les agents) :
```python
# Après avoir assemblé la réponse finale
_used_tools = [s for s in result_steps if s.get("tool") not in (None, "final_answer")]
if _used_tools and len(final) > 50:
    await _ntfy_notify(
        f"✅ {AGENT_NAME} — mission terminée",
        f"📋 {message[:100]}\n\n{final[:300]}",
        priority="low",
        tags=[AGENT_NAME.lower(), "done"],
    )
```

**Règles de déclenchement :**
- ✅ Déclencher si : au moins 1 outil utilisé ET réponse > 50 chars
- ❌ Ne pas déclencher pour : échanges conversationnels (fast-path), réponses d'erreur courtes
- **Topic** : `neokube-alerts` (même topic que les alertes SRE) — `priority=low` les distingue visuellement

**État au 2026-05-12 :**
| Agent | ntfy mission |
|---|---|
| Charlotte | ✅ Implémenté |
| Neo | 🔴 À implémenter |
| Leon | 🔴 À implémenter |

---

### 6f. Charlotte corrige les autres agents — protocole autonome

> **Règle** : Charlotte est autorisée à corriger le code Python des autres agents dans leurs ConfigMaps pour les patterns documentés dans son RAG. Elle NE PEUT PAS se corriger elle-même.

**Patterns autorisés :**
- Streaming token-by-token (antipattern #28 / étape 6d)
- Fast-path conversationnel (antipattern #21 / étape 6c)
- Notification ntfy mission (étape 6e)

**Protocole en 6 étapes — obligatoire, aucune étape sautée :**

```
1. read_file('apps/agent-system/base/configmap-{agent}-script.yaml')
   ↳ Lire le code AVANT modification (ne jamais inventer le contenu)

2. Identifier dans le RAG le pattern exact à appliquer (CLAUDE-agents.md §6d/6c/6e)

3. apply_gitops_fix(file='apps/agent-system/base/configmap-{agent}-script.yaml',
                    content=<fichier complet corrigé>)
   ↳ TOUTES les clés du ConfigMap présentes (antipattern #22)

4. restart_deployment(name='{agent}', namespace='agent-system')

5. verify_pod_healthy(deployment='{agent}', namespace='agent-system', stable_seconds=30)
   ↳ Si échec → NE PAS continuer, alerter ntfy + ask_clarification

6. test_agent_stream(agent='{agent}')
   ↳ >3 chunks → ✅ fix confirmé, répondre avec le résultat
   ↳ 1-2 chunks → ❌ fix échoué → alerter ntfy + ask_clarification
```

**État streaming agents OWU au 2026-05-14 :**

| Agent | Service K8s | Outils visibles | Tokens progressifs | Heartbeat | Statut |
|---|---|---|---|---|---|
| **Charlotte** | `agent-charlotte:8383` | ✅ `_tool_emit` × 35 | ✅ `run_stream()` PydanticAI | ✅ | ✅ v4.0 |
| **Neo** | `agent-neo:8490` | ❌ | ✅ mot-par-mot | ✅ | ⚠️ pas d'outils visibles |
| **Leon** | `leon:8181` | ❌ | ✅ mot-par-mot | ❌ | ⚠️ à migrer |

**Règle pour tout nouvel agent OWU-facing** : implémenter les 3 éléments du Pattern A (outils visibles + heartbeat + tokens progressifs). Le pattern Charlotte v4 est la référence.

---

### 7. Kustomization + déploiement

```bash
# Ajouter dans apps/agent-system/base/kustomization.yaml :
#   - deployment-{name}.yaml
#   - service-{name}.yaml

kubectl apply -f ~/Kubinote-GitOps/apps/agent-system/base/deployment-{name}.yaml
kubectl apply -f ~/Kubinote-GitOps/apps/agent-system/base/service-{name}.yaml

kubectl exec deploy/{name} -n agent-system -- env | grep -E "LITELLM|LANGFUSE|LLM_MODEL|VAULT|AGENT_|MAIL_|PERMISSIONS"
```

### 8. Synchronisation Langfuse — 3 actions obligatoires

#### 8a. Enregistrer le system prompt

```bash
LF_PK="pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
LF_SK=$(kubectl get secret cluster-manager-secrets -n agent-system \
  -o jsonpath='{.data.LANGFUSE_SECRET_KEY}' | base64 -d)

curl -s -u "$LF_PK:$LF_SK" \
  -X POST "http://langfuse.neokube.local/api/public/v2/prompts" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "{name}-agent",
    "type": "text",
    "prompt": "<system prompt complet>",
    "labels": ["production", "latest"],
    "config": {"agent": "{name}", "permissions_scope": "{scope}"}
  }'
```

Convention : `{name}-{role}` (ex: `felix-ops`).

#### 8b. Ajouter des items au dataset `neokube-evals`

```bash
curl -s -u "$LF_PK:$LF_SK" \
  -X POST "http://langfuse.neokube.local/api/public/dataset-items" \
  -H "Content-Type: application/json" \
  -d "{\"datasetName\":\"neokube-evals\",
       \"input\":{\"question\":\"Question type pour {name}\"},
       \"metadata\":{\"agent\":\"{name}\",\"category\":\"<catégorie>\"}}"
```

Dataset ID : `cmou0e5wo000889pktwct4xhz` — endpoint : `POST /api/public/dataset-items`.

#### 8c. Implémenter le scoring

```python
async def _send_score(trace_name: str, score_name: str, value: float, comment: str = "") -> None:
    creds = base64.b64encode(f"{LANGFUSE_PK}:{LANGFUSE_SK}".encode()).decode()
    if not (LANGFUSE_PK and LANGFUSE_SK):
        return
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(
                f"{LANGFUSE_BASE_URL}/api/public/traces",
                params={"name": trace_name, "limit": 1, "orderBy": "timestamp.DESC"},
                headers={"Authorization": f"Basic {creds}"},
            )
            traces = r.json().get("data", [])
            if not traces:
                return
            trace_id = traces[0]["id"]
            await c.post(
                f"{LANGFUSE_BASE_URL}/api/public/scores",
                headers={"Authorization": f"Basic {creds}", "Content-Type": "application/json"},
                content=json.dumps({
                    "id": str(uuid.uuid4()), "traceId": trace_id,
                    "name": score_name, "value": value,
                    "comment": comment, "dataType": "NUMERIC", "source": "API",
                }).encode(),
            )
    except Exception:
        pass
```

> Envoyer au moins 1 score par workflow terminal. Valeur entre 0.0 (échec) et 1.0 (succès parfait).
