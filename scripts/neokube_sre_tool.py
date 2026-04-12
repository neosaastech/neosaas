"""
NeoKube SRE Executor — Open WebUI Tool
========================================
Pont entre Codestral (Mistral) et l'API Kubernetes de NeoKube.
Implémente un workflow Observe → Diagnose → Execute avec 3 niveaux de sécurité.

Niveaux d'action :
  Level 1 — Lecture seule  : logs, describe, status       → exécution automatique
  Level 2 — Patch/Restart  : rollout restart, annotations → exécution automatique
  Level 3 — Destructif     : scale 0, delete, force       → [REQUIRES_HUMAN_VALIDATION]

Installation dans Open WebUI :
  Workspace → Tools → + (Ajouter) → coller ce fichier

Dépendances (pip install dans le pod ou l'environnement Open WebUI) :
  mistralai>=1.0.0
  kubernetes>=28.0.0
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import time
from typing import Any

from pydantic import BaseModel

# ── Dépendances optionnelles ──────────────────────────────────────────────────
try:
    from mistralai import Mistral
    _MISTRAL_OK = True
except ImportError:
    _MISTRAL_OK = False

try:
    from kubernetes import client as k8s_client, config as k8s_config
    _K8S_OK = True
except ImportError:
    _K8S_OK = False

log = logging.getLogger("neokube-sre")

# ── Constantes ────────────────────────────────────────────────────────────────
CODESTRAL_MODEL   = "codestral-latest"
DEFAULT_NAMESPACE = "open-webui"
DEPLOY_NAME       = "penpot-sidecar"

# ── Prompt système NeoKube Admin-Executor ─────────────────────────────────────
_SRE_SYSTEM = """\
Tu es l'agent NeoKube-Admin-Executor, un expert SRE spécialisé en Kubernetes (K3s), Python 3.12 et orchestration d'IA.
Ton rôle est d'analyser l'infrastructure et de proposer des commandes de remédiation précises.

## Contexte de la stack
- Cluster    : K3s sur kubinote (linux/amd64)
- Namespace  : open-webui
- Cibles     : penpot-sidecar (FastAPI + LangGraph), neokube-state-pvc (SQLite)
- Namespaces secondaires : agent-system (Temporal), penpot (Penpot design)

## Règles opérationnelles
1. FORMAT : Réponds UNIQUEMENT en JSON valide sans markdown.
   Structure : {"level": 1|2|3, "cause": "...", "action": "...", "command": "...", "safe": true|false}
2. NIVEAUX :
   - level 1 : lecture seule (kubectl logs/describe/get) → safe=true
   - level 2 : patch non-destructif (rollout restart, patch annotation) → safe=true
   - level 3 : destructif (scale 0, delete, force) → safe=false, requiert validation humaine
3. COMMANDES : Produis des commandes bash ou snippets Python prêts à copier-coller.
4. CONCISION : État actuel → Cause probable → Commande de correction. Pas de prose.
5. RESSOURCES : Si tu génères du YAML, inclus toujours des resource limits (CPU/RAM).

