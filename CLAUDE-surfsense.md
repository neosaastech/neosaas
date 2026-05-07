# SurfSense — Documentation complète
## SurfSense — Moteur de recherche RAG (alternatif Perplexity)

**Repo** : `https://github.com/MODSetter/SurfSense`
**Namespace** : `surfsense`
**GitOps** : `~/Kubinote-GitOps/apps/surfsense/base/`
**Version** : `latest` (images `ghcr.io/modsetter/surfsense-backend` + `surfsense-web`)

### Composants (7 pods)
| Déploiement | Image | Rôle |
|---|---|---|
| `surfsense-postgres` | `pgvector/pgvector:pg17` | Base de données principale + vecteurs (pgvector) |
| `surfsense-redis` | `redis:8-alpine` | Broker Celery + cache app |
| `surfsense-searxng` | `searxng/searxng:2026.3.13-3c1f68c59` | Moteur de recherche web multi-sources (stateless) |
| `surfsense-backend` | `ghcr.io/modsetter/surfsense-backend:latest` | API FastAPI (mode `api`), migrations Alembic |
| `surfsense-celery` | `ghcr.io/modsetter/surfsense-backend:latest` | Worker Celery asynchrone (mode `worker`) |
| `surfsense-zero-cache` | `rocicorp/zero:0.26.2` | Sync temps réel frontend↔postgres (WebSocket/SSE) |
| `surfsense-frontend` | `ghcr.io/modsetter/surfsense-web:latest` | Frontend Next.js |

### Interfaces web
| URL locale | URL publique | Service |
|---|---|---|
| `http://surfsense.neokube.local` | `https://surfsense.neokube.fr` | Frontend |
| `http://surfsense-api.neokube.local` | `https://surfsense-api.neokube.fr` | Backend API |
| `http://surfsense-zero.neokube.local` | `https://surfsense-zero.neokube.fr` | Zero-cache (WebSocket) |

### Stockage
| PV/PVC | Taille | Chemin hôte | Usage |
|---|---|---|---|
| `surfsense-postgres-pv/pvc` | 10 Gi | `/var/lib/surfsense/postgres` | Données PostgreSQL + vecteurs pgvector |
| `surfsense-shared-tmp-pv/pvc` | 5 Gi | `/var/lib/surfsense/shared-tmp` | Fichiers temporaires partagés backend↔celery (ReadWriteMany) |
| `surfsense-zero-cache-pvc` | 2 Gi | local-path | `zero.db` (réplique SQLite pour sync temps réel) |

### Secrets — Vault `secret/neokube/apps/surfsense`
| Clé Vault | Description |
|---|---|
| `SECRET_KEY` | Clé JWT/Flask (`openssl rand -base64 32`) |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `ZERO_ADMIN_PASSWORD` | Mot de passe admin zero-cache |
| `SEARXNG_SECRET` | Secret SearXNG (`openssl rand -hex 32`) |
| `NOTION_CLIENT_ID` | OAuth Notion (créer sur notion.so/my-integrations) |
| `NOTION_CLIENT_SECRET` | OAuth Notion |
| `LANGSMITH_API_KEY` | Clé Langfuse (format `pk-xxx` pour observabilité) |

> `OPENAI_API_KEY` est lu depuis `secret/neokube/apps/litellm` → `LITELLM_MASTER_KEY` (utilisé pour les LLM calls, pas pour les embeddings — voir gotcha ci-dessous)

### Premier déploiement — ordre d'opérations

```bash
# 1. Provisionner les secrets dans Vault
kubectl exec -n security vault-0 -- vault kv put secret/neokube/apps/surfsense \
  SECRET_KEY="$(openssl rand -base64 32)" \
  DB_PASSWORD="$(openssl rand -hex 16)" \
  ZERO_ADMIN_PASSWORD="$(openssl rand -hex 16)" \
  SEARXNG_SECRET="$(openssl rand -hex 32)" \
  NOTION_CLIENT_ID="" \
  NOTION_CLIENT_SECRET="" \
  LANGSMITH_API_KEY=""

# 2. Créer le namespace (ou attendre le prochain cluster-bootstrap)
kubectl apply -f ~/Kubinote-GitOps/infrastructure/namespaces/surfsense.yaml

# 3. Créer le K8s secret depuis Vault (script idempotent)
bash ~/Kubinote-GitOps/apps/surfsense/setup-surfsense-secrets.sh

# 4. Appliquer le GitOps
kubectl apply -k ~/Kubinote-GitOps/apps/surfsense/base/

# 5. Ajouter les 3 règles dans le tunnel Cloudflare (CF_API_TOKEN requis — pas CF_DNS_TOKEN)
# + les 3 CNAMEs DNS (déjà créés le 2026-05-03)
```

