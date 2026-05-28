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

**Templates process** : Leon dispose d'un index de 7 types de projets (Website vitrine, NeoSaaS RH/Agences/Formation/CRM, Agent Métier, RAG) avec les structures milestones+tasklists correspondantes, extraites des pages Notion process. Lors du scaffolding Zoho (ÉTAPE 5), Leon sélectionne le template approprié depuis le system prompt — jamais d'improvisation. URLs Notion dans `## TEMPLATES PROCESS NEOMNIA` du configmap.

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

**Règle fondamentale** : Leon ne parle **jamais** directement à l'API Zoho. Tout passe par `zoho-engine` v2.0 (K8s service name: `zoho-connector`, port 8000).

```
Leon (agent-system)
    │
    ├── POST .../proxy               body: {method, path, data?}              ← API générique (lister, tâches, milestones, etc.)
    ├── POST .../scaffold            body: ScaffoldReq                         ← Création projet complet + jalons (1 appel atomique)
    ├── POST .../delete-projects     body: {project_ids: [...]}               ← Suppression contrôlée (confirmed gate obligatoire)
    ├── POST .../milestone.delete    body: {project_id, milestone_id}         ← Supprimer un jalon (⚠️ completion via REST impossible — voir anti-pattern #53)
    ├── POST .../project.status      body: {project_id, status}               ← active|completed|archived
    └── POST .../task.update         body: {project_id, task_id, ...}         ← statut/assigné/priorité/échéance
              │
              └── zoho-engine v2.0 (port 8000)
                      ├── Gère OAuth2 : creds cache 10min Vault + token cache 3min + retry x3 backoff
                      ├── _zoho_call() : 429 Retry-After + retry 5xx automatique
                      ├── Injecte le portal ID dans les chemins (/portal/neomniadotnet/...)
                      ├── Normalise les réponses (_inject_web_urls)
                      ├── Guard 403 sur DELETE /projects/ en masse (protection anti-reset)
                      ├── _normalize_milestone_payload() — source de vérité unique (owner, flag, start_date)
                      └── → api.zoho.com (Zoho Projects API v3)
```

**`ScaffoldReq` — paramètres `/scaffold`** :

| Champ | Type | Défaut | Description |
|---|---|---|---|
| `name` | str | — | Nom du projet (obligatoire) |
| `description` | str | `""` | Objectifs + résumé CDC Notion |
| `milestones` | list | `[]` | `[{name, flag?, start?, end?}]` — structure issue de Notion |
| `end_date` | str | aucun | Date de fin projet (optionnel — YYYY-MM-DD) |
| `template_id` | str | `""` | ID template Zoho (optionnel) |
| `group_id` | str | `""` | ID portfolio/groupe (optionnel) |
| `public` | bool | `True` | Visibilité client (défaut public) |

**Flags milestone** : `"internal"` (jalons équipe) · `"external"` (jalons client visible) — aliases `"start"→"internal"`, `"end"→"external"` acceptés.
**`owner`** : injecté par le connector depuis `ZOHO_OWNER_ID` (jamais passé par Leon).

**Variable d'env** : `ZOHO_CONNECTOR_URL = "http://zoho-connector.connector-system.svc.cluster.local:8000"` (défaut hardcodé si absent du ConfigMap)

**`leon_zoho_refresh_token` est un no-op** — il retourne `""`. L'authentification OAuth2 est entièrement gérée par le connector. Leon ne manipule aucun token Zoho.

#### Patterns de chemins API Zoho

Le connector injecte automatiquement le portal ID (`neomniadotnet`). Leon utilise des chemins relatifs :

| Opération | Méthode | Chemin |
|---|---|---|
| Lister projets | GET | `/projects/` |
| Créer projet | POST | `/projects/` |
| Supprimer projet(s) | POST | `/delete-projects` (endpoint dédié — voir §Protocole suppression) |
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
Outils dédiés (shortcuts)                  zoho_api (proxy générique)
─────────────────────────                  ──────────────────────────
zoho_list_projects                         Tout endpoint non couvert :
zoho_list_tasks(project_id)                  templates de projet
zoho_create_task(...)                        sous-projets (parent_id)
zoho_update_task(...)                        custom fields
zoho_create_milestone(...)                   budgets
zoho_create_tasklist(...)                    membres équipe (users)
zoho_scaffold_project(...)                   tags / labels
zoho_delete_projects(ids, confirmed)         rapports      ← /delete-projects (confirmed gate)
zoho_delete_task(...)                        fichiers attachés
zoho_delete_milestone(...)                   commentaires
zoho_list_milestones(project_id)             timesheet entries
                │                                   │
                └───────────────────────────────────┘
                  zoho-connector: /proxy · /scaffold · /delete-projects
