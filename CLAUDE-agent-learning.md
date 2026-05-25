# CLAUDE-agent-learning.md — Cadre normatif MAD (Mémoire · Apprentissage · Documentation)

> **Règle fondatrice** : tout agent NeoKube, quelle que soit sa classe (A/B/C/D) ou sa spécialité,
> DOIT implémenter les 9 règles MAD. Ce n'est pas une recommandation — c'est une condition de mise
> en production. Charlotte vérifie la conformité MAD lors de `CreateAgentWorkflow` et via BLOC E.

---

## Les 3 piliers

| Pilier | Objectif | Règles |
|---|---|---|
| **M — Mémoire** | L'agent se souvient — session courante et expériences passées | M1, M2, M3 |
| **A — Apprentissage** | L'agent apprend de chaque mission — succès, échecs, corrections | A1, A2, A3 |
| **D — Documentation** | L'agent trace tout — Langfuse, scoring, reporting Zoho/ntfy | D1, D2, D3 |

---

## M — MÉMOIRE

### M1 — Collection Qdrant dédiée (obligatoire pour TOUS les agents)

Chaque agent possède une collection Qdrant `{name}-memory` créée au provisioning.

```
Collection : {name}-memory
Dimensions : 768 (nomic-embed-text via LiteLLM alias)
Distance    : Cosine
Types de points :
  session    — échanges récents de la session courante
  experience — leçons extraites après missions réussies (score ≥ 7)
  correction — root causes d'échecs (score < 7) + correctifs
  knowledge  — règles métier apprises, patterns capitalisés
```

**Agents existants** — collections à créer si absentes :

| Agent | Collection existante | Action |
|---|---|---|
| Charlotte | `sre-charlotte-incidents` + `charlotte-conversations` | Conserver (nommage hérité, ne pas renommer) |
| Leon | `leon-memory` | ✅ Conforme |
| Neo | `neo-memory` | ✅ Conforme |
| Aria | `aria-memory` | ❌ À créer |
| Nox | `nox-memory` | ❌ À créer |
| Vera | `vera-memory` | ❌ À créer |
| Penpot | `penpot-memory` | ❌ À créer |
| Domi | `domi-memory` | ❌ À créer |
| Milo | `milo-memory` | ❌ À créer |
| Zephyr | `zephyr-memory` (+ `design-knowledge` partagé) | ❌ À créer |
| Nora | `nora-memory` | ❌ À créer |
| Dispatcher | `pm-decisions` | ✅ Conforme (usage write-only) |

**Créer une collection manquante :**
```bash
curl -X PUT http://qdrant.rag-system.svc.cluster.local:6333/collections/{name}-memory \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

### M2 — Mémoire de session (obligatoire pour agents OWU-facing : CLASS A uniquement)

Au démarrage de chaque session (`session_id` reçu), charger les échanges récents :

```python
MEMORY_COLLECTION = f"{AGENT_NAME}-memory"
SESSION_MEMORY_LIMIT = 5  # derniers échanges

async def _session_memory_load(session_id: str) -> str:
    """Charge le contexte de la session courante depuis Qdrant. Non-bloquant."""
    try:
        hits = await _qdrant_search(
            MEMORY_COLLECTION,
            query=f"session {session_id}",
            limit=SESSION_MEMORY_LIMIT,
            filter_payload={"type": "session"}
        )
        return hits if hits else ""
    except Exception:
        return ""

async def _session_memory_save(session_id: str, user_msg: str, agent_reply: str) -> None:
    """Persiste l'échange courant en fin de session. Non-bloquant."""
    try:
        content = f"[session:{session_id}] User: {user_msg[:200]}\nAgent: {agent_reply[:500]}"
        await _qdrant_upsert(MEMORY_COLLECTION, content,
                             metadata={"type": "session", "session_id": session_id})
    except Exception:
        pass
```

→ Charlotte implémente M2 via `_load_pydantic_history(session_id)` (PydanticAI + `charlotte-conversations`).
→ Pour les agents CLASS B (Temporal) : M2 non requise — les workflows sont stateless par nature.

### M3 — Mémoire long-terme (obligatoire pour TOUS les agents OWU-facing et Temporal)

Après chaque mission terminée avec score disponible :

```python
async def _memory_store(content: str, mem_type: str, score: float | None = None) -> None:
    """Écrit un point mémoire dans la collection dédiée. Non-bloquant."""
    try:
        await _qdrant_upsert(
            MEMORY_COLLECTION, content,
            metadata={
                "type": mem_type,       # experience | correction | knowledge | session
                "agent": AGENT_NAME,
                "score": score or 0.0,
            }
        )
    except Exception:
        pass
