# CLAUDE-neostudio.md — NeoStudio : Espace de développement multi-agent

## Vision

NeoStudio est l'**atelier de développement multi-agent de NeoKube**. Une UI chat dédiée qui expose les agents NeoKube (Charlotte, Leon, Aria, Nox, Vera, Dispatcher) dans une interface conversationnelle avec streaming SSE, identité visuelle par agent, et follow-up messages.

> **Note d'architecture (2026-05-23)** : L'approche initiale de fork du projet superset-sh/superset a été abandonnée. `apps/web` de superset est une UI desktop-first avec toutes les données mockées — non adaptable en temps raisonnable. L'UI est désormais un Next.js 15 custom maintenu dans `apps/ui/` du repo `neomnia/neostudio`.

```
┌─────────────────────────────────────────────────────────────┐
│              NeoStudio UI  (apps/ui)                        │
│         Next.js 15.3.2 + Tailwind v4 + Bun                 │
│     ghcr.io/neomnia/neostudio-ui:latest · port 3000      │
└────────────────────┬────────────────────────────────────────┘
                     │  fetch REST + SSE
                     │  /api/v1/* → Engine directement (ingress Traefik)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NeoStudio Engine  :4242                        │
│           apps/engine (Bun + Hono + SQLite)                 │
│  ghcr.io/neomnia/neostudio:latest                        │
│                                                             │
│  POST /api/v1/auth/login              Login → JWT 7j (AUTH_PASSWORD)│
│  GET  /api/v1/agents                  AgentProvider ConfigMap│
│  GET  /api/v1/session?agentId=        Liste sessions (filtre optionnel)│
│  POST /api/v1/session/start           Crée session + workspace│
│  POST /api/v1/session/:id/message     Ajoute message user   │
│  GET  /api/v1/session/:id/stream      SSE tokens agent      │
│  GET  /api/v1/session/:id/activity-stream  SSE activité live│
│  GET  /api/v1/session/:id/messages    Historique messages   │
│  GET  /api/v1/session/:id             Détail session        │
│  GET  /api/v1/session/:id/diff        Diff git workspace    │
│  POST /api/v1/session/:id/workspace/file  Écriture fichier  │
│  GET  /api/v1/session/:id/workspace   Liste fichiers        │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
       ▼                              ▼
┌─────────────┐              ┌──────────────────┐
│  LiteLLM    │              │  Agents NeoKube  │
│  (cockpit)  │              │  Charlotte · Leon│
│  claude/gpt │              │  Aria · Nox      │
│  mistral…   │              │  Vera · Disp.    │
└─────────────┘              └──────────────────┘
```

---

## Agents NeoKube dans NeoStudio

| Agent NeoKube | ID UI | Rôle affiché | LLM | Protocole Engine |
|---|---|---|---|---|
| Charlotte | `charlotte` | SRE — Cluster K8s, Scaleway, Vault | claude-sonnet | `POST /mission/stream` (SSE `{type:"token",text}`) |
| Leon | `leon` | Chef de Production — spec Notion, dispatch | gpt-4o | `POST /v1/chat/completions` (OpenAI stream) |
| Camille | `camille` | Frontend Builder — GitHub + Vercel + Penpot | codestral | LiteLLM `/v1/chat/completions` |
| Nox | `nox` | Backend Builder — GitHub + Neon | codestral | LiteLLM `/v1/chat/completions` |
| Vera | `vera` | QA Reviewer | mistral-large | LiteLLM `/v1/chat/completions` |
| Dispatcher | `dispatcher` | Orchestrateur DevProjectWorkflow | mistral | LiteLLM `/v1/chat/completions` |

Liste dynamique via `NEOSTUDIO_AGENTS_CONFIG` (ConfigMap K8s) — modifiable sans rebuild.

---

## Stack déployée (K8s)

| Ressource | Détail |
|---|---|
| **Namespace** | `interfaces` |
| **Deployments** | `neostudio-engine` · `neostudio-ui` |
| **Images** | Engine : `ghcr.io/neomnia/neostudio:latest` · UI : `ghcr.io/neomnia/neostudio-ui:latest` |
| **Ports** | Engine : 4242 · UI : 3000 |
| **URL locale** | `http://neostudio.neokube.local` |
| **URL publique** | `https://neostudio.neokube.fr` |
| **Vault path** | `secret/neokube/apps/neostudio` → JWT_SECRET, AUTH_PASSWORD, LITELLM_API_KEY, GITHUB_TOKEN |
| **GitOps** | `~/Kubinote-GitOps/apps/interfaces/base/` (5 fichiers neostudio-*) |
| **imagePullSecret** | `ghcr-neostudio` (dans namespace `interfaces`) |

