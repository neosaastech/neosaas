## Leon — Chef de Production NeoKube

Leon est le Chef de Production de l'écosystème NeoKube. Il est le point d'entrée pour toute mission métier (scraping, développement, gestion de projet) et orchestre une équipe de sous-agents spécialisés. Il **ne fait pas le travail lui-même** — il cadre, dispatche, et supervise.

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
| **Zephyr** | UX/Design Strategist | Audit UX, wireframes, guidelines, interface Penpot | 8492 | **actif v1.0** |
| **Nora** | Account Manager / Client | Communication client, comptes-rendus, suivi satisfaction | 8493 | **actif v1.0** |
| **Nox** | Backend Builder | FastAPI + Neon — appelé via Dispatcher | actif v3.0 |
| **Dispatcher** | Orchestrateur pipeline | DevProjectWorkflow complet (Aria+Nox+Penpot+Domi+Vera) | actif v2.0 |

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
| Scraping / collecte data / pipeline | Milo | `POST milo:8490/mission` |
| UX audit / wireframes / guidelines design | Zephyr | `POST zephyr:8491/mission` |
| Communication client / compte-rendu | Nora | `POST nora:8492/mission` |
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
_LEON_INTENT_LABELS = ("greeting", "check_agents", "question", "task")

async def _classify_message_leon(msg: str) -> str:
    # LLM_SCAN_MODEL (mistral, ~500ms, max 10 tokens)
    # → un label parmi les 4 ci-dessus, "task" par défaut
```

| Label | Comportement | Mécanisme |
|---|---|---|
| `greeting` | Fast-path conv 1-2 phrases | LLM direct, pas d'outil |
| `check_agents` | Pré-exécute `check_sub_agents` en Python, injecte résultat | Pattern A — résultat injecté dans le message user |
| `question` | Fast-path conv 3 points max | LLM direct, pas d'outil |
| `task` | ReAct loop complet (CLARIFYING → READY) | `run_agent()` avec historique |

**Principe clé** (Pattern A) : pour `check_agents`, l'outil est pré-exécuté **avant** le LLM, et le résultat est injecté dans le message. Mistral ne peut pas ignorer un résultat déjà dans le contexte.

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
| `LLM_MODEL` | `mistral-large-2407` | Conversations, clarifications, analyse ProjectSpec |
| `LLM_SCAN_MODEL` | `mistral` | Meta-calls OWU, classification intent, fast-path |
| `LLM_SECONDARY` | `claude-sonnet` | Escalade si clarification complexe (ambiguïté métier) |
| `LLM_FALLBACK` | `gpt-4o` | Si Mistral indisponible |

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

Avant tout dispatch, Leon s'assure que le projet est documenté dans Notion :

```
INTAKE (brief utilisateur)
  ↓
Q0 — "Avez-vous une page Notion ?" (obligatoire, Q0 de chaque type de mission)
  → URL Notion : notion_read_page() → contenu injecté dans le brief
  → 'non'      : notion_create_page() → page créée, URL retournée
  ↓
CLARIFYING (questions type-spécifiques Q1-Qn)
  ↓
SURFSENSE (contexte doc si pertinent — Leon peut appeler surfsense_search())
  ↓
DISPATCH → Zephyr / Milo / Nora / Dispatcher (avec brief enrichi)
```

**SurfSense** : compte `leon@neokube.fr` (Editor) — accès à :
- `[1] Neomnia Studio` — 2670 documents (production, chartes, projets)
- `[2] Infrastructure NeoKube` — 17 documents (cluster, infra)

Credentials dans `secret/neokube/agents/leon` (Vault) + K8s secret `leon-surfsense-secrets`.

---

### Gaps — État au 2026-05-15

| Item | Statut | Notes |
|---|---|---|
| Phase CLARIFYING — questions avant dispatch | ✅ Code | Déterministe — questions hardcodées par type |
| Session state machine (INTAKE/CLARIFYING/READY) | ✅ Code | Tracking via historique multi-turn |
| Meta-calls OWU fast-path | ✅ Code | `### Task:` → fast-path direct |
| Multi-turn natif (historique complet) | ✅ Code | `run_agent(history=)` |
| `_delegate()` helper HTTP | ✅ Code | vers Milo/Zephyr/Nora + ConnectError gracieux |
| Classificateur LLM d'intent (Pattern A) | ✅ Code | `_classify_message_leon()` — 4 labels |
| Dispatch déterministe post-CLARIFYING | ✅ Code | design→Zephyr, scraping→Milo, comms→Nora, webapp→Dispatcher |
| `notion_read_page` | ✅ Code | Lit une page Notion via URL/ID — résumé Mistral |
| `notion_create_page` | ✅ Code | Crée une page projet dans Notion |
| `surfsense_search` | ✅ Code | Recherche sémantique Neomnia Studio (2670 docs) |
| Q0 Notion obligatoire | ✅ Code | Toutes missions — URL=lire / 'non'=créer |
| Milo — Data/Scraping agent | ✅ Déployé | Port 8491 — actif v1.0 |
| Zephyr — UX/Design agent | ✅ Déployé | Port 8492 — actif v1.0 |
| Nora — Account Manager agent | ✅ Déployé | Port 8493 — actif v1.0 |
| Polling Zoho `agent: leon` | ❌ À implémenter | Boucle C à ajouter dans `leon.py` |
