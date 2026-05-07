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

> **Neo** est le seul agent exposé via Open WebUI (endpoint OpenAI-compat `/v1/chat/completions`). Il agit comme agent maître côté interface humaine, avec accès à tous les connectors et polling IMAP `neo@neokube.fr`.

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

## Charlotte SRE — Architecture interne (v3.11)

`SREScanWorkflow` tourne toutes les `SRE_SCAN_INTERVAL_S` secondes (défaut 300s) via un Temporal Schedule.

| Bloc | Étapes | Activités clés |
|---|---|---|
| **A — Scan** | 1. Temporal failures · 2. Pod health · 3. Backup status · 4. LLM key status · 5. Vectorisation | `sre_scan_temporal_failures`, `sre_scan_pod_health`, `sre_verify_backup`, `sre_check_llm_key_status` |
| **B — Remédiation** | 6. Auto-restart agents CrashLoop | `sre_auto_restart_agents` |
| **C — LLM** | 7. Analyse LLM (diagnostic + sévérité) · score Langfuse `cluster_health_score` | `sre_analyze_with_llm`, `sre_push_langfuse_score` |
| **D — Reporting** | 8. Matrice agents · 9. ntfy si severity critical/warning | `sre_agent_health_matrix`, `sre_ntfy_notify` |
| **E — Eval Watch** | 10. Poll scores Langfuse (1 cycle sur `EVAL_WATCH_EVERY_N`=6) → ntfy + llm-key-sync si dégradation | `sre_check_eval_scores` |

Variables importantes : `SRE_SCAN_INTERVAL_S` (300), `EVAL_WATCH_EVERY_N` (6), `EVAL_SCORE_THRESHOLD` (7.0), `LLM_ANALYZE_EVERY_N` (1).

### Flux Leon → Charlotte

```
ProjectSpec validé par Dispatcher
  → Charlotte : reçoit signal "project_spec_received"
  → Charlotte : déclenche SREProvisionWorkflow si infra requise
```

### admin-sys v4.1 (`interfaces` namespace, port 8000)

- `GET /health` — libre (probes K8s)
- `POST /execute {args: [...], timeout?: int}` — exécute kubectl, FORBIDDEN: exec/cp/port-forward/proxy
- `POST /apply {manifest: str, namespace?: str}` — kubectl apply -f -
- **Auth** : header `X-Admin-Sys-Token` obligatoire sur `/execute` et `/apply` (secret `admin-sys-token` dans `interfaces` + `agent-system`)
- ClusterRole `admin-sys-executor` : lecture universelle + mutations workloads/config/RBAC/batch
- GitOps : `apps/interfaces/base/configmap-admin-sys-script.yaml` + `rbac-admin-sys-executor.yaml`

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

Charlotte a accès aux outils suivants pour agir sur le cluster :

| Outil | Rôle | Usage |
|---|---|---|
| `run_kubectl` | kubectl read/rollout uniquement (`delete`/`exec`/`cp`/`port-forward` bloqués) | Diagnostic + apply |
| `restart_deployment` | `kubectl rollout restart` ciblé | Restart sans modifier le manifest |
| `list_cluster_state` | Vue agrégée (pods + agents + backup + analyse LLM récente) | Étape 1 obligatoire avant toute remédiation |
| `apply_gitops_fix` | **⭐ OUTIL PRINCIPAL** : atomique write+apply+verify+push en une opération | Pour toute modification manifest GitOps |
| `verify_pod_healthy` | Validation post-fix : Ready=N/N + 0 restart pendant `stable_seconds` (défaut 30) | Utilisé en interne par `apply_gitops_fix`, ou seul après `restart_deployment` |
| `read_file` (fuzzy) | Lit `/gitops/...` ou `/var/sre/...` ; si introuvable, propose des candidats fuzzy par tokens du nom | Avant tout `apply_gitops_fix` ou `write_file` |
| `write_file` | Écrit un manifest dans `/gitops/` | Fallback si `apply_gitops_fix` non disponible |
| `git_status` / `git_push` | Commit/push vers `Kubinote-GitOps` | Fallback si `apply_gitops_fix` non disponible |

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
4. **Périmètre étendu (2026-05-07)** — `monitoring`, `stalwart`, `penpot`, `dify`, `surfsense` sont désormais **autorisés en remédiation** sur demande explicite (au lieu de SIGNALER uniquement). `kube-system` et `security` restent SIGNALER uniquement.
5. **Restart Charlotte interdit** — Charlotte ne peut pas redémarrer `agent-charlotte` elle-même (`restart_deployment` retourne ⛔), cela couperait la session en cours.

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