### Tunnel Cloudflare — règles d'ingress (CF_API_TOKEN)
Les règles tunnel utilisent `CF_API_TOKEN` (pas `CF_DNS_TOKEN` qui est DNS-only).
```bash
CF_POD=$(kubectl get pod -n connector-system -l app=cloudflare-connector -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n connector-system $CF_POD -- python3 -c "
import httpx, os, json
VAULT_ADDR = os.getenv('VAULT_ADDR'); VAULT_TOKEN = os.getenv('VAULT_TOKEN')
r = httpx.get(VAULT_ADDR+'/v1/secret/data/neokube/infrastructure/cloudflare', headers={'X-Vault-Token': VAULT_TOKEN})
d = r.json()['data']['data']
CF_TOKEN = d['CF_API_TOKEN']  # IMPORTANT: tunnel management requiert CF_API_TOKEN
ACCOUNT_ID = '822ba0e8c232e192475e6bd02ce36cb4'
TUNNEL_ID = '94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb'
headers = {'Authorization': 'Bearer '+CF_TOKEN, 'Content-Type': 'application/json'}
resp = httpx.get(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations', headers=headers)
current = resp.json()['result']['config']['ingress']
# Ajouter les nouvelles règles avant le catch-all
new_rules = [r for r in current if r.get('hostname')]
new_rules += [
    {'hostname': 'surfsense.neokube.fr',      'service': 'http://traefik.kube-system.svc.cluster.local:80'},
    {'hostname': 'surfsense-api.neokube.fr',  'service': 'http://traefik.kube-system.svc.cluster.local:80'},
    {'hostname': 'surfsense-zero.neokube.fr', 'service': 'http://traefik.kube-system.svc.cluster.local:80'},
]
new_rules += [{'service': 'http_status:404'}]
result = httpx.put(f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/cfd_tunnel/{TUNNEL_ID}/configurations',
    headers=headers, json={'config': {'ingress': new_rules}}).json()
print('OK' if result.get('success') else result.get('errors'))
"
```

### CNAMEs Cloudflare (zone neokube.fr, déjà créés 2026-05-03)
```bash
CF_POD=$(kubectl get pod -n connector-system -l app=cloudflare-connector -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n connector-system $CF_POD -- python3 -c "
import httpx, os
VAULT_ADDR = os.getenv('VAULT_ADDR'); VAULT_TOKEN = os.getenv('VAULT_TOKEN')
r = httpx.get(VAULT_ADDR+'/v1/secret/data/neokube/infrastructure/cloudflare', headers={'X-Vault-Token': VAULT_TOKEN})
d = r.json()['data']['data']
CF_EMAIL = d.get('CF_ACCOUNT_EMAIL', '')
CF_GKEY = d.get('CF_GLOBAL_KEY', '')
headers = {'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_GKEY, 'Content-Type': 'application/json'}
ZONE_ID = '891229575324408767bf4a0293e5adcc'  # neokube.fr
CNAME = '94ff6f9f-2498-470e-9a7b-b4d3ed9e94fb.cfargotunnel.com'
for sub in ['surfsense','surfsense-api','surfsense-zero']:
    resp = httpx.post(f'https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/dns_records',
        headers=headers, json={'type':'CNAME','name':sub,'content':CNAME,'proxied':True,'ttl':1})
    r2 = resp.json()
    print(sub+':', 'OK' if r2.get('success') else r2.get('errors'))
"
```

> Ajouter aussi dans `/etc/hosts` neokube-beta :
> `192.168.1.28 surfsense.neokube.local surfsense-api.neokube.local surfsense-zero.neokube.local`

### Gotchas SurfSense (découverts 2026-05-03)

**1. chonkie v1.6 ignore `base_url` pour OpenAI embeddings**
`EMBEDDING_MODEL=openai://nomic-embed-text` avec `OPENAI_BASE_URL=http://litellm...` ne fonctionne pas :
chonkie utilise la bibliothèque `catsu` en interne qui se connecte directement à `api.openai.com`
et ignore `OPENAI_BASE_URL`. La propriété `.dimension` appelle `embed("test")` au démarrage → 401 OpenAI → crash.