```

---

## A — APPRENTISSAGE

### A1 — Extraction post-mission (obligatoire pour tous les agents OWU-facing avec outils)

Après chaque mission complète (`final` envoyé, outils utilisés), appeler `_agent_learn()` en tâche
background — ne jamais bloquer la réponse utilisateur.

```python
async def _agent_learn(conversation_summary: str, mission_score: float) -> None:
    """Extrait et stocke les leçons d'une mission terminée. Non-bloquant."""
    if not conversation_summary or mission_score == 0.0:
        return
    try:
        lesson = await _llm_call(
            [
                {"role": "system", "content": (
                    f"Tu es {AGENT_NAME}. Extrait 1-3 leçons RÉUTILISABLES de cette mission.\n"
                    "Une leçon par ligne. Préfixe obligatoire :\n"
                    "  [EXPERIENCE] — ce qui a fonctionné, à reproduire\n"
                    "  [CORRECTION] — ce qui a échoué, cause + correctif\n"
                    "  [KNOWLEDGE]  — règle métier ou pattern découvert\n"
                    "Ignore les banalités. Ne retiens que ce qui est non-évident."
                )},
                {"role": "user", "content": f"Mission:\n{conversation_summary[:1000]}\nScore: {mission_score}/10"}
            ],
            model=LLM_SCAN_MODEL, max_tokens=300
        )
        if lesson:
            mem_type = "experience" if mission_score >= 7.0 else "correction"
            await _memory_store(lesson, mem_type, mission_score)
    except Exception:
        pass  # apprentissage non-bloquant

# Déclencher après émission de la réponse finale :
asyncio.ensure_future(_agent_learn(conversation_summary=f"{user_msg}\n\n{final_reply}", mission_score=8.0))
```

→ Pour les agents CLASS B (Temporal) : `_agent_learn()` appelé dans la dernière activité du workflow,
  avant le signal de fin (`dispatch_complete`).

### A2 — Correction proactive par Charlotte (automatique via BLOC E)

Charlotte surveille les scores rolling avg (3 derniers runs) via `sre_check_eval_scores` :
- Score < 7.0 → analyse des traces Langfuse de l'agent → diagnostic → BLOC I (code/prompt fix)
- Score < 5.0 → ntfy urgency=high + confirmation_required avant BLOC I

La correction est documentée dans `{agent}-memory` :
```python
# Charlotte écrit dans la mémoire de l'agent après BLOC I :
await _memory_store(
    content=f"[CORRECTION par Charlotte] Problème: {diagnostic}\nFix: {what_was_changed}",
    mem_type="correction",
    score=score_before_fix
)
```

### A3 — Auto-amélioration hebdomadaire (CharlotteImprovementWorkflow v2)

Étend le BLOC F actuel (Charlotte seule → tous les agents) :

```
CharlotteImprovementWorkflow v2 (dimanche 3h UTC) :
1. Pour chaque agent dans le MANIFESTE :
   a. sre_check_eval_scores(agent) → score rolling avg
   b. Si score < 8.0 : sre_collect_conversation_samples(agent, limit=10)
   c. sre_analyze_quality_patterns(samples) → Mistral : 2-3 patterns récurrents + fix proposé
   d. Si fix évident (score < 7.0 et fix technique) → BLOC I automatique
      Sinon → ntfy rapport + tâche Zoho "[RUN] Maintenance & Optimisation des Agents"
