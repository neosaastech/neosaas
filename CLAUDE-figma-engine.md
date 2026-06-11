# CLAUDE-figma-engine.md — Joseph + figma-engine + Reveal.js

> Statut : **DÉPLOYÉ** — figma-engine v1.1 actif, Joseph v3.2 opérationnel
> Dernière mise à jour : 2026-06-09

---

## Philosophie des stacks

| Besoin | Stack | Agent / Outil |
|---|---|---|
| Présentation / pitch / pitch deck | **Reveal.js** via figma-engine | `generate_reveal_slides` |
| **Wireframes / maquettes UX d'un site ou app** | **Penpot** (frames + sections colorées) | `penpot_create_wireframe` ← **nouveau** |
| Analyser ou extraire d'un design existant | **Figma** (lecture seule) | `figma_get_file`, `figma_extract_design_tokens` |
| Créer / modifier un design programmatiquement | **Penpot** (écriture via RPC) | `penpot_create_project`, penpot-engine |
| Lire des informations projet | **Notion + GitHub** | `notion_search`, `github_get_readme` |
| Lire une page web externe (requirements, landing) | **Crawlee** | `fetch_url` |

**Règle absolue :**
- L'API REST Figma est **en lecture seule** pour le canvas — aucune écriture possible via API
- Les fichiers de type Figma Slides (`/slides/...`) ne sont **pas accessibles** via l'API REST
- Penpot supporte l'écriture via RPC (`update-file` change ops, `create-project`)

---

## figma-engine — Service déployé

**Namespace** : `connector-system` · **Port** : 8013
**GitOps** : `apps/connector-system/base/configmap-figma-engine.yaml`
**Vault** : `secret/neokube/apps/figma` → `FIGMA_TOKEN`
**Ingress local** : `http://figma.neokube.local` (entrée `/etc/hosts` nœud)
**Ingress public** : `https://figma.neokube.fr` (tunnel Cloudflare + CNAME)

### Endpoints Figma (lecture seule)

| Méthode | Path | Rôle |
|---|---|---|
| `GET` | `/health` | Probe |
| `GET` | `/files/{file_key}` | Structure fichier : pages, frames, styles (depth=3) |
| `GET` | `/files/{file_key}/tokens` | Extraction sémantique : couleurs, polices, tokens |
| `GET` | `/files/{file_key}/components` | Bibliothèque composants |
| `POST` | `/files/{file_key}/export` | Export frames PNG/SVG/JPG `{node_ids, format, scale}` |
| `GET` | `/design/{file_key}/to-slides` | Frames existantes → Reveal.js (requiert frames présentes) |
| `POST` | `/transform/{file_key}` | Figma → template Next.js (LLM) |
| `POST` | `/slides/{file_key}/extract` | Crawlee scraping d'un fichier Slides (contournement) |

### Endpoints Reveal.js (indépendants de Figma)

| Méthode | Path | Rôle |
|---|---|---|
| `POST` | `/slides/render` | JSON structuré → présentation HTML brandée |
| `GET` | `/slides/{id}` | Sert la présentation (mémoire — expire si pod redémarre) |

### Extraction de tokens sémantiques (`/files/{key}/tokens`)

L'endpoint traverse tous les nœuds du fichier et interprète la palette sémantiquement :

```
Détection thème : si couleurs claires > couleurs sombres → thème LIGHT
#e8e9ea (×12) → background_color  (couleur claire la plus fréquente = fond de page)
#154a4b (×6)  → primary_color     (mid-tone dominant, hors accent et fond)
#32afb1 (×4)  → secondary_color   (2e mid-tone)
#edb842 (×5)  → accent_color      (couleur la plus chaude/distinctive)
              → text_color         (#1a1a1a si thème light, #fff si thème dark)
```

Aucun style nommé Figma requis — fonctionne sur tout fichier y compris sans design system structuré.

### Template Reveal.js — Design tokens Neomnia (défauts)

Template basé sur l'analyse visuelle du template Figma Neomnia réel (thème LIGHT) :

```
background_color : #e8e9ea  (gris clair — fond principal des slides content)
primary_color    : #154a4b  (teal sombre — titres, cartes, panneaux feature)
secondary_color  : #32afb1  (turquoise — numéros, bordures, badge)
accent_color     : #edb842  (gold — tags cover, CTA closing)
text_color       : #1a1a1a  (texte sombre sur fond clair)
font_family      : Inter, system-ui, sans-serif
```