### Routing K8s

- Ingress `neostudio.neokube.fr` et `neostudio.neokube.local` :
  - `/api/v1` (Prefix) → `neostudio-engine:4242` **directement** (contourne Next.js — obligatoire pour le streaming SSE)
  - `/` (Prefix) → `neostudio-ui:3000`
- Next.js `rewrites()` gardé comme fallback dev local uniquement
- `ops.neokube.fr` → `admin-sys-agent:8000` (via Cloudflare tunnel, sans whitelist IP — usage CI uniquement)

---

## Architecture UI — pages et composants clés

```
apps/ui/src/
├── lib/
│   └── auth.ts                         # getToken / setToken / clearToken / authFetch (Bearer + 401→/login)
├── components/
│   └── workspace/
│       ├── WorkspaceSidebar.tsx        # Sidebar persistante — agents + sessions récentes + status dots
│       └── AuthGuard.tsx               # Vérifie token localStorage → spinner → redirect /login si absent
├── app/
│   ├── login/
│   │   └── page.tsx                    # Page login — form mot de passe → POST /api/v1/auth/login → JWT
│   └── agents/
│       ├── layout.tsx                  # AuthGuard + sidebar (w-56) + main area
│       ├── page.tsx                    # Dashboard multi-agents — grille AgentDashboardCard (GET /api/v1/agents + sessions)
│       ├── components/
│       │   ├── AgentsHeader.tsx        # Conservé (dev local), non utilisé en prod (sidebar = branding)
│       │   ├── AgentCard.tsx
│       │   ├── AgentDashboardCard.tsx  # Card agent — stats sessions, badge running pulsant, dernier lien
│       │   └── AgentPromptInput.tsx    # Crée session + envoie premier message → redirect
│       └── [agentId]/
│           └── session/[sessionId]/
│               ├── page.tsx            # LOGIQUE PRINCIPALE + panneau droit ActivityFeed permanent
│               └── components/
│                   ├── SessionPageContent.tsx  # Center panel : tabs chat / diff / terminal
│                   ├── SessionChat.tsx         # Messages + typing indicator + CopyButton
│                   ├── SessionHeader.tsx
│                   ├── SessionTabs.tsx         # 3 onglets : chat / diff (badge amber) / terminal
│                   ├── SessionDiff.tsx         # FileDiffTool par fichier modifié (vrais contenus git)
│                   ├── ActivityFeed.tsx        # Timeline SSE en temps réel — panneau droit (xl:flex)
│                   ├── SessionTerminal.tsx     # iframe → http://ttyd.neokube.local
│                   └── FollowUpInput.tsx       # Input follow-up + streaming

apps/desktop/                           # Phase 4 — App desktop Linux
├── main.js                             # Electron BrowserWindow → NEOSTUDIO_URL
├── package.json                        # electron 31 + electron-builder 24
└── assets/
    └── icon.png                        # 512×512 violet-600
```

### Flux session complet

1. `/agents` → clic agent → `AgentPromptInput` → `POST /session/start` + `POST /session/:id/message` → `router.push(/session/:id)`
2. `page.tsx` charge : `GET /agents` + `GET /session/:id` + `GET /session/:id/messages`
3. Si dernier message = `role:"user"` → `triggerStream()` auto-déclenché (useEffect, fireOnce via ref)
4. Tokens SSE → `streamingContent` state → message assistant "live" dans `allMessages`
5. Stream terminé → message persisté dans `messages` state, `streamingContent` vidé
6. Follow-up : `FollowUpInput` → `POST /message` + `GET /stream` → même flow

### États page.tsx

| State | Type | Rôle |
|---|---|---|
| `messages` | `MockMessage[]` | Messages persistés (user + assistant confirmés) |
| `streamingContent` | `string` | Texte accumulé du stream en cours |
| `isStreaming` | `boolean` | True dès l'envoi, false à la fin du stream |
| `loading` | `boolean` | Chargement initial de la session |
| `autoStreamFired` | `useRef<boolean>` | Guard one-shot pour l'auto-stream initial |
| `activityEvents` | `ActivityEvent[]` | Événements SSE live (dédupliqués par id) |

`isTyping = isStreaming && !streamingContent` — affiché dans `SessionChat` pendant la phase "thinking" (avant le premier token).

---

## Repos

| Repo | Rôle | Visibilité |
|---|---|---|
| `neomnia/neostudio` | Engine API + UI + GitOps config | Privé |
| `neomnia/Kubinote-GitOps` | Manifests K8s | Privé |

