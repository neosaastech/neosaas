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

### 6. SMTP via Stalwart — service `stalwart-mail`, pas `stalwart-web`

Stalwart expose **deux services** dans le namespace `stalwart` :
- `stalwart-web.stalwart.svc.cluster.local:8080` → API HTTP admin (stalwart-connector)
- `stalwart-mail.stalwart.svc.cluster.local:587` → SMTP submission (aiosmtplib)

Utiliser `stalwart-web` pour SMTP provoque un timeout aiosmtplib (`CancelledError` dans `asyncio.wait_for`) car le port 587 n'est pas exposé sur ce service.

```python
# FAUX — stalwart-web = HTTP admin uniquement
SMTP_HOST = "stalwart-web.stalwart.svc.cluster.local"

# CORRECT — stalwart-mail = ports SMTP 25/465/587
SMTP_HOST = "stalwart-mail.stalwart.svc.cluster.local"
```

Pattern `aiosmtplib` STARTTLS utilisé dans les agents :
```python
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

password = await _load_stalwart_password()  # Vault secret/neokube/apps/stalwart.NOREPLY_PASSWORD
msg = MIMEMultipart("alternative")
msg["From"] = MAIL_FROM          # no-reply@neokube.fr, leon@neokube.fr, etc.
msg["To"]   = recipient
msg["Subject"] = subject
msg.attach(MIMEText(body_html, "html"))
await aiosmtplib.send(msg, hostname=SMTP_HOST, port=587, start_tls=True,
                      username=MAIL_FROM, password=password)
```

Credentials par agent dans Vault :
| Agent | Vault path | Clé |
|---|---|---|
| Dispatcher | `secret/neokube/apps/stalwart` | `NOREPLY_PASSWORD` |
| Leon | `secret/neokube/agents/leon` | `SMTP_PASSWORD` |
| Vera | `secret/neokube/agents/vera` | `SMTP_PASSWORD` |
| Domi | `secret/neokube/agents/domi` | `SMTP_PASSWORD` |

**Gotcha `validate_certs=False`** : Stalwart utilise un certificat self-signed en interne → `aiosmtplib` lève `CERTIFICATE_VERIFY_FAILED` si `validate_certs` n'est pas `False`. Acceptable pour connexion intra-cluster.

**Gotcha rôle `user`** : Les comptes Stalwart créés via API sans `roles` ne peuvent pas soumettre d'email (550 5.7.1). Tous les comptes agents doivent avoir `roles: ["user"]` :
```bash
# Patch via pod curl dans namespace stalwart
curl -X PATCH http://stalwart-web.stalwart.svc.cluster.local:8080/api/principal/<account> \
  -u "admin:ADMIN_PASSWORD" -H "Content-Type: application/json" \
  -d '[{"action":"set","field":"roles","value":["user"]}]'
```

---

### 7. LiteLLM + HuggingFace router — `_embed()` retourne des scalaires, pas un vecteur

Quand LiteLLM proxifie `nomic-embed-text` vers HuggingFace (`paraphrase-multilingual-mpnet-base-v2`), la réponse `/v1/embeddings` est **non-standard** : le champ `data` contient 768 entrées séparées (une par dimension), chacune avec un `"embedding"` scalar — pas une seule entrée avec un vecteur complet.

`data[0]["embedding"]` vaut donc un `float` (−0.206…), pas une `list[float]`.
Upserter ce scalar dans Qdrant produit un **HTTP 400**.

```python
# FAUX — ne fonctionne qu'avec OpenAI/Mistral (format standard)
return r.json()["data"][0]["embedding"]

# CORRECT — détecte les deux formats
data = r.json()["data"]
first = data[0]["embedding"]
if isinstance(first, list):
    return first
return [item["embedding"] for item in data]   # HuggingFace router
```

Ce pattern doit être appliqué dans **tous** les `_embed()` des agents (dispatcher, charlotte-sre, leon, etc.).

---

### 8. URLs externes : construire côté connector, jamais côté agent

**Symptôme** : Charlotte et Leon généraient des URLs Zoho incorrectes (ex: `#zp/dashboard/{id}`, `/projects/{id}/` sans `#`) parce que chaque agent avait sa propre implémentation de construction d'URL — certaines inventées, toutes désynchronisées.

**Cause racine** : les connectors avaient été conçus comme proxies HTTP fins (Phase 1). La logique de présentation (URLs, labels) s'est accumulée dans les agents au lieu de rester au niveau du connector.

**Règle** : **Toute enrichissement de la réponse d'une API externe appartient au connector, pas à l'agent.**

