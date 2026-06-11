# CLAUDE-connector.md — Connector-system & MCP Servers

## Architecture couches d'accès API (2026-05-28)

```
[Agents Temporal]
      │
      ├─── MCP Servers (standard, auto-documentés, typage fort)
      │       ├── github-mcp  → connector-system:8080/mcp   (GitHub API)
      │       ├── k8s-mcp     → agent-system:8080/mcp       (Kubernetes API)
      │       └── mcp.neon.tech/sse                         (Neon API, remote)
      │
      ├─── Engines métier (services domaine — règles process + normalisation + RBAC)
      │       ├── zoho-engine v2.1      → déployé  (K8s: zoho-engine:8000)
      │       ├── github-engine v2.0    → à déployer (K8s: github-engine:8001, remplace github-connector)
      │       │     └── RBAC par agent — Leon est le gestionnaire des accès
      │       └── scaleway-engine v1.0  → à déployer (K8s: scaleway-engine:8012)
      │
      └─── Connectors Python (proxy léger + auth)
              └── vercel, penpot, openprovider, cloudflare, stalwart,
                  google-discovery, crawlee, dataforseo, neon(legacy)
                  github-connector → DEPRECATED après migration github-engine
```

**Règle** : MCP = couche préférée pour GitHub, K8s, Neon. Connectors = proxy léger pour APIs sans MCP. **Engines** = services métier avec logique propre (normalisation, règles process, RBAC par agent, API sémantique).

> **github-engine v2.0** : RBAC multi-agent, Leon gestionnaire des accès, multi-org → **[CLAUDE-github-engine.md](CLAUDE-github-engine.md)**
> **scaleway-engine** : documentation complète → **[CLAUDE-scaleway-engine.md](CLAUDE-scaleway-engine.md)**

---

## zoho-engine v2.1 (2026-05-29)

`zoho-engine` a évolué en **engine métier** tout en conservant le même K8s service name (`zoho-engine.connector-system.svc.cluster.local:8000`) — aucun caller n'a besoin d'être mis à jour.

| Aspect | `*-connector` (les 8 autres) | `zoho-engine v2.1` |
|---|---|---|
| Rôle | Proxy + auth centralisée | Proxy **+** règles métier + résilience OAuth2 |
| Logique interne | Stateless, pass-through | Normalisation, guards, retry, semantic endpoints |
| API exposée | `/proxy` générique | 9 endpoints sémantiques |
| Résilience | Aucune | Token cache 3min, creds cache 10min, retry x3 backoff, 429/5xx handling |

**Règle d'architecture** : toute nouvelle opération Zoho multi-agents doit d'abord être ajoutée comme endpoint sémantique dans zoho-engine — jamais embarquée dans le script d'un agent. Les agents font des appels HTTP simples, la logique métier (champs corrects, status_id, calculs dates) reste dans le connector.

### Nouveautés v2.0 vs v1.3

