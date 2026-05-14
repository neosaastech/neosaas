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
**GitOps** : `~/Kubinote-GitOps/` — kustomize, appliqué par CronJob `cluster-bootstrap` toutes les 5 min
**Ingress** : Traefik, IP `192.168.1.28`, middleware whitelist `kube-system-local-ip-whitelist@kubernetescrd`

### Namespaces
| Namespace | Contenu |
|---|---|
| `kube-system` | Traefik, Headlamp, CoreDNS, metrics-server, **cloudflared** (tunnel, 2 replicas) |
| `cockpit` | LiteLLM, Langfuse, Langfuse-postgres |
| `interfaces` | Open WebUI, admin-sys-agent, ttyd, **ntfy** (notifications push v2.11.0) |
| `agent-system` | Charlotte SRE, Leon, Dispatcher, Aria, Nox, Vera, Penpot, **Domi**, Temporal, zoho-discovery, zoho-observer |
| `connector-system` | zoho(8000), github(8001), vercel(8002), neon(8003), penpot(8004), openprovider(8005), cloudflare(8006), stalwart(8007), google-discovery(8008), crawlee(8009), dataforseo(8010), **github-mcp**(8080 MCP streamable-http) |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-agent-injector, vault-unsealer |
| `management` | CronJob cluster-bootstrap, neokube-nightly-backup |
| `penpot` | Penpot (design) |
| `stalwart` | Stalwart Mail Server v0.11.8 — SMTP/IMAP/Sieve |
| `dify` | Dify v1.13.3 (agent builder studio) |
| `surfsense` | SurfSense — 7 composants : postgres, redis, searxng, backend, celery, zero-cache, frontend |
| `monitoring` | Grafana + Loki (30j rétention) + Promtail (DaemonSet) |

### Politique LLM & Embeddings
**100% API externes** (Gemini, Mistral, OpenAI, Anthropic) — aucun LLM local dans le cluster.
**Modèle embeddings** : `paraphrase-multilingual-mpnet-base-v2` (HuggingFace Inference API, 768 dims, gratuit)
**Alias LiteLLM** : `nomic-embed-text` — **Secret** : `HUGGINGFACE_API_KEY` dans `cockpit-secrets`

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

### CronJobs cluster
| CronJob | Namespace | Schedule | Rôle |
|---|---|---|---|
| `cluster-bootstrap` | management | `*/5 * * * *` | GitOps + namespaces Temporal |
| `neokube-nightly-backup` | management | `0 3 * * *` | Sauvegarde nightly |
| `llm-key-sync` | cockpit | `0 * * * *` | Sync clés LLM Vault → K8s |
| `llm-key-validation` | cockpit | `30 6 * * *` | Valide clés LLM, ntfy si quota épuisé |
| `dify-bootstrap` | dify | `0 4 1 1 *` | Bootstrap Dify annuel |
| `agent-eval-nightly` | agent-system | `0 2 * * *` | Évalue 9 agents, alerte ntfy si avg < 7.5 |

---

## Architecture agents

> Charlotte internals, RBAC, admin-sys API, DevProjectWorkflow, R9, Checklist nouvel agent : **[CLAUDE-agents.md](CLAUDE-agents.md)**
> Sécurité agents (sidecars tool-validator + output-guard, policies) : **[CLAUDE-agents.md](CLAUDE-agents.md)**
> **Charlotte SRE v4.0 — PydanticAI** (ReAct loop natif, FallbackModel claude-sonnet→mistral, MCPServerStreamableHTTP, 36 outils, guards inchangés) + protocole de remédiation sécurisé : **[CLAUDE-agents.md](CLAUDE-agents.md)**

