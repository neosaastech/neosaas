# CLAUDE-github-engine.md — github-engine v2.0 + mécanisme [ClaudeCode]

> **Statut** : v2.0 — architecture cible (à déployer). github-connector port 8001 reste actif en
> legacy jusqu'à migration complète. Camille/Guillaume/Joseph utilisent déjà `repo_owner` extrait
> dynamiquement depuis `github_repo` — le fix org est déployé (2026-06-11).

---

## 1. Pourquoi un github-engine v2.0

### Problèmes de l'architecture actuelle

| Couche | Service | Problème |
|---|---|---|
| `github-connector` | Port 8001 | Proxy pass-through sans RBAC ni logique métier |
| `github-mcp` | Port 8080 | MCP riche mais sans RBAC — tout agent connecté = accès total |
| Agents | Camille, Guillaume, Alain | `GITHUB_ORG = "neomnia"` hardcodé → org fausse sur clients multi-org |
| Audit | — | Aucun audit trail : qui a pushé quoi, sur quel repo, depuis quel agent |

### Ce que github-engine v2.0 apporte

- **Multi-org natif** : `neomnia`, `neosaastech`, `charlesvdd`, orgs clients — une seule couche
- **RBAC par agent** : Leon administre les droits, le moteur les applique
- **Audit Langfuse** : chaque opération tracée (`agent`, `repo`, `action`, `sha`)
- **API sémantique** : endpoints métier identiques à zoho-engine (pas de construction d'URL dans les agents)
- **Migration transparente** : même DNS `github-engine.connector-system:8001` — callers inchangés

---

## 2. Architecture

```
Agents (Camille, Guillaume, Joseph, Charlotte, Alain)
    │  X-Agent-Id: camille
    │  POST /file.write  { owner, repo, path, content, message }
    ▼
github-engine v2.0  (connector-system, port 8001)
    │
    ├─ RBAC check : agent × repo × action → allow / deny
    │     └─ Config in ConfigMap `github-engine-rbac` (géré par Leon)
    │
    ├─ Auth : GITHUB_TOKEN (Vault secret/neokube/infrastructure/github)
    │         → multi-token par org possible (Vault paths distincts)
    │
    ├─ Audit : POST Langfuse event (agent, repo, action, sha, timestamp)
    │
    └─ GitHub REST API
         └─ response normalisée → JSON sémantique

Leon (Chef de Production)
    │
    ├─ github_grant_access(agent, repos, access, project_id?)
    │     → PATCH ConfigMap github-engine-rbac
    │     → rollout restart github-engine (recharge config)
    │
    └─ github_revoke_access(agent, repos)
          → idem
```

**Couche github-mcp** reste en place — complémentaire :
- `github-mcp` (:8080/mcp) : explorations interactives (search, review, issues structurées)
- `github-engine` (:8001) : opérations reproducibles avec RBAC (push, PR, CI/CD)

---

## 3. Endpoints sémantiques

```
GET  /health                            → {"status": "ok", "version": "2.0"}
POST /proxy                             → passthrough GitHub REST (legacy compat)
GET  /repo.list    ?org=neomnia         → liste repos de l'org
GET  /repo.info    ?owner=&repo=        → infos repo (branches, topics, last commit)
POST /file.read    { owner, repo, path, ref? }
POST /file.write   { owner, repo, path, content, message, branch, sha? }
POST /file.list    { owner, repo, path?, ref? }
POST /branch.create { owner, repo, branch, from_branch? }
POST /pr.create    { owner, repo, head, base, title, body }
POST /pr.merge     { owner, repo, pull_number, merge_method? }
GET  /workflow.list  ?owner=&repo=
POST /workflow.trigger { owner, repo, workflow_id, ref, inputs? }
GET  /workflow.status  ?owner=&repo=&run_id=
POST /repo.create   { owner, name, template?, private?, description? }
POST /access.grant  { agent, repos[], access[] }              ← Leon uniquement
POST /access.revoke { agent, repos[] }                        ← Leon uniquement
GET  /access.list   ?agent=                                   ← Charlotte + Leon
```

**Header obligatoire** : `X-Agent-Id: {agent_name}` — toutes requêtes sauf `/health`.

---

## 4. RBAC — configuration

### ConfigMap `github-engine-rbac` (namespace `connector-system`)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: github-engine-rbac
  namespace: connector-system
data:
  rbac.json: |
    {
      "default_deny": false,
      "agents": {
        "charlotte": {
          "repos":  ["*"],
          "access": ["read", "write", "pr", "workflow", "admin"]
        },
        "leon": {
          "repos":  ["Kubinote-GitOps", "neostudio"],
          "access": ["read", "access.grant", "access.revoke"]
        },
        "camille": {
          "repos":  ["*-frontend", "template-nextjs", "*"],
          "access": ["read", "write", "pr"]
        },
        "guillaume": {
          "repos":  ["*-backend", "template-fastapi", "*"],
          "access": ["read", "write", "pr"]
        },
        "joseph": {
          "repos":  ["*"],
          "access": ["read"]
        },
        "alain": {
          "repos":  ["*"],
          "access": ["read", "workflow"]
        }
      }
    }
```

### Niveaux d'accès

| Niveau | Opérations autorisées |
|---|---|
| `read` | `file.read`, `file.list`, `repo.info`, `repo.list`, `workflow.list`, `workflow.status` |
| `write` | `read` + `file.write`, `branch.create` |
| `pr` | `write` + `pr.create`, `pr.merge` |
| `workflow` | `read` + `workflow.trigger` |
| `admin` | Tout + `repo.create` |
| `access.grant` | `access.grant`, `access.revoke`, `access.list` — réservé Leon + Charlotte |

### Matching repos

- `"*"` → tous les repos de toutes les orgs
- `"*-frontend"` → repos dont le nom se termine par `-frontend`
- `"Kubinote-GitOps"` → nom exact (toutes orgs)
- `"neomnia/*"` → tous les repos de l'org neomnia

---

## 5. Leon — gestionnaire des accès GitHub

Leon est le **seul agent autorisé** à modifier les droits GitHub des autres agents (hors Charlotte).
C'est cohérent avec son rôle de Chef de Production : il dispatche les équipes et contrôle leurs périmètres.

### Outils Leon

```python
# Accorder l'accès à un agent sur des repos spécifiques
github_grant_access(
    agent    = "camille",
    repos    = ["neosaastech/neosaas", "neosaastech/neosaas-backend"],
    access   = ["read", "write", "pr"],
    project_id = "2114101000001234567",   # ID Zoho pour audit trail (optionnel)
)

# Révoquer l'accès d'un agent
github_revoke_access(
    agent = "camille",
    repos = ["neosaastech/neosaas"],
)

# Lister les droits d'un agent
github_list_access(agent="camille")
```

### Quand Leon accorde des accès

| Événement | Action Leon |
|---|---|
| Création d'un agent | `github_grant_access` après `create_agent()` (voir §8 CLAUDE-create-agent.md) |
| Nouveau projet client | `github_grant_access(camille, [client/repo-front], ["write","pr"])` |
| Fin de projet | `github_revoke_access(camille, [client/repo-front])` |
| Décommission agent | `github_revoke_access(agent, ["*"])` + confirmation Charlotte |

### Hiérarchie des droits

```
Charlotte  →  accès total (infrastructure)
Leon       →  gestionnaire accès + lecture GitOps
    │
    ├─ Camille   →  write repos *-frontend (Leon délègue)
    ├─ Guillaume →  write repos *-backend (Leon délègue)
    ├─ Joseph    →  read uniquement
    └─ Alain     →  read + workflow uniquement
```

---

## 6. Vault — secrets GitHub

```
secret/neokube/infrastructure/github
  ├─ GITHUB_TOKEN          ghp_xxx...  (PAT principal — org neomnia + accès multi-org)
  ├─ GITHUB_ORG            neomnia
  ├─ GITHUB_TEMPLATE_FRONT neomnia/template-nextjs
  └─ GITHUB_TEMPLATE_BACK  neomnia/template-fastapi
```

**Multi-org** : le PAT principal doit être autorisé sur les orgs clientes. Si un client utilise
une org GitHub séparée, stocker un second token :
```
secret/neokube/github/{client}
  └─ GITHUB_TOKEN_CLIENT   ghp_yyy...
```

Le github-engine résout le token par org depuis Vault :
1. Cherche `secret/neokube/github/{owner}` → `GITHUB_TOKEN_CLIENT`
2. Fallback sur `secret/neokube/infrastructure/github` → `GITHUB_TOKEN`

---

## 7. Repos NeoKube connus

| Repo | Org/Owner | Usage | Agents ayant write |
|---|---|---|---|
| `Kubinote-GitOps` | `neomnia` | GitOps cluster K8s | Charlotte (admin), Leon (read) |
| `neostudio` | `charlesvdd` | NeoStudio Engine + UI | Charlotte (admin), Leon (read) |
| `template-nextjs` | `neomnia` | Template frontend | Charlotte (admin), Camille (read) |
| `template-fastapi` | `neomnia` | Template backend | Charlotte (admin), Guillaume (read) |
| `neosaas` | `neosaastech` | Projet SaaS client | Camille (write), Guillaume (write) |

---

## 8. Migration github-connector → github-engine

### État actuel (2026-06-11)

- `github-connector` : port 8001, actif, proxy pass-through — **legacy, à migrer**
- `github-mcp` : port 8080, actif, MCP streamable-http — **reste en place**
- Agents : Camille et Guillaume passent par `github-mcp`. Charlotte appelle GitHub REST direct.

### Plan de migration

| Étape | Action | Durée |
|---|---|---|
| 1 | Créer ConfigMap `github-engine-rbac` + deploy `github-engine` sur port 8001 | 30 min |
| 2 | Mettre à jour `GITHUB_CONNECTOR_URL` → `GITHUB_ENGINE_URL` dans les ConfigMaps Camille + Guillaume | 15 min |
| 3 | Tester RBAC sur un repo test — vérifier deny sur accès non autorisé | 30 min |
| 4 | Activer audit Langfuse (`github_ops` events) | 15 min |
| 5 | Supprimer `github-connector` après 7 jours sans appels | — |

### Note `github-mcp`

`github-mcp` (MCP streamable-http) reste en place — complémentaire pour les opérations
interactives (browse, search, review). Le github-engine est pour les opérations
reproducibles programmatiques (CI/CD, push depuis workflow).

---

## 9. Fix Camille déployé — org dynamique (2026-06-11)

**Problème** : `GITHUB_ORG = "neomnia"` hardcodé → tous les push Camille allaient sur `neomnia/repo`
même quand `github_repo = "neosaastech/neosaas"`.

**Fix déployé dans `camille.py`** :
```python
# generate_pages_from_penpot et apply_design_tokens
if "/" in github_repo:
    repo_owner, repo_name = github_repo.split("/", 1)
else:
    repo_owner, repo_name = GITHUB_ORG, github_repo

# Propagation à tous les appels :
_mcp_github("create_branch",    {"owner": repo_owner, ...})
_mcp_github("get_file_contents", {"owner": repo_owner, ...})
camille_push_to_github(..., owner=repo_owner)
_create_pr(..., owner=repo_owner)
```

**`camille_build_frontend`** (création repo depuis template) garde `GITHUB_ORG` — c'est intentionnel :
les repos Neomnia sont toujours créés dans l'org principale.

---

## 10. Mécanisme [ClaudeCode] — Charlotte signale, Claude Code applique

Charlotte ne peut pas modifier son propre code (anti-auto-modification guard).
Quand elle détecte un besoin de modification de `sre_agent.py`, elle crée une issue `[ClaudeCode]`.

### Règle zoho-observer

Issues préfixées `[ClaudeCode]` → **ne sont PAS dispatchées** aux agents.
Elles restent ouvertes pour Claude Code.

```python
# Dans worker_zoho_observer.py
if bug_title.startswith("[ClaudeCode]"):
    log.info("Issue-scan: [ClaudeCode] %s — skip (réservé Claude Code)", bug_id)
    continue
```

### Format issue Charlotte

```
Titre : [ClaudeCode] <action courte> — <contexte>

DEMANDEUR : Charlotte (session <session_id>)
FICHIER : apps/agent-system/base/configmap-sre-script.yaml
ACTION : <code exact à appliquer>
LIGNE D'INSERTION : <contexte, ex: "après _ntfy_notify, ligne ~100">
VÉRIFICATION : <commande post-apply>
```

### Commande de vérification au démarrage (Claude Code)

```bash
curl -s http://zoho-engine.connector-system.svc.cluster.local:8000/proxy \
  -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/projects/2114101000001543041/bugs/","params":{"status":"open"}}' \
  | python3 -c "
import json,sys
bugs=[b for b in json.load(sys.stdin).get('bugs',{}).get('bug',[])
      if b.get('title','').startswith('[ClaudeCode]')]
[print(b['bug_number'],'—',b['title']) for b in bugs]
"
```