```

#### Protocole suppression — RÈGLE OBLIGATOIRE

Avant toute suppression de projet Zoho, Leon **doit** suivre le protocole en 3 étapes :

1. Appeler `zoho_list_projects` → présenter la liste complète à l'utilisateur
2. Obtenir une confirmation explicite projet par projet (jamais de suppression globale "tout effacer")
3. Appeler `zoho_delete_projects(project_ids=[...], confirmed=True)` — le `confirmed=True` est le gate logiciel

**Guard outil** : si `confirmed=False` (ou absent), l'outil retourne une erreur et ne passe pas au connector.
**Guard connector** : `DELETE /projects/` en masse → HTTP 403 — refus systématique, indépendamment de l'agent.
**Demande de suppression globale** = refus catégorique. Leon présente la liste et demande une sélection.

#### Pattern d'usage `zoho_api`

Quand une opération n'est pas couverte par un outil dédié :

1. `zoho_pm_insights("comment créer un sous-projet")` → trouve le bon endpoint + paramètres dans la doc officielle Zoho (collection `zoho-knowledge`, 267 chunks)
2. `zoho_api(method="POST", path="/projects/{id}/tasks/", data={...})` → exécute l'appel

**Ne jamais ajouter un nouvel outil dédié** si `zoho_api` peut couvrir le cas. Les outils dédiés existent uniquement pour les opérations à très haute fréquence qui bénéficient d'un formatage spécifique de la réponse (ex: `zoho_list_tasks` retourne une liste normalisée, pas le JSON brut Zoho).

#### Règles R1–R6 connecteurs (CLAUDE-connector.md)

> **R1** — Un connector = source de vérité unique pour son API. Credentials, URL de base, headers : tout appartient au connector.
> **R2** — Enrichir à la sortie (`_inject_web_urls` dans zoho-connector). Leon ne construit jamais d'URLs Zoho manuellement.
> **R3** — Utiliser l'endpoint approprié : `/proxy` pour les appels génériques, `/scaffold` pour la création projet complète, `/delete-projects` pour les suppressions.
> **R6** — Les règles API (normalisation, guards, defaults) sont codées dans le connector. L'agent exprime l'intent sémantique uniquement. Jamais de règle business dans l'agent.

---

### Templates Process Neomnia — Index des structures Zoho

Leon dispose d'un index de templates dans son system prompt (`## TEMPLATES PROCESS NEOMNIA`).
Lors de la création d'un projet Zoho (ÉTAPE 5), Leon identifie le type et utilise la structure milestones+tasklists correspondante — jamais d'improvisation.

| Type | Durée | Jalons (milestones) |
|---|---|---|
| Website vitrine | Variable | Phase 1 Brief & Collecte → Phase 2 Design → Phase 3 Développement → Phase 4 Recette → Phase 5 Go Live |
| NeoSaaS RH | 10j | Phase 0 Brief → Phase 1 Setup → Phase 2 Build (6 tasklists) → Phase 3 Recette → Phase 4 Go Live |
| NeoSaaS Agences | 7j | Phase 0 Brief → Phase 1 Setup → Phase 2 Build (4 tasklists) → Phase 3 Recette → Phase 4 Go Live |
| NeoSaaS Formation | 10j | Phase 0 Brief → Phase 1 Setup → Phase 2 Build (5 tasklists) → Phase 3 Recette → Phase 4 Go Live |
| NeoSaaS CRM générique | 7j | Phase 0 Brief → Phase 1 Setup → Phase 2 Build (3 tasklists) → Phase 3 Recette → Phase 4 Go Live |
| Agent Métier NeoKube | 2j | Jour 1 Matin AgentSpec → Jour 1 PM Build → Jour 2 Matin Validation → Jour 2 PM Livraison |
| RAG Data / Sécurité | 2j | Setup RAG → Indexation → Livraison |

