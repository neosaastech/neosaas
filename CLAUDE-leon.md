## Leon — Chef de Production NeoKube

> **Extensions** : Méthodologie gestion de projet, normes Neomnia, templates CDC, règles interview client : **[CLAUDE-leon-process.md](CLAUDE-leon-process.md)**
> **Limite** : ce fichier ≤ 1000 lignes. Tout développement méthodologique → `CLAUDE-leon-process.md`.

Leon est le Chef de Production de l'écosystème NeoKube. Il est le point d'entrée pour toute mission métier (scraping, développement, gestion de projet) et orchestre une équipe de sous-agents spécialisés. Il **ne fait pas le travail lui-même** — il cadre, dispatche, et supervise.

---

### Sources de vérité — Hiérarchie obligatoire

Leon ne hardcode aucune valeur métier. Toute connaissance provient d'une source externe. Ordre de consultation :

| Priorité | Source | Contenu | Quand l'utiliser |
|---|---|---|---|
| **1 — Notion** | `notion_read_page(url)` | **Les ordres** : CDC client, charte graphique, cahier des charges rédactionnel, brief validé | Toujours en premier — c'est ce que le client/management a validé |
| **2 — RAG interne** | `zoho_pm_insights` · `qdrant_search_leon` · docs NeoKube (`CLAUDE-agents.md` etc.) | Connaissance métier Neomnia + architecture technique NeoKube + doc Zoho officielle FR | Pour comprendre et valider (normes, patterns, structure Zoho) |
| **3 — Zoho Projects** | `zoho_list_milestones` · `zoho_api` sur le projet template | **Le carnet de process** : structure de gestion appliquée (jalons, tasklists du template projet Neomnia) | Pour scaffolder un nouveau projet — lire le template Zoho de référence, pas inventer |
| **4 — SurfSense** | `surfsense_search(query)` | Données fraîches externes en temps réel (normes web, librairies, actualité technique) | Quand le RAG interne ne contient pas la réponse — pour compléter, jamais pour remplacer Notion |
| **5 — Scraping (Charlotte)** | Délégation via `delegate_sre_task` ou ntfy | Campagnes d'apprentissage : ingère de nouvelles données dans le RAG | Quand SurfSense ne suffit pas et qu'il faut alimenter durablement le RAG |

**Règle de priorité** : une information dans Notion prime toujours sur le RAG, qui prime sur SurfSense. Leon ne demande jamais à l'utilisateur ce qu'il peut trouver dans ses sources.

**Zoho template de référence** : Leon doit lire le projet Zoho template (ID à définir dans la ConfigMap `ZOHO_TEMPLATE_PROJECT_ID`) pour en extraire la structure (jalons + tasklists) avant de scaffolder un nouveau projet. Ne jamais inventer la structure — la lire.

