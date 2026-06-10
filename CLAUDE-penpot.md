# CLAUDE-penpot.md — penpot-engine v1.0

**Instance Penpot** : namespace `penpot` — backend `penpot-backend.penpot.svc.cluster.local:6060`
**Engine** : `penpot-engine` port 8004 — connector-system (remplace penpot-connector + penpot-agent LLM)
**Team de référence** : `Neomnia Studio` — ID `82052e4a-914a-8123-8007-d697aa5fd265`
**Template de base** : `template-maquette-base` — ID `32796cdf-d506-81b0-8007-f19045833782` (dans Drafts)
**URL publique** : `https://design.neokube.fr` (Cloudflare Tunnel → Traefik → penpot-frontend)
**URL locale** : `http://penpot.neokube.local` (LAN uniquement — ne jamais utiliser dans les liens livrés)
**Vault** : `secret/neokube/infrastructure/penpot`

---

## Architecture — Évolution penpot-connector → penpot-engine

```
AVANT (agent LLM)                     APRÈS (microservice)
────────────────────────────────────   ──────────────────────────────────────
Dispatcher                             Dispatcher
  └── penpot-agent (LLM, 8488)           └── penpot-engine (HTTP, 8004)
        └── penpot-connector (8004)             └── Penpot RPC API
```

**Pourquoi** : le scaffolding Penpot est entièrement déterministe (3 étapes fixes). Aucun LLM n'est nécessaire. Un microservice est plus rapide, fiable, et sans coût LLM.

---

## Vault — Clés `secret/neokube/infrastructure/penpot`

| Clé | Usage | Statut |
|---|---|---|
| `PENPOT_ACCESS_TOKEN` | Token JWT compte principal (owner) | ✅ présent |
| `PENPOT_AGENT_TOKEN` | Token JWT compte agent penpot | ✅ présent |
| `PENPOT_CAMILLE_TOKEN` | Token JWT compte Camille (renommé depuis PENPOT_ARIA_TOKEN) | ⚠️ à renommer |
| `PENPOT_EMAIL` | Fallback login email | ✅ présent |
| `PENPOT_PASSWORD` | Fallback login password | ✅ présent |
| `PENPOT_TEAM_ID` | ID team Neomnia Studio | ⚠️ à ajouter : `82052e4a-914a-8123-8007-d697aa5fd265` |
| `PENPOT_TEMPLATE_FILE_ID` | ID fichier template-maquette-base | ⚠️ à ajouter : `32796cdf-d506-81b0-8007-f19045833782` |

**Règle auth** : `PENPOT_ACCESS_TOKEN` (JWT `eyJ...`) est toujours préféré. Fallback : login email/password → cookie de session.

---

## Endpoints penpot-engine v1.0

Tous les endpoints sont des `POST` (sauf `/health` et ceux marqués `GET`).
Auth Vault automatique — aucune clé à passer dans les requêtes.

### `GET /health`
```json
{"status": "ok", "version": "1.0", "vault_loaded": true, "team_id": "82052e4a..."}
```

### `POST /proxy`
Passthrough vers n'importe quelle commande RPC Penpot.
```json
{
  "path": "get-profile",
  "body": {},
  "params": {},
  "as_agent": "camille"
}
```
`as_agent` : `"camille"` | `"penpot"` — identité visible dans Penpot (optionnel, défaut = compte principal).

### `POST /project.create`
Crée un projet avec vérification de déduplication.
```json
// Requête
{"name": "Industrio SAS — Design", "zoho_project_id": "2114101000002345001"}

// Réponse
{"project_id": "6fe417cd-...", "created": true, "name": "Industrio SAS — Design"}
// ou si déjà existant :
{"project_id": "6fe417cd-...", "created": false, "name": "Industrio SAS — Design"}
```

### `GET /project.list`
Liste les projets actifs (soft-deleted exclus).
```json
// Réponse
[{"id": "...", "name": "...", "created_at": "..."}]
```

### `POST /project.scaffold`
**Opération atomique principale** : crée projet + duplique template + retourne URL de livraison.
```json
// Requête
{
  "project_name": "Industrio SAS — Design",
  "zoho_project_id": "2114101000002345001",
  "template_file_id": "32796cdf-..."  // optionnel, défaut = PENPOT_TEMPLATE_FILE_ID
}

// Réponse
{
  "project_id": "6fe417cd-...",
  "file_id": "abc12345-...",
  "workspace_url": "https://design.neokube.fr/workspace?project-id=6fe417cd-...&file-id=abc12345-...",
  "created": true
}
```

