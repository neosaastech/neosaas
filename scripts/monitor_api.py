"""
Monitor API — Protocole de communication inter-sidecar.

Un futur sidecar "Monitor" (scraping de logs K8s, events Prometheus…)
peut envoyer des alertes à ce sidecar "Orchestrateur" via POST /v1/monitor/alert.

Routes :
  GET  /v1/monitor/status                → santé du sous-système
  POST /v1/monitor/alert                 → alerte entrant → self-healing auto
  POST /v1/monitor/learn                 → stocker une expérience validée
  POST /v1/monitor/knowledge/search      → requête KB incidents
  POST /v1/monitor/knowledge/ingest      → ingérer les manifests YAML
  GET  /v1/monitor/knowledge/manifests   → chercher dans les manifests

Initialisation : appeler init_monitor(kb, healer) au démarrage de l'app.
"""
import logging
from typing import Optional

from fastapi  import APIRouter
from pydantic import BaseModel

log    = logging.getLogger("monitor-api")
router = APIRouter(prefix="/v1/monitor", tags=["monitor"])

# Injectés via init_monitor() — évite les imports circulaires
_kb:     "Optional[object]" = None  # KnowledgeDB
_healer: "Optional[object]" = None  # SelfHealingAgent


def init_monitor(kb, healer) -> None:
    """Appelé dans penpot_service.py après init de la DB et du router LLM."""
    global _kb, _healer
    _kb     = kb
    _healer = healer
    log.info("[MONITOR] Monitor API initialisée (kb=%s healer=%s)", type(kb).__name__, type(healer).__name__)


# ── Modèles Pydantic ──────────────────────────────────────────────────────────

class AlertRequest(BaseModel):
    source:    str           # Origine : "monitor-sidecar" | "k8s-event" | "prometheus"
    level:     str = "warn"  # debug | info | warn | error | critical
    message:   str           # Résumé lisible
    raw_logs:  str = ""      # Lignes de logs bruts pour le pattern matching
    namespace: str = ""      # Namespace K8s concerné
    resource:  str = ""      # ex. "deployment/penpot-sidecar"

class AlertResponse(BaseModel):
    received:    bool
    diagnosis:   str
    solution:    str
    source:      str            # pattern | kb | llm | error
    model_used:  Optional[str]
    fallback:    bool = False
    incident_id: Optional[int]  # id KB si auto-stocké
    latency_ms:  int = 0

class LearnRequest(BaseModel):
    error_context:    str
    ai_diagnosis:     str
    solution_applied: str
    success_result:   str = ""
    tags:             str = ""

class KnowledgeQuery(BaseModel):
    query: str
    top_k: int = 5


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
def monitor_status() -> dict:
    """Santé du sous-système monitor."""
    return {
        "monitor_api":  "ok",
        "kb_ready":     _kb     is not None,
        "healer_ready": _healer is not None,
        "kb_incidents": _kb.incident_count()  if _kb     else 0,
        "kb_manifests": _kb.manifest_count()  if _kb     else 0,
    }


@router.post("/alert", response_model=AlertResponse)
def receive_alert(req: AlertRequest) -> AlertResponse:
    """
    Reçoit une alerte d'un sidecar Monitor.
    Lance le diagnostic self-healing et retourne le résultat.
    Si l'IA est sollicitée, l'incident est auto-stocké en KB.
    """
    log.info("[MONITOR] Alerte reçue source=%r level=%s — %s", req.source, req.level, req.message[:80])

    if _healer is None:
        return AlertResponse(
            received=False, diagnosis="SelfHealingAgent non initialisé",
            solution="", source="error", model_used=None, incident_id=None
        )

    full_context = f"{req.message}\n{req.raw_logs}".strip()
    diag         = _healer.diagnose(full_context, req.namespace, req.resource)

    # Auto-apprentissage : si le LLM a été utilisé, on enregistre l'incident en KB
    incident_id: Optional[int] = None
    if diag["source"] == "llm" and _kb and diag["diagnosis"]:
        incident_id = _kb.store_incident(
            error_context=full_context[:500],
            ai_diagnosis=diag["diagnosis"],
            solution_applied=diag["solution"],
            success_result="",
            tags=f"{req.level},{diag.get('pattern_found') or 'unknown'}",
        )
        log.info("[MONITOR] Incident auto-stocké id=%s", incident_id)

    return AlertResponse(
        received=True,
        diagnosis=diag["diagnosis"],
        solution=diag["solution"],
        source=diag["source"],
        model_used=diag.get("model_used"),
        fallback=diag.get("fallback", False),
        incident_id=incident_id,
        latency_ms=diag.get("latency_ms", 0),
    )


@router.post("/learn")
def learn_incident(req: LearnRequest) -> dict:
    """
    Stocke une expérience d'incident validée par un humain ou un autre agent.
    Alimente la KB pour les diagnostics futurs (évite de solliciter le LLM).
    """
    if _kb is None:
        return {"stored": False, "error": "KnowledgeDB non initialisée"}
    iid = _kb.store_incident(
        req.error_context, req.ai_diagnosis,
        req.solution_applied, req.success_result, req.tags,
    )
    return {"stored": True, "incident_id": iid}


@router.post("/knowledge/search")
def search_knowledge(req: KnowledgeQuery) -> dict:
    """Requête la base d'incidents par mots-clés."""
    if _kb is None:
        return {"results": [], "error": "KnowledgeDB non initialisée"}
    results = _kb.search_incidents(req.query, req.top_k)
    return {"results": results, "count": len(results)}


@router.post("/knowledge/ingest")
def ingest_manifests() -> dict:
    """
    Déclenche l'ingestion des manifests YAML depuis ~/.kube/manifests.
    Idempotent — peut être appelé plusieurs fois (UPSERT).
    """
    if _kb is None:
        return {"ingested": 0, "error": "KnowledgeDB non initialisée"}
    count = _kb.ingest_manifests()
    return {"ingested": count, "total_manifests": _kb.manifest_count()}


@router.get("/knowledge/manifests")
def search_manifests(q: str = "", kind: str = "", name: str = "") -> dict:
    """Recherche dans les manifests K8s stockés en KB."""
    if _kb is None:
        return {"results": [], "error": "KnowledgeDB non initialisée"}
    results = _kb.search_manifests(q) if q else _kb.get_manifest(kind, name)
    return {"results": results, "count": len(results)}