```python
# FAUX — chaque agent construit sa propre URL (désynchronisation garantie)
# configmap-leon-script.yaml
url = f"https://projects.zoho.com/portal/neomniadotnet#zp/projects/{p['id']}/"

# configmap-sre-script.yaml
url = f"https://projects.zoho.com/portal/{ZOHO_PORTAL_NAME}#zp/projects/{pid}/"

# CORRECT — le connector injecte web_url dans chaque réponse
# configmap-zoho-connector.yaml  ← un seul endroit
p["web_url"] = f"{WEB_BASE}#zp/projects/{pid}/"

# Les agents lisent simplement :
url = p.get("web_url", "")
```

**Pattern à appliquer à tout nouveau connector :**

```python
def _inject_web_urls(path: str, body: dict) -> dict:
    """Post-processing centralisé : enrichit les réponses avec web_url."""
    if "projects" in body:
        for p in body["projects"]:
            p["web_url"] = f"{WEB_BASE}#zp/projects/{p['id']}/"
    if "tasks" in body:
        for t in body["tasks"]:
            t["web_url"] = t.get("link", {}).get("web", {}).get("url", "")
    # ... autres ressources
    return body

# Appelé une seule fois dans /proxy, avant return :
return _inject_web_urls(req.path, r.json())
```

**Checklist pour chaque nouveau connector :**
- [ ] Identifier toutes les URLs web consultables par un humain dans l'API (projets, tâches, tickets, fichiers…)
- [ ] Ajouter un `_inject_web_urls()` dans le connector dès la v1.0
- [ ] Les agents ne doivent **jamais** construire d'URL vers l'API externe — ils lisent `item["web_url"]`
- [ ] Documenter le format d'URL validé dans `CLAUDE.md` et dans la memory `reference_<api>_api.md`

**URLs Zoho validées (2026-05-02) :**
| Ressource | Format |
|---|---|
| Projet | `https://projects.zoho.com/portal/neomniadotnet#zp/projects/{id}/` |
| Tâche | retournée par l'API dans `link.web.url` (format `#zp/task-detail/{id}`) |
| Milestone | `#zp/projects/{project_id}/milestones/` |
| Tasklist | `#zp/projects/{project_id}/tasks/` |

---


### 13. Secrets K8s cloisonnés par namespace — `cockpit-secrets` inaccessible depuis `agent-system`

Les secrets K8s sont **scoped par namespace**. Un pod dans `agent-system` ne peut pas lire un secret défini dans `cockpit`.

**Symptôme silencieux :** `optional: true` + mauvais namespace = variable d'environnement vide, aucune erreur au démarrage. Les scores Langfuse et traces directes sont perdus sans log d'erreur.

```yaml
# FAUX — cockpit-secrets est dans le namespace cockpit, pas agent-system
- name: LANGFUSE_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: cockpit-secrets        # ← inaccessible depuis agent-system !
      key: LANGFUSE_SECRET_KEY
      optional: true               # ← masque l'erreur silencieusement

# CORRECT — cluster-manager-secrets est dans agent-system
- name: LANGFUSE_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: cluster-manager-secrets
      key: LANGFUSE_SECRET_KEY
```

**Secrets par namespace (état 2026-05-06) :**
| Namespace | Secret | Contenu |
|---|---|---|
| `agent-system` | `cluster-manager-secrets` | `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LITELLM_MASTER_KEY` |
| `agent-system` | `litellm-agent-keys` | `LITELLM_KEY_{AGENT}` (virtual keys par agent) |
| `agent-system` | `vault-root-token` | `root-token` |
| `cockpit` | `cockpit-secrets` | `MISTRAL_API_KEY`, `GEMINI_API_KEY`, `LANGFUSE_*`, `LITELLM_*`, `LANGFUSE_PG_PASS` |
| `security` | `vault-init-keys` | `root-token` source |
| `connector-system` | `vault-root-token` | copie du root-token Vault |

**Règle** : pour tout nouvel agent dans `agent-system`, utiliser exclusivement `cluster-manager-secrets` et `litellm-agent-keys`. Ne jamais référencer `cockpit-secrets`.

---

### 14. Heap limit (Node.js / JVM) ≠ OOMKilled (cgroup) — augmenter `limits.memory` ne suffit PAS

Symptôme observé sur `surfsense-zero-cache` (rocicorp/zero, Node.js) : `CrashLoopBackOff` avec dans les logs :
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

`kubectl describe pod` ne montre **PAS** `OOMKilled` ni `Exit Code 137` — le conteneur sort proprement parce que c'est V8 qui tue le process, pas le cgroup Linux.

**Diagnostic différencié** :
| Symptôme | Cause | Fix |
|---|---|---|
| `Reason: OOMKilled` + `Exit Code: 137` | Linux cgroup | Augmenter `resources.limits.memory` |
| Logs `FATAL ERROR: Reached heap limit` | V8 (Node.js) plafonné à ~1.7 Gi par défaut | `env: NODE_OPTIONS=--max-old-space-size=<MB>` |
| Logs `java.lang.OutOfMemoryError: Java heap space` | JVM `-Xmx` trop bas | `env: JAVA_OPTS=-Xmx<size>` |
| Logs Python `MemoryError` sans OOMKilled | Code applicatif | Profiler le code, pas un fix infra |

