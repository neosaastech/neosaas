# CLAUDE-github-engine.md — github-engine v1.0 + mécanisme [ClaudeCode]

---

## 1. Mécanisme [ClaudeCode] — Charlotte signale, Claude Code applique

### Problème actuel

Charlotte ne peut pas modifier son propre code (anti-auto-modification guard).
Quand elle implémente quelque chose qui nécessite une modification de `sre_agent.py`,
elle crée une issue `[Charlotte]` → l'observer la lui redispatche → boucle infinie.

### Solution : préfixe `[ClaudeCode]`

```
[ClaudeCode] Appliquer _index_procedure() dans sre_agent.py — Charlotte a produit le code
```

**Règle zoho-observer** : les issues préfixées `[ClaudeCode]` ne sont PAS dispatchées aux agents.
Elles restent ouvertes et sont listées au démarrage de chaque session Claude Code.

**Règle Charlotte** : quand elle bute sur l'anti-auto-modification guard, elle crée
une issue `[ClaudeCode]` avec :
- Le code exact à appliquer (copié-collé ou diff)
- Le fichier cible et la ligne
- La vérification post-application

**Règle Claude Code** : au démarrage de chaque session, checker les issues `[ClaudeCode]` ouvertes :
```bash
# Commande de vérification au démarrage
curl -s ... zoho-engine /proxy GET /projects/2114101000001543041/bugs/ \
  | python3 -c "... filter title startswith('[ClaudeCode]') and status==open ..."
```

### Implémentation zoho-observer

Dans `worker_zoho_observer.py`, ajouter dans la fonction de routing :
```python
# Issues [ClaudeCode] → ne pas dispatcher, laisser pour Claude Code
if bug_title.startswith("[ClaudeCode]"):
    log.info("Issue-scan: [ClaudeCode] %s — skip (réservé Claude Code)", bug_id)
    continue
```

### Format issue [ClaudeCode]

```
Titre : [ClaudeCode] <action courte> — <contexte>

Description :
DEMANDEUR : Charlotte (session <session_id>)
FICHIER : apps/agent-system/base/configmap-sre-script.yaml
ACTION : Ajouter la fonction _index_procedure() dans sre_agent.py

CODE À APPLIQUER :
```python
async def _index_procedure(trigger: str, steps: list, ...):
    ...
```

LIGNE D'INSERTION : après la fonction _ntfy_notify (ligne ~100)
VÉRIFICATION : curl charlotte:8383/health retourne 200 après restart
```

---

## 2. github-engine v1.0

### État actuel (fragmenté)

| Service | Port | Usage | Problème |
|---|---|---|---|
| `github-connector` | 8001 | Proxy générique GitHub REST | Anti-pattern : URLs construites dans l'agent |
| `github-mcp` | 8080 | MCP streamable-http | Uniquement Camille/Guillaume/Alain/Dispatcher |
| Charlotte | — | Accès direct GitHub API + github-mcp | Pas de couche unifiée |

### Architecture cible : github-engine v1.0

```
github-engine  :8001  (remplace github-connector, en connector-system)
  Auth : Vault secret/neokube/infrastructure/github → GITHUB_TOKEN
  Org principale : neomnia
  Repos connus : neostudio, Kubinote-GitOps, template-nextjs, template-fastapi

Endpoints sémantiques :
  GET  /health
  POST /proxy              passthrough GitHub REST API
  GET  /repo.list          liste repos de l'org
  GET  /repo.info          infos repo (branches, topics, last commit)
  POST /file.read          lire un fichier (owner/repo, path, ref?)
  POST /file.write         créer/modifier un fichier (commit + push)
  POST /file.list          lister les fichiers d'un répertoire
  POST /pr.create          créer une Pull Request
  POST /pr.merge           merger une PR
  GET  /workflow.list      lister les workflows GitHub Actions
  POST /workflow.trigger   déclencher un workflow
  GET  /workflow.status    statut d'un run
  POST /branch.create      créer une branche
  POST /repo.create        créer un repo depuis un template
```

