# CLAUDE-penpot-pipeline.md — Plan de développement : Penpot → Code

> Statut : **PLANIFIÉ** — gap documenté le 2026-06-11
> Prérequis : Joseph V2.5 ✅ · penpot-engine V1.1 ✅ · Leon V3.4 ✅ · Camille V3.1 ✅

---

## Objectif

Automatiser la chaîne **Design validé dans Penpot → Code frontend prêt à déployer** sans intervention manuelle.

Déclencheur : Joseph a produit un Design System + wireframes → on veut que les tokens (couleurs, typos) soient automatiquement appliqués dans le projet Next.js/Tailwind de Camille, avec une PR GitHub + preview Vercel.

---

## Architecture cible

```
Utilisateur / Leon
  │
  ▼
[1] Leon  intent=design_deploy
  │   POST leon:8181/mission
  │   { intent: "design_deploy", penpot_file_id, project_name, github_repo }
  │
  ├─► Joseph  penpot_generate_spec(file_id)
  │     → spec.md (tokens nommés + typos + frames)
  │
  ├─► Joseph  penpot_export_design(file_id, format="tailwind")
  │     → tailwind_config (JSON), css_block (:root { --color-1: ... })
  │
  ▼
[2] Camille  intent=apply_design_tokens
  │   POST camille:8485/mission
  │   { intent: "apply_design_tokens", tokens, tailwind_config, css_vars, github_repo, branch }
  │
  ├─► GitHub MCP  git checkout -b design/penpot-{file_id[:8]}
  ├─► Patch  tailwind.config.js  → extend.colors.brand = { ... }
  ├─► Patch  app/globals.css     → :root { --color-primary: ...; --font-...: ... }
  ├─► Commit + PR GitHub
  │
  ▼
[3] Vercel  preview auto sur la PR
  │   (CI/CD existant : push branche → Vercel build → preview URL)
  │
  ▼
[4] Leon  email → chvandendriessche@neomnia.net
      "Tokens Penpot appliqués — PR #{n} + Vercel preview : https://..."
```

---

## Découpage en tâches

### Tâche 1 — Leon : intent `design_deploy` *(à coder)*

**Fichier** : `configmap-leon-script.yaml` (`leon.py`)

**Intent à ajouter** : `"design_deploy"`

**Handler** :
```python
elif intent == "design_deploy":
    penpot_file_id = data.get("penpot_file_id", "")
    project_name   = data.get("project_name", "")
    github_repo    = data.get("github_repo", "")   # ex: "neosaastech/neosaas"

    # 1. Récupérer les tokens depuis Joseph
    spec   = await _call_joseph("penpot_generate_spec",   {"file_id": penpot_file_id})
    tokens = await _call_joseph("penpot_export_design",   {"file_id": penpot_file_id, "format": "full"})

    # 2. Dispatcher à Camille
    camille_result = await _delegate(
        "camille",
        intent="apply_design_tokens",
        payload={
            "tokens":         tokens.get("tokens", {}),
            "tailwind_config": tokens.get("tailwind_config", {}),
            "css_block":      tokens.get("css_block", ""),
            "spec_markdown":  spec.get("spec", ""),
            "github_repo":    github_repo,
            "branch":         f"design/penpot-{penpot_file_id[:8]}",
        }
    )

    # 3. Email résultat
    pr_url = camille_result.get("pr_url", "")
    preview_url = camille_result.get("preview_url", "")
    await _send_email(
        subject=f"[Leon] Design tokens appliqués — {project_name}",
        body=f"PR GitHub : {pr_url}\nVercel preview : {preview_url}\n\nSpec complète :\n{spec.get('spec','')[:800]}"
    )
    return {"status": "ok", "pr_url": pr_url, "preview_url": preview_url}
```

**Exposition Charlotte** : ajouter dans `trigger_leon_workflow` :
```python
# Charlotte → trigger_leon_workflow(design_deploy, penpot_id=..., github_repo=...)
```

---

### Tâche 2 — Camille : intent `apply_design_tokens` *(à coder)*

**Fichier** : `configmap-camille-script.yaml` (`camille.py`)

**Intent à ajouter** : `"apply_design_tokens"`

