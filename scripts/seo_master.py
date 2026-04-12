#!/usr/bin/env python3
"""
seo_master.py — Master Script SEO
══════════════════════════════════════════════════════════════════
Flux complet :
  1. Lit un mot-clé depuis le terminal (ou argv)
  2. Ouvre un port-forward vers Temporal (agent-system:7233)
  3. Lance un Workflow Temporal : SEOOutlineWorkflow
       Activity 1 → fetch_prompt      : lit article_outline.txt depuis le ConfigMap K8s
       Activity 2 → generate_outline  : appelle HuggingFace Inference API
       Activity 3 → save_output       : écrit le résultat dans /projets/seo_outputs/
  4. Affiche le plan généré dans le terminal

Usage :
    python seo_master.py
    python seo_master.py "stratégie de contenu SaaS B2B"
    HF_TOKEN=hf_xxx python seo_master.py

Variables d'environnement :
    HF_TOKEN        — token HuggingFace (obligatoire)
    HF_MODEL_ID     — modèle (défaut : meta-llama/Meta-Llama-3.1-8B-Instruct)
    HF_PROVIDER     — provider HF router (défaut : novita)
    TEMPORAL_HOST   — hôte Temporal (défaut : localhost:7233)
    KUBECONFIG      — chemin kubeconfig (défaut : ~/.kube/config)
    SEO_OUTPUT_DIR  — répertoire de sortie (défaut : ~/seo_outputs)
"""

import asyncio
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────
HF_TOKEN      = os.getenv("HF_TOKEN", "")
HF_MODEL_ID   = os.getenv("HF_MODEL_ID", "meta-llama/Meta-Llama-3.1-8B-Instruct")
HF_PROVIDER   = os.getenv("HF_PROVIDER",  "novita")
TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "localhost:7233")
SEO_OUTPUT_DIR = Path(os.getenv("SEO_OUTPUT_DIR", str(Path.home() / "seo_outputs")))
KUBECONFIG_PATH = str(Path.home() / ".kube" / "config")   # fixe, ignore $KUBECONFIG (rke2.yaml inaccessible)

CONFIGMAP_NAME      = "seo-prompts"
CONFIGMAP_NAMESPACE = "growth-lab"
CONFIGMAP_KEY       = "article_outline.txt"
TASK_QUEUE          = "seo-task-queue"
WORKFLOW_ID_PREFIX  = "seo-outline"


# ══════════════════════════════════════════════════════════════════════════════
# ACTIVITIES
# ══════════════════════════════════════════════════════════════════════════════

from dataclasses import dataclass

from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker, UnsandboxedWorkflowRunner
from temporalio.common import RetryPolicy


@dataclass
class SaveOutputPayload:
    keyword: str
    content: str


@activity.defn(name="fetch_prompt")
async def fetch_prompt(keyword: str) -> str:
    """Lit article_outline.txt depuis le ConfigMap Kubernetes 'seo-prompts'."""
    from kubernetes import client as k8s_client, config as k8s_config

    activity.logger.info(f"Lecture du prompt ConfigMap {CONFIGMAP_NAMESPACE}/{CONFIGMAP_NAME}")

    k8s_config.load_kube_config(config_file=KUBECONFIG_PATH)

    v1    = k8s_client.CoreV1Api()
    cm    = v1.read_namespaced_config_map(CONFIGMAP_NAME, CONFIGMAP_NAMESPACE)
    prompt_template = cm.data.get(CONFIGMAP_KEY, "")

    if not prompt_template:
        raise ValueError(f"Clé '{CONFIGMAP_KEY}' introuvable dans le ConfigMap")

    # Injection du mot-clé dans les placeholders du template
    prompt = (
        prompt_template
        .replace("{{topic}}", keyword)
        .replace("{{keyword}}", keyword)
        .replace("{{search_volume}}", "à estimer")
    )
    activity.logger.info("Prompt récupéré et hydraté")
    return prompt


