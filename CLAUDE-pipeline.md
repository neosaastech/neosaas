## Cycle de vie d'un projet — Planification → Production

Cette section est la référence pour comprendre à quel moment un projet passe de la planification à la production, quels agents interviennent à chaque phase, et ce qui manque pour atteindre le flux cible (Zoho-driven).

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
| 5 | Leon → Dispatcher | Après "oui" → `dispatch_project(...)` + créer/mettre à jour Zoho |

**Sous-mode TASK** (nouveau projet) :
| Étape | Agent | Action |
|---|---|---|
| 1 | Leon | Q0 — "Avez-vous une page Notion ?" (URL=lire / 'non'=créer) |
| 2 | Leon | CLARIFYING Charlotte pattern — 1 question par tour (LLM gère l'état) |
| 3 | Leon | ProjectSpec validé → `dispatch_project(...)` |
| 4 | Charlotte | `project_health_check(update_docs=True)` — croise Zoho ↔ Notion ↔ autres systèmes |

**Sorties** :
- ProjectSpec conforme aux normes Neomnia (Next.js App Router, Radix UI, Tailwind v4…)
- Page Notion mise à jour avec section "ProjectSpec corrigé"
- Projet Zoho structuré (après validation utilisateur)

**Validation obligatoire** : Leon ne dispatche jamais sans confirmation explicite de l'utilisateur sur le ProjectSpec Notion.

**Cran d'arrêt Zoho (flux cible)** : L'utilisateur peut aussi marquer le projet "Prêt pour production" dans Zoho PM → zoho-observer détecte → déclenche Dispatcher automatiquement (sans passer par Leon).

---

### Phase 3 — Production

**Quand** : `POST /trigger` reçu par Dispatcher (depuis Leon, Charlotte, ou zoho-observer).

**Agent principal** : Dispatcher + Aria + Nox + Penpot + Domi + Vera

| Étape | Agent | Action | Durée max | Bloquant |
|---|---|---|---|---|
| 1 | Dispatcher | `validate_spec` — vérifie les 12 champs obligatoires | 30 s | Oui |
| 2 | Aria | GitHub repo frontend (template-nextjs) + Vercel project | 300 s | **Oui** |
| 2 | Nox | GitHub repo backend (template-fastapi) + Neon branch | 300 s | **Oui** |
| 2 | Penpot | Projet Penpot + duplication fichier template | 300 s | Non |
| 2 | Domi | Provision domaine (subdomain `{slug}.neomnia.net` ou achat) | 300 s | Non |
| 3 | Vera | QA review — acceptance criteria + artefacts Aria/Nox/Penpot | 120 s | **Oui** |
| 4 | Charlotte | Notification approbation humaine (Temporal signal) | 30 s | — |
| 5 | — | Approbation humaine (24h max) | 24 h | **Oui** |
| 6 | Dispatcher | Deploy Vercel + `domi_link_vercel_domain` | 120 s | Oui |
| 7 | Dispatcher | `write_pm_decisions` + `zoho_callback` + `send_client_mail` | 30 s | Non |

**Sorties garanties en fin de workflow** :

| Système | Résultat |
|---|---|
| GitHub | 2 repos créés : `neomnia/{slug}-frontend` + `neomnia/{slug}-backend` |
| Vercel | Projet déployé, domaine `{slug}.neomnia.net` lié |
| Neon | Branche créée sur NeoBridge (`neon_branch_id` + `neon_endpoint_host`) |
| Penpot | Projet design initialisé (template dupliqué) |
| Email | Envoyé à `spec.client_email` avec liens GitHub/Vercel/Penpot |
| Zoho | Commentaire sur la tâche + lien Penpot |
| Qdrant | Décision archivée dans `pm-decisions` (768-dim, recherche sémantique) |

---

### Phase 3b — Design Penpot → Code → GitHub → Vercel

**Quand** : L'utilisateur (ou Charlotte) souhaite transposer un projet Penpot existant en code Next.js et le pousser sur GitHub/Vercel.

**Déclencheur** : Charlotte appelle `dispatch_design_deploy(penpot_project_id="<uuid>")` → `POST dispatcher:8484/trigger-penpot`.

**Agent principal** : Dispatcher (`PenpotToVercelWorkflow`) + Aria v2.0

| Étape | Agent | Action | Activité Temporal |
|---|---|---|---|
| 1 | Aria | Exporte les fichiers du projet Penpot via penpot-connector | `aria_export_penpot` |
| 2 | Aria | Génère les composants Next.js via LLM (codestral) à partir du design brief | `aria_generate_nextjs` |
| 3 | Aria | Push les fichiers sur branche `design/penpot-export-{id[:8]}` (GitHub) | `aria_push_to_github` |
| 4 | Dispatcher | Redéploiement Vercel (vercel-connector) — preview deploy sur la branche | Direct HTTP |
| 5 | Dispatcher | Notification ntfy mission-done | — |

**Paramètres** (`POST /trigger-penpot`) :
```json
{
  "penpot_project_id": "<uuid>",         // obligatoire
  "vercel_project_name": "<slug>",        // optionnel — Dispatcher le déduit
  "repo_name": "<slug>-frontend"          // optionnel — Dispatcher le déduit
}
```

**Sorties garanties** :
| Système | Résultat |
|---|---|
| GitHub | Branche `design/penpot-export-{id[:8]}` avec `app/page.tsx`, `components/*.tsx`, `globals.css`, `tailwind.config.ts` |
| Vercel | Preview deploy déclenché sur la branche GitHub |
| ntfy | Notification `neokube-alerts` avec lien branche + URL Vercel |

> **Isolation garantie** : push sur branche feature, jamais sur `main`. La merge vers main reste un acte humain délibéré.

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
[Open + tag @agent]
  → zoho-observer détecte (scan toutes les 2min)
  → check commentaire 🤖 (idempotence cross-redémarrage)
  → dispatch workflow + commentaire détaillé (agent, workflow_id, timestamp)

[Workflow en cours]  ←  commentaire 🤖 = journal de bord

[Workflow terminé]
  → dispatcher_zoho_callback : commentaire résultat + percent_complete=100
  → [Closed]
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