## Erreurs connues à prioriser
- ImagePullBackOff   → vérifier imagePullPolicy et registry
- CrashLoopBackOff  → lire les logs du container, souvent pip install ou import error
- SQLite locked      → database is locked → rollout restart pour libérer le verrou
- OOMKilled          → memory limit trop basse → patch resources.limits.memory
- 429 Rate Limit LLM → backoff côté LangGraph, augmenter le délai inter-nœuds
"""


# =============================================================================
# K8sExecutor — Wrapping du SDK kubernetes et de subprocess kubectl
# =============================================================================

class K8sExecutor:
    """
    Exécute des opérations Kubernetes avec isolation par niveau de sécurité.
    Tente d'abord in-cluster config, puis KUBECONFIG local.
    """

    def __init__(self) -> None:
        self._ready = False
        if not _K8S_OK:
            log.warning("[K8S] kubernetes SDK manquant — mode kubectl subprocess uniquement")
            return
        try:
            k8s_config.load_incluster_config()
            self._ready = True
            log.info("[K8S] Config in-cluster chargée")
        except Exception:
            try:
                k8s_config.load_kube_config()
                self._ready = True
                log.info("[K8S] KUBECONFIG local chargé")
            except Exception as exc:
                log.warning(f"[K8S] Aucune config disponible : {exc}")

    # ── Niveau 1 — Lecture seule ──────────────────────────────────────────────

    def get_pod_logs(
        self,
        namespace: str = DEFAULT_NAMESPACE,
        label_selector: str = "app=penpot-sidecar",
        tail: int = 100,
        grep: str = "",
    ) -> str:
        """Récupère les logs du pod ciblé (kubectl logs)."""
        cmd = [
            "kubectl", "logs",
            "-n", namespace,
            "-l", label_selector,
            f"--tail={tail}",
        ]
        raw = self._run(cmd)
        if grep:
            lines = [l for l in raw.splitlines() if grep.lower() in l.lower()]
            return "\n".join(lines) or f"(aucune ligne contenant '{grep}')"
        return raw

    def describe_pod(
        self,
        namespace: str = DEFAULT_NAMESPACE,
        label_selector: str = "app=penpot-sidecar",
    ) -> str:
        """kubectl describe pod — utile pour ImagePullBackOff, OOMKilled."""
        cmd = ["kubectl", "describe", "pod", "-n", namespace, "-l", label_selector]
        return self._run(cmd)

    def get_deployment_status(
        self,
        name: str = DEPLOY_NAME,
        namespace: str = DEFAULT_NAMESPACE,
    ) -> dict:
        """Retourne le status JSON du deployment via le SDK."""
        if not (self._ready and _K8S_OK):
            out = self._run(["kubectl", "get", "deployment", name, "-n", namespace, "-o", "json"])
            try:
                return json.loads(out)
            except json.JSONDecodeError:
                return {"raw": out}
        apps = k8s_client.AppsV1Api()
        dep  = apps.read_namespaced_deployment(name=name, namespace=namespace)
        return {
            "name":               dep.metadata.name,
            "replicas":           dep.spec.replicas,
            "ready_replicas":     dep.status.ready_replicas or 0,
            "available_replicas": dep.status.available_replicas or 0,
            "conditions":         [
                {"type": c.type, "status": c.status, "reason": c.reason}
                for c in (dep.status.conditions or [])
            ],
        }

    def get_pvc_status(
        self,
        name: str = "neokube-state-pvc",
        namespace: str = DEFAULT_NAMESPACE,
    ) -> dict:
        """Status du PVC SQLite LangGraph."""
        if not (self._ready and _K8S_OK):
            out = self._run(["kubectl", "get", "pvc", name, "-n", namespace, "-o", "json"])
            try:
                return json.loads(out)
            except json.JSONDecodeError:
                return {"raw": out}
        v1  = k8s_client.CoreV1Api()
        pvc = v1.read_namespaced_persistent_volume_claim(name=name, namespace=namespace)
        return {
            "name":         pvc.metadata.name,
            "phase":        pvc.status.phase,
            "capacity":     pvc.status.capacity,
            "access_modes": pvc.status.access_modes,
        }

    # ── Niveau 2 — Patch non-destructif ───────────────────────────────────────

    def rollout_restart(
        self,
        name: str = DEPLOY_NAME,
        namespace: str = DEFAULT_NAMESPACE,
    ) -> dict:
        """
        Rollout restart du deployment — libère les verrous SQLite.
        Utilise le SDK pour ajouter une annotation kubectl.kubernetes.io/restartedAt.
        """
        if not (self._ready and _K8S_OK):
            cmd = ["kubectl", "rollout", "restart", f"deployment/{name}", "-n", namespace]
            return {"output": self._run(cmd)}

        apps  = k8s_client.AppsV1Api()
        patch = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                        }
                    }
                }
            }
        }
        apps.patch_namespaced_deployment(name=name, namespace=namespace, body=patch)
        log.info(f"[K8S] Rollout restart → deployment/{name} ({namespace})")
        return {"status": "ok", "action": f"rollout restart deployment/{name}", "namespace": namespace}

    def patch_resources(
        self,
        name: str = DEPLOY_NAME,
        namespace: str = DEFAULT_NAMESPACE,
        cpu_limit: str = "1000m",
        memory_limit: str = "1Gi",
        cpu_request: str = "200m",
        memory_request: str = "256Mi",
    ) -> dict:
        """Patch les resource limits/requests d'un deployment."""
        if not (self._ready and _K8S_OK):
            return {"error": "SDK kubernetes requis pour patch_resources"}

        apps  = k8s_client.AppsV1Api()
        patch = {
            "spec": {
                "template": {
                    "spec": {
                        "containers": [{
                            "name": name,
                            "resources": {
                                "limits":   {"cpu": cpu_limit,   "memory": memory_limit},
                                "requests": {"cpu": cpu_request, "memory": memory_request},
                            }
                        }]
                    }
                }
            }
        }
        apps.patch_namespaced_deployment(name=name, namespace=namespace, body=patch)
        return {
            "status":   "ok",
            "action":   "patch resources",
            "limits":   {"cpu": cpu_limit, "memory": memory_limit},
            "requests": {"cpu": cpu_request, "memory": memory_request},
        }

    # ── Niveau 3 — Destructif [REQUIRES_HUMAN_VALIDATION] ────────────────────

    def scale_deployment(
        self,
        name: str = DEPLOY_NAME,
        namespace: str = DEFAULT_NAMESPACE,
        replicas: int = 0,
    ) -> dict:
        """
        [REQUIRES_HUMAN_VALIDATION] Scale le deployment.
        replicas=0 équivaut à un arrêt complet.
        """
        if not (self._ready and _K8S_OK):
            cmd = ["kubectl", "scale", f"deployment/{name}", f"--replicas={replicas}", "-n", namespace]
            return {"output": self._run(cmd), "level": 3}

        apps  = k8s_client.AppsV1Api()
        apps.patch_namespaced_deployment_scale(
            name=name, namespace=namespace,
            body={"spec": {"replicas": replicas}}
        )
        return {"status": "ok", "action": f"scale deployment/{name} → {replicas}", "level": 3}

    # ── Interne ───────────────────────────────────────────────────────────────

    def _run(self, cmd: list[str], timeout: int = 15) -> str:
        """Exécute une commande kubectl en subprocess avec timeout."""
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout
            )
            return result.stdout + (f"\n[stderr] {result.stderr}" if result.stderr.strip() else "")
        except subprocess.TimeoutExpired:
            return f"[TIMEOUT] Commande interrompue après {timeout}s : {' '.join(cmd)}"
        except FileNotFoundError:
            return "[ERROR] kubectl introuvable dans le PATH"
        except Exception as exc:
            return f"[ERROR] {exc}"


