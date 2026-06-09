# CLAUDE-figma-engine.md — Joseph + figma-engine + Reveal.js

> Statut : **DÉPLOYÉ** — figma-engine v1.1 actif, Joseph v3.0 opérationnel
> Dernière mise à jour : 2026-06-09

---

## Philosophie des stacks

| Besoin | Stack | Agent / Outil |
|---|---|---|
| Présentation / pitch / pitch deck | **Reveal.js** via figma-engine | `generate_reveal_slides` |
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
#000614 (×8) → background_color  (couleur la plus sombre)
#154a4b (×6) → primary_color     (mid-tone dominant, hors accent)
#32afb1 (×4) → secondary_color   (2e mid-tone, hors accent)
#edb842 (×5) → accent_color      (couleur la plus chaude/distinctive)
              → text_color        (#fff si bg sombre, #1a1a1a si clair)
```

Aucun style nommé Figma requis — fonctionne sur tout fichier y compris sans design system structuré.

### Template Reveal.js — Design tokens Neomnia (défauts)

```
background_color : #000614  (navy profond)
primary_color    : #154a4b  (teal sombre)
secondary_color  : #32afb1  (turquoise)
accent_color     : #edb842  (gold)
text_color       : #ffffff
font_family      : system-ui, sans-serif
```

### Types de slides

| Type | Rendu | Usage |
|---|---|---|
| `cover` | Plein écran centré, gradient, tag doré | 1re slide — titre + accroche |
| `content` | Standard avec barre accent et liste pucée | Slides de contenu principal |
| `feature` | 2 colonnes (left=primary, right=bg) | Comparaison, feature vs bénéfice |
| `closing` | Centré, bouton CTA doré | Dernière slide — appel à l'action |

Dans `content` pour 2 colonnes `feature` : séparer gauche/droite avec `---` dans le champ `content`.

### Export PDF

Reveal.js supporte nativement l'export PDF via le navigateur :
1. Ouvrir `http://figma.neokube.local/slides/{id}?print-pdf` dans **Chrome**
2. `Ctrl+P` → Imprimer → **Enregistrer en PDF**
3. Format : A4 paysage ou 16:9 selon les paramètres Reveal.js

---

## Joseph v3.0 — Agent UX/Design Strategist

**Namespace** : `agent-system` · **Port** : 8492
**Accès OWU** : modèle `Joseph — Design & Figma` dans Open WebUI

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

### Tous les outils Joseph v3.0

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
| `penpot_list_projects()` | Projets Penpot de l'équipe |
| `penpot_list_files(project_id)` | Fichiers d'un projet |
| `penpot_create_project(name)` | Crée un projet Penpot |

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

**Intent "design"** → Joseph demande : *Penpot ou Figma ?*
Exemples : "maquette", "landing page", "identité visuelle", "wireframe", "interface"
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

### Variables d'environnement Joseph

```
FIGMA_ENGINE_URL     = http://figma-engine.connector-system.svc.cluster.local:8013
NOTION_CONNECTOR_URL = http://notion-connector.connector-system.svc.cluster.local:8011
GITHUB_CONNECTOR_URL = http://github-connector.connector-system.svc.cluster.local:8001
CRAWLEE_CONNECTOR_URL = http://crawlee-service.connector-system.svc.cluster.local:8009
PENPOT_CONNECTOR_URL = http://penpot-connector.connector-system.svc.cluster.local:8004
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

---

## Références

- Figma file Neomnia template : `JmMvTNJGdEjzR2Q56u6ZY8`
- Notion doc NeoKube officielle : `33b3f68c` (page_id)
- EuraTechnologies pitch deck requirements : `https://www.euratechnologies.com/pitch-deck-1`
- Reveal.js CDN : `https://cdn.jsdelivr.net/npm/reveal.js@5/`
