# CLAUDE-architecture-target.md — Architecture cible NeoKube

**Statut** : Document de référence — refactoring en cours (démarré 2026-06-01)
**Projet Zoho** : "NeoKube — Refactoring Architecture Agents v2" (créé 2026-06-01)

---

## Vision

> **Agents LLM métier intelligents** connectés à des **microservices spécialisés partagés**.
> Les microservices sont appelables par N agents simultanément (infrastructure croisée).
> Les agents raisonnent, décident, orchestrent. Les microservices exécutent.

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTS LLM MÉTIER                        │
│                                                             │
│   Charlotte (SRE)          Leon (Chef de Production)        │
│   [futurs agents métier]                                    │
└────────────┬────────────────────────┬───────────────────────┘
             │  appels HTTP           │  appels HTTP
             ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MICROSERVICES SPÉCIALISÉS PARTAGÉS             │
│                    (connector-system)                       │
│                                                             │
│  zoho-engine      penpot-engine    scaleway-engine          │
│  github-connector vercel-connector neon-connector           │
│  notion-connector cloudflare-connector  openprovider        │
│  frontend-builder backend-builder  devops-runner            │
│  qa-service       domain-service                            │
└─────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATION TEMPORAL PURE                    │
│                                                             │
│   dev-project-workflow  (ex-Dispatcher)                     │
│   domain-provision-workflow                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## État actuel → Cible

### Agents LLM — garder, enrichir

| Actuel | Cible | Action | Priorité |
|---|---|---|---|
| Charlotte | Charlotte | Enrichir prompt + outils microservices | P2 |
| Leon | Leon | Enrichir (REVIEW/TASK modes v4) | P2 |
| Neo | **SUPPRIMÉ** | Pas utilisé — Charlotte + Leon couvrent le besoin via NeoStudio | **P0 — immédiat** |
| Vera | **qa-service** | Renommer + déplacer connector-system + corriger aria→camille | P1 |

### Workers nommés → Microservices fonctionnels

| Actuel | Cible | LLM ? | Namespace cible | Priorité |
|---|---|---|---|---|
| Camille (8485) | **frontend-builder** | ✅ oui (codestral — génération code) | connector-system | P1 |
| Guillaume (8486) | **backend-builder** | ❌ non (appels GitHub MCP + Neon) | connector-system | P1 |
| Alain (8494) | **devops-runner** | ❌ non (appels GitHub Actions + Vercel) | connector-system | P1 |
| Domi (8489) | **domain-service** | ❌ non (appels Openprovider + Cloudflare) | connector-system | P2 |

### Orchestrateurs → Infrastructure Temporal pure

| Actuel | Cible | Action | Priorité |
|---|---|---|---|
| Dispatcher (8484) | **dev-project-workflow** | Temporal worker pur — endpoint `/run` `/status` `/signal` + 0 LLM | P1 |

---

## Architecture cible détaillée

### Agents LLM métier (agent-system)

```
Charlotte  :8383  — Maître NeoKube, SRE, FallbackModel claude-sonnet→mistral
Leon       :8181  — Chef Production, briefs→spec→Zoho, gpt-4o
```

**Règle** : un agent LLM = identité claire, raisonnement, périmètre métier défini.
Pas de workers techniques dans agent-system.

### Microservices spécialisés (connector-system)

```
# Existants stables
zoho-engine         :8000  — Zoho Projects CRUD (scaffold, tasks, milestones)
github-connector    :8001  — GitHub repos, branches, issues
vercel-connector    :8002  — Vercel projets, deployments, env vars
neon-connector      :8003  — Neon branches, databases
penpot-engine       :8004  — Penpot design (scaffold atomique, projet+template)
openprovider-conn.  :8005  — Registrar domaines (achat, renouvellement)
cloudflare-conn.    :8006  — DNS, zones, tunnel routing
stalwart-conn.      :8007  — Comptes email, SMTP
notion-connector    :8011  — Notion pages (lecture, écriture, recherche)
scaleway-engine     :8012  — Scaleway cloud (billing, IAM, instances)
github-mcp          :8080  — MCP streamable-http pour GitHub

# À créer / renommer depuis agent-system
frontend-builder    :8485  — Next.js repo creation + Vercel deploy (ex-Camille, garde LLM codestral)
backend-builder     :8486  — FastAPI repo creation + Neon branch (ex-Guillaume, sans LLM)
devops-runner       :8494  — CI/CD GitHub Actions + env vars Vercel (ex-Alain, sans LLM)
qa-service          :8487  — Checklist artefacts + cohérence LLM (ex-Vera)
domain-service      :8489  — Provision domaine DNS (ex-Domi, déjà partiellement migré)
```