- **`_get_creds()`** — cache Vault 10 min (séparé du token). Évite le flood de requêtes Vault.
- **`_get_token()`** — cache 3 min (vs 45s), retry x3 avec backoff exponentiel (2s, 4s).
- **`_zoho_call()`** — helper centralisé : gère 429 (`Retry-After`), retry 5xx une fois.
- **`/scaffold`** — retourne maintenant `tasks_created`, `tasks_failed`, `errors[]`. Les échecs partiels sont visibles au lieu d'être silencieux.
- **`/milestone.delete`** — endpoint sémantique dédié (remplace `/milestone.complete` — voir anti-pattern #53).
- **`/project.status`** — endpoint sémantique dédié.
- **`/task.update`** — endpoint sémantique dédié.
- Supprimé : champ `public` dans `ScaffoldReq` (causait erreur 6832 — non supporté par l'API Zoho en création).

---

## MCP Servers — NeoKube

### github-mcp (connector-system)
- **Image** : `ghcr.io/github/github-mcp-server:latest`
- **Transport** : Streamable HTTP (`/mcp`)
- **Endpoint** : `http://github-mcp.connector-system.svc.cluster.local:8080/mcp`
- **Auth** : `Authorization: Bearer {GITHUB_PAT}` — Secret K8s `github-mcp-token` (clé `GITHUB_PERSONAL_ACCESS_TOKEN`) dans `connector-system` ET `agent-system`
- **Toolsets actifs** : `repos,git,issues,pull_requests,users`
- **Outils clés** : `create_repository`, `create_branch`, `push_files`, `create_or_update_file`, `get_file_contents`
- **Agents utilisateurs** : Aria (push_files), Nox (create_branch, create_or_update_file)
- **Limites** : pas d'équivalent MCP pour `POST /repos/{template}/generate` (template repo) → `github-connector` reste pour cette opération

### k8s-mcp (agent-system)
- **Image** : `ghcr.io/containers/kubernetes-mcp-server:latest`
- **Transport** : Streamable HTTP + SSE (`/mcp`, `/sse`)
- **Endpoint** : `http://k8s-mcp.agent-system.svc.cluster.local:8080/mcp`
- **Auth** : ServiceAccount `agent-sre-sa` (RBAC in-cluster, aucun token nécessaire)
- **19 outils** : `pods_list`, `pods_list_in_namespace`, `pods_log`, `pods_get`, `pods_delete`, `pods_run`, `pods_top`, `events_list`, `namespaces_list`, `nodes_log`, `nodes_stats_summary`, `nodes_top`, `resources_create_or_update`, `resources_delete`, `resources_get`, `resources_list`, `resources_scale`, `configuration_view`, `pods_exec`
- **Agents utilisateurs** : Charlotte (découverte dynamique `_init_k8s_mcp_tools()` au démarrage, outils préfixés `k8s_*`)

### mcp.neon.tech (remote SSE)
- **Transport** : SSE — `https://mcp.neon.tech/sse`
- **Auth** : `Authorization: Bearer {NEON_API_KEY}` — Secret K8s `leon-neon-secrets` clé `NEON_API_KEY`
- **31 outils** : `create_branch`, `delete_branch`, `describe_branch`, `get_connection_string`, `run_sql`, `run_sql_transaction`, `describe_table_schema`, `list_projects`, `create_project`, `prepare_database_migration`, `complete_database_migration`, etc.
- **Agents utilisateurs** : Nox (`_mcp_neon()` — `create_branch` + `get_connection_string`)
- **Pattern Nox** :
  ```python
  branch_text = await _mcp_neon("create_branch", {"projectId": PROJECT_ID, "branchName": slug})
  branch_id = re.search(r"Branch ID[:\s]+([a-z0-9-]+)", branch_text).group(1)
  cs_text = await _mcp_neon("get_connection_string", {"projectId": PROJECT_ID, "branchId": branch_id})
  host = re.search(r"@([^/\s]+)/", cs_text).group(1)
  ```

---

## Connectors Python (legacy)

Chaque connector est un pod `python:3.12-slim` dans `connector-system`. Tous lisent leurs credentials depuis **Vault** via le secret K8s `vault-root-token` (copié depuis `vault-init-keys` dans `security`).

---

## Table des connectors

| Connector | Port | Vault path | Clés |
|---|---|---|---|
| `zoho-engine` | 8000 | `secret/neokube/infrastructure/zoho` | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNTS_SERVER`, `ZOHO_PORTAL_ID` |
| `github-connector` | 8001 | `secret/neokube/infrastructure/github` | `GITHUB_TOKEN` |
| `vercel-connector` | 8002 | `secret/neokube/infrastructure/vercel` | `VERCEL_TOKEN`, `VERCEL_TEAM_ID` |
| `neon-connector` | 8003 | `secret/neokube/infrastructure/neon` | `NEON_API_KEY` |
| `penpot-connector` | 8004 | `secret/neokube/infrastructure/penpot` | `PENPOT_ACCESS_TOKEN` (owner), `PENPOT_ARIA_TOKEN`, `PENPOT_AGENT_TOKEN`, `PENPOT_EMAIL`, `PENPOT_PASSWORD` |
| `openprovider-connector` | 8005 | `secret/neokube/infrastructure/openprovider` | `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` |
| `cloudflare-connector` | 8006 | `secret/neokube/infrastructure/cloudflare` | `CF_DNS_TOKEN` (prioritaire), `CF_API_TOKEN` (fallback), `CF_ACCOUNT_ID` (optionnel) |
| `stalwart-connector` | 8007 | `secret/neokube/apps/stalwart` | `ADMIN_PASSWORD` |
| `google-discovery-connector` | 8008 | `secret/neokube/infrastructure/google` | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CX_ID` |
| `scaleway-engine` | 8012 | `secret/neokube/infrastructure/scaleway` | `SCW_SECRET_KEY`, `SCW_ORG_ID`, `SCW_DEFAULT_PROJECT_ID` — RBAC par agent via `X-Agent-Id` header |
| `crawlee-service` | 8009 | — (pas de credentials) | — |
| `dataforseo-connector` | 8010 | `secret/neokube/infrastructure/dataforseo` | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_API_KEY` (base64) |

---

## Endpoints exposés

Tous : `GET /health`, `POST /proxy {method?, path, params?, body?}`

**neon-connector** : `POST /query {project_id, sql, database?, role_name?}`

**vercel-connector** : injecte automatiquement `teamId` dans les params

**penpot-connector v2.0** : `path` = commande RPC Penpot (ex. `create-project`) ; auth par priorité : `PENPOT_ACCESS_TOKEN` (JWT `eyJ*` → `Authorization: Token`) → `as_agent="aria"` → `as_agent="penpot"` → email/password fallback. Champ `as_agent` dans le corps proxy pour agir sous l'identité d'un agent spécifique (visible dans l'UI Penpot). Voir gotchas dans [CLAUDE-penpot.md](CLAUDE-penpot.md).

**openprovider-connector v1.1** : auth JWT re-login auto sur 401 ; API base `https://api.openprovider.eu/v1beta` ; endpoints bonus `POST /dns/records/add {zone, records}` et `POST /dns/records/remove {zone, records}`

**cloudflare-connector** : utilise `CF_DNS_TOKEN` en priorité, fallback `CF_API_TOKEN` ; endpoint bonus `GET /zones` ; API base `https://api.cloudflare.com/client/v4`

**stalwart-connector** : auth Basic auto ; endpoints bonus `GET /accounts`, `POST /accounts/create {name, password, display_name?, quota?}`, `DELETE /accounts/{account}` ; cible `http://stalwart-web.stalwart.svc.cluster.local:8080`

**google-discovery-connector** : `POST /search {query, num_results?, site_restrict?, date_restrict?, start?, language?}` → `{items[], total_results, search_query, count}`

**crawlee-service** : `POST /crawl {url, selectors?, extract_text?, wait_for?, timeout?}`, `POST /batch {urls[], selectors?, extract_text?, timeout?}` (max 10), `POST /screenshot {url, full_page?, timeout?}` ; mutex interne (un crawl à la fois)

**dataforseo-connector** : `POST /search {query, num_results?, language?, location_code?, engine?}` ; fallback auto DataForSEO → SearXNG (surfsense-searxng) ; `POST /proxy {endpoint, body}` → accès direct DataForSEO v3 API

---

## Notes d'initialisation

**Contrainte Neon** : `POST /projects` est bloqué (organisation managed by Vercel). Pattern : branche-par-projet sur `NeoBridge` (`young-fog-76038471`) :
```
POST /projects/young-fog-76038471/branches
  body: {"branch": {"name": "<slug>"}, "endpoints": [{"type": "read_write"}]}
```
Projets Neon disponibles (pg17, aws-eu-central-1) : NeoBridge, Neosaas-App, Content-Mania, Popurank-Production, neon-fuchsia-window, neosaas-website.

**Provisionner credentials Google** (une seule fois) :
```bash
kubectl exec -n security vault-0 -- vault kv put \
  secret/neokube/infrastructure/google \
  GOOGLE_SEARCH_API_KEY="<clé-cloud-console>" \
  GOOGLE_CX_ID="<cx-id-programmable-search>"
```
> Obtenir sur programmablesearchengine.google.com (cx ID) + Google Cloud Console (API key, activer "Custom Search API"). Quota : 100 req/jour gratuites.

**penpot-connector** : créer le secret Vault avant le premier déploiement :
```bash
kubectl exec -n security vault-0 -- vault kv put \
  secret/neokube/infrastructure/penpot \
  PENPOT_EMAIL="admin@example.com" \
  PENPOT_PASSWORD="xxx"
```

**Recréer `vault-root-token` dans `connector-system`** :
```bash
kubectl create secret generic vault-root-token -n connector-system \
  --from-literal=root-token=$(kubectl get secret vault-init-keys -n security \
    -o jsonpath='{.data.root-token}' | base64 -d)
```

**Recréer `admin-sys-token`** (doit être identique dans `interfaces` ET `agent-system`) :
```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic admin-sys-token -n interfaces --from-literal=token="$TOKEN" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic admin-sys-token -n agent-system --from-literal=token="$TOKEN" --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deploy/admin-sys-agent -n interfaces
kubectl rollout restart deploy/agent-charlotte -n agent-system
```

---

## Règles de conception R1–R5

**R1 — Un connector = source de vérité unique pour son API**
Credentials, URL de base, headers obligatoires, post-processing : tout appartient au connector. Un agent ne doit jamais lire un secret d'API directement ni construire une URL vers l'API externe.

**R2 — Enrichir à la sortie, pas dans les agents**
Toute normalisation (renommage de champs, injection d'URLs web, casting de types) se fait dans le connector avant le `return`. Voir `_inject_web_urls()` dans `zoho-engine` v1.1 comme référence.

**R3 — Toujours exposer `/health` et `/proxy`**
`/health` doit être libre (probes K8s). `/proxy` reçoit `{method, path, data?}` et redirige vers l'API externe. Endpoints spécialisés en bonus si nécessaire.

**R4 — Valider les URLs avec le navigateur avant de les coder**
Toute URL construite manuellement doit être testée dans un vrai navigateur avant d'être codée. Ne jamais supposer le format depuis la doc officielle — le SPA Zoho utilise des routes `#fragment` non documentées.

**R5 — Domaines publics = neokube.fr (Cloudflare-managed)**
Tout nouveau service exposé publiquement utilise un sous-domaine `*.neokube.fr`. Ne jamais exposer sur un domaine dont le DNS n'est pas géré par Cloudflare — le proxy CF est requis pour le tunnel TLS.

**R6 — Le connector encode les règles API, pas les agents**
Un agent exprime une intention sémantique. Le connector traduit en appels API valides avec les bons champs, les bons formats, les bonnes valeurs par défaut. Quand une API tierce a des règles non documentées (champ obligatoire silencieux, valeur normalisée, rate-limit), la règle va dans le connector — jamais dans le system prompt ou le code agent. Résultat : un nouvel agent n'a pas à redécouvrir ces règles.

---

## zoho-engine v2.0 — Contrat agent

Endpoint interne : `http://zoho-engine.connector-system.svc.cluster.local:8000`
FastAPI title `zoho-engine`, version `2.0` — K8s service name inchangé.

### POST /scaffold — création projet complet

Accepte un payload sémantique, retourne `{project_id, web_url, milestones, tasklists, tasks_created, tasks_failed, errors}`.

```json
{
  "name": "Website Vitrine — Client XYZ",
  "description": "Objectifs + spécificités CDC depuis Notion",
  "start_date": "",        // MM-DD-YYYY — défaut: aujourd'hui
  "end_date": "",          // MM-DD-YYYY — OPTIONNEL (projet sans échéance fixe possible)
  "template_id": "",       // ID template Zoho (optionnel)
  "group_id": "",          // ID groupe/portfolio (optionnel)
  "milestones": [
    {
      "name": "Phase 1 — Avant-Vente",
      "flag": "internal",  // "internal" (livrable équipe) | "external" (livrable client)
      "start": "05-27-2026",
      "end": "06-03-2026",
      "tasklists": [
        { "name": "Lancement", "tasks": ["Organiser le kickoff", "Rédiger le brief"] },
        { "name": "Gate de sortie", "tasks": ["Checklist validée"] }
      ]
    }
  ]
}
```

**⚠️ Champ supprimé** : `public` — causait erreur Zoho 6832 ("Input Parameter Does Not Match the Pattern"). La visibilité se gère via l'UI Zoho uniquement.

**Normalisations automatiques via `_normalize_milestone_payload` (source unique — agents n'ont pas à les connaître) :**
- `owner` jalon → injecté automatiquement (`630459010` Charles, mono-compte actuel)
- `flag` jalon → défaut `"internal"` si absent ; alias `"start"→"internal"`, `"end"→"external"`
- `start_date`/`end_date` jalon vides → date du jour
- `end_date` projet → **non defaulté** — un projet peut n'avoir pas d'échéance
- Rate-limiting : 0.5s/jalon, 0.4s/tasklist, 0.3s/tâche
- Résilience : chaque appel passe par `_zoho_call()` (429 + 5xx retry)

**Réponse scaffold enrichie (v2.0)** :
```json
{
  "project_id": "2114101000001737018",
  "web_url": "https://projects.zoho.com/portal/neomniadotnet#zp/projects/2114101000001737018/",
  "status": "scaffolded",
  "milestones": {"Phase 1 — Avant-Vente": "2114101000001737051"},
  "tasklists": {"Lancement": "2114101000001737054"},
  "tasks_created": 3,
  "tasks_failed": 0,
  "errors": []
}
```

### POST /milestone.delete — supprimer un jalon

```json
{ "project_id": "123456789", "milestone_id": "987654321" }
```
→ `{"project_id": "...", "milestone_id": "...", "status": "deleted"}`

**⚠️ LIMITATION API ZOHO** : il est impossible de marquer un jalon comme `completed` via REST (champ `status` en lecture seule, calculé depuis les tâches liées). Voir anti-pattern #53. Pour "compléter" un jalon : fermer ses tâches via `/task.update` — Zoho le marque automatiquement.

### POST /project.status — changer le statut d'un projet

```json
{ "project_id": "123456789", "status": "active" }
```
Valeurs : `"active"` | `"completed"` | `"archived"`. Toute autre valeur → 400.

### POST /task.update — mettre à jour une tâche

```json
{
  "project_id": "123456789",
  "task_id": "987654321",
  "status": "closed",
  "person_responsible": "630459010",
  "priority": "High",
  "due_date": "06-15-2026"
}
```
Tous les champs sont optionnels sauf `project_id` + `task_id`. Au moins un champ requis.

**⚠️ BUG CONNU** : `status=closed` via `/task.update` est silencieusement ignoré par l'API Zoho — le connector retourne `{"updated": {"status": "closed"}}` sans vérifier la réponse Zoho. Le champ `status` dans le payload est ignoré par Zoho Projects v3.
**Workaround** : utiliser `/task.close` (endpoint sémantique dédié, atomique) ou `percent_complete=100` via `/proxy`.

### POST /task.close — clôture atomique centralisée

**C'est l'endpoint à utiliser pour toute clôture de tâche. Jamais modifier les agents pour fermer leurs propres tâches — c'est le zoho-observer qui appelle `/task.close` après dispatch.**

```json
{ "project_id": "123456789", "task_id": "987654321", "hours": 0.5, "notes": "Dispatché à Charlotte — auto" }
```
→ `{"closed": true, "task_id": "...", "log": {"logged": true, "duration": "0:30"}}`

- Guard : si déjà fermée → `{"closed": false, "reason": "already_closed"}`
- `hours=0` → pas de timelog, juste la clôture
- Utilise `percent_complete=100` en interne (seule méthode qui fonctionne avec Zoho v3)

### POST /issue.create — créer un bug/issue

Gouvernance centralisée : calcul `due_date` par severity, préfixage titre `[Creator]`, POST correct vers Zoho.

```json
{
  "project_id": "2114101000001543041",
  "title": "Titre de l'issue",
  "description": "",
  "severity": "minor",
  "priority": "Medium",
  "creator": "charlotte"
}
```
→ `{"issue_id": "...", "title": "[Charlotte] Titre", "severity": "minor", "due_date": "MM-DD-YYYY", "project_id": "...", "web_url": "..."}`

**Délais par severity** : `critical` +1j · `major` +3j · `minor` +7j · `feature` +30j · `enhancement` +90j

### POST /issue.close — clôturer un bug/issue

Poste un commentaire de résolution (si fourni) puis passe le statut à **Clôturé** (status_id `2114101000000046089`). Utilise `POST + status_id` — l'API Zoho v3 ignore `statusname` et rejette `PUT` sur les bugs.

```json
{ "project_id": "2114101000001543041", "issue_id": "2114101000001749111", "resolution": "Traité et résolu." }
```
→ `{"issue_id": "...", "project_id": "...", "status": "closed"}`

**⚠️ Piège API** : `statusname=Closed/Fermé/Clôturé` ignoré. `PUT` retourne 6500. Seul `POST + status_id` fonctionne.

### POST /delete-projects — suppression contrôlée

**Ne jamais utiliser `/proxy DELETE` pour supprimer des projets.** Endpoint dédié avec liste explicite.

```json
{ "project_ids": ["123456789", "987654321"] }
```

**Règles obligatoires AVANT d'appeler cet endpoint (enforcement Leon) :**
1. Appeler `zoho_list_projects` → présenter la liste complète à l'utilisateur
2. Obtenir une confirmation explicite projet par projet
3. Seulement alors appeler `/delete-projects` avec les IDs confirmés

`project_ids` vide → 400. Jamais de suppression sans validation humaine préalable.

### POST /proxy — passthrough générique

Pour tout endpoint Zoho non couvert par les endpoints sémantiques. Normalise automatiquement les jalons.

```json
{ "method": "POST|GET|PUT|PATCH|DELETE", "path": "/projects/.../...", "data": {} }
```

**Guard anti-destructif :** `DELETE /projects/` sans ID → **403 interdit**. Seul `/delete-projects` est autorisé pour les suppressions.

### Règles Zoho — champs requis par entité

| Entité | Champs obligatoires | Injectés auto | Notes |
|---|---|---|---|
| Milestone | `name` | `owner`, `flag`, `start_date`, `end_date` | flag: `"internal"`/`"external"` uniquement |
| Task | `name` | — | `priority` capitalisé : `"High"/"Medium"/"Low"` |
| Tasklist | `name` | — | `milestone_id` à la création (PATCH après = erreur 6831) |
| Project | `name` | — | `start_date` format MM-DD-YYYY ; `end_date` optionnel ; **pas de `public`** |

### Erreurs Zoho connues

| Code | Signification | Cause fréquente |
|---|---|---|
| 6831 | Jalon non créé (silencieux) | `owner` ou `flag` manquant |
| 6832 | "Input Parameter Does Not Match the Pattern" | `owner` au mauvais format (zpuid au lieu de user ID) ou champ non supporté (ex: `public`) |
| 6891 | "Given URL is wrong" | Double portal dans le path ou endpoint inexistant |
| 6500 | Conflit (ressource existe déjà) | → 409 levé par le connector |

**Portal** : `809731782` (neomniadotnet) — **Owner ID** : `630459010` (Charles)
**Base URL** : `https://projectsapi.zoho.com/restapi/portal/809731782`
**Header obligatoire** : `X-com-zoho-projects-version: 3`
