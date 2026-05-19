# CLAUDE-create-agent.md — Guide complet création d'agent NeoKube

> Référence canonique pour la création d'agents. Charlotte utilise ce fichier pour
> conduire l'interview, choisir l'architecture et déclencher le provisioning.

---

## 1. Les 4 types d'agents NeoKube

### Type 1 — Conversationnel OWU-facing

L'utilisateur interagit directement via Open WebUI. Requis : `/v1/chat/completions` +
streaming token-by-token + `/v1/models` + auto-enregistrement OWU au démarrage.

Deux variantes d'architecture NLU (compréhension des messages) :

#### Pattern A — Compréhension large (PydanticAI + FallbackModel)

> Référence : **Charlotte SRE v4.0**

| Élément | Détail |
|---|---|
| **NLU** | Classificateur sémantique LLM 5 classes (`_classify_message`) — jamais de string matching |
| **Classes intent** | `greeting` · `question` · `task` · `access_zoho` · `access_cluster` (adapter au domaine) |
| **Loop** | PydanticAI `Agent.run()` — ReAct natif, pas de boucle manuelle |
| **LLM** | `FallbackModel(primary, secondary, fallback)` — bascule automatique sur quota épuisé |
| **Streaming** | Tokens réels via `_llm_call_stream` — jamais un seul chunk (antipattern #28) |
| **Outils visibles** | `_tool_emit(name)` à chaque appel d'outil (OWU affiche l'activité) |
| **Heartbeat** | Événement `{"type":"heartbeat"}` toutes les 1.5s pendant la réflexion |

**Quand choisir Pattern A :**
- Agent avec 10+ outils ou actions sur des systèmes multiples
- Missions complexes nécessitant un raisonnement multi-étapes
- Besoin d'une compréhension robuste de formulations variées ("restart le pod X", "redémarre X", "X crashe fixe-le")

#### Pattern B — Compréhension par mots-clés (OpenAI-compat)

> Référence : **Neo** (`_TOOL_KW`) · **Leon** (`_LEON_KW`)

| Élément | Détail |
|---|---|
| **NLU** | Set `_AGENT_KW` de mots-clés métier — détection sur la 1re ligne du dernier message |
| **Fast-path** | Si `not needs_tools` → LiteLLM direct `stream=True`, system prompt minimal |
| **Agent-path** | Loop custom ou appels LiteLLM séquentiels, réponse streamée mot-par-mot |
| **Streaming** | Fast-path : LiteLLM `stream=True` transparent. Agent-path : `_stream_reply_words()` |
| **Endpoint** | `/v1/chat/completions` standard OpenAI-compat |

**Quand choisir Pattern B :**
- Agent spécialisé sur un domaine précis (Zoho, GitHub, design…)
- Vocabulaire métier stable et prévisible
- Moins de 6-8 outils, missions relativement linéaires

**Règles `_AGENT_KW` :**
- Mots-clés métier uniquement — jamais de noms propres (risque de match sur salutations)
- Tester uniquement la première ligne du dernier message utilisateur
- Ne jamais tester l'historique complet

---

### Type 2 — Service HTTP Interne

| Caractéristique | Valeur |
|---|---|
| **Interface** | API REST FastAPI, endpoints métier spécifiques |
| **Exposition** | Interne cluster uniquement — pas d'OWU, pas de streaming |
| **Appel** | Par d'autres agents (Charlotte, Leon, Dispatcher) via HTTP |
| **Exemples** | `admin-sys` (kubectl exécution), connectors (zoho, github, vercel…) |

**Endpoints minimaux :** `GET /health` + endpoints métier (`POST /execute`, `POST /proxy`, etc.)

---

### Type 3 — Worker Temporal

| Caractéristique | Valeur |
|---|---|
| **Interface** | `@workflow.defn` + `@activity.defn` Temporal |
| **Durée** | Workflows longue durée (minutes à heures), retry automatique |
| **Orchestration** | Lancé par Dispatcher ou Charlotte via `POST /trigger` |
| **Exemples** | Aria (frontend), Nox (backend), Vera (QA), Penpot (design), Domi (DNS) |
| **Namespace Temporal** | `dispatcher` (agents pipeline métier) · `sre-charlotte` (Charlotte) |

**Quand choisir Type 3 :**
- Traitement multi-étapes séquentiel avec possibilité d'échec partiel
- Opérations longues (GitHub push + Vercel deploy + Neon branch = 3-10 min)
- Besoin de signaux (`approve` / `reject`) ou de queries (état du workflow)