**Root cause :** zero-cache (rocicorp/zero 0.26.x) démarre 2 sous-process Node.js indépendants (`syncer` + `change-streamer`), chacun avec son propre heap V8. Le heap total nécessaire est donc ~2× la `replicaSize` (130 MB empirique). 6 Gi crashait encore le change-streamer. **10 Gi tient.**

**Fix définitif (commit `af3db45`) :**
```yaml
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=10240"   # 10 Gi heap V8
resources:
  requests: {memory: 2Gi}
  limits:   {memory: 12Gi}             # headroom au-dessus du heap
livenessProbe:  {initialDelaySeconds: 60, failureThreshold: 3}
readinessProbe: {initialDelaySeconds: 30, failureThreshold: 10}
```

**Ce qui a empêché le push initial :** le serveur neokube-beta a crashé après `kubectl apply` mais avant `git_push`. Le pod vivait avec le fix en live, mais le repo pointait vers l'ancienne config — cluster-bootstrap allait reverter. → C'est la raison d'être de `apply_gitops_fix` : rendre le push impossible à oublier.

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
```

**Leon ne code jamais, ne déploie jamais** — interdit par `forbidden_actions` dans l'AgentSpec.

**GitHub templates** :
- `neomnia/template-nextjs` — Next.js 15, TypeScript, Tailwind, App Router
- `neomnia/template-fastapi` — FastAPI + asyncpg + Dockerfile + `.env.example`

---

## R9 — Gouvernance LLM par agent (verrouillé 2026-05-06)

Chaque agent a son propre profil LLM dans son deployment K8s. **Jamais de modèle hardcodé dans le code Python** — toujours lu depuis les variables d'environnement.

### Profils LLM actifs

> **⚠️ TEMPORAIRE (depuis 2026-05-06)** : Charlotte et Penpot sur `mistral` (compte Anthropic épuisé). Dispatcher et Domi sur `mistral` (quota Gemini-flash épuisé, réinitialisation quotidienne).

| Agent | `LLM_MODEL` actuel | Modèle cible | Justification |
|---|---|---|---|
| **Charlotte** SRE | `mistral` ⚠️ | `claude-sonnet` | Décisions critiques cluster |
| **Leon** | `mistral-large-2407` | `mistral-large-2407` | Dialogue client |
| **Dispatcher** | `mistral` ⚠️ | `gemini-flash` | Orchestration pure |
| **Aria** Frontend | `codestral` | `codestral` | Génération de code |
| **Nox** Backend | `codestral` | `codestral` | Génération de code |
| **Vera** QA | `mistral-large-2407` | `mistral-large-2407` | Analyse qualité |
| **Penpot** Design | `mistral` ⚠️ | `gemini-flash` | Scaffolding léger |
| **Domi** Domain | `mistral` ⚠️ | `gemini-flash` | Opérations déterministes |
| **Neo** Assistant | `mistral-large-2407` | `mistral-large-2407` | Assistant démo client |

> **Restaurer Charlotte + Penpot** : recharger Anthropic → `llm-key-sync` → modifier `LLM_MODEL: "claude-sonnet"` dans deployments → `kubectl rollout restart`.
> **Restaurer Dispatcher + Domi** : quota Gemini se réinitialise auto → modifier `LLM_MODEL: "gemini-flash"` dans deployments.

### Règles R9

**R9.1** — `LLM_MODEL` obligatoire dans chaque deployment. Le défaut dans le code est un secours de développement, pas une config de production.

**R9.2** — L'alias `mistral` dans LiteLLM est verrouillé sur `mistral-large-2407`. Changer la version impacte tous les agents qui l'utilisent.

**R9.3** — Neo est isolé des agents de production. Son modèle est indépendant de Charlotte, Leon, Dispatcher…

**R9.4** — Multi-LLM dans un workflow = variables séparées (ex: `LLM_MODEL` + `LLM_MODEL_REASONING`). Jamais de switch de modèle par logique conditionnelle hardcodée.

**R9.5** — Virtual keys LiteLLM actives depuis 2026-05-06. Une virtual key par agent dans Vault `secret/neokube/agents/{name}/llm`. Secret K8s `litellm-agent-keys` dans `agent-system`. Aucun agent n'utilise plus `LITELLM_MASTER_KEY`.

**R9.6** — Langfuse : toujours `cluster-manager-secrets` depuis `agent-system` (jamais `cockpit-secrets`, mauvais namespace). Public key : `pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f`. Projet : `neokube-agents`.

**R9.7** — Identité complète dans chaque trace Langfuse : nom, email (`@neokube.fr`), périmètre permissions.

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