### Types de slides

| Type | Fond | Description | Usage |
|---|---|---|---|
| `cover` | Gradient teal sombre `#154a4b → #0a2d2e` | Titre blanc centré à gauche, tag doré, sous-titre turquoise | 1re slide |
| `content` | Gris clair `#f0f1f2` | Titre teal, liste en cartes colorées (teal/dark teal/noir alternés), numéros turquoise | Slides de contenu |
| `feature` | Split 42%/58% | Gauche : panel teal sombre + grand titre blanc. Droite : fond blanc + liste avec bordure turquoise | Comparaison, feature |
| `closing` | Gradient teal sombre | Centré, CTA bouton doré | Dernière slide |

**Logo badge** : cercle teal `#154a4b` + bordure turquoise, texte "NEOMNIA STUDIO" blanc, affiché en haut à droite de chaque slide.

Dans `feature` : séparer gauche/droite avec `---` dans le champ `content`.

### Export PDF

Reveal.js supporte nativement l'export PDF via le navigateur :
1. Ouvrir `http://figma.neokube.local/slides/{id}?print-pdf` dans **Chrome**
2. `Ctrl+P` → Imprimer → **Enregistrer en PDF**
3. Format : A4 paysage ou 16:9 selon les paramètres Reveal.js

---

## Joseph v3.2 — Agent UX/Design Strategist

**Namespace** : `agent-system` · **Port** : 8492
**Accès OWU** : modèle `Joseph — Design & Figma` dans Open WebUI

### Flux UX Design — Wireframes Penpot (NOUVEAU — v3.2)

Flux pour refonte, redesign ou maquette d'un site/application. Produit des **frames visuelles réelles** dans Penpot.

```
Leon reçoit le brief refonte (ex: neomnia.net)
  → dispatch Joseph (LIVRABLE_TYPE: wireframes)

Joseph :
  1. ux_audit_url(url_existant)         ← analyse de l'existant
  2. notion_search(nom_projet)          ← CDC, brief, specs
  3. penpot_create_wireframe(           ← crée les frames dans Penpot
       project_name, pages, tokens
     )
  → URL workspace Penpot retournée

Charles valide dans Penpot (édit manuel possible)
  → signal Leon "validé"
  → Leon dispatche Camille + Guillaume (dev)
```

**Structure d'un appel type :**

```python
penpot_create_wireframe(
  project_name = "Refonte Neomnia.net",
  pages = [
    {
      "name": "Home",
      "sections": [
        {"type": "header", "title": "Neomnia Studio", "subtitle": "Nav: Services | À propos | Contact", "height": 80},
        {"type": "hero",   "title": "L'agence IA qui livre en 48h", "subtitle": "9 agents spécialisés, 0 vendor lock-in", "height": 500},
        {"type": "section","title": "Nos Services", "subtitle": "Web · IA · Design · Ops", "height": 400},
        {"type": "cta",    "title": "Prêt à démarrer ?", "subtitle": "Contactez-nous", "height": 200},
        {"type": "footer", "title": "© 2026 Neomnia Studio", "subtitle": "contact@neomnia.net", "height": 120},
      ]
    },
    {
      "name": "Services",
      "sections": [...]
    }
  ],
  tokens = {"primary_color": "#154a4b", "secondary_color": "#32afb1", "accent_color": "#edb842"}
)
# → {"workspace_url": "https://design.neokube.fr/workspace?project-id=...&file-id=...", "pages_created": ["Home", "Services"]}
```

**Types de sections** :

| Type | Fond | Texte | Hauteur recommandée |
|---|---|---|---|
| `header` | Teal `#154a4b` | Blanc | 80px |
| `hero` | Teal `#154a4b` | Blanc | 400–600px |
| `section` | Gris `#f4f5f6` / blanc (alternés) | Sombre | 300–400px |
| `card-grid` | Blanc | Sombre | 300px |
| `cta` | Turquoise `#32afb1` | Blanc | 200px |
| `footer` | Noir `#1a1a1a` | Blanc | 100–120px |

**Implémentation Penpot (penpot-engine API) :**

