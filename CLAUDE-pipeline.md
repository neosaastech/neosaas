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

**Quand** : Le projet n'existe pas encore (ou est incomplet) — Leon structure le brief.

**Agents principaux** : Leon, Charlotte

| Étape | Agent | Action |
|---|---|---|
| 1 | Leon | Dialogue de clarification (max 10 tours) — extrait title, objective, contraintes, client_email... |
| 2 | Leon | Émet le ProjectSpec JSON (12 champs validés) |
| 3 | Leon | Crée le projet Zoho avec jalons + tasklists + tâches |
| 4 | Charlotte | `project_health_check(update_docs=True)` — croise les liens Zoho ↔ Notion ↔ autres systèmes |

**Sorties** :
- Projet Zoho structuré (jalons, listes, tâches, description avec liens croisés)
- Page Notion créée ou mise à jour avec section "Liens projet"
- ProjectSpec JSON prêt (stocké dans Leon, déclenche la production si `dispatch_project` appelé)

**Conditions de fin de phase** — l'une ou l'autre :

```
[ACTUEL]  Leon appelle dispatch_project() dès que le ProjectSpec est complet
          → passage immédiat en production, sans validation humaine du plan Zoho

[CIBLE]   L'utilisateur revoit le plan dans Zoho PM (jalons, tâches, description)
          → marque le projet "Prêt pour production" (statut custom Zoho)
          → zoho-observer détecte ce statut → construit ProjectSpec → déclenche Dispatcher
```

> **Gap actuel** : dans le flux cible, l'humain a une fenêtre de relecture dans Zoho avant que la production ne démarre. Dans le flux actuel, Leon déclenche immédiatement sans ce cran d'arrêt.

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

### Gaps — Ce qui manque pour le flux cible (2026-05-02)

#### Gap 1 — Trigger "Zoho status → production" `[priorité haute]`

**Problème** : zoho-observer surveille uniquement les projets créés *par Leon* via l'API. Il ne détecte pas les changements de statut sur un projet existant, qu'il ait été créé par Leon ou manuellement.

**Impact** : impossible de lancer la production depuis Zoho PM sans passer par Leon en mode chatbot.

**Solution envisagée** :
```python
# Dans zoho-observer — nouveau poll périodique (ex: toutes les 5 min)
projects = GET /projects/?status=active
for p in projects:
    if p["custom_status_name"] == "Prêt pour production":
        if not already_dispatched(p["id"]):
            spec = zoho_to_project_spec(p)   # → Gap 2
            POST dispatcher/trigger, body=spec
            mark_dispatched(p["id"])          # évite le double-déclenchement
```

---

#### Gap 2 — Mapper "Zoho project → ProjectSpec" `[priorité haute]`

**Problème** : Le ProjectSpec est aujourd'hui construit *uniquement* par Leon via dialogue. Il n'existe pas de fonction qui lit un projet Zoho existant et produit un ProjectSpec valide.

**Impact** : même si Gap 1 est résolu, il n'y a rien pour extraire les 12 champs du projet Zoho.

**Mapping envisagé** :

| Champ ProjectSpec | Source Zoho | Fallback |
|---|---|---|
| `project_id` | `project.id_string` | — |
| `title` | `project.name` | — |
| `objective` | `project.description` (1ère ligne) | `"Voir projet Zoho"` |
| `client_email` | `project.description` (pattern `email:...`) | `""` (non-bloquant) |
| `project_type` | `project.description` (pattern `type:...`) | `"webapp"` |
| `domain_mode` | `project.description` (pattern `domain:...`) | `"subdomain"` |
| `domain_name` | `project.description` (pattern `domain_name:...`) | `""` |
| `acceptance_criteria` | noms des milestones | `[]` |
| `zoho_project_id` | `project.id_string` | — |
| `emitted_at` | timestamp du trigger | — |

> Convention proposée : stocker les champs structurés dans la description Zoho sous forme `champ: valeur` (une par ligne), lisibles par un humain et parsables par le mapper.

---

#### Gap 3 — Email de rapport étape par étape `[priorité basse]`

**Problème** : Un seul email est envoyé en fin de workflow (étape 7). L'utilisateur ne sait pas ce qui s'est passé pendant les 5-10 minutes de build.

**Impact** : aucune visibilité en temps réel sur l'avancement (Aria ✅ ? Vera ❌ ?).

**Solution envisagée** : Email récapitulatif enrichi à l'étape 7 qui liste toutes les étapes franchies avec leur statut, construit à partir du Temporal workflow history ou d'un dict d'étapes accumulé dans le workflow context. Pas d'emails intermédiaires (spam) — un seul email complet.

```
Objet : ✅ Projet {title} — déploiement terminé

Étapes franchies :
  ✅ Aria  — repo frontend créé : github.com/neomnia/{slug}-frontend
  ✅ Nox   — repo backend + branche Neon : {endpoint_host}
  ✅ Penpot — design initialisé : {penpot_url}
  ✅ Domi  — domaine provisionné : {slug}.neomnia.net
  ✅ Vera  — QA approuvée (0 issue bloquante)
  ✅ Deploy — URL live : https://{slug}.neomnia.net
```

---

### Résumé des priorités (2026-05-02)

| Item | Effort | Valeur | Priorité |
|---|---|---|---|
| Gap 1 — Trigger Zoho status | Moyen (zoho-observer + poll) | Haute — enlève la dépendance au chatbot Leon | **P1** |
| Gap 2 — Mapper Zoho → ProjectSpec | Moyen (fonction pure, testable) | Haute — condition sine qua non du Gap 1 | **P1** |
| Gap 3 — Email enrichi | Faible (Dispatcher étape 7) | Moyenne — meilleure UX mais non bloquant | **P3** |

---