# =============================================================================
# CodestralAgent — Appel LLM Codestral (Mistral API)
# =============================================================================

class CodestralAgent:
    """Wrapping de l'API Mistral pour Codestral."""

    def __init__(self, api_key: str) -> None:
        if not _MISTRAL_OK:
            raise RuntimeError(
                "mistralai SDK manquant. Installez : pip install mistralai>=1.0.0"
            )
        self._client = Mistral(api_key=api_key)

    def diagnose(self, context: str, model: str = CODESTRAL_MODEL) -> dict:
        """
        Soumet un contexte d'erreur à Codestral.
        Retourne un dict structuré : {level, cause, action, command, safe}.
        """
        response = self._client.chat.complete(
            model=model,
            messages=[
                {"role": "system",  "content": _SRE_SYSTEM},
                {"role": "user",    "content": context},
            ],
            response_format={"type": "json_object"},
            max_tokens=1024,
            temperature=0.1,   # faible température → moins d'hallucinations
        )
        raw_text = response.choices[0].message.content.strip()
        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            return {"level": 1, "cause": "parse error", "action": raw_text,
                    "command": "", "safe": True, "raw": raw_text}


# =============================================================================
# Open WebUI Tool — class Tools (format standard)
# =============================================================================

class Tools:
    """
    NeoKube SRE Executor
    Diagnostique et remédie les incidents K8s en faisant appel à Codestral.
    """

    class Valves(BaseModel):
        mistral_api_key: str = ""
        namespace:        str = DEFAULT_NAMESPACE
        deployment_name:  str = DEPLOY_NAME
        auto_execute_l2:  bool = True   # exécuter automatiquement les actions Level 2
        codestral_model:  str = CODESTRAL_MODEL

    def __init__(self) -> None:
        self.valves   = self.Valves(
            mistral_api_key=os.getenv("MISTRAL_API_KEY", ""),
        )
        self._k8s:    K8sExecutor | None    = None
        self._agent:  CodestralAgent | None = None

    # ── Lazy initializers ─────────────────────────────────────────────────────

    @property
    def k8s(self) -> K8sExecutor:
        if self._k8s is None:
            self._k8s = K8sExecutor()
        return self._k8s

    @property
    def agent(self) -> CodestralAgent:
        if self._agent is None:
            key = self.valves.mistral_api_key
            if not key:
                raise RuntimeError("MISTRAL_API_KEY manquante dans les Valves du Tool.")
            self._agent = CodestralAgent(api_key=key)
        return self._agent

    # ── Outils exposés à Open WebUI ──────────────────────────────────────────

    def observe_pod_logs(
        self,
        tail_lines: int = 100,
        grep_filter: str = "",
        __user__: dict = {},
    ) -> str:
        """
        [Level 1] Récupère les logs du penpot-sidecar.
        Filtre optionnel via grep_filter (ex: 'ERROR', 'SEO_CHECK', 'TIMEOUT').
        """
        logs = self.k8s.get_pod_logs(
            namespace=self.valves.namespace,
            label_selector=f"app={self.valves.deployment_name}",
            tail=tail_lines,
            grep=grep_filter,
        )
        return f"```\n{logs}\n```"

    def get_deployment_health(self, __user__: dict = {}) -> str:
        """
        [Level 1] Retourne le status complet du deployment penpot-sidecar et du PVC SQLite.
        """
        deploy = self.k8s.get_deployment_status(
            name=self.valves.deployment_name,
            namespace=self.valves.namespace,
        )
        pvc = self.k8s.get_pvc_status(namespace=self.valves.namespace)
        return json.dumps({"deployment": deploy, "pvc": pvc}, indent=2, ensure_ascii=False)

    def sre_diagnose(
        self,
        error_context: str,
        __user__: dict = {},
    ) -> str:
        """
        Workflow complet Observe → Diagnose (Codestral) → Execute.
        Fournit le contexte d'erreur (logs, describe, message) et l'agent propose + exécute la remédiation.

        Exemples d'error_context :
          "CrashLoopBackOff sur penpot-sidecar, logs : ImportError langgraph"
          "database is locked dans le nœud seo_check, thread_id=abc123"
          "429 Rate Limit Anthropic après 3 itérations du designer"
        """
        # ── Phase 1 : Collecte automatique de contexte ────────────────────────
        current_logs   = self.k8s.get_pod_logs(
            namespace=self.valves.namespace,
            label_selector=f"app={self.valves.deployment_name}",
            tail=50,
        )
        deploy_status  = self.k8s.get_deployment_status(
            name=self.valves.deployment_name,
            namespace=self.valves.namespace,
        )

        full_context = (
            f"## Rapport d'erreur\n{error_context}\n\n"
            f"## Status deployment\n{json.dumps(deploy_status, ensure_ascii=False)}\n\n"
            f"## Derniers logs (50 lignes)\n{current_logs[-3000:]}"
        )

        # ── Phase 2 : Diagnostic Codestral ────────────────────────────────────
        try:
            diagnosis = self.agent.diagnose(full_context, model=self.valves.codestral_model)
        except Exception as exc:
            return f"[CODESTRAL ERROR] {exc}"

        level   = diagnosis.get("level",   1)
        cause   = diagnosis.get("cause",   "inconnue")
        action  = diagnosis.get("action",  "")
        command = diagnosis.get("command", "")
        safe    = diagnosis.get("safe",    True)

        result_parts = [
            f"**Cause probable :** {cause}",
            f"**Action proposée :** {action}",
            f"**Niveau :** {level}  |  **Safe :** {safe}",
        ]

        if command:
            result_parts.append(f"**Commande :**\n```bash\n{command}\n```")

        # ── Phase 3 : Exécution selon le niveau ───────────────────────────────
        exec_result: Any = None

        if level == 2 and safe and self.valves.auto_execute_l2:
            # Heuristique : si la cause contient "locked" ou "restart" → rollout restart
            cause_low = cause.lower()
            if any(k in cause_low for k in ("locked", "restart", "crash", "oom")):
                exec_result = self.k8s.rollout_restart(
                    name=self.valves.deployment_name,
                    namespace=self.valves.namespace,
                )
                result_parts.append(
                    f"**Exécution automatique (L2) :**\n```json\n{json.dumps(exec_result, indent=2)}\n```"
                )
            else:
                result_parts.append(
                    "_Action Level 2 disponible mais heuristique non déclenchée — exécutez manuellement._"
                )

        elif level == 3 or not safe:
            result_parts.append(
                "\n> ⚠️  **[REQUIRES_HUMAN_VALIDATION]** — Cette action est de niveau 3 (destructive). "
                "Exécutez manuellement après validation."
            )

        return "\n\n".join(result_parts)

    def restart_sidecar(self, __user__: dict = {}) -> str:
        """
        [Level 2] Rollout restart du penpot-sidecar.
        Libère les verrous SQLite et force le rechargement du code depuis la ConfigMap.
        """
        result = self.k8s.rollout_restart(
            name=self.valves.deployment_name,
            namespace=self.valves.namespace,
        )
        return json.dumps(result, indent=2, ensure_ascii=False)

    def scale_sidecar_zero(self, __user__: dict = {}) -> str:
        """
        [Level 3 — REQUIRES_HUMAN_VALIDATION] Scale le penpot-sidecar à 0 réplicas.
        Arrêt complet du service. À utiliser uniquement pour maintenance planifiée.
        """
        return (
            "[REQUIRES_HUMAN_VALIDATION]\n\n"
            "Commande de scale à 0 :\n"
            f"```bash\n"
            f"kubectl scale deployment/{self.valves.deployment_name} "
            f"--replicas=0 -n {self.valves.namespace}\n"
            "```\n\n"
            "Exécutez manuellement dans votre terminal après validation."
        )