@activity.defn(name="generate_outline")
async def generate_outline(prompt: str) -> str:
    """Envoie le prompt à HuggingFace Inference API et retourne le plan généré."""
    from huggingface_hub import InferenceClient

    if not HF_TOKEN:
        raise EnvironmentError(
            "Variable HF_TOKEN manquante. "
            "Définir : export HF_TOKEN=hf_xxxx"
        )

    activity.logger.info(f"Appel HuggingFace — modèle : {HF_MODEL_ID} via {HF_PROVIDER}")

    hf_client = InferenceClient(token=HF_TOKEN, provider=HF_PROVIDER)

    system_msg = (
        "Tu es un expert SEO et content strategist. "
        "Réponds uniquement avec le plan structuré demandé, en Markdown. "
        "Sois précis, actionnable et orienté intention de recherche."
    )

    response = hf_client.chat_completion(
        model=HF_MODEL_ID,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=1500,
        temperature=0.4,
        stream=False,
    )

    result = response.choices[0].message.content.strip()
    activity.logger.info(f"Plan généré — {len(result)} caractères")
    return result


@activity.defn(name="save_output")
async def save_output(payload: SaveOutputPayload) -> str:
    """Sauvegarde le plan dans /projets/seo_outputs/<slug>_<timestamp>.md"""

    keyword = payload.keyword
    content = payload.content

    SEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Slug propre à partir du mot-clé
    slug = re.sub(r"[^\w\s-]", "", keyword.lower())
    slug = re.sub(r"[\s_-]+", "_", slug).strip("_")[:60]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{slug}_{timestamp}.md"
    output_path = SEO_OUTPUT_DIR / filename

    header = (
        f"# Plan SEO — {keyword}\n"
        f"**Généré le** : {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n"
        f"**Modèle** : {HF_MODEL_ID}\n"
        f"**Prompt source** : ConfigMap `{CONFIGMAP_NAMESPACE}/{CONFIGMAP_NAME}` → `{CONFIGMAP_KEY}`\n\n"
        "---\n\n"
    )

    output_path.write_text(header + content, encoding="utf-8")
    activity.logger.info(f"Résultat sauvegardé : {output_path}")
    return str(output_path)


# ══════════════════════════════════════════════════════════════════════════════
# WORKFLOW
# ══════════════════════════════════════════════════════════════════════════════

@workflow.defn(name="SEOOutlineWorkflow")
class SEOOutlineWorkflow:
    """
    Orchestration du pipeline SEO :
      fetch_prompt → generate_outline → save_output
    """

    @workflow.run
    async def run(self, keyword: str) -> dict:
        retry = RetryPolicy(
            maximum_attempts=3,
            initial_interval=timedelta(seconds=2),
            backoff_coefficient=2.0,
        )
        opts = {"start_to_close_timeout": timedelta(minutes=3), "retry_policy": retry}

        # Étape 1 — Récupération du prompt depuis K8s
        workflow.logger.info(f"[1/3] fetch_prompt — mot-clé : '{keyword}'")
        prompt = await workflow.execute_activity(
            fetch_prompt, keyword, **opts
        )

        # Étape 2 — Génération via HuggingFace
        workflow.logger.info("[2/3] generate_outline")
        outline = await workflow.execute_activity(
            generate_outline, prompt, **opts
        )

        # Étape 3 — Sauvegarde sur SSD
        workflow.logger.info("[3/3] save_output")
        saved_path = await workflow.execute_activity(
            save_output,
            SaveOutputPayload(keyword=keyword, content=outline),
            start_to_close_timeout=timedelta(minutes=1),
        )

        return {
            "keyword":    keyword,
            "saved_path": saved_path,
            "chars":      len(outline),
            "preview":    outline[:300],
        }


# ══════════════════════════════════════════════════════════════════════════════
# PORT-FORWARD TEMPORAL
# ══════════════════════════════════════════════════════════════════════════════