**Règle de sélection** : RH/congés → NeoSaaS RH · CRM/leads/agence → NeoSaaS Agences · OF/Qualiopi → NeoSaaS Formation · SaaS générique → NeoSaaS CRM · Agent IA client → Agent Métier · Site web → Website vitrine.

**Source de vérité** : les structures sont extraites depuis les pages Notion process (URLs dans le configmap). Si une structure évolue dans Notion, mettre à jour le configmap Leon via Claude Code.

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
_LEON_INTENT_LABELS = ("greeting", "check_agents", "reflection", "question",
                        "task", "review", "rag_mission", "audit")

async def _classify_message_leon(msg: str, history=None) -> str:
    # R9.13 — cascade interactive : LLM_CLASSIFY_MODEL (claude-sonnet) → LLM_CLASSIFY_FALLBACK (gpt-4o) → LLM_MODEL_REASONING (mistral)
    # LLM_SCAN_MODEL (mistral) = réservé aux scans Temporal background, jamais à la classification interactive
    # → un label parmi les 8 ci-dessus, "task" par défaut
```

#### Intents globaux (applicables à tout agent conversationnel)

| Label | Comportement | Mécanisme |
|---|---|---|
| `greeting` | Fast-path conv 1-2 phrases | Déterministe — pas de LLM |
| `question` | Fast-path conv 3 points max | LLM direct, pas d'outil |
| `reflection` | Vérifie une action passée ("as-tu bien créé…") | Réponse directe oui/non — pas de CLARIFYING |
| `check_agents` | Pré-exécute `check_sub_agents`, injecte résultat | Pattern A — outil appelé avant le LLM |

#### Intents spécifiques Leon

| Label | Comportement | Mécanisme |
|---|---|---|
| `task` | ReAct loop CLARIFYING→READY, 1 question par tour | `run_agent()` + `_sanitize_clarifying()` |
| `review` | Révision documentaire CDC Notion — LLM génère spec, Python écrit | `run_agent(initial_model=LLM_SECONDARY)` — pas de `_sanitize` |
| `rag_mission` | Indexation/enrichissement collection Qdrant | Handler dédié `_rag_execute()` |
| `audit` | Inspection complète projet 3 axes (normes+Zoho+doc) → corrections automatiques | `run_agent(system_prompt=AUDIT_SYSTEM_PROMPT, audit_mode=True)` — pas de `_sanitize`. MAD : pre-load `qdrant_search_leon` (audits passés) + post-store résultat |

**Principe clé** (Pattern A) : pour `check_agents`, l'outil est pré-exécuté **avant** le LLM, et le résultat est injecté dans le message. Le LLM ne peut pas ignorer un résultat déjà dans le contexte.

---

### Checklist — Ajout d'un nouvel intent

> **Règle** : un intent mal intégré crashe silencieusement ou retourne du HTML. Suivre cette checklist dans l'ordre.

**Fichiers à modifier** : `configmap-leon-script.yaml` uniquement (sauf ajout ConfigMap env).

#### 1. Label

```python
# Ligne ~3080
_LEON_INTENT_LABELS = (..., "mon_intent")
```

#### 2. Classifier — description sémantique

Dans `_classify_message_leon`, section `system_prompt` :

```
"- mon_intent : description précise des déclencheurs sémantiques. "
"  ≠ autres_labels : distinguer explicitement des labels proches.\n"
```

#### 3. `_history` — disponible avant le routage

`_history` est défini juste avant `_history_for_classifier` (ligne ~4679). Il est disponible dans tous les handlers d'intent. **Ne pas le redéfinir dans le handler.**

#### 4. Handler — template streaming + non-streaming

```python
# Insérer AVANT le bloc "# ── task →" (ligne ~5440)
if intent == "mon_intent":
    if req.stream:
        async def _monintent_gen():
            import json as _j
            _rid, _now = msg_id, int(time.time())
            def _rc(t):
                return f"data: {_j.dumps({'id': _rid, 'object': 'chat.completion.chunk', 'created': _now, 'model': 'leon', 'choices': [{'index': 0, 'delta': {'content': t}, 'finish_reason': None}]})}\n\n"
            yield f"data: {_j.dumps({'id': _rid, 'object': 'chat.completion.chunk', 'created': _now, 'model': 'leon', 'choices': [{'index': 0, 'delta': {'role': 'assistant'}, 'finish_reason': None}]})}\n\n"
            yield _rc("> 💬 **Léon** — en cours...\n")
            _pq: asyncio.Queue = asyncio.Queue()
            _t = asyncio.create_task(
                run_agent(user_msg, history=_history, _progress_q=_pq,
                          initial_model=LLM_MODEL)   # ou LLM_SECONDARY si analyse lourde
            )
            while not _t.done():
                try:
                    yield _rc(await asyncio.wait_for(_pq.get(), timeout=0.15))
                except asyncio.TimeoutError:
                    pass
            while not _pq.empty():
                yield _rc(await _pq.get())
            try:
                _r = _t.result()
                _s = _r.get("response") or _r.get("summary") or _r.get("message") or _r.get("result", "")
                if isinstance(_s, dict):
                    _s = _j.dumps(_s, ensure_ascii=False)[:2000]
                _src = set(_r.get("_meta", {}).get("sources", []))
                _skip = _r.get("_meta", {}).get("audit_mode", False)  # True si bypass sanitize
                _raw = str(_s)[:6000] if _s else "Mission terminée."
                _c = "\n\n" + (_raw if _skip else _sanitize_clarifying(_raw, _src))
            except Exception as _te:
                _c = f"\n\n❌ Erreur : {_te}"
            for _i, _w in enumerate(_c.split(' ')):
                yield _rc(_w if _i == len(_c.split(' ')) - 1 else _w + ' ')
                await asyncio.sleep(0.008)
            yield f"data: {_j.dumps({'id': _rid, 'object': 'chat.completion.chunk', 'created': _now, 'model': 'leon', 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\ndata: [DONE]\n\n"
        return StreamingResponse(_monintent_gen(), media_type="text/event-stream")
    # Non-streaming
    try:
        _res = await asyncio.wait_for(
            run_agent(user_msg, history=_history, initial_model=LLM_MODEL),
            timeout=240.0,
        )
        _s = _res.get("response") or _res.get("summary") or _res.get("message") or _res.get("result", "")
        if isinstance(_s, dict):
            _s = json.dumps(_s, ensure_ascii=False)[:2000]
        _src = set(_res.get("_meta", {}).get("sources", []))
        _raw = str(_s)[:6000] if _s else "Mission terminée."
        content = _raw if _res.get("_meta", {}).get("audit_mode") else _sanitize_clarifying(_raw, _src)
    except asyncio.TimeoutError:
        content = "⏱️ Timeout."
    except Exception as _e:
        content = f"❌ Erreur : {_e}"
    return {"id": msg_id, "object": "chat.completion", "created": int(time.time()), "model": "leon",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}}
