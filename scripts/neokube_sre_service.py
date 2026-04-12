#!/usr/bin/env python3
"""
NeoKube SRE Agent v2.0 — Agentic loop + Full Scaleway coverage
===============================================================
Architecture :
  User → FastAPI → SREAgent
                      ↓
              Collect K8s state
                      ↓
              [AGENTIC LOOP]
              Mistral tool_call → execute_tool() → feed result → loop
                      ↓
              Final response (markdown, français)

Niveaux de sécurité :
  L1 — Lecture seule       → auto-exécuté
  L2 — Écriture safe       → auto-exécuté + audit log
  L3 — Destructif          → bloqué sauf si message contient CONFIRMER

Scaleway services couverts :
  Compute (instances), Object Storage (S3), Kubernetes Kapsule,
  Transactional Email (TEM), DNS, Databases RDB, Serverless Functions,
  Serverless Containers, Load Balancers, VPC, IAM, Billing
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import time
import uuid
from typing import Any, Iterator

import urllib.request
import urllib.error
import urllib.parse
import uvicorn
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

# ── LLM client : LiteLLM proxy (OpenAI-compatible) ou Mistral direct ─────────
# Priorité : LITELLM_BASE_URL si défini → appels via le proxy centralisé
# Fallback  : Mistral SDK direct si MISTRAL_API_KEY présent
try:
    from openai import OpenAI as _OpenAIClient
    _OPENAI_SDK_OK = True
except ImportError:
    _OPENAI_SDK_OK = False

try:
    from mistralai.client import Mistral
    _MISTRAL_OK = True
except ImportError:
    try:
        from mistralai import Mistral
        _MISTRAL_OK = True
    except ImportError:
        _MISTRAL_OK = False

# ── Kubernetes SDK ────────────────────────────────────────────────────────────
try:
    from kubernetes import client as k8s_client, config as k8s_config
    _K8S_OK = True
except ImportError:
    _K8S_OK = False

# ── Configuration ─────────────────────────────────────────────────────────────
MISTRAL_API_KEY       = os.getenv("MISTRAL_API_KEY", "")
LITELLM_BASE_URL      = os.getenv("LITELLM_BASE_URL", "")   # ex: http://litellm.cockpit.svc.cluster.local:4000
LITELLM_API_KEY       = os.getenv("LITELLM_API_KEY", "")    # master key LiteLLM
SCW_SECRET_KEY        = os.getenv("SCW_SECRET_KEY", "")
SCW_ACCESS_KEY        = os.getenv("SCW_ACCESS_KEY", "")
SCW_DEFAULT_PROJECT   = os.getenv("SCW_DEFAULT_PROJECT_ID", "473a0ce6-ecd8-4374-8f49-9a6e347d0c8d")
SCW_DEFAULT_REGION    = os.getenv("SCW_DEFAULT_REGION", "fr-par")
SCW_DEFAULT_ZONE      = os.getenv("SCW_DEFAULT_ZONE", "fr-par-1")
SRE_MODEL             = os.getenv("SRE_MODEL", "mistral")   # nom du modèle dans LiteLLM
LOG_LEVEL             = os.getenv("LOG_LEVEL", "INFO")
MAX_TOOL_ITERATIONS   = int(os.getenv("MAX_TOOL_ITERATIONS", "12"))

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("neokube-sre")

# ── System Prompt ─────────────────────────────────────────────────────────────
SRE_SYSTEM = """\
Tu es NeoKube-SRE, l'agent d'infrastructure expert de Neomnia.
Tu gères la plateforme NeoKube (K3s on-premise) et les ressources Scaleway cloud.
Tu es un ADMINISTRATEUR SYSTÈME qui AGIT — pas un conseiller théorique.

## Stack NeoKube
- Node      : kubinote (K3s v1.34.6, linux/amd64, Ubuntu 25.10)
- Namespaces: open-webui, cockpit, penpot, agent-system, rag-system, management
- Cloud     : Scaleway — région fr-par, projet 473a0ce6
- Qdrant    : http://51.159.27.101:6333 (Kapsule)
- Répo Git  : /home/neokube-beta (branche main)

## RÈGLE ABSOLUE — EXÉCUTION AVANT TOUT
Quand l'utilisateur demande une action sur le système (git, shell, kubectl, fichier, API),
tu DOIS utiliser l'outil correspondant IMMÉDIATEMENT.
INTERDIT de répondre "je ne peux pas" ou "voici comment faire" sans avoir d'abord tenté l'outil.
Si l'outil échoue, explique l'erreur avec la sortie réelle.

## Règles fondamentales
1. Réponds TOUJOURS en français, en markdown structuré.
2. TOUJOURS utiliser les outils pour obtenir des données RÉELLES — jamais de fabrication.
3. Structure chaque réponse : **Exécution** → **Résultat** → **Analyse** → **Suite**.
4. Chaîne les appels d'outils sans demander confirmation intermédiaire (sauf L3).
5. Pour git : utilise `shell_exec` avec `git -C /home/neokube-beta <commande>`.
6. Pour les fichiers : utilise `file_read` / `file_write` directement.

## Niveaux de sécurité
- **L1** (lecture) : exécution automatique — logs, describe, list, get, git status, git log
- **L2** (écriture safe) : exécution automatique avec audit — restart, scale up, patch, git commit, git push
- **L3** (destructif) : BLOQUÉ par défaut — delete, scale 0, wipe, rm -rf
  → L3 débloqué uniquement si l'utilisateur écrit explicitement **CONFIRMER**