```
1. POST /project.create {name, zoho_project_id=""} → project_id
2. POST /proxy {path:"create-file", body:{project-id, name, features:[...]}} → file_id + page_id (défaut)
3. POST /proxy {path:"update-file", body:{..., changes:[{type:"mod-page",...}]}} → renommer page 1
4. POST /proxy {path:"update-file", body:{..., changes:[{type:"add-page", id, name}]}} → pages suivantes
5. POST /proxy {path:"update-file", body:{..., changes:[frame + rects + textes]}} → shapes par page
```

**Détails techniques critiques (anti-patterns évités) :**
- `path` = commande courte (`create-file`, `update-file`) — **pas** le chemin complet (`/api/rpc/command/...`)
- `features` obligatoire : `["fdata/path-data","design-tokens/v1","variants/v1","layout/grid","components/v2","fdata/shape-data-type"]`
- `vern` obligatoire dans `update-file` (sinon 400 validation error)
- `blur: None` invalide — **omettre** le champ si pas de blur
- `fill-type` invalide dans `FillAttrs` pour couleur unie — utiliser `{"fill-color": "...", "fill-opacity": 1.0}` sans `fill-type`
- Frame artboard : `shapes: [child_id1, child_id2, ...]` obligatoire
- `create-page` RPC n'existe pas — utiliser `update-file` avec `{type:"add-page", id, name}` change

### Flux présentation — 4 étapes

```
Étape 1 — Confirmation + briefing
  Joseph : "Parfait, quelques questions rapides :"
  → Titre / nom du projet
  → Public cible (investisseurs, jury, équipe, client...)
  → 3-5 messages clés
  → Fichier Figma pour le branding ? (optionnel, URL)

Étape 2 — Collecte de contexte automatique (sans demander à l'utilisateur)
  → fetch_url(url_incubateur_ou_reference)  ← lire les requirements de la cible
  → notion_search(nom_projet)               ← trouver les pages Notion du projet
  → notion_read_page(page_id)               ← lire la doc officielle
  → github_list_repos(query)                ← trouver les repos associés
  → github_get_readme(owner/repo)           ← comprendre le projet technique

Étape 3 — Génération
  → figma_extract_design_tokens(file_key)   ← si fichier Figma fourni
  → generate_reveal_slides(title, slides, tokens)
  → URL retournée : http://figma.neokube.local/slides/{id}

Étape 4 — Livraison
  → "✅ Votre présentation : {url}"
  → "📥 PDF : ajouter ?print-pdf à l'URL dans Chrome → Imprimer → Enregistrer en PDF"
  → "Souhaitez-vous modifier le contenu ou les slides ?"
```

### Tous les outils Joseph v3.2

**Présentation**

| Outil | Description |
|---|---|
| `generate_reveal_slides(title, slides, tokens?)` | **PRINCIPAL** — génère une présentation Reveal.js brandée |
| `figma_to_slides(file_key, page?, max_frames?)` | Frames Figma existantes → Reveal.js (uniquement si frames présentes) |

**Figma (lecture seule)**

| Outil | Description |
|---|---|
| `figma_get_file(file_key)` | Structure : pages, frames, styles |
| `figma_extract_design_tokens(file_key)` | Palette couleurs + polices → tokens prêts à l'emploi |
| `figma_get_components(file_key)` | Bibliothèque de composants |
| `figma_export_frames(file_key, node_ids, format?)` | Export PNG/SVG/JPG |
| `figma_visual_audit(file_key, node_id, focus?)` | Audit visuel LLM via Pixtral |

**Recherche (Web + Notion + GitHub)**

| Outil | Description |
|---|---|
| `fetch_url(url)` | Lit le texte d'une URL publique (requirements incubateur, landing, article) |
| `notion_search(query)` | Cherche des pages Notion sur un sujet |
| `notion_read_page(page_id)` | Lit le contenu complet d'une page |
| `github_list_repos(query?)` | Liste les dépôts GitHub NeoKube/Neomnia |
| `github_get_readme(repo)` | Lit le README d'un dépôt `owner/repo` |

**Penpot (écriture)**

| Outil | Description |
|---|---|
| `penpot_create_wireframe(project_name, pages, tokens?)` | **PRINCIPAL UX** — crée des wireframes visuels dans Penpot (frames + sections colorées + textes) |
| `penpot_list_projects()` | Projets Penpot de l'équipe |
| `penpot_list_files(project_id)` | Fichiers d'un projet |
| `penpot_create_project(name)` | Crée un projet Penpot vide |
| `send_slides_to_penpot(title, slide_count, reveal_url)` | Crée un projet Penpot vide lié à une présentation Reveal.js |

