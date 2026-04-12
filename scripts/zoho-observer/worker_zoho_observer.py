#!/usr/bin/env python3
"""
worker_zoho_observer.py — Zoho Learning Observer · Neomnia Studio
=================================================================
Worker Temporal qui scanne périodiquement le portail neomniadotnet et
génère des 'Points d'Apprentissage' capturant le Style PM de Charles.

Flux (cron toutes les 15 min) :
  1. refresh_zoho_token()         → access token Zoho frais
  2. fetch_portal_delta()         → tâches/jalons modifiés depuis dernier scan
  3. generate_learning_point()    → analyse LLM de chaque changement
  4. store_learning_point()       → upsert dans Qdrant pm-experience
  5. update_cursor()              → sauvegarde le timestamp du dernier scan

Consolidation (on-demand) :
  consolidate_pm_experience()     → synthèse Style Neomnia → template JSON

Env vars :
  TEMPORAL_HOST           temporal.agent-system.svc.cluster.local:7233
  ZOHO_CLIENT_ID          depuis zoho-secrets
  ZOHO_CLIENT_SECRET      depuis zoho-secrets
  ZOHO_REFRESH_TOKEN      depuis zoho-secrets
  ZOHO_API_DOMAIN         https://www.zohoapis.com
  ZOHO_PORTAL_ID          809731782
  LITELLM_BASE_URL        http://litellm.cockpit.svc.cluster.local:4000
  LITELLM_MODEL           gemini-flash
  LITELLM_API_KEY         depuis zoho-secrets
  QDRANT_URL              http://qdrant.rag-system.svc.cluster.local:6333
  GEMINI_API_KEY          depuis zoho-secrets
  OBSERVER_ACTOR          Charles  (filtre sur l'acteur)
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

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("zoho-observer")

# ── Config ────────────────────────────────────────────────────────────────────

TEMPORAL_HOST      = os.getenv("TEMPORAL_HOST",      "temporal.agent-system.svc.cluster.local:7233")
TEMPORAL_NAMESPACE = os.getenv("TEMPORAL_NAMESPACE", "default")
ZOHO_CLIENT_ID     = os.getenv("ZOHO_CLIENT_ID",     "")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET", "")
ZOHO_REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN", "")
ZOHO_API_DOMAIN    = os.getenv("ZOHO_API_DOMAIN",    "https://www.zohoapis.com")
ZOHO_ACCOUNTS      = os.getenv("ZOHO_ACCOUNTS_SERVER","https://accounts.zoho.com")
ZOHO_PORTAL_ID     = os.getenv("ZOHO_PORTAL_ID",     "809731782")
OBSERVER_ACTOR     = os.getenv("OBSERVER_ACTOR",     "Charles")

LITELLM_BASE_URL   = os.getenv("LITELLM_BASE_URL",   "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_MODEL      = os.getenv("LITELLM_MODEL",      "gemini-flash")
LITELLM_API_KEY    = os.getenv("LITELLM_API_KEY",    "")
QDRANT_URL         = os.getenv("QDRANT_URL", "http://51.159.27.101:6333")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY",     "")

TASK_QUEUE        = "zoho-observer-queue"
PM_COLLECTION     = "pm-experience"
BRAIN_COLLECTION  = "kubinote-brain"
EMBED_DIMS        = 1536
CURSOR_POINT_ID   = "00000000-0000-0000-0000-000000000001"  # UUID fixe pour le curseur
PROJECTS_API_VER  = "3"


# ── Helpers (hors sandbox) ────────────────────────────────────────────────────

def _embed_sync(text: str) -> list[float]:
    import httpx
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={"content": {"parts": [{"text": text}]}, "outputDimensionality": EMBED_DIMS},
        timeout=20.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def _zoho_headers(access_token: str) -> dict:
    return {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "X-com-zoho-projects-version": PROJECTS_API_VER,
    }


# ── Activité 1 : refresh token Zoho ──────────────────────────────────────────

@activity.defn(name="refresh_zoho_token")
async def refresh_zoho_token() -> str:
    import httpx
    resp = httpx.post(
        f"{ZOHO_ACCOUNTS}/oauth/v2/token",
        data={
            "grant_type":    "refresh_token",
            "client_id":     ZOHO_CLIENT_ID,
            "client_secret": ZOHO_CLIENT_SECRET,
            "refresh_token": ZOHO_REFRESH_TOKEN,
        },
        timeout=15.0,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    log.info("Zoho token rafraîchi")
    return token


# ── Activité 2 : lecture curseur depuis Qdrant ────────────────────────────────

@activity.defn(name="get_observer_cursor")
async def get_observer_cursor() -> float:
    import httpx
    resp = httpx.post(
        f"{QDRANT_URL}/collections/{PM_COLLECTION}/points",
        headers={"Content-Type": "application/json"},
        json={"ids": [CURSOR_POINT_ID], "with_payload": True, "with_vector": False},
        timeout=10.0,
    )
    if resp.status_code == 200:
        pts = resp.json().get("result", [])
        if pts:
            ts = pts[0].get("payload", {}).get("last_scan_ts", 0.0)
            log.info("Curseur lu: %.0f", ts)
            return float(ts)
    # Premier démarrage — 24h en arrière
    default_ts = time.time() - 86400
    log.info("Pas de curseur — démarrage depuis -24h (%.0f)", default_ts)
    return default_ts


# ── Activité 3 : scan delta Zoho Projects ────────────────────────────────────

@activity.defn(name="fetch_portal_delta")
async def fetch_portal_delta(access_token: str, since_ts: float) -> list[dict]:
    """
    Récupère toutes les tâches modifiées depuis since_ts dans neomniadotnet.
    Filtre sur l'acteur contenant OBSERVER_ACTOR (Charles).
    """
    import httpx

    since_ms = int(since_ts * 1000)
    log.info("Scan portail %s depuis ts=%d", ZOHO_PORTAL_ID, since_ms)

    # Liste tous les projets
    projects_resp = httpx.get(
        f"https://projectsapi.zoho.com/restapi/portal/{ZOHO_PORTAL_ID}/projects/",
        headers=_zoho_headers(access_token),
        timeout=15.0,
    )
    projects_resp.raise_for_status()
    projects = projects_resp.json().get("projects", [])
    log.info("%d projets à scanner", len(projects))

    delta = []

    for proj in projects:
        proj_id   = proj["id"]
        proj_name = proj["name"]

        # Tâches du projet
        tasks_resp = httpx.get(
            f"https://projectsapi.zoho.com/restapi/portal/{ZOHO_PORTAL_ID}/projects/{proj_id}/tasks/",
            headers=_zoho_headers(access_token),
            params={"status": "all"},
            timeout=15.0,
        )
        if tasks_resp.status_code != 200:
            continue

        for task in tasks_resp.json().get("tasks", []):
            updated_ms = task.get("updated_time_long", 0)
            created_ms = task.get("created_time_long", 0)
            last_ms    = max(updated_ms, created_ms)

            if last_ms < since_ms:
                continue

            created_by = task.get("created_by", "")
            updated_by = task.get("updated_by", {}).get("name", "") if isinstance(task.get("updated_by"), dict) else str(task.get("updated_by", ""))

            actor = updated_by if updated_ms >= created_ms else created_by
            if OBSERVER_ACTOR.lower() not in actor.lower():
                continue

            action = "task_updated" if updated_ms > created_ms else "task_created"
            delta.append({
                "entity_type":  "task",
                "action":       action,
                "project_id":   proj_id,
                "project_name": proj_name,
                "entity_id":    task["id"],
                "entity_name":  task.get("name", ""),
                "actor":        actor,
                "timestamp_ms": last_ms,
                "details": {
                    "status":      task.get("status", {}).get("name", "") if isinstance(task.get("status"), dict) else str(task.get("status", "")),
                    "priority":    task.get("priority", ""),
                    "percent":     task.get("percent_complete", 0),
                    "description": str(task.get("description", ""))[:300],
                },
            })

        # Milestones du projet
        ms_resp = httpx.get(
            f"https://projectsapi.zoho.com/restapi/portal/{ZOHO_PORTAL_ID}/projects/{proj_id}/milestones/",
            headers=_zoho_headers(access_token),
            timeout=15.0,
        )
        if ms_resp.status_code == 200:
            for ms in ms_resp.json().get("milestones", []):
                updated_ms_ts = ms.get("updated_time_long", 0)
                if updated_ms_ts < since_ms:
                    continue
                delta.append({
                    "entity_type":  "milestone",
                    "action":       "milestone_updated",
                    "project_id":   proj_id,
                    "project_name": proj_name,
                    "entity_id":    ms["id"],
                    "entity_name":  ms.get("name", ""),
                    "actor":        OBSERVER_ACTOR,
                    "timestamp_ms": updated_ms_ts,
                    "details": {
                        "status":   ms.get("status", ""),
                        "flag":     ms.get("flag", ""),
                        "due_date": ms.get("end_date", ""),
                    },
                })

    log.info("Delta: %d événements filtrés pour %s", len(delta), OBSERVER_ACTOR)
    return delta


# ── Activité 4 : génération d'un Point d'Apprentissage ───────────────────────

@activity.defn(name="generate_learning_point")
async def generate_learning_point(event: dict) -> dict:
    import httpx

    system_prompt = (
        "Tu es un analyste PM expert qui observe les pratiques de gestion de projet de Charles "
        "dans le portail Neomnia Studio. Ton rôle est d'extraire des 'Points d'Apprentissage' "
        "qui capturent implicitement le 'Style Neomnia' : priorités, séquençage, types de livrables, "
        "standards de qualité.\n\n"
        "Pour chaque événement, génère un JSON avec :\n"
        "- learning_summary (str) : insight PM en 1-2 phrases\n"
        "- pattern_type (str) : ex. 'priorisation', 'séquençage', 'livrable', 'jalonnement', 'qualification'\n"
        "- pm_signals (list[str]) : signaux observés (ex. 'task_before_meeting', 'high_priority_on_discovery')\n"
        "- style_tags (list[str]) : tags Neomnia (ex. 'b2b', 'onboarding', 'senior_client', 'IA-first')\n"
        "- confidence (float 0-1) : confiance dans l'insight"
    )

    user_prompt = (
        f"Événement observé dans le projet '{event['project_name']}' :\n"
        f"- Action : {event['action']}\n"
        f"- Entité ({event['entity_type']}) : {event['entity_name']}\n"
        f"- Acteur : {event['actor']}\n"
        f"- Détails : {json.dumps(event['details'], ensure_ascii=False)}\n\n"
        "Génère le Point d'Apprentissage JSON."
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model": LITELLM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens":  400,
            },
        )
        resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"]
    parsed = _parse_json(raw)

    return {
        "type":            "pm_learning",
        "activity_id":     f"{event['project_id']}-{event['entity_id']}-{event['action']}",
        "project_name":    event["project_name"],
        "project_id":      event["project_id"],
        "entity_type":     event["entity_type"],
        "entity_name":     event["entity_name"],
        "action":          event["action"],
        "actor":           event["actor"],
        "timestamp_ms":    event["timestamp_ms"],
        "timestamp_iso":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(event["timestamp_ms"] / 1000)),
        "learning_summary": parsed.get("learning_summary", ""),
        "pattern_type":    parsed.get("pattern_type", "unknown"),
        "pm_signals":      parsed.get("pm_signals", []),
        "style_tags":      parsed.get("style_tags", []),
        "confidence":      parsed.get("confidence", 0.5),
        "details":         event["details"],
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
        return {}


# ── Activité 5 : stockage dans pm-experience ─────────────────────────────────

@activity.defn(name="store_learning_point")
async def store_learning_point(learning: dict) -> str:
    import httpx

    text = (
        f"[{learning['pattern_type']}] {learning['project_name']} — "
        f"{learning['entity_name']}: {learning['learning_summary']}"
    )
    vector   = _embed_sync(text)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, learning["activity_id"]))

    resp = httpx.put(
        f"{QDRANT_URL}/collections/{PM_COLLECTION}/points",
        headers={"Content-Type": "application/json"},
        params={"wait": "true"},
        json={"points": [{"id": point_id, "vector": vector, "payload": learning}]},
        timeout=15.0,
    )
    resp.raise_for_status()
    log.info("Learning point stocké: [%s] %s", learning["pattern_type"], learning["entity_name"])
    return point_id


# ── Activité 6 : mise à jour du curseur ──────────────────────────────────────

@activity.defn(name="update_observer_cursor")
async def update_observer_cursor(new_ts: float) -> None:
    import httpx

    # Vecteur nul — le curseur n'est pas cherché sémantiquement
    zero_vector = [0.0] * EMBED_DIMS

    resp = httpx.put(
        f"{QDRANT_URL}/collections/{PM_COLLECTION}/points",
        headers={"Content-Type": "application/json"},
        params={"wait": "true"},
        json={"points": [{
            "id":      CURSOR_POINT_ID,
            "vector":  zero_vector,
            "payload": {
                "type":         "cursor",
                "last_scan_ts": new_ts,
                "updated_at":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        }]},
        timeout=15.0,
    )
    resp.raise_for_status()
    log.info("Curseur mis à jour: ts=%.0f", new_ts)


# ── Activité 7 : Consolidation (on-demand) ───────────────────────────────────

@activity.defn(name="consolidate_pm_experience")
async def consolidate_pm_experience() -> dict:
    """
    Interroge toutes les learning points de pm-experience,
    synthétise le 'Style Neomnia' et génère un template de projet optimal.
    """
    import httpx

    # Recherche sémantique large — vecteur "gestion de projet Neomnia"
    query_vec = _embed_sync("gestion de projet style Neomnia priorités séquençage livrables")

    resp = httpx.post(
        f"{QDRANT_URL}/collections/{PM_COLLECTION}/points/search",
        headers={"Content-Type": "application/json"},
        json={
            "vector":       query_vec,
            "limit":        50,
            "with_payload": True,
            "with_vector":  False,
            "filter": {
                "must": [{"key": "type", "match": {"value": "pm_learning"}}]
            },
        },
        timeout=20.0,
    )
    resp.raise_for_status()
    hits = resp.json().get("result", [])

    if not hits:
        return {"error": "Pas encore assez de données dans pm-experience"}

    # Agrégation des signaux
    patterns: dict[str, int] = {}
    all_signals: list[str]   = []
    all_tags: list[str]      = []
    summaries: list[str]     = []

    for h in hits:
        pl = h.get("payload", {})
        if pl.get("type") != "pm_learning":
            continue
        pt = pl.get("pattern_type", "unknown")
        patterns[pt] = patterns.get(pt, 0) + 1
        all_signals.extend(pl.get("pm_signals", []))
        all_tags.extend(pl.get("style_tags", []))
        summaries.append(f"[{pt}] {pl.get('learning_summary', '')}")

    context = "\n".join(summaries[:30])

    # Synthèse LLM
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp_llm = await client.post(
            f"{LITELLM_BASE_URL}/v1/chat/completions",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={
                "model": LITELLM_MODEL,
                "messages": [{
                    "role": "system",
                    "content": (
                        "Tu es un expert PM qui analyse des patterns de gestion de projet "
                        "pour en extraire un template optimal. Réponds en JSON avec :\n"
                        "- style_name (str)\n"
                        "- key_principles (list[str]) : 5 principes clés\n"
                        "- typical_phases (list[dict]) : phases avec name, key_tasks (list), milestone\n"
                        "- priority_signals (list[str]) : comment Charles priorise\n"
                        "- template_confidence (float 0-1)"
                    ),
                }, {
                    "role": "user",
                    "content": f"Voici les {len(summaries)} points d'apprentissage observés :\n\n{context}\n\nSynthétise le Style Neomnia.",
                }],
                "temperature": 0.2,
                "max_tokens":  800,
            },
        )
        resp_llm.raise_for_status()

    raw = resp_llm.json()["choices"][0]["message"]["content"]
    template = _parse_json(raw)
    template["total_learning_points"] = len(hits)
    template["pattern_distribution"]  = patterns
    template["top_signals"]            = list(dict.fromkeys(all_signals))[:10]
    template["top_style_tags"]         = list(dict.fromkeys(all_tags))[:10]

    log.info("Consolidation: %d points → template généré (confidence=%.2f)",
             len(hits), template.get("template_confidence", 0))
    return template


# ── Workflow Observer (cron) ──────────────────────────────────────────────────

@workflow.defn(name="ZohoLearningObserverWorkflow")
class ZohoLearningObserverWorkflow:
    """
    Cron workflow — s'exécute toutes les 15 min.
    Scan le portail neomniadotnet, filtre les actions de Charles,
    génère et stocke les Points d'Apprentissage dans pm-experience.
    """

    @workflow.run
    async def run(self) -> dict:
        # 1. Refresh token
        access_token: str = await workflow.execute_activity(
            refresh_zoho_token,
            start_to_close_timeout=timedelta(seconds=20),
        )

        # 2. Curseur
        since_ts: float = await workflow.execute_activity(
            get_observer_cursor,
            start_to_close_timeout=timedelta(seconds=10),
        )

        # 3. Delta
        events: list[dict] = await workflow.execute_activity(
            fetch_portal_delta,
            access_token,
            since_ts,
            start_to_close_timeout=timedelta(seconds=60),
        )

        now_ts = time.time()
        stored = []

        # 4+5. Génère et stocke chaque learning point
        for event in events:
            learning: dict = await workflow.execute_activity(
                generate_learning_point,
                event,
                start_to_close_timeout=timedelta(seconds=30),
            )
            point_id: str = await workflow.execute_activity(
                store_learning_point,
                learning,
                start_to_close_timeout=timedelta(seconds=20),
            )
            stored.append(point_id)

        # 6. Mise à jour curseur
        await workflow.execute_activity(
            update_observer_cursor,
            now_ts,
            start_to_close_timeout=timedelta(seconds=10),
        )

        workflow.logger.info(
            "Observer cycle: %d événements → %d learning points stockés",
            len(events), len(stored),
        )
        return {"events_scanned": len(events), "learning_points_stored": len(stored)}


# ── Workflow Consolidation (on-demand) ───────────────────────────────────────

@workflow.defn(name="ZohoPMConsolidationWorkflow")
class ZohoPMConsolidationWorkflow:
    """Workflow on-demand — synthétise le Style Neomnia depuis pm-experience."""

    @workflow.run
    async def run(self) -> dict:
        result: dict = await workflow.execute_activity(
            consolidate_pm_experience,
            start_to_close_timeout=timedelta(seconds=90),
        )
        workflow.logger.info("Consolidation terminée: confidence=%.2f",
                             result.get("template_confidence", 0))
        return result


# ── Entrypoint ────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("zoho-observer: Connexion Temporal → %s", TEMPORAL_HOST)
    client = await Client.connect(TEMPORAL_HOST, namespace=TEMPORAL_NAMESPACE)

    # Démarre le cron workflow si pas déjà actif
    try:
        await client.start_workflow(
            "ZohoLearningObserverWorkflow",
            id="zoho-learning-observer-cron",
            task_queue=TASK_QUEUE,
            cron_schedule="*/15 * * * *",
        )
        log.info("Cron workflow démarré (*/15 * * * *)")
    except Exception as e:
        if "already" in str(e).lower() or "WorkflowExecutionAlreadyStarted" in str(e):
            log.info("Cron workflow déjà actif")
        else:
            log.warning("Impossible de démarrer le cron: %s", e)

    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[ZohoLearningObserverWorkflow, ZohoPMConsolidationWorkflow],
        activities=[
            refresh_zoho_token,
            get_observer_cursor,
            fetch_portal_delta,
            generate_learning_point,
            store_learning_point,
            update_observer_cursor,
            consolidate_pm_experience,
        ],
    )

    log.info("Observer Worker démarré — queue='%s' | portail=%s | actor=%s",
             TASK_QUEUE, ZOHO_PORTAL_ID, OBSERVER_ACTOR)
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