**Erreur classique** (qu'a fait Charlotte initialement avant durcissement) : voir CrashLoopBackOff → augmenter `limits.memory` de 4Gi à 8Gi → rollout réussi → ❌ le nouveau pod re-crashe immédiatement avec le même `FATAL ERROR` parce que V8 reste plafonné.

**Fix correct** appliqué dans `deployment-surfsense-zero-cache.yaml` (commit `af3db45`, 2026-05-07) :
```yaml
env:
- name: NODE_OPTIONS
  value: "--max-old-space-size=10240"  # 10 Gi heap V8
resources:
  requests: {memory: 2Gi}
  limits:   {memory: 12Gi}            # headroom au-dessus du heap
```

**Attention surfsense-zero-cache spécifiquement** : rocicorp/zero 0.26.x démarre 2 sous-process Node.js indépendants (`syncer` + `change-streamer`), chacun avec son propre heap. 6 Gi crashait encore le change-streamer. **10 Gi tient** avec `replicaSize` ~130 MB. Re-évaluer si la base SurfSense grossit.

**Règle** : avant tout fix OOM, lire ≥ 50 lignes de logs du pod défaillant et chercher `FATAL`, `OutOfMemory`, `heap`. Si présent → c'est un heap limit applicatif, pas un OOM cgroup.

---

### 15. Patcher uniquement le live (kubectl patch) sur ressource GitOps = fix reverté en <5 min

Le CronJob `cluster-bootstrap` (namespace `management`, `*/5 * * * *`) ré-applique `~/Kubinote-GitOps/` toutes les 5 min via `kubectl apply`. Toute modification d'un Deployment/ConfigMap géré GitOps faite par `kubectl patch`, `kubectl set image`, `kubectl scale` (sans modifier le repo) sera **écrasée silencieusement** au prochain tick.

**Procédure correcte** pour modifier une ressource GitOps :
1. Lire le manifest dans `~/Kubinote-GitOps/apps/<service>/base/<manifest>.yaml`
2. Modifier le fichier
3. `kubectl apply -f <fichier>` (immédiat, ne pas attendre le CronJob)
4. **Vérifier le pod sain ≥30s** (pas seulement le rollout)
5. **`git commit && git push`** — sans cette étape, le fix sera reverté au prochain sync

**Pourquoi ce pattern échoue en pratique** : un crash serveur, un timeout réseau ou une session fermée entre l'étape 4 et l'étape 5 laisse le cluster dans un état dégradé où le live est fixé mais le repo ne l'est pas. Au prochain tick CronJob, le fix disparaît silencieusement.

**Workflow Charlotte SRE** : utiliser `apply_gitops_fix` (atomique) qui garantit que le push ne peut pas être oublié. Voir [CLAUDE-agents.md](CLAUDE-agents.md#charlotte-sre--protocole-de-remédiation-sécurisé) pour le détail.

---

### 16. Validation post-rollout : `kubectl get pod <ancien-nom>` retourne toujours NotFound

Après `kubectl rollout`, `kubectl scale`, `kubectl apply` sur un Deployment, le **nom du pod change** (nouveau ReplicaSet). Vérifier le fix via `kubectl get pod <ancien-nom>` retourne `NotFound` — ce qui prouve **uniquement** que le pod a été remplacé, pas que le nouveau pod est sain.

**Faux positif typique** :
```
$ kubectl rollout status deployment/foo
deployment "foo" successfully rolled out         # ✓
$ kubectl get pod foo-old-abc-xyz
Error: pods "foo-old-abc-xyz" not found          # ✗ ne prouve rien
```
→ Le nouveau pod (`foo-new-def-uvw`) peut être en CrashLoopBackOff au moment même de cette vérification.

**Validation correcte** :
```bash
# Sélection par label (suit le ReplicaSet courant)
kubectl get pods -n <ns> -l app=<deployment> -o wide

# Attendre ≥30s sans nouveau restart
for i in $(seq 1 6); do
  kubectl get pods -n <ns> -l app=<deployment> -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}'
  sleep 5
done

# Lire les logs du nouveau pod (pas l'ancien)
kubectl logs -n <ns> -l app=<deployment> --tail=50
```

**Pour Charlotte** : `apply_gitops_fix` appelle `verify_pod_healthy` en interne. Pour les restarts seuls (sans modification de manifest), utiliser `verify_pod_healthy(deployment, namespace, stable_seconds=30)` directement — il sélectionne par label `app=<deployment>` et remonte les logs des pods défaillants.

**Note label Charlotte elle-même** : le label `app=agent-charlotte` ne sélectionne aucun pod (`kubectl get pods -n agent-system -l app=agent-charlotte` → `No resources found`). Pour trouver le pod Charlotte : `kubectl get pods -n agent-system | grep charlotte`.

---

### 19. Charlotte — mots-clés SRE dans les salutations + contexte Code Interpreter OWU

**Symptôme** : "bonjour charlotte" déclenche le loop ReAct complet (8 tours, `list_cluster_state`, etc.) au lieu d'une réponse amicale directe.

**Cause 1 — noms d'agents dans `_SRE_KW`**
Les noms comme `"charlotte"`, `"leon"`, `"nox"`, etc. figuraient dans le set de mots-clés SRE. "bonjour charlotte" → `_is_conversational = False` → loop complet.

**Cause 2 — Open WebUI ajoute du contexte après le message utilisateur**
OWU injecte un bloc système après le message réel :
```
bonjour charlotte
#### Code Interpreter
You have access to python3...
```
`message.lower()` portait sur l'intégralité du texte — des mots comme `"check"`, `"deploy"`, `"scan"` dans ce contexte OWU pouvaient fausser la détection même pour un simple "bonjour".

**Fix** :
```python
# FAUX
_msg_lower = message.lower()
_is_conversational = not any(kw in _msg_lower for kw in _SRE_KW)

# CORRECT — première ligne seulement + noms d'agents hors du set
_msg_lower = message.split('\n')[0][:200].lower()
_is_conversational = not any(kw in _msg_lower for kw in _SRE_KW)
# Et dans _SRE_KW : PAS de "charlotte", "leon", "aria", "nox", "vera", "domi", "neo"
```

**Règle générale** : ne jamais inclure de noms propres ou prénoms dans un set de mots-clés technique. Toujours tronquer l'entrée utilisateur à la première ligne quand OWU est impliqué.

---

### 20. Charlotte — system prompt SRE dans le chemin conversationnel

**Symptôme** : la détection `_is_conversational` fonctionne (steps=0) mais Mistral répond quand même "Je vais vérifier l'état du cluster NeoKube" à "bonjour".

**Cause** : le chemin conversationnel passait la liste complète `messages` (incluant le system prompt SRE de 4000+ tokens) à `_llm_call`. Mistral, se croyant agent SRE, répondait en mode SRE même sans outils.

**Fix** : remplacer le system message par un prompt léger pour le chemin conversationnel uniquement :
```python
# FAUX
_conv_resp = await _llm_call(messages, ...)  # messages contient le system prompt SRE

# CORRECT
_conv_messages = [
    {"role": "system", "content": (
        "Tu es Charlotte, assistante IA de l'équipe NeoKube. "
        "Réponds de façon amicale, concise et naturelle. "
        "Si l'utilisateur mentionne un incident ou un problème cluster, dis-lui de préciser."
    )},
] + [m for m in messages if m.get("role") != "system"]
_conv_resp = await _llm_call(_conv_messages, temperature=0.5, max_tokens=256, ...)
```

**Règle** : le system prompt d'un agent SRE/outil ne doit jamais être utilisé pour des réponses conversationnelles libres — le modèle en absorbe le contexte et tente d'agir en conséquence même sans tools.

---

### 21. Loop ReAct déclenché par des messages conversationnels — règle globale agents

**Symptôme** : un simple "bonjour" ou "merci" à Leon ou Neo prend 6–12 secondes car le loop ReAct complet se déclenche (outils, itérations, system prompt lourd).

**Cause** : absence de détection conversationnelle avant le loop. Tout message entrant → `run_agent()` → loop N itérations avec le system prompt complet + liste d'outils.

**Cause secondaire** : la détection existante (Neo) portait sur l'ensemble de l'historique de conversation (`" ".join(all user messages)`) — des mots-clés d'échanges antérieurs polluaient la détection du message courant.

**Fix obligatoire pour tout agent OWU-facing** :

```python
# 1. Set de mots-clés métier propres à l'agent
_AGENT_KW = {"zoho", "github", "projet", "deploy", "brief", ...}

# 2. Ne tester que la première ligne du DERNIER message utilisateur
last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
user_text = last_user.split('\n')[0][:200].lower()  # première ligne, tronquée
needs_tools = any(kw in user_text for kw in _AGENT_KW)

# 3. Fast-path si pas de mot-clé — LLM léger sans outils, system prompt minimal
if not needs_tools:
    conv_messages = [
        {"role": "system", "content": "Tu es [Agent], réponds brièvement et amicalement."},
    ] + [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
    # appel LLM direct sans tools, max_tokens=256
    # retourner immédiatement (streaming ou non)
```

**État d'application** :
| Agent | Statut | PR/Commit |
|---|---|---|
| Charlotte | ✅ antipatterns #19–20 | historique |
| Leon | ✅ 2026-05-08 | `6a3ea09` |
| Neo | ✅ 2026-05-08 | `(ce commit)` |
| admin-sys | N/A — exécuteur K8s, pas conversationnel | — |

**Checklist nouvel agent OWU-facing** : avant de brancher un agent sur OWU, implémenter ce pattern. Ajouter à l'étape 6 de la checklist agent (`CLAUDE-agents.md`).

**Règle** : ne jamais passer la liste de mots-clés sur l'historique complet — toujours sur la première ligne du dernier message uniquement.

---

### 22. `kubectl replace` supprime les clés ConfigMap non listées

**Symptôme :** Charlotte en CrashLoopBackOff avec `ModuleNotFoundError: httpx` après un `kubectl replace` du ConfigMap `sre-script`.

**Cause :** `kubectl replace -f cm.yaml` remplace le ConfigMap **en entier** par le contenu du fichier. Si le fichier ne contient que `sre_agent.py` et pas `requirements.txt`, la clé `requirements.txt` est supprimée du ConfigMap. L'init container `install-deps` cherche `/scripts/requirements.txt` → not found → `pip install` échoue → `httpx` absent → crash.

**Anti-pattern :**
```python
# ❌ FAUX : génère un CM avec seulement sre_agent.py
cm = {"data": {"sre_agent.py": script}}
kubectl replace -f cm.yaml  # → requirements.txt disparaît
```

**Fix :**
```python
# ✅ CORRECT : inclure TOUTES les clés du ConfigMap
cm = {"data": {
    "requirements.txt": "httpx>=0.27\nfastapi>=0.111\nuvicorn>=0.30\ntemporalio>=1.7\npyyaml>=6.0\n",
    "sre_agent.py": script,
}}
```

**Règle** : avant tout `kubectl replace` d'un ConfigMap, lire la liste des clés actuelles (`kubectl get configmap <name> -o jsonpath='{.data}' | python3 -c "import json,sys; print(list(json.load(sys.stdin).keys()))"`) et s'assurer que toutes sont présentes dans le fichier de remplacement. `kubectl apply` (quand possible) ne souffre pas de ce problème car il fait un merge, mais pour les ConfigMaps > 262 KB, seul `kubectl replace` est utilisable.

---

---

### 23. Outil ad-hoc par situation — Charlotte doit raisonner depuis des primitives génériques

**Symptôme :** Un outil `maintenance_pod` est créé spécifiquement pour nettoyer un PVC zero-cache. Demain il faudra `redis_flush_tool`, `qdrant_compact_tool`, etc.

**Cause :** On programme chaque cas de maintenance au lieu de donner à Charlotte les primitives génériques nécessaires pour raisonner elle-même.

**Anti-pattern :**
```python
# ❌ FAUX : outil spécifique qui encapsule un pattern
maintenance_pod(pvc_name="surfsense-zero-cache-pvc", command="rm -f /data/zero.db")
# → Demain : redis_flush_pod(), qdrant_vacuum_pod(), postgres_vacuum_pod()...
```

**Fix :** primitives génériques `kubectl_apply` + `run_kubectl delete` :
```python
# ✅ CORRECT : Charlotte génère le manifest, applique, attend, lit les logs, nettoie
kubectl_apply(manifest="""
apiVersion: v1
kind: Pod
metadata:
  name: zero-cache-maintenance
  namespace: surfsense
spec:
  restartPolicy: Never
  nodeSelector:
    kubernetes.io/hostname: kubinote
  containers:
  - name: maintenance
    image: busybox:1.36
    command: ["/bin/sh", "-c", "rm -f /data/zero.db /data/zero.db-wal && echo DONE"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: surfsense-zero-cache-pvc
""")
# Puis : run_kubectl(["get","pod","zero-cache-maintenance","-n","surfsense"]) → attendre Succeeded
# Puis : run_kubectl(["logs","zero-cache-maintenance","-n","surfsense"])
# Puis : run_kubectl(["delete","pod","zero-cache-maintenance","-n","surfsense"])
```

**Règle :** Ne jamais ajouter un outil Charlotte pour chaque nouveau type d'incident. Si Charlotte manque d'un outil, se demander : quelle **primitive générique** lui permettrait de raisonner seule ? Candidates : `kubectl_apply`, `kubectl delete` (déjà autorisé), `read_file`, `write_file`. La **connaissance** (pattern de fix) va dans le system prompt ou la RAG — pas dans le code.

---

### 24. Contexte ReAct trop volumineux → LLM timeout → Charlotte sans réponse

**Symptôme :** Charlotte appelle 5+ outils en tour 1, dont des sorties kubectl volumineuses (logs 50KB). Après le tour 2, le LLM ne répond plus. L'utilisateur attend indéfiniment, aucune réponse n'arrive dans OWU.

**Cause :** `tool_result[:8000]` × 5 outils = 40KB de contexte ajouté au tour 1. Avec le system prompt (~6KB) + historique, le contexte total dépasse 60KB. L'appel LLM au tour 3 timeout (>60s pour Mistral) → `_llm_call` retourne `""` → `break` sans `final`. La synthesis fallback timeout aussi → `final = "Je n'ai pas pu..."`. Mais si le stream SSE OWU a aussi expiré, même ce message est perdu.

**Anti-pattern :**
```python
# ❌ FAUX : 8000 chars par outil, 5 outils = 40KB contexte
loop_messages.append({"role": "tool", "content": tool_result[:8000]})
```

**Fix :**
```python
# ✅ CORRECT : 2500 chars max par outil + note de troncature
_ctx = tool_result[:2500]
if len(tool_result) > 2500:
    _ctx += f"\n[...tronqué à 2500/{len(tool_result)} chars]"
loop_messages.append({"role": "tool", "content": _ctx})
```

**Règle :** Le contexte du ReAct loop est cumulatif (N tours × M outils × chars). Toujours limiter l'injection de résultats d'outils à 2500 chars. Si Charlotte a besoin de plus de détails, elle peut rappeler `run_kubectl logs` avec `--tail=20` ciblé plutôt que d'injecter 50KB en une fois.

---

### 25. Nom de pod périmé dans `kubectl logs` — extrait de events/describe au lieu de `get pods`

**Symptôme :** `Error from server (NotFound): pods "surfsense-zero-cache-56c47fbb4-vzrj5" not found` — Charlotte avait pourtant le bon pod `5f65b49769-bcm8q` dans les résultats du tour précédent.

**Cause :** Charlotte appelle `kubectl get events -n surfsense` ou `kubectl describe deployment surfsense-zero-cache`. Ces sorties contiennent des noms de **vieux pods** (anciens ReplicaSets dans les Events, `OldReplicaSets` dans describe). Le LLM "lit" ces noms dans le contexte et les utilise pour l'appel logs suivant, ignorant le nom actuel obtenu par `kubectl get pods -l app=...`.

**Anti-pattern :**
```bash
# ❌ FAUX : nom extrait des events (vieux ReplicaSet)
kubectl logs surfsense-zero-cache-56c47fbb4-vzrj5  # → NotFound
```

**Fix runtime (guard dans `run_kubectl`) :**
```python
# Avant d'exécuter kubectl logs <pod>, vérifier l'existence du pod
if args[0] == "logs" and pod_name:
    check = _kubectl("get", "pod", pod_name, "-n", ns, "--no-headers", timeout=5)
    if "not found" in check.lower() or not check.strip():
        return f"[ERREUR] Pod '{pod_name}' introuvable. Utilise kubectl get pods -l app=<name> -n <ns> d'abord."
```

**Règle :** Le nom de pod pour `kubectl logs` doit TOUJOURS venir d'un `kubectl get pods -l app=<name> -n <ns>` exécuté dans le **même tour** (ou le tour immédiatement précédent). Jamais d'un `describe`, `events`, ou d'un appel antérieur. Le guard runtime intercepte les cas où le LLM se trompe de source.

---

### 26. Protection Charlotte auto-restart : tool interactif protégé, scan automatique non protégé

**Symptôme :** Charlotte se redémarre lors d'un health check cluster, coupant la session SSE et le Temporal worker. Le bug avait déjà été "corrigé" mais la protection n'était au bon endroit.

**Cause :** La protection `if name in ("agent-charlotte", "charlotte") and ns == "agent-system": return "⛔ INTERDIT..."` était uniquement dans le tool interactif `restart_deployment` (appelé depuis le ReAct loop). La fonction automatique `sre_auto_restart_agents` (appelée toutes les 5min par `SREScanWorkflow`) n'avait **aucune** exclusion. Si Charlotte détectait ses propres restarts élevés dans `pod_issues`, elle exécutait `kubectl rollout restart deployment/agent-charlotte` en mode automatique.

**Anti-pattern :**
```python
# ❌ FAUX : protection uniquement dans le tool interactif
@app.post("/mission")
async def mission(...):
    if tool_name == "restart_deployment":
        if name == "agent-charlotte":
            return "⛔ INTERDIT"   # ← seulement ici
        _kubectl("rollout", "restart", ...)

# Pendant ce temps, le scan auto fait :
@activity.defn("sre_auto_restart_agents")
async def sre_auto_restart_agents(pod_issues):
    _kubectl("rollout", "restart", f"deployment/{deployment}", ...)  # ← pas de protection !
```

**Fix :**
```python
# ✅ CORRECT : protection dans la fonction de scan automatique également
if deployment == "agent-charlotte" and ns == "agent-system":
    actions.append({"action": "SKIP", "reason": "INTERDIT — auto-restart Charlotte bloqué"})
    log.warning("AUTO-RESTART BLOQUÉ : tentative de restart agent-charlotte annulée")
    continue
```

**Règle :** Toute règle de sécurité sur Charlotte doit être implémentée **à tous les points d'entrée** : tool interactif (mission) ET activités Temporal automatiques (SREScanWorkflow). Une protection "en surface" (tool UI) ne protège pas contre les chemins automatiques. Checklist de vérification : `grep -n "rollout restart\|rollout.*restart" sre_agent.py` → chaque occurrence doit avoir la vérification charlotte.

---

### 27. Charlotte reporte des Events périmés comme problèmes actuels (pods morts)

**Symptôme :** Charlotte rapporte `surfsense-zero-cache-5f65b49769-bcm8q` en "CrashLoopBackOff Critique" et `agent-charlotte-78ddd97967-9grx4` avec "readiness probe échoue" — alors que ces deux pods n'existent plus (`NotFound`) et que l'état réel du cluster est sain.

**Cause :** Les Events Kubernetes persistent jusqu'à **1 heure après la mort d'un pod**. Charlotte exécute :
```
ÉTAPE 1 : list_cluster_state()     ← lit l'état LIVE (correct)
ÉTAPE 2 : kubectl get events       ← lit tous les events, y compris des pods morts
ÉTAPE 3 : synthèse                 ← croise les Events avec... rien. Pas de croisement.
```
Charlotte voit un Event "BackOff" pour un pod mort il y a 52 min et le classe "Critique" sans vérifier si ce pod existe toujours dans la liste ÉTAPE 1.

**Conséquence :** 2 faux positifs critiques dans un rapport sur 6 items = taux d'hallucination 33%. L'utilisateur ne peut pas distinguer les vraies alertes des fantômes.

**Cas réel (2026-05-12) :**
- `surfsense-zero-cache-5f65b49769-bcm8q` → pod mort (fix zero.db effectué 50 min avant l'audit). Nouveau pod `996db44c6-lsd7k` Running 1/1. Charlotte reporte l'ancien comme "Critique".
- `agent-charlotte-78ddd97967-9grx4` → ancien pod Charlotte, remplacé par `67df57cb9c-qqnvm` (3/3 Running). Charlotte le reporte comme "Critique readiness échoue".

**Problème jumeau — scan automatique ne détecte pas les pods NotReady :**
`sre_scan_pod_health` utilisait `custom-columns` avec `containerStatuses[0].state.waiting.reason`. Un pod Running mais non-Ready (readiness probe failing) n'a pas de `waiting.reason` — il passe complètement à travers le scan. `open-webui` (0/1 Ready, 3 restarts) n'était jamais notifié via ntfy.

**Fix appliqué :**

1. **System prompt — règle ÉTAPE 2b (croisement obligatoire) :**
```
→ ÉTAPE 2b — FILTRE ANTI-PODS-MORTS OBLIGATOIRE :
   Pour chaque pod mentionné dans un Event, croiser avec la liste ÉTAPE 1 :
   • Pod ABSENT de la liste → event périmé → NE PAS reporter → ignorer
   • Pod PRÉSENT mais Running/Ready → event résolu → severity=info seulement
   • Pod PRÉSENT et toujours NotReady/CrashLoop → problème actif → reporter
```

2. **`sre_scan_pod_health` — refactorisé vers JSON (détecte les pods NotReady) :**
```python
# ✅ NOUVEAU : détecte Running mais non-Ready (grace 5 min démarrage)
elif phase == "Running" and ready_c < total_c and age_min > 5:
    issues.append({"namespace": ns, "pod": name,
                   "phase": phase,
                   "reason": f"NotReady({ready_c}/{total_c})",
                   "restarts": restarts})
```

**Règle :** Charlotte a deux sources d'état cluster : `list_cluster_state` (LIVE) et `kubectl get events` (passé). L'état LIVE est la vérité. Les Events sont des indices contextuels — jamais une preuve d'état courant. Toujours croiser avant de reporter.

**Checklist de vérification :** Avant de reporter un problème issu d'un Event : (1) extraire le nom du pod, (2) vérifier sa présence dans la liste ÉTAPE 1, (3) si absent → ignorer, (4) si présent → vérifier son état courant.

---

### 28. Réponse finale en un seul chunk SSE (faux streaming)

**Symptôme :** L'utilisateur attend en silence pendant 15–30s que l'agent travaille, puis reçoit toute la réponse d'un coup. Même si le header SSE est correct, l'expérience est identique à une réponse HTTP bloquante.

**Cause :** Le pattern `_build_sse` (Leon) ou `_stream_reply` (Neo avant fix) wrappent la réponse complète dans un seul chunk `delta.content` :
```python
# ❌ FAUX STREAMING — toute la réponse dans un seul chunk
chunk = {"choices": [{"delta": {"content": full_reply}, "finish_reason": None}]}
yield f"data: {json.dumps(chunk)}\n\n"
yield "data: [DONE]\n\n"
```
OWU reçoit un seul événement SSE contenant 500 mots → affiche tout d'un coup → indiscernable d'une réponse bloquante.

**Fix — deux patterns selon l'architecture :**

**Pattern A (Pipe SSE — Charlotte)** : `_llm_call_stream` — async generator qui consomme LiteLLM `stream=True` et émet chaque token via `_emit(session_id, {type: "token", text: chunk})`.

**Pattern B (OpenAI-compat — Neo, Leon)** :
- Fast-path : `c.stream("POST", ..., json={"stream": True})` → forward direct des chunks LiteLLM
- Agent path (réponse déjà assemblée) : word-by-word avec `await asyncio.sleep(0)` entre chaque mot

```python
# ✅ CORRECT — mot par mot pour les réponses déjà assemblées
async def _stream_reply_words(reply: str):
    for i, word in enumerate(reply.split(" ")):
        text = word + (" " if i < len(reply.split(" ")) - 1 else "")
        yield f"data: {json.dumps({..., 'choices': [{'delta': {'content': text}}]})}\n\n"
        await asyncio.sleep(0)
    yield f"data: {json.dumps({..., 'choices': [{'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
    yield "data: [DONE]\n\n"
```

**Règle** : tout agent OWU-facing DOIT implémenter le streaming token/mot-par-mot. La checklist d'intégration (étape 6d) documente les deux patterns. Tester en ouvrant les DevTools réseau OWU : les chunks SSE doivent arriver progressivement, pas en un seul événement groupé.

**Règle jumelle — ntfy (étape 6e)** : tout agent avec outils DOIT envoyer une notification ntfy `priority=low` quand la mission est terminée. Sans ça, l'utilisateur doit garder l'onglet OWU actif pour savoir quand l'agent a fini.

---

### 29. `{placeholder}` dans un f-string system prompt → NameError

Un system prompt Python f-string (`system = f"""..."""`) peut contenir des placeholders destinés au LLM (ex: `{agent}`, `{nom}`) qui ne sont PAS des variables Python. Python les évalue comme expressions → `NameError: name 'agent' is not defined` à chaque appel.

**Symptôme** : Charlotte retourne `⚠️ name 'agent' is not defined` dans OWU après le message "📂 Historique de session chargé". L'erreur est catchée dans `_runner()` et émise comme événement SSE `{"type": "error"}`.

```python
# ❌ FAUX — {agent} évalué comme variable Python
system = f"""
PROTOCOLE :
1. read_file('apps/agent-system/base/configmap-{agent}-script.yaml')
4. restart_deployment(name='{agent}', namespace='agent-system')
"""
# → NameError: name 'agent' is not defined

# ✅ CORRECT — {{agent}} = accolade littérale dans f-string
system = f"""
PROTOCOLE :
1. read_file('apps/agent-system/base/configmap-{{agent}}-script.yaml')
4. restart_deployment(name='{{agent}}', namespace='agent-system')
"""
# → affiche correctement {agent} au LLM
```

**Règle** : dans toute f-string système, chaque `{placeholder_littéral}` doit être `{{placeholder_littéral}}`. Seules les variables Python réelles (`{session_id}`, `{interface}`, `{datetime.now()...}`) restent sans double accolade.

**Fix appliqué** : commit `bb9c154` — 4 occurrences `{agent}` → `{{agent}}` dans `configmap-sre-script.yaml`.

---

### 30. `project_health_check` retourne les métadonnées Penpot mais pas le `project_id`

`_check_penpot()` dans Charlotte récupère le projet Penpot par fuzzy match sur le nom, calcule son UUID (`pid = pp.get("id", "")`), mais retournait uniquement `{ok, name, url}` — sans `project_id`. Résultat : Rule 13 demandait à Charlotte de passer l'UUID à `dispatch_design_deploy`, mais cette valeur était introuvable dans le résultat de `project_health_check`.

**Symptôme** : Charlotte trouve le projet Penpot par nom mais ne peut pas déclencher le pipeline — elle finit par demander à l'utilisateur de saisir manuellement l'UUID, ou pire, invente une valeur.

```python
# ❌ FAUX — project_id jamais retourné
return {"ok": True, "name": pp["name"],
        "url": f"http://penpot.neokube.local/..."}

# ✅ CORRECT — project_id inclus
return {"ok": True, "name": pp["name"], "project_id": pid,
        "url": f"http://penpot.neokube.local/..."}
```

**Règle générale** : toute fonction `_check_<service>()` dans `project_health_check` doit retourner **tous les identifiants** nécessaires aux outils aval (IDs, slugs, noms exacts) — pas seulement les champs d'affichage.

**Séquence correcte Rule 13** (Charlotte → pipeline Penpot→Vercel) :
1. `project_health_check(project_name="<nom>")` → lit `penpot.project_id`
2. `ask_clarification` — confirmation utilisateur avec nom + ID trouvés
3. `dispatch_design_deploy(penpot_project_id="<uuid>")` — seulement après confirmation

**Fix appliqué** : commit `cc35d37`.