> Le fork `charlesvdd/superset` reste public mais n'est plus utilisé dans NeoStudio.

---

## CI/CD

| Étape | Déclencheur | Action |
|---|---|---|
| TypeScript Check | Push sur main | `tsc --noEmit` sur engine + ui |
| Tests | Push sur main | `bun test` |
| Build & Push Engine | Push sur main | `ghcr.io/neomnia/neostudio:latest` |
| Build & Push UI | Push sur main | `ghcr.io/neomnia/neostudio-ui:latest` |
| **Déploiement K8s** | Après build engine + ui | `POST https://ops.neokube.fr/execute` → `kubectl rollout restart` (auto ✅) |
| Desktop Linux | Tag `v*` ou `workflow_dispatch` | `.AppImage` + `.deb` → GitHub Actions artifacts + Release |

**Workflow `ci.yml`** : lint → tests → docker-engine ∥ docker-ui → deploy (séquentiel, needs les deux builds)
**Workflow `desktop.yml`** : déclenché indépendamment sur tag ou manuellement

---

## Processus de développement

### Règles absolues

1. Jamais de credentials hardcodés — toujours `process.env`
2. L'Engine est la source de vérité — l'UI ne fait jamais d'appels LLM directs
3. Provider-agnostic : tous les LLM passent par LiteLLM proxy
4. Commits : Conventional Commits (`feat:`, `fix:`, `docs:`…)
5. Push direct sur `main` via GitHub API ou CLI — pas de PR pour les fixes urgents

### Développement local

```bash
git clone https://github.com/neomnia/neostudio
cd neostudio && bun install

# Engine
cd apps/engine && bun run dev   # http://localhost:4242

# UI
cd apps/ui && bun install && bun run dev  # http://localhost:3000
```

Variables `apps/engine/.env` :
```env
NEOSTUDIO_PORT=4242
LITELLM_PROXY_URL=http://litellm.neokube.local
LITELLM_API_KEY=sk-neostudio-engine
DEFAULT_LLM_MODEL=mistral/mistral-large-latest
GITHUB_TOKEN=ghp_xxx
JWT_SECRET=dev-secret-local
# AUTH_PASSWORD=mot-de-passe  # Laisser vide en dev local = auth désactivée (toujours autorisé)
```

---

## Process Charlotte — Ajouter un endpoint à NeoStudio Engine

> **Source de vérité** : `charlesvdd/neostudio` sur GitHub (repo privé).
> Charlotte utilise le **GitHub MCP** (connector-system:8080) pour lire et modifier le code.

### Authentification NeoStudio Engine

```
POST /api/v1/auth/login
Body: {"password": "<AUTH_PASSWORD depuis Vault secret/neokube/apps/neostudio>"}
Retour: {"token": "<JWT valide 7j>"}

Tous les autres endpoints : Authorization: Bearer <JWT>
JWT_SECRET : Vault secret/neokube/apps/neostudio → JWT_SECRET
```

**Pattern pour tester un endpoint depuis Charlotte :**
```bash
# Via admin-sys kubectl exec
kubectl exec -n interfaces deploy/neostudio-engine -- \
  wget -qO- --post-data='{"password":"<AUTH_PASSWORD>"}' \
  --header='Content-Type:application/json' \
  http://localhost:4242/api/v1/auth/login
```

### Ajouter un endpoint Engine (Bun/Hono TypeScript)

```
Repo : charlesvdd/neostudio (branche main)
Fichier à modifier : apps/engine/src/index.ts (ou créer apps/engine/src/routes/<nom>.ts)
```

**Procédure complète (via GitHub MCP) :**

1. **Lire la structure existante** :
   ```
   GitHub MCP : get_file_contents(owner="neomnia", repo="neostudio", path="apps/engine/src/index.ts")
   ```

2. **Comprendre le pattern Hono** :
   ```typescript
   // Pattern type d'un endpoint Engine
   app.get('/api/budgets', authMiddleware, async (c) => {
     // Logique ici
     return c.json({ data: result, error: null })
   })
   ```

3. **Créer ou modifier le fichier** :
   ```
   GitHub MCP : create_or_update_file(
     owner="neomnia", repo="neostudio",
     path="apps/engine/src/routes/budgets.ts",
     content="<code TypeScript base64>",
     message="feat(engine): add GET /api/budgets — LiteLLM budget panel",
     branch="main"
   )
   ```

4. **Vérifier que le CI/CD se déclenche** :
   ```
   GitHub MCP : list_workflow_runs(owner="neomnia", repo="neostudio") → vérifier "ci.yml" en cours
   ```