| Agent | Rôle | Runtime | Port | Temporal NS | Status |
|---|---|---|---|---|---|
| **Charlotte** | SRE Orchestratrice — surveillance cluster, Blocs A→F | Temporal | 8383 | `sre-charlotte` | active v4.0 (PydanticAI, FallbackModel, MCP natif) |
| **Leon** | Chef de Projet — brief → ProjectSpec → Zoho → dispatch | Temporal | 8181 | `leon` | active v2.1 (`POST /sre-task` ← Charlotte delegate_sre_task) |
| **Dispatcher** | Orchestre DevProjectWorkflow complet | Temporal | 8484 | `dispatcher` | active v2.0 |
| **Aria** | Frontend Builder — GitHub repo (template-nextjs) + Vercel + Penpot export | Temporal | 8485 | `dispatcher` | active v3.0 (GitHub MCP) |
| **Nox** | Backend Builder — GitHub repo (template-fastapi) + Neon branch | Temporal | 8486 | `dispatcher` | active v3.0 (GitHub+Neon MCP) |
| **Vera** | QA Reviewer — analyse spec + output Aria/Nox/Penpot | Temporal | 8487 | `dispatcher` | active v1.0 |
| **Penpot** | Design Scaffolder — crée projet Penpot + duplique template | Temporal | 8488 | `dispatcher` | active v1.0 |
| **Domi** | Domain Infrastructure Manager — provision domaine + DNS | Temporal | 8489 | `dispatcher` | active v1.0 |
| **admin-sys** | K8s executor — kubectl délégué par Charlotte | FastAPI | 8000 | — | active v4.0 |
| **zoho-tasks** | Abstraction Zoho Projects (outil partagé) | Temporal | — | — | active v1.0 |

**admin-sys** : `POST /execute {args}` + `POST /apply {manifest}` — auth `X-Admin-Sys-Token`, namespace `interfaces`.

**Charlotte — Délégation Dispatcher (v3.14)** : Charlotte ne gère pas le pipeline métier elle-même — elle délègue via deux outils :

| Outil Charlotte | Endpoint Dispatcher | Rôle |
|---|---|---|
| `trigger_dispatcher_workflow(dev_project, spec)` | `POST :8484/trigger` | Lance `DevProjectWorkflow` complet |
| `trigger_dispatcher_workflow(check_status)` | `GET :8484/workflows` | Liste les workflows Temporal actifs |
| `signal_workflow(wf_id, approve)` | `POST :8484/approve/{id}` | Débloque le déploiement Vercel |
| `signal_workflow(wf_id, reject)` | `POST :8484/reject/{id}` | Annule le workflow |
| `dispatch_design_deploy(penpot_id)` | `POST :8484/trigger-penpot` | Lance `PenpotToVercelWorkflow` |

### Vault — carte des chemins

> Carte complète Vault → K8s secrets + mécanismes de sync : **[CLAUDE-vault.md](CLAUDE-vault.md)**
>
> **Règle** : avant de déclarer un secret "absent de Vault", consulter cette carte. Les secrets K8s `openai-secret`, `anthropic-secret`, `cockpit-secrets` sont des **outputs** du CronJob `llm-key-sync` — ils sont bien dans Vault.

### Connector-system & MCP Servers

> Architecture complète, MCP servers, endpoints, règles R1–R5 : **[CLAUDE-connector.md](CLAUDE-connector.md)**

Tous les connectors : `GET /health` + `POST /proxy {method?, path, params?, body?}` — credentials depuis Vault auto.

**MCP Servers (couche préférée pour GitHub, K8s, Neon) :**

| Serveur | Namespace | Endpoint | Agents |
|---|---|---|---|
| `github-mcp` | `connector-system` | `:8080/mcp` (streamable-http) | Aria, Nox, Dispatcher |
| `k8s-mcp` | `agent-system` | `:8080/mcp` (streamable-http) | Charlotte |
| `mcp.neon.tech` | remote | `https://mcp.neon.tech/sse` | Nox |

---

## Cycle de vie d'un projet — Planification → Production

> Détail complet (phases, flux, gaps résolus) : **[CLAUDE-pipeline.md](CLAUDE-pipeline.md)**