**UX**

| Outil | Description |
|---|---|
| `ux_audit_url(url, focus?)` | Audit UX complet d'un site |
| `generate_wireframe_spec(screen_name, user_goal)` | Spec wireframe textuelle Markdown |
| `generate_design_guidelines(project_name, sector)` | Charte design légère |
| `notify_leon(title, message, status)` | Notification fin de mission (Leon uniquement) |

### Routing par intention (sémantique — pas par mots-clés)

**Intent "présenter"** → `generate_reveal_slides` sans exception
Exemples : "pitch pour des investisseurs", "support pour ma réunion", "convaincre un jury", "démo pour un incubateur", "PowerPoint", "slides"

**Intent "wireframe / refonte / maquette"** → `penpot_create_wireframe` (direct, via run_agent)
Détection : mots-clés `wireframe`, `penpot`, `maquette`, `refonte`, `redesign`, `ux design`, ou `LIVRABLE_TYPE: wireframes`
Résultat : URL workspace Penpot avec frames visuelles prêtes

**Intent "design"** → Joseph demande : *Penpot ou Figma ?*
Exemples : "maquette", "landing page", "identité visuelle", "interface"
Exception : si "Figma" ou "Penpot" déjà dans le message, ou URL figma.com fournie → pas de question

---

## Cas d'usage documenté — Pitch EuraTechnologies

**Prompt utilisateur :**
> "Pitch de présentation de NeoKube. Public : incubateur EuraTechnologies Lille. Messages clés : comprendre le projet et vendre le projet pour participer à leur programme. Documentation sur Notion : https://app.notion.com/p/neomnia/NeoKube-Documentation-officielle et sur GitHub. Exigences incubateur : https://www.euratechnologies.com/pitch-deck-1. Branding : Neomnia template Figma."

**Ce que Joseph fait automatiquement :**
1. `fetch_url("https://www.euratechnologies.com/pitch-deck-1")` → lit les exigences EuraTech
2. `notion_read_page("33b3f68c")` → lit la doc officielle NeoKube
3. `notion_search("agents NeoKube Charlotte Leon")` → enrichit avec les pages agents
4. `github_list_repos("neostudio")` + `github_get_readme("charlesvdd/neostudio")` → comprend la stack
5. `figma_extract_design_tokens("JmMvTNJGdEjzR2Q56u6ZY8")` → palette Neomnia
6. `generate_reveal_slides(...)` → présentation alignée avec les critères EuraTech

**Structure pitch générée (alignée EuraTechnologies) :**

| Slide | Type | Contenu |
|---|---|---|
| 1 | cover | NeoKube — Studio IA Multi-Agents |
| 2 | content | Problématique — la création digitale est lente et fragmentée |
| 3 | content | Solution — des agents IA spécialisés qui créent en autonomie |
| 4 | feature | Charlotte (SRE) + Leon (Production) — les agents en action |
| 5 | content | Proposition de valeur — un studio complet piloté par IA |
| 6 | content | Marché potentiel + verticals EuraTech |
| 7 | feature | Business Model — offre agence vs SaaS |
| 8 | content | Roadmap + stade actuel (MVP déployé, agents actifs) |
| 9 | content | Équipe + financement |
| 10 | closing | Rejoindre le programme EuraTechnologies |

**Exigences EuraTechnologies couvertes :**
- ✅ Nom + logo du projet
- ✅ Problématique + chiffres/constat
- ✅ Solution + nom produit
- ✅ Proposition de valeur (1 phrase)
- ✅ Positionnement / différenciation
- ✅ Business Model
- ✅ Marché potentiel
- ✅ Roadmap / stade actuel
- ✅ Équipe (solo founder → équipe agents)
- ✅ Financement

---

## Infrastructure déployée

### ConfigMaps

| ConfigMap | Namespace | Contenu |
|---|---|---|
| `figma-engine-script` | `connector-system` | `figma_engine.py` + `requirements.txt` |
| `joseph-script` | `agent-system` | `joseph.py` |
| `joseph-config` | `agent-system` | Variables d'environnement Joseph |

### Freepik — Images libres de droits