5. **Attendre la fin du build** (~3-5 min) puis redéployer :
   ```bash
   kubectl rollout restart deployment/neostudio-engine -n interfaces
   kubectl rollout status deployment/neostudio-engine -n interfaces --timeout=120s
   ```

6. **Vérifier l'endpoint** :
   ```bash
   # Obtenir un JWT d'abord
   TOKEN=$(kubectl exec -n interfaces deploy/neostudio-engine -- \
     wget -qO- --post-data='{"password":"$AUTH_PASSWORD"}' \
     --header='Content-Type:application/json' \
     http://localhost:4242/api/v1/auth/login | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")
   
   # Tester
   kubectl exec -n interfaces deploy/neostudio-engine -- \
     wget -qO- --header="Authorization: Bearer $TOKEN" \
     http://localhost:4242/api/NOUVEAU_ENDPOINT
   ```

### Template endpoint GET /api/budgets (LiteLLM)

```typescript
// apps/engine/src/routes/budgets.ts
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'

const router = new Hono()

router.get('/budgets', authMiddleware, async (c) => {
  const litellmUrl = process.env.LITELLM_PROXY_URL || 'http://litellm.cockpit.svc.cluster.local:4000'
  const masterKey = process.env.LITELLM_MASTER_KEY || process.env.LITELLM_API_KEY || ''
  
  try {
    // Lister les clés
    const listResp = await fetch(`${litellmUrl}/key/list?page=1&size=50`, {
      headers: { Authorization: `Bearer ${masterKey}` }
    })
    const { keys } = await listResp.json()
    
    // Récupérer info par clé (agents uniquement)
    const agents = []
    for (const keyHash of keys) {
      const infoResp = await fetch(`${litellmUrl}/key/info?key=${keyHash}`, {
        headers: { Authorization: `Bearer ${masterKey}` }
      })
      const { info } = await infoResp.json()
      const alias = info?.key_alias || ''
      if (!alias.startsWith('agent-')) continue
      
      agents.push({
        name: alias.replace('agent-', ''),
        spend: info.spend || 0,
        max_budget: info.max_budget || 0,
        pct: info.max_budget ? Math.round((info.spend || 0) / info.max_budget * 100) : 0,
        budget_reset_at: info.budget_reset_at,
        model: info.models?.[0] || 'unknown'
      })
    }
    
    return c.json({ data: agents.sort((a,b) => b.pct - a.pct), error: null })
  } catch (e: any) {
    return c.json({ data: null, error: e.message }, 500)
  }
})

export default router
```

**Enregistrer dans index.ts** :
```typescript
import budgetsRouter from './routes/budgets'
app.route('/api', budgetsRouter)
```

### Modifier l'UI NeoStudio (Next.js 15)

Même process GitHub MCP mais sur `apps/ui/src/` :
- Composants : `apps/ui/src/components/`
- Pages : `apps/ui/src/app/`
- API calls : via `authFetch` (wrapper sur fetch + JWT Bearer auto)

```typescript
// Exemple appel depuis l'UI
import { authFetch } from '@/lib/auth'
const res = await authFetch('/api/budgets')
const { data } = await res.json()
```

---

## Phases de développement

| Phase | Scope | Statut |
|---|---|---|
| **A** | Infrastructure K8s (Vault, LiteLLM key, GitOps, DNS, CI/CD) | ✅ 2026-05-22 |
| **B** | Engine API : CORS, AgentProvider, sessions LiteLLM SSE | ✅ 2026-05-22 |
| **C** | UI Shell minimal — Next.js 15, agent grid + session chat SSE | ✅ 2026-05-22 |
| **D** | UI Chat amélioré — identité agent/user, typing indicator, fix streaming | ✅ 2026-05-23 |
| **1** | ~~Intégration UI Superset~~ | ❌ Abandonné (2026-05-23) |
| **2** | Live Activity View + git workspace + Terminal + Diff + copy button | ✅ 2026-05-23 |
| **2.7** | Dashboard Multi-Projets — grille cards agents avec statut, sessions, dernière activité | ✅ 2026-05-23 |
| **2.9** | Board UI 3-panels — sidebar nav + chat center + activity feed permanent | ✅ 2026-05-23 |
| **3** | Déploiement auto — GitHub Action → admin-sys via `ops.neokube.fr` | ✅ 2026-05-23 |
| **4** | App desktop Linux — `.AppImage` + `.deb` (Electron, `apps/desktop/`) | ✅ 2026-05-23 |
| **4-auth** | Auth JWT — login page + middleware engine + authFetch UI + Vault AUTH_PASSWORD | ✅ 2026-05-23 |

---