| Phase | Agent | Déclencheur | Sortie |
|---|---|---|---|
| **Exploration** | Charlotte | Mention projet → `project_health_check` | Bilan ✅/❌ Zoho/GitHub/Vercel/Penpot/Notion |
| **Planification** | Leon | Brief → dialogue 10 tours → `dispatch_project` | ProjectSpec 13 champs + projet Zoho structuré |
| **Production** | Dispatcher+Aria+Nox+Penpot+Domi+Vera | `POST /trigger` ou Zoho "Prêt pour production" | 2 repos GitHub, Vercel deploy, Neon branch, Penpot design, domaine |
| **Design→Code** | Charlotte + Dispatcher + Aria v2.0 | `dispatch_design_deploy(penpot_project_id)` | Branche GitHub `design/penpot-export-{id}` + Vercel preview |

**Gaps** : ~~trigger Zoho status → production~~ ✅ · ~~mapper Zoho→ProjectSpec~~ ✅ · ~~email enrichi étape par étape~~ ✅ (tous résolus 2026-05-12)

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

## Dify v1.13.3 — Agent Builder Studio

> Documentation complète (composants, stockage, secrets, intégrations) : **[CLAUDE-dify.md](CLAUDE-dify.md)**

**Accès** : `http://dify.neokube.local` / `https://dify.neokube.fr` — GitOps : `~/Kubinote-GitOps/apps/dify/base/`

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
| Dispatcher | 10.0/10 | Aria | 9.1/10 |
| Domi | 9.7/10 | Nox | 8.9/10 |
| Penpot | 9.6/10 | Neo | 8.5/10 |
| Vera | 9.2/10 | Leon | 8.2/10 |
| Charlotte | 9.17/10 | — | — |

---

## Penpot — Gestion des projets et fichiers

> Documentation complète (structure projets, URLs, gotchas, RAG design) : **[CLAUDE-penpot.md](CLAUDE-penpot.md)**

**URL publique** : `https://design.neokube.fr` — **Team** : `Neomnia Studio` (ID `82052e4a-914a-8123-8007-d697aa5fd265`)
**URL de livraison** : `https://design.neokube.fr/workspace?project-id={id}&file-id={id}` (session requise)
**Connector** : `penpot-connector` port 8004 — utiliser `path=`, jamais `command=`

---

## Pièges connus — Anti-patterns à éviter

> Code + exemples complets : **[CLAUDE-antipatterns.md](CLAUDE-antipatterns.md)**

