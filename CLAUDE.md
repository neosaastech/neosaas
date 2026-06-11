# CLAUDE.md — Actions sur cette machine

## Contexte
Machine : `neokube-beta` (Linux)
Répertoire principal : `/home/neokube-beta`

---

## Synchronisation SharePoint

- **rclone bisync** — synchronisation bidirectionnelle
- Script : `/home/neokube-beta/.local/bin/sync-sharepoint.sh`
- Logs : `/home/neokube-beta/.local/share/rclone-sharepoint/<site>.log`

| Dossier local (`~/SharePoint/`) | Remote rclone |
|---|---|
| Alfie-Formation | sp-Alfie-Formation: |
| All-Company | sp-All-Company: |
| Archives | sp-Archives: |
| Finances | sp-Finances: |
| Management | sp-Management: |
| Neolabs | sp-Neolabs: |
| Neomnia-publishing | sp-Neomnia-publishing: |
| Personnel | sp-Personnel: |
| Production-clients | sp-Production-clients: |
| Service-Informatique | sp-Service-Informatique: |
| Service-Marketing | sp-Service-Marketing: |
| Strategie | sp-Strategie: |

```bash
~/.local/bin/sync-sharepoint.sh Production-clients   # sync un site
~/.local/bin/sync-sharepoint.sh                      # sync tous (parallèle)
rclone listremotes                                    # vérifier les remotes
rclone lsd sp-Production-clients:                    # tester la connexion
tail -f ~/.local/share/rclone-sharepoint/Production-clients.log
```

---

## Tokens / Auth
- `~/token.json` — token Microsoft (OneDrive/SharePoint global)
- `~/token_oneline.json` — variante token
- Tokens rclone : `~/.config/rclone/rclone.conf`

---

## Dossiers notables
| Chemin | Description |
|---|---|
| `~/SharePoint/` | Tous les sites SharePoint synchronisés |
| `~/SharePoint/Production-clients/` | Dossiers clients de production (31 entrées) |
| `~/onedrive/` / `~/OneDrive/` | OneDrive personnel |
| `~/openapi-servers/` | Serveurs OpenAPI (compose.yaml) |
| `~/Kubinote-GitOps/docs/` | Miroir des `CLAUDE-*.md` — source RAG Charlotte |

---

## Synchronisation CLAUDE-*.md ↔ Charlotte RAG

