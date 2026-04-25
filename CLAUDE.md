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

### Namespaces
| Namespace | Contenu |
|---|---|
| `kube-system` | Traefik, Headlamp (UI) |
| `cockpit` | LiteLLM, Langfuse, Langfuse-postgres |
| `interfaces` | Open WebUI, admin-sys-agent, ttyd |
| `agent-system` | Charlotte SRE, Leon, Temporal |
| `rag-system` | Qdrant |
| `security` | Vault (Helm), vault-unsealer |
| `management` | CronJob cluster-bootstrap, backup |
| `penpot` | Penpot |
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
| `http://langfuse.neokube.local` | Langfuse (observabilité) |
| `http://temporal.neokube.local` | Temporal UI |

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
| 2026-04-25 | Fix post-restart : recréation namespaces Temporal `sre-charlotte` + `zoho-integration` ; fix `llm-key-sync` (`python3` → `jq`) |
| 2026-04-25 | Architecture persistence cluster : Temporal emptyDir → PVC `/projets/temporal` (5Gi) + namespaces dans flags `start-dev` ; namespace `management` formalisé dans GitOps ; CronJob `cluster-bootstrap` (*/5 min, idempotent) dans `apps/management/base/` ; règle P8 ajoutée au carnet de processus |
| 2026-04-25 | Migration Vault `vault` → namespace `security` (Helm + données Raft copiées) ; vault-unsealer mis à jour |
| 2026-04-25 | Ajout ttyd (terminal web) dans namespace `interfaces` — `tsl0922/ttyd:1.7.7`, ingress `ttyd.neokube.local` |
| 2026-04-25 | Migration embedding Ollama → HuggingFace : suppression Ollama (`-8Gi RAM requests`) ; LiteLLM `nomic-embed-text` → `paraphrase-multilingual-mpnet-base-v2` via HF router gratuit (768 dims, multilingue) ; `HUGGINGFACE_API_KEY` ajouté dans `cockpit-secrets` |
| 2026-04-25 | Déploiement Dify v1.13.3 dans namespace `mindstudio-prod` — 7 composants (postgres, redis, api, worker, web, nginx, plugin-daemon) ; fix permissions storage (initContainer chown UID 1001) ; ajout `dify-plugin-daemon:0.5.3-local` requis par Dify v1.x ; ingress `dify.neokube.local` uniquement |