### Orchestration Temporal (agent-system ou namespace dédié)

```
dev-project-workflow  :8484  — ex-Dispatcher
  Reçoit ProjectSpec → orchestre [frontend-builder + backend-builder + penpot-engine + domain-service]
  → qa-service → signal humain → deploy
  AUCUN LLM — logique de workflow pure
  Endpoints : POST /run, GET /status/{id}, POST /signal/{id}/approve, POST /signal/{id}/reject
```

---

## Plan de migration — Ordre recommandé

### Phase 0 — Nettoyage immédiat (fait + à faire)
- [x] Supprimer penpot-agent (LLM) → penpot-engine ✅
- [x] Supprimer Neo ← TODO immédiat
- [x] Nettoyer agent-registry (aria/nox/penpot) ✅
- [ ] Corriger références aria/nox restantes dans Vera + Dispatcher

### Phase 1 — Renommage sans breaking change
- [ ] Vera → qa-service (renommer configmap, deployment, service, Temporal queue)
- [ ] Corriger aria_result → camille_result dans vera.py + dispatcher
- [ ] Dispatcher → dev-project-workflow (renommer, simplifier, supprimer LLM Vera interne)
- [ ] Mettre à jour agent-registry, CLAUDE.md, Langfuse prompts

### Phase 2 — Migration namespace (breaking)
- [ ] Camille → frontend-builder : déplacer connector-system, mettre à jour Dispatcher
- [ ] Guillaume → backend-builder : idem (déjà sans LLM)
- [ ] Alain → devops-runner : idem
- [ ] Domi → domain-service : idem (déjà +/provision endpoint)
- [ ] Ports : aligner avec les ports libres connector-system

### Phase 3 — Enrichissement agents LLM
- [ ] Charlotte : outils vers nouveaux microservices (frontend-builder, backend-builder, etc.)
- [ ] Leon : dispatch direct vers dev-project-workflow + microservices
- [ ] Nouveaux agents métier si besoin

---

## Ce que Vera fait aujourd'hui (avant qa-service)

**Couche 1 — Checklist structurelle** (0 LLM, déterministe) :
| Check | Bloquant ? |
|---|---|
| Repo frontend créé (aria_result.repo) | ✅ OUI |
| Repo backend créé (nox_result.repo) | ✅ OUI |
| Branche Neon créée (nox_result.neon_branch_id) | ✅ OUI |
| Stub OpenAPI présent dans le repo backend | ❌ non |
| Projet Vercel créé | ❌ non |
| Design Penpot créé | ❌ non |
| Domaine provisionné | ❌ non |
| Aucune erreur frontend | ❌ non |
| Aucune erreur backend | ❌ non |

**Couche 2 — Cohérence LLM** (1 appel, 2 phrases) :
`"Les artefacts sont-ils COHÉRENTS avec les critères d'acceptance ? COHÉRENT ou INCOHÉRENT + raison."`

**Problèmes actuels** :
- Référence encore `aria_result` / `nox_result` (noms Aria/Nox périmés)
- La couche 1 pourrait être intégrée dans dev-project-workflow (validation interne)
- La couche 2 pourrait être un endpoint `POST /qa-service/check` appelable par tout agent

---

## Décisions architecturales clés

### Règle de nommage
- **Prénom humain** → agent LLM avec identité et raisonnement (Charlotte, Leon)
- **Nom fonctionnel** → microservice technique (frontend-builder, qa-service, zoho-engine)
- **Pas de prénoms pour des workers déterministes**

### Règle de namespace
- `agent-system` → agents LLM + orchestrateurs Temporal
- `connector-system` → microservices HTTP partagés (APIs tierces + builders)

### Règle de LLM
- Un microservice peut utiliser LLM pour une tâche précise (ex: frontend-builder génère du code)
- Un agent LLM raisonne et décide de quelle séquence d'appels faire
- La distinction : l'agent DÉCIDE, le microservice EXÉCUTE

### Règle de l'infrastructure croisée
- Tout microservice connector-system est appelable par Charlotte ET Leon ET tout futur agent
- Aucun service ne doit être "propriété" d'un seul agent
- Les credentials viennent toujours de Vault (pas d'env vars hardcodées)
