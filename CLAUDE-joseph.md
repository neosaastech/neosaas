# CLAUDE-joseph.md — Joseph v3.0 — UX/Design Strategist

> **Fichier de référence agent** — Lu par Claude Code pour comprendre Joseph, et indexé dans la collection `design-knowledge` (Qdrant) pour que Joseph puisse retrouver son propre contexte via RAG.

**Port** : 8492 · **Namespace** : `agent-system` · **GitOps** : `apps/agent-system/base/configmap-joseph-script.yaml`
**Modèles** : `mistral-large-2407` (analyse + validation) · `gpt-4o` (production finale) · `mistral` (scan background)
**OWU** : pipe `joseph_design` (global, valve `USE_STREAM=True`)
**Dispatché par** : Leon (livrables design) · NeoStudio (chat direct)

---

## Rôle

Joseph est l'agent **UX/Design Strategist** de Neomnia Studio. Il intervient sur :
- L'analyse et l'audit UX de sites existants
- La conversion de pages web en fichiers Penpot éditables
- L'extraction et l'exploitation de fichiers Figma
- La génération de wireframes, chartes graphiques, guidelines design
- La création de présentations Reveal.js depuis Figma
- Le conseil design en amont des projets clients (dispatché par Leon)

Joseph **ne code pas** (c'est Camille/Guillaume), **ne gère pas l'infrastructure** (c'est Charlotte), **ne pilote pas les jalons projet** (c'est Leon). Son périmètre est strictement le design et l'UX.

---

## Architecture d'exécution

Deux chemins selon le message reçu sur `/mission` :

```
POST /mission { message, context?, session_id? }
  │
  ├── LIVRABLE_TYPE: header présent
  │     → run_joseph_pipeline() — pipeline 3 étapes
  │         Étape 1 : Analyse (mistral-large)
  │         Étape 2 : Validation (mistral-large)
  │         Étape 3 : Production finale (gpt-4o) + RAG design-knowledge
  │
  └── Pas de header LIVRABLE_TYPE
        → run_agent() — ReAct loop avec outils
            Boucle : LLM choisit outil → appel → résultat → LLM → ...
```

**Streaming** : `/mission/stream` — SSE events `start · thinking · tool_start · tool_done · done`
**⚠️ Contrat obligatoire** : le pipe OWU `joseph_design` appelle TOUJOURS `/mission/stream`. Après toute édition du configmap, vérifier que `/mission/stream` est bien présent : `grep "@app.post" configmap-joseph-script.yaml`

---

## Outils disponibles

### Figma (lecture seule — API REST Figma)

| Outil | Backend | Rôle |
|---|---|---|
| `figma_get_file(file_key)` | figma-engine:8013 | Structure fichier : pages, frames, composants (depth=3) |
| `figma_get_components(file_key)` | figma-engine:8013 | Bibliothèque composants + variantes |
| `figma_extract_design_tokens(file_key)` | figma-engine:8013 | Palette couleurs, typographie, effets, tokens nommés |
| `figma_export_frames(file_key, node_ids, format?)` | figma-engine:8013 | Export images JPG/PNG/SVG par frame |
| `figma_to_slides(file_key, page?, max_frames?)` | figma-engine:8013 GET /design/{key}/to-slides | Présentation Reveal.js publique → URL `figma.neokube.fr` |
| `figma_visual_audit(file_key, node_id, focus?)` | figma-engine + Pixtral | Audit graphique LLM via vision (Pixtral) |

**Règle absolue Figma** : API REST = lecture seule sur le canvas. Aucune écriture possible. Les fichiers Figma Slides (`/slides/...`) ne sont pas accessibles via API REST.

**Token Figma** : Vault `secret/neokube/apps/figma` → `FIGMA_TOKEN`. Expire **2026-09-07** → issue Zoho `[Charlotte] Renouvellement token Figma` créée.

### Penpot (lecture + écriture via RPC)

| Outil | Backend | Rôle |
|---|---|---|
| `penpot_list_projects()` | penpot-engine:8004 | Liste les projets de l'équipe Neomnia Studio |
| `penpot_list_files(project_id)` | penpot-engine:8004 | Fichiers d'un projet |
| `penpot_create_project(name)` | penpot-engine:8004 | Nouveau projet |
| `penpot_export_design(file_id, format?)` | penpot-engine:8004 | Export tokens CSS/Tailwind depuis un fichier Penpot |
| `penpot_site_to_shapes(url, project_name, max_shapes?)` | crawlee:8009 + penpot-engine:8004 | **DOM capture** — URL → shapes Penpot éditables 1:1 |
| `penpot_site_to_wireframe(url, project_name?)` | crawlee:8009 + penpot-engine:8004 | URL → wireframe vectoriel par sections (1 page) |
| `penpot_build_structured(project_name, pages, ...)` | penpot-engine:8004 `/wireframe.build` | **Multi-pages** — wireframes structurés Desktop+Mobile + Design System optionnel |

### UX / Contenu

| Outil | Backend | Rôle |
|---|---|---|
| `ux_audit_url(url, focus?)` | crawlee-service:8009/crawl | Scrape page → données brutes → LLM fait l'audit (anti-pattern : pas de LLM dans l'outil) |
| `fetch_url(url)` | crawlee-service:8009 | Lecture page externe (requirements, landing client) |
| `generate_wireframe_spec(brief)` | LLM interne | Spec wireframe textuelle Markdown |
| `generate_design_guidelines(brief)` | LLM interne | Charte design (couleurs, typographie, ton) |
| `notion_read_page(page_id)` | notion-connector:8011 | Lecture CDC / brief Notion |
| `notion_search(query)` | notion-connector:8011 | Recherche dans l'espace Notion |
| `github_get_readme(repo)` | github-connector:8001 | README d'un repo client |

