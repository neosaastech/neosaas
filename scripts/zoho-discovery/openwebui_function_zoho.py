"""
title: Zoho Lead Analyzer (Phoenix Worker V2)
description: Analyse un lead Zoho CRM via le Phoenix Worker V2 (RAG + Gemini Flash). Lance un workflow Temporal ZohoDiscoveryWorkflowV2 et retourne score, qualification, next_action, tags.
author: Neomnia Studio
version: 1.0.0
requirements: requests
"""

import json
import time
import uuid
import base64
import requests
from pydantic import BaseModel, Field


TEMPORAL_HTTP  = "http://temporal.agent-system.svc.cluster.local:7243"
TEMPORAL_NS    = "default"
TASK_QUEUE     = "zoho-discovery-queue"
WORKFLOW_TYPE  = "ZohoDiscoveryWorkflowV2"
POLL_INTERVAL  = 2    # secondes entre chaque polling
MAX_WAIT       = 60   # timeout max en secondes


def _b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


def _start_workflow(lead_input: dict) -> tuple[str, str]:
    """Lance le workflow et retourne (workflowId, runId)."""
    workflow_id = f"lead-owui-{uuid.uuid4().hex[:12]}"
    payload = {
        "workflowId": workflow_id,
        "workflowType": {"name": WORKFLOW_TYPE},
        "taskQueue":    {"name": TASK_QUEUE},
        "input": {
            "payloads": [{
                "metadata": {"encoding": _b64("json/plain")},
                "data":     _b64(json.dumps(lead_input, ensure_ascii=False)),
            }]
        },
    }
    resp = requests.post(
        f"{TEMPORAL_HTTP}/api/v1/namespaces/{TEMPORAL_NS}/workflows",
        json=payload,
        timeout=10,
    )
    resp.raise_for_status()
    run_id = resp.json().get("runId", "")
    return workflow_id, run_id


def _poll_result(workflow_id: str, run_id: str) -> dict | None:
    """Interroge le statut du workflow jusqu'à completion."""
    deadline = time.time() + MAX_WAIT
    while time.time() < deadline:
        resp = requests.get(
            f"{TEMPORAL_HTTP}/api/v1/namespaces/{TEMPORAL_NS}/workflows/{workflow_id}/runs/{run_id}",
            timeout=10,
        )
        if resp.status_code != 200:
            time.sleep(POLL_INTERVAL)
            continue

        data   = resp.json()
        status = data.get("workflowExecutionInfo", {}).get("status", "")

        if status == "WORKFLOW_EXECUTION_STATUS_COMPLETED":
            # Récupère le résultat depuis l'historique
            hist = requests.get(
                f"{TEMPORAL_HTTP}/api/v1/namespaces/{TEMPORAL_NS}/workflows/{workflow_id}"
                f"/runs/{run_id}/history?maximumPageSize=5&reverseOrder=true",
                timeout=10,
            ).json()
            for event in hist.get("history", {}).get("events", []):
                if event.get("eventType") == "EVENT_TYPE_WORKFLOW_EXECUTION_COMPLETED":
                    result_payloads = (
                        event.get("workflowExecutionCompletedEventAttributes", {})
                             .get("result", {})
                             .get("payloads", [])
                    )
                    if result_payloads:
                        raw = base64.b64decode(result_payloads[0]["data"]).decode()
                        return json.loads(raw)
            return {}

        if status in ("WORKFLOW_EXECUTION_STATUS_FAILED",
                      "WORKFLOW_EXECUTION_STATUS_TIMED_OUT",
                      "WORKFLOW_EXECUTION_STATUS_TERMINATED"):
            return {"error": f"Workflow terminé avec statut : {status}"}

        time.sleep(POLL_INTERVAL)

    return {"error": f"Timeout ({MAX_WAIT}s) — workflow toujours en cours"}


class Tools:
    class Valves(BaseModel):
        temporal_http: str = Field(
            default=TEMPORAL_HTTP,
            description="URL HTTP de l'API Temporal (port 7243)",
        )
        max_wait_seconds: int = Field(
            default=MAX_WAIT,
            description="Timeout max pour l'attente du résultat (secondes)",
        )

    def __init__(self):
        self.valves = self.Valves()

    def analyze_lead(
        self,
        lead_id: str,
        company: str = "",
        contact_name: str = "",
        email: str = "",
        phone: str = "",
        industry: str = "",
        notes: str = "",
    ) -> str:
        """
        Analyse un lead Zoho CRM via le Phoenix Worker V2 (RAG + Gemini Flash).
        Lance un workflow Temporal et retourne l'analyse complète.

        :param lead_id: Identifiant unique du lead (ex: ZOHO-001 ou un nom)
        :param company: Nom de l'entreprise
        :param contact_name: Nom du contact
        :param email: Email du contact
        :param phone: Téléphone
        :param industry: Secteur d'activité
        :param notes: Notes ou contexte additionnel
        :return: Analyse JSON : score, qualification (SQL/MQL/cold), summary, next_action, tags
        """
        lead_input = {
            "lead_id": lead_id,
            "raw_data": {
                "company":      company,
                "contact_name": contact_name,
                "email":        email,
                "phone":        phone,
                "industry":     industry,
            },
            "context": notes,
        }

        try:
            workflow_id, run_id = _start_workflow(lead_input)
        except Exception as e:
            return f"❌ Erreur au lancement du workflow : {e}"

        result = _poll_result(workflow_id, run_id)
        if result is None:
            return "❌ Aucun résultat retourné."

        if "error" in result:
            return f"❌ {result['error']}"

        score         = result.get("score", "?")
        qualification = result.get("qualification", "?")
        summary       = result.get("summary", "")
        next_action   = result.get("next_action", "")
        tags          = ", ".join(result.get("tags", []))
        rag_chunks    = result.get("rag_chunks", 0)

        return (
            f"## Analyse Lead — {lead_id}\n\n"
            f"**Score :** {score}/100  \n"
            f"**Qualification :** `{qualification}`  \n"
            f"**Résumé :** {summary}\n\n"
            f"**Prochaine action :** {next_action}\n\n"
            f"**Tags :** {tags}  \n"
            f"**Contexte RAG injecté :** {rag_chunks} chunk(s) kubinote-brain"
        )
