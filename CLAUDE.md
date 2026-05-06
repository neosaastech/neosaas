# CLAUDE.md — Actions sur cette machine

## Contexte
Machine : `neokube-beta` (Linux)
Répertoire principal : `/home/neokube-beta`

---

## Synchronisation SharePoint

### Outil
- **rclone bisync** — synchronisation bidirectionnelle
- Script : `/home/neokube-beta/.local/bin/sync-sharepoint.sh`
- Logs : `/home/neokube-beta/.local/share/rclone-sharepoint/<site>.log`

### Sites configurés
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

### Commandes utiles
```bash
# Sync un site spécifique
~/.local/bin/sync-sharepoint.sh Production-clients

# Sync tous les sites (parallèle)
~/.local/bin/sync-sharepoint.sh

# Sync manuel direct
rclone bisync sp-Production-clients: ~/SharePoint/Production-clients \
    --create-empty-src-dirs --compare checksum --resilient --log-level INFO

# Vérifier les remotes
rclone listremotes

# Tester la connexion
rclone lsd sp-Production-clients:

# Voir le log en direct
tail -f ~/.local/share/rclone-sharepoint/Production-clients.log
```

---

## Tokens / Auth
- `~/token.json` — token Microsoft (OneDrive/SharePoint global)
- `~/token_oneline.json` — variante token
- Les tokens rclone sont gérés séparément dans `~/.config/rclone/rclone.conf`

---

## Dossiers notables
| Chemin | Description |
|---|---|
| `~/SharePoint/` | Tous les sites SharePoint synchronisés |
| `~/SharePoint/Production-clients/` | Dossiers clients de production (31 entrées) |
| `~/onedrive/` / `~/OneDrive/` | OneDrive personnel |
| `~/openapi-servers/` | Serveurs OpenAPI (compose.yaml) |

---

## Architecture des noms de domaine

### Règle fondamentale — tout ce qui est Neokube-beta est sous `neokube.*`

| Périmètre | Domaine | Usage |
|---|---|---|
| Cluster K8s (accès public via tunnel) | `neokube.fr` | **Domaine de référence** — Cloudflare-managed, tunnel CF, tous les services web |
| Cluster K8s (accès LAN) | `neokube.local` | DNS interne, résolution `/etc/hosts` |
| Mail & infra Scaleway | `neokube.fr` | Mail (`mail.neokube.fr` → Stalwart Scaleway) — même domaine |
| Domaine secondaire (préexistant) | `neomnia.net` | Aussi dans CF, tunnel actif — mais `neokube.fr` est la référence |

**neokube.fr est la référence publique de neokube** — migré dans Cloudflare le 2026-05-03.
`neomnia.net` reste dans CF/tunnel mais ne doit plus être utilisé pour les nouveaux services.

### Process Cloudflare — interface entre les applications et les registrars

Cloudflare est le **seul** point d'entrée DNS pour les services exposés publiquement. Les domaines sont enregistrés chez Openprovider (ou autre registrar), mais leur DNS est **toujours géré dans Cloudflare**.

```
Registrar (Openprovider)       Cloudflare                    Cluster K8s
  neomnia.net ───── NS ──────→  zone CF active    ──────────→ Tunnel → Traefik
  neokube.fr  ───── NS ──────→  zone CF active    ──────────→ Tunnel → Traefik  ← référence
```

> **neokube.fr est maintenant dans Cloudflare** (depuis 2026-05-03) : zone CF créée + NS Openprovider changés vers `abby.ns.cloudflare.com` / `david.ns.cloudflare.com`. Propagation immédiate. Les records mail (A/MX/SPF/DKIM/DMARC) ont été recréés dans la zone CF. `mail.neokube.fr` = DNS-only (non proxié, pointe vers 51.15.253.114).

### Ajouter un nouveau service public — process complet

```
1. Le domaine est-il déjà dans Cloudflare ?
   OUI → passer à l'étape 3
   NON → ajouter la zone dans Cloudflare dashboard (via cloudflare-connector + CF_GLOBAL_KEY),
         changer les NS chez le registrar (via openprovider-connector)

2. Attendre propagation NS (0–24h, TTL Openprovider min 600s)
   Note : recréer les records DNS existants dans la zone CF avant de changer les NS

3. Ajouter un CNAME proxied=true dans la zone Cloudflare :
   sous-domaine.neokube.fr → 94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb.cfargotunnel.com
   (via cloudflare-connector, zone ID 891229575324408767bf4a0293e5adcc)

4. Ajouter la règle dans le Cloudflare Tunnel (CF_API_TOKEN, pas CF_DNS_TOKEN) :
   hostname: sous-domaine.neokube.fr
   service:  http://traefik.kube-system.svc.cluster.local:80
   originRequest.httpHostHeader: service.neokube.local

5. Vérifier que Traefik a un Ingress pour service.neokube.local
   (le tunnel envoie ce host à Traefik via httpHostHeader override)

6. Tester : curl -I https://sous-domaine.neokube.fr
```

> **Pourquoi CF_GLOBAL_KEY pour créer une zone** : les tokens scoped (`cfat_`, `cfut_`) requièrent la permission `com.cloudflare.api.account.zone.create` qui n'est pas assignable aux tokens API scoped dans l'UI CF. Seule la **Global API Key** a cette capacité. Après création, utiliser les tokens scoped pour les opérations DNS courantes.

### Tokens Cloudflare — usage strict

| Token/Clé | Variable Vault | Scope | Usage |
|---|---|---|---|
| Global API Key | `CF_GLOBAL_KEY` + `CF_ACCOUNT_EMAIL` | Compte complet (toutes permissions) | Création de zones — **prioritaire dans cloudflare-connector v1.2** |
| `Neomnia-account` | `CF_API_TOKEN` | Compte complet (Tunnel:Edit, Analytics…) | Tunnel rules, analytics |
| `Neomnia-domains` | `CF_DNS_TOKEN` | Zone DNS:Edit — All zones | Ajout/modif CNAME et records DNS |

> **CF_ACCOUNT_EMAIL** = `informatique@neomnia.net` (requis avec la Global API Key)
> **cloudflare-connector v1.2** : priorité Global Key → fallback CF_DNS_TOKEN → fallback CF_API_TOKEN

---

## Architecture cluster Kubernetes

**Cluster** : `kubinote` (single-node, 12 CPU, 32 GB RAM)
**GitOps** : `~/Kubinote-GitOps/` — kustomize, appliqué par CronJob `cluster-bootstrap` toutes les 5 min
**Ingress** : Traefik, IP `192.168.1.28`, middleware whitelist `kube-system-local-ip-whitelist@kubernetescrd`

### Namespaces
| Namespace | Contenu |
|---|---|
| `kube-system` | Traefik, Headlamp (UI K8s), CoreDNS, metrics-server |
| `cockpit` | LiteLLM, Langfuse, Langfuse-postgres |
| `interfaces` | Open WebUI, admin-sys-agent, ttyd |
| `agent-system` | Charlotte SRE, Leon, Dispatcher, Aria, Nox, Vera, Penpot, **Domi**, Temporal, zoho-discovery, zoho-observer |
| `connector-system` | zoho-connector (OAuth2+proxy, port 8000), github-connector (proxy GitHub API, port 8001), vercel-connector (proxy Vercel API, port 8002), neon-connector (proxy Neon API + SQL, port 8003), penpot-connector (proxy Penpot RPC API, port 8004), openprovider-connector (registrar API, port 8005), cloudflare-connector (DNS/zones API, port 8006), **stalwart-connector** (admin mail API, port 8007), **google-discovery-connector** (Google Custom Search, port 8008), **crawlee-service** (scraping Crawlee+Playwright, port 8009) |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-agent-injector, vault-unsealer |
| `management` | CronJob cluster-bootstrap, neokube-nightly-backup |
| `penpot` | Penpot (design) |
| `stalwart` | Stalwart Mail Server v0.11.8 — SMTP/IMAP/Sieve, domaine `mail.neokube.fr` |
| `dify` | Dify v1.13.3 (agent builder studio) — accès `http://dify.neokube.local` |
| `surfsense` | SurfSense (moteur recherche RAG open-source, alternatif Perplexity) — 7 composants : postgres+pgvector, redis, searxng, backend, celery, zero-cache, frontend |
| `monitoring` | **Grafana** (dashboards) + **Loki** (log aggregation, 30j rétention) + **Promtail** (DaemonSet, collecte tous les pods) — `grafana.neokube.fr` / `grafana.neokube.local` |
| `interfaces` | Open WebUI, admin-sys-agent, ttyd, **ntfy** (notifications push v2.11.0) |
| `kube-system` | Traefik, Headlamp, CoreDNS, metrics-server, **cloudflared** (Cloudflare Tunnel, 2 replicas) |