---

### Type 4 — Hybride FastAPI + Temporal

| Caractéristique | Valeur |
|---|---|
| **Interface** | FastAPI (triggers + OWU) + Worker Temporal (traitement long) |
| **Exemples** | Leon (FastAPI OWU-facing + Temporal dispatch), Charlotte (FastAPI missions + Temporal SRE) |

**Quand choisir Type 4 :**
- Agent interactif qui délègue des sous-tâches longues à Temporal
- Besoin d'une interface conversationnelle ET de workflows durables

---

## 2. Interview obligatoire — 7 questions procédurales

Charlotte **doit** conduire cet interview avant tout `create_agent()`. Les questions non
renseignées par l'utilisateur sont posées via `ask_clarification`.

### Q1 — Nom / identifiant

- Slug lowercase, unique dans le cluster
- Convention : court, évocateur du rôle (ex: `felix`, `orion`, `mila`)
- Vérifier que le nom n'est pas déjà dans le registre (`GET /agents`)

### Q2 — Missions et capacités

- Description complète du rôle : que fait cet agent ? quelles décisions prend-il ?
- Outils nécessaires : Zoho, GitHub, Notion, Qdrant, K8s, API externe ?
- Volume d'interactions prévu : quelques fois/jour ou en continu ?

### Q3 — Contexte : interne ou client

| Réponse | Implications |
|---|---|
| **Interne NeoKube/Neomnia** | `extra=""`, namespace = nom de l'agent, pas de rattachement projet |
| **Client (lequel ?)** | `extra="client: <nom>, projet: <Zoho>"`, namespace à décider, potentiel Zoho task de suivi |

Si pour un client : demander le nom du client et le projet Zoho associé.

### Q4 — Type d'architecture

Présenter les options avec justification :

| Option | Cas d'usage | Exemple |
|---|---|---|
| **Conversationnel OWU — Pattern A** (compréhension large) | Missions complexes, 10+ outils, formulations variées | Charlotte |
| **Conversationnel OWU — Pattern B** (mots-clés métier) | Domaine précis, vocabulaire stable, 6-8 outils max | Neo, Leon |
| **Service HTTP interne** | Appelé par d'autres agents, pas d'interaction humaine directe | admin-sys |
| **Worker Temporal** | Workflows longs, multi-étapes, orchestration | Aria, Nox |
| **Hybride FastAPI + Temporal** | Interface conversationnelle + tâches longues déléguées | Leon, Charlotte |

Si l'utilisateur dit "interactif" sans préciser → proposer Pattern B par défaut (plus simple), Pattern A si beaucoup d'outils annoncés.

### Q5 — Modèle LLM

| Modèle | Recommandé pour |
|---|---|
| `mistral` | Généraliste, économique, ops quotidiennes |
| `claude-sonnet` | Raisonnement complexe, missions critiques |
| `codestral` | Code, revue, génération technique |
| `gpt-4o` | Raisonnement structuré, QA, analyse |
| `mistral-large-2407` | QA approfondie, validation |

Pour Pattern A : suggérer `claude-sonnet` (primary) + `mistral` (fallback via FallbackModel).
Pour Pattern B : suggérer `mistral` ou `mistral-large-2407`.

### Q6 — Connectors (microservices)

Quels connecteurs l'agent utilisera-t-il pour accéder aux systèmes externes ?

Tous les connectors sont dans le namespace `connector-system` et exposent `POST /proxy {path, body}`.
L'agent les appelle via leur URL interne cluster.

| Connector | Port | Accès | Exemple d'usage |
|---|---|---|---|
| `zoho` | 8000 | CRM, Projects, Tickets | Créer tâches Zoho, lire projets |
| `github` | 8001 | Repos, PRs, Issues | Pousser code, créer branches |
| `vercel` | 8002 | Déploiements, projets | Déclencher deploys, lire logs |
| `neon` | 8003 | Bases de données PostgreSQL | Créer branches, exécuter queries |
| `penpot` | 8004 | Design, projets Penpot | Créer fichiers design |
| `openprovider` | 8005 | Registrar domaines | Vérifier dispo, acheter domaines |
| `cloudflare` | 8006 | DNS, tunnels, analytics | Créer CNAMEs, gérer tunnel |
| `stalwart` | 8007 | Email SMTP | Envoyer emails depuis agents |
| `google-discovery` | 8008 | Google APIs | — |
| `crawlee` | 8009 | Scraping web | Crawler, extraire contenu |
| `dataforseo` | 8010 | SEO, keywords, SERP | Analyse SEO, mots-clés |

