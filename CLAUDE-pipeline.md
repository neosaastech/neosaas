## Cycle de vie d'un projet — Planification → Production

Cette section est la référence pour comprendre à quel moment un projet passe de la planification à la production et quels agents interviennent à chaque phase.

**Architecture v2 (2026-06-01)** : Leon est l'orchestrateur unique du pipeline SSII. Zoho Projects est la machine d'états — chaque transition de jalon déclenche une action Leon. Le Dispatcher (`dev-project-workflow`) est supprimé. Branche : `feat/leon-ssii-orchestrator`.

---

### Phase 1 — Exploration

**Quand** : L'utilisateur mentionne un projet dans Open WebUI, sans savoir encore s'il existe.

**Agent principal** : Charlotte

| Action | Outil | Résultat |
|---|---|---|
| Vérifier l'existence du projet dans tous les systèmes | `project_health_check(project_name)` | Tableau ✅/❌/⚠️ — Zoho, GitHub, Vercel, Penpot, Notion |
| Si tout est ✅ | — | Projet déjà en place, passer directement à la Phase 3 si souhaité |
| Si ❌ dans Zoho | → Phase 2 (Leon) | Le projet n'est pas encore structuré |

**Exemple de déclencheur** : *"Vérifie l'état du projet neomnia.net"*, *"Est-ce que tout est en place pour lancer la refonte ?"*

---

### Phase 2 — Planification

**Quand** : Le projet existe dans Notion mais doit être révisé/cadré — ou est nouveau et doit être structuré.

**Agents principaux** : Leon, Charlotte

Leon v3.1 distingue deux sous-modes dans cette phase :

**Sous-mode REVIEW** (projet Notion existant) :
| Étape | Agent | Action |
|---|---|---|
| 1 | Leon | `notion_read_page(url)` + `surfsense_search("normes stack Neomnia")` — sans question |
| 2 | Leon | Analyse des gaps : ✅ conforme / ⚠️ à corriger / ❌ absent |
| 3 | Leon | Rédige ProjectSpec corrigé → `notion_update_page(url, "ProjectSpec corrigé", contenu)` |
| 4 | Leon | Demande validation utilisateur sur Notion (1 question) |
| 5 | Leon | Après "oui" → `zoho_scaffold_project(...)` + scaffold projet Zoho complet |