### Détail Phase D — UI Chat amélioré (✅ 2026-05-23)

- **`GET /session/:id/messages`** ajouté à l'Engine (manquait — retournait 404)
- **Auto-stream** : `page.tsx` déclenche automatiquement le stream si le dernier message chargé est `role:"user"`
- **Identité visuelle** : avatar coloré + nom de l'agent ; label "Vous" côté utilisateur
- **Typing indicator** : 3 points animés pendant la phase "thinking" (avant le premier token)
- **Buffer SSE correct** : `decoder.decode(value, { stream: true })` + buffer ligne
- **`onStreamDone`** : callback → persistance message assistant dans `messages` state

---

### Détail Phase 2 — Live Activity View + workspace (✅ 2026-05-23)

**Activité en temps réel (SSE)**

- Table SQLite `activity_events` + `dbAddActivity` / `dbGetActivities`
- `emitActivity()` : persiste en DB + notifie les subscribers en mémoire (`Map<sessionId, Set<cb>>`)
- `GET /:id/activity-stream` : SSE avec heartbeat toutes les 10s + flush 4KB initial pour Traefik
- `ActivityFeed` component : timeline colorée par type (`session.start`→vert, `step`→violet, `file.write`→amber)
- Badge violet sur l'onglet "Activité" avec compteur live
- Fix routing SSE : `/api/v1/*` routé directement vers engine via ingress Traefik (bypass Next.js proxy)

**Git workspace par session**

- `WS_BASE=/data/workspaces/{sessionId}` — init Git au démarrage de session (`git init` + commit initial)
- Init lazy sur `POST /workspace/file` si le workspace n'existe pas encore
- `GET /:id/diff` : `git status --porcelain --untracked-files=all` + `git show HEAD:file` → `DiffFile[]`
- `POST /:id/workspace/file` : écriture fichier dans le workspace + `emitActivity file.write`
- `GET /:id/workspace` : liste fichiers (`git ls-files`)
- Dockerfile engine : `RUN apk add --no-cache git` (alpine runner)

**Terminal tab**

