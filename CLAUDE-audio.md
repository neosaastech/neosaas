# CLAUDE-audio.md — Voix & Audio NeoKube

## Architecture déployée (2026-05-19)

```
OWU microphone / Browser
         │
         ▼ POST /v1/audio/transcriptions
┌──────────────────────────┐
│  whisper-server          │  interfaces:8394  (local, gratuit)
│  faster-whisper base/int8│  ~8x realtime CPU Alder Lake
└──────────────────────────┘
         │ transcript text
         ▼
    OWU pipe → Agent (Charlotte/Leon/…)
         │ réponse texte
         ▼ POST /v1/audio/speech  (OWU TTS_ENGINE=openai)
┌──────────────────────────┐
│  media-gateway           │  interfaces:8395  ← PROXY TTS STABLE
│  /v1/audio/speech        │  traduit voix OWU → slug Mistral
└──────────────────────────┘
         │ POST /v1/audio/speech
         ▼
    Mistral API  (voxtral-mini-tts-latest)
         │ MP3
         ▼
Speaker OWU / Browser
```

> **Règle de stabilité** : OWU n'appelle jamais Mistral TTS directement — l'intégration native OWU-Mistral est instable (config DB vs env var, voice=main introuvable). Le media-gateway est le seul pont TTS — on le contrôle entièrement.

---

## Services voix — namespace `interfaces`

| Service | Port | Image | Rôle |
|---|---|---|---|
| `whisper-server` | 8394 | `ghcr.io/neomnia/whisper-server:latest` | STT local OpenAI-compatible |
| `voice-gateway` | 8393 | `ghcr.io/neomnia/voice-gateway:latest` | WebSocket push-to-talk `https://voice.neokube.fr/` |
| `media-gateway` | 8395 | `ghcr.io/neomnia/media-gateway:latest` | Proxy multimodal + TTS proxy |

---

## media-gateway — hub audio CLASS A

Fichier : `apps/interfaces/media-gateway/media_gateway.py`

### Endpoints

| Endpoint | Rôle |
|---|---|
| `GET /health` | Santé + config (pixtral, whisper, tts) |
| `GET /v1/models` | Proxy liste modèles LiteLLM |
| `POST /v1/chat/completions` | Prétraite multimodal + route vers LiteLLM |
| `POST /v1/preprocess` | Prétraite images/audio → texte, sans appel LLM |
| `POST /v1/audio/speech` | **TTS proxy** : voix OWU → Mistral voxtral |

### Endpoint TTS `/v1/audio/speech`

Accepte le format OpenAI standard. Mappe les voix OWU standard → slugs Mistral :

| Voix OWU (dropdown) | Slug Mistral | Ton |
|---|---|---|
| `alloy` | `en_paul_confident` | Professionnel ← défaut |
| `echo` | `en_paul_neutral` | Neutre |
| `fable` | `en_paul_cheerful` | Enjoué |
| `nova` | `gb_oliver_neutral` | Accent britannique |
| `onyx` | `en_paul_excited` | Enthousiaste |
| `shimmer` | `gb_jane_sarcasm` | Féminin (ironique) |

> Toutes les voix Mistral sont anglaises mais multilingues — le français est bien prononcé.

**Variables d'env media-gateway** :
```yaml
LITELLM_URL:  "http://litellm.cockpit.svc.cluster.local:4000"
LITELLM_KEY:  "sk-neokube-litellm-master"
PIXTRAL_MODEL:"pixtral"
WHISPER_URL:  "http://whisper-server.interfaces.svc.cluster.local:8394/v1/audio/transcriptions"
WHISPER_MODEL:"base"
OWU_BASE_URL: "http://open-webui.interfaces.svc.cluster.local:8080"
MISTRAL_KEY:  <secret mistral-audio-secret, clé MISTRAL_API_KEY>
TTS_MODEL:    "voxtral-mini-tts-latest"
```

**Vault** : `secret/neokube/apps/mistral` → `MISTRAL_API_KEY`

---

## whisper-server — STT local

```
GET  /health                   → {"status":"ok","model":"base","device":"cpu","compute_type":"int8"}
POST /v1/audio/transcriptions  → OpenAI Whisper-compatible
POST /audio/transcriptions     → alias (compatibilité OWU)
```

**Config K8s** (`apps/interfaces/whisper-server/deployment-whisper-server.yaml`) :
```yaml
WHISPER_MODEL:        "base"
WHISPER_DEVICE:       "cpu"
WHISPER_COMPUTE_TYPE: "int8"
WHISPER_WORKERS:      "2"
```

**Performance** (Intel Alder Lake 12C, int8) :

| Modèle | Vitesse | RAM |
|---|---|---|
| base | ~8x realtime | ~590 MB |
| small | ~3x realtime | ~1.2 GB |

---

## voice-gateway — WebSocket push-to-talk

URL publique : `https://voice.neokube.fr/` (Cloudflare tunnel)

