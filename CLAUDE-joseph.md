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
| `penpot_check_design_library(project_name)` | penpot-engine:8004 | **⭐ RECETTAGE** — Vérifie l'état de la bibliothèque `_Design System` : présence, is-shared, colors>0, typos>0, pages peuplées. Retourne `ok`/`empty`/`missing` + recommandation. |
| `penpot_build_design_library(project_name, file_name?)` | penpot-engine:8004 | Crée le fichier `_Design System` (is-shared=true) : 64 couleurs (tokens shadcn/ui + palettes Tailwind), 11 typographies Geist, 80 icônes Lucide SVG, composants référence (Button/Input/Badge/Card). |
| `penpot_capture_full_site(url, project_name, max_shapes?)` | crawlee:8009 + penpot-engine:8004 | **⭐ PRINCIPAL** — Capture TOUTES les pages publiques d'un site → **1 fichier `00_Source Import`** avec N pages Penpot (Desktop 1440px + Mobile 375px par page) |
| `penpot_site_to_shapes(url, project_name, file_name?, max_shapes?)` | crawlee:8009 + penpot-engine:8004 | **DOM capture UNE page** — URL → shapes Penpot éditables 1:1 |
| `penpot_site_to_wireframe(url, project_name?)` | crawlee:8009 + penpot-engine:8004 | URL → wireframe vectoriel par sections (1 page) |
| `penpot_build_structured(project_name, pages, ...)` | penpot-engine:8004 `/wireframe.build` | **Wireframes depuis un brief** (pas d'URL existante) — Desktop+Mobile + Design System |
| `penpot_add_design_system(file_id, ...)` | penpot-engine:8004 `/design-system.add` | Ajoute page Design System à un fichier existant (palette, typo, grille, placeholders) |
| `penpot_add_components(file_id, ...)` | penpot-engine:8004 `/components.add` | Ajoute page Composants à un fichier existant (boutons, nav, badges, formulaires) |

### UX / Contenu

| Outil | Backend | Rôle |
|---|---|---|
| `ux_audit_url(url, focus?)` | crawlee-service:8009/crawl | Scrape page → données brutes → LLM fait l'audit (anti-pattern : pas de LLM dans l'outil) |
| `detect_site_pages(url)` | crawlee-service:8009/nav-links + LLM | Extrait les liens nav/header → LLM suggère pages + sections (workflow multi-pages) |
| `rag_design_knowledge` | Qdrant `design-knowledge` (injecté auto) | **Actif en permanence dans le ReAct loop** — heuristiques UX, patterns sections, principes Neomnia |
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

### Convention projet Penpot — Structure 5 fichiers

Un projet Penpot = 1 produit ou client. Il contient des **fichiers spécialisés**, pas un monolithe.

```
Neomnia Studio (team)
  └── NeoSaaS Tech (project_name)
        ├── 00_Source Import    ← penpot_capture_full_site — capture brute du site existant
        ├── 01_UX Flows         ← parcours utilisateurs, décisions, scénarios métier
        ├── 02_Wireframes       ← penpot_build_structured — structures basse fidélité
        ├── 03_UI Screens       ← maquettes finales, composants, responsive
        └── 90_Archive          ← explorations ou anciennes versions
```

| Fichier | Quand | Outil |
|---|---|---|
| `00_Source Import` | Dès qu'un site existant est fourni | `penpot_capture_full_site` |
| `01_UX Flows` | Après analyse des parcours utilisateurs | frames manuelles ou brief structuré |
| `02_Wireframes` | Brief validé, structure alignée équipe | `penpot_build_structured` |
| `03_UI Screens` | Wireframes validés, avant développement | `penpot_build_structured` + design tokens réels |
| `90_Archive` | Versions précédentes à conserver | renommage manuel dans Penpot |

**Règles** :
- `00_Source Import` = matière brute, ne jamais retoucher. Les insights UX vont dans `01_UX Flows`.
- `penpot_build_structured` va toujours dans `02_Wireframes` ou `03_UI Screens`, jamais dans `00_Source Import`.
- `project_name` = nom court du produit/client (ex: `"NeoSaaS Tech"`) — stable sur toute la durée.

### Quand utiliser quel outil

