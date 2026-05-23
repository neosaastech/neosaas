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

- Ingress `neostudio.neokube.fr` et `neostudio.neokube.local` :
  - `/api/v1` (Prefix) → `neostudio-engine:4242` **directement** (contourne Next.js — obligatoire pour le streaming SSE)
  - `/` (Prefix) → `neostudio-ui:3000`
- Next.js `rewrites()` gardé comme fallback dev local uniquement
- `ops.neokube.fr` → `admin-sys-agent:8000` (via Cloudflare tunnel, sans whitelist IP — usage CI uniquement)

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
│           ├── page.tsx                # ← LOGIQUE PRINCIPALE (streaming, SSE activité, état)
│           └── components/
│               ├── SessionPageContent.tsx  # Layout tabs + fetch diff on activation
│               ├── SessionChat.tsx         # Messages + typing indicator + CopyButton
│               ├── SessionHeader.tsx
│               ├── SessionTabs.tsx         # 4 onglets : chat / activité (badge violet) / diff (badge amber) / terminal
│               ├── SessionDiff.tsx         # FileDiffTool par fichier modifié (vrais contenus git)
│               ├── ActivityFeed.tsx        # Timeline SSE en temps réel (session.start/step/file.write/…)
│               ├── SessionTerminal.tsx     # iframe → http://ttyd.neokube.local
│               └── FollowUpInput.tsx       # Input follow-up + streaming

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
| **2** | Live Activity View + git workspace + Terminal + Diff + copy button | ✅ 2026-05-23 |
| **3** | Déploiement auto — GitHub Action → admin-sys via `ops.neokube.fr` | ✅ 2026-05-23 |
| **4** | App desktop Linux — `.AppImage` + `.deb` (Electron, `apps/desktop/`) | ✅ 2026-05-23 |

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
- Onglet "Terminal" dans `SessionTabs` (4ème onglet)

**Diff tab réel**

- `SessionPageContent` fetch `GET /api/v1/session/:id/diff` à l'activation de l'onglet Diff
- Badge amber avec compteur de fichiers modifiés
- `SessionDiff` affiche les `FileDiffTool` avec vrais contenus old/new

**Copy button**

- `CopyButton` sur chaque message (assistant + user) — visible au hover, feedback checkmark 1.5s

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