## Workflow d'action
1. Exécuter l'outil adapté (shell_exec, k8s_*, scw_*, file_*)
2. Analyser le résultat réel
3. Enchaîner les outils si nécessaire
4. Rapporter le résultat final avec la sortie brute
"""

# =============================================================================
# ScalewayClient — API REST Scaleway complète
# =============================================================================

class ScalewayClient:
    """Client HTTP Scaleway REST API. Auth via X-Auth-Token (secret_key)."""

    BASE = "https://api.scaleway.com"
    S3_BASE = "https://s3.{region}.scw.cloud"

    def __init__(self, secret_key: str, project_id: str, region: str, zone: str) -> None:
        self.secret_key = secret_key
        self.project_id = project_id
        self.region     = region
        self.zone       = zone

    def _get(self, path: str, params: dict | None = None) -> dict:
        url = self.BASE + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"X-Auth-Token": self.secret_key})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            return {"error": e.code, "message": e.read().decode()[:500]}
        except Exception as e:
            return {"error": str(e)}

    def _post(self, path: str, body: dict) -> dict:
        data = json.dumps(body).encode()
        req  = urllib.request.Request(
            self.BASE + path, data=data,
            headers={"X-Auth-Token": self.secret_key, "Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            return {"error": e.code, "message": e.read().decode()[:500]}
        except Exception as e:
            return {"error": str(e)}

    def _patch(self, path: str, body: dict) -> dict:
        data = json.dumps(body).encode()
        req  = urllib.request.Request(
            self.BASE + path, data=data,
            headers={"X-Auth-Token": self.secret_key, "Content-Type": "application/json"},
            method="PATCH"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            return {"error": e.code, "message": e.read().decode()[:500]}
        except Exception as e:
            return {"error": str(e)}

    def _delete(self, path: str) -> dict:
        req = urllib.request.Request(
            self.BASE + path,
            headers={"X-Auth-Token": self.secret_key},
            method="DELETE"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                body = r.read()
                return json.loads(body) if body else {"status": "deleted"}
        except urllib.error.HTTPError as e:
            return {"error": e.code, "message": e.read().decode()[:500]}
        except Exception as e:
            return {"error": str(e)}

    # ── Compute ───────────────────────────────────────────────────────────────

    def list_instances(self, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._get(f"/instance/v1/zones/{z}/servers",
                         {"project": self.project_id})

    def get_instance(self, server_id: str, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._get(f"/instance/v1/zones/{z}/servers/{server_id}")

    def perform_server_action(self, server_id: str, action: str, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._post(f"/instance/v1/zones/{z}/servers/{server_id}/action",
                          {"action": action})

    def delete_instance(self, server_id: str, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._delete(f"/instance/v1/zones/{z}/servers/{server_id}")

    def list_volumes(self, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._get(f"/instance/v1/zones/{z}/volumes",
                         {"project": self.project_id})

    def list_ips(self, zone: str | None = None) -> dict:
        z = zone or self.zone
        return self._get(f"/instance/v1/zones/{z}/ips",
                         {"project": self.project_id})

    # ── Object Storage (S3) ───────────────────────────────────────────────────

    def list_buckets(self) -> dict:
        """Liste les buckets via l'API Scaleway Object Storage."""
        return self._get(f"/object-storage/v1/regions/{self.region}/buckets",
                         {"project_id": self.project_id})

    def get_bucket(self, bucket_name: str) -> dict:
        return self._get(f"/object-storage/v1/regions/{self.region}/buckets/{bucket_name}")

    def delete_bucket(self, bucket_name: str) -> dict:
        return self._delete(f"/object-storage/v1/regions/{self.region}/buckets/{bucket_name}")

    # ── Kubernetes Kapsule ────────────────────────────────────────────────────

    def list_k8s_clusters(self) -> dict:
        return self._get(f"/k8s/v1/regions/{self.region}/clusters",
                         {"project_id": self.project_id})

    def get_k8s_cluster(self, cluster_id: str) -> dict:
        return self._get(f"/k8s/v1/regions/{self.region}/clusters/{cluster_id}")

    def list_k8s_pools(self, cluster_id: str) -> dict:
        return self._get(f"/k8s/v1/regions/{self.region}/clusters/{cluster_id}/pools")

    def scale_k8s_pool(self, cluster_id: str, pool_id: str, size: int) -> dict:
        return self._patch(
            f"/k8s/v1/regions/{self.region}/clusters/{cluster_id}/pools/{pool_id}",
            {"size": size}
        )

    def upgrade_k8s_cluster(self, cluster_id: str, version: str) -> dict:
        return self._post(
            f"/k8s/v1/regions/{self.region}/clusters/{cluster_id}/upgrade",
            {"version": version}
        )

    def delete_k8s_cluster(self, cluster_id: str) -> dict:
        return self._delete(f"/k8s/v1/regions/{self.region}/clusters/{cluster_id}")

    # ── Transactional Email (TEM) ─────────────────────────────────────────────

    def list_tem_domains(self) -> dict:
        return self._get(
            f"/transactional-email/v1alpha1/regions/{self.region}/domains",
            {"project_id": self.project_id}
        )

    def get_tem_domain(self, domain_id: str) -> dict:
        return self._get(f"/transactional-email/v1alpha1/regions/{self.region}/domains/{domain_id}")

    def list_tem_emails(self, domain_id: str | None = None, limit: int = 20) -> dict:
        params: dict = {"project_id": self.project_id, "page_size": limit}
        if domain_id:
            params["domain_id"] = domain_id
        return self._get(f"/transactional-email/v1alpha1/regions/{self.region}/emails", params)

    def get_tem_statistics(self) -> dict:
        return self._get(
            f"/transactional-email/v1alpha1/regions/{self.region}/statistics",
            {"project_id": self.project_id}
        )

    def create_tem_domain(self, domain_name: str) -> dict:
        return self._post(
            f"/transactional-email/v1alpha1/regions/{self.region}/domains",
            {"name": domain_name, "project_id": self.project_id}
        )

    # ── DNS ───────────────────────────────────────────────────────────────────

    def list_dns_zones(self) -> dict:
        return self._get("/domain/v2beta1/dns-zones",
                         {"project_id": self.project_id})

    def list_dns_records(self, dns_zone: str) -> dict:
        return self._get(f"/domain/v2beta1/dns-zones/{dns_zone}/records")

    def add_dns_record(self, dns_zone: str, name: str, record_type: str,
                       data: str, ttl: int = 300) -> dict:
        return self._post(
            f"/domain/v2beta1/dns-zones/{dns_zone}/records",
            {"changes": [{"add": {"records": [
                {"name": name, "type": record_type, "data": data, "ttl": ttl}
            ]}}]}
        )

    def delete_dns_record(self, dns_zone: str, record_id: str) -> dict:
        return self._delete(f"/domain/v2beta1/dns-zones/{dns_zone}/records/{record_id}")

    # ── Databases RDB ─────────────────────────────────────────────────────────

    def list_databases(self) -> dict:
        return self._get(f"/rdb/v1/regions/{self.region}/instances",
                         {"project_id": self.project_id})

    def get_database(self, instance_id: str) -> dict:
        return self._get(f"/rdb/v1/regions/{self.region}/instances/{instance_id}")

    def restart_database(self, instance_id: str) -> dict:
        return self._post(f"/rdb/v1/regions/{self.region}/instances/{instance_id}/restart", {})

    def delete_database(self, instance_id: str) -> dict:
        return self._delete(f"/rdb/v1/regions/{self.region}/instances/{instance_id}")

    def list_db_backups(self, instance_id: str) -> dict:
        return self._get(f"/rdb/v1/regions/{self.region}/backups",
                         {"instance_id": instance_id})

    # ── Serverless Functions ──────────────────────────────────────────────────

    def list_function_namespaces(self) -> dict:
        return self._get(f"/functions/v1beta1/regions/{self.region}/namespaces",
                         {"project_id": self.project_id})

    def list_functions(self, namespace_id: str) -> dict:
        return self._get(f"/functions/v1beta1/regions/{self.region}/functions",
                         {"namespace_id": namespace_id})

    def deploy_function(self, function_id: str) -> dict:
        return self._post(
            f"/functions/v1beta1/regions/{self.region}/functions/{function_id}/deploy", {}
        )

    # ── Serverless Containers ─────────────────────────────────────────────────

    def list_container_namespaces(self) -> dict:
        return self._get(f"/containers/v1beta1/regions/{self.region}/namespaces",
                         {"project_id": self.project_id})

    def list_containers(self, namespace_id: str) -> dict:
        return self._get(f"/containers/v1beta1/regions/{self.region}/containers",
                         {"namespace_id": namespace_id})

    def deploy_container(self, container_id: str) -> dict:
        return self._post(
            f"/containers/v1beta1/regions/{self.region}/containers/{container_id}/deploy", {}
        )

    # ── Load Balancers ────────────────────────────────────────────────────────

    def list_load_balancers(self) -> dict:
        return self._get(f"/lb/v1/regions/{self.region}/lbs",
                         {"project_id": self.project_id})

    def get_load_balancer(self, lb_id: str) -> dict:
        return self._get(f"/lb/v1/regions/{self.region}/lbs/{lb_id}")

    def list_lb_backends(self, lb_id: str) -> dict:
        return self._get(f"/lb/v1/regions/{self.region}/lbs/{lb_id}/backends")

    # ── VPC ───────────────────────────────────────────────────────────────────

    def list_vpcs(self) -> dict:
        return self._get(f"/vpc/v2/regions/{self.region}/vpcs",
                         {"project_id": self.project_id})

    def list_subnets(self, vpc_id: str) -> dict:
        return self._get(f"/vpc/v2/regions/{self.region}/vpcs/{vpc_id}/subnets")

    # ── IAM ───────────────────────────────────────────────────────────────────

    def list_api_keys(self) -> dict:
        return self._get("/iam/v1alpha1/api-keys",
                         {"project_id": self.project_id})

    def get_api_key(self, access_key: str) -> dict:
        return self._get(f"/iam/v1alpha1/api-keys/{access_key}")

    def list_iam_policies(self) -> dict:
        return self._get("/iam/v1alpha1/policies",
                         {"project_id": self.project_id})

    # ── Billing ───────────────────────────────────────────────────────────────

    def get_current_consumption(self) -> dict:
        return self._get("/billing/v2beta1/consumptions",
                         {"project_id": self.project_id})

    def list_invoices(self) -> dict:
        return self._get("/billing/v2beta1/invoices")


