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
| `agent-system` | Charlotte SRE, Leon, Temporal, zoho-discovery, zoho-observer |
| `connector-system` | **Planifié Phase 1** — zoho-connector, github-connector, vercel-connector |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-agent-injector, vault-unsealer |
| `management` | CronJob cluster-bootstrap, neokube-nightly-backup |
| `penpot` | Penpot (design) |
| `mindstudio-prod` | Dify v1.13.3 (agent builder studio) — accès `http://dify.neokube.local` |

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
| `dify-postgres-pv` | 5 Gi | `/var/lib/dify/postgres` | mindstudio-prod |
| `dify-storage-pv` | 10 Gi | `/var/lib/dify/storage` | mindstudio-prod |
| `dify-plugins-pv` | 5 Gi | `/var/lib/dify/plugins` | mindstudio-prod |
| `interfaces-data-pv` | 5 Gi | — | interfaces |
| `langfuse-postgres-pv` | 5 Gi | — | cockpit |
| `penpot-assets-pv` | 10 Gi | — | penpot |
| `penpot-postgres-pv` | 5 Gi | — | penpot |
| `qdrant-data-pv` | 50 Gi | — | rag-system |
| `data-vault-0` | 5 Gi | local-path | security |

### CronJobs cluster
| CronJob | Namespace | Schedule | Rôle |
|---|---|---|---|
| `cluster-bootstrap` | management | `*/5 * * * *` | Applique GitOps (idempotent) |
| `neokube-nightly-backup` | management | `0 3 * * *` (Europe/Paris) | Sauvegarde nightly |
| `llm-key-sync` | cockpit | `0 * * * *` | Sync clés LLM Vault → K8s secrets → restart LiteLLM/Langfuse si changement |
| `llm-key-validation` | cockpit | `30 6 * * *` | Valide les clés LLM |

---

## Architecture agents

### Rôles et périmètres

| Agent | Rôle | Runtime | RBAC | Status |
|---|---|---|---|---|
| **Charlotte** | SRE Orchestratrice — surveillance cluster, réception ProjectSpec | Temporal | `agent-sre-role` (restreint) | active v2.5 |
| **Leon** | Chef de Projet — qualification brief, émission ProjectSpec, Zoho | Temporal | read-only `agent-system` | active v2.0 |
| **admin-sys** | Penpot sidecar (outil appelé par Charlotte) | FastAPI | read-only `open-webui` | deprecated v3.5 |
| **zoho-tasks** | Abstraction Zoho Projects (outil partagé) | Temporal | — | active v1.0 |

### Flux Leon → Charlotte (ProjectSpec)

```
Brief (Slack #produit / Open WebUI)
  → Leon : dialogue de clarification (max 10 tours)
  → Leon : produit ProjectSpec JSON (11 champs validés)
  → Signal Temporal "project_spec_received" → Charlotte
  → Leon : crée tâches dans Zoho Projects
  → Charlotte : déclenche SREProvisionWorkflow si infra requise
```

**Leon ne code jamais, ne déploie jamais** — interdit par `forbidden_actions` dans l'AgentSpec (enforcement par tool-validator en Phase 2).

### RBAC agents (état 2026-04-26)

| Agent | ServiceAccount | ClusterRole effectif |
|---|---|---|
| Charlotte | `agent-sre-sa` (agent-system) | `agent-sre-role` — lecture + remédiation, secrets read-only |
| Leon | `leon-sa` (agent-system) | RoleBinding non appliqué (pod à 0 réplicas) |

**Supprimé le 2026-04-26** : `ClusterRoleBinding agent-sre-cluster-admin` (Charlotte n'a plus `cluster-admin`).

### Roadmap sécurité agents

| Phase | Contenu | État |
|---|---|---|
| **Phase 0** | RBAC Charlotte réduit, AgentSpec Leon v2.0 | ✅ Terminé 2026-04-26 |
| **Phase 1** | Namespace `connector-system` — zoho-connector, github-connector, vercel-connector | Planifié |
| **Phase 2** | Sidecars `tool-validator` + `output-guard` sur Charlotte et Leon | Planifié |
| **Phase 3** | `neon-connector` (pgBouncer) | Planifié |

---

## Dify v1.13.3 — Agent Builder Studio

**Namespace** : `mindstudio-prod`
**Accès** : `http://dify.neokube.local`
**GitOps** : `~/Kubinote-GitOps/apps/mindstudio-prod/base/`

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
| 2026-04-25 | Déploiement Dify v1.13.3 dans namespace `mindstudio-prod` — 7 composants dont `dify-plugin-daemon:0.5.3-local` (requis Dify v1.x) ; fix permissions storage (initContainer chown UID 1001) ; DB `dify_plugin` créée ; ingress `dify.neokube.local` uniquement |
| 2026-04-26 | **Phase 0 sécurité agents** : suppression `ClusterRoleBinding agent-sre-cluster-admin` (Charlotte n'a plus `cluster-admin`) ; `agent-sre-role` restreint (secrets read-only, RBAC read-only) ; AgentSpec charlotte v2.5 ; AgentSpec leon v2.0 (Chef de Projet, `forbidden_actions`, `output_schema` ProjectSpec, RBAC read-only) |
