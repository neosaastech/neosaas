# CLAUDE-services.md — Norme Services & Classes d'Agents NeoKube

> Ce document est la référence normative pour concevoir, déployer et connecter un agent NeoKube.
> Toute création d'agent DOIT s'appuyer sur cette taxonomie.

---

## 1. Classes de services

Chaque service appartient à une classe fonctionnelle. Un agent déclare les classes dont il dépend.

| Classe | Service(s) | Endpoint interne | Rôle |
|---|---|---|---|
| **MEDIA** | `media-gateway` | `media-gateway.interfaces:8395` | Prétraitement multimodal — image→Pixtral, audio→Whisper |
| **LLM** | `litellm` | `litellm.cockpit:4000` | Routing modèles, fallback, virtual keys |
| **RAG** | `qdrant` | `qdrant.rag-system:6333` | Collections vectorielles par agent |
| **ORCH** | `temporal` | `temporal-frontend.agent-system:7233` | Workflows durables, activités, retry, cron |
| **EXEC** | `admin-sys` | `admin-sys-agent.interfaces:8000` | Mutation K8s déléguée (`POST /execute`, `POST /apply`) |
| **NOTIFY** | `ntfy` | `ntfy.interfaces/neokube-alerts` | Alertes push mobile/desktop |
| **OBS** | `langfuse` | `langfuse.cockpit:3000` | Traces LLM, prompts versionnés, évaluations |
| **CONN** | `connector-system` | ports 8000–8010 par service | Accès APIs externes (Zoho, GitHub, Vercel, Neon…) |
| **AUTH** | `vault` | `vault.security:8200` | Injection secrets au démarrage (Vault agent) |
| **STT** | `whisper-server` | `whisper-server.interfaces:8394` | Transcription audio locale (faster-whisper, gratuit) |
| **TTS** | Mistral API | `api.mistral.ai/v1/audio/speech` | Synthèse vocale (voxtral-mini-tts-latest) |

### Connecteurs disponibles (classe CONN)

| Port | Service | API cible |
|---|---|---|
| 8000 | zoho-engine | Zoho Projects/CRM |
| 8001 | github-connector | GitHub REST API |
| 8002 | vercel-connector | Vercel REST API |
| 8003 | neon-connector | Neon serverless Postgres |
| 8004 | penpot-connector | Penpot REST API |
| 8005 | openprovider-connector | Openprovider DNS |
| 8006 | cloudflare-connector | Cloudflare DNS/Tunnel |
| 8007 | stalwart-connector | Stalwart Mail admin |
| 8008 | google-discovery | Google Workspace |
| 8009 | crawlee-service | Scraping web |
| 8010 | dataforseo-connector | SEO data API |
| 8011 | notion-connector | Notion API |
| 8012 | scaleway-engine | Scaleway API — RBAC par agent (voir [CLAUDE-scaleway-engine.md](CLAUDE-scaleway-engine.md)) |
| 8080 | github-mcp | GitHub MCP streamable-http |

---

## 2. Classes d'agents

### CLASS A — Conversational (interface utilisateur)

**Rôle** : Agents accessibles depuis OWU ou toute interface chat. Reçoivent du texte et/ou des médias. Répondent en streaming.

**Services requis** :
```
MEDIA  → media-gateway  (prétraitement images/audio avant l'agent)
LLM    → litellm        (routing modèle + fallback)
RAG    → qdrant         (mémoire sémantique, collection dédiée)
NOTIFY → ntfy           (alertes fin de mission, erreurs)
OBS    → langfuse       (traces + prompt versionné)
```

**Pattern de connexion OWU** :
```
OWU → media-gateway:8395 → LiteLLM:4000 → agent FastAPI
```
> OWU déclare `media-gateway` comme endpoint OpenAI. Le champ `model` identifie l'agent cible dans LiteLLM.