| Besoin | Outil | Fichier cible |
|---|---|---|
| **Importer un site existant COMPLET** (toutes pages) | **`penpot_capture_full_site`** ← outil principal | `00_Source Import` |
| Capturer UNE page existante 1:1 | `penpot_site_to_shapes` | `00_Source Import` |
| Wireframes basse fidélité depuis un brief | `penpot_build_structured` | `02_Wireframes` |
| Maquettes haute fidélité | `penpot_build_structured` + tokens réels | `03_UI Screens` |
| Détecter les pages d'un site | `detect_site_pages` | — |
| Ajouter Design System à un fichier existant | `penpot_add_design_system` | `03_UI Screens` |
| Ajouter Composants à un fichier existant | `penpot_add_components` | `03_UI Screens` |
| Extraire tokens CSS/Tailwind d'un fichier Penpot | `penpot_export_design` | — |
| Analyser un design Figma existant | `figma_extract_design_tokens` | — |
| Présentation / pitch deck depuis Figma | `figma_to_slides` | — |

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
1. ux_audit_url(url)         → identifier couleurs, tokens (primary, dark, bg)
2. detect_site_pages(url)    → liens nav Playwright → LLM suggère pages + sections
3. Joseph présente la proposition à l'utilisateur (confirmation obligatoire)
4. penpot_build_structured() → crée les artboards
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

### `penpot_capture_full_site` — Pipeline détaillé

```
1. POST crawlee/nav-links(url)
     → liste toutes les pages publiques (nav/header links)

2. penpot-engine project.create(project_name)
     → find-or-create projet (idempotent)

3. penpot-engine proxy create-file("00_Source Import")
     → UN seul fichier, page par défaut récupérée

4. update-file mod-page(page_1 → "Home")
   + update-file add-page × N-1 (une par page détectée)
     → structure de pages Penpot créée

5. Pour chaque page × 2 viewports (1440px Desktop, 375px Mobile) :
     a. crawlee dom-to-shapes(url, viewport_width)
          → filtre cookie/RGPD, Règle 5 inputs/textarea/select
     b. upload images (<img src>, SVG PNG, background-image)
     c. construire shapes plates → _build_shapes_for_viewport()
     d. _apply_spatial_groups() → rects conteneurs → Penpot groups
          → filtre : type==rect, aire≥400px², largeur<90% vp_w
          → tri par aire croissante (groupes précis d'abord)
          → group.shapes = [container_uid] + members_uids
          → children.parent-id = group_uuid
     e. construire artboard, get-file (revn fraîche), update-file (batch)

6. Scaffold automatique : créer 01_UX Flows, 02_Wireframes, 03_UI Screens, 90_Archive
     si pas déjà présents dans le projet

7. Retourne workspace_url → UN fichier "00_Source Import"
     avec N pages Penpot, 2 artboards par page, shapes groupées spatialement
```

**Paramètres** :
```python
penpot_capture_full_site(
    url="https://www.neosaas.tech",
    project_name="NeoSaaS Tech",
    max_shapes=400,  # par viewport (défaut 400)
)
```

**Retour** :
```json
{
  "project_id": "...", "file_id": "...",
  "workspace_url": "https://design.neokube.fr/workspace?...",
  "pages_captured": 11, "pages_failed": 0,
  "message": "✅ 11/11 pages dans '00_Source Import' (projet 'NeoSaaS Tech').\n🖥️ Desktop (0px) + 📱 Mobile (décalage 1540px) par page."
}
```

### `penpot_check_design_library` + `penpot_build_design_library` — Recettage bibliothèque

**Principe** : avant tout travail de design production (wireframes, UI Screens), Joseph vérifie que la bibliothèque design est prête. C'est le **pré-vol** — la bibliothèque est le socle commun (couleurs, polices, composants).

```
penpot_check_design_library(project_name="NeoSaaS Tech v5")
  │
  ├── Projet trouvé ?  → NON : status=missing, liste les projets disponibles
  ├── Fichier _Design System présent ?  → NON : status=missing
  ├── is-shared=true ?  → NON : status=empty
  ├── colors > 0 ?      → NON : status=empty
  ├── typographies > 0 ? → NON : status=empty
  └── pages peuplées (get-page > 1 objet) ?
        → OUI sur ≥2 pages : status=ok ✅
        → NON : status=empty
```

**Retour `ok`** :
```
✅ Bibliothèque '_Design System — NeoSaaS' prête. 64 couleurs · 11 typographies · 4/4 pages peuplées.
Connexion : fichier cible → Assets → Libraries → '_Design System — NeoSaaS'.
```

**Retour `missing`/`empty`** :
```
❌ Aucun fichier '_Design System' dans 'NeoSaaS Tech'. Fichiers présents : [...].
→ Lancer : penpot_build_design_library(project_name='NeoSaaS Tech')
```

