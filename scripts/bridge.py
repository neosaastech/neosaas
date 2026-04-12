#!/usr/bin/env python3
"""
bridge.py — Agent Pilot Bridge
Reçoit des commandes de modèles distants via HuggingFace Inference API
et les exécute sur le cluster Kubernetes local.

Flux :
  1. Interroge un modèle HF (Inference API) avec un prompt système
  2. Parse la réponse en commandes structurées (JSON)
  3. Exécute les commandes via l'API Kubernetes
  4. Écrit les résultats dans /projets/agent-logs/

Dépendances :
    pip install huggingface_hub kubernetes requests

Variables d'environnement :
    HF_TOKEN              — token HuggingFace (obligatoire)
    HF_MODEL_ID           — ID du modèle (défaut: mistralai/Mistral-7B-Instruct-v0.3)
    POLL_INTERVAL_SECONDS — intervalle de polling en secondes (défaut: 10)
    PROJETS_DIR           — répertoire de travail (défaut: /projets)
    LOG_LEVEL             — niveau de log (défaut: INFO)
    KUBE_NAMESPACE_FILTER — namespace cible (vide = tous)
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL_ID = os.getenv("HF_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.3")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "10"))
PROJETS_DIR = Path(os.getenv("PROJETS_DIR", "/projets"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
KUBE_NS_FILTER = os.getenv("KUBE_NAMESPACE_FILTER", "") or None
ALIVE_FILE = Path("/var/agent-state/.alive")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("bridge")


# ---------------------------------------------------------------------------
# Initialisation Kubernetes
# ---------------------------------------------------------------------------

def init_kube():
    from kubernetes import client, config
    try:
        config.load_incluster_config()   # dans un pod
        log.info("Kubernetes : config in-cluster chargée")
    except Exception:
        config.load_kube_config()        # en local (dev)
        log.info("Kubernetes : kubeconfig local chargé")
    return client


def get_cluster_state(kube_client) -> dict:
    """Résumé de l'état du cluster pour contextualiser le modèle."""
    v1 = kube_client.CoreV1Api()
    apps_v1 = kube_client.AppsV1Api()
    state = {"pods": [], "deployments": [], "nodes": []}

    try:
        ns_arg = {"namespace": KUBE_NS_FILTER} if KUBE_NS_FILTER else {}
        pods = v1.list_namespaced_pod(**ns_arg) if KUBE_NS_FILTER else v1.list_pod_for_all_namespaces()
        for pod in pods.items:
            state["pods"].append({
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
            })

        deploys = (
            apps_v1.list_namespaced_deployment(KUBE_NS_FILTER)
            if KUBE_NS_FILTER
            else apps_v1.list_deployment_for_all_namespaces()
        )
        for d in deploys.items:
            state["deployments"].append({
                "name": d.metadata.name,
                "namespace": d.metadata.namespace,
                "ready": f"{d.status.ready_replicas or 0}/{d.spec.replicas}",
            })

        nodes = v1.list_node()
        for n in nodes.items:
            state["nodes"].append({
                "name": n.metadata.name,
                "status": next(
                    (c.type for c in n.status.conditions if c.status == "True"), "Unknown"
                ),
            })
    except Exception as e:
        log.warning(f"Erreur lecture état cluster : {e}")

    return state


# ---------------------------------------------------------------------------
# Commandes Kubernetes exécutables
# ---------------------------------------------------------------------------

COMMAND_REGISTRY: dict[str, callable] = {}


def command(name: str):
    def decorator(fn):
        COMMAND_REGISTRY[name] = fn
        return fn
    return decorator


@command("restart_deployment")
def restart_deployment(kube_client, params: dict) -> str:
    apps_v1 = kube_client.AppsV1Api()
    name = params["name"]
    ns = params.get("namespace", "default")
    now = datetime.utcnow().isoformat() + "Z"
    body = {"spec": {"template": {"metadata": {"annotations": {
        "kubectl.kubernetes.io/restartedAt": now
    }}}}}
    apps_v1.patch_namespaced_deployment(name, ns, body)
    return f"Deployment {ns}/{name} redémarré"


@command("scale_deployment")
def scale_deployment(kube_client, params: dict) -> str:
    apps_v1 = kube_client.AppsV1Api()
    name = params["name"]
    ns = params.get("namespace", "default")
    replicas = int(params["replicas"])
    apps_v1.patch_namespaced_deployment(
        name, ns, {"spec": {"replicas": replicas}}
    )
    return f"Deployment {ns}/{name} scalé à {replicas} replica(s)"


@command("delete_pod")
def delete_pod(kube_client, params: dict) -> str:
    v1 = kube_client.CoreV1Api()
    name = params["name"]
    ns = params.get("namespace", "default")
    v1.delete_namespaced_pod(name, ns)
    return f"Pod {ns}/{name} supprimé"


@command("get_pod_logs")
def get_pod_logs(kube_client, params: dict) -> str:
    v1 = kube_client.CoreV1Api()
    name = params["name"]
    ns = params.get("namespace", "default")
    tail = int(params.get("tail_lines", 50))
    logs = v1.read_namespaced_pod_log(name, ns, tail_lines=tail)
    return logs