**Agents actuels CLASS A** :
| Agent | Port | Collection RAG | Modèle LiteLLM |
|---|---|---|---|
| Charlotte (interface) | 8383 | `sre-charlotte-incidents` | `charlotte` → mistral |
| Leon | 8181 | `leon-memory` | `leon` → gpt-4o |
| Neo | — | `neomnia_core` | `neo` → mistral-large |
| Milo | 8491 | — | `milo` → mistral |
| Zephyr | 8492 | `design-knowledge` | `zephyr` → mistral |
| Nora | 8493 | — | `nora` → mistral |

**Checklist création agent CLASS A** :
- [ ] FastAPI avec `POST /v1/chat/completions` OpenAI-compatible + streaming SSE
- [ ] `GET /health` retourne `{"status":"ok","model":"...","class":"A"}`
- [ ] Collection Qdrant créée (`curl -X PUT qdrant:6333/collections/{name}`)
- [ ] Virtual key LiteLLM : `litellm_params.model` → alias agent
- [ ] Prompt versionné dans Langfuse (`langfuse.cockpit/prompts/{agent-name}`)
- [ ] Deployment K8s avec label `neokube.agent-class: conversational`
- [ ] OWU pipe function : inclure `_preprocess_messages()` (voir §Pipe standard CLASS A)
- [ ] OWU : `capabilities.vision=true` (media-gateway gère la conversion)
- [ ] Valve `VOICE_MODE: bool = False` + pattern thread+queue + phrases d'empathie (voir §Mode voix CLASS A)

**Pipe standard CLASS A — patron obligatoire** :

Toute pipe function OWU pour un agent CLASS A DOIT appeler `media-gateway /v1/preprocess`
avant d'envoyer le message à l'agent. Cela garantit que les images et audios sont convertis
en texte quel que soit l'interface utilisée.

```python
MEDIA_GW = "http://media-gateway.interfaces.svc.cluster.local:8395"

def _preprocess_messages(self, messages: list) -> tuple:
    """Retourne (messages_text_only, last_user_text). Appeler avant tout envoi agent."""
    try:
        resp = requests.post(f"{MEDIA_GW}/v1/preprocess",
                             json={"messages": messages}, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data.get("messages", messages), data.get("last_user_text", "")
    except Exception:
        # Fallback texte brut si media-gateway indisponible
        user_msgs = [m for m in messages if m.get("role") == "user"]
        last = user_msgs[-1].get("content", "") if user_msgs else ""
        if isinstance(last, list):
            last = " ".join(i.get("text","") for i in last
                            if isinstance(i, dict) and i.get("type") == "text")
        return messages, last

def pipe(self, body: dict):
    messages = body.get("messages", [])
    clean_messages, user_prompt = self._preprocess_messages(messages)
    # ... envoyer clean_messages/user_prompt à l'agent ...
```

> **Règle R-S6** : toute pipe function OWU doit implémenter ce patron. Ne jamais
> extraire `content` directement depuis un message sans passer par `_preprocess_messages()` —
> le contenu peut être une liste multimodal qui planterait l'agent destinataire.

**Mode voix CLASS A — patron obligatoire** :

OWU ne transmet **pas** `type="voice"` aux pipe functions — la détection automatique est impossible.
La valve `VOICE_MODE` est le seul mécanisme fiable. Toute pipe CLASS A doit implémenter :

1. **Valve** `VOICE_MODE: bool = False` — activée manuellement depuis ⚙️ pipe settings OWU
2. **Thread d'arrière-plan** pour l'appel agent (ne pas bloquer le générateur)
3. **Phrases d'empathie** yielded toutes les 6s pendant le traitement (lues par TTS)
4. **`_clean_for_tts(text)`** — supprime le markdown avant d'émettre la réponse finale