- `SessionTerminal.tsx` : iframe vers `http://ttyd.neokube.local`
- Onglet "Terminal" dans `SessionTabs` (3ème onglet — l'onglet "Activité" est dans le panneau droit permanent en Phase 2.9)

**Diff tab réel**

- `SessionPageContent` fetch `GET /api/v1/session/:id/diff` à l'activation de l'onglet Diff
- Badge amber avec compteur de fichiers modifiés
- `SessionDiff` affiche les `FileDiffTool` avec vrais contenus old/new

**Copy button**

- `CopyButton` sur chaque message (assistant + user) — visible au hover, feedback checkmark 1.5s

---

### Détail Phase 2.7 — Dashboard Multi-Projets (✅ 2026-05-23)

**Objectif** : transformer `/agents` d'un simple listing en un vrai tableau de bord avec statut et métriques par agent.

**`AgentDashboardCard`** :
- Stats calculées côté client à partir de la liste sessions (pas de nouvel endpoint)
- Badge "En cours" pulsant (vert) si `running > 0`
- Compteur sessions total + running
- Lien vers la dernière session (si elle existe)
- Boutons "Ouvrir" → `/agents/{id}` et "+" → nouvelle session (AgentPromptInput)

**`agents/page.tsx`** (refactorisé complet) :
- Fetch parallèle : `GET /api/v1/agents` + `GET /api/v1/session`
- Skeleton 4 cartes `animate-pulse` pendant le chargement
- Grille responsive : `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`
- Header : compteur agents + sessions total + badge sessions running

**Engine** : `GET /api/v1/session?agentId=` ajouté — filtre optionnel par agent (utilisé aussi par la page `[agentId]`).

---

### Détail Phase 2.9 — Board UI 3-Panels (✅ 2026-05-23)

**Architecture** :
```
┌──────────────┬──────────────────────────────┬──────────────────────┐
│ SIDEBAR w-56 │       CHAT CENTER (flex-1)   │ ACTIVITY FEED  w-72  │
│              │                              │  (xl:flex, hidden <xl│
│  NeoStudio   │  [SessionHeader]             │                      │
│  ─────────── │  ─────────────────────────── │  ▶ session.start     │
│  Charlotte ● │  tabs: chat | diff | terminal│  → step: analyse…    │
│  Leon        │  ─────────────────────────── │  ✎ file.write        │
│  ├ session 1 │  [messages]                  │  …                   │
│  └ session 2 │                              │                      │
│  Aria        │  [FollowUpInput]             │                      │
└──────────────┴──────────────────────────────┴──────────────────────┘
```

**Changements** :
- `agents/layout.tsx` : layout persistant — sidebar + `{children}` (main area)
- `WorkspaceSidebar` : liste agents (fetch `/api/v1/agents`), sessions récentes par agent (5 max), status dots (vert/gris/rouge), navigation active via `usePathname`
- Session `page.tsx` : rendu 3-panels — center `SessionPageContent` + right `ActivityFeed`
- `SessionTabs` : 3 onglets (chat, diff, terminal) — plus d'onglet "Activité"
- `ActivityFeed` permanent dans le panneau droit (`xl:flex hidden`) avec badge compteur live
- Suppression de `AgentsHeader` des pages agents (le branding est dans la sidebar)

---

### Détail Phase 4-auth — Auth JWT (✅ 2026-05-23)

**Objectif** : protéger l'Engine et l'UI sans bloquer le développement local.

**Pattern opt-in** : l'auth est activée uniquement si `AUTH_PASSWORD` est défini dans l'env. Si absent → toutes les requêtes passent (dev mode). Si défini → JWT requis sur tous les endpoints sauf `/api/v1/health` et `/api/v1/auth/login`.

**Engine** :
- `apps/engine/src/routes/auth.ts` : `POST /api/v1/auth/login` — compare `password` à `AUTH_PASSWORD`, retourne JWT signé avec `JWT_SECRET` (expiry 7 jours, algo HS256)
- `apps/engine/src/middleware/auth.ts` : `authMiddleware` — vérifie le header `Authorization: Bearer <token>` via `verify()` Hono/JWT
- `apps/engine/src/index.ts` : middleware global `app.use('*', authMiddleware)` + route `/api/v1/auth`

**UI** :
- `src/lib/auth.ts` : `getToken / setToken / clearToken` (localStorage key `neostudio-token`) + `authFetch` (drop-in pour `fetch`, injecte le Bearer, redirige vers `/login` sur 401)
- `src/app/login/page.tsx` : formulaire mot de passe → `POST /api/v1/auth/login` → `setToken(token)` → redirect `/agents`
- `src/components/workspace/AuthGuard.tsx` : vérifie `getToken()` au mount — spinner pendant la vérification, redirect `/login` si absent
- `agents/layout.tsx` : wrappé dans `<AuthGuard>` — protège toutes les routes `/agents/*`

**Vault** :
- `secret/neokube/apps/neostudio` : `AUTH_PASSWORD` ajouté via `vault kv patch`
- `deployment-neostudio.yaml` : template Vault exporte `AUTH_PASSWORD` en plus de `JWT_SECRET`

**Migration authFetch** : 7 fichiers mis à jour — `agents/page.tsx`, `agents/[agentId]/page.tsx`, `session/[sessionId]/page.tsx`, `SessionPageContent.tsx`, `FollowUpInput.tsx`, `AgentPromptInput.tsx`, `WorkspaceSidebar.tsx`.

---

### Détail Phase 3 — Déploiement automatique (✅ 2026-05-23)

**Objectif** : supprimer le `kubectl rollout restart` manuel après chaque push image.

**Architecture** :
- `ops.neokube.fr` — admin-sys exposé publiquement via Cloudflare tunnel (sans IP whitelist)
- Authentification : `X-Admin-Sys-Token` stocké comme secret GitHub Actions (`ADMIN_SYS_TOKEN`)
- Ingress K8s : `ingress-admin-sys-agent-public.yaml` (namespace `interfaces`, sans middleware whitelist)

**Flow CI** :
```
push main → lint + tests → docker-engine + docker-ui (parallèle) → deploy (séquentiel)
```

**Job deploy dans `ci.yml`** :
```yaml
deploy:
  needs: [docker-engine, docker-ui]
  steps:
    - curl -sf -X POST https://ops.neokube.fr/execute
        -H "X-Admin-Sys-Token: ${{ secrets.ADMIN_SYS_TOKEN }}"
        -d '{"args":["rollout","restart","deployment/neostudio-engine","deployment/neostudio-ui","-n","interfaces"]}'
```

---

### Détail Phase 4 — App desktop Linux (✅ 2026-05-23)

**Stack** : Electron 31 + electron-builder 24 → `.AppImage` (portable) + `.deb` (installable)

**`apps/desktop/`** :
```
apps/desktop/
├── main.js          # BrowserWindow → NEOSTUDIO_URL (défaut : http://neostudio.neokube.local)
├── package.json     # electron + electron-builder, appId fr.neokube.neostudio
└── assets/
    └── icon.png     # 512×512 violet-600
```

**Fonctionnalités** :
- Charge `NEOSTUDIO_URL` (env var, défaut `http://neostudio.neokube.local`)
- Page d'erreur "Connexion impossible" avec bouton Réessayer si le cluster est injoignable
- Menu application : Recharger (Ctrl+R), DevTools (F12), Quitter (Ctrl+Q)
- Liens externes (`!neokube`) ouverts dans le navigateur système
- `backgroundColor: #09090b` — évite le flash blanc au chargement

**Build CI** : `.github/workflows/desktop.yml`
- Déclenché sur `push tags v*` ou `workflow_dispatch`
- Produit artifacts GitHub Actions (30j de rétention)
- Attache les fichiers à la GitHub Release si tag

**Utilisation** :
```bash
# Télécharger le dernier build depuis GitHub Actions artifacts ou Release
chmod +x NeoStudio-0.1.0.AppImage && ./NeoStudio-0.1.0.AppImage
# ou
dpkg -i neostudio-desktop_0.1.0_amd64.deb && neostudio-desktop

# Pointer vers une URL custom
NEOSTUDIO_URL=https://neostudio.neokube.fr ./NeoStudio-0.1.0.AppImage
```

---

### Détail Phase 1 abandonnée — Tentative intégration superset-sh/superset (2026-05-23)

**Tentative** : remplacer `apps/ui/` par `apps/web` du fork superset-sh/superset.

**Raisons d'échec** :
- `apps/web` est une UI **desktop-first** conçue pour Electron — données toutes hardcodées (mock)
- Dépendances non-négociables : Neon (DB), Resend (email), Better Auth (OAuth Google/GitHub)
- Redirect loop auth (`/` → `/sign-in` → `/agents` → `/sign-in` × 10)
- Stack trop couplée au cloud Superset — pas de mode "standalone NeoKube"

**Décision** : conserver et améliorer l'UI custom Phase C. Ne pas réessayer l'intégration superset.

---

## Anti-patterns NeoStudio

| # | Piège | Règle |
|---|---|---|
| UI-1 | UI couplée aux agents | L'UI ne parle **jamais** directement à Charlotte/Leon/LiteLLM. Tout passe par l'Engine. |
| UI-2 | `output: 'standalone'` Next.js en Docker monorepo | Le bundle standalone ne résout pas `node_modules/next` dans le runner si les paths ne correspondent pas. Fix : `bun run start` (non-standalone). |
| UI-3 | `--frozen-lockfile` sans `bun.lockb` | Échoue si pas de lock file commité. Omettre le flag pour les nouveaux projets. |
| UI-4 | `public/` manquant → Docker COPY échoue | `COPY --from=builder /app/public ./public` échoue si absent. Toujours créer `public/.gitkeep`. |
| UI-5 | CI trigger ne couvre pas `main` | Jobs `if: github.ref == 'refs/heads/main'` ne se déclenchent jamais si `on.push.branches` ne liste pas `main`. |
| UI-6 | `apps/engine/Dockerfile` inexistant | Le Dockerfile engine est dans `docker/Dockerfile.linux`. Toujours vérifier `git ls-files | grep Dockerfile`. |
| UI-7 | Stream déclenché mais jamais consommé | `AgentPromptInput` envoie le message et redirige — personne n'appelle `GET /stream`. Fix : `useEffect` dans `page.tsx` avec guard `useRef` one-shot. |
| UI-8 | `streamingContent` jamais persisté | Le texte streamé s'affiche en live mais disparaît à la fin si on ne le copie pas dans `messages` state. Fix : `finally` block → push dans `messages`, vider `streamingContent`. |
| UI-9 | Chunks SSE coupés | `decoder.decode(value)` sans `{ stream: true }` + `chunk.split("\n")` coupe les lignes SSE en plein milieu. Fix : buffer accumulateur + `lines.pop()` pour garder la ligne incomplète. |
| UI-10 | Type error TypeScript bloque la build CI | Passer un prop non déclaré dans les types TS → build Docker échoue. TypeScript Check + Tests passent (ils ne font pas `next build`) mais le job Docker échoue. Toujours déclarer les props dans les types avant d'utiliser. |
| UI-11 | `git status --porcelain` masque les fichiers dans des répertoires non-trackés | `?? src/` au lieu de `?? src/greet.ts` — le diff retourne 0 fichier. Fix : `--untracked-files=all`. Ajouter aussi un guard `statSync().isDirectory()` pour ignorer les entrées répertoire résiduelles. |
| UI-12 | `initWorkspace` non appelé sur `POST /workspace/file` | Pour les sessions existantes ou créées avant la feature, le workspace n'a pas de `.git`. Écriture silencieuse sans versionning → diff toujours vide. Fix : `initWorkspace()` en début du handler file-write (idempotent). |
| UI-13 | SSE job deploy GitHub Actions échoue à la première exécution | `ops.neokube.fr` CNAME + route tunnel créés juste avant le push → DNS non propagé pendant le run CI. Pas un bug permanent. Si échec : vérifier depuis l'extérieur avec `curl https://ops.neokube.fr/health`, puis relancer le job via GitHub API `rerun-failed-jobs`. |
| UI-14 | electron-builder ne supporte pas les versions semver avec `^` | `"electron": "^31.7.6"` → `Cannot compute electron version` à la build. Fix : version exacte sans caret `"electron": "31.7.6"`. |
| UI-15 | electron-builder + monorepo npm workspaces → `ENOENT 7zip-bin` | `apps/*` dans les workspaces → npm hisse `7zip-bin` à la racine → electron-builder ne le trouve pas. Fix : (1) lister explicitement les workspaces sans `apps/desktop` dans le root `package.json` ; (2) ajouter `workspaces=false` dans `apps/desktop/.npmrc`. |
| UI-16 | `.deb` electron-builder exige `homepage` dans `package.json` | `Error: Please specify project homepage` au build deb. Fix : ajouter `"homepage": "https://..."` dans `apps/desktop/package.json`. AppImage n'a pas cette contrainte. |
| UI-17 | `fetch()` direct sans Bearer → 401 silencieux après activation de l'auth | Dès que `AUTH_PASSWORD` est défini dans l'env Engine, tous les appels `fetch()` directs retournent 401 sans message d'erreur visible. Fix : remplacer chaque `fetch(...)` par `authFetch(...)` (depuis `@/lib/auth`). `authFetch` injecte le Bearer et redirige vers `/login` automatiquement sur 401. Checklist : `grep -r "fetch(" apps/ui/src --include="*.tsx" | grep -v authFetch` doit retourner 0 résultat (hors lib/auth.ts lui-même). |
| UI-18 | WebSocket browser ne supporte pas les headers `Authorization` | `new WebSocket(url)` ignore tout header custom. Pour le terminal ttyd proxy, passer le JWT via query param : `?token=<jwt>`. Le moteur valide ce param dans le handler `fetch()` avant l'upgrade. Ne jamais mettre le token dans l'URL de production sans HTTPS (TLS obligatoire). |

---

## Workflow : Ticket Notion → Session NeoStudio → PR GitHub

Flux de développement standard avec NeoStudio comme interface de l'agent développeur.

### 1. Préparation

```bash
# Créer ou récupérer un ticket Notion → obtenir la spec
# Ouvrir NeoStudio : http://neostudio.neokube.local
# Choisir l'agent : Aria (frontend), Nox (backend), ou Dispatcher (full-stack)
```

### 2. Démarrer une session

Via `POST /api/v1/session/start` ou bouton "+" dans la sidebar :

```json
{
  "agentId": "aria",
  "repoPath": "/data/workspaces/<session-id>",
  "model": "codestral"
}
```

Le workspace git est initialisé automatiquement dans `/data/workspaces/<session-id>`.

### 3. Développer

1. **Chat** — envoyer la spec à l'agent. Il génère le code via `POST /:id/workspace/file`
2. **Activity Feed** — voir en temps réel les fichiers créés/modifiés (panel droit)
3. **Terminal** — `POST /:id/exec` ou WebSocket ttyd proxy pour exécuter des commandes
4. **Diff** — onglet Diff ou accordéon panel droit pour voir les changements git

### 4. Révision & commit

```bash
# Dans le terminal NeoStudio (session workspace)
git add .
git commit -m "feat: <description>"
git push origin <branch>
```

### 5. Créer la PR GitHub

```bash
gh pr create --title "<titre>" --body "<description>" --base main
```

### 6. Déploiement

Push sur `main` → GitHub Actions CI → build image → deploy K8s automatique.

---

### Git worktrees (isolation par branche)

Pour travailler sur plusieurs tâches en parallèle sans conflit :

```bash
# Via API Engine
POST /api/v1/worktree
{
  "repoPath": "/data/workspaces/<session-id>",
  "branchName": "feat/nouvelle-feature",
  "worktreePath": "/data/worktrees/feat-nouvelle-feature"
}

GET  /api/v1/worktree?repoPath=/data/workspaces/<session-id>
DELETE /api/v1/worktree/<branch-name>?repoPath=/data/workspaces/<session-id>
```

Chaque worktree est un checkout isolé de la même base git — les agents peuvent travailler en parallèle sur des branches différentes sans `stash`.