**Fix** : utiliser un modèle `sentence-transformers` local :
```
EMBEDDING_MODEL: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
```
384 dims, multilingual FR/EN, ~470MB téléchargé au premier démarrage, inference locale dans le pod.

**2. asyncpg incompatible avec `?sslmode=disable`**
`DATABASE_URL=postgresql+asyncpg://...?sslmode=disable` → `TypeError: connect() got unexpected argument 'sslmode'`
Fix dans `setup-surfsense-secrets.sh` : ne pas inclure `?sslmode=disable` dans le DATABASE_URL asyncpg.
Les URLs `ZERO_*` (psycopg2) peuvent conserver `?sslmode=disable`.

**3. PostgreSQL `wal_level=logical` requis par zero-cache**
rocicorp/zero utilise la réplication logique → postgres doit démarrer avec `-c wal_level=logical`.
Fix dans `deployment-surfsense-postgres.yaml` : `args: ["-c", "wal_level=logical"]`.

**4. zero-cache OOMKill — croît avec le volume de documents**
rocicorp/zero charge le schéma complet + réplique SQLite en mémoire à chaque démarrage → exit 137 (SIGKILL).
La consommation croît avec le nombre de documents indexés : ~124MB à 2 670 docs, à réévaluer à 10 000 docs.
Limite actuelle : **4Gi** dans `deployment-surfsense-zero-cache.yaml`. Augmenter si crash reprend.

**5. Tunnel Cloudflare — gestion via CF_API_TOKEN uniquement**
`CF_DNS_TOKEN` n'a que les droits DNS:Edit → 401 sur les endpoints `/cfd_tunnel/*/configurations`.
Toujours utiliser `CF_API_TOKEN` pour modifier les règles d'ingress du tunnel.

**6. Table `user` absente de la publication zero-cache → instabilité totale du frontend**
Après le premier démarrage, la publication PostgreSQL `zero_publication` (créée par Alembic) n'inclut pas la table `user`. rocicorp/zero rejette toutes les connexions WebSocket avec `SchemaVersionNotSupported: "user" table does not exist or is not one of the replicated tables`. Le frontend paraît instable/inutilisable (déconnexion immédiate).

Fix — à appliquer après chaque installation fraîche :
```bash
kubectl exec -n surfsense deploy/surfsense-postgres -- \
  psql -U surfsense -d surfsense -c 'ALTER PUBLICATION zero_publication ADD TABLE "user";'
kubectl rollout restart deploy/surfsense-zero-cache -n surfsense
```
Ce changement est persistant dans le PVC PostgreSQL. Il ne survivrait pas à une suppression complète du PVC.

**7. Mémoire — backend et celery chargent sentence-transformers (~460MB) chacun, + docling PDF au besoin**
Pic au démarrage > steady-state. Limite actuelle : backend 4Gi, **celery 16Gi** (docling + autoscale pool).
Au redémarrage machine, le pic celery peut atteindre 10 workers × 460MB = 4.6GB simultanément → OOMKill nœud.

**8. LLM preferences par défaut sur AUTO (cloud SurfSense) — aucun prompt ne fonctionne en self-hosted**
À la création d'un espace, `agent_llm_id=0` (mode AUTO cloud). Doit être configuré sur un LLM local/LiteLLM :
```bash
curl -X PUT "http://surfsense-api.neokube.local/api/v1/search-spaces/{id}/llm-preferences" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"agent_llm_id": 1, "document_summary_llm_id": 1, "image_generation_config_id": 0, "vision_llm_config_id": 0}'
```

**10. CELERY_MAX_WORKERS=10 baked dans l'image Docker — à overrider impérativement**
L'image `ghcr.io/modsetter/surfsense-backend` démarre avec `CELERY_MAX_WORKERS=10` par défaut (autoscale pool).
`CELERYD_CONCURRENCY=2` (par worker) n'empêche pas 10 workers de se spawner au démarrage → 4.6GB pic.
**Fix** dans `deployment-surfsense-celery.yaml` :
```yaml
- name: CELERY_MAX_WORKERS
  value: "3"
- name: CELERY_MIN_WORKERS
  value: "1"
```
Réduit le pic à ~1.4GB au démarrage (3 workers × 460MB), suffisant pour le débit SurfSense.