| # | Piège | Règle |
|---|---|---|
| 1 | Vercel `repoId` | `int`, pas `str` — sinon `incorrect_git_source_info` |
| 2 | `asyncio.gather` Temporal | `return_exceptions=True` pour activités optionnelles (Penpot, Domi) |
| 3 | ProjectSpec nouveau champ | 3 endroits : schema Leon + dict spec + `validate_spec setdefault` |
| 4 | `os.getenv()` en production | Toute variable active doit être dans le ConfigMap |
| 5 | ConfigMap modifié | `kubectl rollout restart` obligatoire |
| 6 | SMTP Stalwart | `stalwart-mail:587` (SMTP), PAS `stalwart-web` (HTTP admin) |
| 7 | `_embed()` HuggingFace | Retourne 768 scalaires séparés — détecter avec `isinstance(first, list)` |
| 8 | URLs externes | Construire dans le connector (`_inject_web_urls`), jamais dans l'agent |
| 14 | Heap limit ≠ OOMKilled | `FATAL ERROR: Reached heap limit` (V8/JVM) ≠ Exit 137 cgroup. Augmenter `limits.memory` ne fixe pas un heap limit — utiliser `NODE_OPTIONS=--max-old-space-size`, `JAVA_OPTS=-Xmx`. |
| 15 | Patch live sur GitOps | `kubectl patch` sans `git_push` est reverté en <5 min par `cluster-bootstrap`. Charlotte doit utiliser `apply_gitops_fix` (atomique) — jamais la procédure 5 étapes manuelle qui peut être interrompue avant le push. |
| 16 | Validation par ancien nom de pod | `kubectl get pod <ancien-nom>` retourne `NotFound` après rollout — ne prouve rien. Utiliser `-l app=<deployment>` ou `verify_pod_healthy` (Charlotte). |
| 17 | ConfigMap `sre-script` trop grand | `kubectl apply` échoue sur `sre-script` (annotation >262Ko). Utiliser `kubectl replace -f`. Le CronJob `cluster-bootstrap` (kustomize) ne souffre pas de ce problème. |
| 18 | Label `app=agent-charlotte` inexistant | `-l app=agent-charlotte` retourne 0 pods. Pour trouver Charlotte : `kubectl get pods -n agent-system \| grep charlotte`. |
| 19 | Mots-clés SRE dans salutations + contexte OWU | ~~Charlotte v3~~ **Supprimé en v4** — PydanticAI + Claude gèrent nativement. Historique : `_SRE_KW` + `_pending_question` bypassaient le classifieur sur "bonjour charlotte". |
| 20 | System prompt SRE dans chemin conversationnel | ~~Charlotte v3~~ **Supprimé en v4** — plus de chemin conversationnel distinct. Claude décide naturellement sans system prompt léger séparé. |
| 21 | Loop ReAct sur messages conversationnels | ~~Charlotte v3~~ **Supprimé structurellement en v4** — `Agent.run()` PydanticAI ne force aucun appel d'outil. Reste valide pour les agents OWU-facing non-PydanticAI (Leon, Neo). |
| 22 | `kubectl replace` supprime les clés ConfigMap non listées | `kubectl replace -f cm.yaml` remplace le CM **en entier** — toutes les clés absentes du fichier disparaissent. Toujours inclure **toutes** les clés existantes dans le fichier de remplacement. `kubectl apply` (< 262 KB) fait un merge et évite ce problème. |
| 23 | Outil ad-hoc par situation (over-engineering Charlotte) | `maintenance_pod(pvc=...)` → demain `redis_flush_tool()`, etc. Règle : Charlotte a des **primitives génériques** (`kubectl_apply` + `run_kubectl delete`). La connaissance du fix va dans le system prompt/RAG, pas dans le code. |
| 24 | Contexte ReAct trop volumineux → Charlotte sans réponse | 5 outils × 8000 chars = 40KB par tour → Mistral timeout → pas de réponse. Fix : limiter l'injection à **2500 chars** par résultat d'outil. |
| 25 | Nom de pod périmé dans `kubectl logs` | Charlotte utilise un nom de pod extrait des Events ou describe (anciens ReplicaSets) au lieu du pod actuel. Fix : guard runtime vérifie l'existence du pod avant d'exécuter `kubectl logs`. |
| 26 | Protection Charlotte auto-restart surface seulement | Règle `if name == "agent-charlotte": return "INTERDIT"` dans le tool interactif uniquement — `sre_auto_restart_agents` (Temporal) n'avait pas la vérification. Charlotte pouvait se killer elle-même toutes les 5 min. Fix : même guard dans **toutes** les activités Temporal. Checklist : `grep -n "rollout restart" sre_agent.py` → chaque occurrence doit vérifier charlotte. |
| 27 | Events périmés reportés comme problèmes actuels | Charlotte reporte des Events de pods morts (persist 1h après mort) comme critiques, sans croiser avec la liste live. Fix : ÉTAPE 2b — croisement obligatoire Event vs liste ÉTAPE 1. Règle : Events = indices passés, jamais preuve d'état courant. `sre_scan_pod_health` refactorisé JSON pour détecter pods NotReady. |
| 28 | Réponse finale en un seul chunk SSE (faux streaming) | `_build_sse(full_reply)` ou `delta.content = full_reply` → utilisateur attend en silence puis reçoit tout d'un coup. Fix : Pattern A (Pipe/Charlotte) → `_llm_call_stream` + events `token`. Pattern B (OpenAI-compat/Neo/Leon) → fast-path `stream=True` LiteLLM, agent-path mot-par-mot. Checklist étape 6d + 6e (ntfy mission done). |
| 29 | `{placeholder}` littéral dans f-string system prompt | `system = f"""... {agent} ..."""` → Python évalue `agent` comme variable → `NameError` à chaque appel mission. Fix : `{{agent}}` (double accolade = accolade littérale dans f-string). Seules les variables Python réelles (`{session_id}`, `{interface}`) restent sans double accolade. |
| 30 | `project_health_check` retourne Penpot name/url mais pas `project_id` | `_check_penpot()` calculait `pid` mais ne l'incluait pas dans le dict → Charlotte ne pouvait jamais passer l'UUID à `dispatch_design_deploy`. Règle : toute `_check_<service>()` doit retourner **tous** les identifiants nécessaires aux outils aval. Séquence Rule 13 : `project_health_check` → `ask_clarification` (confirmation) → `dispatch_design_deploy`. |
| 31 | `raise` dans `async with ClientSession()` MCP → ExceptionGroup | `raise RuntimeError()` à l'intérieur d'un `async with ClientSession()` anyio → wrappé en `ExceptionGroup` → `except RuntimeError` ne catch pas. Fix : stocker `_err/_text` dans les context managers, lever/retourner **après** la sortie. S'applique à tout helper MCP (`_mcp_github`, `_mcp_neon`, etc.). |
| 32 | `_llm_call` silencieux sur quota épuisé | HTTP 402 retourne `""` sans fallback ni alerte → session perdue, message générique incompréhensible, ntfy peut envoyer du JSON brut. Fix : détecter 402/`"credit"`/`"insufficient"` → fallback `LLM_FALLBACK`, ntfy rate-limitée 1/h, filtrer `final.startswith("{")` dans ntfy mission-end. `LLM_CONV_MODEL` pour classify + fast-path conv (10× moins cher que claude-sonnet). |
| 33 | Charlotte se modifie elle-même (boucle) | Charlotte tente `write_file`/`apply_gitops_fix` sur ses propres fichiers → boucle infinie de tentatives bloquées. Guards runtime : `_is_charlotte_file()` dans `write_file` + `apply_gitops_fix` → bloc + ntfy immédiat. Prompt : `RÈGLE AUTO-MODIFICATION` + `RÈGLE ANTI-BOUCLE`. **Anti-boucle** : tour 4 seulement si `_write_blocked` (guard déclenché) — sinon backstop au tour 7. Ne pas déclencher sur les diagnostics read-only légitimes (kubectl/logs/read_file). |
| 34 | `_CHARLOTTE_OWN_FILES` frozenset trop large bloque les écrits sur d'autres agents | Le frozenset listait explicitement 7 fichiers dont certains (ex : `configmap-sre-script.yaml`) pouvaient matcher des chemins légitimes d'autres agents via la condition `"sre-script" in path`. Fix : réduire à 2 entrées (`serviceaccount-sre.yaml`, `sre_agent.py`) + helper `_is_charlotte_file(path)` qui détecte par contenu du chemin ("charlotte" ou "sre-script"). |
| 35 | Anti-boucle run_kubectl — variantes `-o` comptent comme des appels distincts | `run_kubectl(["get","pod","x","-o","yaml"])` et `run_kubectl(["get","pod","x","-o","json"])` = même ressource mais 2 fingerprints différents → Charlotte re-interroge K8s inutilement. Fix : `_kubectl_fingerprint()` normalise les args en ignorant `-o`/`--output`, `_kubectl_seen` dict par session → retourne le cache avec `"[déjà exécuté]"`. Seules les commandes lecture (get, describe, logs, top) sont dédupliquées. |
| 36 | Builder ConfigMap Python — regex sur clé data échoue si la valeur contient le même mot | `re.search(r"requirements\.txt:.*", cm_text)` peut matcher une référence à `requirements.txt` dans le code Python à l'intérieur du CM, et non la vraie clé YAML. Fix : hardcoder la clé `requirements.txt` dans le builder, ne jamais l'extraire par regex. |
| 37 | Classificateur binaire sre/conv route les questions explicatives vers le ReAct loop | ~~Charlotte v3~~ **Supprimé structurellement en v4** — plus de classificateur binaire. Remplacé par `_classify_message` 5 classes. Reste valide pour les agents qui implémentent un routing custom. |
| 38 | Troncature brute du contexte ReAct — perte d'informations critiques en fin de sortie | `tool_result[:2500]` coupe arbitrairement — `Events:` dans `kubectl describe` est toujours en bas. Fix : `_compress_tool_result(tool_name, tool_result, user_query)` → Mistral (`LLM_SCAN_MODEL`) extrait anomalies uniquement (< 400 chars) pour `run_kubectl`/`read_file` > 1500 chars. Fallback troncature 2500 si Mistral échoue. |
| 39 | `run_stream()+stream_text(delta=True)` laisse fuiter les tokens tool-call JSON avec mistral | `stream_text(delta=True)` sur PydanticAI + mistral via LiteLLM renvoie les invocations d'outils comme texte (ex: `list_cluster_state ব্যক{}`). Fix : utiliser `charlotte_agent.run()` dans `/mission/stream` + émettre le texte final mot-par-mot. Les events `tool/step` arrivent quand même via `_tool_emit → queue` pendant `run()`. |
| 40 | String matching pour détecter l'intent — fragile face aux variantes linguistiques | Hardcoder `"accès"`, `"as-tu"`, etc. échoue sur `"acces"` (sans accent), `"as tu"` (sans tiret), autres langues. Règle : **utiliser le LLM comme interprétateur d'intent** — `_classify_message()` (LLM_SCAN_MODEL, max 10 tokens) retourne 1 label parmi `greeting \| access_zoho \| access_cluster \| question \| task`. Table intent→comportement extensible sans maintenance. Voir Pattern A dans CLAUDE-agents.md et antipattern #40 dans CLAUDE-antipatterns.md. |