```python
import queue, threading, re

_EMPATHY = [
    "Je cherche les informations{name_part}, encore quelques instants.",
    "J'analyse votre demande pour vous répondre avec précision.",
    "Je prépare une réponse basée sur les données en direct.",
]
_EMPATHY_INTERVAL = 6  # secondes

class Valves(BaseModel):
    VOICE_MODE: bool = Field(default=False,
        description="Activer le mode voix : phrases d'empathie TTS, réponse sans markdown.")

def _clean_for_tts(self, text: str) -> str:
    text = re.sub(r"```[^\n]*\n?(.*?)```", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_([^_\n]+)_", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[-*]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"[✅❌⚠️🔍⚙️⏳📂🟡🔴🟢🔵⬆️⬇️➡️✔️🚨🛑]", "", text)
    return text.strip()

def pipe(self, body: dict):
    voice = self.valves.VOICE_MODE
    user_name = body.get("user", {}).get("name", "").strip().split()[0]
    name_part = f" {user_name}" if user_name else ""

    if voice:
        result_q = queue.Queue()
        t = threading.Thread(target=self._call_agent_bg,
                             args=(payload, result_q), daemon=True)
        t.start()
        empathy_idx = 0
        while True:
            try:
                kind, data = result_q.get(timeout=_EMPATHY_INTERVAL)
                if kind == "ok":
                    yield self._clean_for_tts(data)
                else:
                    yield f"Désolé{name_part}, une erreur est survenue."
                return
            except queue.Empty:
                phrase = _EMPATHY[empathy_idx % len(_EMPATHY)].format(name_part=name_part)
                yield phrase
                empathy_idx += 1
    else:
        # mode texte — streaming normal avec étapes
        ...
```

> **Référence** : implémentation complète dans `charlotte_pipe.py` et `leon_pipe.py`.
> **Gotcha** : si `VOICE_MODE=false`, OWU lit TOUTES les étapes intermédiaires (`⏳ 🔍 ⚙️`) à voix haute — activer la valve impérativement pour les démos voix.

---

### CLASS B — Builder (Temporal workflow)

**Rôle** : Agents qui exécutent des tâches longues via Temporal. Déclenchés par Charlotte ou le Dispatcher. Produisent des artefacts (repos GitHub, Vercel deploy, Neon branch, etc.).

**Services requis** :
```
ORCH  → temporal        (workflow durables, retry automatique)
LLM   → litellm        (génération de code, décisions)
CONN  → selon cible     (GitHub MCP, Vercel, Neon, Penpot…)
NOTIFY → ntfy          (build done, erreur)
OBS   → langfuse       (traces)
```

**Pattern** :
```
Charlotte/Dispatcher → POST :port/trigger → Temporal Workflow
    → Activity 1 (LLM plan) → Activity 2 (CONN GitHub) → Activity N
    → ntfy mission done
```

**Agents actuels CLASS B** :
| Agent | Port | Temporal NS | Connecteurs |
|---|---|---|---|
| Dispatcher | 8484 | `dispatcher` | — (orchestre) |
| Aria | 8485 | `dispatcher` | github-mcp, vercel-connector |
| Nox | 8486 | `dispatcher` | github-mcp, neon-connector |
| Penpot | 8488 | `dispatcher` | penpot-connector |
| Domi | 8489 | `dispatcher` | cloudflare-connector, openprovider-connector |
| Vera | 8487 | `dispatcher` | github-connector |

**Checklist création agent CLASS B** :
- [ ] Worker Temporal avec namespace dédié ou partagé (`dispatcher`)
- [ ] `POST /trigger` avec payload ProjectSpec ou spec custom
- [ ] `GET /health` retourne `{"status":"ok","class":"B","temporal_ns":"..."}`
- [ ] Activités atomiques (chaque step = une activité Temporal retry-able)
- [ ] Virtual key LiteLLM (codestral pour builders)
- [ ] ntfy en fin de workflow (succès/erreur)
- [ ] Deployment K8s label `neokube.agent-class: builder`

---

### CLASS C — Infrastructure (SRE)

**Rôle** : Agents qui surveillent et remédient l'infrastructure. Accès lecture K8s via k8s-mcp, mutations via admin-sys. Workflows SRE Temporal pour scan continu.