**MCP servers** (couche préférée pour opérations complexes) :
- `github-mcp` (`:8080/mcp` streamable-http) — Aria, Nox, Dispatcher
- `k8s-mcp` (`agent-system:8080/mcp`) — Charlotte uniquement

Passer la liste comme `connectors="zoho,github"` (virgule-séparé). Si aucun → `""`.

### Q7 — Sidecars de sécurité

Faut-il injecter les sidecars `tool-validator` + `output-guard` dans le pod ?

| Sidecar | Port | Rôle |
|---|---|---|
| `tool-validator` | 8090 | Valide chaque appel outil vs `agent-policies.json` avant exécution |
| `output-guard` | 8091 | Filtre et audit les sorties agent avant émission SSE |

**Règle de décision** :
- `sidecars_enabled=True` si : agent OWU-facing + accès connectors sensibles (zoho, github, vercel, neon)
- `sidecars_enabled=False` (défaut) si : service HTTP interne, agent de test, pas d'accès systèmes critiques

Les sidecars lisent leurs configs depuis :
- `ConfigMap sidecar-scripts` (namespace `agent-system`) — code Python tool_validator.py + output_guard.py
- `ConfigMap agent-policies` (namespace `agent-system`) — policies.json (entrée ajoutée automatiquement)

---

## 3. Arbre de décision

```
Demande de création d'agent
    │
    ├─ Q3: Interne ou client ?
    │      └─ Si client → noter client + projet Zoho dans extra
    │
    ├─ Q4: Type d'architecture ?
    │      │
    │      ├─ OWU interactif
    │      │      ├─ Beaucoup d'outils / missions complexes → Pattern A (PydanticAI)
    │      │      └─ Domaine ciblé / vocabulaire stable   → Pattern B (OpenAI-compat)
    │      │
    │      ├─ Service interne → FastAPI simple, runtime="fastapi", pas d'OWU
    │      │
    │      └─ Workflows longs → Temporal, runtime="temporal"
    │             └─ + interface humaine → Hybride (FastAPI + Temporal)
    │
    ├─ Q6: Connectors nécessaires ?
    │      └─ Liste CSV → connectors="zoho,github,vercel"
    │         Aucun    → connectors=""
    │
    ├─ Q7: Sidecars de sécurité ?
    │      └─ OWU + connectors sensibles → sidecars_enabled=True
    │         Service interne / test     → sidecars_enabled=False
    │
    └─ → Résumé → Confirmation → create_agent()
```

---

## 4. Ce que `CreateAgentWorkflow` génère automatiquement

| Étape | Artefact produit |
|---|---|
| `sre_write_agent_spec` | `apps/agent-catalog/{name}.yaml` — AgentSpec complet (connectors + sidecars inclus) |
| `sre_provision_vault_secrets` | Chemin Vault `secret/neokube/apps/{name}` avec placeholders |
| `sre_create_litellm_key` | Clé virtuelle LiteLLM `/key/generate`, stockée Vault |
| `sre_provision_k8s_resources` | Namespace · SA · RBAC · ConfigMap config · Deployment (avec sidecars si activés) · Service |
| `sre_generate_agent_code` | `configmap-{name}-script.yaml` — FastAPI minimal (`/health` + `/v1/chat/completions`) |
| `sre_provision_policy` | Entrée `agent-policies.json` pour l'agent (allowed tools depuis connectors) |
| `sre_register_agent` | `configmap-agent-registry.yaml` mis à jour |
| `sre_register_openwebui_pipe` | Pipe Open WebUI (Functions) |
| `sre_register_openwebui_connection` | Connexion OpenAI-compat Open WebUI (Models) |
| `sre_push_langfuse_score` | Trace Langfuse `agent_created` |

**Code généré** : FastAPI minimal — Pattern B basique. Pour Pattern A (PydanticAI), Pattern B avancé,
ou Worker Temporal : code métier à compléter manuellement après provisioning.

**Sidecars injectés automatiquement** si `sidecars_enabled=True` : le Deployment inclut
`tool-validator` (8090) + `output-guard` (8091), montant `sidecar-scripts` + `agent-policies`
depuis les ConfigMaps du namespace `agent-system`.

---