2. Pour Charlotte elle-même : BLOC F original (inchangé)
```

> **Note** : CharlotteImprovementWorkflow v2 n'est pas encore implémenté (état 2026-05-25).
> Implémentation requise dans `configmap-sre-script.yaml` — Charlotte peut le faire via BLOC I sur elle-même
> … SAUF l'auto-modification bloquée. Ce workflow doit être déclenché par Charlotte sur les autres agents uniquement,
> le rapport pour Charlotte elle-même reste via BLOC F.

---

## D — DOCUMENTATION

### D1 — Traçabilité Langfuse (obligatoire pour TOUS)

Chaque appel LLM porte l'identité complète. Règle déjà définie en §R9.7 — répétée ici comme règle MAD :

```python
json={
    "model": LLM_MODEL,
    "messages": messages,
    "user": AGENT_NAME,            # → filtrable dans Langfuse
    "metadata": {
        "agent":             AGENT_NAME,
        "agent_email":       AGENT_EMAIL,
        "permissions_scope": PERMISSIONS_SCOPE,
        "workflow":          workflow,      # ex: "zoho-dispatch", "code-review", "sre-scan"
    }
}
```

### D2 — Scoring Langfuse post-mission (obligatoire pour tout agent avec workflows terminaux)

Après chaque mission/workflow : envoyer un score `mission_quality` entre 0.0 et 1.0.

**Noms de score standardisés :**

| Score | Signification | Agents |
|---|---|---|
| `mission_quality` | Qualité globale de la mission (0.0–1.0) | Tous |
| `task_completion` | Taux de complétion des tâches demandées | Aria, Nox, Vera |
| `response_relevance` | Pertinence de la réponse au contexte | Neo, Leon |
| `cluster_health_score` | État du cluster SRE | Charlotte |
| `sre_health` | Santé incident résolu | Charlotte |

Pattern d'envoi (standard §8c — rappel) :
```python
async def _mission_score(trace_name: str, value: float, comment: str = "") -> None:
    await _send_score(trace_name, "mission_quality", min(max(value, 0.0), 1.0), comment)

# Appeler après la dernière activité du workflow ou la réponse finale :
await _mission_score(f"{AGENT_NAME}-mission-{session_id}", score / 10.0)
```

**État implémentation (2026-05-25) :**

| Agent | D2 Score | Gap |
|---|---|---|
| Charlotte | ✅ `sre_health` + `cluster_health_score` | — |
| Leon | ❌ | À implémenter |
| Neo | ❌ | À implémenter |
| Aria, Nox, Vera, Penpot, Domi | ❌ | P3 — Dispatcher peut scorer pour eux |
| Dispatcher | ❌ | À implémenter |

### D3 — Reporting externe (conditionnel selon accès)

**Si l'agent a le connector `zoho` dans ses connecteurs :**
→ Utiliser les normes BLOC J (footer `Agent: {name} | Tags: {name}, <catégorie>`)
→ Milestone selon le type d'action (voir BLOC J Charlotte)
→ Règle : le footer est générique — chaque agent utilise son propre `{name}` slug

**Si l'agent n'a PAS accès Zoho :**
→ ntfy uniquement — `POST http://ntfy.interfaces.svc.cluster.local/neokube-alerts`
→ `priority=low` pour fin de mission normale, `priority=high` pour anomalie
→ Non-bloquant : un ntfy raté ne stoppe pas l'agent

```python
# Pattern D3 universel (tout agent) :
_used_tools = [s for s in steps if s.get("tool")]
if _used_tools and len(final_reply) > 50:
    await _ntfy_notify(
        title=f"✅ {AGENT_NAME} — mission terminée",
        body=f"📋 {user_msg[:100]}\n\n{final_reply[:300]}",
        priority="low",
        tags=[AGENT_NAME, "done"]
    )
# + Zoho si connector zoho dispo dans PERMISSIONS_SCOPE
```

---

## Matrice MAD par agent (état 2026-05-25)

| Agent | M1 Collection | M2 Session | M3 Long-terme | A1 Learn | A2 Charlotte | A3 Hebdo | D1 Langfuse | D2 Score | D3 Zoho |
|---|---|---|---|---|---|---|---|---|---|
| **Charlotte** | ✅ (2 cols) | ✅ PydanticAI | ✅ incidents | ✅ BLOC F | N/A | ✅ BLOC F | ✅ | ✅ | ✅ BLOC J |
| **Leon** | ✅ leon-memory | ❌ gap | ✅ qdrant_learn | ✅ | ✅ | ❌ gap | ✅ | ❌ gap | ✅ auto |
| **Neo** | ✅ neo-memory | ❌ gap | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Aria** | ❌ à créer | N/A (Temporal) | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Nox** | ❌ à créer | N/A (Temporal) | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Vera** | ❌ à créer | N/A (Temporal) | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Penpot** | ❌ à créer | N/A (Temporal) | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Domi** | ❌ à créer | N/A (Temporal) | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Dispatcher** | ✅ pm-decisions | N/A | ✅ write-only | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ✅ |
| **Milo** | ❌ à créer | ❌ gap | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ✅ Zoho |
| **Zephyr** | ❌ à créer | ❌ gap | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ❌ pas Zoho |
| **Nora** | ❌ à créer | ❌ gap | ❌ gap | ❌ gap | ✅ | ❌ gap | ✅ | ❌ gap | ✅ Zoho |

**Légende** : ✅ Implémenté · ❌ gap (à implémenter) · N/A (non applicable au type)

---

## Impact sur CreateAgentWorkflow — nouvelles étapes obligatoires