# =============================================================================
# K8sExecutor — Kubernetes (kubectl subprocess + SDK)
# =============================================================================

class K8sExecutor:

    def __init__(self) -> None:
        self._ready = False
        if not _K8S_OK:
            return
        try:
            k8s_config.load_incluster_config()
            self._ready = True
        except Exception:
            try:
                k8s_config.load_kube_config()
                self._ready = True
            except Exception:
                pass

    def run(self, cmd: list[str], timeout: int = 20) -> str:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
            out = r.stdout.strip()
            if r.stderr.strip():
                out += f"\n[stderr] {r.stderr.strip()}"
            return out or "(aucune sortie)"
        except subprocess.TimeoutExpired:
            return f"[TIMEOUT] {' '.join(cmd)}"
        except FileNotFoundError:
            return "[ERROR] kubectl introuvable"
        except Exception as e:
            return f"[ERROR] {e}"

    def get_pods(self, namespace: str = "--all-namespaces") -> str:
        if namespace == "--all-namespaces":
            return self.run(["kubectl", "get", "pods", "--all-namespaces", "-o", "wide"])
        return self.run(["kubectl", "get", "pods", "-n", namespace, "-o", "wide"])

    def get_events(self, namespace: str = "--all-namespaces", warning_only: bool = True) -> str:
        cmd = ["kubectl", "get", "events"]
        if namespace == "--all-namespaces":
            cmd.append("--all-namespaces")
        else:
            cmd += ["-n", namespace]
        if warning_only:
            cmd += ["--field-selector=type=Warning"]
        cmd += ["--sort-by=.lastTimestamp"]
        return self.run(cmd)

    def get_logs(self, namespace: str, label: str, tail: int = 100, grep: str = "") -> str:
        out = self.run(["kubectl", "logs", "-n", namespace, "-l", label,
                        f"--tail={tail}", "--prefix=true"])
        if grep:
            lines = [l for l in out.splitlines() if grep.lower() in l.lower()]
            return "\n".join(lines) or f"(aucune ligne avec '{grep}')"
        return out

    def describe(self, resource: str, name: str, namespace: str) -> str:
        return self.run(["kubectl", "describe", resource, name, "-n", namespace])

    def get_deployments(self, namespace: str = "--all-namespaces") -> str:
        if namespace == "--all-namespaces":
            return self.run(["kubectl", "get", "deployments", "--all-namespaces"])
        return self.run(["kubectl", "get", "deployments", "-n", namespace])

    def get_nodes(self) -> str:
        return self.run(["kubectl", "get", "nodes", "-o", "wide"])

    def get_resource_usage(self) -> str:
        return self.run(["kubectl", "top", "nodes"]) + "\n" + \
               self.run(["kubectl", "top", "pods", "--all-namespaces", "--sort-by=memory"])

    def rollout_restart(self, deployment: str, namespace: str) -> str:
        return self.run(["kubectl", "rollout", "restart",
                         f"deployment/{deployment}", "-n", namespace])

    def scale(self, deployment: str, namespace: str, replicas: int) -> str:
        return self.run(["kubectl", "scale", f"deployment/{deployment}",
                         f"--replicas={replicas}", "-n", namespace])

    def patch_resources(self, deployment: str, namespace: str,
                        cpu_limit: str, memory_limit: str) -> str:
        patch = json.dumps({
            "spec": {"template": {"spec": {"containers": [{
                "name": deployment,
                "resources": {"limits": {"cpu": cpu_limit, "memory": memory_limit}}
            }]}}}
        })
        return self.run(["kubectl", "patch", "deployment", deployment,
                         "-n", namespace, "--patch", patch])

    def delete_resource(self, resource: str, name: str, namespace: str) -> str:
        return self.run(["kubectl", "delete", resource, name, "-n", namespace])

    def apply_yaml(self, yaml_content: str) -> str:
        import tempfile, os
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(yaml_content)
            fname = f.name
        out = self.run(["kubectl", "apply", "-f", fname])
        os.unlink(fname)
        return out


# =============================================================================
# Définitions des outils (format Mistral function calling)
# =============================================================================