Fichier : `apps/interfaces/voice-gateway/voice_gateway.py`

**Protocole WebSocket** (`wss://voice.neokube.fr/ws`) :
```
Client → Gateway :
  {"type":"config","model":"charlotte","language":"fr"}
  {"type":"audio_chunk","data":"<base64 audio/webm>"}  ← toutes les 200ms
  {"type":"audio_end"}

Gateway → Client :
  {"type":"transcript","text":"...","final":true}
  {"type":"llm_token","text":"..."}      ← streaming LiteLLM
  {"type":"audio_chunk","data":"<base64 mp3>"}
  {"type":"done"}
```

**Variables d'env** :
```yaml
STT_URL:         "http://whisper-server.interfaces.svc.cluster.local:8394/v1/audio/transcriptions"
STT_MODEL:       "base"
TTS_MODEL:       "voxtral-mini-tts-latest"
TTS_VOICE:       "en_paul_confident"    # slug Mistral direct (pas de mapping OWU ici)
MISTRAL_API_KEY: <secret mistral-audio-secret>
LITELLM_URL:     "http://litellm.cockpit.svc.cluster.local:4000"
DEFAULT_LLM_MODEL: "charlotte"
DEFAULT_LANGUAGE: "fr"
```

---

## OWU — configuration audio

`apps/interfaces/base/deployment-open-webui.yaml` :

```yaml
# STT — whisper-server local (gratuit, sans dépendance externe)
STT_ENGINE:                "openai"
AUDIO_STT_MODEL:           "base"
AUDIO_STT_OPENAI_API_BASE_URL: "http://whisper-server.interfaces.svc.cluster.local:8394/v1"
AUDIO_STT_OPENAI_API_KEY:  "local"

# TTS — via media-gateway (stable, voix sélectionnable)
TTS_ENGINE:                "openai"
TTS_OPENAI_API_BASE_URL:   "http://media-gateway.interfaces.svc.cluster.local:8395/v1"
TTS_OPENAI_API_KEY:        "local"
TTS_MODEL:                 "voxtral-mini-tts-latest"
TTS_VOICE:                 "alloy"    # OWU dropdown → media-gateway mappe vers Mistral
```

**Sélection de voix dans OWU** : Settings → Audio → Voice → choisir dans le dropdown (alloy/echo/fable/nova/onyx/shimmer). Le media-gateway traduit vers le slug Mistral correspondant.

> **Gotcha** : la DB OWU (`/app/backend/data/webui.db`, table `config`) override les env vars au démarrage. Si OWU se retrouve avec la mauvaise voix, corriger via :
> ```python
> kubectl exec -n interfaces <owu-pod> -- python3 -c "
> import sqlite3, json
> db = sqlite3.connect('/app/backend/data/webui.db')
> cur = db.cursor()
> cur.execute('SELECT id, data FROM config WHERE id=1')
> row = cur.fetchone(); data = json.loads(row[1])
> data['audio']['tts']['engine'] = 'openai'
> data['audio']['tts']['voice'] = 'alloy'
> data['audio']['tts']['openai'] = {'api_base_url': 'http://media-gateway.interfaces.svc.cluster.local:8395/v1', 'api_key': 'local'}
> data['audio']['stt']['engine'] = 'openai'
> data['audio']['stt']['openai'] = {'api_base_url': 'http://whisper-server.interfaces.svc.cluster.local:8394/v1', 'api_key': 'local'}
> cur.execute('UPDATE config SET data=? WHERE id=1', (json.dumps(data),))
> db.commit(); db.close()
> "
> kubectl rollout restart deployment/open-webui -n interfaces
> ```

---

## Accès public HTTPS — chat.neokube.fr

OWU est exposé à `https://chat.neokube.fr` (Cloudflare tunnel, Ingress sans whitelist).

**Obligatoire pour le micro navigateur** : `getUserMedia` exige HTTPS. Sur `http://open-webui.neokube.local` le micro est bloqué.

| URL | Usage |
|---|---|
| `https://chat.neokube.fr` | Voix, démos, mobile |
| `http://open-webui.neokube.local` | Accès LAN texte uniquement |

**GitOps** : `apps/interfaces/base/ingress-open-webui-public.yaml` (sans whitelist middleware).

---

## Mode voix dans les pipes CLASS A

### VOICE_MODE valve

Les pipes OWU (`charlotte_pipe.py`, `leon_pipe.py`) ont une valve `VOICE_MODE: bool = False`.

**Comportement en mode voix** :
- Aucune étape intermédiaire yielded (pas de `⏳ Charlotte analyse...`, pas de `🔍 _📂 Historique chargé_`)
- Thread d'arrière-plan pour l'appel agent
- **Phrases d'empathie** yielded toutes les 6s pendant le traitement (lues par TTS)
- Réponse finale nettoyée du markdown via `_clean_for_tts()`

**Activation** : OWU → ⚙️ pipe Charlotte → `VOICE_MODE = true`