---

## Pipeline `penpot_site_to_shapes` — URL → Penpot éditable

> Documentation technique complète : **[CLAUDE-penpot.md §penpot_site_to_shapes](CLAUDE-penpot.md)**

### Ce que ça fait

Convertit n'importe quelle URL en fichier Penpot avec N shapes éditables (rects, textes, images) reproduisant la page à l'échelle 1:1.

### Pipeline en 5 étapes

```
1. POST crawlee-service/dom-to-shapes
     Playwright charge la page (JS exécuté, CSS calculé)
     → Scroll complet (lazy-load) + stop à 150px (headers sticky actifs)
     → 4 Règles de capture : rect(fond), text(contenu), image(src), svg(screenshot PNG)
     → JSON shapes[] avec positions, couleurs, textes exacts

2. penpot-engine project.create + create-file
     → project_id + file_id + revn

3. Pré-upload médias (httpx async)
     → <img src> : download + POST /upload-image → _media_id
     → SVG pngBase64 : POST /upload-image → _media_id

4. Construction des add-obj Penpot
     → text : _pw_text(textAlign CSS natif, y compensé par paddingTop)
     → rect + _media_id : fill-image (logo, icône)
     → rect : fill-color

5. update-file (batch unique)
     → workspace_url livré
```

### Quand utiliser quel outil

| Besoin | Outil |
|---|---|
| Capturer un site existant 1:1 pour retouche | `penpot_site_to_shapes` |
| Wireframe épuré d'une seule page | `penpot_site_to_wireframe` |
| **Wireframes multi-pages + Design System + Composants** | **`penpot_build_structured`** ← à préférer |
| Référence visuelle rapide (non éditable) | `penpot_import_site` |
| Extraire tokens CSS/Tailwind d'un fichier Penpot | `penpot_export_design` |
| Analyser un design Figma existant | `figma_extract_design_tokens` |
| Présentation / pitch deck depuis Figma | `figma_to_slides` |

### `penpot_build_structured` — Wireframes structurés multi-pages

**Appelle** : `POST penpot-engine:8004/wireframe.build`

**Ce que ça crée** :
- Page 1 **Wireframes** : N artboards × breakpoints (Desktop 1440 + Mobile 375)
  - Chaque artboard = label bar + nav + sections + footer
  - 7 types de sections : `hero` `content` `services` `cta` `form` `grid2x2` `grid3x3`
- Page 2 **Design System** (si `add_design_system=True`) : palette 8 couleurs, échelle typo, grille 12col, placeholders images
- Page 3 **Composants** (si `add_components=True`) : boutons 5 variants, nav 2 états, badges, formulaires 4 états

**Workflow conversationnel** :
```
1. ux_audit_url(url)           → identifier couleurs, sections, nombre de pages
2. Joseph propose les pages[]  → confirmer avec l'utilisateur
3. penpot_build_structured()   → crée les artboards
```

**Paramètres clés** :
```python
penpot_build_structured(
    project_name="Client X — Wireframes",
    pages=[
        {"key": "home", "url": "/", "label": "Accueil", "desktop_h": 1500, "mobile_h": 1300,
         "sections": [
             {"type": "hero",     "height": 460, "label": "Hero — Headline + CTA"},
             {"type": "services", "height": 320, "label": "Nos services"},
             {"type": "cta",      "height": 120, "label": "Démarrer un projet"}
         ]},
        {"key": "contact", "url": "/contact", "label": "Contact", "desktop_h": 800, "mobile_h": 900,
         "sections": [
             {"type": "hero", "height": 120, "label": "Contact"},
             {"type": "form", "height": 400, "label": "Formulaire"}
         ]},
    ],
    primary_color="#32AFB1",     # déduit de ux_audit_url
    dark_color="#262626",
    site_name="Neomnia Studio",
    add_design_system=True,
    add_components=False,
    include_mobile=True,
)
```