### Vault — `secret/neokube/infrastructure/github`

| Clé | Valeur | Usage |
|---|---|---|
| `GITHUB_TOKEN` | `ghp_tXe...` | Token PAT principal (org neomnia) |
| `GITHUB_ORG` | `neomnia` | Organisation par défaut |
| `GITHUB_TEMPLATE_NEXTJS` | `neomnia/template-nextjs` | Template frontend |
| `GITHUB_TEMPLATE_FASTAPI` | `neomnia/template-fastapi` | Template backend |

### RBAC par agent

Charlotte, Leon, Camille, Guillaume, Alain ont accès à des repos différents.
Le github-engine vérifie le header `X-Agent-Id` et applique les permissions :

```python
AGENT_PERMISSIONS = {
    "charlotte": {"repos": ["*"], "actions": ["read", "write", "admin"]},  # accès total
    "camille":   {"repos": ["*-frontend", "template-nextjs"], "actions": ["read", "write"]},
    "guillaume": {"repos": ["*-backend", "template-fastapi"], "actions": ["read", "write"]},
    "alain":     {"repos": ["*"], "actions": ["read", "workflow"]},
    "leon":      {"repos": ["Kubinote-GitOps", "neostudio"], "actions": ["read"]},
}
```

### Template endpoint `/file.write`

Opération la plus utilisée par Charlotte (modifier sre_agent.py, CLAUDE-*.md, etc.) :

```json
POST /file.write
{
  "owner": "neomnia",
  "repo": "Kubinote-GitOps",
  "path": "docs/CLAUDE-neostudio.md",
  "content": "<base64 ou texte>",
  "message": "docs(neostudio): process Charlotte — ajouter endpoint Engine",
  "branch": "main",
  "sha": "<optionnel — requis si fichier existant>"
}
```

Retourne :
```json
{
  "sha": "abc123...",
  "url": "https://github.com/neomnia/Kubinote-GitOps/blob/main/docs/CLAUDE-neostudio.md",
  "committed": true
}
```

### Endpoint `/workflow.trigger` — CI/CD NeoStudio

Charlotte peut déclencher le rebuild NeoStudio après avoir pushé du code :

```json
POST /workflow.trigger
{
  "owner": "charlesvdd",
  "repo": "neostudio",
  "workflow_id": "ci.yml",
  "ref": "main"
}
```

### Repos NeoKube connus

| Repo | Org/Owner | Usage |
|---|---|---|
| `Kubinote-GitOps` | `neomnia` | GitOps cluster K8s |
| `neostudio` | `charlesvdd` | NeoStudio Engine + UI |
| `template-nextjs` | `neomnia` | Template frontend Camille |
| `template-fastapi` | `neomnia` | Template backend Guillaume |
| `neosaas` | `neosaastech` | Projets SaaS clients |

### Migration github-connector → github-engine

1. Créer `configmap-github-engine.yaml` + `deployment-github-engine.yaml` + `service-github-engine.yaml`
2. Garder `github-connector` en DEPRECATED (rétrocompatibilité service DNS)
3. Mettre à jour Camille, Guillaume, Alain, Charlotte pour appeler `github-engine:8001`
4. Mettre à jour `GITHUB_CONNECTOR_URL` → `GITHUB_ENGINE_URL` dans tous les ConfigMaps
5. Supprimer github-connector après 7 jours de transition

### Note sur github-mcp

`github-mcp` (port 8080, MCP streamable-http) reste en place — c'est le protocole natif
pour Camille/Guillaume/Alain/Dispatcher. Il est complémentaire à github-engine :
- `github-mcp` : interactions riches (recherche, PR review, issues) via protocole MCP
- `github-engine` : opérations HTTP simples et reproductibles (read/write fichiers, CI/CD)