> Architecture complète Leon ↔ Zoho : **[§Architecture Leon ↔ Zoho](#architecture-leon--zoho--comment-leon-parle-à-zoho)** · Connectors : **[CLAUDE-connector.md](CLAUDE-connector.md)**

---

### Rôle et périmètre

| Périmètre Leon | Hors périmètre Leon |
|---|---|
| Clarification des besoins métier | Exécution technique directe (code, infra) |
| Création et structuration du ProjectSpec | Surveillance cluster K8s (→ Charlotte) |
| Dispatch vers sous-agents spécialisés | Déploiements Vercel (→ Aria via Dispatcher) |
| Suivi Zoho Projects (jalons, tâches) | Requêtes SQL directes (→ Nox) |
| Communication client (via Nora) | Design Penpot (→ Zephyr → Penpot agent) |
| Cohérence Zoho ↔ GitHub ↔ Vercel | — |

Leon **ne délègue jamais à Charlotte** — Charlotte est SRE cluster et n'interagit pas avec le pipeline métier. La délégation inverse existe (Charlotte → Leon via `delegate_sre_task` pour les alertes métier).

---

### Équipe — Sous-agents orchestrés par Leon

| Agent | Rôle | Spécialité | Port | Statut |
|---|---|---|---|---|
| **Aria** | Frontend Builder | Next.js + Vercel + Penpot export | 8485 | actif v3.0 (GitHub MCP) |
| **Milo** | Data/Scraping Specialist | Collecte web, pipelines data, volumétrie | 8491 | **actif v1.0** |
| **Zephyr** | UX/Design Strategist | Audit UX, wireframes, guidelines, interface Penpot | 8492 | **actif v2.0** |
| **Nora** | Account Manager / Client | Communication client, comptes-rendus, suivi satisfaction | 8493 | **actif v1.0** |
| **Nox** | Backend Builder | FastAPI + Neon — appelé via Dispatcher | 8486 | actif v3.0 |
| **Dispatcher** | Orchestrateur pipeline | DevProjectWorkflow complet (Aria+Nox+Penpot+Domi+Vera) | 8484 | actif v2.0 |

**Principe de délégation** : Leon interroge le sous-agent approprié via `POST /mission` (HTTP simple, sans Temporal). Temporal est réservé aux workflows longs (DevProjectWorkflow via Dispatcher).

---

### Machine d'états — Cycle de vie d'une mission

```
[INTAKE]
  Utilisateur envoie une demande
  → Leon identifie le type de mission
  → Si mission connue et complète → READY_TO_DISPATCH
  → Sinon → CLARIFYING

[CLARIFYING]
  Leon pose les questions manquantes (max 3 tours)
  → Compte les tours dans session_state["clarif_turns"]
  → Au tour 3 : synthèse des réponses + demande confirmation
  → Après confirmation utilisateur → READY_TO_DISPATCH

[READY_TO_DISPATCH]
  ProjectSpec validé (7 champs minimum)
  → Leon appelle dispatch_project() ou route vers Milo/Zephyr/Nora
  → Suit le résultat via Zoho (commentaire 🤖) ou réponse directe
```

**Règle absolue** : `dispatch_project` ne peut être appelé qu'en état `READY_TO_DISPATCH`. En `INTAKE` ou `CLARIFYING`, Leon répond avec des questions, jamais avec un plan inventé.

---

### ProjectSpec — 7 champs obligatoires

```json
{
  "project_id":           "uuid-généré-par-leon",
  "title":                "Nom court du projet",
  "objective":            "Ce que le projet doit accomplir",
  "project_type":         "webapp | scraping | automation | design | internal",
  "acceptance_criteria":  ["critère 1 vérifiable", "critère 2 vérifiable"],
  "emitted_at":           "2026-05-15T14:30:00Z",
  "clarification_turns":  2
}
```

**Champs optionnels enrichis** :

```json
{
  "client_email":   "client@company.com",
  "domain_mode":    "subdomain | custom",
  "domain_name":    "mon-projet",
  "constraints":    "proxies requis, budget 50€/mois, deadline 2026-06-01",
  "assigned_agent": "milo | zephyr | nora | dispatcher"
}
```

Le champ `assigned_agent` détermine la route de dispatch après validation du spec.

---

### Routing — À qui dispatcher ?

| Type de mission | Agent cible | Outil Leon |
|---|---|---|
| Développement web complet (front+back+deploy) | Dispatcher → Aria+Nox | `dispatch_project(project_type="webapp")` |
| Scraping / collecte data / pipeline | Milo | `POST milo:8491/mission` |
| UX audit / wireframes / guidelines design | Zephyr | `POST zephyr:8492/mission` |
| Communication client / compte-rendu | Nora | `POST nora:8493/mission` |
| Frontend seul (si projet Penpot existant) | Aria via Charlotte | `dispatch_design_deploy(penpot_project_id)` |

**Leon ne code jamais lui-même** — il cadre et route.

---

### Pattern d'orchestration — AutoGen Choreography

Leon utilise un pattern de **chorégraphie légère** (pas de chef d'orchestre centralisé) :

```python
# Exemple : mission de scraping avec brief UX et rapport client
async def _handle_scraping_mission(spec, session_id):
    # 1. Zephyr : audit UX de la source cible
    ux_brief = await _delegate("zephyr", {
        "mission": f"Audit UX de {spec['source_url']} — identifier structure navigation et données"
    })

    # 2. Milo : collecte avec le brief UX comme contexte
    scraping_result = await _delegate("milo", {
        "mission": spec["objective"],
        "ux_context": ux_brief["summary"],
        "constraints": spec.get("constraints", ""),
    })

    # 3. Nora : rapport client
    await _delegate("nora", {
        "mission": "Rédiger un compte-rendu de mission scraping",
        "results": scraping_result["summary"],
        "client_email": spec.get("client_email", ""),
    })
```

**Règle** : les agents communiquent uniquement via Leon — ils ne se parlent pas directement. Leon est le seul à connaître le contexte global.

---

### Architecture Leon ↔ Zoho — Comment Leon parle à Zoho

**Règle fondamentale** : Leon ne parle **jamais** directement à l'API Zoho. Tout passe par le `zoho-connector` via `POST /proxy`.

```
Leon (agent-system)
    │
    └── POST http://zoho-connector.connector-system.svc.cluster.local:8000/proxy
              body: {"method": "GET|POST|PUT|DELETE", "path": "/projects/...", "data": {...}}
              │
              └── zoho-connector (port 8000)
                      ├── Gère OAuth2 (refresh token auto via Vault secret/neokube/infrastructure/zoho)
                      ├── Injecte le portal ID dans les chemins (/portal/neomniadotnet/...)
                      ├── Normalise les réponses (_inject_web_urls)
                      └── → api.zoho.com (Zoho Projects API v3)
```

**Variable d'env** : `ZOHO_CONNECTOR_URL = "http://zoho-connector.connector-system.svc.cluster.local:8000"` (défaut hardcodé si absent du ConfigMap)

**`leon_zoho_refresh_token` est un no-op** — il retourne `""`. L'authentification OAuth2 est entièrement gérée par le connector. Leon ne manipule aucun token Zoho.

#### Patterns de chemins API Zoho

Le connector injecte automatiquement le portal ID (`neomniadotnet`). Leon utilise des chemins relatifs :

| Opération | Méthode | Chemin |
|---|---|---|
| Lister projets | GET | `/projects/` |
| Créer projet | POST | `/projects/` |
| Supprimer projet | DELETE | `/projects/{project_id}/` |
| Lister tâches | GET | `/projects/{project_id}/tasks/` |
| Créer tâche | POST | `/projects/{project_id}/tasks/` |
| Mettre à jour tâche | POST | `/projects/{project_id}/tasks/{task_id}/` |
| Supprimer tâche | DELETE | `/projects/{project_id}/tasks/{task_id}/` |
| Lister milestones | GET | `/projects/{project_id}/milestones/` |
| Créer milestone | POST | `/projects/{project_id}/milestones/` |
| Supprimer milestone | DELETE | `/projects/{project_id}/milestones/{milestone_id}/` |
| Créer tasklist | POST | `/projects/{project_id}/tasklists/` |
| Lister tasklists | GET | `/projects/{project_id}/tasklists/` |

#### Outils Zoho — Architecture en couches

```
Outils dédiés (shortcuts)          zoho_api (proxy générique)
─────────────────────────          ──────────────────────────
zoho_list_projects                 Tout endpoint non couvert :
zoho_list_tasks(project_id)          templates de projet
zoho_create_task(...)                sous-projets (parent_id)
zoho_update_task(...)                custom fields
zoho_create_milestone(...)           budgets
zoho_create_tasklist(...)            membres équipe (users)
zoho_scaffold_project(...)           tags / labels
zoho_delete_project(...)             rapports
zoho_delete_task(...)                fichiers attachés
zoho_delete_milestone(...)           commentaires
zoho_list_milestones(project_id)     timesheet entries
                │                           │
                └───────────────────────────┘
                        ZOHO_CONNECTOR_URL/proxy
```

#### Pattern d'usage `zoho_api`

Quand une opération n'est pas couverte par un outil dédié :

1. `zoho_pm_insights("comment créer un sous-projet")` → trouve le bon endpoint + paramètres dans la doc officielle Zoho (collection `zoho-knowledge`, 267 chunks)
2. `zoho_api(method="POST", path="/projects/{id}/tasks/", data={...})` → exécute l'appel

**Ne jamais ajouter un nouvel outil dédié** si `zoho_api` peut couvrir le cas. Les outils dédiés existent uniquement pour les opérations à très haute fréquence qui bénéficient d'un formatage spécifique de la réponse (ex: `zoho_list_tasks` retourne une liste normalisée, pas le JSON brut Zoho).

#### Règles R1–R5 connecteurs (CLAUDE-connector.md)

> **R1** — Un connector = source de vérité unique pour son API. Credentials, URL de base, headers : tout appartient au connector.
> **R2** — Enrichir à la sortie (`_inject_web_urls` dans zoho-connector). Leon ne construit jamais d'URLs Zoho manuellement.
> **R3** — Toujours utiliser `/proxy {method, path, data?}`.

---

### Polling Zoho — Lecture des projets (SREScanWorkflow-inspired)

Leon intègre une boucle de surveillance inspirée de `SREScanWorkflow` de Charlotte :

```python
# Toutes les 5 min — boucle C du script Leon
async def _zoho_project_scan_loop():
    while True:
        projects = await _zoho_list_projects()
        for proj in projects:
            if proj.get("custom_status_name") == "En attente Leon":
                # Construit un brief depuis la description Zoho
                brief = _zoho_to_brief(proj)
                # Lance une session de clarification ou dispatch direct
                await _handle_zoho_triggered_mission(brief)
        await asyncio.sleep(300)
```

**Convention description Zoho** pour déclencher Leon :
```
agent: leon
type: scraping | webapp | design | automation
email: client@company.com
brief: description courte en une ligne
```

Leon détecte `agent: leon` dans la description, extrait le brief, et démarre la phase CLARIFYING (ou READY_TO_DISPATCH si tous les champs sont présents).

---

### Routing conversationnel — Pattern A (classificateur LLM)

Leon utilise un classificateur LLM (antipattern #40 — jamais de string matching) :

```python
_LEON_INTENT_LABELS = ("greeting", "check_agents", "question", "task", "review")

async def _classify_message_leon(msg: str) -> str:
    # LLM_SCAN_MODEL (mistral, ~500ms, max 10 tokens)
    # → un label parmi les 5 ci-dessus, "task" par défaut
```

| Label | Comportement | Mécanisme |
|---|---|---|
| `greeting` | Fast-path conv 1-2 phrases | Déterministe (pas de LLM) |
| `check_agents` | Pré-exécute `check_sub_agents` en Python, injecte résultat | Pattern A — résultat injecté dans le message user |
| `question` | Fast-path conv 3 points max | LLM direct, pas d'outil |
| `task` | ReAct loop CLARIFYING→READY, 1 question par tour | `run_agent()` + `_sanitize_clarifying()` |
| `review` | Analyse documentaire exhaustive — lit Notion + RAG norms | `run_agent(initial_model=LLM_SECONDARY)` — Claude Sonnet, pas de _sanitize |

**Principe clé** (Pattern A) : pour `check_agents`, l'outil est pré-exécuté **avant** le LLM, et le résultat est injecté dans le message. Mistral ne peut pas ignorer un résultat déjà dans le contexte.

### Deux modes de conversation — REVIEW vs TASK

Leon distingue deux types de sessions en cours de projet :

| Mode | Déclencheur | Comportement | Modèle |
|---|---|---|---|
| **TASK** (nouveau projet) | verbe d'action, pas d'URL Notion | CLARIFYING Charlotte pattern : `run_agent()` + `_sanitize_clarifying()` — 1 question par tour → dispatch | `LLM_MODEL` (gpt-4o) |
| **REVIEW** (révision doc) | URL Notion présente, "revoir"/"analyser"/"rédiger"/"corriger les normes" | Orchestration déterministe Python — LLM génère le spec text, Python écrit dans Notion | `LLM_SECONDARY` (claude-sonnet) |

**Principe REVIEW** : le LLM ne *décide* pas des appels d'outils — Python contrôle la séquence. Le LLM génère uniquement le texte du spec. Élimine les hallucinations "je ne peux pas accéder à Notion".

**`_sanitize_clarifying` exemption** (mode TASK) : si `surfsense_search`, `notion_read_page` ou `notion_update_page` sont dans les sources, la réponse est une analyse légitime — elle passe sans troncature.

---

### Meta-calls OWU — Fast-path obligatoire

Open WebUI envoie des meta-calls que Leon ne doit pas traiter dans sa ReAct loop :

```python
_OWU_META_PREFIXES = [
    "### Task: Suggest",      # génération follow-ups
    "### Task: Generate",     # titre / tags
    "Create a concise",       # résumé
]

if any(message.strip().startswith(p) for p in _OWU_META_PREFIXES):
    # Fast-path : réponse LLM directe, pas de stockage Zoho/Qdrant
    return await _llm_call_fast(message, model=LLM_SCAN_MODEL, max_tokens=300)
```

---

### Profil LLM — Règle R9

| Variable | Valeur | Usage |
|---|---|---|
| `LLM_MODEL` | `gpt-4o` | Conversations, clarifications, analyse ProjectSpec (TASK) |
| `LLM_MODEL_REASONING` | `mistral` | Bascule automatique si 401/quota sur gpt-4o |
| `LLM_SCAN_MODEL` | `mistral` | Meta-calls OWU, classification intent, fast-path |
| `LLM_SECONDARY` | `claude-sonnet` | Mode REVIEW — analyse documentaire Notion + normes (large context) |

**Pas de Temporal pour la couche conversationnelle** — Temporal seulement pour `dispatch_project` (DevProjectWorkflow long).

---

### Anti-patterns Leon spécifiques

| # | Piège | Règle |
|---|---|---|
| L1 | Inventer volume/workers/délais | Ne jamais générer de chiffres non fournis par l'utilisateur |
| L2 | Appeler `dispatch_project` sans clarification | État INTAKE ou CLARIFYING → questions d'abord |
| L3 | Générer un plan complet au premier message | La phase CLARIFYING EST le livrable du premier tour |
| L4 | Déléguer à Charlotte pour des missions métier | Charlotte = SRE cluster uniquement |
| L5 | Appeler Milo/Zephyr/Nora avant que le spec soit validé | Sous-agents reçoivent un spec complet, jamais un brief flou |
| L6 | Confondre `dispatch_project` (Dispatcher) et `_delegate` (Milo/Zephyr/Nora) | `dispatch_project` = pipeline GitHub+Vercel+Neon. `_delegate` = tâche spécialisée |
| L7 | Stocker la session dans Qdrant (OWU meta-calls) | Meta-calls → fast-path sans persistance |
| L8 | Laisser le LLM décider d'appeler un outil d'écriture (Notion, Zoho) | Pour les workflows déterministes (REVIEW), Python appelle l'outil directement — le LLM génère uniquement le texte. Évite les hallucinations "je ne peux pas accéder à X". |
| L9 | Demander une validation UI avant de dispatcher vers Zoho | Les agents actent et rapportent — pas de bouton de confirmation, pas de page intermédiaire. `_find_zoho_project()` + `_zoho_sync()` s'exécutent inline dans la réponse REVIEW. Voir Règle R-TAR. |

---

### Format de réponse Leon

Leon répond en JSON structuré, parsé par Open WebUI :

```json
{
  "summary": "Résumé Markdown (tableaux Markdown pour les listes)",
  "business_impact": "Quel service client est impacté ? Gravité ? Urgence ?",
  "actions": ["action exécutée 1", "action exécutée 2"],
  "next_steps": ["étape suivante 1", "étape suivante 2"],
  "coherence_alerts": ["alerte si détectée — sinon []"],
  "session_state": {
    "phase": "CLARIFYING",
    "clarif_turns": 1,
    "missing_fields": ["volume", "format_sortie"]
  }
}
```

Le champ `session_state` est interne — il n'est pas affiché à l'utilisateur, mais permet à Leon de tracker la phase entre les tours.

---

### Checklist — Création de Milo / Zephyr / Nora

Chaque nouveau sous-agent suit la checklist standard (CLAUDE-agents.md §Checklist intégration) + spécificités Leon :

1. **Interface HTTP** : `POST /mission {message, context?}` → réponse JSON (+ `/v1/chat/completions` OWU-compatible)
2. **Pas de Temporal** : agents conversationnels légers, pas de long workflow
3. **Port assigné** : Milo=8491, Zephyr=8492, Nora=8493
4. **Namespace** : `agent-system`
5. **LiteLLM key** : créer `sk-milo` / `sk-zephyr` / `sk-nora` dans LiteLLM + Vault
6. **Langfuse** : prompt + dataset + scoring (tag `agent:milo`)
7. **Leon ConfigMap** : ajouter `MILO_URL`, `ZEPHYR_URL`, `NORA_URL` dans `configmap-leon.yaml`
8. **Pas de connectors partagés** : chaque sous-agent accède aux connectors dont il a besoin (Milo → crawlee-connector, Zephyr → penpot-connector)

---

### Workflow documentaire — Cycle de vie d'un projet

Deux modes selon le contexte :

**Mode REVIEW** (URL Notion fournie — orchestration Python déterministe) :
```
Python: notion_read_page(url)           ← lecture directe
Python: surfsense_search("normes...")   ← 2 recherches normes
LLM:    génère spec text (texte pur, aucun tool call)
Python: notion_update_page(url, spec)   ← écriture directe, SANS décision LLM
        ou fallback notion_create_page()
Python: _find_zoho_project(title)       ← matching sémantique sur projets actifs
        → trouvé : lien projet existant
        → absent : dispatch_zoho() → create_project + milestones + tasks
Réponse: spec + lien Notion + lien Zoho  ← tout en une seule réponse, aucune confirmation
```

**Règle trans-agentique — "Agit et rapporte"** (R-TAR) : les agents ne demandent pas de validation avant d'agir sur des systèmes tiers (Zoho, Notion, GitHub…). Ils agissent, puis incluent le lien du résultat directement dans leur réponse. La seule exception admise : les actions destructives irréversibles (suppression de données).

**Mode TASK** (nouveau projet — Charlotte pattern) :
```
INTAKE (brief utilisateur)
  ↓
Q0 — "Avez-vous une page Notion ?"
  → URL : notion_read_page() → contenu injecté
  → 'non' : notion_create_page()
  ↓
CLARIFYING 1 question/tour (run_agent + _sanitize_clarifying)
  ↓
DISPATCH → Zephyr / Milo / Nora / Dispatcher
```

**SurfSense** : compte `leon@neokube.fr` (Editor) — accès à :
- `[1] Neomnia Studio` — 2670 documents (production, chartes, projets)
- `[2] Infrastructure NeoKube` — 17 documents (cluster, infra)

Credentials dans `secret/neokube/agents/leon` (Vault) + K8s secret `leon-surfsense-secrets`.

---

### Règle — Connaissances techniques vs process

Leon a des **compétences techniques** pour piloter les projets (comprendre une stack, valider une architecture, détecter des incohérences). Mais il ne hardcode aucune **valeur de process** (quelle stack utiliser, quels jalons créer, quelles tasklists).

| Ce que Leon sait faire | Source de la connaissance |
|---|---|
| Comprendre et valider une stack technique | `surfsense_search("normes [domaine] Neomnia")` — normes en vigueur dans SurfSense |
| Détecter une divergence avec les normes | `surfsense_search` + analyse du contenu Notion |
| Structurer un projet Zoho (jalons, tasklists) | `zoho_pm_insights(query)` — doc officielle Zoho Projects FR |
| Créer un projet avec la bonne structure | `zoho_scaffold_project(name, ..., milestones=[...])` — structure issue du CDC Notion ou RAG |

**Règle** : si Leon modifie sa méthode → on met à jour SurfSense (normes Neomnia) ou le template CDC Notion. On ne touche pas au code de Leon.

> Voir architecture complète : **[CLAUDE-leon.md §Architecture Leon ↔ Zoho](CLAUDE-leon.md)** · **[CLAUDE-connector.md](CLAUDE-connector.md)**

---

### Gaps — État au 2026-05-16

| Item | Statut | Notes |
|---|---|---|
| Phase CLARIFYING — questions avant dispatch | ✅ Code | Charlotte pattern — `run_agent()` + `_sanitize_clarifying()` |
| Session state machine (INTAKE/CLARIFYING/READY) | ✅ Code | Tracking via historique multi-turn |
| Meta-calls OWU fast-path | ✅ Code | `### Task:` → fast-path direct |
| Multi-turn natif (historique complet) | ✅ Code | `run_agent(history=)` |
| `_delegate()` helper HTTP | ✅ Code | vers Milo/Zephyr/Nora + ConnectError gracieux |
| Classificateur LLM d'intent (Pattern A) | ✅ Code | `_classify_message_leon()` — 5 labels |
| Mode REVIEW — orchestration déterministe | ✅ Code | Python lit Notion+normes → LLM génère spec → Python écrit Notion (sans décision LLM) |
| Auto-dispatch Zoho après REVIEW | ✅ Code | `_find_zoho_project()` matching sémantique + `_zoho_sync()` create/link inline — lien dans la réponse |
| Anti-hallucination "je ne peux pas accéder à Notion" | ✅ Code | LLM ne voit jamais l'outil notion_update_page — Python l'appelle directement |
| Cascade LLM R9 (REVIEW : claude-sonnet→gpt-4o→mistral) | ✅ Code | 401/quota → bascule automatique sur modèle suivant |
| `_sanitize_clarifying` exemption analyse | ✅ Code | surfsense_search / notion_read_page / notion_update_page dans sources → passe intacte |
| Dispatch déterministe post-CLARIFYING | ✅ Code | design→Zephyr, scraping→Milo, comms→Nora, webapp→Dispatcher |
| `notion_read_page` | ✅ Code | Lit une page Notion via URL/ID — résumé Mistral |
| `notion_create_page` | ✅ Code | Crée une page projet dans Notion |
| `surfsense_search` | ✅ Code | Recherche sémantique Neomnia Studio (2670+ docs) |
| Q0 Notion obligatoire | ✅ Code | Toutes missions — URL=lire / 'non'=créer |
| Milo — Data/Scraping agent | ✅ Déployé | Port 8491 — actif v1.0 |
| Zephyr — UX/Design agent | ✅ Déployé | Port 8492 — actif v2.0 |
| Nora — Account Manager agent | ✅ Déployé | Port 8493 — actif v1.0 |
| `zoho_api` proxy générique | ✅ Code + déployé | Activity `leon_zoho_api` → `ZOHO_CONNECTOR_URL/proxy`. Pattern : `zoho_pm_insights` → endpoint → `zoho_api`. |
| Polling Zoho `agent: leon` | ❌ À implémenter | Boucle C à ajouter dans `leon.py` |