@command("write_file")
def write_file(_kube_client, params: dict) -> str:
    rel_path = params["path"].lstrip("/")
    content = params["content"]
    target = PROJETS_DIR / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)
    return f"Fichier écrit : {target}"


@command("read_file")
def read_file(_kube_client, params: dict) -> str:
    rel_path = params["path"].lstrip("/")
    target = PROJETS_DIR / rel_path
    if not target.exists():
        return f"Fichier introuvable : {target}"
    return target.read_text(errors="replace")[:4000]   # limite contexte


@command("list_projets")
def list_projets(_kube_client, _params: dict) -> str:
    entries = sorted(PROJETS_DIR.rglob("*"))[:100]
    return "\n".join(str(e.relative_to(PROJETS_DIR)) for e in entries if e.is_file())


# ---------------------------------------------------------------------------
# HuggingFace Inference API
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Tu es un agent de pilotage Kubernetes. Tu reçois l'état du cluster \
et tu dois répondre UNIQUEMENT avec un JSON valide de la forme :
{
  "commands": [
    {"action": "<nom_action>", "params": {<paramètres>}},
    ...
  ],
  "reasoning": "<explication courte>"
}

Actions disponibles : restart_deployment, scale_deployment, delete_pod, \
get_pod_logs, write_file, read_file, list_projets.

Si aucune action n'est nécessaire, retourne {"commands": [], "reasoning": "RAS"}.
Ne retourne RIEN d'autre que le JSON."""


def query_hf_model(user_message: str) -> str:
    from huggingface_hub import InferenceClient
    client = InferenceClient(model=HF_MODEL_ID, token=HF_TOKEN)
    response = client.chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=512,
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def parse_commands(raw: str) -> list[dict]:
    """Extrait le JSON de la réponse du modèle (tolérant aux balises markdown)."""
    raw = raw.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        data = json.loads(raw)
        return data.get("commands", [])
    except json.JSONDecodeError as e:
        log.warning(f"Réponse modèle non parseable : {e}\n{raw[:200]}")
        return []


# ---------------------------------------------------------------------------
# Logging des actions
# ---------------------------------------------------------------------------

def log_action(action: str, params: dict, result: str) -> None:
    log_dir = PROJETS_DIR / "agent-logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action": action,
        "params": params,
        "result": result[:500],
    }
    log_file = log_dir / f"{datetime.utcnow().strftime('%Y-%m-%d')}.jsonl"
    with open(log_file, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Lecture des instructions depuis /projets/agent-inbox/
# ---------------------------------------------------------------------------

INBOX = PROJETS_DIR / "agent-inbox"


def read_inbox() -> str | None:
    """Lit le premier fichier .txt dans agent-inbox/ et le supprime."""
    INBOX.mkdir(parents=True, exist_ok=True)
    for f in sorted(INBOX.glob("*.txt")):
        content = f.read_text(errors="replace").strip()
        f.unlink()
        log.info(f"Instruction lue depuis inbox : {f.name}")
        return content
    return None


# ---------------------------------------------------------------------------
# Boucle principale
# ---------------------------------------------------------------------------

def main() -> None:
    if not HF_TOKEN:
        log.error("HF_TOKEN manquant — définir la variable d'environnement")
        sys.exit(1)

    log.info(f"Agent Pilot démarré | modèle={HF_MODEL_ID} | poll={POLL_INTERVAL}s")
    log.info(f"Répertoire projets : {PROJETS_DIR}")

    kube_client = init_kube()

    # Signal de vie pour la livenessProbe
    ALIVE_FILE.parent.mkdir(parents=True, exist_ok=True)

    cycle = 0
    while True:
        try:
            ALIVE_FILE.touch()
            cycle += 1

            # Priorité : instruction manuelle dans l'inbox
            instruction = read_inbox()

            if instruction:
                log.info(f"[cycle {cycle}] Instruction manuelle reçue")
                user_msg = instruction
            elif cycle % 6 == 0:
                # Toutes les ~60 secondes : rapport d'état automatique au modèle
                state = get_cluster_state(kube_client)
                user_msg = (
                    f"État du cluster :\n{json.dumps(state, indent=2, ensure_ascii=False)}\n\n"
                    "Analyse et propose des actions si nécessaire."
                )
                log.info(f"[cycle {cycle}] Envoi état cluster au modèle")
            else:
                time.sleep(POLL_INTERVAL)
                continue

            raw = query_hf_model(user_msg)
            log.debug(f"Réponse modèle brute : {raw[:300]}")

            commands = parse_commands(raw)
            if not commands:
                log.info("Aucune commande à exécuter")
            else:
                log.info(f"{len(commands)} commande(s) à exécuter")

            for cmd in commands:
                action = cmd.get("action", "")
                params = cmd.get("params", {})
                handler = COMMAND_REGISTRY.get(action)
                if not handler:
                    log.warning(f"Action inconnue : {action}")
                    continue
                try:
                    result = handler(kube_client, params)
                    log.info(f"[{action}] {result}")
                    log_action(action, params, result)
                except Exception as e:
                    log.error(f"[{action}] Erreur : {e}")
                    log_action(action, params, f"ERREUR: {e}")

        except KeyboardInterrupt:
            log.info("Arrêt demandé")
            break
        except Exception as e:
            log.error(f"Erreur cycle {cycle} : {e}", exc_info=True)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
