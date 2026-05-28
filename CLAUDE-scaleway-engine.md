# CLAUDE-scaleway-engine.md — Scaleway Engine (microservice)

> Microservice centralisé d'accès à l'API Scaleway — avec gestion des credentials via Vault, règles métier, et RBAC par agent.
> **Statut** : à implémenter — design validé 2026-05-28.

---

## Pourquoi un scaleway-engine ?

L'API Scaleway est aujourd'hui accessible **uniquement depuis Charlotte** (credentials Vault injectés dans son pod). Ce couplage crée plusieurs problèmes :

| Problème | Impact |
|---|---|
| `SCW_SECRET_KEY` exclusif à Charlotte | Leon/Dispatcher/Domi ne peuvent pas appeler Scaleway sans passer par Charlotte (couplage fort, latence) |
| Pas de règles Scaleway centralisées | Chaque agent redécouvre les conventions (nommage projets, tags, quotas) |
| Pas d'isolation billing par projet client | Toutes les ressources s'accumulent dans le projet Scaleway par défaut |
| Pas d'audit trail unifié | Impossible de tracer "quel agent a créé quelle ressource Scaleway" |

**Solution** : `scaleway-engine` dans `connector-system` — même architecture que `zoho-engine v2.0`.

```
Agents (Charlotte / Dispatcher / Domi / Leon / Aria / Nox)
    │
    └── POST http://scaleway-engine.connector-system.svc.cluster.local:8012/{endpoint}
            │
            ├── Vault (/vault/secrets/scaleway) → SCW_SECRET_KEY + SCW_ORG_ID
            ├── RBAC par agent (header X-Agent-Id)
            └── https://api.scaleway.com
```

---

## Position dans l'architecture

```
connector-system (ports 8000–8012)
    ├── zoho-connector      8000   (zoho-engine v2.0)
    ├── github-connector    8001
    ├── vercel-connector    8002
    ├── neon-connector      8003
    ├── penpot-connector    8004
    ├── openprovider-conn.  8005
    ├── cloudflare-conn.    8006
    ├── stalwart-conn.      8007
    ├── google-discovery    8008
    ├── crawlee-service     8009
    ├── dataforseo-conn.    8010
    ├── notion-connector    8011
    └── scaleway-engine  ➜ 8012   ← NOUVEAU
```

**Vault path** : `secret/neokube/infrastructure/scaleway`
**Clés** : `SCW_SECRET_KEY`, `SCW_ORG_ID`, `SCW_DEFAULT_PROJECT_ID`

---

## RBAC par agent

L'engine vérifie le header `X-Agent-Id` à chaque requête. Toute requête sans ce header → 401.