**Handler** :
```python
elif intent == "apply_design_tokens":
    tokens        = data.get("tokens", {})
    tw_config     = data.get("tailwind_config", {})
    css_block     = data.get("css_block", "")
    github_repo   = data.get("github_repo", "")
    branch        = data.get("branch", f"design/penpot-{str(uuid.uuid4())[:8]}")

    # 1. Créer la branche
    await github_mcp.create_branch(repo=github_repo, branch=branch, from_branch="main")

    # 2. Lire tailwind.config.js existant
    current_tw = await github_mcp.read_file(repo=github_repo, path="tailwind.config.js", branch=branch)

    # 3. Merger les couleurs brand dans extend.colors
    # Patch : injecter tw_config["theme"]["extend"]["colors"] dans le fichier
    patched_tw = _patch_tailwind(current_tw, tw_config)
    await github_mcp.write_file(repo=github_repo, path="tailwind.config.js", content=patched_tw, branch=branch)

    # 4. Patcher globals.css
    current_css = await github_mcp.read_file(repo=github_repo, path="app/globals.css", branch=branch)
    patched_css = _patch_css_vars(current_css, css_block)
    await github_mcp.write_file(repo=github_repo, path="app/globals.css", content=patched_css, branch=branch)

    # 5. PR GitHub
    pr = await github_mcp.create_pr(
        repo=github_repo, branch=branch, base="main",
        title=f"design: apply Penpot tokens ({branch})",
        body=f"Tokens couleur + typographies extraits de Penpot.\n\nBranche : `{branch}`"
    )
    return {"pr_url": pr["html_url"], "branch": branch, "files_patched": ["tailwind.config.js", "app/globals.css"]}
```

**Helpers à écrire** :

| Helper | Ce qu'il fait |
|---|---|
| `_patch_tailwind(current_content, tw_config)` | Insère `extend.colors.brand` dans le `theme.extend` existant sans écraser le reste |
| `_patch_css_vars(current_css, css_block)` | Replace ou ajoute `:root { ... }` dans le fichier globals.css |

**Risques** :
- Le repo cible doit être dans l'organisation et accessible via GitHub MCP
- `tailwind.config.js` vs `tailwind.config.ts` — gérer les deux
- Next.js App Router : `app/globals.css` | Pages Router : `styles/globals.css`

---

### Tâche 3 — Charlotte : exposition `design_deploy` *(option)*

Ajouter dans les outils Charlotte :
```python
trigger_leon_workflow(
    intent="design_deploy",
    penpot_file_id="<uuid>",
    project_name="NeoSaaS Tech",
    github_repo="neosaastech/neosaas"
)
```

Optionnel si l'utilisateur déclenche directement via Leon.

---

## Pré-requis techniques

| Élément | État | Action |
|---|---|---|
| Joseph `penpot_generate_spec` | ✅ déployé | — |
| Joseph `penpot_export_design` format tailwind | ✅ déployé | — |
| Camille GitHub MCP | ✅ disponible | — |
| Leon `_call_joseph(tool, args)` helper | ✅ existe (`notify_leon` / HTTP direct) | Vérifier endpoint |
| Leon `_delegate("camille", ...)` | ✅ existe | Ajouter intent `apply_design_tokens` |
| Leon email | ✅ déployé | — |
| Vercel CI/CD sur PR | ✅ configuré via Alain / Vercel connector | — |
| `_patch_tailwind()` + `_patch_css_vars()` | ❌ à écrire | Dans `camille.py` |
| Intent `design_deploy` dans Leon | ❌ à coder | Tâche 1 |
| Intent `apply_design_tokens` dans Camille | ❌ à coder | Tâche 2 |

---

## Ordre d'implémentation recommandé

1. **Tâche 2 (Camille)** en premier — c'est le bout de chaîne le plus concret, testable indépendamment avec un payload JSON direct
2. **Tâche 1 (Leon)** — orchestration, appel Joseph + dispatch Camille
3. **Test end-to-end** sur un projet NeoSaaS Tech existant (repo + fichier Penpot connus)
4. **Tâche 3 (Charlotte)** — exposition optionnelle

---

## Test end-to-end cible

```bash
# Déclencher via Leon directement
curl -X POST http://leon.agent-system.svc.cluster.local:8181/mission \
  -H "Content-Type: application/json" \
  -d '{
    "message": "design_deploy",
    "intent": "design_deploy",
    "penpot_file_id": "<uuid_fichier_design_system>",
    "project_name": "NeoSaaS Tech",
    "github_repo": "neosaastech/neosaas"
  }'

# Résultat attendu :
# - Branche design/penpot-{id} créée sur GitHub
# - tailwind.config.js + globals.css patchés
# - PR ouverte (lien dans la réponse)
# - Email reçu sur chvandendriessche@neomnia.net
# - Vercel preview générée automatiquement sur la PR
```

---

## Dépendances entre agents (diagramme)

```
Utilisateur
    │ "applique les tokens du Design System NeoSaaS"
    ▼
  Leon (design_deploy)
    ├──HTTP──► Joseph (penpot_generate_spec + penpot_export_design)
    │               └─ retourne spec.md + tailwind_config + css_block
    │
    └──HTTP──► Camille (apply_design_tokens)
                    ├── GitHub MCP : checkout branch
                    ├── GitHub MCP : patch tailwind.config.js
                    ├── GitHub MCP : patch globals.css
                    └── GitHub MCP : create PR
                         └── Vercel CI auto → preview URL

Leon ←── résultat Camille (pr_url, preview_url)
Leon ──► Email utilisateur
```