### Politique LLM
**100% API externes** (Gemini, Mistral, OpenAI, Anthropic) — aucun LLM local dans le cluster.
Les futurs modèles locaux seront hébergés sur machines externes et exposés via API.

### Embeddings
- **Modèle actif** : `paraphrase-multilingual-mpnet-base-v2` (sentence-transformers, 768 dims, multilingue)
- **Provider** : HuggingFace Inference API (router.huggingface.co) — **gratuit**
- **Alias LiteLLM** : `nomic-embed-text` (inchangé pour les agents)
- **Secret** : `HUGGINGFACE_API_KEY` dans `cockpit-secrets`

### Collections Qdrant
| Collection | Dims | Points | Modèle |
|---|---|---|---|
| `neomnia_core` | 384 | 260 642 | paraphrase-multilingual-MiniLM-L12-v2 |
| `sre-charlotte-incidents` | 768 | ~4 800 | paraphrase-multilingual-mpnet-base-v2 * |
| `charlotte-conversations` | 768 | ~660 | paraphrase-multilingual-mpnet-base-v2 * |
| `neokube-process-docs` | 768 | ~91 | paraphrase-multilingual-mpnet-base-v2 * |
| `kubinote-brain` | 1536 | ~12 | OpenAI ada-002 |
| `zoho-tasks` | 768 | 0 | — |

*\* anciens vecteurs nomic-embed-text-v1 en cours de remplacement progressif*

### Interfaces web
| URL | Service |
|---|---|
| `http://headlamp.neokube.local` | Headlamp (dashboard K8s) |
| `http://open-webui.neokube.local` | Open WebUI |
| `http://ttyd.neokube.local` | Terminal web (bash) |
| `http://litellm.neokube.local` | LiteLLM proxy |
| `http://langfuse.neokube.local` | Langfuse (observabilité LLM) |
| `http://temporal.neokube.local` | Temporal UI (orchestration workflows) |
| `http://dify.neokube.local` | Dify (agent builder studio) |
| `http://penpot.neokube.local` | Penpot (design) |
| `http://qdrant.neokube.local` | Qdrant (API vectorielle) |
| `http://leon.neokube.local` | Leon (agent) |
| `http://api.neokube.local` | admin-sys-agent |
| `http://mail-admin.neokube.local` | Stalwart Mail Admin (Traefik → 51.15.253.114:8080) |
| `http://webmail.neokube.local` | Roundcube webmail (IMAP → stalwart-mail:143, SMTP → stalwart-mail:587) |
| `http://grafana.neokube.local` | Grafana — logs cluster (Loki + Promtail) |
| `http://ntfy.neokube.local` | ntfy — serveur de notifications push |

### Accès distant — Cloudflare Tunnel (neokube.fr)

**Tunnel** : `neokube-tunnel` — ID `94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb`
**GitOps** : `apps/cloudflare-tunnel/base/` (deployment cloudflared, 2 replicas, kube-system)
**Secret K8s** : `cloudflare-tunnel-token` dans `kube-system` (Vault : `CF_TUNNEL_TOKEN` dans `secret/neokube/infrastructure/cloudflare`)
**Connexions actives** : 8 connexions QUIC vers datacenter CF Paris (cdg01/07/09/12/13/14/17)

| URL publique | Service interne | Notes |
|---|---|---|
| `https://chat.neokube.fr` | Open WebUI | Interface AI (auth interne) |
| `https://headlamp.neokube.fr` | Headlamp | Dashboard K8s |
| `https://temporal.neokube.fr` | Temporal UI | Orchestration workflows |
| `https://langfuse.neokube.fr` | Langfuse | Observabilité LLM |
| `https://webmail.neokube.fr` | Roundcube | Webmail |
| `https://mailhub.neokube.fr` | Stalwart Admin | Admin mail |
| `https://design.neokube.fr` | Penpot | Design |
| `https://dify.neokube.fr` | Dify | Agent builder |
| `https://surfsense.neokube.fr` | SurfSense frontend | Moteur RAG |
| `https://surfsense-api.neokube.fr` | SurfSense backend API | FastAPI |
| `https://surfsense-zero.neokube.fr` | SurfSense zero-cache | Sync RT WebSocket |
| `https://grafana.neokube.fr` | Grafana | Logs CronJobs, RAG, agents |
| `https://ntfy.neokube.fr` | ntfy | Notifications push (topic neokube-alerts) |

**Routing** : Cloudflare → cloudflared (pod K8s) → Traefik (kube-system:80) avec Host override → service interne

**Architecture tokens Cloudflare** (trois credentials, principe moindre privilège) :

| Nom CF | Variable Vault | Permissions | Usage |
|---|---|---|---|
| Global API Key | `CF_GLOBAL_KEY` + `CF_ACCOUNT_EMAIL` | Compte complet (toutes permissions) | Création de zones CF — cloudflare-connector v1.2 prioritaire |
| `Neomnia-account` | `CF_API_TOKEN` | Compte complet (Tunnel:Edit, Analytics, Logs…) | cloudflared tunnel auth, op��rations compte |
| `Neomnia-domains` | `CF_DNS_TOKEN` | Zone DNS:Edit — All zones | cloudflare-connector (DNS CRUD, CNAMEs) — fallback |

> **CF_ACCOUNT_EMAIL** = `informatique@neomnia.net` (email du compte CF, requis avec la Global API Key)
> **Renouvellement** : Global API Key n'expire pas. Tokens API (`cfat_`) n'expirent pas par défaut mais peuvent être révoqués. Si révoqué, recréer dans dash.cloudflare.com → My Profile → API Tokens.
> `kubectl exec -n security vault-0 -- vault kv patch secret/neokube/infrastructure/cloudflare CF_DNS_TOKEN="<nouveau>"`

**CNAMEs DNS** (zone `neokube.fr` ID=`891229575324408767bf4a0293e5adcc`, cible tunnel, proxied=true) :
> ✅ **Créés le 2026-05-03** : `chat`, `headlamp`, `temporal`, `langfuse`, `webmail`, `mailhub`, `design`, `dify`, `surfsense`, `surfsense-api`, `surfsense-zero`
> `mail.neokube.fr` = DNS-only (A record, proxied=false → 51.15.253.114)
> Tunnel opérationnel — HTTP 200 vérifié sur tous les 11 services `.neokube.fr`

**Recréer les CNAMEs si besoin** (depuis le pod connector-system) :
```bash
CF_POD=$(kubectl get pod -n connector-system -l app=cloudflare-connector -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n connector-system $CF_POD -- python3 -c "
import httpx, os
VAULT_ADDR = os.getenv('VAULT_ADDR'); VAULT_TOKEN = os.getenv('VAULT_TOKEN')
r = httpx.get(VAULT_ADDR+'/v1/secret/data/neokube/infrastructure/cloudflare', headers={'X-Vault-Token': VAULT_TOKEN})
d = r.json()['data']['data']
# Global API Key prioritaire pour les opérations DNS
CF_EMAIL = d.get('CF_ACCOUNT_EMAIL', '')
CF_GKEY = d.get('CF_GLOBAL_KEY', '')
if CF_GKEY and CF_EMAIL:
    headers = {'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_GKEY, 'Content-Type': 'application/json'}
else:
    headers = {'Authorization': 'Bearer ' + (d.get('CF_DNS_TOKEN') or d['CF_API_TOKEN']), 'Content-Type': 'application/json'}
ZONE_ID = '891229575324408767bf4a0293e5adcc'  # neokube.fr
CNAME = '94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb.cfargotunnel.com'
for sub in ['chat','headlamp','temporal','langfuse','webmail','mailhub','design','dify','surfsense','surfsense-api','surfsense-zero']:
    resp = httpx.post(f'https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records',
        headers=headers, json={'type':'CNAME','name':sub,'content':CNAME,'proxied':True,'ttl':1})
    r2 = resp.json()
    print(sub+':', 'OK' if r2.get('success') else r2.get('errors'))
"
```

### Volumes persistants (hostPath, `storageClassName: ""`)
| PV | Taille | Chemin hôte | Namespace |
|---|---|---|---|
| `agent-temporal-pv` | 5 Gi | `/projets/temporal` | agent-system |
| `charlotte-state-pv` | 1 Gi | — | agent-system |
| `dify-postgres-pv` | 5 Gi | `/var/lib/dify/postgres` | dify |
| `dify-storage-pv` | 10 Gi | `/var/lib/dify/storage` | dify |
| `dify-plugins-pv` | 5 Gi | `/var/lib/dify/plugins` | dify |
| `interfaces-data-pv` | 5 Gi | — | interfaces |
| `langfuse-postgres-pv` | 5 Gi | — | cockpit |
| `penpot-assets-pv` | 10 Gi | — | penpot |
| `penpot-postgres-pv` | 5 Gi | — | penpot |
| `qdrant-data-pv` | 50 Gi | — | rag-system |
| `data-vault-0` | 5 Gi | local-path | security |