> OWU ne transmet pas `type="voice"` aux pipes — la détection automatique est impossible. La valve est le seul moyen fiable.

### Phrases d'empathie (classe A, mode voix)

```python
_EMPATHY = [
    "Je consulte le cluster en temps réel{name_part}, encore quelques instants.",
    "J'analyse les services NeoKube pour vous répondre avec précision.",
    "Je croise les métriques et les logs du système.",
    "NeoKube traite votre demande{name_part}, je compile les résultats.",
    "Je prépare une réponse basée sur les données en direct.",
]
```

`{name_part}` = premier prénom du profil OWU (ex : ` Charles`) — vide si non renseigné.

### `_clean_for_tts()` — nettoyage markdown

Supprime : blocs de code, `**bold**`, `_italic_`, `# titres`, tableaux markdown → cellules séparées par virgules, puces, emojis SRE (✅❌⚠️…).

### Règle pour tout nouvel agent CLASS A

Tout nouvel agent CLASS A **doit** implémenter :
1. Valve `VOICE_MODE: bool = False`
2. Méthode `_clean_for_tts(text: str) -> str`
3. Pattern thread+queue avec `_EMPATHY` en mode voix
4. `_preprocess_messages()` via `media-gateway /v1/preprocess` (R-S6)

---

## Charlotte — comportement voix & salutations

### Détection de salutation (sre_agent.py)

Pré-check déterministe **avant** le LLM classifier :

```python
_GREETING_WORDS = frozenset([
    "bonjour", "bonsoir", "salut", "hello", "hi", "coucou", "hey",
    "bonne journée", "bonne soirée", "bonne nuit", "merci", "au revoir", "bye",
])

# ≤ 12 mots + mot de salutation → "greeting" sans appel LLM
words = msg.lower().replace("?", "").replace("!", "").split()
if len(words) <= 12 and any(w in _GREETING_WORDS for w in words):
    return "greeting"
```

### Court-circuit ReAct pour les salutations

`intent == "greeting"` → réponse `_llm_call()` directe, **sans** `charlotte_agent.run()`.
Résultat : pas de `📂 Historique chargé`, pas de tool calls, réponse en < 2s.

```python
_warm = await _llm_call([
    {"role": "system", "content": (
        "Tu es Charlotte, l'IA de NeoKube. Réponds à la salutation de façon chaleureuse, "
        "2 phrases max. Mentionne que tu surveilles le cluster. Question ouverte bienveillante."
    )},
    {"role": "user", "content": message},
], temperature=0.7, max_tokens=120, model=LLM_SCAN_MODEL)
await q.put({"type": "done", "answer": _warm, "steps": [], "session_id": session_id})
return
```

---

## Stack Mistral Audio — modèles disponibles

| Modèle | Capacité | Statut NeoKube |
|---|---|---|
| `voxtral-mini-tts-latest` | TTS, 10 voix (cf. tableau mapping) | ✅ Actif via media-gateway |
| `voxtral-mini-latest` | STT transcriptions | Disponible (non utilisé — whisper local préféré) |
| `voxtral-mini-realtime-latest` | WebSocket STT realtime | ⏳ Bêta privée (404) |
| `voxtral-small-latest` | Audio chat (compréhension) | ⏳ Phase 3 |

### Voix Mistral disponibles (API `/v1/audio/voices`)

```
en_paul_confident · en_paul_neutral · en_paul_cheerful · en_paul_happy
en_paul_excited   · en_paul_sad     · en_paul_frustrated · en_paul_angry
gb_oliver_neutral · gb_jane_sarcasm
```

Toutes anglophones mais multilingues. Pas de voix française native disponible à ce jour.

---

## Coûts

| Composant | Coût |
|---|---|
| STT (whisper-server) | **Gratuit** — CPU local |
| TTS (voxtral-mini-tts-latest) | ~$15/M chars ≈ < $1/mois usage conversationnel |
| voice-gateway | Ressources cluster existantes |

---

## Gotchas

| # | Problème | Fix |
|---|---|---|
| 1 | `voice="main"` → 404 Mistral | Voix inexistante. Utiliser un slug du tableau mapping. |
| 2 | OWU DB override env vars au démarrage | Toujours corriger la DB + faire `rollout restart` après. |
| 3 | Micro navigateur bloqué en HTTP | Accéder via `https://chat.neokube.fr` uniquement. |
| 4 | TTS instable avec `TTS_ENGINE=mistral` OWU | Utiliser `TTS_ENGINE=openai` → media-gateway (stable). |
| 5 | Phrases d'empathie lues si VOICE_MODE=false | Les étapes `⏳ 🔍 ⚙️` s'affichent en texte ET sont lues. Activer `VOICE_MODE` dans la valve. |
| 6 | STT Mistral (voxtral) activé via UI OWU | La DB a priorité sur env. Corriger la DB si OWU bascule sur Mistral STT. |
