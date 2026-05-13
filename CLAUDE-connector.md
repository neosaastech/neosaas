# CLAUDE-connector.md — Connector-system & MCP Servers

## Architecture couches d'accès API (2026-05-13)

```
[Agents Temporal]
      │
      ├─── MCP Servers (standard, auto-documentés, typage fort)
      │       ├── github-mcp  → connector-system:8080/mcp   (GitHub API)
      │       ├── k8s-mcp     → agent-system:8080/mcp       (Kubernetes API)
      │       └── mcp.neon.tech/sse                         (Neon API, remote)
      │
      └─── Connectors Python (legacy, toujours actifs comme fallback)
              └── zoho, vercel, penpot, openprovider, cloudflare, stalwart,
                  google-discovery, crawlee, dataforseo
```

**Règle** : MCP = couche préférée pour GitHub, K8s, Neon. Connectors = couche de fallback et pour les APIs sans MCP standard (Zoho, Vercel OAuth, Penpot, etc.).

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
| `zoho-connector` | 8000 | `secret/neokube/infrastructure/zoho` | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNTS_SERVER`, `ZOHO_PORTAL_ID` |
| `github-connector` | 8001 | `secret/neokube/infrastructure/github` | `GITHUB_TOKEN` |
| `vercel-connector` | 8002 | `secret/neokube/infrastructure/vercel` | `VERCEL_TOKEN`, `VERCEL_TEAM_ID` |
| `neon-connector` | 8003 | `secret/neokube/infrastructure/neon` | `NEON_API_KEY` |
| `penpot-connector` | 8004 | `secret/neokube/infrastructure/penpot` | `PENPOT_EMAIL`, `PENPOT_PASSWORD` |
| `openprovider-connector` | 8005 | `secret/neokube/infrastructure/openprovider` | `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` |
| `cloudflare-connector` | 8006 | `secret/neokube/infrastructure/cloudflare` | `CF_DNS_TOKEN` (prioritaire), `CF_API_TOKEN` (fallback), `CF_ACCOUNT_ID` (optionnel) |
| `stalwart-connector` | 8007 | `secret/neokube/apps/stalwart` | `ADMIN_PASSWORD` |
| `google-discovery-connector` | 8008 | `secret/neokube/infrastructure/google` | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CX_ID` |
| `crawlee-service` | 8009 | — (pas de credentials) | — |
| `dataforseo-connector` | 8010 | `secret/neokube/infrastructure/dataforseo` | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_API_KEY` (base64) |

---

## Endpoints exposés

Tous : `GET /health`, `POST /proxy {method?, path, params?, body?}`

**neon-connector** : `POST /query {project_id, sql, database?, role_name?}`

**vercel-connector** : injecte automatiquement `teamId` dans les params

**penpot-connector** : `path` = commande RPC Penpot (ex. `create-project`) ; auth session cookie-based, re-login auto sur 401. Voir gotchas dans [CLAUDE-penpot.md](CLAUDE-penpot.md).

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
Toute normalisation (renommage de champs, injection d'URLs web, casting de types) se fait dans le connector avant le `return`. Voir `_inject_web_urls()` dans `zoho-connector` v1.1 comme référence.

**R3 — Toujours exposer `/health` et `/proxy`**
`/health` doit être libre (probes K8s). `/proxy` reçoit `{method, path, data?}` et redirige vers l'API externe. Endpoints spécialisés en bonus si nécessaire.

**R4 — Valider les URLs avec le navigateur avant de les coder**
Toute URL construite manuellement doit être testée dans un vrai navigateur avant d'être codée. Ne jamais supposer le format depuis la doc officielle — le SPA Zoho utilise des routes `#fragment` non documentées.

**R5 — Domaines publics = neokube.fr (Cloudflare-managed)**
Tout nouveau service exposé publiquement utilise un sous-domaine `*.neokube.fr`. Ne jamais exposer sur un domaine dont le DNS n'est pas géré par Cloudflare — le proxy CF est requis pour le tunnel TLS.