**Contenu du `_Design System`** (créé par `penpot_build_design_library`) :
- **Page Colors** : 64 couleurs (tokens shadcn/ui + palettes Tailwind orange/slate/red/green/blue) — visibles dans Assets panel Penpot
- **Page Typography** : 11 styles Geist Sans (Display 72px → Caption 11px) — visibles dans Assets panel
- **Page Icons — Lucide** : 80 icônes SVG 24×24 en grille (arrow, chevron, user, lock, file, mail, settings…)
- **Page Components** : Button (5 variants), Input (5 états), Badge (4 variants), Card (3 types)

**Routing direct (bypass LLM)** : `penpot_check_design_library` et `penpot_build_design_library` sont interceptés avant le ReAct loop — le nom de l'outil dans le message déclenche l'appel direct à `_execute_tool`. Pas de risque de confusion avec d'autres outils.

**Pré-vol automatique post-capture** : `penpot_capture_full_site` exécute le check en fin de pipeline et retourne `design_library: "ok"|"empty"|"missing"` dans la réponse.

**Appel depuis OWU ou Leon** :
```
"penpot_check_design_library project_name='NeoSaaS Tech v5'"
"penpot_build_design_library project_name='NeoSaaS Tech v5'"
```

### Limitations connues V2 (2026-06-10)

- Polices custom remplacées par Inter (Google Fonts non chargées en Playwright headless)
- Groupement spatial basé sur containment géométrique — boutons non cliqués dans un rect large = faux-groupe possible
- Animations CSS/JS impossibles (Penpot = outil statique)
- Pages Login/SignUp/Contact peuvent échouer si anti-bot ou CSRF actif

### Changelog

**V2.3 (2026-06-11)** — Modification fichiers Penpot existants (refresh en place)

- `penpot_find_project(query)` : recherche dans Qdrant `design-knowledge` (source=`penpot-state`) + fallback live API Penpot. Retourne candidats avec `file_id`, `workspace_url`, `page_ids`, date. Routing direct bypass LLM.
- `_store_penpot_state()` : helper asyncio — stocke l'état d'un fichier dans `design-knowledge` avec `point_id` déterministe `uuid5(NAMESPACE_DNS, "penpot-state:{file_id}")`. Appelé à la fin de `penpot_capture_full_site`, `penpot_build_structured`, `penpot_build_design_library`.
- `existing_file_id` : paramètre optionnel dans `penpot_build_structured`, `penpot_build_design_library`, `penpot_capture_full_site`. Quand fourni : skip create-project/create-file, add nouvelle page FIRST, delete old pages (règle Penpot ≥1 page), rebuild en place.
- `penpot-engine` mis à jour : `WireframeBuildReq.existing_file_id` + branche refresh dans `wireframe_build()`.
- Règle système prompt : `penpot_find_project` → confirmation utilisateur → `existing_file_id` OBLIGATOIRE avant toute modification. Aucun `del-page` sans confirmation explicite.

**V2.2 (2026-06-11)** — Notifications ntfy + comptes agents
- Helper `_ntfy()` ajouté au niveau module — fire-and-forget via `asyncio.create_task`
- Notifications automatiques dans 4 handlers : `penpot_capture_full_site`, `penpot_build_structured`, `penpot_check_design_library` (si empty/missing, priorité high), `penpot_build_design_library`
- Comptes documentés : `joseph@neokube.fr` (Stalwart, password dans Vault `secret/neokube/apps/stalwart`)
- Vault Stalwart mis à jour : clés `JOSEPH_EMAIL` + `JOSEPH_PASSWORD` ajoutées

**V2.1 (2026-06-11)** — Recettage bibliothèque design
- `penpot_check_design_library` : diagnostic pré-vol (ok/empty/missing) — routing direct bypass LLM
- `penpot_build_design_library` : crée `_Design System` (is-shared=true) : 64 couleurs + 11 typos Geist + 80 icônes Lucide + composants référence
- Pré-vol automatique à la fin de `penpot_capture_full_site` (champ `design_library` dans la réponse)
- Fix: `file.list` — paramètre `project_id` (underscore) corrigé

**V2 (2026-06-10)** — Spatial grouping actif
- `_apply_spatial_groups()` : rects conteneurs → Penpot groups (containment 3px tolérance, tri aire croissante)
- Fix routing : shortcut explicite pour tout outil Penpot nommé dans le message (bypass regex `\bpenpot\b`)
- Scaffold automatique : 01→03 + 90 créés à la fin de `penpot_capture_full_site`
- Desktop + Mobile (375px, x_offset=1540) par page
- Filtre cookie/RGPD + Règle 5 inputs/textarea

**V1 (2026-05-15)** — DOM shapes éditables 1:1, revn synchronisation get-file