### CronJobs cluster
| CronJob | Namespace | Schedule | Rôle |
|---|---|---|---|
| `cluster-bootstrap` | management | `*/5 * * * *` | Applique GitOps + s'assure que les 7 namespaces Temporal existent (idempotent) |
| `neokube-nightly-backup` | management | `0 3 * * *` (Europe/Paris) | Sauvegarde nightly |
| `llm-key-sync` | cockpit | `0 * * * *` | Sync clés LLM Vault → K8s secrets → restart LiteLLM/Langfuse si changement |
| `llm-key-validation` | cockpit | `30 6 * * *` | Valide les clés LLM |
| `dify-bootstrap` | dify | `0 4 1 1 *` | Bootstrap Dify annuel (migrations one-shot) |

### Namespaces Temporal (état 2026-04-27)
| Namespace | Agent | Retention |
|---|---|---|
| `sre-charlotte` | Charlotte SRE | 7j |
| `zoho-integration` | zoho-observer | 7j |
| `dispatcher` | Dispatcher, Aria, Nox, Vera | 7j |
| `leon` | Leon | 7j |
| `aria` | Aria (réservé — task_queue=aria-queue dans dispatcher ns) | 7j |
| `nox` | Nox (réservé) | 7j |
| `vera` | Vera (réservé) | 7j |
| `default` | Temporal interne | — |
| `agent-system` | Legacy | — |
| `temporal-system` | Temporal interne | — |

---

## Architecture agents

### Rôles et périmètres

| Agent | Rôle | Runtime | Port | Temporal NS | Status |
|---|---|---|---|---|---|
| **Charlotte** | SRE Orchestratrice — surveillance cluster, réception ProjectSpec | Temporal | 8383 | `sre-charlotte` | active v3.0 |
| **Leon** | Chef de Projet — qualification brief, émission ProjectSpec, Zoho, dispatch | Temporal | 8181 | `leon` | active v2.0 |
| **Dispatcher** | Orchestre DevProjectWorkflow — validate→Aria+Nox+Penpot→Vera→approval→deploy→mail | Temporal | 8484 | `dispatcher` | active v1.0 |
| **Aria** | Frontend Builder — GitHub repo (template-nextjs) + Vercel project | Temporal | 8485 | `dispatcher` | active v1.0 |
| **Nox** | Backend Builder — GitHub repo (template-fastapi) + Neon branch | Temporal | 8486 | `dispatcher` | active v1.0 |
| **Vera** | QA Reviewer — analyse spec + output Aria/Nox/Penpot, rapport qualité | Temporal | 8487 | `dispatcher` | active v1.0 |
| **Penpot** | Design Scaffolder — crée projet Penpot + duplique fichier template | Temporal | 8488 | `dispatcher` | active v1.0 |
| **Domi** | Domain Infrastructure Manager — provision domaine + DNS + renouvellements | Temporal | 8489 | `dispatcher` | active v1.0 |
| **admin-sys** | K8s executor — exécute les commandes kubectl déléguées par Charlotte | FastAPI | 8000 | — | active v4.0 |
| **zoho-tasks** | Abstraction Zoho Projects (outil partagé) | Temporal | — | — | active v1.0 |

### Principe d'exécution K8s (Phase 7)

```
Toi (Slack / Open WebUI)
        ↓ ordre admin
  Charlotte SRE  (décide, planifie)
        ↓ POST /execute ou /apply
    admin-sys pod  (valide, exécute kubectl avec son propre SA)
        ↓
   Actions K8s / cluster
```

**Règle de fallback — Charlotte ne perd jamais la visibilité :**

| Type de commande | admin-sys UP | admin-sys KO |
|---|---|---|
| `get`, `logs`, `describe`, `top`, `events` | via admin-sys | fallback local silencieux (warning dans logs) |
| `patch`, `apply`, `delete`, `rollout`, `create` | via admin-sys | erreur explicite — Charlotte ne mute pas sans admin-sys |

**admin-sys v4.1** (`interfaces` namespace, port 8000) :
- `GET /health` — libre (probes K8s)
- `POST /execute {args: [...], timeout?: int}` — exécute kubectl, FORBIDDEN: exec/cp/port-forward/proxy
- `POST /apply {manifest: str, namespace?: str}` — kubectl apply -f -
- **Auth** : header `X-Admin-Sys-Token` obligatoire sur `/execute` et `/apply` (secret `admin-sys-token` dans namespaces `interfaces` + `agent-system`)
- ClusterRole `admin-sys-executor` : lecture universelle + mutations workloads/config/RBAC/batch
- GitOps : `apps/interfaces/base/configmap-admin-sys-script.yaml` + `rbac-admin-sys-executor.yaml`

### DevProjectWorkflow — flux complet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PLANIFICATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brief (Slack #produit / Open WebUI)
  → Charlotte : project_health_check → bilan Zoho/GitHub/Vercel/Penpot/Notion
  → Leon : dialogue de clarification (max 10 tours)
  → Leon : produit ProjectSpec JSON (12 champs validés)
  → Leon : crée tâches + jalons dans Zoho Projects
  → Charlotte : project_health_check(update_docs=True) → croise les liens
  ─────────────────── POINT DE DÉCLENCHEMENT PRODUCTION ─────────────────────
  [ACTUEL]  Leon : dispatch_project → POST /trigger Dispatcher
  [CIBLE]   Zoho project status → "Prêt pour production" (action humaine)
            → zoho-observer lit les champs Zoho → construit ProjectSpec
            → POST /trigger Dispatcher
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ PRODUCTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  → Dispatcher : validate_spec (tous les champs obligatoires)
  → Dispatcher : [PARALLEL]
      Aria   : GitHub repo (template-nextjs) + Vercel project
      Nox    : GitHub repo (template-fastapi) + Neon branch (NeoBridge)
      Penpot : projet Penpot + duplication fichier template
      Domi   : provision domaine (subdomain {slug}.neomnia.net ou achat Openprovider)
  → Vera : vera_review (analyse spec + output Aria/Nox/Penpot)
  → Dispatcher : notify_approval (signal humain attendu 24h)
  → [Approbation humaine]
  → Dispatcher : deploy (rollout final)
  → Domi       : domi_link_vercel_domain (lie le domaine au projet Vercel, post-deploy)
  → Dispatcher : write_pm_decisions (Qdrant pm-decisions, inclut penpot_url + domain)
  → Dispatcher : zoho_callback (commentaire tâche Zoho + lien Design Penpot)
  → Dispatcher : send_client_mail (email post-deploy → spec.client_email, non-bloquant)
```

**Leon ne code jamais, ne déploie jamais** — interdit par `forbidden_actions` dans l'AgentSpec (enforcement par tool-validator, Phase 2).

**GitHub templates utilisés** :
- `neomnia/template-nextjs` — Next.js 15, TypeScript, Tailwind, App Router
- `neomnia/template-fastapi` — FastAPI + asyncpg + Dockerfile + `.env.example`

**Neon — contrainte org** : `POST /projects` bloqué (org managed by Vercel). Nox utilise le projet existant **NeoBridge** (`young-fog-76038471`) et crée une branche dédiée par projet (`POST /projects/{id}/branches`). Résultat : `neon_branch_id` + `neon_endpoint_host`.

### Flux Leon → Charlotte (SRE)

```
ProjectSpec validé par Dispatcher
  → Charlotte : reçoit signal "project_spec_received"
  → Charlotte : déclenche SREProvisionWorkflow si infra requise
