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
**Récidive Rule 13** (commit `484fd92`) : `{penpot.name}`, `{penpot.project_id}` (×2), `{id[:8]}` dans la séquence d'ask_clarification de Rule 13 → même NameError. Symptôme identique : `⚠️ name 'penpot' is not defined` dans OWU.

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

---

### 31. `raise` à l'intérieur d'un `async with ClientSession()` MCP → ExceptionGroup non catchable

**Contexte** : agents Aria, Nox (et tout agent Python utilisant `mcp>=1.0.0` avec `streamablehttp_client` ou `sse_client`).

**Symptôme** : l'activité Temporal lève une `ExceptionGroup` au lieu d'une `RuntimeError` — le `except RuntimeError as e` dans l'appelant ne catch pas, l'activité échoue complètement au lieu d'être gérée proprement.

**Cause** : `ClientSession` et `streamablehttp_client` utilisent des anyio `TaskGroup` en interne. Tout `raise` à l'intérieur de ces context managers est wrappé en `ExceptionGroup` lors du `__aexit__`.

```python
# ❌ FAUX — raise inside TaskGroup → ExceptionGroup
async with streamablehttp_client(URL) as (r, w, _):
    async with ClientSession(r, w) as session:
        result = await session.call_tool(tool, args)
        if result.isError:
            raise RuntimeError(f"MCP {tool}: {result.content}")  # wrappé en ExceptionGroup
        return json.loads(result.content[0].text)

# ✅ CORRECT — stocker l'erreur, raise APRÈS la sortie des context managers
async def _mcp_call(tool, args):
    _err = None
    _text = None
    async with streamablehttp_client(URL) as (r, w, _):
        async with ClientSession(r, w) as session:
            _res = await session.call_tool(tool, args)
            if _res.isError:
                _err = str(_res.content)
            else:
                _text = _res.content[0].text if _res.content else "{}"
    if _err:
        raise RuntimeError(f"MCP {tool}: {_err}")   # raise propre, hors TaskGroup
    return json.loads(_text)
```

**Règle** : dans tout helper MCP (`_mcp_github`, `_mcp_neon`, `_mcp_k8s_call`, etc.), ne **jamais** `raise` à l'intérieur d'un `async with ClientSession()`. Stocker dans `_err`, lever après. Même règle pour les `return` de données — stocker dans `_text`/`_data`, retourner après.

**Fix appliqué** : commit `1cd9bdd`.

---

### 32. `_llm_call` silencieux sur quota épuisé → session perdue, ntfy JSON brut

**Contexte** : Charlotte (et tout agent utilisant `_llm_call` via LiteLLM). Quand les crédits Anthropic s'épuisent, LiteLLM retourne HTTP 402 avec un body JSON d'erreur.

**Symptôme** :
- Charlotte répond `"Je n'ai pas pu traiter cette demande (session: ow-xxxxx)"` sans aucune indication de cause
- L'utilisateur ne sait pas s'il faut recharger les crédits, redémarrer Charlotte, ou investiguer un bug
- La notification ntfy de fin-de-mission peut contenir le raw JSON de la réponse d'erreur (`{"type":"error","error":{...}}`) si `final` n'est pas filtré

**Cause** :
1. `_llm_call` retournait `""` sur `HTTP != 200` sans distinguer 402 (quota) d'une vraie erreur
2. `LLM_FALLBACK` était défini dans le deployment K8s mais jamais lu dans le code Python
3. `_llm_call_stream` n'avait pas de paramètre `model` → fast-path conversationnel ("bonjour") utilisait `claude-sonnet` au lieu d'un modèle moins cher

```python
# ❌ FAUX — silencieux, pas de fallback, pas d'alerte
if r.status_code != 200:
    log.warning("LLM call HTTP %s: %s", r.status_code, r.text[:300])
    return ""

# ✅ CORRECT — détection quota + fallback + ntfy
if r.status_code != 200:
    _is_quota = (r.status_code == 402 or
                 any(kw in r.text.lower() for kw in ("credit", "insufficient", "quota", "billing")))
    if _is_quota and LLM_FALLBACK and _model != LLM_FALLBACK:
        if time.time() - _quota_alert_ts > 3600:   # ntfy rate-limitée 1/h
            asyncio.ensure_future(_ntfy_notify(
                "⚠️ Anthropic — crédits épuisés",
                f"Quota {_model} épuisé. Charlotte bascule sur {LLM_FALLBACK}.\n"
                "Recharger : https://console.anthropic.com/settings/billing",
                priority="high", tags=["warning", "charlotte", "anthropic", "quota"],
            ))
        r = await _do_llm_post(LLM_FALLBACK)   # retry avec fallback
```

