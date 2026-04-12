#!/usr/bin/env python3
"""
worker_zoho_v2.py — Phoenix Worker · Neomnia Studio
=====================================================
Worker Temporal v2 avec RAG contextuel.

Avant chaque appel LLM, le worker interroge kubinote-brain (Qdrant) pour
récupérer les chunks de contexte les plus pertinents (scoring, marketing B2B,
architecture cluster) et les injecte dans le system prompt.

Flux par lead :
  1. embed(lead_data)          → vecteur 1536-dim (Gemini embedding-001)
  2. qdrant.search(vector)     → top-K chunks kubinote-brain
  3. build_prompt(lead, ctx)   → system prompt enrichi
  4. litellm(prompt)           → score, summary, next_action, tags
  5. qdrant.upsert(result)     → stocke l'analyse dans kubinote-brain

Env vars :
  TEMPORAL_HOST      temporal.agent-system.svc.cluster.local:7233
  TEMPORAL_NAMESPACE default
  LITELLM_BASE_URL   http://litellm.cockpit.svc.cluster.local:4000
  LITELLM_MODEL      gemini-flash
  LITELLM_API_KEY    sk-neokube-litellm-master  (zoho-secrets)
  QDRANT_URL         http://qdrant.rag-system.svc.cluster.local:6333
  GEMINI_API_KEY     AIzaSy...  (pour les embeddings, quota séparé)
  ZOHO_ACCESS_TOKEN  (optionnel)
  LOG_LEVEL          INFO
"""

import asyncio
import json
import logging
import os
import sys
import time
import uuid
from datetime import timedelta

from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker

# ── Logging ──────────────────────────────────────────────────────────��────────

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("zoho-discovery-v2")

# ── Config ───────────────────────────────────���────────────────────────────────