```

### RBAC agents (état 2026-04-27)

| Agent | ServiceAccount | ClusterRole effectif |
|---|---|---|
| Charlotte | `agent-sre-sa` (agent-system) | `agent-sre-role` — lecture + remédiation, secrets read-only |
| Leon | `leon-sa` (agent-system) | read-only `agent-system` (get/list/watch pods, services, deployments) |
| Dispatcher | `dispatcher-sa` (agent-system) | **aucun binding** — pas d'accès K8s |
| Aria | `aria-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Nox | `nox-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Vera | `vera-sa` (agent-system) | **aucun binding** — pas d'accès K8s, pas de kubectl |
| Penpot | `penpot-sa` (agent-system) | **aucun binding** — pas d'accès K8s, opérations via penpot-connector |
| admin-sys | `admin-sys-agent` (interfaces) | `admin-sys-executor` — lecture universelle + mutations workloads/config/RBAC/batch/namespaces |

**Supprimé le 2026-04-26** : `ClusterRoleBinding agent-sre-cluster-admin` (Charlotte n'a plus `cluster-admin`).
**Ajouté le 2026-04-27** : `ClusterRole admin-sys-executor` + binding sur `admin-sys-agent` SA.

**Posture sécurité Aria/Nox/Vera/Penpot/Dispatcher** : pas de kubectl installé dans les pods, pas de ClusterRoleBinding, toutes les opérations infrastructure passent par les connectors (github/neon/vercel/penpot) via token Vault. Seule Charlotte peut agir sur le cluster, via admin-sys uniquement (token `X-Admin-Sys-Token`).

### Connector-system — architecture (état 2026-04-28)

Chaque connector est un pod `python:3.12-slim` dans `connector-system`. Tous lisent leurs credentials depuis **Vault** via le secret K8s `vault-root-token` (copié depuis `vault-init-keys` dans `security`).

| Connector | Port | Vault path | Clés |
|---|---|---|---|
| `zoho-connector` | 8000 | `secret/neokube/infrastructure/zoho` | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNTS_SERVER`, `ZOHO_PORTAL_ID` |
| `github-connector` | 8001 | `secret/neokube/infrastructure/github` | `GITHUB_TOKEN` |
| `vercel-connector` | 8002 | `secret/neokube/infrastructure/vercel` | `VERCEL_TOKEN`, `VERCEL_TEAM_ID` |
| `neon-connector` | 8003 | `secret/neokube/infrastructure/neon` | `NEON_API_KEY` |
| `penpot-connector` | 8004 | `secret/neokube/infrastructure/penpot` | `PENPOT_EMAIL`, `PENPOT_PASSWORD` |
| `openprovider-connector` | 8005 | `secret/neokube/infrastructure/openprovider` | `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` |
| `cloudflare-connector` | 8006 | `secret/neokube/infrastructure/cloudflare` | `CF_DNS_TOKEN` (prioritaire, Zone DNS:Edit), `CF_API_TOKEN` (fallback, compte complet), `CF_ACCOUNT_ID` (optionnel) |
| `stalwart-connector` | 8007 | `secret/neokube/apps/stalwart` | `ADMIN_PASSWORD` |
| `google-discovery-connector` | 8008 | `secret/neokube/infrastructure/google` | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CX_ID` |
| `crawlee-service` | 8009 | — (pas de credentials) | — service utility |
| `dataforseo-connector` | 8010 | `secret/neokube/infrastructure/dataforseo` | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_API_KEY` (base64) |