| Endpoint | Charlotte | Dispatcher | Domi | Leon | Aria | Nox | Autres |
|---|---|---|---|---|---|---|---|
| `GET /health` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /projects` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `GET /projects/{id}` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `POST /projects` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `DELETE /projects/{id}` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /billing` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /instances` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /iam` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /proxy` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Charlotte** : accès complet — elle reste maître de l'infrastructure Scaleway.
**Dispatcher/Domi** : création de projets Scaleway pour les projets clients (pipeline).
**Leon** : lecture + création projet (audit et planification).
**Aria/Nox** : lecture seule (contexte déploiement — quel projet Scaleway utiliser).

---

## API Endpoints

### GET /health

```json
{"status": "ok", "engine": "scaleway", "version": "1.0", "org_id": "xxx"}
```

---

### GET /projects

Liste tous les projets Scaleway de l'organisation.

**Headers** : `X-Agent-Id: {agent_name}`

**Réponse** :
```json
{
  "projects": [
    {
      "id": "xxx-yyy-zzz",
      "name": "neokube-main",
      "description": "Projet principal NeoKube",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### GET /projects/{project_id}

Détail d'un projet Scaleway spécifique.

**Réponse** :
```json
{
  "id": "xxx-yyy-zzz",
  "name": "client-popurank",
  "description": "Projet Scaleway — Popurank (créé par Domi 2026-05-28)",
  "created_at": "2026-05-28T10:00:00Z",
  "organization_id": "yyy-zzz-aaa"
}
```

---

### POST /projects — créer un projet client

Point clé du pipeline : **chaque projet client Neomnia = un projet Scaleway dédié**.

**Headers** : `X-Agent-Id: {agent_name}` (dispatcher, domi, leon, charlotte uniquement)

**Payload** :
```json
{
  "name": "client-{slug}",
  "description": "Projet Scaleway — {project_title} (créé par {agent_name} {date})"
}
```

**Convention de nommage** : `client-{slug}` — où `slug` est le nom du projet en minuscules, tirets, sans accents.

**Réponse** :
```json
{
  "project_id": "xxx-yyy-zzz",
  "name": "client-popurank",
  "created_at": "2026-05-28T10:00:00Z",
  "status": "created"
}
```

---

### DELETE /projects/{project_id}

Charlotte uniquement. Protocole obligatoire :
1. `GET /projects` → présenter la liste
2. Confirmation humaine explicite
3. Seulement alors appeler `DELETE /projects/{id}`

---

### GET /billing

Charlotte uniquement. Retourne le résumé billing Scaleway (month-to-date).

**Réponse** :
```json
{
  "current_month": {
    "total_undiscounted": 2878.50,
    "total_discounted": 0.00,
    "credit_applied": 2878.50
  },
  "currency": "EUR"
}
```

---

### GET /instances

Charlotte uniquement. Liste les serveurs actifs (Dedibox, Elastic Metal, Instances).

---

### GET /iam

Charlotte uniquement. Liste les clés API Scaleway (audit IAM).

---

### POST /proxy

Charlotte uniquement. Passthrough générique vers `https://api.scaleway.com/{path}`.

```json
{
  "method": "GET|POST|DELETE|PATCH",
  "path": "/account/v3/projects",
  "params": {},
  "body": {}
}
```

---

## Intégration pipeline — DevProjectWorkflow

Chaque projet client déclenché via Dispatcher doit créer un projet Scaleway dédié. Cette responsabilité revient à **Domi** (Domain Infrastructure Manager) — il gère déjà le domaine et le DNS, le projet Scaleway est la troisième dimension de l'infrastructure client.

```
DevProjectWorkflow (Dispatcher)
    ├── Aria : GitHub frontend + Vercel project
    ├── Nox  : GitHub backend + Neon branch
    ├── Penpot : projet design
    └── Domi : ① domaine + DNS  ② projet Scaleway ← NOUVEAU
              → retourne scaleway_project_id dans le rapport
```

**Activité Temporal Domi** :

```python
@activity.defn
async def domi_provision_scaleway_project(spec: ProjectSpec) -> dict:
    """Crée le projet Scaleway client et retourne scaleway_project_id."""
    slug = spec["title"].lower().replace(" ", "-")[:30]
    r = await httpx.AsyncClient().post(
        f"{SCALEWAY_ENGINE_URL}/projects",
        json={
            "name": f"client-{slug}",
            "description": f"Projet Scaleway — {spec['title']} (Domi {date.today()})"
        },
        headers={"X-Agent-Id": "domi"},
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()
```

**`scaleway_project_id` stocké dans** :
- Réponse `/trigger` Dispatcher (rapport final)
- Commentaire Zoho (ligne `scaleway_project_id: xxx`)
- Email client (section "Infrastructure cloud")

---

## Implémentation technique — FastAPI

Le `scaleway-engine` suit exactement le patron des autres connectors Python.

### Stack

```
python:3.12-slim
fastapi + uvicorn
httpx (appels API Scaleway async)
Vault root token → SCW_SECRET_KEY + SCW_ORG_ID
```

### Structure

```python
# scaleway_engine.py
from fastapi import FastAPI, Header, HTTPException, Request
import httpx, os, functools

app = FastAPI(title="scaleway-engine", version="1.0")

SCW_API_BASE = "https://api.scaleway.com"
SCW_SECRET_KEY = os.getenv("SCW_SECRET_KEY", "")
SCW_ORG_ID     = os.getenv("SCW_ORG_ID", "")

# RBAC : agent_id → endpoints autorisés
_RBAC = {
    "charlotte": {"*"},
    "dispatcher": {"projects.read", "projects.write"},
    "domi":       {"projects.read", "projects.write"},
    "leon":       {"projects.read", "projects.write"},
    "aria":       {"projects.read"},
    "nox":        {"projects.read"},
}

def _check_rbac(agent_id: str, scope: str):
    perms = _RBAC.get(agent_id, set())
    if "*" not in perms and scope not in perms:
        raise HTTPException(status_code=403, detail=f"Agent '{agent_id}' non autorisé sur '{scope}'")

def _scw_headers():
    return {"X-Auth-Token": SCW_SECRET_KEY, "Content-Type": "application/json"}

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "scaleway", "version": "1.0"}

@app.get("/projects")
async def list_projects(x_agent_id: str = Header(...)):
    _check_rbac(x_agent_id, "projects.read")
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            f"{SCW_API_BASE}/account/v3/projects",
            headers=_scw_headers(),
            params={"organization_id": SCW_ORG_ID, "page_size": 100},
        )
        r.raise_for_status()
        data = r.json()
    return {"projects": data.get("projects", []), "total": data.get("total_count", 0)}

@app.post("/projects")
async def create_project(body: dict, x_agent_id: str = Header(...)):
    _check_rbac(x_agent_id, "projects.write")
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.post(
            f"{SCW_API_BASE}/account/v3/projects",
            headers=_scw_headers(),
            json={"name": body["name"], "description": body.get("description", ""),
                  "organization_id": SCW_ORG_ID},
        )
        r.raise_for_status()
        proj = r.json()
    return {"project_id": proj["id"], "name": proj["name"],
            "created_at": proj["created_at"], "status": "created"}
```

---

## GitOps — Fichiers à créer

```
Kubinote-GitOps/apps/connector-system/base/
    ├── deployment-scaleway-engine.yaml
    ├── service-scaleway-engine.yaml
    └── configmap-scaleway-engine-script.yaml
```

### deployment-scaleway-engine.yaml (squelette)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scaleway-engine
  namespace: connector-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: scaleway-engine
  template:
    metadata:
      labels:
        app: scaleway-engine
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "connector"
        vault.hashicorp.com/agent-inject-secret-scaleway: "secret/neokube/infrastructure/scaleway"
        vault.hashicorp.com/agent-inject-template-scaleway: |
          {{- with secret "secret/neokube/infrastructure/scaleway" -}}
          export SCW_SECRET_KEY="{{ .Data.data.SCW_SECRET_KEY }}"
          export SCW_ORG_ID="{{ .Data.data.SCW_ORG_ID }}"
          export SCW_DEFAULT_PROJECT_ID="{{ .Data.data.SCW_DEFAULT_PROJECT_ID }}"
          {{- end }}
    spec:
      serviceAccountName: connector-sa
      containers:
      - name: scaleway-engine
        image: python:3.12-slim
        command: ["sh", "-c", "source /vault/secrets/scaleway && pip install fastapi uvicorn httpx -q && python /app/scaleway_engine.py"]
        ports:
        - containerPort: 8012
        volumeMounts:
        - name: script
          mountPath: /app
      volumes:
      - name: script
        configMap:
          name: scaleway-engine-script
```

### service-scaleway-engine.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: scaleway-engine
  namespace: connector-system
spec:
  selector:
    app: scaleway-engine
  ports:
  - port: 8012
    targetPort: 8012
```

---

## Vault — Provisionnement credentials

Les credentials Scaleway sont déjà dans Vault pour Charlotte (`secret/neokube/infrastructure/scaleway`). Il suffit d'y ajouter `SCW_DEFAULT_PROJECT_ID` si absent :

```bash
# Vérifier l'existant
kubectl exec -n security vault-0 -- vault kv get secret/neokube/infrastructure/scaleway

# Ajouter SCW_DEFAULT_PROJECT_ID si absent (ne pas écraser les autres clés)
kubectl exec -n security vault-0 -- vault kv patch \
  secret/neokube/infrastructure/scaleway \
  SCW_DEFAULT_PROJECT_ID="<id-projet-neokube-principal>"
```

> Charlotte passe de `secret/neokube/infrastructure/scaleway` (injection directe dans son pod) à l'appel de `scaleway-engine`. Ses credentials Vault restent inchangés — c'est l'engine qui les lit maintenant.

---

## Migration Charlotte

Charlotte a actuellement `scaleway_api()` qui appelle l'API Scaleway directement (credentials injectés par Vault dans son pod). Après déploiement de scaleway-engine :

1. `scaleway_api()` → redirige vers `scaleway-engine/proxy` (Charlotte uniquement)
2. Supprimer l'injection Vault `SCW_SECRET_KEY` du pod Charlotte
3. Les outils spécifiques (`scaleway_billing`, `scw_org_id`, `_scw_key`) → `GET /billing`, `GET /projects`

Cette migration est **non-bloquante** — Charlotte peut continuer à fonctionner avec l'injection directe pendant le déploiement de l'engine.

---

## Protocole de test Charlotte post-migration

La migration Charlotte doit être validée explicitement — le risque est qu'elle continue à appeler l'API directe sans que l'erreur soit visible (les credentials sont toujours dans son pod jusqu'à leur suppression).

### Étape 1 — Test engine isolé (sans Charlotte)

Vérifier que l'engine répond correctement avant de toucher Charlotte :

```bash
# Depuis un pod quelconque dans le cluster
# Health
python3 -c "import urllib.request; print(urllib.request.urlopen('http://scaleway-engine.connector-system.svc.cluster.local:8012/health').read())"

# Liste projets (Charlotte)
python3 -c "
import urllib.request, json
req = urllib.request.Request(
    'http://scaleway-engine.connector-system.svc.cluster.local:8012/projects',
    headers={'X-Agent-Id': 'charlotte'}
)
print(json.loads(urllib.request.urlopen(req).read()))
"

# RBAC : aria ne peut pas lire le billing
python3 -c "
import urllib.request
req = urllib.request.Request(
    'http://scaleway-engine.connector-system.svc.cluster.local:8012/billing',
    headers={'X-Agent-Id': 'aria'}
)
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(f'Attendu 403 : {e.code}')  # doit afficher 403
"
```

### Étape 2 — Test Charlotte via OWU (scénarios de validation)

Tester depuis Open WebUI (ou Charlotte `/mission`) **après** le refactoring de `scaleway_api()` :

| # | Prompt | Résultat attendu | Indicateur de succès | Statut (2026-05-28) |
|---|---|---|---|---|
| T1 | "Liste-moi les projets Scaleway actifs" | Charlotte liste les projets avec leurs IDs | Appel `GET /projects` loggé dans les traces Langfuse | ✅ OK — `scaleway_list_projects` appelé, 3 projets retournés |
| T2 | "Quel est le billing Scaleway ce mois ?" | Charlotte retourne le total net en euros | Appel `GET /billing` loggé — **pas** d'appel direct `api.scaleway.com` depuis le pod Charlotte | ⚠️ Contournement — `GET /billing` → 403 (permission `billing:read` manquante). Charlotte lit depuis ConfigMap `scaleway-billing-history` (Prometheus). **Issue Zoho** : `2114101000001744008` |
| T3 | "Quels serveurs Scaleway sont actifs ?" | Charlotte liste les instances avec état | Appel `GET /instances` via engine | ✅ OK — `scaleway_list_instances` appelé, stalwart-mail DEV1-S retourné |
| T4 | "Crée un projet Scaleway pour le projet test-demo" | Charlotte crée `client-test-demo` | Appel `POST /projects` avec `X-Agent-Id: charlotte` | ✅ OK — projet créé (`a8544ee7`) et supprimé (cleanup) |
| T5 | "Audite les clés IAM Scaleway" | Charlotte liste les clés API avec dates d'expiration | Appel `GET /iam` via engine | ✅ OK — `scaleway_audit_iam` appelé, 2 clés retournées avec dates d'expiration |

> **⚠️ Issue ouverte — T2 billing** : la clé `SCW_SECRET_KEY` dans Vault (`secret/neokube/infrastructure/scaleway`) n'a pas la permission `billing:read` dans l'IAM Scaleway. Action : ajouter la policy `BillingReadOnly` dans la console Scaleway IAM au groupe/application portant cette clé. Aucun changement de code requis. Issue Zoho `2114101000001744008` dans le projet neokube.

### Étape 3 — Vérification que Charlotte n'appelle plus l'API directe

```bash
# Vérifier qu'il n'y a plus d'appels sortants vers api.scaleway.com depuis le pod Charlotte
# (après suppression de l'injection Vault SCW_SECRET_KEY)
kubectl exec -n agent-system deployment/agent-charlotte -- env | grep SCW
# Doit retourner vide — aucune variable SCW_* dans l'environnement Charlotte
```

Si cette commande retourne encore `SCW_SECRET_KEY` → l'injection Vault n'a pas été supprimée → Charlotte utilise encore l'API directe.

### Étape 4 — Test de résilience

```bash
# Simuler une indisponibilité de l'engine
kubectl scale deployment scaleway-engine -n connector-system --replicas=0

# Charlotte doit répondre avec une erreur gracieuse (pas un crash)
# Prompt : "Liste les projets Scaleway"
# Résultat attendu : "scaleway-engine indisponible — impossible de récupérer les projets Scaleway"

# Remettre en ligne
kubectl scale deployment scaleway-engine -n connector-system --replicas=1
```

### Étape 5 — Vérification traces Langfuse

Après chaque scénario T1–T5, vérifier dans Langfuse (`http://langfuse.neokube.local`) :
- Trace Charlotte avec outil `scaleway_*` ou `scaleway_api` appelé
- Aucune trace montrant `api.scaleway.com` en appel HTTP direct (toujours via engine)
- Score `mission_quality` ≥ 8/10 sur les scénarios billing/IAM

---

## Checklist déploiement

### Phase A — Engine
- [ ] Vault : vérifier `secret/neokube/infrastructure/scaleway` (`SCW_SECRET_KEY`, `SCW_ORG_ID`, `SCW_DEFAULT_PROJECT_ID`)
- [ ] GitOps : créer les 3 fichiers dans `connector-system/base/`
- [ ] Kustomization : ajouter les 3 fichiers dans `kustomization.yaml`
- [ ] Test health : `kubectl exec -n connector-system <pod> -- python3 -c "...http://localhost:8012/health..."`
- [ ] Test RBAC : sans `X-Agent-Id` → 422 ; `aria` sur `/billing` → 403 ; `charlotte` sur `/billing` → 200

### Phase B — Agents (Domi + Leon)
- [ ] Domi : ajouter activité `domi_provision_scaleway_project` + `SCALEWAY_ENGINE_URL` dans ConfigMap
- [ ] Dispatcher : passer `scaleway_project_id` dans le rapport de fin de workflow
- [ ] Leon : remplacer `delegate_to_charlotte` par `scaleway_list_projects` + `scaleway_get_project` (appels directs engine)

### Phase C — Migration Charlotte (non-bloquante)
- [ ] Refactoriser `scaleway_api()` → proxy engine (`POST /proxy`, `X-Agent-Id: charlotte`)
- [ ] Refactoriser `scaleway_billing` → `GET /billing`
- [ ] Refactoriser `scw_org_id()` + `_scw_key()` → `GET /projects`
- [ ] **Protocole test Charlotte** : exécuter les 5 scénarios T1–T5 (§Protocole de test)
- [ ] Vérifier Langfuse : aucun appel direct `api.scaleway.com` depuis pod Charlotte
- [ ] Supprimer injection Vault `SCW_SECRET_KEY` du pod Charlotte (`serviceaccount-sre.yaml`)
- [ ] Vérifier : `kubectl exec -n agent-system deployment/agent-charlotte -- env | grep SCW` → vide

### Phase D — Documentation ✅ fait
- [x] CLAUDE-scaleway-engine.md
- [x] CLAUDE-connector.md : architecture + table
- [x] CLAUDE-services.md : port 8012
- [x] CLAUDE-pipeline.md : Phase 3 Domi
- [x] CLAUDE.md : Domi v2.0
- [x] Notion : page projet créée

---

## Règles métier Scaleway

**R-SCW1 — Un projet client = un projet Scaleway**
Tout projet dispatché via `DevProjectWorkflow` doit avoir un projet Scaleway dédié, créé par Domi en parallèle des autres artefacts (GitHub, Vercel, Neon). Le `scaleway_project_id` est inclus dans le rapport final.

**R-SCW2 — Convention nommage**
`client-{slug}` — slug = titre projet en minuscules, tirets, sans accents, max 30 chars. Exemples : `client-popurank`, `client-neomnia-studio`.

**R-SCW3 — Pas d'accès direct API Scaleway depuis les agents**
Aucun agent ne doit lire `SCW_SECRET_KEY` directement. Pattern obligatoire : `agent → scaleway-engine → API Scaleway`. Anti-pattern L13 dans CLAUDE-leon.md.

**R-SCW4 — Suppression projet = Charlotte seule**
La suppression d'un projet Scaleway (et donc de toutes ses ressources) est réservée à Charlotte, avec confirmation humaine préalable.

**R-SCW5 — Charlotte reste maître du billing et de l'IAM**
Les endpoints `/billing`, `/instances`, `/iam` sont accessibles uniquement par Charlotte. Les autres agents ont accès aux projets uniquement.
