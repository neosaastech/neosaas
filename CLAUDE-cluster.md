# CLAUDE-cluster.md — Architecture K8s détaillée

## Collections Qdrant

> Modèle d'embedding standard : `paraphrase-multilingual-mpnet-base-v2` via LiteLLM alias `nomic-embed-text` (768 dims, HuggingFace Inference API).
> `neomnia_core` + `open-webui_files` : 384 dims (MiniLM-L12-v2, ancien modèle).

| Collection | Dims | Points | Utilisé par | Contenu |
|---|---|---|---|---|
| `leon-memory` | 768 | 14+ | **Leon** | Process CDC, normes Neomnia, expériences REVIEW — script : `~/scripts/index_leon_process.py` |
| `template-neosaas` | 768 | 274 | **Aria** | Code source Neosaas-app (Next.js, composants, actions, forms) — référence génération frontend |
| `design-knowledge` | 768 | 53 | **Aria** + **Zephyr** | Heuristiques UX (Nielsen Norman), Material Design 3, Smashing Magazine, Penpot community |
| `penpot-templates` | 768 | 226 | *(Penpot agent — à brancher)* | Metadata templates Penpot Hub (noms, catégories) |
| `neomnia_core` | 384 | 260 642 | **Zephyr** | SharePoint Neomnia complet — contexte agence généraliste (production clients, management, formations) |
| `sre-charlotte-incidents` | 768 | 91 540 | **Charlotte** | Incidents SRE K8s + résolutions (RAG Charlotte) |
| `charlotte-conversations` | 768 | 1 571 | **Charlotte** | Historique conversations OWU (session memory) |
| `pm-decisions` | 768 | 1+ | **Dispatcher** | Décisions projets archivées après DevProjectWorkflow |
| `pm-experience` | 768 | 0 | *(Leon — à alimenter)* | Expériences PM (vide — à enrichir) |
| `neo-memory` | 768 | 207 | **Neo** | Mémoire assistant Neo |
| `neokube-architecture` | 768 | 262 | Charlotte / Admin-sys | Architecture NeoKube (CLAUDE.md indexé) |
| `neokube-process-docs` | 768 | 196 | Charlotte | Process docs cluster (CLAUDE.md technique) |
| `open-webui_files` | 384 | 90 | Open WebUI | Fichiers uploadés via OWU |
| `kubinote-brain` | 1536 | 12 | *(obsolète)* | OpenAI ada-002 — ancien |
| `zoho-tasks` | 768 | 20 | Leon / Dispatcher | Cache tâches Zoho |
| `sre-incidents` | 768 | 0 | Charlotte | Incidents SRE (vide) |

---

## Volumes persistants (hostPath, `storageClassName: ""`)

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

---

## CronJobs cluster

| CronJob | Namespace | Schedule | Rôle |
|---|---|---|---|
| `cluster-bootstrap` | management | `*/5 * * * *` | Applique GitOps + s'assure que les 7 namespaces Temporal existent (idempotent) |
| `neokube-nightly-backup` | management | `0 3 * * *` (Europe/Paris) | Sauvegarde nightly |
| `llm-key-sync` | cockpit | `0 * * * *` | Sync clés LLM Vault → K8s secrets → restart LiteLLM/Langfuse si changement |
| `llm-key-validation` | cockpit | `30 6 * * *` | Valide les clés LLM, ntfy si quota épuisé |
| `dify-bootstrap` | dify | `0 4 1 1 *` | Bootstrap Dify annuel (migrations one-shot) |
| `agent-eval-nightly` | agent-system | `0 2 * * *` (Europe/Paris) | Évalue les 9 agents (LLM-as-judge, 3 scénarios chacun), score Langfuse + alerte ntfy si avg < 7.5 |

---

## Backup nocturne — `neokube-nightly-backup`

**Schedule** : `0 3 * * *` Europe/Paris — **GitOps** : `~/Kubinote-GitOps/apps/management/base/cronjob-neokube-nightly-backup.yaml`

### Ce qui est sauvegardé

| Artefact | Source | Destination S3 | Format |
|---|---|---|---|
| Penpot PostgreSQL | `pg_dump` sur `penpot-postgres.penpot:5432` | `backups-db/penpot-postgres-{TIMESTAMP}.dump` | `pg_dump -Fc` (compressé) |
| OpenWebUI SQLite | `cp /var/lib/open-webui-data/webui.db` (hostPath) | `backups-db/openwebui-sqlite-{TIMESTAMP}.db` | SQLite brut |
| Qdrant snapshot | `POST /snapshots` sur `qdrant.rag-system:6333` | **PVC local uniquement** ⚠️ — pas uploadé sur S3 | JSON API |
| GitOps repo | `rclone sync ~/Kubinote-GitOps` | `gitops/` | Sync complet (sans `.git/`) |

> **⚠️ Gap connu** : le snapshot Qdrant reste sur la PVC locale (`qdrant-data-pv`, 50 Gi). En cas de perte du nœud, les 91 540+ points de `sre-charlotte-incidents` et autres collections seraient perdus. Pour sauvegarder Qdrant sur S3, il faudrait télécharger le snapshot via `GET /collections/{name}/snapshots/{name}` et l'uploader avec rclone.

### Bucket S3

**Bucket** : `kubinote-backups-charles` (Scaleway Object Storage, fr-par)
**Remote rclone** : `scw-s3:` — config dans le Secret `rclone-scw-conf` (namespace `management`)

```
backups-db/
  penpot-postgres-{TIMESTAMP}.dump    # ~taille variable
  openwebui-sqlite-{TIMESTAMP}.db     # ~taille variable
gitops/                                # miroir de ~/Kubinote-GitOps
```

### Notifications ntfy

| Moment | Titre | Contenu |
|---|---|---|
| Démarrage | `💾 🌙 Backup nocturne démarré` | Tailles Penpot PG + SQLite + liste composants |
| Fin OK | `✅ Backup nocturne terminé` | Taille par artefact + total bucket backups-db + gitops |
| Erreur | `❌ Backup ÉCHOUÉ` | Commande kubectl pour inspecter les logs |

### Commandes utiles

```bash
# Voir le dernier job
kubectl get jobs -n management | grep backup

# Logs du dernier backup
kubectl logs -n management -l app=neokube-nightly-backup --tail=50

# Lister les fichiers S3
rclone ls scw-s3:kubinote-backups-charles/backups-db/ --config ~/.config/rclone/rclone.conf

# Taille totale du bucket
rclone size scw-s3:kubinote-backups-charles/ --config ~/.config/rclone/rclone.conf
```

---

## Namespaces Temporal (état 2026-04-27)

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