### Limitations connues V1 (2026-06-10)

- Bouton + texte = 2 objets Penpot séparés (pas groupés)
- Polices custom remplacées par Inter
- JSON plat (pas de hiérarchie Frames/Groups par section)
- Animations CSS/JS impossibles (Penpot = outil statique)

### Roadmap V2 — améliorations planifiées

**P1** — Groupement spatial post-traitement (Joseph) : détecter texte contenu dans un rect → Penpot Group
**P2** — SVG outerHTML natif : `el.outerHTML` → `type: svg-raw` Penpot (vs screenshot PNG rasterisé)
**P3** — DOM récursif : remplacer `querySelectorAll` par parcours arborescent → Frames/Groups par section
**P4** — Couche LLM sémantique : détecter variants/composants répétés (après P1-P3 stables)

---

## Collections RAG — Ce que Joseph lit

| Collection | Contenu | Quand consulter |
|---|---|---|
| `design-knowledge` | Heuristiques UX par livrable, principes design Neomnia | Étape 3 production pipeline · toute mission design |
| `neomnia_core` | Contexte agence, positionnement, valeurs, charte | Chartes graphiques, guidelines, livrables clients |

**Règle** : Joseph ne consulte JAMAIS `sre-charlotte-incidents`, `leon-memory`, ou d'autres collections d'agents.

**Comment Joseph retrouve ce fichier** : query Qdrant `design-knowledge` avec `"Joseph agent capabilities penpot figma outils"` → ce fichier doit apparaître dans les premiers résultats.

---

## Connexions services

| Variable env | Valeur K8s | Service |
|---|---|---|
| `PENPOT_CONNECTOR_URL` | `http://penpot-engine.connector-system.svc.cluster.local:8004` | penpot-engine |
| `CRAWLEE_CONNECTOR_URL` | `http://crawlee-service.connector-system.svc.cluster.local:8009` | crawlee-service |
| `FIGMA_ENGINE_URL` | `http://figma-engine.connector-system.svc.cluster.local:8013` | figma-engine |
| `NOTION_CONNECTOR_URL` | `http://notion-connector.connector-system.svc.cluster.local:8011` | notion-connector |
| `GITHUB_CONNECTOR_URL` | `http://github-connector.connector-system.svc.cluster.local:8001` | github-connector |
| `LITELLM_BASE_URL` | `http://litellm.cockpit.svc.cluster.local:4000` | LiteLLM proxy |

---

## Règle de dispatch — Comment Joseph reçoit ses missions

Leon dispatch vers Joseph quand le livrable est de type design :
```
Leon → POST joseph:8492/mission
  { "message": "...", context: { LIVRABLE_TYPE: "charte_graphique" } }
```

**Types de livrables** que Joseph traite : `charte_graphique` · `wireframe` · `maquette` · `audit_ux` · `pitch_deck` · `design_tokens` · `site_import`

Charlotte peut aussi demander à Joseph via NeoStudio mais ne dispatch pas de livrables design.

---

## Utilisation depuis OWU

Sélectionner **"Joseph — Design & Figma"** · Messages en français · Streaming en temps réel

```
"Convertis https://client.fr en shapes Penpot éditables"
"Analyse ce fichier Figma : https://www.figma.com/design/{key}/"
"Génère une charte graphique pour une agence de conseil B2B"
"Fais un audit UX de https://..."
"Extrais la palette de couleurs de ce fichier Figma"
"Crée une présentation depuis la page Mockups de ce Figma"
```

---

## Audit qualité

**Score de référence** : 9.0/10 (agent_eval.py, 2026-05-06) · seuil alerte nightly = 7.5/10

**Vérifications post-déploiement** :
```bash
kubectl logs -n agent-system -l app=joseph --tail=20
kubectl get pods -n agent-system -l app=joseph
# Vérifier endpoints :
grep "@app.post" /tmp/joseph_clean.py  # doit retourner /mission, /mission/stream, /v1/chat/completions
```

**Biais RAG à surveiller** : si `design-knowledge` n'est plus alimentée, Joseph sur-indexe les patterns récents des dernières sessions. Indicateur : réponses génériques au lieu de réponses ancrées sur les heuristiques Neomnia. Correction : réindexer via `scripts/index_joseph_knowledge.py` (à créer).