**Sous-mode TASK** (nouveau projet) :
| Étape | Agent | Action |
|---|---|---|
| 1 | Leon | Q0 — "Avez-vous une page Notion ?" (URL=lire / 'non'=créer) |
| 2 | Leon | CLARIFYING Charlotte pattern — 1 question par tour (LLM gère l'état) |
| 3 | Leon | ProjectSpec validé → `zoho_scaffold_project(...)` |
| 4 | Charlotte | `project_health_check(update_docs=True)` — croise Zoho ↔ Notion ↔ autres systèmes |

**Sorties** :
- ProjectSpec conforme aux normes Neomnia (Next.js App Router, Radix UI, Tailwind v4…)
- Page Notion mise à jour avec section "ProjectSpec corrigé"
- Projet Zoho structuré (après validation utilisateur)

**Validation obligatoire** : Leon ne dispatche jamais sans confirmation explicite de l'utilisateur sur le ProjectSpec Notion.

**Cran d'arrêt Zoho** : La clôture d'un jalon dans Zoho déclenche automatiquement la phase suivante — zoho-observer détecte → `POST leon:8181/mission` avec `intent=milestone_closed`. Leon décide de la suite sans intervention humaine.

---

### Phase 3 — Production

**Quand** : Jalon Zoho clôturé (milestone_index=1) → zoho-observer → `POST leon:8181/mission` avec `intent=milestone_closed`.

**Agent principal** : Leon (orchestrateur direct)

**Principe** : Leon dispatch en parallèle via `asyncio.gather` sur `POST /mission` de chaque sous-agent. Zoho est la machine d'états — pas de Temporal workflow, pas de Dispatcher.

```
zoho-observer (scan 5min)
  → milestone_closed (index=1 — Setup)
  → POST leon:8181/mission

Leon
  → lire ProjectSpec depuis Notion
  → asyncio.gather([
        POST camille:8485/mission,   # GitHub frontend + Vercel
        POST guillaume:8486/mission, # GitHub backend + Neon
        POST alain:8494/mission,     # CI/CD GitHub Actions
        POST domi:8489/mission,      # DNS + Scaleway projet
        POST joseph:8492/mission,    # Design Penpot + Figma
    ], return_exceptions=True)
  → agréger résultats (PARTIAL si ≥1 échec)
  → commentaire robot sur tâche Zoho (web_url depuis zoho-engine)
  → POST nora:8493/mission → email client "Setup terminé — accès staging"
  → ouvrir jalon suivant dans Zoho (status=1)
```

**Mapping jalon → agents dispatché par Leon** :

| Jalon (milestone_index) | Agents en parallèle | Email Nora |
|---|---|---|
| 0 — Prévente clôturé | `[Nora]` | Confirmation brief + planning |
| 1 — Setup clôturé | `[Camille, Guillaume, Alain, Domi, Joseph]` | Accès staging + liens GitHub/Vercel |
| 2 — Développement clôturé | `[Camille, Guillaume]` | Livraison recette + instructions |
| 3 — Go live clôturé | `[Camille, Alain]` | Go-live + accès prod + guide admin |

**Validation humaine** : Charles clôture manuellement le jalon Zoho suivant après vérification. La clôture est le signal de validation — plus de `wait_for_signal` Temporal.

**Sorties garanties (jalon 1 — Setup)** :

| Système | Résultat |
|---|---|
| GitHub | 2 repos créés : `neomnia/{slug}-frontend` + `neomnia/{slug}-backend` |
| Vercel | Projet créé, staging déployé |
| Neon | Branche créée sur NeoBridge |
| Penpot | Projet design initialisé |
| Scaleway | Projet client `client-{slug}` créé (via scaleway-engine, Domi) |
| Zoho | Commentaire robot sur tâche + lien web_url (zoho-engine injecte, jamais construit manuellement) |
| Nora | Email client envoyé |
| Qdrant | Décision archivée dans `pm-decisions` |

---

### Phase 3b — Design Penpot → Code → GitHub → Vercel

**Quand** : L'utilisateur (ou Charlotte) souhaite transposer un projet Penpot existant en code Next.js.

**Déclencheur** : Charlotte appelle `trigger_leon_workflow(intent="design_deploy", penpot_project_id="<uuid>")` → `POST leon:8181/mission`.

**Agent principal** : Leon → Camille v3.0

| Étape | Agent | Action |
|---|---|---|
| 1 | Leon | Reçoit brief Penpot, construit mission Camille |
| 2 | Camille | Exporte fichiers Penpot via penpot-connector |
| 3 | Camille | Génère composants Next.js via LLM (codestral) |
| 4 | Camille | Push branche `design/penpot-export-{id[:8]}` (GitHub MCP) |
| 5 | Camille | Redéploiement Vercel (vercel-connector) — preview deploy |
| 6 | Leon | Notification ntfy + commentaire Zoho si projet associé |

**Sorties garanties** :
| Système | Résultat |
|---|---|
| GitHub | Branche `design/penpot-export-{id[:8]}` avec `app/page.tsx`, `components/*.tsx`, `globals.css`, `tailwind.config.ts` |
| Vercel | Preview deploy déclenché sur la branche GitHub |
| ntfy | Notification `neokube-alerts` avec lien branche + URL Vercel |

> **Isolation garantie** : push sur branche feature, jamais sur `main`.

---

### Signalisation Zoho — statuts tâches

| Statut | ID portail | Déclencheur | Signification |
|---|---|---|---|
| `open` | `2114101000000016068` | Création tâche | À traiter — zoho-observer va la détecter |
| `closed` | `2114101000000016071` | `percent_complete=100` | Traité — workflow terminé |

> Pas de statut "In Progress" dans ce portail. Le commentaire 🤖 joue ce rôle.
> Une tâche fermée ne peut pas être réouverte via API (règle portail `CANNOT_OPEN_TASK`).

**Flux signalisation** :
```
[Jalon clôturé dans Zoho par Charles]
  → zoho-observer détecte (scan toutes les 5min)
  → check commentaire 🤖 sur jalon (idempotence)
  → POST leon:8181/mission {intent: milestone_closed, milestone_index, project_id, ...}

[Leon en cours]  ←  commentaire 🤖 sur le jalon = journal de bord

[Leon terminé]
  → commentaire robot sur tâche Zoho + web_url (via zoho-engine, jamais construit manuellement)
  → percent_complete=100 sur les tâches concernées
  → ouverture automatique du jalon suivant (status=1)
  → email Nora → client
```

---

### Gaps — État au 2026-05-12

#### Gap 1 — Trigger "Zoho status → production" ✅ `[résolu 2026-05-12]`

**Implémenté dans zoho-observer v3.0** : boucle C `_project_scan_loop()` (300s) — détecte les projets avec `custom_status_name == "Prêt pour production"`, construit le ProjectSpec via `zoho_to_project_spec()`, déclenche `POST dispatcher/trigger`, marque dispatché par commentaire 🤖 (idempotence cross-redémarrage).

---

#### Gap 2 — Mapper "Zoho project → ProjectSpec" ✅ `[résolu 2026-05-12]`

**Implémenté dans zoho-observer v3.0** : `zoho_to_project_spec(proj)` lit les champs structurés `field: value` dans la description du projet Zoho.

**Convention description Zoho** : une ligne par champ, lisible par un humain et parsable par `_extract_field()` :
```
type: webapp
email: client@company.com
domain: subdomain
domain_name: mon-projet
features: auth, dashboard, api
criteria: Auth fonctionnelle, Dashboard affiché, API répond
```

**Mapping implémenté** :

| Champ ProjectSpec | Source Zoho | Fallback |
|---|---|---|
| `project_id` | `project.id_string` | — |
| `title` | `project.name` | — |
| `objective` | `project.description` (1ère ligne) | `"Voir projet Zoho"` |
| `client_email` | description `email:` | `""` (non-bloquant) |
| `project_type` | description `type:` | `"webapp"` |
| `domain_mode` | description `domain:` | `"subdomain"` |
| `domain_name` | description `domain_name:` | slug from title |
| `acceptance_criteria` | description `criteria:` ou noms des milestones | `[]` |
| `zoho_project_id` | `project.id_string` | — |
| `emitted_at` | timestamp du trigger | — |

---

#### Gap 3 — Email de rapport étape par étape ✅ `[résolu 2026-05-12]`

**Implémenté dans dispatcher v2.0** : `dispatcher_send_client_mail(spec, report)` génère un email HTML avec tableau 7 étapes (Frontend, Backend, Neon, Penpot, Domaine, QA Vera, URL prod). Chaque étape affiche ✅/❌ + lien ou message d'erreur. Un seul email en fin de workflow.

---

### Résumé des priorités (2026-05-12)

| Item | Statut | Commit |
|---|---|---|
| Gap 1 — Trigger Zoho status | ✅ Résolu | `b2da695` |
| Gap 2 — Mapper Zoho → ProjectSpec | ✅ Résolu | `b2da695` |
| Gap 3 — Email enrichi | ✅ Résolu | `b2da695` |

---