### Roadmap V3 — améliorations planifiées

**P1** — SVG outerHTML natif : `el.outerHTML` → `type: svg-raw` Penpot (vs screenshot PNG rasterisé)
**P2** — DOM récursif : remplacer `querySelectorAll` par parcours arborescent → Frames/Groups par section sémantique (nav, main, footer…)
**P3** — Couche LLM sémantique : détecter variants/composants répétés (après P2 stable)

---

## Collections RAG — Ce que Joseph lit et écrit

| Collection | Points | Contenu | Accès |
|---|---|---|---|
| `design-knowledge` | 31+ | Heuristiques UX, patterns sections, principes Neomnia, **wireframes passés** | **Lecture auto** (ReAct loop + pipeline) · **Écriture** après chaque `penpot_build_structured` |
| `neomnia_core` | 260 642 | Contexte agence, positionnement, valeurs, charte | Lecture pipeline uniquement (Étape 3 production) |

**Architecture RAG Joseph (2026-06-10)** :

```
run_agent(message)
  → _qdrant_search("design-knowledge", message, limit=3)   # recherche sémantique avant la 1ère itération
  → injecte les hits dans le system prompt (## Références design (RAG))
  → ReAct loop avec contexte enrichi

penpot_build_structured() → résultat avec workspace_url
  → asyncio.create_task(_store_build_memory())
      → embed(résumé du build)
      → upsert dans design-knowledge {source: "joseph-session"}
      → Joseph apprend de ses propres livrables
```

**Contenu `design-knowledge` (source fiable) :**
- `ux-heuristics` (10 chunks) — heuristiques Nielsen appliquées aux wireframes
- `section-patterns` (9 chunks) — structures types par site (vitrine, SaaS, e-commerce, corporate, landing)
- `neomnia-design` (5 chunks) — couleurs, ton, composants, grille Neomnia
- `wireframe-principles` (7 chunks) — fidélité mid-fi, annotations, breakpoints, handoff
- `joseph-session` (croissant) — wireframes réels réalisés, appris après chaque build

**Règle** : Joseph ne consulte JAMAIS `sre-charlotte-incidents`, `leon-memory`, ou d'autres collections d'agents.

**Script de re-indexation** : `python3 ~/scripts/index_joseph_knowledge.py` — recrée la collection avec les 31 chunks de base (les `joseph-session` sont perdus au flush).

---

## Comptes Joseph

### Email — `joseph@neokube.fr`

Joseph dispose d'un compte mail dédié sur le serveur Stalwart NeoKube.

| Champ | Valeur |
|---|---|
| Email | `joseph@neokube.fr` |
| Password | Vault `secret/neokube/apps/stalwart` → clé `JOSEPH_PASSWORD` |
| SMTP | `stalwart-mail.stalwart.svc.cluster.local:587` (plaintext, start_tls=False) |
| Rôle | Envoi de rapports de mission, notifications formelles |

**Comptes agents NeoKube existants** : `no-reply@` · `leon@` · `aria@` · `domi@` · `nox@` · `vera@` · `neo@` · `joseph@` · `admin@neokube.fr`

### Penpot — compte agent

Le penpot-engine utilise le compte admin (`chvandendriessche@neomnia.net`) pour créer les fichiers. Un token dédié `PENPOT_AGENT_TOKEN` est disponible dans Vault `secret/neokube/infrastructure/penpot`. Pour tracer les actions Joseph dans Penpot : configurer le penpot-engine pour utiliser ce token via la variable `PENPOT_ACCESS_TOKEN`.

---

## Notifications ntfy — Actions Joseph

Joseph envoie des notifications push ntfy automatiquement à chaque action significative (sans que l'agent LLM ait besoin de le décider).

**Topic** : `neokube-alerts` · **Tags** : `joseph,penpot`

| Action | Déclencheur | Priorité | Tags |
|---|---|---|---|
| Capture full site réussie | `penpot_capture_full_site` success | default | `joseph,penpot,camera` |
| Wireframes créés | `penpot_build_structured` success | default | `joseph,penpot,art` |
| Design Library incomplète | `penpot_check_design_library` → empty/missing | **high** | `joseph,penpot,warning` |
| Design System créé | `penpot_build_design_library` success | default | `joseph,penpot,white_check_mark` |

**Implémentation** : helper `_ntfy(title, msg, tags, priority)` au niveau module — appelé via `asyncio.create_task(_ntfy(...))` dans chaque handler, en parallèle du return. Ne bloque pas la réponse.

Le `notify_leon` reste disponible comme outil LLM (envoi explicite de fin de mission dispatché par Leon).

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