### `GET /file.list`
Liste les fichiers d'un projet.
```json
// Query param : ?project_id=6fe417cd-...
[{"id": "...", "name": "...", "created_at": "..."}]
```

### `POST /file.duplicate`
Duplique un fichier vers un projet cible.
```json
// Requête
{"file_id": "32796cdf-...", "project_id": "6fe417cd-...", "name": "Maquette client"}

// Réponse
{"file_id": "newfile-...", "name": "Maquette client"}
```

### `POST /project.delete`
Soft-delete un projet (récupérable 7 jours).
```json
// Requête
{"project_id": "6fe417cd-..."}

// Réponse
{"status": "soft-deleted", "recoverable_until": "2026-06-08T..."}
```

### `GET /workspace.url`
Génère l'URL de livraison Penpot.
```json
// Query params : ?project_id=...&file_id=...
{"url": "https://design.neokube.fr/workspace?project-id=...&file-id=..."}
```

### `POST /wireframe.build`
**penpot-engine v2.0** — Crée un fichier Penpot structuré multi-pages avec builders programmatiques (portés depuis l'ancien penpot-agent v3.3).

```json
// Requête
{
  "project_name": "Client X — Wireframes",
  "file_name": "Maquettes — Client X",
  "pages": [
    {
      "key": "home", "url": "/", "label": "Accueil", "desktop_h": 1500, "mobile_h": 1300,
      "sections": [
        {"type": "hero",     "height": 460, "label": "Hero — Headline + CTA"},
        {"type": "services", "height": 320, "label": "Nos services"},
        {"type": "cta",      "height": 120, "label": "Demarrer un projet"}
      ]
    }
  ],
  "tokens": {
    "primary": "#32AFB1", "primary_dark": "#1E6363", "dark": "#262626",
    "light_bg": "#F8FFFE", "white": "#FFFFFF", "gray": "#888888",
    "site_name": "Neomnia Studio", "site_domain": "neomnia.net"
  },
  "add_design_system": true,
  "add_components": false,
  "breakpoints": ["desktop", "mobile"]
}

// Réponse
{
  "project_id": "...", "file_id": "...",
  "workspace_url": "https://design.neokube.fr/workspace?...",
  "pages_created": 2,
  "artboards_created": 2
}
```

**Types de sections disponibles** :

| Type | Rendu | Hauteur typique |
|---|---|---|
| `hero` | Fond light_bg + H1 placeholder + 2 CTA + image droite | 400–600px |
| `content` | Fond blanc + accent bar gauche + texte placeholder | 200–400px |
| `services` | 3 cards avec top-bar PRIMARY | 300–400px |
| `cta` | Fond dark + bouton centré | 100–200px |
| `form` | 4 champs + submit | 400–500px |
| `grid2x2` | 4 cards en grille | 400–600px |
| `grid3x3` | 6 cards en grille | 400–600px |
| `custom` | Fond blanc + accent bar + label | variable |

**Nav et footer** : générés automatiquement pour chaque artboard (non à spécifier dans sections).

**Appelé par** : Joseph outil `penpot_build_structured` — jamais directement par un autre agent.

---

## Structure de projets — Convention 5 fichiers

**1 projet Penpot = 1 produit ou client**. À l'intérieur, 5 fichiers spécialisés (pas un seul fichier monolithique).

```
Neomnia Studio (team)
  └── NeoSaaS Tech (project_name)
        ├── 00_Source Import    ← capture brute du site existant (penpot_capture_full_site)
        ├── 01_UX Flows         ← parcours utilisateurs, décisions, scénarios métier
        ├── 02_Wireframes       ← structures basse fidélité (penpot_build_structured)
        ├── 03_UI Screens       ← maquettes finales, composants, responsive
        └── 90_Archive          ← explorations ou anciennes versions
```

| Fichier | Outil Joseph | Moment |
|---|---|---|
| `00_Source Import` | `penpot_capture_full_site` | Matière brute — premier artefact |
| `01_UX Flows` | frames manuelles ou brief | Après analyse des parcours |
| `02_Wireframes` | `penpot_build_structured` | Brief validé |
| `03_UI Screens` | `penpot_build_structured` + tokens | Wireframes validés |
| `90_Archive` | renommage manuel | Versions précédentes |

**Projets réservés** :

| Projet | Équipe | Usage |
|---|---|---|
| `Drafts` | Neomnia Studio | Brouillons manuels + **template-maquette-base** — ne pas supprimer |
| `Drafts` | Default | Brouillons personnels — ne pas toucher |

**Règle** : un seul projet actif par produit dans "Neomnia Studio". `project_name` = nom court du produit (ex: `"NeoSaaS Tech"`), sans suffixe `— Design` ni `— Wireframes`.

---

## URL de livraison — formats valides

Deux formats fonctionnent dans Penpot :

### Format 1 — `project-id` (recommandé, utilisé par Joseph)
```
http://penpot.neokube.local/workspace?project-id={project_id}&file-id={file_id}
https://design.neokube.fr/workspace?project-id={project_id}&file-id={file_id}
```
Ouvre le fichier sur sa première page. `project-id` est requis pour que Penpot charge le bon contexte.

### Format 2 — `team-id` + `page-id` (SPA hash routing)
```
http://penpot.neokube.local/#/workspace?team-id={team_id}&file-id={file_id}&page-id={page_id}
```
Ouvre directement une page spécifique. `team-id` = `82052e4a-914a-8123-8007-d697aa5fd265` (Neomnia Studio, constant).

### Construction programmatique (Python, dans Joseph)
```python
PENPOT_PUBLIC  = "http://penpot.neokube.local"   # local
PENPOT_PUBLIC  = "https://design.neokube.fr"       # public

# Après project.create + create-file :
workspace_url = f"{PENPOT_PUBLIC}/workspace?project-id={project_id}&file-id={file_id}"
```

### Récupérer project_id depuis file_id (SQL)
```sql
SELECT project_id FROM file WHERE id = '{file_id}';
```

**Prérequis** : l'utilisateur doit être connecté à Penpot avant d'ouvrir ce lien. Le SPA affiche une "404" si la session est absente — ce n'est pas un bug d'URL.

---

## Gotchas penpot-engine

### 1. `delete-project` = soft-delete, pas hard-delete

`delete-project` pose `deleted_at = now() + 7 jours`. Le projet reste visible dans `get-projects` pendant 7 jours. Pour un hard-delete immédiat :

```bash
kubectl exec -n penpot penpot-postgres-<pod> -- psql -U penpot -d penpot -c "
SET rules.deletion_protection TO off;
DO \$\$
DECLARE file_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(f.id) INTO file_ids
  FROM file f JOIN project p ON f.project_id = p.id
  WHERE p.id = '<project_id>';

  DELETE FROM file_tagged_object_thumbnail WHERE file_id = ANY(file_ids);
  DELETE FROM file_object_thumbnail         WHERE file_id = ANY(file_ids);
  DELETE FROM file_thumbnail                WHERE file_id = ANY(file_ids);
  DELETE FROM file_change                   WHERE file_id = ANY(file_ids);
  DELETE FROM file_media_object             WHERE file_id = ANY(file_ids);
  DELETE FROM file_data                     WHERE file_id = ANY(file_ids);
  DELETE FROM file WHERE id = ANY(file_ids);
  DELETE FROM project WHERE id = '<project_id>';
END \$\$;
"
```

Tables FK CASCADE (supprimées auto) : `comment_thread`, `file_library_rel`, `file_profile_rel`, `file_data_fragment`, `share_link`, `usage_quote`, `presence`.
Tables NO ACTION (à supprimer manuellement) : `file_data`, `file_data_00..15`, `file_change`, `file_media_object`, `file_thumbnail`, `file_object_thumbnail`, `file_tagged_object_thumbnail`.

### 2. Réponse 204 — bug cosmétique uvicorn

Quand Penpot répond `204 No Content`, uvicorn produit `RuntimeError: Response content longer than Content-Length`. Ce crash est **cosmétique** : l'opération s'est exécutée. Géré dans penpot-engine : réponse `204` interceptée et retournée proprement.

### 3. `get-project-files` utilise `path=`, pas `command=`

```python
# CORRECT (dans /proxy)
{"path": "get-project-files", "body": {"project-id": project_id}}
# FAUX — retourne 422
{"command": "get-project-files", "body": {"project-id": project_id}}
```

### 4. Idempotence — vérifier avant de créer

`/project.scaffold` est idempotent : si un projet avec le même `zoho_project_id` dans le nom existe déjà, il est réutilisé sans recréation.

### 5. Token JWT vs cookie

- Token `eyJ...` (JWT) → header `Authorization: Token <jwt>`
- Cookie de session → header `Cookie: auth-token=<cookie>`

Le token Vault `PENPOT_ACCESS_TOKEN` commence toujours par `eyJ` → JWT.

### 6. `duplicate-file` copie dans le même team

`duplicate-file` copie un fichier dans le même team. Pour copier vers un projet d'un autre team, utiliser `move-file` après duplication.

---

## API RPC Penpot — commandes disponibles via `/proxy`

### Profil & Auth
| Commande | Body | Description |
|---|---|---|
| `get-profile` | `{}` | Profil utilisateur courant |
| `login-with-password` | `{email, password}` | Login (retourne cookie) |
| `logout` | `{}` | Déconnexion |

### Teams
| Commande | Body | Description |
|---|---|---|
| `get-teams` | `{}` | Liste toutes les teams |
| `get-team` | `{id}` | Détail d'une team |
| `get-team-members` | `{team-id}` | Membres d'une team |
| `get-team-stats` | `{team-id}` | Stats (projets, fichiers) |

### Projets
| Commande | Body | Description |
|---|---|---|
| `get-projects` | `{team-id}` | Liste tous les projets (y.c. soft-deleted) |
| `create-project` | `{team-id, name}` | Crée un projet |
| `rename-project` | `{id, name}` | Renomme |
| `delete-project` | `{id}` | Soft-delete (7j) |
| `duplicate-project` | `{project-id}` | Duplique un projet complet |

### Fichiers
| Commande | Body | Description |
|---|---|---|
| `get-project-files` | `{project-id}` | Liste les fichiers d'un projet |
| `get-file` | `{id}` | Métadonnées d'un fichier |
| `create-file` | `{project-id, name}` | Nouveau fichier vide |
| `rename-file` | `{id, name}` | Renomme |
| `delete-file` | `{id}` | Supprime |
| `duplicate-file` | `{file-id, project-id, name?}` | **Opération clé** — copie un template |
| `move-files` | `{ids: [...], project-id}` | Déplace vers un autre projet |

### Commentaires
| Commande | Body | Description |
|---|---|---|
| `get-file-comments-thread` | `{file-id}` | Threads de commentaires |
| `create-comment-thread` | `{file-id, content, point}` | Nouveau thread |

---

## Intégration Dispatcher

Le Dispatcher appelle directement penpot-engine sans passer par un agent LLM :

```python
# Dans DevProjectWorkflow (dispatcher) — activité penpot
async def _penpot_scaffold(spec: ProjectSpec) -> dict:
    r = await httpx.AsyncClient(timeout=30).post(
        "http://penpot-engine.connector-system.svc.cluster.local:8004/project.scaffold",
        json={
            "project_name": f"{spec['title']} — Design",
            "zoho_project_id": spec.get("zoho_project_id", ""),
        }
    )
    return r.json()  # {"project_id": "...", "file_id": "...", "workspace_url": "..."}
```

---

## Conversion Site ↔ Penpot — Vue d'ensemble

Trois outils Joseph couvrent les deux directions. Les agents dev (Camille, Guillaume) les utilisent pour travailler sur des sites clients.

### Comparatif des outils

| Outil | Résultat | Éditable | Fidélité | Usage |
|---|---|---|---|---|
| `penpot_import_site` | Screenshot PNG dans un frame | ❌ image fixe | Visuelle | Référence rapide |
| `penpot_site_to_wireframe` | Shapes vectorielles par section | ✅ | Structurelle | Refonte from scratch |
| `penpot_site_to_shapes` | Shapes DOM 1:1 (positions exactes) | ✅ | Haute (~80%) | Analyse / retouche d'un site existant |
| `penpot_export_design` | CSS/Tailwind tokens depuis Penpot | — | — | Penpot → code Camille/Guillaume |

---

## `penpot_site_to_shapes` — URL → Shapes Penpot éditables

### Ce que ça produit

Un fichier Penpot avec **N shapes indépendantes éditables** (rects, textes, images) reproduisant la page réelle à l'échelle 1:1 dans un artboard de `viewport_width × page_height`.

Chaque élément DOM significatif devient un objet Penpot distinct :
- `rect` : fond coloré (nav, section, bouton, card)
- `text` : contenu textuel avec police, taille, alignement
- `rect + fill-image` : images `<img>` et icônes SVG (screenshots PNG uploadés)

### Appel depuis Joseph

```python
penpot_site_to_shapes(url="https://client.fr", project_name="Client — import", max_shapes=300)
# → {"project_id": "...", "file_id": "...", "shapes_created": 287,
#    "workspace_url": "http://penpot.neokube.local/workspace?project-id=...&file-id=..."}
```

---

## Architecture technique — Pipeline URL → Penpot

```
URL live
  │
  ▼
crawlee-service  (Node.js/Express + Playwright Chromium headless)
  POST /dom-to-shapes
  │   1. page.goto(url) → networkidle
  │   2. Scroll complet (lazy-load) → stop à 150px
  │      (headers sticky/fixed ont leur fond opaque à ~100px de scroll)
  │   3. page.evaluate() — JS dans le contexte navigateur :
  │      - querySelectorAll('*') — parcours exhaustif du DOM
  │      - getComputedStyle() → couleurs, polices, tailles résolues
  │      - getBoundingClientRect() → position absolue dans le document
  │      - isCoveredByChildren() → filtre anti-fantômes (containers redondants)
  │      - 4 Règles de capture (voir §Règles ci-dessous)
  │   4. Playwright screenshot par icône SVG (clip sur bounding box)
  │
  ▼  JSON plat : { shapes: [...], total_height, viewport_width, capture_scroll_y }
  │
  ▼
Joseph  (Python/FastAPI — penpot_site_to_shapes)
  │   1. POST /dom-to-shapes → récupère shapes[]
  │   2. project.create + create-file → nouveau projet Penpot
  │   3. Pré-upload images :
  │      - shapes[kind=image, src] → GET src → POST /upload-image → _media_id
  │      - shapes[type=image_png, pngBase64] → POST /upload-image → _media_id
  │   4. Construit les add-obj Penpot :
  │      - type=text → _pw_text() avec textAlign CSS natif
  │      - type=rect + _media_id → fill-image (logo, icône PNG)
  │      - type=rect → fill-color
  │   5. update-file (batch) → un seul appel RPC Penpot
  │
  ▼
Penpot  — fichier éditable avec N shapes dans un artboard 1440px
```

**Clé de l'approche** : Playwright charge la page avec un vrai navigateur (JS exécuté, CSS appliqué). `getComputedStyle()` + `getBoundingClientRect()` donnent les positions et couleurs **après rendu** — ce qu'aucun parser HTML statique ne peut faire.

---

## penpot-engine — Endpoints `/design-system.add` + `/components.add`

**Déployés** : 2026-06-10 — Étape 4

### `POST /design-system.add`

Ajoute une page "Design System" à un **fichier Penpot existant**. Contenu : palette 8 couleurs, échelle typographique, grille 12 colonnes, placeholders images.

```json
{
  "file_id": "uuid-du-fichier",
  "primary": "#32AFB1",
  "primary_dark": "#1E6363",
  "dark": "#262626",
  "light_bg": "#F8FFFE",
  "site_name": "Studio"
}
```

Réponse : `{file_id, page_id, page_label, workspace_url, objects_created}`

### `POST /components.add`

Ajoute une page "Composants" à un **fichier Penpot existant**. Contenu : boutons (5 variants), nav desktop + mobile, badges, formulaires (4 états).

Même structure de requête que `/design-system.add`.

### Différence avec `/wireframe.build`

| Endpoint | Usage |
|---|---|
| `/wireframe.build` avec `add_design_system=True` | Crée wireframes **ET** DS en une seule opération (nouveau fichier) |
| `/design-system.add` | Enrichit un fichier **existant** déjà créé |
| `/components.add` | Enrichit un fichier **existant** déjà créé |

---

## crawlee-service — Endpoint `/dom-to-shapes`

### Requête
```json
{
  "url": "https://client.fr",
  "max_shapes": 500,
  "timeout": 90000,
  "viewport_width": 1440
}
```

`viewport_width` : `1440` (desktop, défaut) ou `375` (mobile). Ajuste aussi la hauteur viewport (`375px → 844px`).

### Réponse
```json
{
  "url": "https://client.fr",
  "viewport_width": 1440,
  "total_height": 7109,
  "capture_scroll_y": 150,
  "count": 287,
  "shapes": [
    { "type": "rect",      "kind": "nav",     "x": 0,    "y": 0,   "w": 1440, "h": 89,  "fill": "#1c1c2e", "zIndex": 100 },
    { "type": "rect",      "kind": "image",   "x": 104,  "y": 16,  "w": 56,   "h": 56,  "fill": "#e0e0e0", "src": "https://client.fr/assets/logo.png" },
    { "type": "text",      "kind": "button",  "x": 1157, "y": 32,  "w": 179,  "h": 22,  "text": "Démarrer un projet", "textAlign": "center", "fontSize": 16, "color": "#ffffff" },
    { "type": "image_png", "kind": "svg",     "x": 35,   "y": 35,  "w": 18,   "h": 18,  "fill": "#888888", "pngBase64": "iVBOR..." },
    { "type": "input",     "kind": "input",   "x": 200,  "y": 400, "w": 320,  "h": 40,  "fill": "#F9F9F9", "borderColor": "#CCCCCC", "text": "Votre email", "borderRadius": 6 }
  ]
}
```

### Les 5 Règles de capture DOM

| Règle | Condition | Shape produite | Notes |
|---|---|---|---|
| **1** | `backgroundColor` non-transparent **OU** `header/nav/fixed/sticky` forcé | `rect` avec `fill` hex | Anti-fantômes : skip si enfant couvre ≥80% surface |
| **2** | Nœud texte direct sur l'élément | `text` avec `textAlign`, `fontSize`, `color` | `y` compensé par `paddingTop` CSS |
| **3** | Tag `<img>` avec `src` | `rect` avec `src` URL complète | Joseph la télécharge et upload en `fill-image` |
| **4** | Tag `<svg>` entre 8px et 200px | `rect` marqué `kind:svg` + screenshot Playwright | Upload PNG → `fill-image` Penpot |
| **5** | Tag `<input>`, `<textarea>`, `<select>` (hors `type=hidden`) | `input` avec `fill`, `borderColor`, `text` (placeholder) | Rendu dans Joseph : rect bordé + texte placeholder gris `#AAAAAA` |

### Filtre cookie/RGPD (actif depuis 2026-06-10)

Les éléments dont `class` ou `id` contient l'un des patterns suivants sont **silencieusement ignorés** avant toute règle de capture :

```
cookie | consent | gdpr | cc-window | cc-banner | cookielaw
cookie-banner | cky- | tarteaucitron | didomi | onetrust
```

Ces bandeaux ne doivent pas apparaître dans les fichiers Penpot livrés. Si un bandeau passe quand même (class non standard), il peut être isolé dans `90_Archive`.

### Logique anti-fantômes — `isCoveredByChildren()`

Un container `div/section` est ignoré si l'un de ses enfants directs avec fond solide couvre ≥80% de sa surface. Évite les shapes en doublon (parent + enfant de même taille et couleur).

```javascript
function isCoveredByChildren(el, rect) {
  // Tags filtrés : div, section, article, main, aside, span
  // Calcule overlap rect parent vs rect enfant (getBoundingClientRect)
  // Retourne true si maxCoverage > 0.80
}
```

### Couleur header transparent (backdrop-filter)

Quand `backgroundColor` est transparent sur un `nav/header/fixed` (cas fréquent avec `backdrop-filter: blur()`), la couleur est déduite de la luminance du texte :

```javascript
const lum = (R*299 + G*587 + B*114) / 1000;
fill = lum > 128 ? '#1c1c2e' : '#f8f9fa';  // texte clair → fond sombre
```

### Éléments filtrés (hors cookie)

- `rect.y < 0` : éléments hors page (décors SVG off-screen)
- `rect.w < 8 || rect.h < 8` : éléments invisibles
- SVG > 200×200px : considérés comme décors de fond, pas des icônes
- `display:none`, `visibility:hidden`, `opacity < 0.1`
- `input[type=hidden]` : champs cachés ignorés

---

## crawlee-service — Endpoint `/nav-links`

**Déployé** : 2026-06-10 — utilisé par Joseph `detect_site_pages`

### Requête
```json
{"url": "https://client.fr"}
```

### Réponse
```json
{
  "url": "https://client.fr",
  "domain": "client.fr",
  "count": 6,
  "links": [
    {"href": "https://client.fr/",         "path": "/",         "text": "Accueil",  "in_nav": true},
    {"href": "https://client.fr/services", "path": "/services", "text": "Services", "in_nav": true},
    {"href": "https://client.fr/contact",  "path": "/contact",  "text": "Contact",  "in_nav": true}
  ]
}
```

### Comportement
- Playwright charge la page (`waitUntil: 'load'`) — JavaScript exécuté, CSS calculé
- Sélecteurs : `nav a, header a, [role=navigation] a`
- Filtres : même domaine, pas d'ancres `#`, pas d'assets (images, pdf, js, css), pas de doublons
- Tri : liens `in_nav` en premier, max 20 résultats
- Utilisé par Joseph `detect_site_pages` → LLM propose pages + sections → `penpot_build_structured`

---

## État de fidélité V1 — Ce qui marche / Ce qui est limité

### ✅ Résolu (V1 actuelle)

| Point | Solution |
|---|---|
| Positions/couleurs CSS calculées | `getComputedStyle()` + `getBoundingClientRect()` post-rendu |
| Headers sticky/fixed | Scroll à 150px + détection `isInFixedContainer()` |
| Icônes SVG | Screenshot Playwright ciblé → PNG → `fill-image` Penpot |
| Images `<img src>` (logos) | Download HTTP + upload `/upload-image` → `fill-image` |
| Header transparent | Luminance texte → fond sombre/clair déduit |
| Texte centré dans boutons | `y += paddingTop` ; `textAlign` CSS → `text-align` Penpot |
| Éléments fantômes | `isCoveredByChildren()` filtre les containers redondants |

### ⚠️ Limitations V1

| Limitation | Cause | Impact |
|---|---|---|
| Bouton + texte = 2 objets séparés | Pas de groupement spatial | Déplacement bouton ≠ déplacement texte |
| Polices custom remplacées par Inter | Penpot nécessite upload police | Rendu typographique approximatif |
| JSON plat (pas de hiérarchie DOM) | `querySelectorAll('*')` linéaire | Pas de Frames/Groups Penpot par section |
| Background-image CSS (certains logos) | `bgSrc` extrait mais pas toujours résolu | Logo manquant sur certains sites |
| Animations CSS/JS | Penpot = outil statique | Impossible par conception |
| SVGs multi-couches complexes | Screenshot PNG = rasterisation | Perte de qualité sur grands SVG |

---

## Architecture Joseph ↔ penpot-engine — Décision d'arbitrage (2026-06-10)

**Principe retenu** : séparation stricte des responsabilités.
- `penpot-engine` = constructeur déterministe (shapes, artboards, pages). Aucun LLM.
- `Joseph` = stratège conversationnel (analyse UX, décisions sections, orchestration).
- `crawlee-service` = extraction DOM (captures de sites existants).

**Matrice d'outils** :

| Besoin | Joseph tool | Backend | Fichier cible |
|---|---|---|---|
| **Capturer site entier COMPLET** (toutes pages) | **`penpot_capture_full_site`** | crawlee `/nav-links` + `/dom-to-shapes` + penpot `/proxy` | `00_Source Import` |
| Capturer UNE page existante 1:1 | `penpot_site_to_shapes` | crawlee `/dom-to-shapes` + penpot-engine `/proxy` | `00_Source Import` |
| Wireframe épuré 1 page | `penpot_site_to_wireframe` | crawlee `/dom-extract` + Joseph buildeur | `02_Wireframes` |
| **Wireframes structurés multi-pages** | **`penpot_build_structured`** | **penpot-engine `/wireframe.build`** | `02_Wireframes` |
| Maquettes haute fidélité | `penpot_build_structured` + tokens réels | penpot-engine `/wireframe.build` | `03_UI Screens` |
| Design System générique (avec wireframes) | `penpot_build_structured(add_design_system=True)` | penpot-engine `/wireframe.build` | `02_Wireframes` |
| Design System sur fichier existant | `penpot_add_design_system(file_id)` | penpot-engine `/design-system.add` | `03_UI Screens` |
| Composants sur fichier existant | `penpot_add_components(file_id)` | penpot-engine `/components.add` | `03_UI Screens` |

**Roadmap post-arbitrage** :
- ✅ Étape 1 — Builders penpot-engine `/wireframe.build` (2026-06-10)
- ✅ Étape 2 — Joseph `penpot_build_structured` (2026-06-10)
- ✅ Étape 3 — Multi-page conversationnel : crawlee `/nav-links` + Joseph `detect_site_pages` (2026-06-10)
- ✅ Étape 4 — Design System + Composants standalone : penpot-engine `/design-system.add` + `/components.add` + Joseph `penpot_add_design_system` + `penpot_add_components` (2026-06-10)
- ⏳ Étape 5 — Groupement spatial P1 (`group_shapes` post-traitement)

---

## Roadmap V2 — Priorités d'amélioration

### Priorité 1 — Groupement spatial bouton+texte (Joseph, post-traitement)

**Complexité** : faible — modification uniquement de Joseph, pas de crawlee.

Après réception du JSON plat de crawlee, détecter les textes contenus dans un rect (containment spatial) et créer un **Penpot Group** :

```python
def group_shapes(shapes):
    groups = []
    used = set()
    for i, rect in enumerate(shapes):
        if rect["type"] != "rect" or i in used: continue
        children = [j for j, s in enumerate(shapes)
                    if j != i and j not in used
                    and s["x"] >= rect["x"] and s["y"] >= rect["y"]
                    and s["x"]+s["w"] <= rect["x"]+rect["w"]
                    and s["y"]+s["h"] <= rect["y"]+rect["h"]]
        if children:
            groups.append({"parent": i, "children": children})
            used.update(children)
    return groups
```

Chaque groupe → `type: "group"` Penpot. Les enfants ont leur `parent-id` → group UUID (pas le frame principal). Résultat : déplacer un bouton déplace son label.

### Priorité 2 — SVG natif via outerHTML (crawlee + Joseph)

**Complexité** : faible — remplacement du screenshot par l'injection SVG directe.

Penpot accepte `type: "svg-raw"` avec le contenu SVG inline. Plus propre que PNG : pas de rasterisation, pas de scroll pour le screenshot.

```javascript
// crawlee — Règle 4, ajouter :
svgHtml: el.outerHTML.slice(0, 8000),  // contenu SVG brut
```

```python
# Joseph — pour shapes avec svgHtml :
# Utiliser POST /proxy { path: "create-file-media-object-from-url" }
# ou inject via type "svg-raw" dans add-obj
```

### Priorité 3 — DOM récursif → JSON hiérarchique (réécriture crawlee)

**Complexité** : élevée — réécriture du `page.evaluate()` dans crawlee.

Remplacer `querySelectorAll('*')` (liste plate) par un **parcours récursif depuis `document.body`** :

```javascript
function walkNode(el, depth = 0) {
  if (depth > 12) return null;
  const style = window.getComputedStyle(el);
  if (!hasVisualSignificance(el, style)) return null;
  return {
    ...extractShape(el, style),
    children: Array.from(el.children)
      .map(child => walkNode(child, depth + 1))
      .filter(Boolean)
  };
}
```

Dans Joseph : chaque nœud avec enfants → **Penpot Frame** (clip) ou **Group**. Les `parent-id` reflètent l'arbre DOM réel : `body > main > section > card > titre`. Résultat : la structure Penpot est navigable par section/composant.

### Priorité 4 (optionnel) — Couche sémantique LLM pour les composants

**Pour aller au-delà de la géométrie** : détecter que 4 structures identiques sont des variants d'un composant Penpot réutilisable.

```
crawlee (JSON plat)
  → Script de structure (Priorités 1+2+3 — déterministe)
  → LLM Semantic Mapping (claude-sonnet ou gpt-4o)
      Prompt : "Voici un JSON de shapes Penpot. Identifie les patterns
                répétés (cards, boutons, items de liste) et regroupe-les
                en composants nommés avec leurs variants."
  → JSON hiérarchique + composants Penpot
  → Joseph → API Penpot
```

**Quand activer** : après Priorités 1-3 stables. Ajoute ~2-3s et coût LLM par conversion.

---

## `penpot_site_to_wireframe` — URL → Wireframe par sections

**Outil Joseph** : `penpot_site_to_wireframe(url, project_name?)`

**Pipeline** :
```
URL live
  → crawlee-service POST /dom-extract
      (CSS vars, computed styles, sections, typographie)
  → Joseph mappe sections → shapes vectorielles abstraites
  → Wireframe avec couleurs réelles (--primary-color, etc.)
```

**Usage** : moins fidèle que `penpot_site_to_shapes` mais plus épuré — idéal pour les refontes where on veut repartir sur une base propre.

**`crawlee-service POST /dom-extract`** :
```json
{"url": "https://exemple.fr"}
// → {"cssVars": {"--primary-color": "#32afb1"}, "colors": [...], "sections": [...]}
```

---

## `penpot_export_design` — Penpot → Code

**Outil Joseph** : `penpot_export_design(file_id, format?)`

**Formats** : `tokens` · `css` · `tailwind` · `full`

**Usage typique** :
```
Joseph penpot_export_design(file_id, format="full")
  → CSS variables + Tailwind config
  → transmis à Camille (Next.js/Tailwind) via Leon
```

---

## Bugs résolus (2026-06-09/10)

### Assets 404 — PVC frontend non monté

Le Nginx du frontend (`penpot-frontend`) utilise `X-Accel-Redirect` pour servir les assets. Sans le montage du PVC `penpot-assets-pvc`, tous les assets retournaient 404.

**Fix** : `deployment-penpot-frontend.yaml` — volume mount `penpot-assets-pvc` readOnly sur `/opt/data/assets`.

**Architecture X-Accel-Redirect** :
```
GET /assets/by-file-media-id/{fmo_id}
  → Nginx proxy → penpot-backend:6060
  → Backend : 204 + X-Accel-Redirect: /internal/assets/{c7/f3/uuid}
  → Nginx : location /internal/assets { internal; alias /opt/data/assets; }
```

**Chemin fichier** : `{uuid[0:2]}/{uuid[2:4]}/{uuid[4:32]}` (UUID sans tirets).

### Logo gris — import base64 dupliqué dans Joseph

`import base64` existait à la fois en top-level (module) et localement dans le handler `github_get_readme`. Python traitait `base64` comme variable locale dans toute la fonction handler → `UnboundLocalError` silencieux lors de l'upload des logos.

**Fix** : suppression de l'`import base64` local à la ligne 753 de `joseph.py`. Le module-level `import asyncio, base64, ...` (ligne 10) suffit.