## 5. Ce que Charlotte ne génère PAS (développement manuel requis)

| Élément | Raison | Référence |
|---|---|---|
| Classificateur LLM 5 classes (Pattern A) | Spécifique au domaine — `_classify_message` à implémenter | CLAUDE-agents.md §6d |
| `FallbackModel` PydanticAI (Pattern A) | Choix de la cascade LLM selon les modèles réservés | CLAUDE-agents.md §R9 |
| Outils PydanticAI `@agent.tool_plain` (Pattern A) | Logique métier — connexions connectors, APIs externes | CLAUDE-agents.md §6 |
| Set `_AGENT_KW` précis (Pattern B) | Mots-clés métier spécifiques au domaine | CLAUDE-agents.md §6c |
| Activités Temporal (`@activity.defn`) | Logique workflow multi-étapes | — |
| Workflows Temporal (`@workflow.defn`) | Orchestration, retry policy, signaux | — |
| Datasets et prompts Langfuse (§8a/8b) | Nécessitent des exemples réels de l'agent | CLAUDE-agents.md §8 |
| Configuration RBAC étendue | Si accès cluster-admin ou multi-namespace requis | CLAUDE-agents.md §1 |

**Protocole post-création :**
1. Charlotte provisionne l'infrastructure (K8s running, /health OK)
2. Développeur ou Charlotte complète le code métier dans `configmap-{name}-script.yaml`
3. `apply_gitops_fix` + `restart_deployment` + `verify_pod_healthy`
4. Langfuse : enregistrer system prompt + dataset items + scoring (§8)

---

## 6. Règles invariantes pour tout agent NeoKube

Ces règles s'appliquent à TOUS les agents, quel que soit le type.

| Règle | Description | Ref antipattern |
|---|---|---|
| **Identité Langfuse** | Chaque appel LLM porte `user=AGENT_NAME`, `metadata.agent`, `metadata.agent_email`, `metadata.permissions_scope`, `metadata.workflow` | — |
| **Streaming obligatoire** (OWU-facing) | Jamais un seul chunk SSE — tokens progressifs ou mot-par-mot | #28 |
| **Fast-path conversationnel** (OWU-facing) | Avant le loop ReAct/outils — Pattern A ou B selon type | #21, #40 |
| **ntfy mission terminée** (OWU-facing avec outils) | `priority=low` après mission complète | CLAUDE-agents.md §6e |
| **Auto-enregistrement OWU** (OWU-facing) | `POST /openai/config/update` au démarrage — idempotent | CLAUDE-agents.md §6b |
| **Vault pour tous les secrets** | Jamais de secrets en dur — lire Vault + fallback env | CLAUDE-agents.md §R9 |
| **Embed 768 dims** | `nomic-embed-text` → 768 dimensions — toutes collections Qdrant en 768 | #7 |
| **LLM_FALLBACK actif** | Détecter HTTP 402/quota → retry fallback + ntfy alerte | #32, R9.8 |
| **Pas d'auto-restart Charlotte** | Toute activité qui fait `kubectl rollout restart` doit vérifier `agent-charlotte` | #26 |

---

## 7. Ports disponibles et conventions

**Ports libres** : 8494, 8495, 8496, 8497, 8498, 8499

**Déjà utilisés :**
| Port | Agent |
|---|---|
| 8000 | admin-sys |
| 8181 | leon |
| 8383 | charlotte |
| 8484 | dispatcher |
| 8485 | aria |
| 8486 | nox |
| 8487 | vera |
| 8488 | penpot-agent |
| 8489 | domi |
| 8490 | neo |
| 8491 | milo |
| 8492 | zephyr |
| 8493 | nora |

**Convention namespace** : `{name}` ou `agent-system` si intégré au namespace SRE.

---

## 8. Commandes Charlotte

```
# Créer un agent (interview + workflow automatique)
create_agent(
  name, description, runtime, port, model, extra,
  connectors="zoho,github",   # CSV des connectors utilisés
  sidecars_enabled=True        # injecter tool-validator + output-guard
)

# Provisionner depuis un AgentSpec existant
provision_agent(spec_path="apps/agent-catalog/{name}.yaml")

# Lister les agents enregistrés
GET http://agent-charlotte.agent-system.svc.cluster.local:8383/agents

# Décommissionner (scale → 0, registry → deprecated)
decommission_agent(agent_id="{name}")
```

**Résultat du workflow** : disponible via `GET /provision/{workflow_id}` (~2 min).
