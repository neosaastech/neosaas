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
| `connector-system` | zoho-connector (OAuth2+proxy, port 8000), github-connector (proxy GitHub API, port 8001), vercel-connector (proxy Vercel API, port 8002), neon-connector (proxy Neon API + SQL, port 8003), penpot-connector (proxy Penpot RPC API, port 8004), openprovider-connector (registrar API, port 8005), cloudflare-connector (DNS/zones API, port 8006), **stalwart-connector** (admin mail API, port 8007) |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-agent-injector, vault-unsealer |
| `management` | CronJob cluster-bootstrap, neokube-nightly-backup |
| `penpot` | Penpot (design) |
| `stalwart` | Stalwart Mail Server v0.11.8 — SMTP/IMAP/Sieve, domaine `mail.neokube.fr` |
| `dify` | Dify v1.13.3 (agent builder studio) — accès `http://dify.neokube.local` |

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
| **Charlotte** | SRE Orchestratrice — surveillance cluster, réception ProjectSpec | Temporal | 8383 | `sre-charlotte` | active v2.5 |
| **Leon** | Chef de Projet — qualification brief, émission ProjectSpec, Zoho, dispatch | Temporal | 8181 | `leon` | active v2.0 |
| **Dispatcher** | Orchestre DevProjectWorkflow — validate→Aria+Nox+Penpot→Vera→approval→deploy | Temporal | 8484 | `dispatcher` | active v1.0 |
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
Brief (Slack #produit / Open WebUI)
  → Leon : dialogue de clarification (max 10 tours)
  → Leon : produit ProjectSpec JSON (11 champs validés)
  → Leon : dispatch_project → POST /trigger Dispatcher
  → Leon : crée tâches dans Zoho Projects
  ──────────────────────────────────────────────────────
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
| `cloudflare-connector` | 8006 | `secret/neokube/infrastructure/cloudflare` | `CF_API_TOKEN`, `CF_ACCOUNT_ID` (optionnel) |
| `stalwart-connector` | 8007 | `secret/neokube/apps/stalwart` | `ADMIN_PASSWORD` |

**Endpoints exposés** :
- Tous : `GET /health`, `POST /proxy {method?, path, params?, body?}`
- neon-connector uniquement : `POST /query {project_id, sql, database?, role_name?}`
- vercel-connector : injecte automatiquement `teamId` dans les params
- penpot-connector : `path` = nom de la commande RPC Penpot (ex. `create-project`) ; auth session cookie-based, re-login auto sur 401
- openprovider-connector : auth JWT via login username/password, re-login auto sur 401 ; API base `https://api.openprovider.eu/v1beta`
- cloudflare-connector : Bearer token statique ; endpoint bonus `GET /zones` ; API base `https://api.cloudflare.com/client/v4`
- stalwart-connector : auth Basic `admin:ADMIN_PASSWORD` injectée auto ; endpoints bonus `GET /accounts`, `POST /accounts/create {name, password, display_name?, quota?}`, `DELETE /accounts/{account}` ; cible `http://stalwart-web.stalwart.svc.cluster.local:8080`

**Domaines Openprovider** (7 actifs) : `neokube.fr`, `neomnia.net`, `popurank.com`, `datapublishhub.com`, `redaction-persuasive.fr`, `mission-croissance.fr`, `referencement-site.be`. DNS de `neokube.fr` géré directement par Openprovider (pas dans Cloudflare).

**Zones Cloudflare** (19 actives, account_id=`822ba0e8c232e192475e6bd02ce36cb4`) : alloremorquage.fr, charles-vandendriessche.fr, content-mania.com, ecolinks.fr, espace-video.fr, iaa-temoins.fr, lapollo.fr, literie-de-france.com, locsoleil.fr, mission-croissance.fr, nellie.fr, **neomnia.net** (`8c1283e7c52c34a9d5112c0fb271af27`), neoprospect.fr, neosaas.tech, passion-animaux.fr, redaction-persuasive.fr, referencement-site.be, relation-client.be, sri-solutions.fr.

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

## Stalwart Mail Server v0.11.8

**Namespace** : `stalwart`
**GitOps** : `~/Kubinote-GitOps/apps/stalwart/base/`
**Domaine** : `mail.neokube.fr` (Traefik ingress + LoadBalancer 192.168.1.28)
**Vault** : `secret/neokube/apps/stalwart` — `ADMIN_PASSWORD`, `DKIM_SELECTOR`, `DKIM_PUBKEY_DNS`, `NOREPLY_PASSWORD`
**Connector** : `stalwart-connector` port 8007 (`http://stalwart-connector.connector-system.svc.cluster.local:8007`)

### Comptes mail agents

| Adresse | Agent | Vault path | Usage |
|---|---|---|---|
| `admin@neokube.fr` | admin (id=65) | `secret/neokube/apps/stalwart` `ADMIN_PASSWORD` | Compte admin Stalwart, alertes infra |
| `leon@neokube.fr` | Leon | `secret/neokube/agents/leon` `MAIL_FROM`/`MAIL_PASSWORD` | Email de bienvenue client, résumé brief |
| `vera@neokube.fr` | Vera | `secret/neokube/agents/vera` `MAIL_FROM`/`MAIL_PASSWORD` | Rapports QA, alertes blocantes |
| `domi@neokube.fr` | Domi | `secret/neokube/agents/domi` `MAIL_FROM`/`MAIL_PASSWORD` | Alertes renouvellement domaine |
| `no-reply@neokube.fr` | Dispatcher | `secret/neokube/apps/stalwart` `NOREPLY_PASSWORD` | Notifications workflow automatiques post-deploy |

**SMTP interne** : `stalwart-web.stalwart.svc.cluster.local:587` (STARTTLS, auth PLAIN)
**Activité Dispatcher** : `dispatcher_send_client_mail` — envoyée si `spec.client_email` présent, non-bloquante

### Gotchas config v0.11.8

> Ces points ont causé des heures de debug — les noter impérativement.

**1. Section admin fallback — tiret obligatoire**
```toml
# CORRECT v0.11.8
[authentication.fallback-admin]
user = "admin"
secret = "$6$..."   # SHA-512 crypt

# FAUX (section ignorée silencieusement)
[authentication.fallback.credentials]
```

**2. Secret = hash SHA-512 crypt, pas plaintext**
```bash
# Générer un hash SHA-512 (format $6$salt$hash)
python3 -c "import crypt; print(crypt.crypt('monpassword', crypt.mksalt(crypt.METHOD_SHA512)))"
# ou
openssl passwd -6 "monpassword"
```

**3. Path RocksDB sans sous-dossier `/db`**
```toml
[store.rocksdb]
path = "/opt/stalwart-mail/data"   # CORRECT — stalwart --init crée ici
# path = "/opt/stalwart-mail/data/db"  # FAUX — causait "No such file or directory"
```

**4. `[authentication.fallback-admin]` ne fonctionne que si la DB est vide**
Si des principals existent déjà dans RocksDB, le fallback est ignoré. Pour réinitialiser :
```bash
kubectl scale statefulset stalwart -n stalwart --replicas=0
# attendre termination complète
kubectl run -it --rm cleanup --image=busybox --restart=Never -- \
  sh -c "rm -rf /data/*"  # avec volumeMount vers le PVC stalwart
kubectl scale statefulset stalwart -n stalwart --replicas=1
```

**5. API REST Stalwart — endpoints utiles**
```bash
# Base URL interne : http://stalwart-web.stalwart.svc.cluster.local:8080
# Auth : Basic admin:ADMIN_PASSWORD

# Lister les domaines
GET /api/principal?types=domain

# Lister les comptes
GET /api/principal?types=individual

# Créer un compte mail
POST /api/principal
{"name":"user@domain.fr","type":"individual","quota":0,"secrets":["password"],"emails":["user@domain.fr"]}

# Supprimer un compte
DELETE /api/principal/user@domain.fr
```

**6. Auto-ban (`fail2ban`) — config dans `config.toml` uniquement**
```toml
[server.fail2ban]
rate = "100/1d"   # bannit après 100 erreurs d'auth en 24h
```
L'endpoint `POST /api/settings/{key}` retourne 404 — seul `config.toml` fonctionne pour cette directive.

### DNS neokube.fr (Openprovider)

Les enregistrements mail de `neokube.fr` sont gérés par **Openprovider DNS** (pas Cloudflare) :
- `MX` : `mail.neokube.fr` priorité 10
- `A` : `mail.neokube.fr` → IP publique
- `TXT` : SPF `v=spf1 mx ~all`
- `TXT` : DKIM `mail._domainkey` → clé RSA 2048 du secret `stalwart-dkim`
- `TXT` : DMARC `_dmarc` → `v=DMARC1; p=none; rua=mailto:postmaster@neokube.fr`

Mise à jour DNS via openprovider-connector :
```bash
# PUT (remplace toute la zone) — POST/PATCH retournent "Method is not implemented"
PUT /dns/zones/neokube.fr  body: {"records": [...]}
```

---

### Roadmap sécurité agents

| Phase | Contenu | État |
|---|---|---|
| **Phase 0** | RBAC Charlotte réduit, AgentSpec Leon v2.0 | ✅ Terminé 2026-04-26 |
| **Phase 1** | Namespace `connector-system` + zoho-connector (complet) + stubs github/vercel | ✅ Terminé 2026-04-26 |
| **Phase 1b** | Leon : migration activités Temporal Zoho → zoho-connector ; github-connector + vercel-connector complets ; Leon sans secrets directs Zoho/GitHub/Vercel | ✅ Terminé 2026-04-26 |
| **Phase 2** | Sidecars `tool-validator` + `output-guard` sur Charlotte et Leon | ✅ Terminé 2026-04-26 |
| **Phase 3** | `neon-connector` (proxy Neon API + endpoint `/query` asyncpg) ; Leon sans secrets Neon directs | ✅ Terminé 2026-04-26 |

### Roadmap capacités agents (Phase 4+)

> Vérification doublons effectuée le 2026-04-26 : `sre_provision_agent` et `sre_decommission_agent` sont implémentés
> (`ProvisionAgentWorkflow` L2778 + `DecommissionAgentWorkflow` L2884 dans `configmap-sre-script.yaml`).
> `ProjectSpec` est défini dans `apps/agent-catalog/leon.yaml` `output_schema` (11 champs).

| Phase | Contenu | Prérequis | État |
|---|---|---|---|
| **Phase 4a** | DT-005 : gate `sre_qdrant_check_prior_remediation` avant `sre_apply_remediation` + `sre_vectorize_remediation_outcome` pour alimenter la mémoire | — | ✅ Terminé 2026-04-26 |
| **Phase 4b** | `sre_agent_health_matrix` — snapshot pod/CPU/RAM/probe par agent actif (registre K8s) ; SREScanWorkflow étape 8 ; endpoint `GET /agents/health` | — | ✅ Terminé 2026-04-26 |
| **Phase 4c** | Charlotte → zoho-connector : `ZOHO_CONNECTOR_URL` dans deployment + charlotte-config ; `known_tools` documenté dans agent-policies (`allowed=null` conservé) | — | ✅ Terminé 2026-04-26 |
| **Phase 5** | Dispatcher `DevProjectWorkflow` : Leon→Aria+Nox (parallèle)→Vera→approbation humaine (24h)→deploy. Pod dédié `dispatcher` port 8484, Temporal namespace `dispatcher`. | — | ✅ Terminé 2026-04-27 |
| **Phase 5b** | Collections Qdrant `pm-decisions`/`front-specs`/`api-contracts`/`qa-reports` — 768 dims, auto-créées par Dispatcher au démarrage | Phase 5 déployée | ✅ Terminé 2026-04-27 |
| **Phase 6** | Pods dédiés Aria (8485/aria-queue), Nox (8486/nox-queue), Vera (8487/vera-queue) — scripts dédiés, ServiceAccounts, task_queue séparées dans DevProjectWorkflow | — | ✅ Terminé 2026-04-27 |
| **Phase 7** | admin-sys promu K8s executor v4.0 ; Charlotte `_kubectl()` routée via `POST /execute` admin-sys ; fallback local read-only si admin-sys KO ; `ClusterRole admin-sys-executor` en GitOps | — | ✅ Terminé 2026-04-27 |
| **Phase 10d** | `penpot-connector` v1.0 (port 8004) — proxy Penpot RPC API self-hosted, auth session cookie Vault ; agent `Penpot` v1.0 (port 8488, penpot-queue) — `penpot_create_design` : create-project + duplicate-file ; DevProjectWorkflow gather 2→3 (Aria+Nox+Penpot) ; Vera v1.1 + penpot check (non-bloquant) ; zoho_callback enrichi du lien Design ; registre v1.6 | — | ✅ Terminé 2026-04-28 |

**Note R3 / max_tokens_per_run** : ces items sont introuvables dans le dépôt GitOps. S'ils proviennent d'un document Notion ou externe, les localiser avant d'implémenter.

---

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

## Pièges connus — Anti-patterns à éviter

### 1. Vercel `gitSource.repoId` doit être un `int`

L'API Vercel `/v13/deployments` exige que `repoId` soit un entier (`int`), pas une chaîne.
Passer `str(link["repoId"])` produit l'erreur `incorrect_git_source_info` sans message clair.

```python
# FAUX
body["gitSource"] = {"type": "github", "ref": ref, "repoId": str(link["repoId"])}
# CORRECT
body["gitSource"] = {"type": "github", "ref": ref, "repoId": int(link["repoId"])}
```

Fallback si `repoId` vaut 0 : utiliser `{"org": link["org"], "repo": link["repo"]}`.

---

### 2. `asyncio.gather` dans un workflow Temporal — toujours `return_exceptions=True` pour les activités non-critiques

Sans ce flag, une exception dans **n'importe quelle** activité du gather fait échouer tout le workflow.
Les activités optionnelles (Penpot, Domi) doivent retourner un `dict` vide en cas d'échec, pas lever.

```python
_results = await asyncio.gather(
    workflow.execute_activity(aria_build_frontend, ...),  # critique
    workflow.execute_activity(nox_build_backend,  ...),  # critique
    workflow.execute_activity(penpot_create_design, ...), # optionnel
    workflow.execute_activity(domi_provision_domain, ...), # optionnel
    return_exceptions=True,
)
for _r in _results[:2]:           # re-raise si Aria ou Nox échouent
    if isinstance(_r, BaseException):
        raise _r
penpot_result = _results[2] if not isinstance(_results[2], BaseException) else {}
domi_result   = _results[3] if not isinstance(_results[3], BaseException) else {}
```

**Règle** : toute activité dont l'échec ne doit pas bloquer le workflow = activité optionnelle = `return_exceptions=True` + valeur de repli.

---

### 3. Ajouter un champ au ProjectSpec : 3 endroits à synchroniser

Quand un nouveau champ est ajouté au `ProjectSpec` (ex: `domain_mode`, `domain_name`) :

1. **`configmap-leon-script.yaml`** — schéma du tool `dispatch_project` (paramètres JSON Schema)
2. **`configmap-leon-script.yaml`** — construction du dict `spec` dans `_execute_tool / dispatch_project`
3. **`configmap-dispatcher-script.yaml`** — `dispatcher_validate_spec` : `spec.setdefault("champ", valeur_défaut)`

Oublier l'un des trois provoque soit un champ absent de la spec (Leon ne l'envoie pas), soit une KeyError côté Dispatcher.