**Services requis** :
```
EXEC  → admin-sys       (mutations K8s : rollout, apply, patch)
LLM   → litellm        (diagnostic, décisions SRE)
RAG   → qdrant         (incidents passés, runbooks)
NOTIFY → ntfy          (alertes critique/warning)
OBS   → langfuse       (traces SRE)
AUTH  → vault          (credentials Scaleway, clés API)
```

**Pattern** :
```
SREScanWorkflow (Temporal, cron 5min) → k8s-mcp (lecture) → LLM analyse
    → si incident → admin-sys (write) + ntfy alert
OWU → Charlotte (AUSSI CLASS A pour interface) → même agent, deux modes
```

**Agents actuels CLASS C** :
| Agent | Port | Temporal NS | Accès |
|---|---|---|---|
| Charlotte SRE | 8383 | `sre-charlotte` | k8s-mcp + admin-sys + Vault (SCW) |
| admin-sys | 8000 | — | kubectl direct |

**Règle CLASS C** : l'agent ne peut PAS se modifier lui-même (guard `_is_charlotte_file`). Toute remédiation passe par `admin-sys`. Voir anti-pattern #26 et #33.

---

### CLASS D — Connector/Observer

**Rôle** : Agents légers qui observent des événements externes et notifient ou déclenchent des agents CLASS B. Pas de LLM — logique déterministe.

**Services requis** :
```
CONN  → API externe cible
NOTIFY → ntfy (ou trigger CLASS B)
```

**Agents actuels CLASS D** :
| Agent | NS | Source | Action |
|---|---|---|---|
| zoho-discovery | agent-system | Zoho Projects polling | Crée tâches Temporal |
| zoho-observer | agent-system | Zoho webhooks | Trigger Dispatcher |
| google-discovery | connector-system | Google Workspace | Sync contacts |

---

## 3. Service MEDIA — media-gateway en détail

### Pourquoi un service MEDIA séparé ?

Les agents CLASS A restent **text-only**. La conversion média→texte est externalisée dans `media-gateway` pour :
- Découpler les agents du modèle OCR/STT utilisé (changer Pixtral ≠ toucher les agents)
- Compatible avec toute interface (OWU, Dify, SurfSense, futur)
- Un seul endroit à auditer pour la confidentialité des données visuelles

### Intégration OWU

Dans OWU, ajouter une connexion OpenAI pointant sur media-gateway :

```
URL  : http://media-gateway.interfaces.svc.cluster.local:8395
Key  : sk-neokube-litellm-master
Name : NeoKube Media (via LiteLLM)
```

Les modèles CLASS A déclarent `base_url=media-gateway` → toute image ou audio est prétraitée avant d'atteindre l'agent.

### Conversions supportées

| Contenu reçu | Traitement | Injection dans le message |
|---|---|---|
| `image_url` (URL interne OWU `/api/v1/files/...`) | Download → base64 → Pixtral | `[Analyse image — Pixtral]\n{description}` |
| `image_url` (data URI base64) | Pixtral direct | idem |
| `image_url` (URL externe) | Download → base64 → Pixtral | idem |
| `input_audio` (base64) | whisper-server | `[Transcription audio — Whisper]\n{texte}` |

### Variables d'env media-gateway

```yaml
LITELLM_URL:   "http://litellm.cockpit.svc.cluster.local:4000"
LITELLM_KEY:   "sk-neokube-litellm-master"
PIXTRAL_MODEL: "pixtral"
WHISPER_URL:   "http://whisper-server.interfaces.svc.cluster.local:8394/v1/audio/transcriptions"
WHISPER_MODEL: "base"
OWU_BASE_URL:  "http://open-webui.interfaces.svc.cluster.local:8080"
```

### Évolution future du service MEDIA