```

#### 5. `_sanitize_clarifying` — choix explicite

| Intent | Passer par `_sanitize_clarifying` ? | Raison |
|---|---|---|
| `task` | ✅ Oui | Forcer 1 question par tour en CLARIFYING |
| `review` | ❌ Non | Réponse documentaire exhaustive légitime |
| `audit` | ❌ Non (`audit_mode=True`) | Cycle complet sans troncature |
| `rag_mission` | ❌ Non | Réponse de mission complète |
| Nouvel intent action | Selon nature | Clarification itérative → oui ; cycle complet → non |

#### 5b. Vérifier les noms de fonctions avant de les appeler

```bash
# Toute fonction réutilisée depuis le script doit être vérifiée par grep AVANT le code
grep -n "^    async def\|^    def" apps/agent-system/base/configmap-leon-script.yaml | grep "mot_clé"
```

Ne jamais supposer un nom de fonction — l'inventaire exact : `qdrant_search_leon`, `qdrant_learn_from_review`, `qdrant_upsert`, `_embed`, `surfsense_search`, `_llm_secondary`.

#### 6. Validation avant déploiement

```bash
# Valider la syntaxe Python extraite du YAML
python3 -c "
content = open('apps/agent-system/base/configmap-leon-script.yaml').read()
lines = content.split('\n')
py_lines = []
in_script = False
for line in lines:
    if line.strip().startswith('leon.py: |'):
        in_script = True; continue
    if in_script:
        if line and not line.startswith('    ') and line.strip(): break
        py_lines.append(line[4:] if line.startswith('    ') else line)