TOOLS: list[dict] = [
    # ── K8s L1 ────────────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "k8s_get_pods",
        "description": "[L1] Liste tous les pods d'un namespace ou de tout le cluster avec leur statut.",
        "parameters": {"type": "object", "properties": {
            "namespace": {"type": "string",
                          "description": "Namespace cible ou '--all-namespaces' (défaut)"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "k8s_get_events",
        "description": "[L1] Récupère les events Kubernetes. warning_only=true pour filtrer les erreurs.",
        "parameters": {"type": "object", "properties": {
            "namespace": {"type": "string", "description": "Namespace ou '--all-namespaces'"},
            "warning_only": {"type": "boolean", "description": "Filtrer uniquement les warnings (défaut: true)"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "k8s_get_logs",
        "description": "[L1] Récupère les logs d'un pod par label selector.",
        "parameters": {"type": "object", "properties": {
            "namespace": {"type": "string", "description": "Namespace du pod"},
            "label": {"type": "string", "description": "Label selector (ex: app=open-webui)"},
            "tail": {"type": "integer", "description": "Nombre de lignes (défaut: 100)"},
            "grep": {"type": "string", "description": "Filtre optionnel sur le contenu"}
        }, "required": ["namespace", "label"]}}},
    {"type": "function", "function": {
        "name": "k8s_describe",
        "description": "[L1] kubectl describe sur n'importe quelle ressource.",
        "parameters": {"type": "object", "properties": {
            "resource": {"type": "string", "description": "Type de ressource (pod, deployment, service, pvc...)"},
            "name": {"type": "string", "description": "Nom de la ressource"},
            "namespace": {"type": "string", "description": "Namespace"}
        }, "required": ["resource", "name", "namespace"]}}},
    {"type": "function", "function": {
        "name": "k8s_get_deployments",
        "description": "[L1] Liste les deployments avec leur état ready/desired.",
        "parameters": {"type": "object", "properties": {
            "namespace": {"type": "string", "description": "Namespace ou '--all-namespaces'"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "k8s_get_nodes",
        "description": "[L1] État des nodes du cluster (CPU, RAM, statut).",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "k8s_get_resource_usage",
        "description": "[L1] Consommation CPU/RAM réelle des pods et nodes (kubectl top).",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── K8s L2 ────────────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "k8s_rollout_restart",
        "description": "[L2] Rollout restart d'un deployment. Libère verrous SQLite, recharge le code.",
        "parameters": {"type": "object", "properties": {
            "deployment": {"type": "string", "description": "Nom du deployment"},
            "namespace": {"type": "string", "description": "Namespace"}
        }, "required": ["deployment", "namespace"]}}},
    {"type": "function", "function": {
        "name": "k8s_patch_resources",
        "description": "[L2] Met à jour les resource limits CPU/RAM d'un deployment.",
        "parameters": {"type": "object", "properties": {
            "deployment": {"type": "string"},
            "namespace": {"type": "string"},
            "cpu_limit": {"type": "string", "description": "Ex: '500m', '2'"},
            "memory_limit": {"type": "string", "description": "Ex: '512Mi', '2Gi'"}
        }, "required": ["deployment", "namespace", "cpu_limit", "memory_limit"]}}},
    # ── K8s L3 ────────────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "k8s_scale",
        "description": "[L3] Scale un deployment à N réplicas. 0 = arrêt complet.",
        "parameters": {"type": "object", "properties": {
            "deployment": {"type": "string"},
            "namespace": {"type": "string"},
            "replicas": {"type": "integer"}
        }, "required": ["deployment", "namespace", "replicas"]}}},
    {"type": "function", "function": {
        "name": "k8s_delete_resource",
        "description": "[L3] Supprime une ressource Kubernetes.",
        "parameters": {"type": "object", "properties": {
            "resource": {"type": "string"},
            "name": {"type": "string"},
            "namespace": {"type": "string"}
        }, "required": ["resource", "name", "namespace"]}}},
    # ── Scaleway Compute L1 ───────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_instances",
        "description": "[L1] Liste les instances Scaleway Compute avec leur statut.",
        "parameters": {"type": "object", "properties": {
            "zone": {"type": "string", "description": "Zone Scaleway (ex: fr-par-1, nl-ams-1)"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_instance",
        "description": "[L1] Détails d'une instance Scaleway (IP, type, état, volumes).",
        "parameters": {"type": "object", "properties": {
            "server_id": {"type": "string"},
            "zone": {"type": "string"}
        }, "required": ["server_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_volumes",
        "description": "[L1] Liste les volumes de stockage Scaleway.",
        "parameters": {"type": "object", "properties": {
            "zone": {"type": "string"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_list_ips",
        "description": "[L1] Liste les IPs flexibles Scaleway.",
        "parameters": {"type": "object", "properties": {
            "zone": {"type": "string"}
        }, "required": []}}},
    # ── Scaleway Compute L2 ───────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_start_instance",
        "description": "[L2] Démarre une instance Scaleway arrêtée.",
        "parameters": {"type": "object", "properties": {
            "server_id": {"type": "string"},
            "zone": {"type": "string"}
        }, "required": ["server_id"]}}},
    {"type": "function", "function": {
        "name": "scw_stop_instance",
        "description": "[L2] Arrête proprement une instance Scaleway (poweroff).",
        "parameters": {"type": "object", "properties": {
            "server_id": {"type": "string"},
            "zone": {"type": "string"}
        }, "required": ["server_id"]}}},
    {"type": "function", "function": {
        "name": "scw_reboot_instance",
        "description": "[L2] Redémarre une instance Scaleway.",
        "parameters": {"type": "object", "properties": {
            "server_id": {"type": "string"},
            "zone": {"type": "string"}
        }, "required": ["server_id"]}}},
    # ── Scaleway Compute L3 ───────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_delete_instance",
        "description": "[L3] Supprime définitivement une instance Scaleway.",
        "parameters": {"type": "object", "properties": {
            "server_id": {"type": "string"},
            "zone": {"type": "string"}
        }, "required": ["server_id"]}}},
    # ── Scaleway S3 L1 ────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_buckets",
        "description": "[L1] Liste les buckets Object Storage Scaleway du projet.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_bucket",
        "description": "[L1] Détails d'un bucket Scaleway (taille, objets, région).",
        "parameters": {"type": "object", "properties": {
            "bucket_name": {"type": "string"}
        }, "required": ["bucket_name"]}}},
    # ── Scaleway S3 L3 ────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_delete_bucket",
        "description": "[L3] Supprime définitivement un bucket Scaleway.",
        "parameters": {"type": "object", "properties": {
            "bucket_name": {"type": "string"}
        }, "required": ["bucket_name"]}}},
    # ── Scaleway Kubernetes L1 ────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_k8s_clusters",
        "description": "[L1] Liste les clusters Kubernetes Kapsule Scaleway.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_k8s_cluster",
        "description": "[L1] Détails d'un cluster Kapsule (version, statut, pools).",
        "parameters": {"type": "object", "properties": {
            "cluster_id": {"type": "string"}
        }, "required": ["cluster_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_k8s_pools",
        "description": "[L1] Liste les node pools d'un cluster Kapsule.",
        "parameters": {"type": "object", "properties": {
            "cluster_id": {"type": "string"}
        }, "required": ["cluster_id"]}}},
    # ── Scaleway Kubernetes L2 ────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_scale_k8s_pool",
        "description": "[L2] Redimensionne un node pool Kapsule.",
        "parameters": {"type": "object", "properties": {
            "cluster_id": {"type": "string"},
            "pool_id": {"type": "string"},
            "size": {"type": "integer", "description": "Nombre de nodes souhaité"}
        }, "required": ["cluster_id", "pool_id", "size"]}}},
    # ── Scaleway Kubernetes L3 ────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_upgrade_k8s_cluster",
        "description": "[L3] Met à jour la version Kubernetes d'un cluster Kapsule.",
        "parameters": {"type": "object", "properties": {
            "cluster_id": {"type": "string"},
            "version": {"type": "string", "description": "Ex: '1.31.0'"}
        }, "required": ["cluster_id", "version"]}}},
    {"type": "function", "function": {
        "name": "scw_delete_k8s_cluster",
        "description": "[L3] Supprime définitivement un cluster Kapsule.",
        "parameters": {"type": "object", "properties": {
            "cluster_id": {"type": "string"}
        }, "required": ["cluster_id"]}}},
    # ── Scaleway TEM L1 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_tem_domains",
        "description": "[L1] Liste les domaines d'envoi TEM Scaleway et leur statut DNS.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_tem_domain",
        "description": "[L1] Détails d'un domaine TEM (DKIM, SPF, MX statut).",
        "parameters": {"type": "object", "properties": {
            "domain_id": {"type": "string"}
        }, "required": ["domain_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_tem_emails",
        "description": "[L1] Liste les emails envoyés récemment via TEM.",
        "parameters": {"type": "object", "properties": {
            "domain_id": {"type": "string", "description": "Filtrer par domaine (optionnel)"},
            "limit": {"type": "integer", "description": "Nombre max d'emails (défaut: 20)"}
        }, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_tem_statistics",
        "description": "[L1] Statistiques d'envoi TEM (delivered, bounced, spam).",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── Scaleway TEM L2 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_create_tem_domain",
        "description": "[L2] Enregistre un nouveau domaine d'envoi dans TEM Scaleway.",
        "parameters": {"type": "object", "properties": {
            "domain_name": {"type": "string", "description": "Ex: mail.neomnia.net"}
        }, "required": ["domain_name"]}}},
    # ── Scaleway DNS L1 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_dns_zones",
        "description": "[L1] Liste les zones DNS Scaleway du projet.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_list_dns_records",
        "description": "[L1] Liste les enregistrements DNS d'une zone.",
        "parameters": {"type": "object", "properties": {
            "dns_zone": {"type": "string", "description": "Zone DNS (ex: neomnia.net)"}
        }, "required": ["dns_zone"]}}},
    # ── Scaleway DNS L2 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_add_dns_record",
        "description": "[L2] Ajoute un enregistrement DNS dans une zone Scaleway.",
        "parameters": {"type": "object", "properties": {
            "dns_zone": {"type": "string"},
            "name": {"type": "string", "description": "Sous-domaine (ex: mail, @, www)"},
            "record_type": {"type": "string", "description": "A, AAAA, CNAME, MX, TXT, SPF..."},
            "data": {"type": "string", "description": "Valeur de l'enregistrement"},
            "ttl": {"type": "integer", "description": "TTL en secondes (défaut: 300)"}
        }, "required": ["dns_zone", "name", "record_type", "data"]}}},
    # ── Scaleway DNS L3 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_delete_dns_record",
        "description": "[L3] Supprime un enregistrement DNS.",
        "parameters": {"type": "object", "properties": {
            "dns_zone": {"type": "string"},
            "record_id": {"type": "string"}
        }, "required": ["dns_zone", "record_id"]}}},
    # ── Scaleway RDB L1 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_databases",
        "description": "[L1] Liste les instances de bases de données managées Scaleway (RDB).",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_database",
        "description": "[L1] Détails d'une instance RDB (version, statut, taille, région).",
        "parameters": {"type": "object", "properties": {
            "instance_id": {"type": "string"}
        }, "required": ["instance_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_db_backups",
        "description": "[L1] Liste les sauvegardes d'une instance RDB.",
        "parameters": {"type": "object", "properties": {
            "instance_id": {"type": "string"}
        }, "required": ["instance_id"]}}},
    # ── Scaleway RDB L2 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_restart_database",
        "description": "[L2] Redémarre une instance de base de données RDB Scaleway.",
        "parameters": {"type": "object", "properties": {
            "instance_id": {"type": "string"}
        }, "required": ["instance_id"]}}},
    # ── Scaleway RDB L3 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_delete_database",
        "description": "[L3] Supprime définitivement une instance RDB Scaleway.",
        "parameters": {"type": "object", "properties": {
            "instance_id": {"type": "string"}
        }, "required": ["instance_id"]}}},
    # ── Scaleway Serverless L1 ────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_function_namespaces",
        "description": "[L1] Liste les namespaces de fonctions serverless Scaleway.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_list_functions",
        "description": "[L1] Liste les fonctions d'un namespace serverless.",
        "parameters": {"type": "object", "properties": {
            "namespace_id": {"type": "string"}
        }, "required": ["namespace_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_container_namespaces",
        "description": "[L1] Liste les namespaces de conteneurs serverless Scaleway.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_list_containers",
        "description": "[L1] Liste les conteneurs serverless d'un namespace.",
        "parameters": {"type": "object", "properties": {
            "namespace_id": {"type": "string"}
        }, "required": ["namespace_id"]}}},
    # ── Scaleway LB L1 ────────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_load_balancers",
        "description": "[L1] Liste les load balancers Scaleway.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_load_balancer",
        "description": "[L1] Détails d'un load balancer (backends, frontends, statut).",
        "parameters": {"type": "object", "properties": {
            "lb_id": {"type": "string"}
        }, "required": ["lb_id"]}}},
    {"type": "function", "function": {
        "name": "scw_list_lb_backends",
        "description": "[L1] Liste les backends d'un load balancer.",
        "parameters": {"type": "object", "properties": {
            "lb_id": {"type": "string"}
        }, "required": ["lb_id"]}}},
    # ── Scaleway VPC L1 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_vpcs",
        "description": "[L1] Liste les VPCs Scaleway du projet.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_list_subnets",
        "description": "[L1] Liste les subnets d'un VPC.",
        "parameters": {"type": "object", "properties": {
            "vpc_id": {"type": "string"}
        }, "required": ["vpc_id"]}}},
    # ── Scaleway IAM L1 ───────────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_list_api_keys",
        "description": "[L1] Liste les clés API IAM Scaleway du projet.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "scw_get_api_key",
        "description": "[L1] Détails d'une clé API (expiration, permissions, projet).",
        "parameters": {"type": "object", "properties": {
            "access_key": {"type": "string"}
        }, "required": ["access_key"]}}},
    {"type": "function", "function": {
        "name": "scw_list_iam_policies",
        "description": "[L1] Liste les politiques IAM Scaleway.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    # ── Scaleway Billing L1 ───────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "scw_get_billing",
        "description": "[L1] Consommation Scaleway en cours et dernières factures.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},

    # ── Shell / Git / Fichiers ────────────────────────────────────────────────
    {"type": "function", "function": {
        "name": "shell_exec",
        "description": (
            "[L2] Exécute une commande shell sur kubinote. "
            "Utiliser pour git, curl, df, ps, systemctl, rclone, scw CLI, etc. "
            "Exemples: 'git -C /home/neokube-beta status', 'df -h /', 'kubectl get pods -A'. "
            "Timeout 60s. Sortie stdout+stderr retournée."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Commande shell complète à exécuter (bash -c)"
                },
                "workdir": {
                    "type": "string",
                    "description": "Répertoire de travail (défaut: /home/neokube-beta)"
                },
                "timeout": {
                    "type": "integer",
                    "description": "Timeout en secondes (défaut: 60, max: 300)"
                }
            },
            "required": ["command"]
        }}},
    {"type": "function", "function": {
        "name": "file_read",
        "description": "[L1] Lit le contenu d'un fichier texte sur le système.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Chemin absolu du fichier"},
                "lines": {"type": "integer", "description": "Nombre de lignes max (défaut: 200)"}
            },
            "required": ["path"]
        }}},
    {"type": "function", "function": {
        "name": "file_write",
        "description": "[L2] Écrit/remplace le contenu d'un fichier texte.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Chemin absolu du fichier"},
                "content": {"type": "string", "description": "Contenu complet à écrire"},
                "append": {"type": "boolean", "description": "Si true, ajoute au lieu de remplacer"}
            },
            "required": ["path", "content"]
        }}},
    {"type": "function", "function": {
        "name": "git_status",
        "description": "[L1] Git status + diff stats du dépôt /home/neokube-beta.",
        "parameters": {"type": "object", "properties": {}, "required": []}}},
    {"type": "function", "function": {
        "name": "git_commit_push",
        "description": "[L2] Stage tous les fichiers modifiés, crée un commit et pousse sur origin.",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "Message de commit"},
                "add_pattern": {"type": "string", "description": "Pattern git add (défaut: -A)"},
                "push": {"type": "boolean", "description": "Pousser sur origin après commit (défaut: true)"}
            },
            "required": ["message"]
        }}},
]