---

### 4. Toute variable `os.getenv()` utilisée en production doit être dans le ConfigMap

Si un agent lit `os.getenv("MA_VAR", "")` pour un mode actif, la variable doit être déclarée dans son `configmap-<agent>-config.yaml`.
Une valeur vide silencieuse est difficile à déboguer (pas d'erreur au démarrage, comportement incorrect à l'exécution).

Exemple manquant corrigé : `CF_ACCOUNT_ID` dans `configmap-domi-config.yaml` (requis pour le mode `register`).

**Checklist** à appliquer à chaque nouvel agent ou nouveau mode :
- [ ] Lister tous les `os.getenv()` du script
- [ ] Vérifier que chacun est présent dans le ConfigMap ou injecté depuis un Secret
- [ ] Les variables non-optionnelles ne doivent pas avoir de valeur par défaut vide

---

### 5. Les pods ne rechargent pas les ConfigMaps automatiquement

Kubernetes **ne redémarre pas** les pods quand un ConfigMap est modifié (sauf Reloader non installé ici).
Après tout `kubectl apply` qui modifie un ConfigMap, relancer les pods concernés :

```bash
kubectl rollout restart deployment/<agent> -n agent-system
```

Pods à redémarrer systématiquement après modification de leurs scripts :
| ConfigMap modifié | Deployment à redémarrer |
|---|---|
| `configmap-dispatcher-script` | `dispatcher` |
| `configmap-leon-script` | `leon` |
| `configmap-aria-script` | `aria` |
| `configmap-nox-script` | `nox` |
| `configmap-vera-script` | `vera` |
| `configmap-domi-script` / `configmap-domi-config` | `domi` |
| `configmap-penpot-script` | `penpot` |
| `configmap-sre-script` / `configmap-charlotte-config` | `agent-charlotte` |