compile('\n'.join(py_lines), 'leon.py', 'exec')
print('OK')
"

# Déployer (fichier >262KB → replace obligatoire, anti-pattern #17)
kubectl replace -f apps/agent-system/base/configmap-leon-script.yaml
kubectl rollout restart deployment/leon -n agent-system
kubectl rollout status deployment/leon -n agent-system --timeout=120s
```

#### 7. Gotchas YAML+Python

| Piège | Règle |
|---|---|
| Triple-quote `"""` dans une string longue | Utiliser une concaténation de strings `("ligne1\n" "ligne2\n")` — les lignes de contenu à 0 indentation terminent le bloc YAML littéral |
| Contenu multi-ligne dans le CM | Toutes les lignes Python doivent être à **4 espaces** dans le YAML |
| Variable définie plus bas dans le handler | Vérifier que la variable est définie AVANT le premier `if intent ==` — `_history` est maintenant défini ligne ~4679 |

### Deux modes de conversation — REVIEW vs TASK

Leon distingue deux types de sessions en cours de projet :

| Mode | Déclencheur | Comportement | Modèle |
|---|---|---|---|
| **TASK** (nouveau projet) | verbe d'action, pas d'URL Notion | CLARIFYING Charlotte pattern : `run_agent()` + `_sanitize_clarifying()` — 1 question par tour → dispatch | `LLM_MODEL` (gpt-4o) |
| **REVIEW** (révision doc) | URL Notion présente, "revoir"/"analyser"/"rédiger"/"corriger les normes" | Orchestration déterministe Python — LLM génère le spec text, Python écrit dans Notion | `LLM_SECONDARY` (claude-sonnet) |

**Principe REVIEW** : le LLM ne *décide* pas des appels d'outils — Python contrôle la séquence. Le LLM génère uniquement le texte du spec. Élimine les hallucinations "je ne peux pas accéder à Notion".

**`_sanitize_clarifying` exemption** (mode TASK) : si `surfsense_search`, `notion_read_page` ou `notion_update_page` sont dans les sources, la réponse est une analyse légitime — elle passe sans troncature.

---

### MODE AUDIT — Structure AUDIT_SYSTEM_PROMPT

L'intent `audit` déclenche `run_agent` avec `AUDIT_SYSTEM_PROMPT` (remplace `SYSTEM_PROMPT`) et `audit_mode=True` (bypass `_sanitize_clarifying`). MAD intégré : pre-load `qdrant_search_leon("audit {projet}")` avant l'appel, post-store résultat dans `leon-memory` après.

#### Règle d'or : contraintes de format EN TÊTE du prompt

Les LLMs ignorent les instructions de format en fin de prompt au profit de leur format par défaut ("Recommandations"). `AUDIT_SYSTEM_PROMPT` commence par `## RÈGLES DE SORTIE — ABSOLUES` avant toute description de tâche.

#### Phases obligatoires

| Phase | Outils appelés | Notes |
|---|---|---|
| **1 — Identification** | `zoho_list_projects` (si besoin) | Extraire project_id + TYPE (infra/webapp/design...) |
| **2 — Contexte** | `surfsense_search`, `notion_search`, `notion_read_page`, `analyze_project_coherence` | Normes Neomnia + CDC Notion |
| **3 — État Zoho complet** | `zoho_list_milestones`, `zoho_list_tasks`, `zoho_project_status` | + `cluster_status` si TYPE=INFRA |
| **4 — Analyse** | — | Patterns A/B/C → anomalies CRITIQUE/MINEUR/INFO |
| **5 — Exécution** | `zoho_update_task`, `zoho_delete_milestone`, `zoho_delete_task` | Étapes A (non-destructif) → B (liste destructif) → C (question oui/non) |

#### Trois patterns de détection (Phase 4)

**Pattern A — TYPE-MISMATCH JALONS**
Jalons dont le nom ne correspond pas au type du projet. Pour INFRA : "Analyse des besoins", "Analyse et Préparation", "Développement et Intégration", "Frontend", "Design", "Recette", "Spécification" → CRITIQUE.
Matching par **présence de mot-clé** dans le nom (pas correspondance exacte).

**Pattern B — HORS-PORTÉE ET DOUBLONS**
- B1 : tâche référençant un autre projet dans son nom ("site-vitrine", "[E2E-", "Page vitrine"…) → CRITIQUE
- B2 : plusieurs tâches avec le même nom exact → DOUBLON CRITIQUE, conserver une seule

**Pattern C — TÂCHES DONE-MAIS-OPEN**
Pour projets INFRA : croiser les tâches Open avec `cluster_status` (Phase 3). Si le nom de la tâche contient un composant visible dans `cluster_status` (namespace, deployment, service) → done-mais-open → fermer directement (Étape A, sans confirmation).
Si `cluster_status` indisponible → passer sans bloquer.

#### Séquence Phase 5 (Exécution)

```
Étape A : zoho_update_task(status=closed) pour TOUTES les tâches Pattern C → afficher "✅ Fermé : [nom]"
Étape B : lister les éléments destructifs restants → "🔴 [nom] — raison"  (Pattern A jalons + Pattern B tâches)
Étape C : DERNIÈRE LIGNE = "Confirmes-tu la suppression de X jalons et Y tâches listés ci-dessus ? (oui/non)"
```

**INTERDIT** : "Prochaines étapes recommandées", "Actions recommandées", "Étapes suivantes" → action non exécutée.
**La confirmation utilisateur "oui/non"** est traitée par le SYSTEM_PROMPT normal (pas AUDIT_SYSTEM_PROMPT) — le format post-confirmation peut différer, c'est attendu.

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
| `LLM_MODEL_REASONING` | `mistral` | Bascule automatique si 401/quota sur gpt-4o (dernier recours) |
| `LLM_SCAN_MODEL` | `mistral` | Meta-calls OWU fast-path + scans Temporal background uniquement |
| `LLM_CLASSIFY_MODEL` | `claude-sonnet` | Classification intent interactive — R9.13 (1er de la cascade) |
| `LLM_CLASSIFY_FALLBACK` | `gpt-4o` | Fallback cascade R9.13 si claude-sonnet quota épuisé |
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
| L10 | Instructions de format AUDIT_SYSTEM_PROMPT ignorées si en fin de prompt | Les LLMs suivent les instructions en tête de prompt. `## RÈGLES DE SORTIE — ABSOLUES` doit être la **première section** du prompt, avant toute description de mission. Symptôme : gpt-4o produit "Prochaines étapes recommandées" malgré l'instruction "INTERDIT". |
| L11 | Pattern C (done-mais-open) détecte 0 tâches sans état cluster réel | L'heuristique "verbe au début du nom" échoue si les noms de tâches ne commencent pas par un verbe. Seul `cluster_status` (Phase 3) permet une détection fiable pour les projets INFRA : composant dans le nom de tâche + composant visible dans `cluster_status` = done. |
| L12 | IDs Zoho perdus entre Phase 3 et Phase 5 — suppressions "not found" | Le LLM ne porte pas fiablement des IDs numériques sur 5 phases de raisonnement. Solution : re-fetcher `zoho_list_milestones` + `zoho_list_tasks` APRÈS confirmation "oui", puis chercher TOUTES les occurrences par nom et supprimer chaque ID trouvé. Même nom = plusieurs IDs = plusieurs suppressions nécessaires. |

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
| Classificateur LLM d'intent (Pattern A) | ✅ Code | `_classify_message_leon()` — 8 labels (greeting/check_agents/reflection/question/task/review/rag_mission/audit) |
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
| Intent `audit` — inspection 3 axes + corrections auto | ✅ Code | `AUDIT_SYSTEM_PROMPT` + `audit_mode=True` + MAD pre-load/post-store. Patterns A/B/C. `cluster_status` Phase 3 pour INFRA. |
| R9.13 — cascade classify LLM interactive | ✅ Code | `LLM_CLASSIFY_MODEL=claude-sonnet` → `LLM_CLASSIFY_FALLBACK=gpt-4o` → `LLM_MODEL_REASONING=mistral` |
| Polling Zoho `agent: leon` | ❌ À implémenter | Boucle C à ajouter dans `leon.py` |