**Règles** :
- `LLM_FALLBACK` doit être lu depuis l'env ET effectivement utilisé dans `_llm_call` et `_llm_call_stream`
- Ntfy quota : rate-limitée à 1 alerte/heure maximum (`_quota_alert_ts` global)
- La ntfy mission-end doit filtrer `final` commençant par `{` (corps d'erreur JSON brut)
- Le message d'erreur générique doit mentionner explicitement le lien billing

**Split coût associé** : `LLM_CONV_MODEL` (env var, défaut `mistral-large-2407`) pour classify + fast-path conversationnel. Seules les vraies missions SRE (tool calls ReAct) utilisent `LLM_MODEL` (claude-sonnet). Voir R9 dans CLAUDE-agents.md.

**Fix appliqué** : commit `3bee404`.

---

### 33. Charlotte se modifie elle-même → boucle infinie de tentatives bloquées

**Contexte** : Charlotte agent SRE, `write_file` et `apply_gitops_fix` dans `sre_agent.py`.

**Symptôme** : Charlotte reçoit une mission impliquant de modifier ses propres fichiers (ex : améliorer Neo → découvre qu'elle veut aussi patcher `configmap-sre-script.yaml`). Elle appelle `write_file` → bloqué. Appelle `apply_gitops_fix` → bloqué. Re-lit les fichiers → répète. 8 tours complets consommés pour rien, session close sans résultat.

**Cause** : Aucune détection de la tentative d'auto-modification — les outils retournaient une erreur mais le LLM relançait quand même car le system prompt ne précisait pas la règle d'arrêt.

**Fix — deux niveaux** :
1. **Runtime** : `_is_charlotte_file(path)` vérifie `"charlotte" in path` / `"sre-script" in path` / `basename in frozenset` → retourne immédiatement `❌ AUTO-MODIFICATION BLOQUÉE` + ntfy
2. **Prompt** : `RÈGLE AUTO-MODIFICATION — ABSOLUE` : 1 seul `ask_clarification` puis stop. `RÈGLE ANTI-BOUCLE` : au tour 4 sans écriture → ntfy + break.

```python
def _is_charlotte_file(path: str) -> bool:
    fname = path.split("/")[-1]
    return (
        "charlotte" in path.lower()
        or "sre-script" in path
        or fname in _CHARLOTTE_OWN_FILES  # {"serviceaccount-sre.yaml", "sre_agent.py"}
    )
```

**Comportement attendu** : Charlotte appelle `ask_clarification` avec le contenu exact du changement à appliquer, puis stop. L'humain applique via GitOps.

---

### 34. `_CHARLOTTE_OWN_FILES` frozenset trop large bloque les écrits légitimes sur d'autres agents

**Contexte** : Charlotte tente d'appliquer un fix sur `configmap-neo-script.yaml` (fichier Neo, pas Charlotte).

**Symptôme** : `write_file(path="apps/agent-system/base/configmap-neo-script.yaml")` → bloqué avec `❌ AUTO-MODIFICATION`. Charlotte ne peut pas corriger les fichiers des autres agents.

**Cause** : L'ancien frozenset listait 7 fichiers par nom :
```python
_CHARLOTTE_OWN_FILES = frozenset({
    "configmap-sre-script.yaml",      # ← match par nom exact OK
    "configmap-charlotte-config.yaml", # ← redondant : "charlotte" déjà dans path
    "deployment-charlotte.yaml",        # ← idem
    "serviceaccount-sre.yaml",
    "service-charlotte.yaml",           # ← idem
    "pvc-charlotte-state.yaml",         # ← idem
    "sre_agent.py",
})
```
La condition `_fname in _CHARLOTTE_OWN_FILES` sur le nom seul (sans le path) pouvait en théorie matcher des fichiers homonymes dans d'autres namespaces GitOps.

**Fix** : Réduire le frozenset à 2 entrées (les fichiers Charlotte sans "charlotte" dans le nom) + déléguer la détection au helper `_is_charlotte_file(path)` basé sur le chemin complet :

```python
_CHARLOTTE_OWN_FILES = frozenset({
    "serviceaccount-sre.yaml",  # seul fichier Charlotte sans "charlotte" dans le nom
    "sre_agent.py",
})

def _is_charlotte_file(path: str) -> bool:
    fname = path.split("/")[-1]
    return (
        "charlotte" in path.lower()   # deployment-charlotte, configmap-charlotte-config…
        or "sre-script" in path       # configmap-sre-script.yaml
        or fname in _CHARLOTTE_OWN_FILES
    )
```

**Règle** : la détection doit être basée sur le **chemin complet** (pas seulement le basename), pour éviter les faux positifs sur des fichiers homonymes dans d'autres namespaces GitOps.

---

### 35. Anti-boucle `run_kubectl` — variantes `-o` comptent comme des appels distincts

**Contexte** : boucle ReAct Charlotte, `run_kubectl` avec différents formats de sortie.

**Symptôme** : Charlotte appelle successivement :
```
run_kubectl(["get", "pod", "neo-abc", "-n", "agent-system", "-o", "yaml"])
run_kubectl(["get", "pod", "neo-abc", "-n", "agent-system", "-o", "json"])
run_kubectl(["get", "pod", "neo-abc", "-n", "agent-system", "-o", "jsonpath={.status}"])
```
Trois appels API K8s pour la même ressource — contexte augmente inutilement, tours consommés, latence.

**Cause** : L'anti-boucle ne dédupliquait que les appels **identiques** (même JSON d'args). Le flag `-o` suffix différencie les fingerprints → pas de cache.

**Fix** : `_kubectl_fingerprint(args)` normalise en ignorant `-o`/`--output`. `_kubectl_seen` dict (par session ReAct) retourne le résultat mis en cache :

```python
def _kubectl_fingerprint(args: list) -> str | None:
    verb = args[0] if args else ""
    if verb not in ("get", "describe", "logs", "top"):
        return None  # écriture = pas de cache
    clean = []
    skip_next = False
    for a in args:
        if skip_next:
            skip_next = False; continue
        if a in ("-o", "--output"):
            skip_next = True; continue
        if (a.startswith("-o") and len(a) > 2) or a.startswith("--output="):
            continue
        clean.append(a)
    return " ".join(clean)

# Dans la boucle ReAct :
if fn_name == "run_kubectl":
    _fp = _kubectl_fingerprint(fn_args.get("args", []))
    if _fp and _fp in _kubectl_seen:
        tool_result = f"[déjà exécuté — résultat mis en cache]\n{_kubectl_seen[_fp]}"
    else:
        tool_result = await _mission_execute_tool(fn_name, fn_args)
        if _fp:
            _kubectl_seen[_fp] = tool_result[:2500]
```

**Règle** : seules les lectures (get, describe, logs, top) sont dédupliquées. Les commandes d'écriture (delete, apply, patch, create) retournent `None` depuis `_kubectl_fingerprint` et ne sont jamais cachées.

---

### 36. Builder ConfigMap Python — regex sur la clé data échoue si la valeur contient le même mot

Lors du rebuild d'un ConfigMap (ex: `configmap-sre-script.yaml`), extraire une clé existante avec `re.search(r'  requirements\.txt: \|-\n((?:    .*\n)*)', existing)` échoue si le script Python contient lui-même une référence à `requirements.txt` (ex: dans une f-string ou une commande shell). La regex trouve la première occurrence dans le code Python, pas la clé `data`.

**Symptôme** : `ERROR: Could not open requirements file: /scripts/requirements.txt` au démarrage du pod → `ModuleNotFoundError` sur les dépendances.

**Règle** : Ne jamais extraire les clés secondaires d'un ConfigMap existant par regex. À la place, inclure les clés statiques (comme `requirements.txt`) directement et en dur dans le writer Python, à la fin du ConfigMap :

```python
cm_content = f"""apiVersion: v1
kind: ConfigMap
metadata:
  name: sre-script
  namespace: agent-system
data:
  sre_agent.py: |-
{script_indented}
  requirements.txt: |
    httpx>=0.27
    fastapi>=0.111
    uvicorn>=0.30
    temporalio>=1.7
    pyyaml>=6.0
    mcp>=1.0.0
"""
```

**Note** : `requirements.txt` utilise `|` (newline final) et non `|-` (pas de newline) — les deux marchent pour pip, mais `|` est plus clair.

---

### 37. Classificateur binaire sre/conv route les questions explicatives vers le ReAct loop

Le classificateur 2-classes (`sre` | `conv`) avec biais "en cas de doute → sre" envoyait toute question mentionnant l'infra (ntfy, LLM, agents, quota) vers le path SRE — même si la question demande une **explication** et non une vérification d'état. Avec `tool_choice="required"` au tour 0, Charlotte devait obligatoirement appeler un outil, lançait 4+ tours de kubectl/logs inutiles, et déclenchait l'anti-boucle.

**Exemple** : `"pourquoi on reçoit un message de quota gemini sur ntfy alors qu'on n'utilise pas gemini ?"` → Charlotte sait la réponse depuis son system prompt (Gemini = fallback Dispatcher/Domi), mais le classificateur l'envoyait investiguer kubectl.

**Fix** : Classificateur 3-classes :
- `sre` = vérification d'état ACTUEL (pods running, config live, crash, backup, etc.)
- `explain` = question sur le fonctionnement/architecture, même si sujet = infra — Charlotte répond depuis sa connaissance, system SRE complet, sans outil
- `conv` = salutations, hors-infra

**Règle** : en cas de doute entre `sre` et `explain`, préférer `explain`. Le path `explain` utilise le system SRE complet (Charlotte a toute l'architecture) mais aucun outil et `LLM_CONV_MODEL`.

```python
# Dans le prompt classificateur :
"En cas de doute entre sre et explain, préfère 'explain'."
# Biais inversé par rapport au classificateur 2-classes
```

### 38. Troncature brute du contexte ReAct — perte d'informations critiques en fin de sortie

Tronquer `tool_result[:2500]` coupe arbitrairement — les erreurs importantes peuvent être en fin de sortie (ex : `Events:` dans `kubectl describe` est toujours en bas).

**Fix** : compression sémantique via Mistral (`LLM_SCAN_MODEL`) pour les outils volumineux (`run_kubectl`, `read_file`) quand `len(tool_result) > 1500`.

```python
async def _compress_tool_result(tool_name: str, tool_result: str, user_query: str) -> str:
    if tool_name not in {"run_kubectl", "read_file"} or len(tool_result) <= 1500:
        return tool_result
    # Appel Mistral : extrait anomalies uniquement (< 400 chars)
    compressed = await _llm_call(compress_msgs, max_tokens=120, model=LLM_SCAN_MODEL)
    if compressed and len(compressed) < len(tool_result):
        return f"[résumé Mistral]\n{compressed}"
    return tool_result[:2500] + "..."  # fallback
```

Applicable à tout agent ReAct avec des outils qui retournent de grands volumes de texte.

---

### 39. `run_stream()+stream_text(delta=True)` laisse fuiter les tokens tool-call JSON avec mistral

`stream_text(delta=True)` sur PydanticAI + mistral via LiteLLM renvoie les invocations d'outils comme texte brut (ex : `list_cluster_state ব্যক{}`). L'utilisateur voit les fragments JSON d'appel d'outil au lieu de la réponse finale.

**Fix** : utiliser `charlotte_agent.run()` dans `/mission/stream` + émettre le texte final mot-par-mot.
Les events `tool/step` arrivent quand même via `_tool_emit → queue` pendant `run()`.

```python
# FAUX — fuite tokens tool-call avec mistral
async for chunk in await charlotte_agent.run_stream(message, ...):
    async for text in chunk.stream_text(delta=True):
        await q.put({"type": "token", "text": text})

# CORRECT — run() bloquant + émission mot-par-mot
agent_result = await charlotte_agent.run(effective_message, ...)
final = str(agent_result.output)
words = final.split(" ")
for i, w in enumerate(words):
    await q.put({"type": "token", "text": w + (" " if i < len(words) - 1 else "")})
```

S'applique à tout agent PydanticAI + mistral via LiteLLM. Claude (Anthropic direct) n'a pas ce problème.

---

### 40. String matching pour détecter l'intent — fragile face aux variantes linguistiques

Hardcoder `"accès"`, `"as-tu"`, etc. échoue sur `"acces"` (sans accent), `"as tu"` (sans tiret), autres langues. Des listes de mots-clés ou `unicodedata.normalize` ne couvrent jamais toutes les variantes.

**Fix** : utiliser le LLM comme interprétateur d'intent. Un appel `LLM_SCAN_MODEL` (mistral, max 10 tokens, ~500ms) retourne un label sémantique stable.

```python
_INTENT_LABELS = ("greeting", "access_zoho", "access_cluster", "question", "task")

async def _classify_message(msg: str) -> str:
    resp = await _llm_call(
        [
            {"role": "system", "content": (
                "You are an intent classifier. Reply with EXACTLY one label:\n"
                "- greeting      : simple greeting or farewell, no technical content\n"
                "- access_zoho   : asking whether the agent has access to / can connect to Zoho\n"
                "- access_cluster: asking whether the agent can see K8s pods/cluster/services\n"
                "- question      : open-ended advice or explanation request — no cluster action\n"
                "- task          : specific SRE action, cluster operation, or data retrieval"
            )},
            {"role": "user", "content": msg[:300]},
        ],
        temperature=0, max_tokens=10, model=LLM_SCAN_MODEL,
    )
    label = resp.strip().lower().split()[0] if resp.strip() else "task"
    return label if label in _INTENT_LABELS else "task"
```

La table intent→comportement est extensible sans maintenance de patterns :

| Intent | Comportement | Contrainte injectée |
|---|---|---|
| `greeting` | Réponse LLM directe | 2 phrases, salutation + 1-2 questions |
| `access_zoho` | Pré-exécute `zoho_list_projects`, injecte résultat | 2 phrases MAX |
| `access_cluster` | Pré-exécute `list_cluster_state`, injecte résultat | 2 phrases MAX |
| `question` | Réponse LLM directe | 3 points MAX, pas de YAML |
| `task` | Loop ReAct complet | — |

Voir Pattern A dans CLAUDE-agents.md. S'applique à toute détection d'intent pré-agent.

---

### 41. HTTP 429 traité comme `quota_exceeded` — faux positifs ntfy sur Gemini et Mistral

`test_gemini()` et `test_mistral()` retournaient `quota_exceeded` pour tout HTTP 429. Résultat : chaque rate limit temporaire déclenchait une alerte ntfy "LLM quota épuisé" alors que le provider était simplement à sa limite de débit (per-minute ou free-tier daily).

**Règle** : HTTP 429 ≠ quota épuisé pour Gemini et Mistral.

| Provider | HTTP 429 | HTTP 402 / sans Retry-After |
|---|---|---|
| **Anthropic** | `rate_limit` | `quota_exceeded` (402 = billing) |
| **OpenAI** | `rate_limit` | `quota_exceeded` (402 = payment required) |
| **Mistral** | `rate_limit` si Retry-After ou "rate" dans message | `quota_exceeded` si "month"/"subscription" |
| **Gemini** | toujours `rate_limit` (pas d'API crédit, 429 = free-tier limit) | N/A |

**Fix** : `sre_check_llm_key_status` — `invalid_providers` = uniquement `quota_exceeded` | `error`. Les `rate_limit` ne déclenchent pas `llm-key-sync` ni ntfy.

**Bonus bug corrigé** : Anthropic HTTP 529 (overloaded) traité comme `quota_exceeded` → désormais `rate_limit`.

**Ntfy quotidien "LLM — tous opérationnels"** : envoyé chaque jour à 6h même quand tout va bien → supprimé. Seul le rapport hebdo lundi 6h + les vrais problèmes critiques restent.

---

### 42. Classificateur `task` sur les clarifications contextuelles — réponse JSON artifact

**Symptôme** : L'utilisateur dit "je parle de nos notifications internes et de quota de consommation LLM" → Charlotte classe `task` (voit "quota LLM" = action SRE) → ReAct loop → Mistral retourne `{"follow_ups": [...]}` au lieu d'une réponse naturelle.

**Double racine** :
1. Classificateur trop large — `task` capturait tous les messages mentionnant des termes techniques, même sans verbe d'action.
2. Artefact JSON — quand le ReAct loop ne sait pas quoi faire, Mistral retourne un objet JSON structuré plutôt qu'une réponse naturelle.

**Fix 1 — Classificateur** : `question` couvre maintenant les **clarifications contextuelles** (`je parle de X`, `je veux dire X`, `en ce qui concerne X`) et tout message **sans verbe d'action explicite**. `task` exige un verbe actif : restart, fix, list, check, create, apply, investigate, diagnose, show, run.

**Fix 2 — `_sanitize_final_output(text)`** : guard appliqué à `final` dans `/mission` et `/mission/stream`. Si la réponse commence par `{` ou `[` :
- `{"follow_ups": [...]}` → "Je ne suis pas sûre de ce que tu attends... Peux-tu préciser ?"
- `{"message": str}` → extrait la valeur du champ
- Autres dict → sérialise en texte lisible

**Règle** : ne jamais laisser un artefact JSON atteindre l'utilisateur. `_sanitize_final_output()` est le filet de sécurité final avant l'émission SSE.

---

### 46. `_md_to_notion_blocks` — Notion API rejette les blocs vides + n'interprète pas le markdown

**Symptôme** : `notion_update_page` et `notion_create_page` retournent HTTP 400 `validation_error` lors de l'écriture d'un ProjectSpec contenant tables, checkboxes, bold, et 50+ lignes. Les deux endpoints échouent (PATCH /blocks/{id}/children + POST /pages).

**Quatre racines combinées** :

1. **Blocs `rich_text` vides** — un heading parsé à partir de `### ` (hash + espace + rien) produit `rich_text: [{"text": {"content": ""}}]`. Notion rejette tout bloc avec `rich_text` vide ou ne contenant que des éléments à content `""`. Idem pour les paragraphes générés à partir de lignes contenant uniquement du markdown stripé.

2. **Markdown markers en littéral** — Notion **ne parse pas** le Markdown dans `rich_text.content`. Une ligne `**Objectif :** ...` envoie `**Objectif :**` en clair (les `**` apparaissent visuellement). Les liens `[texte](url)` apparaissent aussi en clair. Aucune erreur côté API, mais rendu cassé. **Risque réel** : certains caractères markdown combinés à du contenu long peuvent dépasser des limites de validation invisibles.

3. **Pas de chunking** — Notion limite `children` à **100 blocs par requête**. Un ProjectSpec ~3000 chars avec sections + tables + bullets peut dépasser. La requête entière est rejetée.

4. **Lignes de tables `|---|---|---|`** — les séparateurs de tables Markdown deviennent des paragraphes inutiles (au mieux moches, au pire participent au dépassement de blocs).

**Fix dans `_md_to_notion_blocks`** :

```python
def _md_clean(text: str) -> str:
    text = _re.sub(r'\*\*([^*]+)\*\*', r'\1', text)        # bold
    text = _re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'\1', text)  # italic
    text = _re.sub(r'`([^`]+)`', r'\1', text)              # code
    text = _re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # links
    return text.strip()

def _rt(text: str) -> list[dict]:
    t = (text or "")[:2000]
    return [{"type": "text", "text": {"content": t}}] if t else []

def _para(text: str) -> dict | None:
    rt = _rt(_md_clean(text))
    return None if not rt else {"object":"block","type":"paragraph","paragraph":{"rich_text":rt}}
```

Tous les helpers (`_heading`, `_bullet`, `_todo`, `_numbered`) retournent `None` si `rich_text` est vide. Un `_add(b)` garde-fou ignore les `None`.

**Chunking côté `notion_update_page` / `notion_create_page`** :

```python
for i in range(0, len(blocks), 90):
    chunk = blocks[i:i+90]
    pr = await c.patch(f"{NOTION_API_BASE}/blocks/{page_id}/children",
                       headers=headers, json={"children": chunk})
    if pr.status_code not in (200, 201):
        log.warning("Notion chunk %d-%d HTTP %s: %s", i, i+len(chunk), pr.status_code, pr.text[:600])
        log.warning("Notion first block sample: %s", json.dumps(chunk[0])[:500])
        return {"error": f"Notion HTTP {pr.status_code}: {pr.text[:500]}"}
```

`notion_create_page` crée la page avec les 90 premiers blocs, puis PATCH le reste par lots.

**Bonus utile** :
- `- [ ]` / `- [x]` → `to_do` Notion natif (cases à cocher cliquables) au lieu de `bulleted_list_item`
- Lignes `| col1 | col2 |` → paragraphe `col1 │ col2` (séparateur unicode propre)
- Séparateurs `|---|---|` → skip

**Logging** : sur 4xx, logger le body complet + un échantillon JSON du premier bloc — l'API Notion donne souvent un message précis (`body failed validation: body.children[3].paragraph.rich_text should be non-empty array`) qui pointe directement le bloc fautif.

**Règle générale** : pour toute API tierce qui valide des structures imbriquées (Notion, Slack, Linear), **filtrer les éléments à contenu vide avant l'envoi** et **logger le body complet sur 4xx** — la 4xx est presque toujours une validation, jamais un problème d'auth.

---

### 48. `k8s_pods_exec` via MCP → `UnexpectedModelBehavior` loop

**Symptôme** : Charlotte appelle `k8s_pods_exec` (outil K8s MCP) pour tester un service ou inspecter un pod. Le RBAC bloque l'opération. PydanticAI `Agent.run()` réessaie jusqu'au max retry et lève `UnexpectedModelBehavior: Tool 'pods_exec' exceeded max retries count of 1`, qui remonte en clair dans la réponse OWU.

**Cause** : Le MCP server K8s (`ghcr.io/containers/kubernetes-mcp-server`) expose `k8s_pods_exec`, `k8s_pods_portforward`, `k8s_pods_attach` — mais ces outils sont bloqués au niveau RBAC du ClusterRole `admin-sys-executor`. Charlotte ne peut pas les utiliser.

**Fix code** : catch `UnexpectedModelBehavior` / `"exceeded max retries"` dans `mission_stream` → réponse gracieuse avec nom de l'outil extrait par regex.

**Fix system prompt** : outils MCP INTERDITS listés explicitement avec ⛔ dans la section OUTILS DISPONIBLES.

**Fix classification** : le comportement "agir immédiatement" est injecté dans `intent == "task"` (couche dynamique, plus proche du contexte LLM que les règles statiques du prompt).

**Alternatives** pour les besoins réels :
- Lire les logs : `run_kubectl(["logs", pod, "-n", ns])` ou `k8s_pods_log`
- Tester un endpoint : `web_fetch(url)` depuis Charlotte
- Inspecter un fichier : `read_file` si dans /gitops, sinon `run_kubectl exec` via admin-sys `/execute` avec args explicites

---

### 50. Analyse fictive quand le résultat d'outil est vide ou minimal

**Symptôme** : Un agent appelle un outil (ex : `notion_read_page`, `web_fetch`, `kubectl get`) qui retourne un résultat vide, minimal, ou composé uniquement de liens/métadonnées. Au lieu de le signaler, l'agent génère une analyse détaillée — "points conformes ✅", "éléments obsolètes ❌", "corrections appliquées" — entièrement construite depuis ses connaissances pré-entraînées ou son contexte RAG, sans lien avec ce que l'outil a réellement retourné.

**Cas observé (2026-05-26)** : Charlotte analyse une page Notion quasi-vide (4 liens, aucun contenu). Elle produit un tableau de 5 "points conformes" et 5 "éléments obsolètes" (Jira, Trello, tags Zoho manquants) entièrement inventés, puis déclare "corrections appliquées" sans jamais avoir appelé `notion_update_page`.

**Cause racine** : La règle anti-hallucination existante couvrait les *faits externes* (personnes, URLs, liens) mais pas l'*analyse de résultats d'outils*. Le LLM comble le vide avec ses connaissances générales — ce qui produit une réponse fluide et convaincante mais factuellement fausse.

**Fix system prompt** — règle générique ajoutée dans `RÈGLE ANTI-HALLUCINATION` (statique, s'applique à tous les outils) :
```
INTERDIT ABSOLU de générer une analyse, un bilan ou une liste de "points conformes/obsolètes"
à partir d'une ressource externe (page Notion, fichier, pod, API) si le résultat de l'outil
est vide, minimal, ou ne contient pas le contenu attendu.
Si le résultat est vide → dis-le factuellement. Ne compense pas avec tes connaissances.

INTERDIT ABSOLU de déclarer qu'une action a été effectuée (mise à jour, correction, création)
sans avoir réellement appelé l'outil correspondant dans ce tour.
```

**Règle d'injection contextuelle simplifiée** : la `RÈGLE NOTION` dans `effective_message` est réduite à l'essentiel (2 lignes : lit + applique si nécessaire). La règle générique statique couvre le reste — y compris pour `web_fetch`, `read_file`, `run_kubectl`, `zoho_list_projects`, etc.

**Principe général** : une règle générique dans le prompt statique vaut mieux que des règles spécifiques par outil qui s'accumulent. Si un outil renvoie du vide, c'est une information en soi — l'agent doit la transmettre, pas la masquer.

**S'applique à** : tous les agents qui lisent des ressources externes avant d'analyser (Charlotte, Leon, Aria, Nox, tout agent CLASS A/E).

---

### 49. Confirmation courte (`"ok"`, `"go"`, `"ok pour mise à jour"`) → classifiée `greeting` → LLM hors-contexte

**Symptôme** : L'utilisateur confirme une action précédente avec une courte affirmation (`"ok pour mise à jour et publication"`, `"oui fais-le"`, `"vas-y"`). Charlotte répond avec du nonsense ou des emoji hors-sujet au lieu de continuer la tâche.

**Cause** : `_classify_message()` (Mistral, 10 tokens, pas d'historique) voit uniquement le texte court. Sans verbe d'action explicite dans sa liste (`restart/fix/list/create/apply...`), il retourne `greeting`. L'instruction `"Réponds en 2 phrases max : salutation brève + 1-2 questions..."` désactive complètement le ReAct loop. Le LLM génère une réponse conversationnelle déconnectée du contexte précédent.

**Cas observé (2026-05-26)** : L'utilisateur dit `"ok pour mise à jour et publication"` après que Charlotte ait analysé une page Notion. Réponse produite : analyse d'emoji pour la phrase `"Je garde un œil dessus et je suis là pour t'épauler si besoin"` — texte trouvé dans l'historique Qdrant.

**Fix** : Pré-check regex AVANT `_classify_message()` dans `/mission/stream` :
```python
_AFFIRM_RE = re.compile(r'^(ok|oui|yes|go|d\'accord|parfait|alright|proceed|...)\b', re.IGNORECASE)
if len(message.strip()) <= 60 and _AFFIRM_RE.match(message.strip()) and history_raw:
    intent = "task"   # court-circuit : continuer la tâche en cours
else:
    intent = await _classify_message(message)
```
Condition clé : `history_raw` doit être non-vide (confirme qu'il y a un contexte à continuer). Sans historique, une salutation courte reste classifiée normalement.

**Règle** : toute confirmation ≤ 60 chars commençant par un mot affirmatif ET ayant un historique de session → `task` sans appeler Mistral.

---

### 51. Question réflexive classifiée `task` → CLARIFYING se relance indéfiniment

**Symptôme** : L'utilisateur demande à Leon de confirmer une action récente : `"as-tu bien créé un template prêt à l'emploi ou as-tu créé un projet au nom de template ?"`. Leon répond avec une nouvelle question CLARIFYING au lieu de répondre directement.

**Cause racine (Leon)** : Après chaque phase CLARIFYING, la dernière réponse de Leon est une question courte (`? && len < 400 chars`) → `_in_active_clarif = True`. Le bypass `if _in_active_clarif → intent = "task"` intercepte la question réflexive **avant** que le classifieur LLM ne la voie. Le handler `task` relance la phase CLARIFYING.

**Cause secondaire** : Le classifieur ne disposait pas d'un label pour les questions réflexives. `"as-tu bien créé X ?"` ressemble à `task` pour Mistral (vocabulaire projet).

**Cas observé (2026-05-26)** : Leon avait créé un projet Zoho nommé "Template CRM" (confusion template vs projet instance). L'utilisateur demande confirmation → Leon re-entre en CLARIFYING au lieu de reconnaître l'erreur.

**Fix — classifieur LLM (anti-pattern #40 respecté)** : Ajouter le label `reflection` dans `_classify_message_leon` :
```
- reflection : user asks whether Leon correctly did something, verifies a past action,
               or asks 'did you do X or Y?' — "as-tu bien créé", "tu as fait", "est-ce que tu as"
```
Handler `reflection` : réponse directe oui/non + explication honnête, **aucune question en retour**.

**Ce qui NE marche PAS** : regex pré-check sur `"as-tu"` / `"tu as"` — viole anti-pattern #40 (string matching pour intent).

**Règle** : les questions réflexives sont un intent à part entière dans le classifieur LLM, pas un cas particulier géré par regex. S'applique à tout agent avec une phase CLARIFYING ou de session active.

**Corollaire — Template ≠ projet Zoho** : `"créer un template prêt à l'emploi"` doit être classifié `review` (enrichir la page Notion CDC de référence), jamais `task` (créer un projet Zoho). Ajouter au label `review` du classifieur : `"créer/mettre à jour un template, modèle réutilisable, prêt à l'emploi"`.

---

### 52. Overrides contextuels sur le classifieur → accumulation de règles qui se contredisent

**Symptôme** : Leon ne peut plus supprimer, créer ou lister quoi que ce soit après une session de review Notion. Toute action directe (`"supprime ce projet"`, `"liste les projets"`) est silencieusement reroutée vers le handler `review` — qui tente de lire une page Notion inexistante ou répond hors-contexte.

**Cause racine** : Plutôt que de donner au classifieur suffisamment de contexte pour décider seul, on lui ajoute des **overrides post-hoc** :

```python
# Override 1 — toute URL Notion dans l'historique = review forcé
if _notion_in_history(req.messages):
    intent = "review"

# Override 2 — mots-clés d'action dans le message = task forcé (patch du patch)
elif any(v in user_msg_lower for v in _ACTION_VERBS):
    intent = "task"

# Override 3 — clarification active = task forcé
elif _in_active_clarif:
    intent = "task"

else:
    intent = await _classify_message_leon(user_msg)
```

Chaque override est un pansement sur le précédent. `_notion_in_history` bloquait les suppressions → `_ACTION_VERBS` déblocait les suppressions mais était trop restrictif → nouveau patch → etc. Après 3 cycles, les règles se contredisent.

**Ce qui NE marche PAS** :
- Listes de verbes d'action (`_ACTION_VERBS`) — viole anti-pattern #40 : `"supprime"` passe, `"efface"` ne passe pas.
- Flag booléen `_notion_in_history` — l'historique contient une URL Notion = le contexte *était* une review, pas que le *message actuel* est une review.
- Conditions composées `if url_in_history AND NOT action_verb` — fragile et combinatoire.

**Fix (2026-05-27)** : Supprimer **tous** les overrides contextuels. Passer les 6 derniers messages (3 échanges) directement au classifieur LLM :

```python
_history_for_classifier = [{"role": m.role, "content": m.content}
                            for m in req.messages[:-1] if m.role in ("user", "assistant")]

if _in_active_clarif:
    intent = "task"          # seul bypass légitime : réponse à une question Leon en cours
else:
    intent = await _classify_message_leon(user_msg, history=_history_for_classifier)
```

Le classifieur reçoit l'historique dans ses messages + une instruction explicite :

```
Context rule: if prior messages show a review session but the CURRENT message requests
a new direct action, classify as task — context does not override explicit current intent.
```

Le LLM distingue naturellement `"as-tu analysé la page Notion ?"` (question dans le contexte d'une review) de `"supprime ce projet"` (action directe indépendante du contexte précédent).

**Règle** : un classifieur LLM doit recevoir le contexte dont il a besoin pour décider — jamais des overrides qui court-circuitent sa décision. Le seul bypass légitime est le cas `_in_active_clarif` : si Leon vient de poser une question, la réponse courte de l'utilisateur est forcément une continuation (`task`). Tout autre override viole l'esprit de l'anti-pattern #40.

**Corollaire** : si le classifieur se trompe régulièrement, la solution est d'améliorer ses instructions ou de lui donner plus de contexte — jamais d'ajouter un override externe.

### 53. `zoho_milestone_complete` — l'API Zoho ignore le champ `status`

`POST /projects/{id}/milestones/{ms_id}/` avec `status: "completed"` retourne HTTP 200 mais la valeur `status` reste `"notcompleted"` dans tous les cas testés (jalons passés, futurs, toutes variantes de payload). L'endpoint `/status/` référencé dans `link.status.url` retourne 6831 (paramètre manquant) quelle que soit la combinaison. La valeur `milestone_status` n'est pas documentée.

**Raison probable** : Zoho Projects calcule le statut d'un jalon à partir des tâches liées. Le champ `status` en GET est en lecture seule — il reflète la progression des tâches, il n'est pas directement écrivable via REST.

**Fix** : supprimer l'endpoint `/milestone.complete` du zoho-engine (trompe-l'œil). Remplacer le besoin par :
- `zoho_delete_milestone` — pour les jalons incorrects/doublons
- `zoho_update_task` avec `status: "Closed"` — fermer les tâches liées au jalon pour que Zoho le marque auto
- `zoho_create_milestone` avec des jalons bien nommés reflétant l'état réel

**Ce qui ne marche PAS** : `/milestone.complete` dans zoho-engine v2.0 — retourne `zoho_confirmed: false` depuis la v2.1 de debug, confirmant que Zoho n'applique pas la mise à jour.

---

### 54. Git push ≠ déployé — pas de controller GitOps automatique

**Symptôme** : un commit est dans `Kubinote-GitOps` depuis des jours mais la ressource K8s n'a pas changé.

**Cause** : le cluster NeoKube n'a **aucun controller GitOps** (pas de Flux, pas d'ArgoCD). Le CronJob `cluster-bootstrap` gère uniquement les namespaces Temporal — il ne fait aucun `kubectl apply`. Git est la source de vérité, mais les changements ne se propagent pas au cluster sans action manuelle.

**Patterns obligatoires** :
- **Ressource normale** (< 262 KB CM, Deployment, Service…) : `git push` puis `kubectl apply -f <fichier>` dans le namespace correct
- **`configmap-sre-script.yaml`** (506 KB) : `git push` puis `kubectl replace -f <fichier>` (le `kubectl apply` échoue sur les annotations > 262 KB)
- **Charlotte `apply_gitops_fix`** : écrit le fichier + git push + kubectl apply atomiquement — ne jamais couper le workflow en deux

**Vérification** : après `git push`, toujours confirmer que la ressource K8s a bien changé avec `kubectl get <resource> -o yaml | grep <champ>`. Un commit en git ≠ état cluster.

**Cas réel** : commit `6056a18` (fix charlotte-pipe async httpx, 2026-05-26) n'a jamais été déployé — la NameError `{text}` dans `_gen_charlotte_pipe_code` a crié uniquement lors du premier `kubectl replace` manuel (session 2026-05-28). Charlotte tournait depuis 2 jours avec l'ancienne version synchrone du pipe.