---

## Règle R9 — Gouvernance LLM par agent

> Règles complètes (R9.1–R9.10), profils LLM, pattern d'appel, checklist nouvel agent : **[CLAUDE-agents.md](CLAUDE-agents.md)**

| Agent | `LLM_MODEL` | `LLM_SCAN_MODEL` | `LLM_SECONDARY` | `LLM_FALLBACK` |
|---|---|---|---|---|
| **Charlotte** SRE v4 | `mistral` ✅ | `mistral` | `claude-sonnet` | `gpt-4o` |
| **Leon** | `mistral-large-2407` | — | — | — |
| **Dispatcher** | `mistral` ⚠️ | — | — | — |
| **Aria** / **Nox** | `codestral` | — | — | — |
| **Vera** | `mistral-large-2407` | — | — | — |
| **Penpot** / **Domi** | `mistral` ⚠️ | — | — | — |
| **Neo** | `mistral-large-2407` | — | — | — |

⚠️ = fallback temporaire (Gemini épuisé pour Dispatcher/Domi).
**Charlotte v4 — cascade LLM 3 niveaux (R9.10)** : `FallbackModel(mistral → claude-sonnet → gpt-4o)` · mistral = ops quotidiennes · claude-sonnet = escalade incidents critiques · `_check_primary_llm()` → ntfy sur quota épuisé · Voir R9.10 dans CLAUDE-agents.md.

---

## Checklist — Intégration d'un nouvel agent NeoKube

> Checklist complète (8 étapes, templates K8s, scripts LiteLLM/Vault/Langfuse) : **[CLAUDE-agents.md](CLAUDE-agents.md)**

Étapes : 0. Paramètres → 1. SA K8s → 2. Virtual key LiteLLM + Vault → 3. Deployment → 4. Service → 5. Temporal NS → 6. Code Python → 7. GitOps → 8. Langfuse (prompt + dataset + scoring)

---

## Historique des actions Claude

Archivé dans [CLAUDE-history.md](CLAUDE-history.md) — 104 entrées, 2026-03-15 → 2026-05-12.