Pour ajouter un nouveau type de média (ex: vidéo, PDF natif) :
1. Ajouter un handler `_process_video()` dans `media_gateway.py`
2. Détecter le type dans `_preprocess_message()`
3. Rebuild image + rollout restart — zéro modification agents

---

## 4. Processus de développement d'un nouvel agent

### Étape 1 — Identifier la classe

```
L'agent répond à des questions en chat ?          → CLASS A
L'agent produit des artefacts via workflow ?       → CLASS B  
L'agent surveille/modifie l'infrastructure ?       → CLASS C
L'agent observe/relaie des événements externes ?  → CLASS D
```

Un même agent peut être A+C (Charlotte) ou A+B (si interface + workflow léger).

### Étape 2 — Déclarer les services requis

Documenter dans le YAML de deployment sous annotation :
```yaml
metadata:
  annotations:
    neokube.services: "LLM,RAG,NOTIFY,OBS"   # classes de services
    neokube.class: "A"
```

### Étape 3 — Infrastructure minimale

**CLASS A** : FastAPI + `/v1/chat/completions` + `/health` + LiteLLM virtual key + collection Qdrant + prompt Langfuse
**CLASS B** : Temporal Worker + `/trigger` + `/health` + LiteLLM virtual key
**CLASS C** : FastAPI/Temporal + k8s-mcp + admin-sys token + Vault role
**CLASS D** : FastAPI minimal + `/health` + endpoint CONN cible

### Étape 4 — Checklist ports

Ports libres : `8494–8499` (interfaces/agent-system).
Déclarer dans CLAUDE.md sous "Architecture agents" avant d'utiliser.

### Étape 5 — Intégration OWU (CLASS A uniquement)

```
base_url = http://media-gateway.interfaces.svc.cluster.local:8395
model    = <alias LiteLLM de l'agent>
capabilities.vision = true  ← media-gateway gère la conversion
```

### Étape 6 — Validation

```bash
# Vérifier health
kubectl exec -n interfaces deploy/<agent> -- curl -s localhost:<port>/health

# Test chat (CLASS A via media-gateway)
curl -s http://media-gateway.interfaces.svc.cluster.local:8395/v1/chat/completions \
  -H "Authorization: Bearer sk-neokube-litellm-master" \
  -H "Content-Type: application/json" \
  -d '{"model":"<alias>","messages":[{"role":"user","content":"ping"}]}'

# Test media (image)
# Envoyer un message avec image_url → vérifier que l'agent reçoit du texte
```

---

## 5. Règles de gouvernance

**R-S1 — Pas de LLM dans CLASS D** : les observers sont déterministes. Pas de LLM pour éviter les coûts et la latence sur du polling.

**R-S2 — media-gateway = seul point d'entrée OWU** : ne jamais connecter OWU directement à LiteLLM pour les agents CLASS A. Toujours passer par media-gateway.

**R-S3 — Agents text-only** : les agents CLASS A ne doivent pas appeler Pixtral ou Whisper eux-mêmes. C'est le rôle de media-gateway. Exception : Charlotte peut utiliser Pixtral via un outil dédié pour les workflows SRE (screenshots, dashboards).

**R-S4 — Un secret = Vault** : aucune clé API en clair dans un ConfigMap ou deployment YAML. Pattern : `Vault agent injection → /vault/secrets/<name> → os.environ["VAR"]`.

**R-S5 — Pas de mutation K8s directe depuis CLASS A** : un agent conversationnel ne doit pas appeler kubectl. Il demande à Charlotte (CLASS C) qui délègue à admin-sys.

**R-S6 — Prétraitement multimodal obligatoire** : voir §Pipe standard CLASS A.

**R-S7 — VOICE_MODE valve obligatoire** : toute pipe CLASS A doit implémenter la valve `VOICE_MODE: bool = False` + pattern thread+queue + `_clean_for_tts()`. OWU ne détecte pas automatiquement le mode voix — sans cette valve, toutes les étapes intermédiaires sont lues par le TTS. Voir §Mode voix CLASS A.