| Paramètre | Valeur |
|---|---|
| Secret K8s | `agent-system/freepik-secret` → `FREEPIK_API_KEY` |
| Vault (à faire) | `secret/neokube/apps/freepik` → `FREEPIK_API_KEY` |
| Compte | Facturation à l'usage (pay-per-use premium) — pas de quota mensuel fixe |
| API endpoint | `GET https://api.freepik.com/v1/resources?term={query}&limit={n}` |
| Header auth | `x-freepik-api-key: {FREEPIK_API_KEY}` |
| Image URL | `data[].image.source.url` → JPEG direct, accessible sans auth supplémentaire |
| Licence | `data[].licenses[].type = "premium"` — couvert par le compte pay-per-use |

**Règle d'usage dans Joseph** : 3 slides maximum par présentation (cover + 1 feature + closing).
Chercher en anglais. `search_freepik(query, count=3, orientation='horizontal')` → `images[0].url`.

```bash
# Test rapide (depuis neokube-beta)
curl -s "https://api.freepik.com/v1/resources?term=startup+team&limit=1" \
  -H "x-freepik-api-key: $(kubectl get secret -n agent-system freepik-secret -o jsonpath='{.data.FREEPIK_API_KEY}' | base64 -d)" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0]['image']['source']['url'][:80])"
```

### Variables d'environnement Joseph

```
FIGMA_ENGINE_URL      = http://figma-engine.connector-system.svc.cluster.local:8013
NOTION_CONNECTOR_URL  = http://notion-connector.connector-system.svc.cluster.local:8011
GITHUB_CONNECTOR_URL  = http://github-connector.connector-system.svc.cluster.local:8001
CRAWLEE_CONNECTOR_URL = http://crawlee-service.connector-system.svc.cluster.local:8009
PENPOT_CONNECTOR_URL  = http://penpot-engine.connector-system.svc.cluster.local:8004
FREEPIK_API_KEY       = injecté depuis freepik-secret (K8s) — ne pas mettre en clair
PENPOT_PUBLIC_URL     = https://design.neokube.fr
LLM_MODEL             = gpt-4o  (patché dans le Deployment — ConfigMap seul insuffisant)
```

### Commandes de déploiement

```bash
# Modifier figma-engine
kubectl replace -f apps/connector-system/base/configmap-figma-engine.yaml
kubectl rollout restart deployment/figma-engine -n connector-system

# Modifier Joseph
kubectl replace -f apps/agent-system/base/configmap-joseph-script.yaml
kubectl replace -f apps/agent-system/base/configmap-joseph-config.yaml
kubectl rollout restart deployment/joseph -n agent-system

# Vérifier
curl http://figma.neokube.local/health
kubectl logs -n agent-system deploy/joseph --tail=20
```

### Anti-patterns

| ❌ Mauvais | ✅ Correct |
|---|---|
| Demander à l'utilisateur le contenu Notion → il l'a déjà mis dans Notion | `notion_search` + `notion_read_page` automatiquement |
| Décrire les slides à l'écrit sans générer | Appeler `generate_reveal_slides` directement |
| Utiliser `figma_to_slides` sans vérifier les frames | `figma_get_file` d'abord, puis `figma_to_slides` seulement si `frame_count > 0` |
| Laisser `tokens` vide quand Figma est disponible | `figma_extract_design_tokens` → passer les tokens |
| URL Figma de type `/slides/` | Impossible via API → proposer `generate_reveal_slides` |
| Passer `path: "/api/rpc/command/create-file"` au proxy | `path: "create-file"` — commande courte uniquement |
| Inclure `blur: None` dans un shape Penpot | Omettre `blur` entièrement si pas de blur |
| Inclure `fill-type: "color"` dans les fills | `{"fill-color": "#...", "fill-opacity": 1.0}` sans `fill-type` |
| Utiliser `create-page` RPC via proxy | `update-file` avec `{type: "add-page", id, name}` change |
| Oublier `vern` dans `update-file` | `{"revn": N, "vern": M, ...}` — les deux sont obligatoires |
| Oublier `features` dans `create-file` | Toujours passer `_PW_FEATURES` dans le body |

---

## Références

- Figma file Neomnia template : `JmMvTNJGdEjzR2Q56u6ZY8`
- Notion doc NeoKube officielle : `33b3f68c` (page_id)
- EuraTechnologies pitch deck requirements : `https://www.euratechnologies.com/pitch-deck-1`
- Reveal.js CDN : `https://cdn.jsdelivr.net/npm/reveal.js@5/`