**Principe** : Claude Code est le seul maître des `CLAUDE-*.md`. Charlotte les lit via RAG (jamais d'écriture directe). La sync est automatique à chaque édition.

### Flux A — Claude Code → Charlotte RAG (automatique)

```
Claude Code édite CLAUDE-*.md (Edit/Write)
    → hook PostToolUse (.claude/settings.json)
    → scripts/sync-charlotte-docs.sh
        ├─ cp CLAUDE-*.md → ~/Kubinote-GitOps/docs/
        ├─ git commit + push origin main
        └─ scripts/index-claude-docs-surfsense.py (SurfSense)
    → scripts/index-architecture-docs.py (Qdrant neokube-architecture)
    → Charlotte lit la collection à chaque mission complexe
```

### Flux B — Langfuse → local (détection de divergence, manuel)

```
Langfuse prompt "charlotte-sre" (runtime Charlotte)
    → scripts/pull-charlotte-prompt.sh          # compare seulement
    → scripts/pull-charlotte-prompt.sh --apply  # écrit + push GitOps
    → CLAUDE-charlotte-prompt.md mis à jour
```

**Règle** : Langfuse est la source de vérité LLM (ce que Charlotte exécute). `CLAUDE-charlotte-prompt.md` est la référence Claude Code (ce qu'on documente). Si elles divergent → investiguer avant de pousser.

### Commandes utiles

```bash
# Forcer une resync manuelle (après modif CLAUDE-*.md hors session Claude Code)
bash ~/scripts/sync-charlotte-docs.sh

# Vérifier si le prompt Langfuse a dérivé par rapport au fichier local
bash ~/scripts/pull-charlotte-prompt.sh

# Ré-indexer la collection neokube-architecture dans Qdrant
python3 ~/scripts/index-architecture-docs.py

# Ré-indexer les collections KB dev (k8s-knowledge, temporal-knowledge, python-agent-patterns, dev-process)
python3 ~/scripts/index_kb_knowledge.py

# Vérifier l'état des collections
curl -s http://qdrant.neokube.local/collections/neokube-architecture | python3 -m json.tool
for col in k8s-knowledge temporal-knowledge python-agent-patterns dev-process; do
  echo "$col: $(curl -s http://qdrant.neokube.local/collections/$col | python3 -c 'import json,sys; print(json.load(sys.stdin).get(\"result\",{}).get(\"points_count\",\"?\"))')" points
done
```

### Périmètre écriture Charlotte

Charlotte est le **Maître NeoKube** — elle a accès en écriture à l'ensemble de l'infrastructure associée à NeoKube. La RAG qu'elle gère lui donne le contexte sur tous les systèmes, et ses 49 outils lui permettent d'agir sur chacun d'eux.

| Système | Charlotte écrit ? | Mécanisme |
|---|---|---|
| GitOps K8s (`/gitops/`) | ✅ | `write_file` + `apply_gitops_fix` → push GitHub |
| Ressources K8s | ✅ | `kubectl_apply` via admin-sys |
| Paramètres serveur hébergeur | ✅ | `ssh_exec` + `scaleway_api` |
| Notion | ✅ | `notion_update_page` + `notion_create_page` (notion-connector:8011) |
| Qdrant (toutes collections) | ✅ | `_qdrant_upsert` interne — incidents, session memory, apprentissage, provision `{agent}-memory` |
| Zoho Projects | ✅ | `zoho_create_project/task/milestone/tasklist/issue` — scope `ZohoProjects.bugs.ALL` actif depuis 2026-05-29 |
| DNS Cloudflare | ✅ | `cloudflare_dns_add` |
| GitHub / Vercel | ✅ | `trigger_dispatcher_workflow` + `trigger_vercel_deploy` |
| Vault K8s secrets | ✅ | `patch_k8s_secret` |
| `CLAUDE-*.md` sur neokube-beta | ❌ | **Intentionnel** — pas montés dans le pod Charlotte, maintenus par Claude Code |
| Son propre code (`sre_agent.py`, `configmap-sre-script.yaml`) | ❌ | Guard dur + ntfy immédiat |

**Seules deux zones sont interdites** : les fichiers source docs sur la machine hôte (sync unidirectionnel Claude Code → RAG), et son propre code (anti-boucle). Sur tout le reste, Charlotte agit en autonomie.

---

## Architecture DNS & Cloudflare

> Documentation complète (process ajout service, tokens, CNAMEs, domaines, zones) : **[CLAUDE-dns.md](CLAUDE-dns.md)**

**Référence** : `neokube.fr` (NS Cloudflare depuis 2026-05-03) — `neomnia.net` reste actif mais n'est plus la référence.
**Tunnel** : `94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb.cfargotunnel.com` — Zone ID neokube.fr : `891229575324408767bf4a0293e5adcc`
**Tokens Vault** : `CF_GLOBAL_KEY` (création zones) · `CF_API_TOKEN` (tunnel/analytics) · `CF_DNS_TOKEN` (DNS CRUD)

---

## Architecture cluster Kubernetes

> Volumes persistants, collections Qdrant, namespaces Temporal : **[CLAUDE-cluster.md](CLAUDE-cluster.md)**

**Cluster** : `kubinote` (single-node, 12 CPU, 32 GB RAM)
**GitOps** : `~/Kubinote-GitOps/` — kustomize, **déploiement 100% MANUEL** (`kubectl apply -f` ou `kubectl replace -f`). Aucun controller automatique (pas de Flux/ArgoCD). Git = source de vérité, mais les changements ne s'appliquent pas sans action manuelle ou `apply_gitops_fix` Charlotte.
**Ingress** : Traefik, IP `192.168.1.28`, middleware whitelist `kube-system-local-ip-whitelist@kubernetescrd`

### Namespaces
| Namespace | Contenu |
|---|---|
| `kube-system` | Traefik, Headlamp, CoreDNS, metrics-server, **cloudflared** (tunnel, 2 replicas) |
| `cockpit` | LiteLLM, Langfuse, Langfuse-postgres |
| `interfaces` | Open WebUI, admin-sys-agent, ttyd, **ntfy** (v2.11.0), **whisper-server** (STT local port 8394), **voice-gateway** (WS port 8393), **media-gateway** (préprocessing multimodal CLASS A port 8395) |
| `agent-system` | Charlotte SRE, Leon, **Camille**, **Guillaume**, **Joseph**, Temporal, zoho-discovery, zoho-observer |
| `connector-system` | zoho(8000), github(8001), vercel(8002), neon(8003), **penpot-engine**(8004), openprovider(8005), cloudflare(8006), stalwart(8007), google-discovery(8008), crawlee(8009), dataforseo(8010), **notion**(8011), **github-mcp**(8080 MCP streamable-http) |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-agent-injector, vault-unsealer |
| `management` | CronJob cluster-bootstrap (Temporal NS uniquement), neokube-nightly-backup |
| `penpot` | Penpot (design) |
| `stalwart` | Stalwart Mail Server v0.11.8 — SMTP/IMAP/Sieve |
| `dify` | Dify v1.13.3 (agent builder studio) |
| `surfsense` | SurfSense — 7 composants : postgres, redis, searxng, backend, celery, zero-cache, frontend |
| `monitoring` | Grafana + Loki (30j rétention) + Promtail (DaemonSet) |
| `librechat` | LibreChat (interface chat multi-modèles) + MongoDB + Meilisearch — `http://librechat.neokube.local` / `https://librechat.neokube.fr` |

### Politique LLM & Embeddings
**100% API externes** (Gemini, Mistral, OpenAI, Anthropic) — aucun LLM local dans le cluster.

**Budgets LiteLLM — limites QUOTIDIENNES obligatoires** (`budget_duration=1d`) :

| Agent | Budget/jour | Modèle principal |
|---|---|---|
| Charlotte | **15 $** | mistral → claude-sonnet (fallback) |
| Leon | **6 $** | gpt-4o |
| Camille / Guillaume / Joseph | **1 $** | codestral / mistral-large |
| Alain / Domi *(planifiés)* | **0.5 $** | codestral / mistral |
| **Plafond total** | **18 $/jour** | — |

**Règle** : toujours `budget_duration=1d` — jamais `1mo`. Un dérapage en session intensive (boucle de dispatch, sessions concurrentes) peut brûler le budget mensuel en une journée. Le reset quotidien automatique protège. **Alert ntfy** dès 80% du budget → tâche `[Charlotte] Alertes budget LiteLLM` ouverte (2026-05-30).
**Modèle embeddings** : `paraphrase-multilingual-mpnet-base-v2` (768 dims) — servi par **embed-service K8s interne** (`embed-service.rag-system:8080`, 100% local, gratuit)
**Alias LiteLLM** : `nomic-embed-text` → embed-service interne (primaire) · `oai-embed-small` → OpenAI fallback · `huggingface-embed` → HuggingFace fallback
**HuggingFace** : clé `HUGGINGFACE_API_KEY` dans Vault `secret/neokube/llm-api-keys` + `cockpit-secrets`. Connectivité OK via `router.huggingface.co`. Ancienne URL `api-inference.huggingface.co` **NXDOMAIN** depuis 2026-05 (domaine supprimé). Crédits gratuits mensuels — HTTP 402 si épuisés.

### Interfaces web locales
| URL | Service |
|---|---|
| `http://headlamp.neokube.local` | Headlamp (dashboard K8s) |
| `http://open-webui.neokube.local` | Open WebUI |
| `http://ttyd.neokube.local` | Terminal web |
| `http://litellm.neokube.local` | LiteLLM proxy |
| `http://langfuse.neokube.local` | Langfuse (observabilité LLM) |
| `http://temporal.neokube.local` | Temporal UI |
| `http://dify.neokube.local` | Dify (agent builder) |
| `http://penpot.neokube.local` | Penpot (design) |
| `http://qdrant.neokube.local` | Qdrant (API vectorielle) |
| `http://api.neokube.local` | admin-sys-agent |
| `http://mail-admin.neokube.local` | Stalwart Mail Admin |
| `http://webmail.neokube.local` | Roundcube webmail |
| `http://grafana.neokube.local` | Grafana — logs cluster |
| `http://ntfy.neokube.local` | ntfy — notifications push |
| `http://librechat.neokube.local` | LibreChat (chat multi-modèles via LiteLLM) |

### CronJobs cluster
| CronJob | Namespace | Schedule | Rôle |
|---|---|---|---|
| `cluster-bootstrap` | management | `*/5 * * * *` | **Namespaces Temporal uniquement** — PAS de GitOps apply |
| `neokube-nightly-backup` | management | `0 3 * * *` | Sauvegarde nightly |
| `llm-key-sync` | cockpit | `0 * * * *` | Sync clés LLM Vault → K8s |
| `llm-key-validation` | cockpit | `30 6 * * *` | Valide clés LLM critiques (openai/anthropic/mistral) + bilan solde matin (8h Paris) et soir (20h Paris) par agent |
| `dify-bootstrap` | dify | `0 4 1 1 *` | Bootstrap Dify annuel |
| `agent-eval-nightly` | agent-system | `0 2 * * *` | Évalue 9 agents, alerte ntfy si avg < 7.5 |

---

## Architecture agents

> Charlotte internals, RBAC, admin-sys API, DevProjectWorkflow, R9, Checklist nouvel agent : **[CLAUDE-agents.md](CLAUDE-agents.md)**
> Sécurité agents (sidecars tool-validator + output-guard, policies) : **[CLAUDE-agents.md](CLAUDE-agents.md)**
> **Joseph v3.0 — UX/Design Strategist** (outils Figma/Penpot, pipeline URL→shapes, RAG design-knowledge, routing Leon→Joseph) : **[CLAUDE-joseph.md](CLAUDE-joseph.md)**
> **Charlotte SRE v4.1 — PydanticAI** (ReAct loop natif, FallbackModel claude-sonnet→mistral, MCPServerStreamableHTTP, 41 outils, guards inchangés) + protocole de remédiation sécurisé + **SREScanWorkflow Bloc D actif** (sre_analyze_with_llm branché, sre_execute_recommendations, ntfy toutes raisons) : **[CLAUDE-agents.md](CLAUDE-agents.md)**

> **Charlotte = maître NeoKube** — elle est responsable de TOUTE l'infrastructure : cluster K8s, cloud Scaleway (billing, dépenses, sécurité IAM, rotation clés API, MFA, projets), monitoring (Grafana/Prometheus/Loki), GitOps, Vault, agents déployés. **Frontière claire** : Charlotte gère l'infrastructure — Leon gère les projets métier nouveaux (site web, API, scraping external). Ne jamais renvoyer vers Leon pour une question infrastructure/Scaleway.

| Agent | Rôle | Runtime | Port | Temporal NS | Status |
|---|---|---|---|---|---|
| **Charlotte** | **Maître NeoKube** — SRE cluster K8s + infrastructure cloud Scaleway (billing, sécurité IAM, rotation clés, MFA) + monitoring + GitOps + Vault. Blocs SRE A→H. | Temporal | 8383 | `sre-charlotte` | active v4.1 (PydanticAI, FallbackModel, MCP natif, Bloc D LLM actif) |
| **Leon** | Chef de Production — REVIEW (Notion+normes→spec) + TASK (CLARIFYING→dispatch) | FastAPI+Temporal | 8181 | `leon` | active v3.4 (REVIEW mode, notion_update_page, 8 intent labels dont `audit`, R9.13 classify cascade claude-sonnet→gpt-4o, zoho_delete_projects confirmed gate, R6, `delegate_to_charlotte` read-only audit, **GitHub tools** via github-connector: list/create/read/write/branch/PR, **Vercel tools** via vercel-connector: list/deploy/logs/create) |
| **Camille** | Frontend Builder — GitHub repo (template-nextjs) + Vercel + Penpot export | FastAPI | 8485 | — | active v3.1 (GitHub MCP + /mission, dispatché par Leon) |
| **Guillaume** | Backend Builder — GitHub repo (template-fastapi) + Neon branch | FastAPI | 8486 | — | active v3.1 (GitHub+Neon MCP + /mission, dispatché par Leon) |
| **Joseph** | UX/Design Strategist — audit UX, wireframes, Penpot + **Figma** (get_file, to_slides, design_tokens, visual_audit) · voir **[CLAUDE-joseph.md](CLAUDE-joseph.md)** | FastAPI | 8492 | — | actif v3.0 (OWU pipe `joseph_design`, figma-engine branché) |
| **Alain** | DevOps Projet — CI/CD GitHub Actions + env vars Vercel + Neon conn string | FastAPI | 8494 | — | ⚠️ planifié — configmap existe, aucun pod déployé |
| **qa-service** | QA Reviewer — analyse spec + output Camille/Guillaume/Alain/Penpot | HTTP | 8487 | — | ⚠️ planifié — aucun pod déployé |
| **Domi** | Domain Infrastructure Manager — provision domaine + DNS + projet Scaleway client | Temporal | 8489 | `domi` | ⚠️ planifié — configmap existe, aucun pod déployé |
| **admin-sys** | K8s executor — kubectl délégué par Charlotte | FastAPI | 8000 | — | active v6.0 |
| **zoho-tasks** | Abstraction Zoho Projects (outil partagé) | Temporal | — | — | active v1.0 |

**admin-sys v6.0** : `/execute` (kubectl) + `/apply` (manifest) + `/helm` + `/hosts` (/etc/hosts nœud) + `/ssh` (nœud externe) — auth `X-Admin-Sys-Token`, namespace `interfaces`.

**Charlotte — Délégation Leon (v4.0)** : Charlotte délègue le pipeline métier à Leon via deux outils :

| Outil Charlotte | Endpoint Leon | Rôle |
|---|---|---|
| `trigger_leon_workflow(dev_project, spec)` | `POST leon:8181/mission` intent=dev_project | Lance le pipeline complet via Leon |
| `trigger_leon_workflow(check_status)` | `POST leon:8181/mission` intent=check_status | Liste les projets en cours |
| `signal_leon_workflow(project_id, approve)` | `POST leon:8181/mission` intent=project_signal | Approuve une phase projet |
| `signal_leon_workflow(project_id, reject)` | `POST leon:8181/mission` intent=project_signal | Rejette une phase projet |
| `trigger_leon_workflow(design_deploy, penpot_id)` | `POST leon:8181/mission` intent=design_deploy | Lance Penpot → Vercel via Leon+Camille |

### Vault — carte des chemins

> Carte complète Vault → K8s secrets + mécanismes de sync + règles secret leak : **[CLAUDE-vault.md](CLAUDE-vault.md)**
>
> **Règle** : avant de déclarer un secret "absent de Vault", consulter cette carte. Les secrets K8s `openai-secret`, `anthropic-secret`, `cockpit-secrets` sont des **outputs** du CronJob `llm-key-sync` — ils sont bien dans Vault.
>
> **Règle secret leak** : un agent ne doit JAMAIS lire un K8s secret via `kubectl get secret` et inclure la valeur dans sa réponse. Pattern obligatoire : `Vault → Vault agent injection → /vault/secrets/<name> sourcé → os.environ["VAR"]`. Voir anti-pattern #45 et CLAUDE-vault.md §Règle absolue.
>
> **Charlotte** : credentials Scaleway (`SCW_SECRET_KEY`, `SCW_ORG_ID`) injectés par Vault agent au démarrage depuis `secret/neokube/infrastructure/scaleway`. Rôle Vault `charlotte` + policy `charlotte-policy` actifs depuis 2026-05-19.

### Connector-system & MCP Servers

> Architecture complète, MCP servers, endpoints, règles R1–R6, zoho-engine v2.0 : **[CLAUDE-connector.md](CLAUDE-connector.md)**
> **scaleway-engine v1.0** (à déployer) — accès API Scaleway centralisé, RBAC par agent, port 8012 : **[CLAUDE-scaleway-engine.md](CLAUDE-scaleway-engine.md)**

> **Leon v3.4 — Chef de Production** (mode REVIEW : notion_read_page + notion_update_page → spec corrigé → validation → Zoho ; mode TASK : Q0 Notion + CLARIFYING Charlotte pattern + dispatch déterministe design→Joseph ; `zoho_delete_projects` confirmed gate + protocole 3-étapes ; intent `audit` 3-axes normes/Zoho/doc + Patterns A/B/C + `cluster_status` Phase 3 INFRA + `delegate_to_charlotte` read-only services externes + MAD pre/post-store ; R9.13 cascade classify claude-sonnet→gpt-4o→mistral ; règle R6 connector ; **GitHub tools** via github-connector Phase 1b : 8 outils list/create/read/write/branch/PR ; **Vercel tools** via vercel-connector Phase 1b : 6 outils list/deploy/logs/create/learn) : **[CLAUDE-leon.md](CLAUDE-leon.md)**
> **Leon ↔ Zoho** : Leon passe **toujours** par `zoho-engine` v2.0 (K8s: \`zoho-engine\`, port 8000) — 7 endpoints : `/proxy` (générique), `/scaffold` (création projet+jalons atomique), `/delete-projects` (confirmed gate), `/milestone.delete` (⚠️ completion Zoho impossible via REST — anti-pattern #53), `/project.status`, `/task.update`. L'OAuth2 est transparent. `zoho_api(method, path, data?)` = proxy générique pour tout endpoint non couvert. Suppression = protocole 3 étapes obligatoire (`zoho_list_projects` → présenter liste → `zoho_delete_projects(confirmed=True)`). Architecture complète : **[CLAUDE-leon.md §Architecture Leon ↔ Zoho](CLAUDE-leon.md)**
> **Méthodologie gestion de projet, normes Neomnia, template CDC, règles interview client** : **[CLAUDE-leon-process.md](CLAUDE-leon-process.md)**
> **RAG agents** : écosystème Qdrant complet (collections, agents, fonctions) : **[CLAUDE-agents.md §RAG](CLAUDE-agents.md)** · Tableau collections + points : **[CLAUDE-cluster.md](CLAUDE-cluster.md)**
> `leon-memory` (Leon) · `template-neosaas` + `design-knowledge` (Camille) · `design-knowledge` + `neomnia_core` (Joseph) · `sre-charlotte-incidents` (Charlotte)
> Script ré-indexation Leon : `~/scripts/index_leon_process.py`

Tous les connectors : `GET /health` + `POST /proxy {method?, path, params?, body?}` — credentials depuis Vault auto.

**Notion-connector (port 8011)** — endpoints spécialisés : `POST /search` · `GET /read-content/{id}` · `POST /create-page` · `PATCH /update-page/{id}` · `POST /replace-content/{id}` · `POST /append-blocks/{id}` · `POST /move-page/{id}`
**Charlotte** : outils `notion_read_page`, `notion_search`, `notion_update_page`, `notion_create_page` — tous via notion-connector (jamais appel direct API Notion).

**MCP Servers (couche préférée pour GitHub, K8s, Neon) :**

| Serveur | Namespace | Endpoint | Agents |
|---|---|---|---|
| `github-mcp` | `connector-system` | `:8080/mcp` (streamable-http) | Camille, Guillaume, Alain, Dispatcher |
| `k8s-mcp` | `agent-system` | `:8080/mcp` (streamable-http) | Charlotte |
| `mcp.neon.tech` | remote | `https://mcp.neon.tech/sse` | Guillaume |

---

## Cycle de vie d'un projet — Planification → Production

> Détail complet (phases, flux, gaps résolus) : **[CLAUDE-pipeline.md](CLAUDE-pipeline.md)**

| Phase | Agent | Déclencheur | Sortie |
|---|---|---|---|
| **Exploration** | Charlotte | Mention projet → `project_health_check` | Bilan ✅/❌ Zoho/GitHub/Vercel/Penpot/Notion |
| **Planification** | Leon | Brief → dialogue 10 tours → `dispatch_project` | ProjectSpec 13 champs + projet Zoho structuré |
| **Production** | Leon → asyncio.gather(Camille+Guillaume+Joseph) | `milestone_closed` depuis zoho-observer | 2 repos GitHub, CI/CD, Vercel deploy, Neon branch, Penpot design |
| **Design→Code** | Charlotte → Leon → Camille | `trigger_leon_workflow(design_deploy, penpot_id)` | Branche GitHub `design/penpot-export-{id}` + Vercel preview |

**Gaps** : ~~trigger Zoho status → production~~ ✅ · ~~mapper Zoho→ProjectSpec~~ ✅ · ~~email enrichi étape par étape~~ ✅ (tous résolus 2026-05-12)

---

## Monitoring, Alertes & Données Scaleway

> Documentation complète (pipeline billing, métriques Prometheus, dashboards Grafana, alertes ntfy,
> situation hacking mai 2026, RBAC, points de vigilance) : **[CLAUDE-monitoring.md](CLAUDE-monitoring.md)**

**Scaleway billing NET** : `scaleway_billing_total_euros` (après crédit) — mai 2026 : brut 2878€, crédit -2878€, **net = 0€**
**Requête rapide** : `kubectl exec -n monitoring deployment/prometheus -- wget -qO- "http://localhost:9090/api/v1/query?query=scaleway_billing_total_euros" 2>/dev/null`
**Dashboard** : `https://grafana.neokube.fr/d/scaleway-pilot` — refresh 5 min
**Sources Charlotte** : `scaleway-billing-history` + `scaleway-inventory-snapshot` (ConfigMaps management) + Prometheus

---

## Notifications ntfy

> Documentation complète (comptes, mobile, sources, pattern, recréer comptes) : **[CLAUDE-ntfy.md](CLAUDE-ntfy.md)**

**URL** : `http://ntfy.interfaces.svc.cluster.local/neokube-alerts` (interne) · `https://ntfy.neokube.fr` (public)
**Topic** : `neokube-alerts` — **Agent** : `agent` / `NtfyAgent2026!` — **Admin** : `admin` / `Neomnia2026!`
**Vault** : `secret/neokube/apps/ntfy` — `NTFY_ADMIN_PASSWORD`, `NTFY_AGENT_PASSWORD`

---

## Stalwart Mail Server v0.11.8

> Documentation complète (10 gotchas config, DNS neokube.fr, Scaleway TEM relay) : **[CLAUDE-stalwart.md](CLAUDE-stalwart.md)**

**Instance** : Docker Scaleway fr-par-1 — SSH : `ssh -i ~/.ssh/id_ed25519_neokube root@51.15.253.114`
**Vault** : `secret/neokube/apps/stalwart` — `ADMIN_PASSWORD`, `NOREPLY_PASSWORD`
**Webadmin** : `http://mail-admin.neokube.local` — login `admin` / Vault `ADMIN_PASSWORD`
**SMTP interne** : `stalwart-mail.stalwart.svc.cluster.local:587` — plaintext, `start_tls=False`

**Comptes agents** : `no-reply@`, `leon@`, `vera@`, `domi@`, `aria@`, `nox@neokube.fr`
**Tous les comptes doivent avoir `roles: ["user"]`** sinon Stalwart retourne 550 5.7.1.
**`session.auth.mechanisms`** : string `"[plain, login, oauthbearer]"` — PAS un tableau TOML.
**`admin@neokube.fr` ne peut pas recevoir de mails** — utiliser `chvandendriessche@neomnia.net` pour les alertes.

---

## NeoStudio — Espace de développement multi-agent

> Documentation complète (architecture, phases, processus dev, anti-patterns) : **[CLAUDE-neostudio.md](CLAUDE-neostudio.md)**

**Accès** : `http://neostudio.neokube.local` / `https://neostudio.neokube.fr`
**Repos** : `charlesvdd/neostudio` (Engine + UI custom + GitOps config)
**GitOps** : `~/Kubinote-GitOps/apps/interfaces/base/` (5 fichiers neostudio-*)
**Vault** : `secret/neokube/apps/neostudio` — JWT_SECRET, LITELLM_API_KEY, GITHUB_TOKEN
**Images** : Engine `ghcr.io/charlesvdd/neostudio:latest` · UI `ghcr.io/charlesvdd/neostudio-ui:latest` — CI/CD : push main → build auto, déploiement K8s manuel (`kubectl rollout restart`)

**Stack** : Engine Bun/Hono :4242 ✅ · UI Next.js 15 custom :3000 ✅ (Phase D — chat avec identité agent + typing indicator)
**Agents exposés** : Charlotte · Leon · Camille · Guillaume · Joseph (via `NEOSTUDIO_AGENTS_CONFIG` ConfigMap)
**Note** : neostudio-hub à 0/1 replicas — vérifier avant usage.

---

## Dify v1.13.3 — Agent Builder Studio

> Documentation complète (composants, stockage, secrets, intégrations) : **[CLAUDE-dify.md](CLAUDE-dify.md)**

**Accès** : `http://dify.neokube.local` / `https://dify.neokube.fr` — GitOps : `~/Kubinote-GitOps/apps/dify/base/`

---

## Voix & Audio

> Documentation complète (stack audio, endpoints, architecture, gaps) : **[CLAUDE-audio.md](CLAUDE-audio.md)**

**Stack voix active** (déployée 2026-05-19) :

| Capacité | Backend | Service K8s | Statut |
|---|---|---|---|
| STT (parole→texte) | `faster-whisper` base, CPU int8 | `whisper-server.interfaces:8394` | ✅ Déployé (local, gratuit) |
| TTS (texte→parole) | `voxtral-mini-tts-latest` Mistral | `media-gateway.interfaces:8395/v1/audio/speech` (proxy stable) | ✅ Actif via media-gateway |
| Voice gateway WebSocket | FastAPI WS + whisper STT + LiteLLM + Mistral TTS | `voice-gateway.interfaces:8393` | ✅ `https://voice.neokube.fr/` |
| Audio chat (compréhension audio) | `voxtral-small-latest` | — | ⏳ Phase 3 |
| OCR images (PNG, JPEG) | `pixtral-large-latest` via alias `pixtral` | LiteLLM | ✅ Filter OWU actif |
| OCR PDFs | `mistral-ocr-latest` (API directe) | — | ✅ Filter OWU actif (valve) |

**media-gateway** : point d'entrée OWU pour tous les agents CLASS A — `http://media-gateway.interfaces.svc.cluster.local:8395`. Prétraite images (Pixtral) et audio (Whisper), et sert de **proxy TTS stable** (`/v1/audio/speech` → Mistral). Les agents restent text-only.
**whisper-server** : `STT_ENGINE=openai`, `AUDIO_STT_OPENAI_API_BASE_URL=http://whisper-server.interfaces.svc.cluster.local:8394/v1` — OWU natif + voice-gateway + media-gateway l'utilisent.
**voice-gateway** : WebSocket `wss://voice.neokube.fr/ws` — push-to-talk browser → whisper STT → LiteLLM (charlotte/leon/…) → Mistral TTS.
**TTS** : `TTS_ENGINE=openai` → media-gateway `:8395/v1` (stable). Mapping voix OWU (alloy/echo/fable/nova/onyx/shimmer) → slugs Mistral dans media-gateway. Clé : Vault `secret/neokube/apps/mistral` → K8s secret `mistral-audio-secret`.
**Accès public HTTPS** : `https://chat.neokube.fr` — obligatoire pour le micro navigateur (`getUserMedia` exige HTTPS). GitOps : `apps/interfaces/base/ingress-open-webui-public.yaml`.
**VOICE_MODE** : valve `bool = False` obligatoire dans toute pipe CLASS A — OWU ne transmet pas `type="voice"` aux pipes. Active les phrases d'empathie TTS + nettoyage markdown.

---

## SurfSense — Moteur de recherche RAG

> Documentation complète (composants, stockage, déploiement, 9 gotchas) : **[CLAUDE-surfsense.md](CLAUDE-surfsense.md)**

**Namespace** : `surfsense` — **GitOps** : `~/Kubinote-GitOps/apps/surfsense/base/`
**URLs** : `https://surfsense.neokube.fr` · `https://surfsense-api.neokube.fr` · `https://surfsense-zero.neokube.fr`
**Vault** : `secret/neokube/apps/surfsense` — `SECRET_KEY`, `DB_PASSWORD`, `ZERO_ADMIN_PASSWORD`, `SEARXNG_SECRET`
**Point critique** : toujours accéder via `https://surfsense.neokube.fr` — CORS bloqué sur `.neokube.local`

---

## Évaluation qualité (RAG + Agents)

> Documentation complète (scripts, métriques, commandes, scores détaillés, prompts Langfuse) : **[CLAUDE-eval.md](CLAUDE-eval.md)**

**Scripts** : `~/scripts/rag_eval.py` (RAG) · `~/scripts/agent_eval.py` (agents) · `~/scripts/reindex_neo_knowledge.py` (RAG Neo)
**CronJob** : `agent-eval-nightly` (2h Paris) — alerte ntfy si avg < 7.5

### Scores de référence (agent_eval.py, 2026-05-06)
| Agent | Score | Agent | Score |
|---|---|---|---|
| Charlotte | 9.17/10 | Camille | 9.1/10 |
| Joseph | 9.0/10 | Guillaume | 8.9/10 |
| Leon | 8.2/10 | — | — |

*(Scores Dispatcher/Domi/Vera/Neo issus d'agents non déployés — à réévaluer)*

---

## Penpot & Figma — Design

> Penpot (structure projets, URLs, gotchas, RAG design) : **[CLAUDE-penpot.md](CLAUDE-penpot.md)**
> Figma engine (architecture, webhooks, indexation 50+ fichiers, Joseph v3.0) : **[CLAUDE-figma-engine.md](CLAUDE-figma-engine.md)**

**URL publique** : `https://design.neokube.fr` — **Team** : `Neomnia Studio` (ID `82052e4a-914a-8123-8007-d697aa5fd265`)
**URL de livraison** : `https://design.neokube.fr/workspace?project-id={id}&file-id={id}` (session requise)
**Connector** : `penpot-connector` port 8004 — utiliser `path=`, jamais `command=`

---

## Orchestration Claude Code — Rôles et workflow (établi 2026-05-30)

**Claude Code = master orchestrateur**. Il brief, délègue, vérifie. Il n'exécute directement que ce qu'aucun agent ne peut faire (modifier le code de Leon ou Charlotte eux-mêmes — auto-modification interdite).

| Action | Acteur | Mécanisme |
|---|---|---|
| Zoho PM (jalons, tâches, issues, clôture, suivi) | **Leon** | `POST leon:8181/mission` |
| NeoKube infra (K8s, ConfigMaps, code agents, deploy) | **Charlotte** | `POST charlotte:8383/mission` |
| Projets clients (web app, API, design) | **Leon → asyncio.gather(Camille/Guillaume/Joseph)** | `POST leon:8181/mission` |
| Code de Leon ou Charlotte eux-mêmes | **Claude Code** | Edit ConfigMap + kubectl replace + rollout restart |
| Bug détecté sur un agent | **Leon crée issue Zoho** severity=major → **Charlotte exécute le fix** | Zoho issue `[Agent] Titre` assignée à Charlotte |

**Règle de bug** : tout dysfonctionnement agent détecté → Leon crée l'issue Zoho (`[NomAgent] Description`) → Charlotte reçoit et corrige → Leon ferme l'issue.
**Transition NeoStudio** : au fur et à mesure, les briefs Claude Code → Leon et Claude Code → Charlotte passeront par NeoStudio (interface chat multi-agents).

### Règle de communication — Hiérarchie sans antagonisme

**Principe** : l'utilisateur n'a qu'un seul interlocuteur projet — Leon. Les agents exécutifs remontent leurs résultats à Leon, qui consolide et informe.

```
Utilisateur ←── email ──── Leon (Chef de Production)
                                │  brief · dispatch · consolidation
                    ┌───────────┼───────────┐
                 Camille   Guillaume    Joseph    Milo
                 (Frontend) (Backend) (Design) (Scraping)
                    └───────────┴───────────┘
                        résultats → Leon via /mission HTTP
```

| Canal | Qui l'utilise | But | Destinataire |
|---|---|---|---|
| **Email** (`leon@neokube.fr`) | **Leon uniquement** | Communication projet — livrables, jalons, résultats | `chvandendriessche@neomnia.net` |
| **ntfy** `neokube-alerts` | **Tous agents** (Charlotte, Joseph, Charlotte…) | Information admin NeoKube — actions sysadmin, alertes infra, événements Penpot/K8s | Admin NeoKube |
| **Nora** | Email client externe | Communication client final, sur délégation Leon | Client |

**Distinction fondamentale** :
- **Email = canal projet** — Leon informe sur ce qui a été produit, livré, dispatché. Niveau managérial.
- **ntfy = canal admin sys** — les agents signalent leurs actions au niveau opérationnel (Joseph vient de capturer un site, Charlotte vient de fixer un pod, budget LiteLLM à 80%). Niveau infrastructure.

Les deux canaux coexistent sans conflit : ntfy ne remplace pas Leon, et Leon ne remplace pas ntfy. Documentation complète : **[CLAUDE-leon.md §Règle de hiérarchie](CLAUDE-leon.md)**

### Mécanisme `[ClaudeCode]` — Charlotte signale, Claude Code applique

Charlotte ne peut pas modifier son propre code (anti-auto-modification guard). Quand elle détecte une amélioration qui nécessite une modification de `sre_agent.py`, elle crée une issue `[ClaudeCode]` dans Zoho.

**Règle zoho-observer (implémentée v3.1)** : les issues `[ClaudeCode]` ne sont **pas** dispatchées aux agents — elles restent ouvertes pour Claude Code.

**Règle Claude Code** : au démarrage de chaque session, checker les issues ouvertes préfixées `[ClaudeCode]` :
```bash
curl -s http://zoho-engine.connector-system.svc.cluster.local:8000/proxy \
  -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/projects/2114101000001543041/bugs/","params":{"status":"open"}}' \
  | python3 -c "import json,sys; bugs=[b for b in json.load(sys.stdin).get('bugs',{}).get('bug',[]) if b.get('title','').startswith('[ClaudeCode]')]; [print(b['bug_number'],'—',b['title']) for b in bugs]"
```

**Format issue Charlotte** :
```
Titre : [ClaudeCode] <action courte> — <contexte>
Description : FICHIER : apps/.../configmap-sre-script.yaml
              ACTION : <code Python à appliquer>
              LIGNE D'INSERTION : <contexte>
              VÉRIFICATION : <commande de vérif>
```

Documentation complète : **[CLAUDE-github-engine.md §Mécanisme ClaudeCode](CLAUDE-github-engine.md)**

### Convention de nommage — Tâches et issues Zoho destinées à un agent

**Format obligatoire** : `[NomAgent] Description courte — détail`

```
✅ [Charlotte] embed nomic-embed-text — LiteLLM connexion échoue
✅ [Leon] zoho_create_task — start_date=end_date HTTP 400
✅ [Charlotte] Temporal Nondeterminism — SREScanWorkflow
❌ Charlotte — embed nomic-embed-text (pas de crochets → non scannable)
❌ Fix embed Charlotte (pas de préfixe structuré)
```

**Pourquoi** : Charlotte scanne les tâches Zoho préfixées `[Charlotte]` pour s'auto-assigner les missions. Leon fait de même pour `[Leon]`. Sans les crochets, la tâche est invisible pour l'agent.

**Règle Claude Code** : toute tâche créée pour un agent = préfixe `[NomAgent]` obligatoire.
**Règle Leon** : `zoho_create_task(name="[Charlotte] ...")` ou `zoho_create_task(name="[Leon] ...")` selon l'exécutant.
**Agents valides (déployés)** : `[Charlotte]` `[Leon]` `[Camille]` `[Guillaume]` `[Joseph]`

---

## Politique issues Zoho — Agents NeoKube

> Standard complet (champs obligatoires, severity→due_date, format `zoho_create_issue`, Boucle D zoho-observer, règles d'équipe SSII/Neokube) : **[CLAUDE-agents.md §Politique issues Zoho](CLAUDE-agents.md)**

**Règle critique** : préfixe `[NomAgent]` obligatoire dans le titre — seul marqueur scannable par les agents. IDs équipes : **Neokube** `2114101000001751022` · **SSII** `2114101000001544001`.

---

## Pièges connus — Anti-patterns à éviter

> Référence complète (66 anti-patterns, code + exemples) : **[CLAUDE-antipatterns.md](CLAUDE-antipatterns.md)**

**Règles absolues à ne jamais oublier** :
- `kubectl replace` sur un `*-script` configmap → **INTERDIT pour Charlotte** — passer par `/agent-modify` (admin-sys v6.2, validation syntaxe + rollback auto)
- Tout changement `rag-system` → **`apply_gitops_fix` obligatoire** — `kubectl patch/apply/replace` direct = divergence GitOps silencieuse
- `git push` ≠ déployé — `kubectl apply/replace` + `rollout restart` obligatoires
- `kubectl get secret` → guard `[SECRET_REDACTED]` — ne jamais exposer de valeur en clair

---

## Règle R9 — Gouvernance LLM par agent

> Table complète (R9.1–R9.13, profils LLM par agent, cascade FallbackModel, R9.12 creation model) : **[CLAUDE-agents.md §Règle R9](CLAUDE-agents.md)**

**Résumé** : Charlotte = `claude-sonnet` (interactif) → `gpt-4o` → `mistral` · scan background = `mistral` · création = `claude-opus`. Leon = `gpt-4o`. Autres agents = `codestral`/`mistral`.

---

## Checklist — Intégration d'un nouvel agent NeoKube

> Guide complet (classes A→E, interview, Pattern A/B, 12 étapes auto, MAD) : **[CLAUDE-create-agent.md](CLAUDE-create-agent.md)** · **[CLAUDE-agents.md](CLAUDE-agents.md)** · **[CLAUDE-agent-learning.md](CLAUDE-agent-learning.md)**

**Raccourci** : `create_agent(name, description, runtime, port, model)` — Charlotte crée en autonomie. Ports libres : 8494-8499.

---

## Historique des actions Claude

Archivé dans [CLAUDE-history.md](CLAUDE-history.md) — 173 entrées, 2026-03-15 → 2026-05-20.