**11. Ghost pods après redémarrage nœud — `kubectl delete pod --force --grace-period=0`**
Après un hard reboot, certains pods restent en état `Unknown` (node KO brutal, pas de SIGTERM propre).
Le scheduler ne les remplace pas tant qu'ils existent. Fix :
```bash
kubectl get pods -A | grep Unknown
kubectl delete pod --force --grace-period=0 -n <namespace> <pod-name>
```

**12. SurfSense inaccessible via `http://surfsense.neokube.local` — CORS bloqué**
Le backend CORS n'autorise que `NEXT_FRONTEND_URL = https://surfsense.neokube.fr`. Accéder via l'URL locale `http://surfsense.neokube.local` provoque un échec CORS : `fetch()` lève `TypeError` → "Unable to connect to the server. Check your internet connection and try again."

Cause : `Origin: http://surfsense.neokube.local` est absent de la whitelist. Le backend n'expose aucune env var pour ajouter des origines supplémentaires — seul `NEXT_FRONTEND_URL` est lu.

**Règle** : SurfSense s'utilise **exclusivement** via `https://surfsense.neokube.fr`. Le CNAME et le tunnel Cloudflare sont configurés pour ça. L'ingress Traefik `surfsense.neokube.local` reste utile pour accès direct backend (API curl, healthchecks), pas pour l'utilisation navigateur.

### Limites mémoire actuelles (2026-05-06)
| Pod | requests | limits | Raison |
|---|---|---|---|
| surfsense-backend | 500m/1Gi | 2cpu/4Gi | sentence-transformers 460MB + FastAPI |
| surfsense-celery | 200m/1Gi | 2cpu/16Gi | 3 workers × 460MB + docling PDF |
| surfsense-zero-cache | 200m/512Mi | 1cpu/4Gi | Réplique SQLite croissante |
| surfsense-postgres | 500m/512Mi | 1cpu/2Gi | pgvector |

### Intégrations stack NeoKube
| Intégration | Config | Notes |
|---|---|---|
| **Embedding** | `EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Modèle local 384-dim, multilingual. chonkie v1.6 ignore base_url OpenAI → pas de LiteLLM pour les embeddings |
| **LLM providers** | Configurés dans l'UI SurfSense (Settings > LLM Providers) | Ajouter notre LiteLLM comme provider OpenAI-compatible : `http://litellm.cockpit.svc.cluster.local/v1` |
| **Observabilité** | LangSmith-compat → Langfuse self-hosted | `LANGSMITH_ENDPOINT=http://langfuse.cockpit.svc.cluster.local` |
| **Notion** | Legacy token (actif) | Token dans **Vault** `secret/neokube/apps/notion` → champ `NOTION_INTEGRATION_TOKEN` ; inséré en DB (connecteur id=1, space=1) — 444 pages accessibles, indexation 24h. OAuth possible via `https://surfsense-api.neokube.fr/api/v1/auth/notion/connector/callback` |
| **Qdrant** | Non utilisé par SurfSense (pgvector natif) | SurfSense embarque son propre vector store dans PostgreSQL (pgvector). Les agents peuvent interroger SurfSense via son API REST. |

### Séparation métier / expérience de travail (Search Spaces)
SurfSense organise les documents en **Search Spaces** distincts. À créer dans l'UI après déploiement :

| Search Space | Contenu | Connecteurs suggérés |
|---|---|---|
| **Métier NeoKube** | Processus, architecture cluster, runbooks SRE, conventions GitOps | Crawlee (docs techniques), fichiers locaux |
| **Expérience de travail** | Projets clients, briefs Zoho, décisions PM, historique Penpot | Notion, Zoho (via crawlee-service ou upload manuel) |

> Les agents peuvent interroger SurfSense via `POST /api/v1/chat` avec un `search_space_id` pour cibler le bon contexte.

### Appel depuis les agents (API SurfSense)
```python
# Depuis un agent Temporal ou un connector, recherche documentaire
import httpx

SURFSENSE_URL = "http://surfsense-backend.surfsense.svc.cluster.local:8000"

async def surfsense_search(query: str, search_space_id: int, token: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(
            f"{SURFSENSE_URL}/api/v1/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"query": query, "search_space_id": search_space_id}
        )
    return r.json()
```

