# CLAUDE-neostudio.md — NeoStudio : Espace de développement multi-agent

## Vision

NeoStudio est l'**atelier de développement multi-agent de NeoKube**. Une UI chat dédiée qui expose les agents NeoKube (Charlotte, Leon, Aria, Nox, Vera, Dispatcher) dans une interface conversationnelle avec streaming SSE, identité visuelle par agent, et follow-up messages.

> **Note d'architecture (2026-05-23)** : L'approche initiale de fork du projet superset-sh/superset a été abandonnée. `apps/web` de superset est une UI desktop-first avec toutes les données mockées — non adaptable en temps raisonnable. L'UI est désormais un Next.js 15 custom maintenu dans `apps/ui/` du repo `charlesvdd/neostudio`.

```
┌─────────────────────────────────────────────────────────────┐
│              NeoStudio UI  (apps/ui)                        │
│         Next.js 15.3.2 + Tailwind v4 + Bun                 │
│     ghcr.io/charlesvdd/neostudio-ui:latest · port 3000      │
└────────────────────┬────────────────────────────────────────┘
                     │  fetch REST + SSE
                     │  (rewrite Next.js /api/v1/* → Engine)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NeoStudio Engine  :4242                        │
│           apps/engine (Bun + Hono)                         │
│  ghcr.io/charlesvdd/neostudio:latest                        │
│                                                             │
│  GET  /api/v1/agents              AgentProvider ConfigMap   │
│  POST /api/v1/session/start       Crée une session          │
│  POST /api/v1/session/:id/message Ajoute un message user    │
│  GET  /api/v1/session/:id/stream  SSE tokens agent          │
│  GET  /api/v1/session/:id/messages  Historique messages     │
│  GET  /api/v1/session/:id         Détail session            │
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
| Aria | `aria` | Frontend Builder — GitHub + Vercel + Penpot | codestral | LiteLLM `/v1/chat/completions` |
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
| **Images** | Engine : `ghcr.io/charlesvdd/neostudio:latest` · UI : `ghcr.io/charlesvdd/neostudio-ui:latest` |
| **Ports** | Engine : 4242 · UI : 3000 |
| **URL locale** | `http://neostudio.neokube.local` |
| **URL publique** | `https://neostudio.neokube.fr` |
| **Vault path** | `secret/neokube/apps/neostudio` → JWT_SECRET, LITELLM_API_KEY, GITHUB_TOKEN |
| **GitOps** | `~/Kubinote-GitOps/apps/interfaces/base/` (5 fichiers neostudio-*) |
| **imagePullSecret** | `ghcr-neostudio` (dans namespace `interfaces`) |

### Routing K8s

- Ingress `neostudio.neokube.fr` et `neostudio.neokube.local` → `neostudio-ui:3000`
- Next.js `rewrites()` : `/api/v1/*` → `http://neostudio-engine.interfaces.svc.cluster.local:4242/api/v1/*`
- Engine accessible directement en interne via son Service K8s

---

## Architecture UI — pages et composants clés

```
apps/ui/src/app/
├── agents/
│   ├── page.tsx                        # Grille agents (GET /api/v1/agents)
│   ├── components/
│   │   ├── AgentsHeader.tsx
│   │   ├── AgentCard.tsx
│   │   └── AgentPromptInput.tsx        # Crée session + envoie premier message → redirect
│   └── [agentId]/
│       └── session/[sessionId]/
│           ├── page.tsx                # ← LOGIQUE PRINCIPALE (streaming, état)
│           └── components/
│               ├── SessionPageContent.tsx  # Layout tabs chat/diff
│               ├── SessionChat.tsx         # Rendu messages + typing indicator
│               ├── SessionHeader.tsx
│               ├── SessionTabs.tsx
│               ├── SessionDiff.tsx
│               └── FollowUpInput.tsx       # Input follow-up + streaming
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

`isTyping = isStreaming && !streamingContent` — affiché dans `SessionChat` pendant la phase "thinking" (avant le premier token).

---

## Repos

| Repo | Rôle | Visibilité |
|---|---|---|
| `charlesvdd/neostudio` | Engine API + UI + GitOps config | Privé |
| `neomnia/Kubinote-GitOps` | Manifests K8s | Privé |

> Le fork `charlesvdd/superset` reste public mais n'est plus utilisé dans NeoStudio.

---

## CI/CD

| Étape | Déclencheur | Action |
|---|---|---|
| TypeScript Check | Push sur main | `tsc --noEmit` sur engine + ui |
| Tests | Push sur main | `bun test` |
| Build & Push Engine | Push sur main | `ghcr.io/charlesvdd/neostudio:latest` |
| Build & Push UI | Push sur main | `ghcr.io/charlesvdd/neostudio-ui:latest` |
| Déploiement K8s | **Manuel** | `kubectl rollout restart deployment/neostudio-ui -n interfaces` |

> **Gap** : le déploiement K8s n'est pas automatisé. Après chaque push image, il faut relancer manuellement le pod. À résoudre : GitHub Action → admin-sys `/apply` après push image.

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
git clone https://github.com/charlesvdd/neostudio
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
JWT_SECRET=xxx
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
| **2** | Persistance SQLite — remplacer in-memory sessions store | ⏳ À faire |
| **3** | Déploiement auto — GitHub Action → admin-sys `/apply` après push image | ⏳ À faire |
| **4** | App desktop Linux — compiler en `.deb` / `.AppImage` | ⏳ À faire |

### Détail Phase D — UI Chat amélioré (✅ 2026-05-23)

Améliorations apportées sur l'UI chat de base :

- **`GET /session/:id/messages`** ajouté à l'Engine (manquait — retournait 404)
- **Auto-stream** : `page.tsx` déclenche automatiquement le stream si le dernier message chargé est `role:"user"` (session créée par `AgentPromptInput` mais stream jamais appelé)
- **Identité visuelle** : avatar coloré + nom de l'agent au-dessus de chaque message assistant ; label "Vous" côté utilisateur
- **Typing indicator** : 3 points animés (`animate-bounce` avec délai décalé) pendant la phase "thinking" (avant le premier token)
- **Buffer SSE correct** : `decoder.decode(value, { stream: true })` + buffer ligne pour éviter les coupures de chunks
- **`onStreamDone`** : callback pour persister le message assistant dans `messages` state après fin du stream (follow-up)

### Détail Phase 1 abandonnée — Tentative intégration superset-sh/superset (2026-05-23)

**Tentative** : remplacer `apps/ui/` par `apps/web` du fork superset-sh/superset.

**Raisons d'échec** :
- `apps/web` est une UI **desktop-first** conçue pour Electron — les données sont toutes hardcodées (mock) dans le code
- Dépendances non-négociables : Neon (DB), Resend (email), Better Auth (OAuth Google/GitHub) — impossibles à stuber proprement
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
