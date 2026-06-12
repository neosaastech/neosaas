# CLAUDE-camille.md — Architecture Camille v4.0

> Statut : **DOCUMENTÉ** — 2026-06-12
> Camille v3.3 déployée · v4.0 en conception

---

## Contexte — Ce que Camille sait faire aujourd'hui (v3.3)

Camille est le **Frontend Builder** de NeoKube. Elle opère sur le repo GitHub du projet frontend (`template-nextjs` → fork client) et déploie sur Vercel.

### Intents actuels (v3.3)

| Intent | Déclencheur | Ce qu'elle fait |
|---|---|---|
| `apply_design_tokens` | Leon `design_deploy` | Patch `globals.css` + `tailwind.config.js` depuis tokens Penpot |
| `generate_pages_from_penpot` | Leon `dispatch_design_and_backend` | Convertit wireframes Penpot → fichiers Next.js |
| `camille_build_frontend` | Leon `dev_project` | Crée le repo depuis le template + déploie Vercel |

### Problème fondamental identifié (2026-06-12)

Camille **n'analyse pas le contexte avant d'agir** :
- Elle ne vérifie pas si la page existe déjà dans le repo
- Elle ne détecte pas si la page contient des éléments qui nécessitent du backend (formulaires, boutons d'action, tables de données)
- Elle ne distingue pas une modification de style d'une création de page complète
- En cas de composant manquant dans un repo existant → elle ne sait pas le créer

---

## Architecture cible — Camille v4.0 : Analyze → Execute

### Principe

**Une seule entrée, deux phases obligatoires.**

```
Leon / Claude Code
    │
    ▼
Camille  POST /mission  { intent: "analyze_and_act", penpot_file_id, github_repo, ... }
    │
    ├─── PHASE 1 : ANALYZE ──────────────────────────────────────────────
    │    1a. Lire le repo GitHub (fichiers existants, structure pages)
    │    1b. Lire le fichier Penpot (type de page, éléments, composants)
    │    1c. Classifier : type + niveau d'intégration + besoins backend
    │    1d. Produire un plan d'action structuré
    │    └── Si page complexe → retourner plan à Leon pour validation
    │
    └─── PHASE 2 : EXECUTE ──────────────────────────────────────────────
         Adapter l'action au résultat de l'analyse
         └── Si backend_needs → signal Guillaume en parallèle
```

---

## Phase 1 : ANALYZE

### 1a. Lecture repo GitHub

Camille lit via `github-engine /file.read` :
- La structure de `app/` pour savoir si la page existe déjà
- Le fichier ciblé si existant (imports, exports, props attendues)
- Les composants UI présents dans `components/`

**Résultat** :
```json
{
  "repo_state": "new | partial | existing",
  "existing_files": ["app/(private)/admin/settings/page.tsx"],
  "target_exists": true | false,
  "target_content_summary": "Page Settings avec onglet Logs — importe LogsClient vide"
}
```

### 1b. Lecture Penpot

Camille appelle `penpot-engine /file.read` sur le fichier cible :
- Structure des frames/pages
- Présence de composants interactifs

**Résultat** :
```json
{
  "pages": [{"name": "Dashboard", "frames": [...]}],
  "has_forms": true,
  "has_tables": true,
  "has_buttons_with_actions": false,
  "design_tokens_present": true
}
```

### 1c. Classification

#### Type de page

| Type | Critères de détection | Action Camille |
|---|---|---|
| `static` | Contenu figé, pas d'interaction, pas de données | Génère directement |
| `display` | Données lues (liste, dashboard) — pas de mutation | Génère + signal Guillaume pour endpoint GET |
| `form` | Inputs, boutons submit, validation | Génère + signal Guillaume pour action/mutation |
| `hybrid` | Mix display + form | Génère + signal Guillaume (GET + mutation) |
| `design_only` | Tokens/style uniquement, pas de nouvelle page | Patch CSS/Tailwind uniquement |
| `fix` | Composant manquant ou cassé dans repo existant | Lit le contexte + génère le composant manquant |

#### Niveau d'intégration

| Niveau | Définition | Conséquence |
|---|---|---|
| `new` | Fichier n'existe pas dans le repo | Génération complète |
| `partial` | Fichier existe mais incomplet (ex: empty tsx) | Lecture contexte → génération ciblée |
| `existing` | Fichier complet — modification de style seulement | Patch minimal (ne pas écraser) |
| `conflict` | Fichier existe avec logique différente | Retourner à Leon pour arbitrage |

#### Besoins backend (`backend_needs[]`)

Camille détecte automatiquement selon les éléments Penpot et le contexte :

```
"submit" ou "save" ou "create" dans un bouton → mutation (POST/PUT)
Table avec données → endpoint GET + pagination
Form avec validation → server action Next.js
Upload zone → endpoint multipart
Auth gate (lock icon, "admin only") → useRequireAdmin hook
```

### 1d. Plan d'action

```json
{
  "page_type": "fix",
  "integration_level": "partial",
  "backend_needs": [],
  "proposed_actions": [
    {
      "step": 1,
      "action": "read_context",
      "target": "app/(private)/admin/settings/page.tsx",
      "reason": "Comprendre ce que LogsClient doit exporter"
    },
    {
      "step": 2,
      "action": "generate_component",
      "target": "app/(private)/admin/logs/logs-client.tsx",
      "exports": ["LogsClient"],
      "style": "match_existing"
    },
    {
      "step": 3,
      "action": "push",
      "branch": "design/penpot-01141887",
      "commit_message": "fix: implement LogsClient component"
    }
  ],
  "requires_guillaume": false,
  "requires_leon_validation": false
}
```

---

## Phase 2 : EXECUTE

### Matrice de décision

```
page_type=static + integration_level=new
    → Camille génère directement, push, PR, preview Vercel

page_type=display + integration_level=new
    → Camille génère le composant (skeleton + données mockées)
    → Signal Guillaume : "endpoint GET /api/{resource} attendu"
    → PR + preview Vercel avec données mockées jusqu'à merge backend

page_type=form + integration_level=new
    → Camille génère le form (état, validation UI)
    → Signal Guillaume : "server action {action_name} attendue dans app/actions/"
    → PR + preview Vercel avec submit désactivé jusqu'à merge backend

page_type=hybrid + integration_level=new
    → asyncio.gather(Camille génère, Guillaume crée endpoints)
    → Camille attend signal Guillaume avant de brancher les appels
    → PR commune ou 2 PR liées

page_type=design_only
    → Camille patche globals.css + tailwind.config.js uniquement
    → Pas de nouvelle page, pas de signal Guillaume

page_type=fix + integration_level=partial
    → Camille lit le fichier importateur pour comprendre le contrat
    → Génère le composant manquant en style matching
    → Push sur la branche existante

integration_level=conflict
    → Retour immédiat à Leon : résumé du conflit + choix proposés
    → Pas d'action automatique
```

### Checkpoint Leon (optionnel)

Pour `page_type=hybrid` ou `requires_guillaume=true`, Camille peut retourner le plan avant d'exécuter :

```python
if plan["page_type"] in ("hybrid", "form") and plan["requires_leon_validation"]:
    return {
        "status": "plan_ready",
        "plan": plan,
        "message": "Plan prêt — en attente de validation Leon avant exécution"
    }
```

Leon répond avec `intent=execute_plan` + `plan_id` → Camille exécute.

**Règle** : `requires_leon_validation=True` seulement si `backend_needs` non vides ET repo existant (éviter d'interrompre les cas simples).

---

## Nouveau schéma d'intents (v4.0)

### `analyze_and_act` (intent principal)

```python
POST camille:8485/mission
{
  "intent": "analyze_and_act",
  "penpot_file_id": "01141887-c40c-8076-8008-289b55a19a94",  # optionnel
  "github_repo": "neosaastech/neosaas",
  "branch": "design/penpot-01141887",                          # optionnel — créée si absente
  "target_path": "app/(private)/admin/logs/logs-client.tsx",   # optionnel — si fix ciblé
  "context_hint": "fix|generate|tokens|pages"                  # hint léger, pas de hard routing
}
```

### Intents conservés (backward compat)

| Intent | Comportement v4.0 |
|---|---|
| `apply_design_tokens` | Conservé — court-circuite analyze (optimisation pour tokens purs) |
| `generate_pages_from_penpot` | Conservé — déclenche analyze Phase 1b+1c automatiquement |
| `camille_build_frontend` | Conservé — pas d'analyze (nouveau projet = contexte connu) |

---

## Signal Guillaume — Protocole

Quand Camille détecte des `backend_needs` :

```python
# Camille signal vers Guillaume
await httpx.post("http://guillaume:8486/mission", json={
    "intent": "implement_endpoints",
    "github_repo": github_repo,
    "branch": branch,
    "endpoints_needed": [
        {"method": "GET", "path": "/api/logs", "response_shape": {"logs": [{"id", "level", "message", "timestamp"}]}},
    ],
    "context": "Camille a généré LogsClient — attend endpoint GET /api/logs"
})
```

Guillaume répond avec `endpoint_url` → Camille branché dans le composant généré.

---

## Détection de style (fix + partial)

Pour `page_type=fix` ou `integration_level=partial`, Camille lit les fichiers voisins pour matcher le style :

1. Lire le fichier qui importe le composant manquant → comprendre le contrat (exports attendus, props)
2. Lire 1-2 composants dans le même répertoire → comprendre les patterns UI (shadcn, lucide-react, cn(), etc.)
3. Générer en suivant ces patterns — pas de style inventé

**Anti-pattern** : générer un composant avec des imports qui n'existent pas dans le repo (ex: `import { DataTable } from "@/components/ui/data-table"` si non présent).

---

## Implémentation — Plan de développement

### v4.0-alpha : `fix` + `partial` (priorité immédiate)

- [ ] Ajouter intent `analyze_and_act` dans `/mission`
- [ ] Implémenter `_analyze_repo(github_repo, branch, target_path)` → lit les fichiers voisins
- [ ] Implémenter `_classify_page(penpot_data, repo_state)` → retourne `PageAnalysis`
- [ ] Implémenter `_fix_component(analysis, context_files)` → appelle LiteLLM codestral avec contexte
- [ ] Tester sur `logs-client.tsx` (cas référence)

### v4.0-beta : `generate` + `display`

- [ ] Implémenter `_generate_static_page(penpot_frames, repo_state)`
- [ ] Implémenter `_generate_display_page(penpot_frames, repo_state)` + signal Guillaume

### v4.0 : `form` + `hybrid` + checkpoint Leon

- [ ] Implémenter `_generate_form_page` + signal Guillaume mutations
- [ ] Implémenter checkpoint Leon (`requires_leon_validation` gate)
- [ ] Implémenter `execute_plan` intent (reprise après validation Leon)

---

## Anti-patterns à éviter

| # | Anti-pattern | Règle |
|---|---|---|
| AP-C1 | Écraser un fichier existant sans lire son contenu | Toujours `_analyze_repo` avant write sur `integration_level=existing` |
| AP-C2 | Générer des imports absents du repo | Lire `package.json` + `components/ui/` avant de générer |
| AP-C3 | Signaler Guillaume pour une page `static` | `backend_needs=[]` → pas de signal Guillaume |
| AP-C4 | Retourner à Leon pour chaque plan | `requires_leon_validation=True` seulement si `hybrid` + repo existant |
| AP-C5 | Créer une nouvelle branche si elle existe déjà | Vérifier existence branche avant `branch.create` |
| AP-C6 | Générer du code avec données hardcodées pour `display` | Utiliser des données mockées propres, commentées `// TODO: wire to GET /api/{resource}` |

---

## Référence croisée

- Architecture agents complète : **[CLAUDE-agents.md](CLAUDE-agents.md)**
- Pipeline Penpot → Code (Leon→Joseph→Camille) : **[CLAUDE-penpot-pipeline.md](CLAUDE-penpot-pipeline.md)**
- Signal Guillaume (backend) : **[CLAUDE-agents.md §Guillaume](CLAUDE-agents.md)**
- github-engine v2.0 (push files, branches) : **[CLAUDE-github-engine.md](CLAUDE-github-engine.md)**
- Design tokens (penpot-engine /file.read) : **[CLAUDE-figma-engine.md](CLAUDE-figma-engine.md)**
