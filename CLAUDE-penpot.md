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

---

## Structure de projets — Convention

| Projet | Équipe | Usage |
|---|---|---|
| `{Titre client} — Design` | Neomnia Studio | Un projet par client — créé par penpot-engine |
| `Drafts` | Neomnia Studio | Brouillons manuels + **template-maquette-base** — ne pas supprimer |
| `Drafts` | Default | Brouillons personnels — ne pas toucher |

**Règle** : un seul projet actif par client dans "Neomnia Studio". `/project.scaffold` vérifie les doublons via le `zoho_project_id` dans le nom.

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

## Conversion bidirectionnelle Site ↔ Penpot

Deux directions sont implémentées via les outils Joseph. Les agents dev (Camille, Guillaume) utilisent ces outils pour convertir dans les deux sens.

### Direction 1 : Site → Penpot (wireframe éditable)

**Outil Joseph** : `penpot_site_to_wireframe(url, project_name?)`

**Pipeline** :
```
URL live
  → crawlee-service POST /dom-extract
      (Playwright extrait CSS vars, computed styles, sections, typographie)
  → Joseph mappe sections DOM → penpot_create_wireframe
      (couleurs réelles depuis --primary-color, --brand, etc.)
  → Wireframe Penpot avec shapes vectorielles éditables
  → workspace_url livré
```

**Avantage sur `penpot_import_site`** : résultat éditable (shapes vectorielles vs image fixe). Idéal pour les refontes.

**`crawlee-service POST /dom-extract`** :
```json
// Requête
{"url": "https://exemple.fr", "timeout": 30000}

// Réponse
{
  "url": "https://exemple.fr",
  "title": "Exemple — Agence digitale",
  "cssVars": {"--primary-color": "#32afb1", "--font-main": "'Inter', sans-serif"},
  "colors": ["#32afb1", "#1a1a2e", "#ffffff", "#edb842"],
  "typography": {
    "heading": {"font": "Inter", "size": "48px", "weight": "700"},
    "body": {"font": "Inter", "size": "16px"}
  },
  "sections": [
    {"type": "nav", "links": ["Accueil","Services","Contact"], "bg": "#ffffff", "height": 80},
    {"type": "hero", "title": "Agence digitale IA", "subtitle": "...", "height": 500},
    {"type": "section", "title": "Nos services", "height": 350},
    {"type": "footer", "bg": "#1a1a2e", "height": 120}
  ]
}
```

### Direction 2 : Penpot → Code (tokens pour Camille/Guillaume)

**Outil Joseph** : `penpot_export_design(file_id, format?)`

**Formats disponibles** :
- `tokens` (défaut) : JSON couleurs + polices
- `css` : variables CSS `:root { --color-1: #32afb1; ... }`
- `tailwind` : config Tailwind `theme.extend.colors`
- `full` : tout + liste des composants (frames)

**Usage typique** :
```
Joseph penpot_export_design(file_id, format="full")
  → CSS variables + Tailwind config + composants
  → transmis à Camille (Next.js/Tailwind) via Leon
```

### Comparatif des outils d'import site

| Outil | Résultat | Éditable | Couleurs réelles | Usage |
|---|---|---|---|---|
| `penpot_import_site` | Screenshot PNG dans un frame | ❌ image | Visuellement (non éditables) | Référence visuelle rapide |
| `penpot_site_to_wireframe` | Shapes vectorielles | ✅ | ✅ extraites depuis CSS | Refonte, base de travail |
| `penpot_create_wireframe` | Wireframe abstrait | ✅ | Tokens passés manuellement | Nouveau projet from scratch |

### Bug connu — AccessDeniedException sur les nouveaux uploads

Le processus JVM Penpot ne peut pas créer de nouveaux sous-répertoires dans `/opt/data/assets/` (permission refusée en NIO). Les uploads de nouvelles images échouent silencieusement (DB record créé, fichier non écrit).

**Contournement** : utiliser `penpot_site_to_wireframe` (wireframe vectoriel, pas d'upload image) à la place de `penpot_import_site` pour les nouvelles importations tant que ce bug n'est pas résolu.

**Diagnostic** :
```bash
kubectl logs -n penpot deployment/penpot-backend 2>&1 | grep -i "AccessDeniedException\|permission"
```

### Bug résolu — Assets 404 (2026-06-09)

Le pod `penpot-frontend` n'avait pas le PVC `penpot-assets-pvc` monté. Le Nginx du frontend utilise `X-Accel-Redirect: /internal/assets/{uuid-path}` pour servir les fichiers — sans le montage, tous les assets retournaient 404.

**Fix** : `deployment-penpot-frontend.yaml` — volume mount `penpot-assets-pvc` en `readOnly: true` sur `/opt/data/assets`.

**Architecture X-Accel-Redirect** :
```
GET /assets/by-file-media-id/{fmo_id}
  → Nginx proxy → penpot-backend:6060/assets/by-file-media-id/{fmo_id}
  → Backend : DB lookup storage_object → 204 + X-Accel-Redirect: /internal/assets/{c7/f3/uuid}
  → Nginx location /internal/assets { internal; alias /opt/data/assets; }
  → Fichier servi directement depuis PVC
```

**Chemin fichier** : `id->path(uuid)` = `{uuid[0:2]}/{uuid[2:4]}/{uuid[4:32]}` (sans tirets).
Exemple : UUID `c7f3509a-6449-4d1b-b3bb-55ef98f978c7` → `/opt/data/assets/c7/f3/509a64494d1bb3bb55ef98f978c7`