def start_temporal_portforward() -> subprocess.Popen | None:
    """Lance kubectl port-forward vers Temporal si TEMPORAL_HOST est localhost."""
    if not TEMPORAL_HOST.startswith("localhost") and not TEMPORAL_HOST.startswith("127.0.0.1"):
        return None

    port = TEMPORAL_HOST.split(":")[-1]
    print(f"  Ouverture du port-forward → agent-system/temporal:{port} …")

    proc = subprocess.Popen(
        [
            "kubectl", "port-forward",
            "--kubeconfig", KUBECONFIG_PATH,
            "-n", "agent-system",
            "svc/temporal", f"{port}:7233",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(3)  # laisser le tunnel s'établir
    return proc


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

async def run_workflow(keyword: str) -> None:
    client = await Client.connect(TEMPORAL_HOST)

    # Worker embarqué — tourne dans un task group puis s'arrête
    async with Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[SEOOutlineWorkflow],
        activities=[fetch_prompt, generate_outline, save_output],
        workflow_runner=UnsandboxedWorkflowRunner(),
    ):
        workflow_id = f"{WORKFLOW_ID_PREFIX}-{int(time.time())}"
        print(f"\n  Lancement du workflow  id={workflow_id}")

        handle = await client.start_workflow(
            SEOOutlineWorkflow.run,
            keyword,
            id=workflow_id,
            task_queue=TASK_QUEUE,
        )

        result = await handle.result()

    return result


def print_banner(keyword: str) -> None:
    width = 62
    print("\n" + "═" * width)
    print("  SEO Master Script — Génération de plan d'article")
    print("═" * width)
    print(f"  Mot-clé   : {keyword}")
    print(f"  Modèle    : {HF_MODEL_ID}  [{HF_PROVIDER}]")
    print(f"  Temporal  : {TEMPORAL_HOST}")
    print(f"  Sortie    : {SEO_OUTPUT_DIR}")
    print("═" * width)


def main() -> None:
    # Lecture du mot-clé
    if len(sys.argv) > 1:
        keyword = " ".join(sys.argv[1:]).strip()
    else:
        try:
            keyword = input("\nMot-clé SEO cible : ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAnnulé.")
            sys.exit(0)

    if not keyword:
        print("Erreur : le mot-clé ne peut pas être vide.")
        sys.exit(1)

    print_banner(keyword)

    # Validation du token HF
    if not HF_TOKEN:
        print("\n  ⚠ HF_TOKEN manquant.")
        print("  Définir avant de lancer : export HF_TOKEN=hf_xxxxxxxxxxxx")
        sys.exit(1)

    # Port-forward Temporal
    print("\n[1/4] Connexion à Temporal …")
    pf_proc = start_temporal_portforward()

    try:
        print("[2/4] Démarrage du worker Temporal …")
        print("[3/4] Exécution du workflow SEOOutlineWorkflow …\n")

        result = asyncio.run(run_workflow(keyword))

        # ── Affichage du résultat ─────────────────────────────────────────────
        width = 62
        print("\n" + "═" * width)
        print("  RÉSULTAT")
        print("═" * width)
        print(f"  Fichier sauvegardé : {result['saved_path']}")
        print(f"  Taille             : {result['chars']} caractères")
        print("─" * width)
        print("\n  APERÇU DU PLAN :\n")
        print(result["preview"])
        if result["chars"] > 300:
            print(f"\n  … (voir le fichier complet : {result['saved_path']})")
        print("\n" + "═" * width)
        print("  [4/4] Workflow terminé avec succès.")
        print("═" * width + "\n")

    except KeyboardInterrupt:
        print("\nInterrompu par l'utilisateur.")
    except Exception as e:
        print(f"\n  Erreur : {e}")
        raise
    finally:
        if pf_proc:
            pf_proc.terminate()
            print("  Port-forward fermé.")


if __name__ == "__main__":
    main()