TEMPORAL_HOST      = os.getenv("TEMPORAL_HOST",      "temporal-frontend.agent-system.svc.cluster.local:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
LITELLM_BASE_URL   = os.getenv("LITELLM_BASE_URL",   "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_MODEL      = os.getenv("LITELLM_MODEL",      "gemini-flash")
LITELLM_API_KEY    = os.getenv("LITELLM_API_KEY",    "")
QDRANT_URL         = os.getenv("QDRANT_URL", "http://51.159.27.101:6333")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY",     "")
GEMINI_EMBED_URL   = (
    "https://generativelanguage.googleapis.com"
    "/v1beta/models/gemini-embedding-001:embedContent"
)

TASK_QUEUE       = "zoho-discovery-queue"
BRAIN_COLLECTION = "kubinote-brain"
EMBED_DIMS       = 1536
RAG_TOP_K        = 3          # chunks contextuels injectés dans le prompt
RAG_MIN_SCORE    = 0.65       # seuil de similarité cosine minimum


# ── Helpers embedding (hors sandbox) ─────────────────────────────────────────

def _embed_sync(text: str) -> list[float]:
    """Embedding synchrone via API Gemini — utilisé dans les activités."""
    import httpx
    resp = httpx.post(
        f"{GEMINI_EMBED_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": EMBED_DIMS,
        },
        timeout=20.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


# ── get_methods : interface de recherche Qdrant ───────────────────────────────

def get_methods(query_text: str, collection: str = BRAIN_COLLECTION,
                top_k: int = RAG_TOP_K, min_score: float = RAG_MIN_SCORE) -> list[dict]:
    """
    Vectorise query_text et retourne les top-K chunks depuis Qdrant.
    Utilisable hors activité pour tester la connectivité RAG.
    """
    import httpx
    vector = _embed_sync(query_text)
    resp = httpx.post(
        f"{QDRANT_URL}/collections/{collection}/points/search",
        headers={"Content-Type": "application/json"},
        json={
            "vector": vector, "limit": top_k,
            "with_payload": True, "with_vector": False,
            "score_threshold": min_score,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    return [
        {
            "title":    h.get("payload", {}).get("title", ""),
            "category": h.get("payload", {}).get("category", ""),
            "content":  h.get("payload", {}).get("content", "")[:600],
            "score":    round(h.get("score", 0.0), 3),
        }
        for h in resp.json().get("result", [])
    ]


# ── Activité 1 : recherche RAG dans kubinote-brain ────────────────────────────

@activity.defn(name="search_brain_context")
async def search_brain_context(query_text: str) -> list[dict]:
    """
    Vectorise query_text et cherche les chunks les plus proches dans kubinote-brain.
    Retourne une liste de dicts {title, content, category, score}.
    """
    import httpx

    log.info("RAG search — query: %.80s", query_text)

    # 1. Embedding de la requête
    vector = _embed_sync(query_text)

    # 2. Recherche Qdrant
    resp = httpx.post(
        f"{QDRANT_URL}/collections/{BRAIN_COLLECTION}/points/search",
        headers={"Content-Type": "application/json"},
        json={
            "vector":       vector,
            "limit":        RAG_TOP_K,
            "with_payload": True,
            "with_vector":  False,
            "score_threshold": RAG_MIN_SCORE,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    hits = resp.json().get("result", [])

    results = []
    for h in hits:
        pl = h.get("payload", {})
        results.append({
            "title":    pl.get("title", ""),
            "category": pl.get("category", ""),
            "content":  pl.get("content", "")[:600],  # tronque pour le prompt
            "score":    round(h.get("score", 0.0), 3),
        })
        log.info("  → [%.3f] %s (%s)", h["score"], pl.get("title", "?"), pl.get("category", "?"))

    if not results:
        log.info("  (aucun chunk au-dessus du seuil %.2f)", RAG_MIN_SCORE)

    return results


# ── Activité 2 : analyse lead avec contexte RAG ───────────────────────────────

@activity.defn(name="discover_zoho_leads_v2")
async def discover_zoho_leads_v2(lead_input: dict, brain_context: list[dict]) -> dict:
    """
    Analyse un lead Zoho CRM via LiteLLM (gemini-flash).
    Le system prompt est enrichi avec les chunks kubinote-brain les plus pertinents.

    Paramètres :
      lead_input    : {lead_id, raw_data, context}
      brain_context : liste de chunks retournée par search_brain_context
    """
    import httpx

    lead_id  = lead_input.get("lead_id", "unknown")
    raw_data = lead_input.get("raw_data", {})
    context  = lead_input.get("context", "")

    log.info("Analyse lead %s [contexte RAG: %d chunks]", lead_id, len(brain_context))

    # ── Construction du system prompt ────────────���─────────────────────────────
    base_system = (
        "Tu es un expert CRM et Marketing B2B pour Neomnia Studio. "
        "Tu analyses des leads Zoho avec précision et structure. "
        "Tu réponds UNIQUEMENT en JSON valide avec les clés : "
        "score (int 0-100), summary (str), next_action (str), tags (list[str]), "
        "qualification (str: SQL|MQL|cold)."
    )

    if brain_context:
        ctx_blocks = "\n\n".join(
            f"[{c['category'].upper()} — {c['title']}]\n{c['content']}"
            for c in brain_context
        )
        system_prompt = (
            f"{base_system}\n\n"
            f"=== CONTEXTE OPÉRATIONNEL (kubinote-brain) ===\n{ctx_blocks}\n"
            f"=== FIN CONTEXTE ==="
        )
    else:
        system_prompt = base_system

    # ── Construction du user prompt ────────────────────────────────────────────
    data_str = json.dumps(raw_data, ensure_ascii=False, indent=2)
    context_block = f"\nContexte additionnel : {context}" if context else ""
    user_prompt = (
        f"Lead ID : {lead_id}{context_block}\n\n"
        f"Données brutes Zoho CRM :\n```json\n{data_str}\n```\n\n"
        "Évalue ce lead selon les critères Neomnia (qualité > quantité, "
        "niveau technique avancé, données structurées). "
        "Retourne le JSON demandé."
    )

    # ── Appel LiteLLM ──────────────────────────────────────────────────────────
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={
                "Content-Type":  "application/json",
                "Authorization": f"Bearer {LITELLM_API_KEY}",
            },
            json={
                "model":       LITELLM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens":  600,
            },
        )
        resp.raise_for_status()

    raw_content = resp.json()["choices"][0]["message"]["content"]
    log.debug("LLM raw: %s", raw_content)
    parsed = _parse_json(raw_content)

    return {
        "lead_id":       lead_id,
        "score":         parsed.get("score", 0),
        "summary":       parsed.get("summary", ""),
        "next_action":   parsed.get("next_action", ""),
        "tags":          parsed.get("tags", []),
        "qualification": parsed.get("qualification", "cold"),
        "rag_chunks":    len(brain_context),
        "raw_response":  raw_content,
    }


def _parse_json(content: str) -> dict:
    content = content.strip()
    if "```" in content:
        start = content.find("{", content.find("```"))
        end   = content.rfind("}") + 1
        content = content[start:end]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        log.warning("JSON LLM non parseable")
        return {
            "score": 0, "summary": content[:200],
            "next_action": "Vérifier manuellement",
            "tags": [], "qualification": "cold",
        }


# ── Activité 3 : stockage du résultat dans kubinote-brain ─────────────────────

@activity.defn(name="store_lead_analysis")
async def store_lead_analysis(analysis: dict) -> str:
    """
    Vectorise le résumé de l'analyse et l'upsert dans kubinote-brain.
    Permet la recherche ultérieure sur l'historique des leads analysés.
    Retourne l'ID du point Qdrant créé.
    """
    import httpx

    lead_id = analysis.get("lead_id", "unknown")
    text    = f"Lead {lead_id}: {analysis.get('summary', '')} — {analysis.get('next_action', '')}"
    vector  = _embed_sync(text)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"lead-analysis-{lead_id}"))

    resp = httpx.put(
        f"{QDRANT_URL}/collections/{BRAIN_COLLECTION}/points",
        headers={"Content-Type": "application/json"},
        params={"wait": "true"},
        json={
            "points": [{
                "id":     point_id,
                "vector": vector,
                "payload": {
                    "type":          "lead_analysis",
                    "lead_id":       lead_id,
                    "score":         analysis.get("score", 0),
                    "qualification": analysis.get("qualification", "cold"),
                    "summary":       analysis.get("summary", ""),
                    "next_action":   analysis.get("next_action", ""),
                    "tags":          analysis.get("tags", []),
                    "source":        "zoho-discovery-v2",
                    "analyzed_at":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
            }]
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    log.info("Lead %s stocké dans kubinote-brain (id=%s)", lead_id, point_id)
    return point_id


# ── Workflow Phoenix ──────────────────────────────────────────────────────────

@workflow.defn(name="ZohoDiscoveryWorkflowV2")
class ZohoDiscoveryWorkflowV2:
    """
    Phoenix Workflow — RAG-augmented lead analysis.

    Séquence :
      1. search_brain_context  → contexte opérationnel depuis kubinote-brain
      2. discover_zoho_leads_v2 → analyse LLM avec contexte injecté
      3. store_lead_analysis   → résultat indexé dans kubinote-brain

    Input  : dict {lead_id, raw_data, context}
    Output : dict {lead_id, score, qualification, summary, next_action, tags, rag_chunks}
    """

    @workflow.run
    async def run(self, lead_input: dict) -> dict:
        raw_data = lead_input.get("raw_data", {})
        query    = json.dumps(raw_data, ensure_ascii=False)[:400]

        # 1. Recherche contextuelle dans kubinote-brain
        brain_context: list[dict] = await workflow.execute_activity(
            search_brain_context,
            query,
            start_to_close_timeout=timedelta(seconds=30),
        )

        # 2. Analyse avec contexte RAG
        analysis: dict = await workflow.execute_activity(
            discover_zoho_leads_v2,
            lead_input,
            brain_context,
            start_to_close_timeout=timedelta(seconds=60),
        )

        # 3. Stockage dans kubinote-brain
        await workflow.execute_activity(
            store_lead_analysis,
            analysis,
            start_to_close_timeout=timedelta(seconds=20),
        )

        workflow.logger.info(
            "Lead %s — score=%s | qualification=%s | rag=%s chunks",
            analysis.get("lead_id"),
            analysis.get("score"),
            analysis.get("qualification"),
            analysis.get("rag_chunks"),
        )

        return {k: v for k, v in analysis.items() if k != "raw_response"}


# ── Entrypoint ────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("zoho-discovery-v2 (Phoenix): Connexion Temporal → %s (ns: %s)",
             TEMPORAL_HOST, TEMPORAL_NAMESPACE)

    client = await Client.connect(TEMPORAL_HOST, namespace=TEMPORAL_NAMESPACE)

    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[ZohoDiscoveryWorkflowV2],
        activities=[
            search_brain_context,
            discover_zoho_leads_v2,
            store_lead_analysis,
        ],
    )

    log.info("Phoenix Worker démarré — task_queue='%s' | brain=%s | model=%s",
             TASK_QUEUE, BRAIN_COLLECTION, LITELLM_MODEL)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