`CreateAgentWorkflow` doit inclure ces 3 nouvelles étapes après l'étape 5 (K8s resources) :

### Étape 5b — Provision collection Qdrant `{name}-memory`
```python
# sre_provision_qdrant_memory(agent_name)
curl -X PUT http://qdrant.rag-system.svc.cluster.local:6333/collections/{name}-memory \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

### Étape 5c — Injection MAD dans le code généré
`sre_generate_agent_code` doit inclure dans le code FastAPI minimal :
- `_session_memory_load()` + `_session_memory_save()` (M2)
- `_memory_store()` (M3)
- `_agent_learn()` appelé via `asyncio.ensure_future` après réponse finale (A1)
- `_mission_score()` (D2)
- Pattern ntfy mission-done dans la réponse (D3)

### Étape 5d — Enregistrement dans `agent-eval-nightly`
Ajouter l'agent dans la liste des agents évalués par le CronJob `agent-eval-nightly` :
→ Ajouter dans `configmap-agent-eval-cron.yaml` la section scénarios de l'agent

---

## Règles invariantes MAD — §6 addendum (CLAUDE-create-agent.md)

Les 9 règles suivantes s'ajoutent aux règles invariantes existantes :

| Règle | Description | Obligatoire pour |
|---|---|---|
| **M1** | Collection Qdrant `{name}-memory` provisionnée à la création | Tous |
| **M2** | `_session_memory_load()` au démarrage session + `_session_memory_save()` en fin | CLASS A (OWU-facing) |
| **M3** | `_memory_store()` après mission — type=experience/correction selon score | Tous avec missions |
| **A1** | `_agent_learn()` déclenché post-mission via `asyncio.ensure_future` | CLASS A avec outils, CLASS B |
| **A2** | Charlotte corrige si score rolling < 7.0 (BLOC E + BLOC I) | Surveillance automatique |
| **A3** | Inclus dans CharlotteImprovementWorkflow v2 (dimanche 3h UTC) | Tous |
| **D1** | `user=AGENT_NAME` + `metadata` complet dans chaque appel LiteLLM | Tous |
| **D2** | `_mission_score()` après chaque workflow terminal | Tous avec workflows |
| **D3** | ntfy mission-done (tous) + Zoho si connector zoho dans PERMISSIONS_SCOPE | Tous |

---

## Code standard MAD — template injectable par CreateAgentWorkflow

```python
# ══════════════════════════════════════════════════════
# PILIER M — MÉMOIRE
# ══════════════════════════════════════════════════════
MEMORY_COLLECTION = f"{AGENT_NAME}-memory"
QDRANT_URL        = os.getenv("QDRANT_URL", "http://qdrant.rag-system.svc.cluster.local:6333")
EMBED_MODEL       = os.getenv("EMBED_MODEL", "nomic-embed-text")

async def _qdrant_embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{LITELLM_BASE_URL}/v1/embeddings",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={"model": EMBED_MODEL, "input": text[:1000]})
        emb = r.json()["data"][0]["embedding"]
        return emb[0] if emb and isinstance(emb[0], list) else emb  # antipattern #7

async def _qdrant_search(collection: str, query: str, limit: int = 3,
                         filter_payload: dict | None = None) -> str:
    async with httpx.AsyncClient(timeout=15) as c:
        emb = await _qdrant_embed(query)
        body: dict = {"vector": emb, "limit": limit, "with_payload": True, "with_vector": False}
        if filter_payload:
            body["filter"] = {"must": [{"key": k, "match": {"value": v}}
                                        for k, v in filter_payload.items()]}
        r = await c.post(f"{QDRANT_URL}/collections/{collection}/points/search", json=body)
        hits = [h["payload"].get("content") or h["payload"].get("text") or ""
                for h in r.json().get("result", []) if h.get("score", 0) > 0.3]
        return "\n\n---\n\n".join(hits)

async def _qdrant_upsert(collection: str, content: str, metadata: dict) -> None:
    async with httpx.AsyncClient(timeout=15) as c:
        emb = await _qdrant_embed(content)
        point = {"id": str(uuid.uuid4()), "vector": emb,
                 "payload": {"content": content, **metadata}}
        await c.put(f"{QDRANT_URL}/collections/{collection}/points",
                    json={"points": [point]})

async def _session_memory_load(session_id: str) -> str:
    try:
        return await _qdrant_search(MEMORY_COLLECTION, f"session {session_id}",
                                    limit=5, filter_payload={"type": "session"})
    except Exception: return ""