# Niveau de sécurité par outil
TOOL_LEVEL: dict[str, int] = {}
for _t in TOOLS:
    _name = _t["function"]["name"]
    _desc = _t["function"]["description"]
    if _desc.startswith("[L3]"):
        TOOL_LEVEL[_name] = 3
    elif _desc.startswith("[L2]"):
        TOOL_LEVEL[_name] = 2
    else:
        TOOL_LEVEL[_name] = 1


# =============================================================================
# execute_tool() — Dispatcher central avec contrôle de sécurité
# =============================================================================

def execute_tool(name: str, args: dict, k8s: K8sExecutor, scw: ScalewayClient,
                 confirmed: bool) -> str:
    level = TOOL_LEVEL.get(name, 1)

    if level == 3 and not confirmed:
        return (
            f"🔒 **[L3 — ACTION BLOQUÉE]** `{name}` est une action destructive.\n"
            "Pour l'exécuter, réponds avec le mot **CONFIRMER** dans ton message."
        )

    if level == 2:
        log.warning(f"[AUDIT L2] tool={name} args={args}")
    if level == 3:
        log.warning(f"[AUDIT L3 CONFIRMED] tool={name} args={args}")

    try:
        # ── K8s ───────────────────────────────────────────────────────────────
        if name == "k8s_get_pods":
            return k8s.get_pods(args.get("namespace", "--all-namespaces"))
        if name == "k8s_get_events":
            return k8s.get_events(
                args.get("namespace", "--all-namespaces"),
                args.get("warning_only", True)
            )
        if name == "k8s_get_logs":
            return k8s.get_logs(
                args["namespace"], args["label"],
                args.get("tail", 100), args.get("grep", "")
            )
        if name == "k8s_describe":
            return k8s.describe(args["resource"], args["name"], args["namespace"])
        if name == "k8s_get_deployments":
            return k8s.get_deployments(args.get("namespace", "--all-namespaces"))
        if name == "k8s_get_nodes":
            return k8s.get_nodes()
        if name == "k8s_get_resource_usage":
            return k8s.get_resource_usage()
        if name == "k8s_rollout_restart":
            return k8s.rollout_restart(args["deployment"], args["namespace"])
        if name == "k8s_patch_resources":
            return k8s.patch_resources(
                args["deployment"], args["namespace"],
                args["cpu_limit"], args["memory_limit"]
            )
        if name == "k8s_scale":
            return k8s.scale(args["deployment"], args["namespace"], args["replicas"])
        if name == "k8s_delete_resource":
            return k8s.delete_resource(args["resource"], args["name"], args["namespace"])

        # ── Scaleway Compute ──────────────────────────────────────────────────
        if name == "scw_list_instances":
            r = scw.list_instances(args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_instance":
            r = scw.get_instance(args["server_id"], args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_volumes":
            r = scw.list_volumes(args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_ips":
            r = scw.list_ips(args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_start_instance":
            r = scw.perform_server_action(args["server_id"], "poweron", args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_stop_instance":
            r = scw.perform_server_action(args["server_id"], "poweroff", args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_reboot_instance":
            r = scw.perform_server_action(args["server_id"], "reboot", args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_delete_instance":
            r = scw.delete_instance(args["server_id"], args.get("zone"))
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway S3 ───────────────────────────────────────────────────────
        if name == "scw_list_buckets":
            r = scw.list_buckets()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_bucket":
            r = scw.get_bucket(args["bucket_name"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_delete_bucket":
            r = scw.delete_bucket(args["bucket_name"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway Kubernetes ───────────────────────────────────────────────
        if name == "scw_list_k8s_clusters":
            r = scw.list_k8s_clusters()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_k8s_cluster":
            r = scw.get_k8s_cluster(args["cluster_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_k8s_pools":
            r = scw.list_k8s_pools(args["cluster_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_scale_k8s_pool":
            r = scw.scale_k8s_pool(args["cluster_id"], args["pool_id"], args["size"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_upgrade_k8s_cluster":
            r = scw.upgrade_k8s_cluster(args["cluster_id"], args["version"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_delete_k8s_cluster":
            r = scw.delete_k8s_cluster(args["cluster_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway TEM ──────────────────────────────────────────────────────
        if name == "scw_list_tem_domains":
            r = scw.list_tem_domains()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_tem_domain":
            r = scw.get_tem_domain(args["domain_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_tem_emails":
            r = scw.list_tem_emails(args.get("domain_id"), args.get("limit", 20))
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_tem_statistics":
            r = scw.get_tem_statistics()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_create_tem_domain":
            r = scw.create_tem_domain(args["domain_name"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway DNS ──────────────────────────────────────────────────────
        if name == "scw_list_dns_zones":
            r = scw.list_dns_zones()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_dns_records":
            r = scw.list_dns_records(args["dns_zone"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_add_dns_record":
            r = scw.add_dns_record(
                args["dns_zone"], args["name"], args["record_type"],
                args["data"], args.get("ttl", 300)
            )
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_delete_dns_record":
            r = scw.delete_dns_record(args["dns_zone"], args["record_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway RDB ──────────────────────────────────────────────────────
        if name == "scw_list_databases":
            r = scw.list_databases()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_database":
            r = scw.get_database(args["instance_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_db_backups":
            r = scw.list_db_backups(args["instance_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_restart_database":
            r = scw.restart_database(args["instance_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_delete_database":
            r = scw.delete_database(args["instance_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway Serverless ───────────────────────────────────────────────
        if name == "scw_list_function_namespaces":
            r = scw.list_function_namespaces()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_functions":
            r = scw.list_functions(args["namespace_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_container_namespaces":
            r = scw.list_container_namespaces()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_containers":
            r = scw.list_containers(args["namespace_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway Load Balancer ────────────────────────────────────────────
        if name == "scw_list_load_balancers":
            r = scw.list_load_balancers()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_load_balancer":
            r = scw.get_load_balancer(args["lb_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_lb_backends":
            r = scw.list_lb_backends(args["lb_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway VPC ──────────────────────────────────────────────────────
        if name == "scw_list_vpcs":
            r = scw.list_vpcs()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_subnets":
            r = scw.list_subnets(args["vpc_id"])
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway IAM ──────────────────────────────────────────────────────
        if name == "scw_list_api_keys":
            r = scw.list_api_keys()
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_get_api_key":
            r = scw.get_api_key(args["access_key"])
            return json.dumps(r, ensure_ascii=False, indent=2)
        if name == "scw_list_iam_policies":
            r = scw.list_iam_policies()
            return json.dumps(r, ensure_ascii=False, indent=2)

        # ── Scaleway Billing ──────────────────────────────────────────────────
        if name == "scw_get_billing":
            cons = scw.get_current_consumption()
            inv  = scw.list_invoices()
            return json.dumps({"consumption": cons, "invoices": inv},
                              ensure_ascii=False, indent=2)

        # ── Shell / Git / Fichiers ────────────────────────────────────────────
        if name == "shell_exec":
            cmd     = args.get("command", "")
            # GIT_HOME est /workspace (hostPath) dans le pod, /home/neokube-beta en local
            default_wd = os.getenv("GIT_HOME", "/home/neokube-beta")
            workdir = args.get("workdir", default_wd)
            timeout = min(int(args.get("timeout", 60)), 300)
            if not cmd:
                return "[ERROR] Paramètre 'command' manquant"
            log.info(f"[SHELL] cmd={cmd!r} cwd={workdir}")
            try:
                r = subprocess.run(
                    ["bash", "-c", cmd],
                    capture_output=True, text=True,
                    timeout=timeout, cwd=workdir
                )
                out = r.stdout.strip()
                err = r.stderr.strip()
                result = ""
                if out:
                    result += out
                if err:
                    result += ("\n--- stderr ---\n" + err) if out else err
                if r.returncode != 0:
                    result += f"\n[exit code: {r.returncode}]"
                return result or "(pas de sortie)"
            except subprocess.TimeoutExpired:
                return f"[TIMEOUT] Commande dépassée ({timeout}s)"
            except Exception as e:
                return f"[ERROR] shell_exec: {e}"

        if name == "file_read":
            path  = args.get("path", "")
            lines = int(args.get("lines", 200))
            if not path:
                return "[ERROR] Paramètre 'path' manquant"
            try:
                with open(path, "r", errors="replace") as f:
                    content = f.readlines()
                total = len(content)
                content = content[:lines]
                result  = "".join(content)
                if total > lines:
                    result += f"\n... ({total - lines} lignes supplémentaires)"
                return result
            except FileNotFoundError:
                return f"[ERROR] Fichier introuvable : {path}"
            except Exception as e:
                return f"[ERROR] file_read: {e}"

        if name == "file_write":
            path    = args.get("path", "")
            content = args.get("content", "")
            append  = bool(args.get("append", False))
            if not path:
                return "[ERROR] Paramètre 'path' manquant"
            try:
                _dirname = os.path.dirname(path)
                if _dirname:
                    os.makedirs(_dirname, exist_ok=True)
                mode = "a" if append else "w"
                with open(path, mode) as f:
                    f.write(content)
                return f"✅ Fichier {'complété' if append else 'écrit'} : {path} ({len(content)} octets)"
            except Exception as e:
                return f"[ERROR] file_write: {e}"

        if name == "git_status":
            repo = os.getenv("GIT_HOME", "/home/neokube-beta")
            r1 = subprocess.run(
                ["git", "-C", repo, "status", "--short"],
                capture_output=True, text=True, timeout=15
            )
            r2 = subprocess.run(
                ["git", "-C", repo, "log", "--oneline", "-5"],
                capture_output=True, text=True, timeout=15
            )
            return (
                f"=== git status ===\n{r1.stdout.strip() or '(propre)'}\n\n"
                f"=== 5 derniers commits ===\n{r2.stdout.strip()}"
            )

        if name == "git_commit_push":
            repo        = os.getenv("GIT_HOME", "/home/neokube-beta")
            message     = args.get("message", "chore: mise à jour")
            add_pattern = args.get("add_pattern", "-A")
            do_push     = args.get("push", True)
            log.warning(f"[AUDIT L2] git_commit_push message={message!r}")
            try:
                # Stage
                r_add = subprocess.run(
                    ["git", "-C", repo, "add", add_pattern],
                    capture_output=True, text=True, timeout=30
                )
                # Commit
                r_commit = subprocess.run(
                    ["git", "-C", repo, "commit", "-m", message],
                    capture_output=True, text=True, timeout=30
                )
                output = r_add.stderr.strip() + "\n" + r_commit.stdout.strip()
                if r_commit.returncode != 0:
                    err = r_commit.stderr.strip()
                    if "nothing to commit" in err or "nothing to commit" in r_commit.stdout:
                        return "ℹ️ Rien à committer — working tree propre."
                    return f"[ERROR] git commit:\n{err}"
                # Push
                if do_push:
                    r_push = subprocess.run(
                        ["git", "-C", repo, "push", "origin", "main"],
                        capture_output=True, text=True, timeout=60
                    )
                    push_out = r_push.stdout.strip() + "\n" + r_push.stderr.strip()
                    output += f"\n\n=== push ===\n{push_out.strip()}"
                    if r_push.returncode != 0:
                        output += f"\n[exit code: {r_push.returncode}]"
                return output.strip()
            except Exception as e:
                return f"[ERROR] git_commit_push: {e}"

        return f"[ERROR] Outil inconnu : {name}"

    except Exception as e:
        log.error(f"[TOOL ERROR] {name}: {e}")
        return f"[ERROR] {name}: {e}"


# =============================================================================
# SREAgent — Boucle agentique avec tool use Mistral
# =============================================================================

class SREAgent:

    def __init__(self) -> None:
        # ── Choix du backend LLM ─────────────────────────────────────────────
        if LITELLM_BASE_URL and LITELLM_API_KEY and _OPENAI_SDK_OK:
            # Priorité : LiteLLM proxy (centralise les clés, Langfuse trace)
            self._backend = "litellm"
            self._oai = _OpenAIClient(
                base_url=LITELLM_BASE_URL,
                api_key=LITELLM_API_KEY,
            )
            log.info(f"[SRE] LLM backend = LiteLLM ({LITELLM_BASE_URL}) model={SRE_MODEL}")
        elif _MISTRAL_OK and MISTRAL_API_KEY:
            # Fallback : Mistral direct
            self._backend = "mistral"
            self._mistral_client = Mistral(api_key=MISTRAL_API_KEY)
            log.info(f"[SRE] LLM backend = Mistral direct model={SRE_MODEL}")
        else:
            raise RuntimeError(
                "Aucun backend LLM disponible. "
                "Définir LITELLM_BASE_URL+LITELLM_API_KEY ou MISTRAL_API_KEY."
            )
        self._k8s    = K8sExecutor()
        self._scw    = ScalewayClient(
            secret_key=SCW_SECRET_KEY,
            project_id=SCW_DEFAULT_PROJECT,
            region=SCW_DEFAULT_REGION,
            zone=SCW_DEFAULT_ZONE,
        )

    def _llm_call(self, msgs: list[dict]) -> Any:
        """Appelle le backend LLM (LiteLLM ou Mistral direct) et retourne la réponse."""
        if self._backend == "litellm":
            # OpenAI-compatible (LiteLLM proxy) — format tool_choice identique
            return self._oai.chat.completions.create(
                model=SRE_MODEL,
                messages=msgs,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=4096,
                temperature=0.1,
            )
        else:
            return self._mistral_client.chat.complete(
                model=SRE_MODEL,
                messages=msgs,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=4096,
                temperature=0.1,
            )

    def chat(self, messages: list[dict]) -> str:
        # Détecter si l'utilisateur a confirmé une action L3
        last_user = next(
            (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
            ""
        )
        confirmed = "CONFIRMER" in (last_user if isinstance(last_user, str) else "")

        # Construire l'historique
        llm_msgs: list[dict] = [{"role": "system", "content": SRE_SYSTEM}]
        for m in messages:
            role    = m.get("role", "user")
            content = m.get("content", "")
            if isinstance(content, list):
                content = " ".join(
                    p.get("text", "") for p in content if isinstance(p, dict)
                )
            if role in ("user", "assistant"):
                llm_msgs.append({"role": role, "content": content})

        # ── Boucle agentique ──────────────────────────────────────────────────
        for iteration in range(MAX_TOOL_ITERATIONS):
            resp    = self._llm_call(llm_msgs)
            choice  = resp.choices[0]
            message = choice.message

            # Fin : pas de tool call
            if choice.finish_reason == "stop" or not getattr(message, "tool_calls", None):
                return message.content or "(aucune réponse)"

            # Ajouter la réponse assistant à l'historique
            llm_msgs.append({
                "role":       "assistant",
                "content":    message.content or "",
                "tool_calls": [
                    {
                        "id":       tc.id,
                        "type":     "function",
                        "function": {
                            "name":      tc.function.name,
                            "arguments": tc.function.arguments
                            if isinstance(tc.function.arguments, str)
                            else json.dumps(tc.function.arguments),
                        }
                    }
                    for tc in message.tool_calls
                ]
            })

            # Exécuter chaque tool call
            for tc in message.tool_calls:
                tool_name = tc.function.name
                try:
                    raw_args = tc.function.arguments
                    tool_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except Exception:
                    tool_args = {}

                log.info(f"[TOOL CALL] iter={iteration} tool={tool_name} args={tool_args}")
                result = execute_tool(
                    tool_name, tool_args, self._k8s, self._scw, confirmed
                )
                log.info(f"[TOOL RESULT] {tool_name} → {str(result)[:200]}")

                llm_msgs.append({
                    "role":         "tool",
                    "tool_call_id": tc.id,
                    "name":         tool_name,
                    "content":      result[:8000],  # cap pour éviter overflow ctx
                })

        return "⚠️ Nombre maximum d'itérations atteint. Essaie une requête plus ciblée."


# =============================================================================
# FastAPI
# =============================================================================

app    = FastAPI(title="NeoKube SRE Agent", version="2.0")
_agent: SREAgent | None = None


def get_agent() -> SREAgent:
    global _agent
    if _agent is None:
        _agent = SREAgent()
    return _agent


@app.get("/health")
def health():
    has_scw  = bool(SCW_SECRET_KEY)
    if LITELLM_BASE_URL and LITELLM_API_KEY and _OPENAI_SDK_OK:
        provider = "litellm"
    elif MISTRAL_API_KEY and _MISTRAL_OK:
        provider = "mistral"
    else:
        provider = "none"
    log.info(f"[SRE] health provider={provider} scw={has_scw}")
    return {
        "status":       "ok",
        "provider":     provider,
        "llm_backend":  LITELLM_BASE_URL or "mistral-direct",
        "model":        SRE_MODEL,
        "scaleway":     has_scw,
        "tools_count":  len(TOOLS),
        "scw_project":  SCW_DEFAULT_PROJECT,
        "scw_region":   SCW_DEFAULT_REGION,
    }


@app.get("/v1/models")
def models():
    return {
        "object": "list",
        "data": [{
            "id":          "neokube-sre",
            "object":      "model",
            "created":     1700000000,
            "owned_by":    "neokube",
            "description": f"NeoKube SRE v2 — K8s + Scaleway ({len(TOOLS)} tools)",
        }]
    }


@app.post("/v1/chat/completions")
def chat_completions(body: dict):
    messages = body.get("messages", [])
    stream   = body.get("stream", False)

    try:
        text = get_agent().chat(messages)
    except Exception as e:
        text = f"❌ **Erreur SRE Agent** : {e}"
        log.error(f"[SRE] error: {e}", exc_info=True)

    cid = f"chatcmpl-{uuid.uuid4().hex[:12]}"
    ts  = int(time.time())

    if stream:
        def _stream() -> Iterator[str]:
            yield f"data: {json.dumps({'id': cid, 'object': 'chat.completion.chunk', 'created': ts, 'model': 'neokube-sre', 'choices': [{'index': 0, 'delta': {'role': 'assistant', 'content': text}, 'finish_reason': None}]})}\n\n"
            yield f"data: {json.dumps({'id': cid, 'object': 'chat.completion.chunk', 'created': ts, 'model': 'neokube-sre', 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(_stream(), media_type="text/event-stream")

    return {
        "id": cid, "object": "chat.completion", "created": ts, "model": "neokube-sre",
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text},
                     "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, workers=1)
