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