**Provisionner les credentials Google** (une seule fois) :
```bash
kubectl exec -n security vault-0 -- vault kv put \
  secret/neokube/infrastructure/google \
  GOOGLE_SEARCH_API_KEY="<clé-cloud-console>" \
  GOOGLE_CX_ID="<cx-id-programmable-search>"
```
> Obtenir sur [programmablesearchengine.google.com](https://programmablesearchengine.google.com) (cx ID) + Google Cloud Console (API key, activer "Custom Search API"). Quota : 100 req/jour gratuites.

**Endpoints exposés** :
- Tous : `GET /health`, `POST /proxy {method?, path, params?, body?}`
- neon-connector uniquement : `POST /query {project_id, sql, database?, role_name?}`
- vercel-connector : injecte automatiquement `teamId` dans les params
- penpot-connector : `path` = nom de la commande RPC Penpot (ex. `create-project`) ; auth session cookie-based, re-login auto sur 401
- openprovider-connector v1.1 : auth JWT via login username/password, re-login auto sur 401 ; API base `https://api.openprovider.eu/v1beta` ; endpoints bonus `POST /dns/records/add {zone, records}` et `POST /dns/records/remove {zone, records}` (voir §DNS neokube.fr pour le format correct)
- cloudflare-connector : Bearer token statique — utilise `CF_DNS_TOKEN` (Neomnia-domains, Zone DNS:Edit) en priorité, fallback sur `CF_API_TOKEN` (Neomnia-account, compte complet) ; endpoint bonus `GET /zones` ; API base `https://api.cloudflare.com/client/v4`
- stalwart-connector : auth Basic `admin:ADMIN_PASSWORD` injectée auto ; endpoints bonus `GET /accounts`, `POST /accounts/create {name, password, display_name?, quota?}`, `DELETE /accounts/{account}` ; cible `http://stalwart-web.stalwart.svc.cluster.local:8080`
- google-discovery-connector : `POST /search {query, num_results?, site_restrict?, date_restrict?, start?, language?}` → `{items[], total_results, search_query, count}` ; credentials depuis Vault auto
- crawlee-service : `POST /crawl {url, selectors?, extract_text?, wait_for?, timeout?}`, `POST /batch {urls[], selectors?, extract_text?, timeout?}` (max 10), `POST /screenshot {url, full_page?, timeout?}` → `{screenshot_base64}` ; pas de Vault ; mutex interne (un crawl à la fois)
- dataforseo-connector : `POST /search {query, num_results?, language?, location_code?, engine?}` → `{items[], query, total, provider}` ; fallback auto DataForSEO → SearXNG (surfsense-searxng) ; `POST /proxy {endpoint, body}` → accès direct DataForSEO v3 API ; credentials depuis Vault auto

**Domaines Openprovider** (7 actifs) : `neokube.fr`, `neomnia.net`, `popurank.com`, `datapublishhub.com`, `redaction-persuasive.fr`, `mission-croissance.fr`, `referencement-site.be`.
- `neokube.fr` : NS **Cloudflare** (`abby.ns.cloudflare.com` / `david.ns.cloudflare.com`) depuis 2026-05-03 — zone CF `891229575324408767bf4a0293e5adcc`
- `neomnia.net` : NS Cloudflare — zone CF `8c1283e7c52c34a9d5112c0fb271af27`
- Autres domaines : NS Openprovider standard

> `neokube.fr` zone_id Openprovider = 14798687 (pour modifications DNS via API si NS Openprovider actif, inutilisé depuis migration CF)

**Zones Cloudflare** (20 actives, account_id=`822ba0e8c232e192475e6bd02ce36cb4`) : alloremorquage.fr, charles-vandendriessche.fr, content-mania.com, ecolinks.fr, espace-video.fr, iaa-temoins.fr, lapollo.fr, literie-de-france.com, locsoleil.fr, mission-croissance.fr, nellie.fr, **neokube.fr** (`891229575324408767bf4a0293e5adcc`) ← **domaine de référence**, **neomnia.net** (`8c1283e7c52c34a9d5112c0fb271af27`), neoprospect.fr, neosaas.tech, passion-animaux.fr, redaction-persuasive.fr, referencement-site.be, relation-client.be, sri-solutions.fr.

**Contrainte Neon** : `POST /projects` est bloqué (organisation managed by Vercel). Le pattern utilisé par Nox est **branche-par-projet** sur le projet existant `NeoBridge` (`young-fog-76038471`) :
```
POST /projects/young-fog-76038471/branches
  body: {"branch": {"name": "<slug>"}, "endpoints": [{"type": "read_write"}]}
```
Projets Neon disponibles (pg17, aws-eu-central-1) : NeoBridge, Neosaas-App, Content-Mania, Popurank-Production, neon-fuchsia-window, neosaas-website.

**Note penpot-connector** : créer le secret Vault avant le premier déploiement :
```bash
kubectl exec -n security vault-0 -- vault kv put \
  secret/neokube/infrastructure/penpot \
  PENPOT_EMAIL="admin@example.com" \
  PENPOT_PASSWORD="xxx"
```
`PENPOT_TEMPLATE_FILE_ID` et `PENPOT_TEAM_ID` sont dans `deployment-penpot.yaml` (env vars, valeurs vides par défaut — à renseigner par l'utilisateur).

**Note** : `vault-root-token` doit exister dans `connector-system` — recréer si besoin :
```bash
kubectl create secret generic vault-root-token -n connector-system \
  --from-literal=root-token=$(kubectl get secret vault-init-keys -n security \
    -o jsonpath='{.data.root-token}' | base64 -d)
```

**Note** : `admin-sys-token` doit exister dans `interfaces` ET `agent-system` avec le même token — recréer si besoin (générer un nouveau token, redémarrer admin-sys + Charlotte) :
```bash
TOKEN=$(openssl rand -hex 32)
kubectl create secret generic admin-sys-token -n interfaces --from-literal=token="$TOKEN" --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic admin-sys-token -n agent-system --from-literal=token="$TOKEN" --dry-run=client -o yaml | kubectl apply -f -
kubectl rollout restart deploy/admin-sys-agent -n interfaces
kubectl rollout restart deploy/agent-charlotte -n agent-system
```

---

## Cycle de vie d'un projet — Planification → Production

> Détail complet (phases, flux, gaps P1/P3) : **[CLAUDE-pipeline.md](CLAUDE-pipeline.md)**

| Phase | Agent | Déclencheur | Sortie |
|---|---|---|---|
| **Exploration** | Charlotte | Mention projet → `project_health_check` | Bilan ✅/❌ Zoho/GitHub/Vercel/Penpot/Notion |
| **Planification** | Leon | Brief → dialogue 10 tours → `dispatch_project` | ProjectSpec 13 champs + projet Zoho structuré |
| **Production** | Dispatcher+Aria+Nox+Penpot+Domi+Vera | `POST /trigger` | 2 repos GitHub, Vercel deploy, Neon branch, Penpot design, domaine |

**Gaps ouverts** : trigger Zoho status → production **(P1)** · mapper Zoho→ProjectSpec **(P1)** · email enrichi étape par étape **(P3)**

## Système de notifications — ntfy

**Service** : ntfy v2.11.0, namespace `interfaces`
**GitOps** : `apps/ntfy/base/` (deployment, service, ingress, PVCs)
**URL locale** : `http://ntfy.neokube.local`
**URL publique** : `https://ntfy.neokube.fr` (Cloudflare Tunnel → Traefik → interfaces)
**Topic principal** : `neokube-alerts`
**Vault** : `secret/neokube/apps/ntfy` — `NTFY_ADMIN_PASSWORD`, `NTFY_AGENT_PASSWORD`

### Comptes

| Compte | Rôle | Accès |
|---|---|---|
| `admin` | Admin humain | read-write, accès webUI ntfy |
| `agent` | Agents K8s (Charlotte, Dispatcher, CronJobs) | write-only sur `neokube-alerts` |

**Credentials** :
- Admin : `admin` / `Neomnia2026!` (Vault `NTFY_ADMIN_PASSWORD`)
- Agent : `agent` / `NtfyAgent2026!` (Vault `NTFY_AGENT_PASSWORD`)

### Setup app mobile

1. Télécharger l'app ntfy (iOS App Store / Google Play)
2. "Add subscription" → URL : `https://ntfy.neokube.fr`, Topic : `neokube-alerts`
3. Connexion avec `admin` / `Neomnia2026!`

### Sources d'alertes branchées

| Source | Déclencheur | Priorité | Tags |
|---|---|---|---|
| `llm-key-validation` (CronJob, cockpit) | Quota épuisé / erreur API LLM — toutes les 6h | `urgent`/`high` | warning, robot |
| Grafana Loki (monitoring) | Règles alerting `severity=error\|warning` | default | — |
| Charlotte SRE (agent-system) | OOMKill, CrashLoopBackOff, severity critical/warning | `urgent`/`high` | charlotte, sre |
| Dispatcher (agent-system) | QA bloqué, approval timeout, deploy failed/success | `urgent`/`high`/`low` | dispatcher |

### Pattern d'appel depuis les agents K8s

```python
# URL interne (depuis les pods K8s)
NTFY_URL  = "http://ntfy.interfaces.svc.cluster.local/neokube-alerts"
NTFY_USER = "agent"

# Password lu depuis Vault à l'exécution (pattern standard des agents NeoKube)
# secret/neokube/apps/ntfy → NTFY_AGENT_PASSWORD

# Appel minimal
async with httpx.AsyncClient(timeout=5) as c:
    await c.post(
        NTFY_URL,
        content="Message de notification".encode("utf-8"),
        headers={"Title": "Titre", "Priority": "high", "Tags": "warning"},
        auth=(NTFY_USER, ntfy_pass),
    )
```

**Priorités ntfy** : `min` < `low` < `default` < `high` < `urgent`
**Tags courants** : `warning`, `sos`, `white_check_mark`, `rocket`, `charlotte`, `sre`, `dispatcher`, `clock1`

### Config ntfy (env vars déploiement)

```yaml
NTFY_BASE_URL: "https://ntfy.neokube.fr"          # URL publique pour le relay push iOS
NTFY_CACHE_FILE: "/var/cache/ntfy/cache.db"        # Persistance messages (PVC 1Gi)
NTFY_AUTH_FILE: "/var/lib/ntfy/auth.db"            # Comptes + permissions (PVC 500Mi)
NTFY_AUTH_DEFAULT_ACCESS: "deny-all"               # Tout accès requiert authentification
NTFY_BEHIND_PROXY: "true"                          # Traefik devant ntfy
NTFY_UPSTREAM_BASE_URL: "https://ntfy.sh"          # Relay pour push natif iOS/Android
```

> **NTFY_UPSTREAM_BASE_URL** est obligatoire pour que les notifications push iOS/Android arrivent en dehors de l'app ouverte. ntfy self-hosted délègue le push natif à ntfy.sh comme relay gratuit.

### Recréer les comptes si PVC supprimé

```bash
# Le auth.db est dans le PVC ntfy-data-pvc. Si recréé :
kubectl exec -n interfaces deploy/ntfy -- sh -c \
  'NTFY_PASSWORD="Neomnia2026!" ntfy user add --role=admin admin'
kubectl exec -n interfaces deploy/ntfy -- sh -c \
  'NTFY_PASSWORD="NtfyAgent2026!" ntfy user add agent'
kubectl exec -n interfaces deploy/ntfy -- ntfy access admin neokube-alerts read-write
kubectl exec -n interfaces deploy/ntfy -- ntfy access agent neokube-alerts write-only
```

---

## Stalwart Mail Server v0.11.8

> Documentation complète (10 gotchas config, DNS neokube.fr, Scaleway TEM relay) : **[CLAUDE-stalwart.md](CLAUDE-stalwart.md)**

**Instance** : Docker Scaleway fr-par-1 —  (DEV1-S)
**SSH** : `ssh -i ~/.ssh/id_ed25519_neokube root@51.15.253.114`
**Vault** : `secret/neokube/apps/stalwart` — `ADMIN_PASSWORD`, `NOREPLY_PASSWORD`
**Webadmin** : `http://mail-admin.neokube.local` — login `admin` / Vault `ADMIN_PASSWORD` (webadmin épinglé v0.1.23)
**Webmail** : `http://webmail.neokube.local` (Roundcube, IMAP stalwart-mail:143)
**SMTP interne** : `stalwart-mail.stalwart.svc.cluster.local:587` — plaintext, `start_tls=False`, `validate_certs=False`
**Relay sortant** : Stalwart → smtp-tem-proxy (port 1025 local) → Scaleway TEM HTTP API — Vault `secret/neokube/infrastructure/scaleway`

**Comptes agents** : `no-reply@` (Dispatcher), `leon@`, `vera@`, `domi@neokube.fr`
**Tous les comptes doivent avoir `roles: ["user"]`** sinon Stalwart retourne 550 5.7.1.
**`session.auth.mechanisms`** : utiliser la string expression `"[plain, login, oauthbearer]"` — PAS un tableau TOML.
**`admin@neokube.fr` ne peut pas recevoir de mails** (conflit fallback-admin) — utiliser `chvandendriessche@neomnia.net` pour les alertes.


## Dify v1.13.3 — Agent Builder Studio

**Namespace** : `dify`
**Accès** : `http://dify.neokube.local`
**GitOps** : `~/Kubinote-GitOps/apps/dify/base/`

### Composants (7 pods)
| Déploiement | Image | Rôle |
|---|---|---|
| `dify-postgres` | `postgres:15-alpine` | Base de données principale (DB: `dify`) |
| `dify-redis` | `redis:7-alpine` | Cache et broker Celery |
| `dify-api` | `langgenius/dify-api:1.13.3` | API REST (mode `api`), migrations DB |
| `dify-worker` | `langgenius/dify-api:1.13.3` | Worker Celery asynchrone (mode `worker`) |
| `dify-web` | `langgenius/dify-web:1.13.3` | Frontend Next.js |
| `dify-nginx` | `nginx:1.27-alpine` | Reverse proxy interne (routage /console/api, /api, /v1, /files → api ; / → web) |
| `dify-plugin-daemon` | `langgenius/dify-plugin-daemon:0.5.3-local` | Daemon plugins (requis Dify v1.x) |

### Stockage (hostPath, `/var/lib/dify/`)
| PVC | Taille | Chemin hôte | Monté dans |
|---|---|---|---|
| `dify-postgres-pvc` | 5 Gi | `/var/lib/dify/postgres` | dify-postgres `/var/lib/postgresql/data` |
| `dify-storage-pvc` | 10 Gi | `/var/lib/dify/storage` | dify-api + dify-worker `/app/api/storage` |
| `dify-plugins-pvc` | 5 Gi | `/var/lib/dify/plugins` | dify-plugin-daemon `/app/storage` |

**Note** : tous les pods accédant au storage ont un `initContainer` (busybox, UID 0) qui fait `chown -R 1001:1001` — le container dify tourne en UID 1001.

### Secrets (`dify-secrets`)
| Clé | Description |
|---|---|
| `SECRET_KEY` | Clé Flask/signature JWT |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `REDIS_PASSWORD` | Mot de passe Redis |
| `PLUGIN_DAEMON_KEY` | Clé auth API → plugin daemon |
| `INNER_API_KEY_FOR_PLUGIN` | Clé auth plugin daemon → API |

### Bases de données PostgreSQL
- `dify` — données principales (comptes, workspaces, agents, conversations)
- `dify_plugin` — données plugin daemon (plugins installés, état)

### Intégrations stack NeoKube
- **Vector store** : Qdrant (`http://qdrant.rag-system.svc.cluster.local:6333`)
- **LLM** : via LiteLLM (`http://litellm.neokube.local`) — configurer dans Settings > Model Provider

---

## SurfSense — Moteur de recherche RAG (alternatif Perplexity)

> Documentation complète (composants, stockage, déploiement, 9 gotchas) : **[CLAUDE-surfsense.md](CLAUDE-surfsense.md)**

**Namespace** : `surfsense` — **GitOps** : `~/Kubinote-GitOps/apps/surfsense/base/`
**URLs** : `https://surfsense.neokube.fr` (frontend) · `https://surfsense-api.neokube.fr` (API) · `https://surfsense-zero.neokube.fr` (zero-cache)
**Vault** : `secret/neokube/apps/surfsense` — `SECRET_KEY`, `DB_PASSWORD`, `ZERO_ADMIN_PASSWORD`, `SEARXNG_SECRET`
**Embedding** : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (local, 384-dim) — chonkie ignore `base_url` OpenAI
**API interne** : `POST http://surfsense-backend.surfsense.svc.cluster.local:8000/api/v1/chat`

**Points critiques** :
- Toujours accéder via `https://surfsense.neokube.fr` — CORS bloqué sur l'URL `.neokube.local`
- Après installation fraîche : `ALTER PUBLICATION zero_publication ADD TABLE "user"` + restart zero-cache (sinon frontend instable)
- Nouvel espace créé → configurer `agent_llm_id` sur un LLM réel (défaut=0 = cloud SurfSense → rien ne fonctionne en self-hosted)

---

## Évaluation RAG — RAGAS + Langfuse

### Présentation
Notation automatique de la qualité RAG via **RAGAS 0.4** avec envoi des scores dans **Langfuse**.

- Script : `~/scripts/rag_eval.py`
- LLM judge : `gemini-flash` via LiteLLM proxy (`http://litellm.neokube.local/v1`)
- Collection évaluée : `neomnia_core` (Qdrant, 260k vecteurs, dim=384)
- Embeddings : `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers)

### Métriques évaluées (sans ground truth)
| Métrique Langfuse | Classe RAGAS | Description |
|---|---|---|
| `faithfulness` | `Faithfulness` | Fidélité de la réponse aux contextes récupérés |
| `answer_relevancy` | `AnswerRelevancy` | Pertinence de la réponse à la question posée |
| `context_precision` | `ContextPrecisionWithoutReference` | Précision des contextes récupérés |

### Pipeline (4 étapes)
1. Embedding de la requête (sentence-transformers)
2. Récupération top-K contextes depuis Qdrant
3. Génération de la réponse (LiteLLM → gemini-flash)
4. Évaluation RAGAS → envoi des 3 scores sur la trace Langfuse

### Commandes utiles
```bash
# Une seule évaluation (query par défaut)
python3 ~/scripts/rag_eval.py --once

# Question personnalisée
python3 ~/scripts/rag_eval.py --once --query "Comment fonctionne l'ingestion SharePoint ?"

# Boucle toutes les 30 min (mode monitoring)
python3 ~/scripts/rag_eval.py

# Attacher les scores à une trace Langfuse existante
python3 ~/scripts/rag_eval.py --once --trace-id <trace_id>

# Personnaliser le nombre de contextes récupérés
python3 ~/scripts/rag_eval.py --once --top-k 5
```

### Variables d'environnement
| Variable | Valeur par défaut |
|---|---|
| `QDRANT_URL` | `http://51.159.27.101:6333` |
| `QDRANT_COLLECTION` | `neomnia_core` |
| `LANGFUSE_HOST` | `http://langfuse.neokube.local` |
| `LITELLM_BASE_URL` | `http://litellm.neokube.local/v1` |
| `LITELLM_MODEL` | `gemini-flash` |

### Dépendances installées
```
ragas==0.4.3
langchain-openai==1.1.15
datasets==4.8.4
```

---

## Penpot — Gestion des projets et fichiers (agent penpot-agent v3.x)

**Instance** : `penpot` namespace — backend `penpot-backend.penpot.svc.cluster.local:6060`
**Connector** : `penpot-connector` port 8004 — proxy RPC API, auth session cookie (Vault `secret/neokube/infrastructure/penpot`)
**Team de référence** : `Neomnia Studio` — ID `82052e4a-914a-8123-8007-d697aa5fd265`
**URL publique** : `https://design.neokube.fr` (Cloudflare Tunnel → Traefik → penpot-frontend)
**URL locale** : `http://penpot.neokube.local` (réseau LAN uniquement — ne jamais utiliser dans les liens livrés)

### Structure de projets — Convention

| Projet | Équipe | Usage |
|---|---|---|
| `Neomnia.net Refonte — Design` | Neomnia Studio | Un projet par client/refonte — créé par l'agent penpot |
| `Drafts` | Neomnia Studio | Brouillons manuels — ne pas toucher |
| `Drafts` | Default | Brouillons personnels — ne pas toucher |

**Règle** : un seul projet actif par client dans "Neomnia Studio". L'agent ne crée un nouveau projet que si aucun projet actif pour ce `zoho_project_id` n'existe déjà.

### URL de livraison — format correct

```
https://design.neokube.fr/workspace?project-id={project_id}&file-id={file_id}
```

**Prérequis** : l'utilisateur doit être connecté à Penpot (`https://design.neokube.fr`) avant d'ouvrir ce lien. Le SPA affiche une "404" si la session est absente — ce n'est pas un bug d'URL, c'est une exigence d'authentification.

> `PENPOT_FRONTEND_URL=https://design.neokube.fr` dans `deployment-penpot.yaml` — ne jamais utiliser `penpot.neokube.local` pour les URLs de livraison.

### Vérifier qu'un fichier existe (avant de livrer l'URL)

```python
async def _verify_penpot_url(project_id: str, file_id: str) -> bool:
    r = await httpx.AsyncClient(timeout=10).post(
        f"{PENPOT_CONNECTOR_URL}/proxy",
        json={"path": "get-project-files", "body": {"project-id": project_id}}
    )
    if r.status_code != 200: return False
    files = r.json()
    return isinstance(files, list) and any(f.get("id") == file_id for f in files)
```

### Lister les projets d'une équipe

```python
# get-projects retourne TOUS les projets y compris les soft-deleted — filtrer côté client
r = await c.post(f"{PENPOT_CONNECTOR_URL}/proxy",
    json={"path": "get-projects", "body": {"team-id": PENPOT_TEAM_ID}})
projects = [p for p in r.json() if isinstance(p, dict)]
```

### Gotchas penpot-connector

**1. `delete-project` = soft-delete, pas hard-delete**

`delete-project` pose `deleted_at = now() + 7 jours`. Le projet reste visible dans `get-projects` pendant 7 jours (Penpot n'a pas de filtrage côté API — c'est le frontend qui masque les projets supprimés). Pour un hard-delete immédiat, aller en SQL :

```bash
kubectl exec -n penpot penpot-postgres-<pod> -- psql -U penpot -d penpot -c "
SET rules.deletion_protection TO off;
DO \$\$
DECLARE file_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(f.id) INTO file_ids
  FROM file f JOIN project p ON f.project_id = p.id
  WHERE p.id = '<project_id>';

  DELETE FROM file_tagged_object_thumbnail WHERE file_id = ANY(file_ids);
  DELETE FROM file_object_thumbnail         WHERE file_id = ANY(file_ids);
  DELETE FROM file_thumbnail                WHERE file_id = ANY(file_ids);
  DELETE FROM file_change                   WHERE file_id = ANY(file_ids);
  DELETE FROM file_media_object             WHERE file_id = ANY(file_ids);
  DELETE FROM file_data                     WHERE file_id = ANY(file_ids);
  -- file_data_00 à file_data_15 si nécessaire
  DELETE FROM file WHERE id = ANY(file_ids);
  DELETE FROM project WHERE id = '<project_id>';
END \$\$;
"
```

Tables avec FK CASCADE (supprimées automatiquement quand le fichier est supprimé) : `comment_thread`, `file_library_rel`, `file_profile_rel`, `file_data_fragment`, `share_link`, `usage_quote`, `presence`.

Tables NO ACTION (à supprimer manuellement avant le fichier) : `file_data`, `file_data_00..15`, `file_change`, `file_media_object`, `file_thumbnail`, `file_object_thumbnail`, `file_tagged_object_thumbnail`.

**2. Réponse 204 du connecteur — bug cosmétique**

Quand Penpot répond `204 No Content` (ex: `delete-project`), le connecteur tente de retourner `JSONResponse(204, {"text": ""})` → `RuntimeError: Response content longer than Content-Length` dans uvicorn. Ce crash est **cosmétique** : le client reçoit quand même le `204`, et l'opération Penpot s'est bien exécutée.

**3. `get-project-files` utilise `path=`, pas `command=`**

```python
# CORRECT
json={"path": "get-project-files", "body": {"project-id": project_id}}

# FAUX — retourne 422
json={"command": "get-project-files", "body": {"project-id": project_id}}
```

**4. Idempotence — vérifier avant de créer**

Avant de créer un nouveau projet Penpot pour un `zoho_project_id`, vérifier si un projet actif existe déjà :

```python
existing = [p for p in projects if p.get("name", "").startswith(spec["title"]) and not p.get("deletedAt")]
if existing:
    return existing[0]["id"]  # réutiliser
```

### RAG design — collection `zoho-tasks`

L'agent Penpot indexe ses briefs design dans Qdrant collection `zoho-tasks` (768 dims, Cosine) :
- 1 point global par projet (`{zoho_project_id}__global`)
- 1 point par page du site (`{zoho_project_id}_{page_key}`)
- IDs stables via `md5(key)[:15]` — un deuxième run remplace les points existants (idempotent)
- Payload : `type`, `page_key`, `page_title`, `zoho_task_id`, `sections`, `acceptance_criteria`, `contenu`, `penpot_url`, `indexed_at`, `source="penpot-agent-v3.3"`

---

## Pièges connus — Anti-patterns à éviter

> Code + exemples complets : **[CLAUDE-antipatterns.md](CLAUDE-antipatterns.md)**

| # | Piège | Règle |
|---|---|---|
| 1 | Vercel `repoId` | `int`, pas `str` — sinon `incorrect_git_source_info` |
| 2 | `asyncio.gather` Temporal | `return_exceptions=True` pour activités optionnelles (Penpot, Domi) |
| 3 | ProjectSpec nouveau champ | 3 endroits : schema Leon + dict spec + `validate_spec setdefault` |
| 4 | `os.getenv()` en production | Toute variable active doit être dans le ConfigMap, pas juste dans le code |
| 5 | ConfigMap modifié | `kubectl rollout restart` obligatoire — K8s ne recharge pas automatiquement |
| 6 | SMTP Stalwart | `stalwart-mail:587` (SMTP), PAS `stalwart-web` (HTTP admin) |
| 7 | `_embed()` HuggingFace | Retourne 768 scalaires séparés, pas un vecteur — détecter avec `isinstance(first, list)` |
| 8 | URLs externes | Construire dans le connector (`_inject_web_urls`), jamais dans l'agent |

## Règles de conception connector-system

> Ces règles s'appliquent à tout nouveau connector ajouté dans `connector-system`.

**R1 — Un connector = source de vérité unique pour son API**
Credentials, URL de base, headers obligatoires, post-processing des réponses : tout appartient au connector. Un agent ne doit jamais lire un secret d'API directement ni construire une URL vers l'API externe.

**R2 — Enrichir à la sortie, pas dans les agents**
Toute normalisation de réponse (renommage de champs, injection d'URLs web, casting de types) se fait dans le connector avant le `return`. Voir `_inject_web_urls()` dans `zoho-connector` v1.1 comme référence.

**R3 — Toujours exposer `/health` et `/proxy`**
`/health` doit être libre (probes K8s). `/proxy` reçoit `{method, path, data?}` et redirige vers l'API externe. Endpoints spécialisés en bonus si nécessaire (`/query` pour neon-connector, `/accounts` pour stalwart-connector).

**R4 — Valider les URLs avec le navigateur avant de les coder**
Toute URL construite manuellement doit être testée dans un vrai navigateur avant d'être codée dans un connector ou documentée. Ne jamais supposer le format depuis la doc officielle ou d'autres patterns Zoho — le SPA Zoho utilise des routes `#fragment` non documentées.

**R5 — Domaines publics = neokube.fr (Cloudflare-managed) — domaine de référence depuis 2026-05-03**
Tout nouveau service exposé publiquement via le cluster Neokube utilise un sous-domaine `*.neokube.fr`. `neokube.fr` est désormais dans Cloudflare (NS CF actifs) — les CNAME proxied vers `cfargotunnel.com` fonctionnent. `neomnia.net` reste actif dans CF/tunnel mais `neokube.fr` est la référence. Ne jamais exposer de services sur un domaine dont le DNS n'est PAS géré par Cloudflare — le proxy CF est requis pour que le tunnel fonctionne (TLS).

---

## Règle R9 — Gouvernance LLM par agent (verrouillé 2026-05-06)

> Cette règle s'applique à tout agent dans `agent-system` et tout nouveau agent NeoKube.

### Principe

Chaque agent a son propre profil LLM, configuré dans son deployment K8s. **Jamais de modèle hardcodé dans le code Python** — toujours lu depuis les variables d'environnement.

### Profils LLM actifs (état 2026-05-06)

| Agent | `LLM_MODEL` | `LLM_MODEL_REASONING` | `LLM_FALLBACK` | Justification |
|---|---|---|---|---|
| **Charlotte** SRE | `claude-sonnet` | — | — | Décisions critiques cluster, meilleur raisonnement |
| **Leon** Chef de Projet | `mistral-large-2407` | `mistral-large-2407` | — | Dialogue client, multi-LLM natif selon complexité |
| **Dispatcher** | `gemini-flash` | — | — | Orchestration pure, pas de génération lourde |
| **Aria** Frontend | `codestral` | — | — | Génération de code optimisée |
| **Nox** Backend | `codestral` | — | — | Génération de code optimisée |
| **Vera** QA | `mistral-large-2407` | — | — | Analyse qualité et raisonnement |
| **Penpot** Design | `gemini-flash` | — | — | Scaffolding léger |
| **Domi** Domain Infra | `gemini-flash` | — | — | Opérations déterministes |
| **Neo** Assistant | `mistral-large-2407` | — | `gemini-flash` | Assistant démo client, fine-tuning futur |

### Règles strictes

**R9.1 — `LLM_MODEL` obligatoire dans chaque deployment**
Tout deployment agent-system DOIT avoir `LLM_MODEL` comme variable d'environnement explicite. Le défaut dans le code est une valeur de secours de développement, pas une config de production.

**R9.2 — Le modèle global `mistral` ne change pas sans validation**
L'alias `mistral` dans LiteLLM est verrouillé sur `mistral-large-2407`. Changer la version impacte tous les agents qui l'utilisent — nécessite revue de tous les profils du tableau ci-dessus.

**R9.3 — Neo est isolé des autres agents**
Neo est l'assistant démo client. Son modèle (`mistral-large-2407`, futur fine-tuné) est indépendant des agents de production (Charlotte, Leon, Dispatcher…). Modifier le modèle de Neo ne modifie pas les autres agents, et vice-versa.

**R9.4 — Multi-LLM dans un workflow = variables séparées**
Si un agent utilise plusieurs LLM dans son process (ex: Leon `LLM_MODEL` + `LLM_MODEL_REASONING`), chaque rôle a sa propre variable d'environnement dans le deployment. Jamais de switch de modèle par logique conditionnelle hardcodée dans le code.

**R9.5 — Virtual keys LiteLLM — ✅ ACTIF depuis 2026-05-06**
PostgreSQL `litellm-postgres` branché sur LiteLLM (namespace `cockpit`). Une virtual key par agent, budget mensuel défini, stockée dans Vault `secret/neokube/agents/{name}/llm` (champ `LITELLM_API_KEY`). Secret K8s `litellm-agent-keys` dans `agent-system` — clés `LITELLM_KEY_{AGENT}`. Aucun agent n'utilise plus `LITELLM_MASTER_KEY`.

**R9.6 — Langfuse : toujours `cluster-manager-secrets` depuis `agent-system`**
`cockpit-secrets` est dans le namespace `cockpit` — inaccessible depuis `agent-system`. Pour `LANGFUSE_PUBLIC_KEY` et `LANGFUSE_SECRET_KEY`, toujours référencer `cluster-manager-secrets` (namespace `agent-system`). Clés Langfuse actives : `secret/neokube/infrastructure/langfuse` dans Vault. Public key : `pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f`. Projet Langfuse unique : `neokube-agents` (id `d869b2aec6ce42eeb2a676d89`).

### Pattern d'appel LLM correct dans le code agent

```python
LLM_MODEL        = os.getenv("LLM_MODEL",        "mistral-large-2407")  # défaut = dev seulement
LITELLM_BASE_URL = os.getenv("LITELLM_BASE_URL",  "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_API_KEY  = os.getenv("LITELLM_API_KEY",   "")   # virtual key depuis litellm-agent-keys
LANGFUSE_PK      = os.getenv("LANGFUSE_PUBLIC_KEY","")
LANGFUSE_SK      = os.getenv("LANGFUSE_SECRET_KEY","")

# Appel avec metadata agent obligatoire (traçabilité Langfuse par user_id)
response = await httpx.AsyncClient().post(
    f"{LITELLM_BASE_URL}/v1/chat/completions",
    headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
    json={
        "model": LLM_MODEL,
        "messages": messages,
        "user": "nom-agent",                           # ← user_id dans Langfuse
        "metadata": {"agent": "nom-agent", "workflow": "nom-workflow"}
    }
)
```

---

## Checklist — Intégration d'un nouvel agent NeoKube

> À suivre intégralement pour chaque nouvel agent ajouté dans `agent-system`. Aucune étape ne peut être sautée.

### 0. Décider les paramètres de base (avant de coder)

| Paramètre | Valeurs possibles | Exemple |
|---|---|---|
| `{name}` | slug lowercase | `felix` |
| `{port}` | prochain libre après 8489 | `8491` |
| `{temporal_ns}` | si agent Temporal, sinon `—` | `dispatcher` ou nouveau |
| `{llm_model}` | voir §R9 | `mistral-large-2407` |
| `{budget_eur}` | selon charge prévue | `5` |

**Mettre à jour les deux tables dans CLAUDE.md :**
- §Architecture agents → ajouter la ligne (Rôle, Runtime, Port, Temporal NS, Status)
- §R9 → ajouter la ligne (LLM_MODEL, justification)

### 1. ServiceAccount K8s (sécurité — pas de ClusterRoleBinding sauf besoin explicite)
```bash
kubectl create serviceaccount {name}-sa -n agent-system
# Pas de ClusterRoleBinding par défaut — voir §RBAC agents si accès K8s requis
```

### 2. Virtual key LiteLLM + Vault + secret K8s
```bash
# 2a. Créer la virtual key
MASTER_KEY="sk-neokube-litellm-master"
VKEY=$(curl -s -X POST http://litellm.neokube.local/key/generate \
  -H "Authorization: Bearer $MASTER_KEY" -H "Content-Type: application/json" \
  -d "{\"key_alias\":\"agent-{name}\",\"metadata\":{\"agent\":\"{name}\"},\"models\":[\"{llm_model}\",\"gemini-flash\",\"nomic-embed-text\"],\"max_budget\":{budget_eur},\"budget_duration\":\"1mo\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])")
echo "Virtual key : $VKEY"

# 2b. Stocker dans Vault
kubectl exec -n security vault-0 -- vault kv put secret/neokube/agents/{name}/llm \
  LITELLM_API_KEY="$VKEY" LLM_MODEL="{llm_model}" BUDGET_EUR="{budget_eur}"

# 2c. Ajouter au secret K8s litellm-agent-keys
kubectl patch secret litellm-agent-keys -n agent-system --type='json' -p="[
  {\"op\":\"add\",\"path\":\"/data/LITELLM_KEY_{NAME_UPPER}\",\"value\":\"$(echo -n $VKEY | base64 -w0)\"}
]"
```

### 3. Deployment K8s — template complet

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {name}
  namespace: agent-system
  labels:
    app: {name}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {name}
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: {name}
    spec:
      serviceAccountName: {name}-sa
      nodeSelector:
        kubernetes.io/hostname: kubinote
      containers:
      - name: {name}
        image: python:3.12-slim
        env:
        # ── LLM (R9) ────────────────────────────────────────────────────────
        - name: LITELLM_API_KEY
          valueFrom:
            secretKeyRef:
              name: litellm-agent-keys      # TOUJOURS litellm-agent-keys
              key: LITELLM_KEY_{NAME_UPPER}
        - name: LLM_MODEL
          value: "{llm_model}"              # JAMAIS de défaut implicite en prod
        - name: LITELLM_BASE_URL
          value: "http://litellm.cockpit.svc.cluster.local:4000"
        # ── Langfuse (R9.6) ─────────────────────────────────────────────────
        - name: LANGFUSE_PUBLIC_KEY
          value: "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
        - name: LANGFUSE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: cluster-manager-secrets # JAMAIS cockpit-secrets (mauvais namespace)
              key: LANGFUSE_SECRET_KEY
        - name: LANGFUSE_BASE_URL
          value: "http://langfuse.cockpit.svc.cluster.local:3000"
        # ── Vault ────────────────────────────────────────────────────────────
        - name: VAULT_ADDR
          value: "http://vault.security.svc.cluster.local:8200"
        - name: VAULT_TOKEN
          valueFrom:
            secretKeyRef:
              name: vault-root-token
              key: root-token
              optional: true
        # ── Agent port ───────────────────────────────────────────────────────
        - name: AGENT_PORT
          value: "{port}"
        ports:
        - containerPort: {port}
          name: http
        livenessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 120
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: {port}
          initialDelaySeconds: 90
          periodSeconds: 15
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

### 4. Service K8s
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {name}
  namespace: agent-system
spec:
  selector:
    app: {name}
  ports:
  - port: {port}
    targetPort: {port}
```

### 5. Namespace Temporal (si agent Temporal uniquement)
```bash
# Créer le namespace Temporal (idempotent via cluster-bootstrap)
# Ajouter dans apps/agent-system/base/configmap-temporal-namespaces.yaml :
# - name: {name}, retention: 7d
```

### 6. Code Python — pattern standard obligatoire
```python
import os, httpx

AGENT_NAME       = "{name}"
LLM_MODEL        = os.getenv("LLM_MODEL",        "mistral-large-2407")
LITELLM_BASE_URL = os.getenv("LITELLM_BASE_URL",  "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_API_KEY  = os.getenv("LITELLM_API_KEY",   "")
LANGFUSE_PK      = os.getenv("LANGFUSE_PUBLIC_KEY","")
LANGFUSE_SK      = os.getenv("LANGFUSE_SECRET_KEY","")
VAULT_ADDR       = os.getenv("VAULT_ADDR",        "http://vault.security.svc.cluster.local:8200")
VAULT_TOKEN      = os.getenv("VAULT_TOKEN",       "")

# Appel LLM — user + metadata obligatoires pour traçabilité Langfuse
async def call_llm(messages: list, workflow: str = "") -> str:
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model":    LLM_MODEL,
                "messages": messages,
                "user":     AGENT_NAME,                          # ← user_id Langfuse
                "metadata": {"agent": AGENT_NAME, "workflow": workflow}
            }
        )
    return r.json()["choices"][0]["message"]["content"]
```

### 7. Kustomization + déploiement
```bash
# Ajouter dans apps/agent-system/base/kustomization.yaml :
#   - deployment-{name}.yaml
#   - service-{name}.yaml

kubectl apply -f ~/Kubinote-GitOps/apps/agent-system/base/deployment-{name}.yaml
kubectl apply -f ~/Kubinote-GitOps/apps/agent-system/base/service-{name}.yaml

# Vérification complète
kubectl exec deploy/{name} -n agent-system -- env | grep -E "LITELLM|LANGFUSE|LLM_MODEL|VAULT"
```

---

## Historique des actions Claude

Archivé dans [CLAUDE-history.md](CLAUDE-history.md) — 60 entrées, 2026-03-15 → 2026-05-05.
Toutes les phases de sécurité (0–3) et capacités (4a–10d) sont ✅ terminées.