async def _session_memory_save(session_id: str, user_msg: str, agent_reply: str) -> None:
    try:
        await _qdrant_upsert(MEMORY_COLLECTION,
            f"[session:{session_id}] User: {user_msg[:200]}\nAgent: {agent_reply[:500]}",
            metadata={"type": "session", "session_id": session_id})
    except Exception: pass

async def _memory_store(content: str, mem_type: str, score: float = 0.0) -> None:
    try:
        await _qdrant_upsert(MEMORY_COLLECTION, content,
            metadata={"type": mem_type, "agent": AGENT_NAME, "score": score})
    except Exception: pass

# ══════════════════════════════════════════════════════
# PILIER A — APPRENTISSAGE
# ══════════════════════════════════════════════════════
async def _agent_learn(conversation_summary: str, mission_score: float) -> None:
    if not conversation_summary: return
    try:
        lesson = await _llm_call([
            {"role": "system", "content": (
                f"Tu es {AGENT_NAME}. Extrait 1-3 leçons RÉUTILISABLES de cette mission.\n"
                "Format : une leçon par ligne.\n"
                "Préfixe obligatoire : [EXPERIENCE] | [CORRECTION] | [KNOWLEDGE]\n"
                "Ne retiens que ce qui est non-évident et applicable à de futures missions."
            )},
            {"role": "user", "content": f"Mission:\n{conversation_summary[:1000]}\nScore: {mission_score}/10"}
        ], model=LLM_SCAN_MODEL, max_tokens=300)
        if lesson:
            mem_type = "experience" if mission_score >= 7.0 else "correction"
            await _memory_store(lesson, mem_type, mission_score)
    except Exception: pass

# ══════════════════════════════════════════════════════
# PILIER D — DOCUMENTATION
# ══════════════════════════════════════════════════════
async def _mission_score_send(trace_name: str, value: float, comment: str = "") -> None:
    """Envoie mission_quality (0.0–1.0) vers Langfuse. Non-bloquant."""
    await _send_score(trace_name, "mission_quality", min(max(value / 10.0, 0.0), 1.0), comment)

async def _mission_notify(user_msg: str, final_reply: str, steps: list) -> None:
    """ntfy mission-done si outils utilisés. Non-bloquant."""
    _used = [s for s in steps if s.get("tool")]
    if _used and len(final_reply) > 50:
        await _ntfy_notify(
            title=f"✅ {AGENT_NAME} — mission terminée",
            body=f"📋 {user_msg[:100]}\n\n{final_reply[:300]}",
            priority="low", tags=[AGENT_NAME, "done"]
        )

# ══════════════════════════════════════════════════════
# APPEL GROUPÉ POST-MISSION (pattern standard)
# ══════════════════════════════════════════════════════
# Après emission de la réponse finale — non-bloquant :
async def _post_mission(session_id: str, user_msg: str, final_reply: str,
                         steps: list, score: float = 8.0) -> None:
    await asyncio.gather(
        _session_memory_save(session_id, user_msg, final_reply),
        _memory_store(f"Mission: {user_msg[:200]}\nRéponse: {final_reply[:400]}", "experience", score),
        _mission_notify(user_msg, final_reply, steps),
        return_exceptions=True  # antipattern #2 : never let one failure kill the others
    )
    asyncio.ensure_future(_agent_learn(f"{user_msg}\n\n{final_reply}", score))
    # D2 — score Langfuse (async, non-bloquant)
    asyncio.ensure_future(_mission_score_send(f"{AGENT_NAME}-{session_id}", score))
```

---

## Charlotte — rôle de garant MAD

Charlotte vérifie la conformité MAD de chaque agent via :

1. **À la création** (`CreateAgentWorkflow`) : collection Qdrant créée, code MAD injecté, agent dans eval-nightly
2. **BLOC E** (tous les 6 scans SRE) : `sre_check_eval_scores` → si score < 7.0 → BLOC I + `_memory_store(correction)`
3. **BLOC F v2** (dimanche 3h UTC) : amélioration de tous les agents avec score < 8.0
4. **Sur demande** ("vérifie la conformité MAD de {agent}") : Charlotte lit le ConfigMap + vérifie la présence des 9 fonctions MAD + crée les collections manquantes

**Checklist conformité MAD (vérifiable par Charlotte via read_file) :**
```
grep -c "_session_memory_load\|_memory_store\|_agent_learn\|_mission_score_send\|_mission_notify" configmap-{agent}-script.yaml
→ doit retourner ≥ 5 occurrences pour un agent CLASS A conforme
```
