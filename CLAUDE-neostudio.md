# CLAUDE-neostudio.md — NeoStudio : Espace de développement multi-agent

## Vision

NeoStudio est l'**atelier de développement multi-agent de NeoKube**. Il repose sur deux pilliers :

1. **UI Shell** — fork de [superset-sh/superset](https://github.com/superset-sh/superset), un orchestrateur d'agents CLI (Claude Code, Codex…) avec UI React. On réutilise cette couche UX **telle quelle** et on la branche sur nos agents NeoKube.
2. **NeoStudio Engine** — API Bun/Hono maison (port 4242) qui fait le pont entre l'UI Superset et les agents NeoKube (Charlotte, Leon, Aria, Nox, Vera, Dispatcher).

```
┌─────────────────────────────────────────────────────────────┐
│                  NeoStudio UI Shell                         │
│  apps/desktop (Electron) · apps/web (Next.js + tRPC)       │
│       fork de charlesvdd/superset                          │
└────────────────────┬────────────────────────────────────────┘
                     │  tRPC HTTP / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NeoStudio Engine  :4242                        │
│           apps/engine (Bun + Hono)                         │
│                                                             │
│  /api/v1/agents   → AgentProvider (ConfigMap NeoKube)      │
│  /api/v1/session  → Sessions + SSE stream LiteLLM          │
│  /api/v1/worktree → Git worktrees                          │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       ▼                              ▼
┌─────────────┐              ┌──────────────────┐
│  LiteLLM    │              │  Agents NeoKube  │
│  (cockpit)  │              │  Charlotte Leon  │
│  claude/gpt │              │  Aria Nox Vera   │
│  mistral…   │              │  Dispatcher      │
└─────────────┘              └──────────────────┘
```

---

## Architecture détaillée — fork Superset

Le fork `charlesvdd/superset` est un **monorepo Bun + Turbo** avec plusieurs apps :

| App | Framework | Rôle | Pertinence NeoStudio |
|---|---|---|---|
| `apps/web` | Next.js 16 + tRPC | Web UI multi-agent | ✅ **Couche UX principale** |
| `apps/desktop` | Electron 40 + React 19 | App desktop local | ✅ **Phase 1 — port Linux** |
| `apps/relay` | Hono | Proxy tRPC web→API | ✅ **À adapter → Engine** |
| `apps/api` | Next.js backend | Router tRPC 20+ | ⚠️ Remplacé par Engine |
| `apps/streams` | Durable streams | Real-time sync | Non requis (LiteLLM SSE) |
| `packages/shared` | Zod types | Types partagés | ✅ Réutiliser |
| `packages/ui` | Shadcn/Radix | Composants | ✅ Réutiliser |
| `packages/trpc` | tRPC router | 20+ routers | ✅ Adapter |
| `packages/db` | Drizzle + Neon | ORM | ⛔ Remplacé par SQLite Engine |
| `packages/auth` | Better Auth | OAuth Google/GitHub | ⚠️ Simplifier (JWT NeoKube) |

### Ce que fait `apps/web`

- Page `/agents` — liste sessions actives, lancer un agent
- Page `/workspaces` — espaces de travail (git worktrees)
- Page `/tasks` — tâches/PRs
- Parle au backend via **tRPC** (`NEXT_PUBLIC_API_URL`)
- Variables clés :
  ```env
  NEXT_PUBLIC_API_URL=https://neostudio.neokube.fr   # → notre Engine
  NEXT_PUBLIC_WEB_URL=https://neostudio.neokube.fr
  NEXT_PUBLIC_RELAY_URL=https://neostudio.neokube.fr
  ```

### Ce que fait `apps/desktop`

- App Electron standalone avec terminal (xterm), diff viewer, file browser
- Se connecte au relay → cloud API
- **Objectif Phase 1** : adapter `RELAY_URL` → `https://neostudio.neokube.fr`
- Compile pour Linux via `electron-builder` (`.deb`, `.AppImage`)

### Stratégie d'intégration Engine ↔ UI Superset

Le `apps/relay` fait proxy des appels tRPC de l'UI vers le cloud Superset. **On remplace ce relay par notre Engine** :

```
UI Superset (web/desktop)
    │ tRPC
    ▼
NeoStudio Engine :4242
    │ mappe les procedures tRPC → appels NeoKube
    ├── agent.launch   → /api/v1/session/start (agentId: charlotte|leon|…)
    ├── chat.send      → /api/v1/session/:id/message + /stream (LiteLLM SSE)
    ├── host.exec      → kubectl via admin-sys-agent
    └── worktree.*     → /api/v1/worktree (git)
```

L'Engine implémentera un **adaptateur tRPC** (Phase 2 complète) pour parler le même protocole que l'UI Superset attend.

---

## Agents NeoKube dans l'UI Superset

| Agent NeoKube | ID UI | Rôle affiché | LLM |
|---|---|---|---|
| Charlotte | `charlotte` | SRE — Cluster K8s, Scaleway, Vault | claude-sonnet |
| Leon | `leon` | Chef de Production — spec Notion, dispatch | gpt-4o |
| Aria | `aria` | Frontend Builder — GitHub + Vercel + Penpot | codestral |
| Nox | `nox` | Backend Builder — GitHub + Neon | codestral |
| Vera | `vera` | QA Reviewer | mistral-large |
| Dispatcher | `dispatcher` | Orchestrateur DevProjectWorkflow | mistral |

Liste dynamique via `NEOSTUDIO_AGENTS_CONFIG` (ConfigMap K8s) — modifiable sans rebuild.

---

## Stack déployée (K8s)

| Ressource | Détail |
|---|---|
| **Namespace** | `interfaces` |
| **Deployment** | `neostudio-engine` |
| **Image** | `ghcr.io/charlesvdd/neostudio:latest` (privée → `ghcr-neostudio` imagePullSecret) |
| **Port** | 4242 |
| **URL locale** | `http://neostudio.neokube.local` |
| **URL publique** | `https://neostudio.neokube.fr` |
| **Vault path** | `secret/neokube/apps/neostudio` → JWT_SECRET, LITELLM_API_KEY, GITHUB_TOKEN |
| **Temporal NS** | `neostudio` |
| **LiteLLM key** | `sk-neostudio-engine` (alias `neostudio-engine`) |
| **GitOps** | `~/Kubinote-GitOps/apps/interfaces/base/` (5 fichiers) |

### Points d'attention K8s (anti-patterns découverts)

- `cluster-bootstrap` gère **uniquement les namespaces Temporal** — il ne fait PAS `kubectl apply -k`. Les manifests sont appliqués manuellement avec `kubectl apply -f`.
- Image `ghcr.io` privée → `imagePullSecret ghcr-neostudio` requis dans `interfaces`.
- Exposer `*.neokube.fr` = **2 opérations** : CNAME DNS cloudflare-connector + route tunnel (PUT `/accounts/{id}/cfd_tunnel/{id}/configurations`). Voir `CLAUDE-dns.md`.

---

## Repos

| Repo | Rôle | Visibilité |
|---|---|---|
| `charlesvdd/neostudio` | Engine API + UI intégration + GitOps config | Privé |
| `charlesvdd/superset` | Fork Superset — UI Shell source | Public |
| `neomnia/Kubinote-GitOps` | Manifests K8s | Privé |

---

## Processus de développement NeoStudio

### Règles absolues (AGENTS.md)

1. Jamais de credentials hardcodés — toujours `process.env`
2. Jamais de commit direct sur `main` — branche feature + PR
3. Toujours utiliser les types de `packages/shared/src/types.ts`
4. L'Engine est la source de vérité — l'UI ne fait jamais d'appels LLM directs
5. Provider-agnostic : tous les LLM passent par LiteLLM proxy

### Branches et commits

```
feat/xxx   # nouvelle feature
fix/xxx    # correction bug
chore/xxx  # maintenance
docs/xxx   # documentation
```

Commits : Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`)
PRs : toujours avec description + lien Notion si applicable.

### CI/CD

| Étape | Déclencheur | Action |
|---|---|---|
| Lint (tsc --noEmit) | Push feat/fix | TypeScript check Engine |
| Tests (bun test) | Push feat/fix | app.request() tests |
| Docker build + push | Merge sur main | `ghcr.io/charlesvdd/neostudio:latest` + SHA |
| Déploiement K8s | Manuel | `kubectl apply -f` manifests interfaces |

> **Gap** : le déploiement K8s n'est pas encore automatisé (cluster-bootstrap ne fait pas kubectl apply). À résoudre : ajouter un webhook ou GitHub Action qui appelle admin-sys `/apply` après le push image.

### Développement local

```bash
git clone https://github.com/charlesvdd/neostudio
cd neostudio
bun install

# Engine seul
bun run --filter=engine dev   # http://localhost:4242

# UI Superset (après intégration Phase 1)
cd apps/ui
bun install && bun run dev    # http://localhost:3000
```

Variables locales (`apps/engine/.env`) :
```env
NEOSTUDIO_PORT=4242
LITELLM_PROXY_URL=http://litellm.neokube.local
LITELLM_API_KEY=sk-neostudio-engine    # depuis Vault
TEMPORAL_HOST=temporal.neokube.local:7233
TEMPORAL_NAMESPACE=neostudio
GITHUB_TOKEN=ghp_xxx                   # depuis Vault
JWT_SECRET=xxx                         # depuis Vault
DEFAULT_LLM_MODEL=mistral/mistral-large-latest
```

### Accès Vault depuis le dev local

```bash
# Récupérer les secrets de dev
kubectl exec -n security vault-0 -- vault kv get secret/neokube/apps/neostudio
```

---

## Phases de développement

| Phase | Scope | Statut |
|---|---|---|
| **Phase A** | Infrastructure K8s (Vault, LiteLLM key, Temporal NS, GitOps, DNS, CI/CD) | ✅ Terminé (2026-05-22) |
| **Phase B** | Engine API : CORS, AgentProvider, sessions LiteLLM SSE | ✅ Terminé (2026-05-22) |
| **Phase C** | UI Shell minimal — Next.js 15 + Tailwind v4, agent grid + session chat SSE, déployé K8s | ✅ Terminé (2026-05-22) |
| **1** | Intégration UI Superset complète — remplacer `apps/ui/` par `apps/web` du fork charlesvdd/superset | ⏳ À faire |
| **2** | Engine tRPC adapter — implémenter les procedures tRPC qu'attend l'UI Superset | ⏳ À faire |
| **3** | Persistance SQLite — remplacer in-memory sessions store | ⏳ À faire |
| **4** | Déploiement auto — GitHub Action → admin-sys `/apply` après push image | ⏳ À faire |
| **5** | App desktop Linux — compiler `apps/desktop` en `.deb` / `.AppImage` | ⏳ À faire |

### Détail Phase C — UI Shell minimal (✅ livré 2026-05-22)

**Architecture retenue** : Next.js 15 + Tailwind v4 minimal, déployé comme service K8s séparé. L'UI proxie `/api/v1/*` vers l'Engine via les `rewrites()` de `next.config.ts`.

```
/                    → agent grid (fetch /api/v1/agents, cartes clickables)
/session/[id]        → chat SSE (POST /api/v1/session/:id/message, stream tokens)
```

**Routing K8s** :
- Ingress `neostudio.neokube.fr` et `.neokube.local` → `neostudio-ui:3000`
- Next.js rewrite `/api/v1/*` → `neostudio-engine.interfaces.svc.cluster.local:4242`
- Engine reste accessible directement en interne via son Service K8s

**Images GHCR** :
- Engine : `ghcr.io/charlesvdd/neostudio:latest` (Dockerfile : `docker/Dockerfile.linux`)
- UI : `ghcr.io/charlesvdd/neostudio-ui:latest` (Dockerfile : `apps/ui/Dockerfile`)

**Anti-patterns découverts en Phase C** :

| # | Piège | Règle |
|---|---|---|
| UI-2 | `output: 'standalone'` Next.js en Docker monorepo | Le bundle standalone ne résout pas `node_modules/next` dans le runner si les paths ne correspondent pas. Fix : utiliser `bun run start` (non-standalone) — plus simple, pas de magie de bundling. |
| UI-3 | `--frozen-lockfile` sans `bun.lockb` | `bun install --frozen-lockfile` échoue si pas de lock file dans le repo. Omettre le flag pour les nouveaux projets sans lock file commité. |
| UI-4 | `public/` manquant → Docker COPY échoue | `COPY --from=builder /app/public ./public` échoue si le répertoire n'existe pas dans le builder. Toujours créer `public/.gitkeep` dans le repo Next.js. |
| UI-5 | CI trigger ne couvre pas `main` | Les jobs Docker avec `if: github.ref == 'refs/heads/main'` ne se déclenchent jamais si `on.push.branches` ne liste pas `main`. Toujours ajouter `main` aux branches déclenchantes quand des jobs sont conditionnels à `main`. |
| UI-6 | `apps/engine/Dockerfile` inexistant | Le Dockerfile engine était dans `docker/Dockerfile.linux` (convention du repo original). Ne pas supposer la localisation du Dockerfile — vérifier `git ls-files | grep Dockerfile`. |

### Détail Phase 1 — Intégration UI Superset complète

Pré-requis : Phase C déployée (UI minimal fonctionnel).

1. Cloner `apps/web` du fork dans `apps/ui/` de neostudio
2. Adapter `NEXT_PUBLIC_API_URL` → Engine API
3. Supprimer/mocker les dépendances non requises (PostHog, Stripe, Upstash)
4. Remplacer `packages/auth` par JWT NeoKube (JWT_SECRET Vault)
5. Adapter `apps/ui/Dockerfile` pour le monorepo Turbo
6. Déployer en K8s (update deployment-neostudio-ui.yaml)
7. Traefik : `/` → UI, Next.js rewrite → Engine

### Détail Phase 2 — Engine tRPC adapter

L'Engine doit implémenter les procédures tRPC attendues par `apps/web` :

```typescript
// Procédures à implémenter dans Engine
agent.list()              → GET /api/v1/agents
agent.launch({id, repo})  → POST /api/v1/session/start
agent.status({sessionId}) → GET /api/v1/session/:id
agent.stream({sessionId}) → GET /api/v1/session/:id/stream (SSE)
chat.send({id, content})  → POST /api/v1/session/:id/message
worktree.list({repo})     → GET /api/v1/worktree?repoPath=...
worktree.create({...})    → POST /api/v1/worktree
```

### Risque UI trop couplée (anti-pattern #UI-1)

**Règle** : l'UI Superset ne connaît que le protocole tRPC de l'Engine. Elle ne parle **jamais** directement à Charlotte, Leon ou LiteLLM. Tout passe par l'Engine.

**AgentProvider** (`NEOSTUDIO_AGENTS_CONFIG`) est la seule source de vérité pour la liste des agents — modifiable via ConfigMap sans rebuild image.