---

## Historique des actions Claude

| Date | Action |
|---|---|
| 2026-03-15 | Reprise de la synchronisation `Production-clients` via `rclone bisync` |
| 2026-03-15 | Création de ce fichier `CLAUDE.md` |
| 2026-04-21 | Intégration RAGAS 0.4 + Langfuse — script `rag_eval.py` |
| 2026-04-25 | Fix post-restart : recréation namespaces Temporal `sre-charlotte` + `zoho-integration` ; fix `llm-key-sync` (`python3` → `jq`) persisté en GitOps |
| 2026-04-25 | Architecture persistence cluster : Temporal emptyDir → PVC `/projets/temporal` (5Gi) + namespaces dans flags `start-dev` ; namespace `management` formalisé dans GitOps ; CronJob `cluster-bootstrap` (*/5 min, idempotent) dans `apps/management/base/` ; règle P8 ajoutée au carnet de processus |
| 2026-04-25 | Migration Vault `vault` → namespace `security` (Helm + données Raft copiées) ; vault-unsealer mis à jour |
| 2026-04-25 | Ajout ttyd (terminal web) dans namespace `interfaces` — `tsl0922/ttyd:1.7.7`, ingress `ttyd.neokube.local` |
| 2026-04-25 | Migration embedding Ollama → HuggingFace : suppression Ollama (`-8Gi RAM requests`) ; LiteLLM `nomic-embed-text` → `paraphrase-multilingual-mpnet-base-v2` via HF router gratuit (768 dims, multilingue) ; `HUGGINGFACE_API_KEY` ajouté dans `cockpit-secrets` |
| 2026-04-25 | Déploiement Dify v1.13.3 dans namespace `dify` — 7 composants dont `dify-plugin-daemon:0.5.3-local` (requis Dify v1.x) ; fix permissions storage (initContainer chown UID 1001) ; DB `dify_plugin` créée ; ingress `dify.neokube.local` uniquement |
| 2026-04-26 | **Phase 0** : suppression `ClusterRoleBinding agent-sre-cluster-admin` ; `agent-sre-role` restreint ; AgentSpec charlotte v2.5 ; AgentSpec leon v2.0 (Chef de Projet, `forbidden_actions`, `output_schema` ProjectSpec) |
| 2026-04-26 | **Phase 2** : sidecars `tool-validator` (port 8090) + `output-guard` (port 8091) sur Charlotte et Leon ; `configmap-agent-policies` (allowlist 10 outils Leon, 26 forbidden) ; hooks dans `_execute_tool` + `run_agent` + `_mission_execute_tool` + `POST /mission` |
| 2026-04-26 | **Phase 1** : namespace `connector-system` ; `zoho-connector` complet (OAuth2 Vault + proxy `/proxy`) ; stubs `github-connector` + `vercel-connector` ; Charlotte migrée (`_zoho_api` → zoho-connector) |
| 2026-04-26 | **Phase 1b** : `github-connector` v1.0 (proxy GitHub REST API, token `GITHUB_TOKEN` depuis `github-connector-secrets`) ; `vercel-connector` v1.0 (proxy Vercel API, `VERCEL_TOKEN` + `VERCEL_TEAM_ID` depuis `vercel-connector-secrets`, teamId injecté auto) ; Leon — toutes les activités Zoho/GitHub/Vercel migrées vers leurs connecteurs respectifs ; `leon_zoho_refresh_token` → no-op ; deployment Leon nettoyé (secrets Zoho/GitHub/Vercel directs supprimés, URLs connectors en env) |
| 2026-04-26 | **Vault fix** : tous les connectors lisent depuis Vault (secret `vault-root-token` créé dans `connector-system`) ; `secret/neokube/infrastructure/{github,vercel,neon}` créés depuis les K8s secrets existants |
| 2026-04-26 | **Phase 3** : `neon-connector` v1.0 (port 8003) — proxy Neon Management API (`/proxy`) + exécution SQL via asyncpg (`/query`) ; Leon — 5 activités Neon migrées ; secrets `leon-neon-secrets` directs supprimés du deployment |
| 2026-04-26 | **Phase 4c** : Charlotte → zoho-connector câblé — `ZOHO_CONNECTOR_URL` dans deployment-charlotte.yaml + charlotte-config ; `known_tools` documenté dans agent-policies |
| 2026-04-26 | **Phase 4b** : `sre_agent_health_matrix` — snapshot pod/CPU(top)/RAM/probe HTTP par agent actif du registre ; fallback GitOps si K8s indisponible ; SREScanWorkflow étape 8 (`agent_matrix` dans report) ; endpoint `GET /agents/health` ajouté |
| 2026-04-26 | **Phase 4a — DT-005** : `sre_qdrant_check_prior_remediation` (scroll exact + sémantique sur `remediation_outcome`) gate le loop drifts dans `SREScanWorkflow` — action ESCALATE si `failed_before` ; `sre_vectorize_remediation_outcome` écrit chaque PATCH/PATCH_FAILED en retour dans Qdrant pour alimenter les cycles suivants |
| 2026-04-26 | **Audit roadmap** : vérification doublons — `sre_provision_agent` + `sre_decommission_agent` déjà implémentés (ProvisionAgentWorkflow/DecommissionAgentWorkflow) ; ProjectSpec déjà défini dans leon.yaml ; agent-registry v1.3 (charlotte 2.5, leon 2.0) ; 4 collections Qdrant Phase 5 ajoutées (statut `planned`) ; charlotte.yaml : shared_secrets Zoho supprimés → connector déclaré ; leon.yaml : optional_keys nettoyés (Phase 1b/3 terminées) |
| 2026-04-27 | **Phase 5** : Dispatcher v1.0 déployé — `configmap-dispatcher-script.yaml` (DevProjectWorkflow + 7 activités : validate/aria_build/nox_build/vera_review/notify_approval/deploy/write_pm_decisions) ; pod `dispatcher` port 8484, namespace Temporal `dispatcher` ; sidecars tool-validator + output-guard ; AgentSpecs Aria/Nox/Vera + dispatcher créées ; registre v1.4 ; 4 collections Qdrant `active` |
| 2026-04-27 | **Phase 6** : Aria/Nox/Vera découplés en pods dédiés — scripts `configmap-aria-script.yaml` / `configmap-nox-script.yaml` / `configmap-vera-script.yaml` ; deployments + services + serviceaccounts dédiés (ports 8485/8486/8487) ; task_queues séparées (`aria-queue`/`nox-queue`/`vera-queue`) dans DevProjectWorkflow ; dispatcher-script.yaml mis à jour (ARIA/NOX/VERA_QUEUE env vars + task_queue dans execute_activity) ; policies Aria/Nox/Vera ajoutées ; registre v1.5 (health_url + task_queue par agent) ; bug fix deployment `dispatcher_agent.py` → `dispatcher.py` |
| 2026-04-27 | **fix(leon)** : `dispatch_project` tool ajouté — Leon → `POST /trigger` Dispatcher avec ProjectSpec 11 champs ; `DISPATCHER_URL` dans leon-config + leon-script ; `new_project` marqué [LEGACY] ; pipeline Leon → Dispatcher désormais fonctionnel |
| 2026-04-27 | **fix(backup)** : `dump-mongodb` init container supprimé — MongoDB retiré du cluster, le `set -e` bloquait tout le job nightly ; TIMESTAMP déplacé dans le container upload ; backup vérifié OK (Penpot+OpenWebUI+Qdrant+GitOps) |
| 2026-04-27 | **fix(charlotte/git)** : `git_status` corrigé — fetch `origin/main` + `log origin/main..HEAD` pour exposer les commits non pushés (Charlotte disait "à jour" avec 23 commits locaux en attente) ; `_git_pull()` : `fetch --depth=20 + reset --hard` → `fetch + rebase` (préserve les commits locaux non pushés) ; 27 commits pushés vers `neomnia/Kubinote-GitOps` |
| 2026-04-27 | **fix(namespaces)** : `open-webui` namespace vide supprimé (doublon de `interfaces`) + retiré de la kustomization pour éviter la recréation automatique ; PVs `dify-*` en état `Released` (claimRef `mindstudio-prod`) récupérés via patch + rebind vers namespace `dify` ; 7 pods Dify Running |
| 2026-04-27 | **Phase 7** : admin-sys promu K8s executor v4.0 — nouveau script FastAPI (`/execute`, `/apply`) remplace `penpot-sidecar:v3.5` ; `ClusterRole admin-sys-executor` (lecture universelle + mutations workloads/config/RBAC/batch) ; Charlotte `_kubectl()` route via `POST admin-sys/execute` : mutations obligatoires via admin-sys, read-only avec fallback local si admin-sys KO ; `ADMIN_SYS_URL` dans charlotte-config |
| 2026-04-27 | **fix(nox/neon)** : `POST /projects` bloqué (org managed by Vercel) → pattern branche-par-projet : Nox crée une branche Neon sur le projet existant `NeoBridge` (`young-fog-76038471`) — `neon_branch_id` + `neon_endpoint_host` dans le résultat ; `NEON_BASE_PROJECT_ID` ajouté dans deployment-nox + configmap ; branche de test supprimée |
| 2026-04-27 | **fix(leon/temporal)** : `TEMPORAL_NAMESPACE` de Leon corrigé `default` → `leon` dans `configmap-leon-config.yaml` (namespace Temporal `leon` créé en Phase 6) |
| 2026-04-27 | **feat(admin-sys/auth)** : token `X-Admin-Sys-Token` ajouté sur `/execute` et `/apply` — secret `admin-sys-token` (64 hex) dans namespaces `interfaces` + `agent-system` ; `/health` reste libre (probes) ; Charlotte injecte le header dans `_kubectl()` et `_kubectl_apply_yaml()` (migré de kubectl local vers admin-sys `/apply`) ; validé 403 sans token, 200 avec token |
| 2026-04-27 | **fix(zoho-connector)** : HTTP methods corrigés — PUT/PATCH/DELETE utilisaient `c.post()` → méthodes httpx correctes ; Zoho erreur 6500 (soft) traitée comme non-fatale (ressource créée côté Zoho malgré HTTP 400) — retourne `{}` au lieu de lever exception |
| 2026-04-27 | **fix(zoho-observer v2.0)** : `_zoho_proxy` — `"body"` → `"data"` (champ attendu par ProxyReq zoho-connector) ; import `timezone` ajouté ; champs `acceptance_criteria` + `emitted_at` ajoutés dans spec pour satisfaire `dispatcher_validate_spec` ; déduplication déléguée à Temporal (`WorkflowIDReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY`) au lieu du set `_dispatched` volatile |
| 2026-04-27 | **fix(dispatcher)** : workflow ID sans timestamp (`devproject-{project_id}`) + `WorkflowIDReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY` + catch `WorkflowAlreadyStartedError` — idempotence garantie même après restart pod zoho-observer |
| 2026-04-27 | **fix(aria/nox)** : `GET /git/refs/heads/main` retourne 409 sur repo template en cours d'init — erreur 409 ignorée silencieusement au lieu d'être ajoutée à `result["errors"]` |
| 2026-04-27 | **fix(vera)** : check `nox_db` corrigé — `neon_project_id` (ancien champ) → `neon_branch_id` (sortie actuelle de Nox) ; même correction dans le prompt LLM |
| 2026-04-27 | **feat(qdrant)** : collection `pm-experience` créée (768 dims, Cosine) — manquante, causait une boucle d'erreur dans le PM observer |
| 2026-04-27 | **E2E pipeline validé** : test complet zoho-observer → Dispatcher → Aria+Nox (parallèle) → Vera (approved) → signal humain → deploy → COMPLETED en 44.86s (workflow `devproject-zoho-2114101000001568047`) ; idempotence vérifiée post-restart pod |
| 2026-04-28 | **Stalwart Mail Server v0.11.8** : déployé dans namespace `stalwart` — StatefulSet (PVC 10Gi local-path), listeners SMTP/SMTPS/Submission/IMAP/IMAPS/Sieve/HTTP tous opérationnels ; ingress `mail.neokube.fr` (Traefik) ; LoadBalancer 192.168.1.28 ports mail ; fix config path (initContainer `/config/config.toml` ≠ `/config/etc/config.toml`), log tracer stdout, probe tcpSocket ; DKIM RSA 2048 selector `mail` stocké dans secret `stalwart-dkim` + Vault `secret/neokube/apps/stalwart` |
| 2026-04-28 | **openprovider-connector v1.0** (port 8005) + **cloudflare-connector v1.0** (port 8006) : déployés et validés — Openprovider : 7 domaines accessibles (neokube.fr géré par Openprovider DNS), JWT re-login auto ; Cloudflare : 19 zones actives (neomnia.net zone_id=8c1283e7c52c34a9d5112c0fb271af27, account_id=822ba0e8c232e192475e6bd02ce36cb4), neokube.fr absent (DNS Openprovider direct) ; credentials dans Vault `secret/neokube/infrastructure/{openprovider,cloudflare}` |
| 2026-04-28 | **Domi v1.0** — Domain Infrastructure Manager (port 8489, domi-queue, namespace dispatcher) : 4ème activité parallèle dans DevProjectWorkflow (gather 3→4) ; mode subdomain : CNAME {slug}.neomnia.net → cname.vercel-dns.com dans Cloudflare zone neomnia.net ; mode register : achat Openprovider + zone Cloudflare + NS update ; domi_link_vercel_domain post-deploy ; DomainRenewalScanWorkflow cron 09:00 UTC (auto-renew <30j, alerte Charlotte <60j) ; Vera v1.2 check domain_provisioned (non-bloquant) ; registre v1.7 |
| 2026-04-28 | **Phase 10d** : `penpot-connector` v1.0 (port 8004, connector-system) — proxy Penpot RPC API, auth session cookie depuis Vault `secret/neokube/infrastructure/penpot` (PENPOT_EMAIL/PASSWORD), re-login auto 401 ; agent `Penpot` v1.0 (port 8488, penpot-queue, agent-system) — activité `penpot_create_design` : create-project + duplicate-file template → retourne `penpot_url` (/design?project-id=X&file-id=Y) ; non-bloquant si PENPOT_TEMPLATE_FILE_ID/PENPOT_TEAM_ID vides ; DevProjectWorkflow : gather 2→3 (Aria+Nox+**Penpot** en parallèle) ; vera_review : 4ème param `penpot_result` (non-bloquant) ; dispatcher_zoho_callback : ligne "Design" ajoutée ; pm-decisions : penpot_url vectorisé ; registre agents v1.6 |
| 2026-04-28 | **fix(pipeline/audit)** : 5 bugs bloquants corrigés — (1) Vercel repoId `str→int` (`incorrect_git_source_info`) + fallback org/repo ; (2) `asyncio.gather return_exceptions=True` Penpot+Domi non-bloquants, Aria+Nox re-raise ; (3) Leon `dispatch_project` : `domain_mode`+`domain_name` ajoutés au schema tool et spec JSON ; (4) `CF_ACCOUNT_ID` ajouté dans `configmap-domi-config` (mode register) ; (5) restart Aria+Nox+Dispatcher+Leon après update configmaps ; section "Pièges connus" ajoutée dans CLAUDE.md |
| 2026-04-28 | **Stalwart — calibration mail** : auto-ban `[server.fail2ban] rate="100/1d"` actif dans config.toml ; domaine `neokube.fr` + compte `admin@neokube.fr` créés via API REST ; DNS zone neokube.fr créée chez Openprovider (A/MX/SPF/DKIM/DMARC) via openprovider-connector (PUT zone — POST/PATCH non implémentés) ; `stalwart-connector` v1.0 (port 8007, connector-system) : auth Basic injectée auto, endpoints `/accounts`, `/accounts/create`, `/accounts/{account}` DELETE, `/proxy` ; Vault `secret/neokube/apps/stalwart` contient `ADMIN_PASSWORD` ; registre agents mis à jour (section connectors) ; section Stalwart gotchas ajoutée dans CLAUDE.md |
| 2026-04-29 | **stalwart-connector déployé** : pod Running dans `connector-system` — GET /accounts, POST /accounts/create, DELETE /accounts/{account} validés ; Vault `ADMIN_PASSWORD` corrigé (`SU0ie4btcEWNmRq7RBb10Z8RimN3V` — correspond au hash `[authentication.fallback-admin]` dans config.toml) ; namespace `stalwart` ajouté dans CLAUDE.md ; merge remote Domi commits (96d616b → 8c68f68) résolu |
| 2026-04-29 | **feat(mail): identités agents** — 4 comptes Stalwart créés : `leon@`, `vera@`, `domi@`, `no-reply@neokube.fr` ; credentials dans Vault `secret/neokube/agents/{leon,vera,domi}` + `apps/stalwart.NOREPLY_PASSWORD` ; STALWART_CONNECTOR_URL + MAIL_FROM + SMTP_HOST/PORT ajoutés dans configmaps Leon/Domi et deployment Vera ; **Dispatcher v1.1** : `dispatcher_send_client_mail` (aiosmtplib, SMTP Stalwart port 587, email HTML/texte post-deploy) ; `client_email` dans ProjectSpec (3 endroits : tool schema Leon + spec dict + validate_spec setdefault) ; step 9 workflow non-bloquant |
