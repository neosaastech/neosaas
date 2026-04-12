#!/usr/bin/env python3
"""
ingest_knowledge.py — Neomnia Studio / Kubinote Brain
======================================================
Ingère la base de connaissance opérationnelle du cluster Kubinote
dans la collection Qdrant `kubinote-brain`.

Chaque chunk est vectorisé via l'API Gemini text-embedding-004 (outputDimensionality=1536).
L'appel est direct vers Google (LiteLLM 1.51.0 ne transmet pas outputDimensionality
correctement vers Gemini — contournement documenté).

Usage :
  python scripts/ingest_knowledge.py
  python scripts/ingest_knowledge.py --dry-run     # affiche les chunks sans ingérer
  python scripts/ingest_knowledge.py --reset       # recrée la collection avant ingestion

Variables d'env :
  QDRANT_URL        http://localhost:6333  (ou qdrant.neokube.local)
  GEMINI_API_KEY    clé API Google (AIzaSy...)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
import time
import uuid

import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

# ── Config ────────────────────────────────────────────────────────────────────

QDRANT_URL      = os.getenv("QDRANT_URL", "http://51.159.27.101:6333")
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY",  "AIzaSyAdGRHMc7PNg7LlGxnX9MRGHqfLNd5bq4U")
GEMINI_EMBED_URL = (
    "https://generativelanguage.googleapis.com"
    "/v1beta/models/gemini-embedding-001:embedContent"
)
EMBED_DIMS      = 1536
COLLECTION      = "kubinote-brain"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)


# ── Base de connaissance ──────────────────────────────────────────────────────
# Chaque entrée : { title, category, tags, content }

KNOWLEDGE_BASE: list[dict] = [

    # ── Infrastructure cluster ────────────────────────────────────────────────
    {
        "title": "Cluster Kubinote — État général",
        "category": "infrastructure",
        "tags": ["k3s", "kubernetes", "kubinote", "cluster"],
        "content": """
Le cluster Kubernetes local s'appelle Kubinote et tourne sur K3s.
Machine hôte : neokube-beta (Linux), IP 192.168.1.28.
Ingress controller : Traefik. DNS interne : *.neokube.local résolu via /etc/hosts → 192.168.1.28.
GitOps : /home/neokube-beta/Kubinote-GitOps/ (structure kustomize, base/ par application).
        """,
    },
    {
        "title": "Namespaces actifs post-cleanup",
        "category": "infrastructure",
        "tags": ["namespace", "kubernetes", "pods", "services"],
        "content": """
Namespaces actifs après purge du 2026-04-11 :
- rag-system   : Qdrant (260k vecteurs, collection neomnia_core)
- cockpit      : LiteLLM v1.51.0 + Langfuse v2.95.11 + Postgres
- open-webui   : Open-WebUI, Ollama, admin-sys-agent
- agent-system : Temporal (dev mode), zoho-discovery worker
- mongodb      : MongoDB 7.0 StatefulSet (20 Gi)
- penpot       : Penpot (design tool)
- kube-system  : Traefik, Headlamp
- management   : CronJob nightly-backup

Ressources supprimées lors du cleanup :
agent-pilot (replicas:0), mongodb en agent-system (replicas:0),
temporal-server (ExternalName orphelin en open-webui),
pvc agent-mongodb-pvc, agent-temporal-pvc.
        """,
    },
    {
        "title": "RAM cluster — consommation post-cleanup",
        "category": "infrastructure",
        "tags": ["ram", "ressources", "performance", "monitoring"],
        "content": """
Après purge Temporal/ZohoDiscovery legacy et mongodb agent-system :
RAM utilisée : 12.1 GB / ~32 GB (38%).
CPU moyen : 480-890 millicores (4-7%).
Tous les pods actifs sont Running sans CrashLoop.
Node unique : kubinote (architecture amd64, Linux).
        """,
    },

    # ── RAG System ────────────────────────────────────────────────────────────
    {
        "title": "Qdrant — Collections et accès",
        "category": "rag",
        "tags": ["qdrant", "vecteurs", "collections", "embeddings"],
        "content": """
Qdrant tourne dans rag-system, exposé sur qdrant.neokube.local (Traefik port 80).
Le port-forward localhost:6333 n'est plus nécessaire — l'Ingress fonctionne directement.

Collections :
- neomnia_core  : 260 642 points, dim=384, distance=Cosine. Modèle : paraphrase-multilingual-MiniLM-L12-v2.
  Source : 11 682 documents SharePoint (ingestion mass-ingestion.py, progress dans ~/.cache/rag-ingestion-progress.json).
- kubinote-brain : dim=1536, distance=Cosine. Modèle : gemini/text-embedding-004.
  Usage : base de connaissance opérationnelle du cluster (ce script).

Données persistées sur l'hôte : /var/lib/qdrant-data/collections/.
        """,
    },
    {
        "title": "Ingestion de documents — mass-ingestion.py",
        "category": "rag",
        "tags": ["ingestion", "sharepoint", "documents", "scan_report"],
        "content": """
Script : ~/scripts/mass-ingestion.py
Mode standard : lit ~/scan_report.json (produit par neomnia_scanner.py).
11 682 documents identifiés. 9 568 traités (progress file). Ingestion validée.
Extensions supportées : .txt, .md, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .html, .odt.
Non supporté : .pub (2008 fichiers Publisher — nécessite conversion).

Commande de reprise :
  QDRANT_URL="http://localhost:6333" python3 ~/scripts/mass-ingestion.py --scan-report ~/scan_report.json

Paramètres : batch_size=32, chunk_size=512, overlap=64, max_file_mb=30, max_chunks=500.
        """,
    },

    # ── LiteLLM / Modèles ────────────────────────────────────────────────────
    {
        "title": "LiteLLM — Modèles configurés",
        "category": "llm",
        "tags": ["litellm", "gemini", "mistral", "modèles", "proxy"],
        "content": """
LiteLLM v1.51.0 tourne dans cockpit, exposé sur litellm.neokube.local.
Master key : sk-neokube-litellm-master.
Config : ConfigMap litellm-config dans cockpit.

Modèles :
- gemini-pro      → gemini/gemini-1.5-pro-latest  (GEMINI_API_KEY)
- gemini-flash    → gemini/gemini-2.0-flash        (GEMINI_API_KEY)
- gemini-embedding→ gemini/text-embedding-004      (GEMINI_API_KEY, dims=1536)
- mistral         → mistral/codestral-latest        (MISTRAL_API_KEY)
- admin-sys-agent → openai/admin-sys-agent (local)

Callbacks Langfuse : success + failure → toutes les requêtes sont loggées.
Langfuse : langfuse.neokube.local, public key pk-lf-neokube-65c7fe8ce2894d7e.

Note quota Gemini : clé AIzaSyAd... sur free tier. Generative = quota épuisé (429).
Embeddings = quota séparé, généralement disponible.
        """,
    },
    {
        "title": "Open-WebUI — Configuration providers",
        "category": "llm",
        "tags": ["open-webui", "interface", "providers", "connexion"],
        "content": """
Open-WebUI exposé via hostPort 3000 (accessible directement sur l'hôte).
Admin : chvandendriessche@neomnia.net.

Providers OpenAI-compatibles (OPENAI_API_BASE_URLS, séparés par ;) :
1. LOCAL_ADMIN_AGENT → http://admin-sys-agent.open-webui.svc.cluster.local:8000/v1 (key: local-key)
2. LiteLLM           → http://litellm.cockpit.svc.cluster.local:4000 (key: sk-neokube-litellm-master)

Ollama aussi configuré : http://ollama.open-webui.svc.cluster.local:11434.
Qdrant connecté pour RAG : http://qdrant.rag-system.svc.cluster.local:6333.
Secret MISTRAL_API_KEY : penpot-secrets (namespace open-webui).
        """,
    },

    # ── Temporal / Zoho ───────────────────────────────────────────────────────
    {
        "title": "Temporal + ZohoDiscovery — Architecture worker",
        "category": "orchestration",
        "tags": ["temporal", "zoho", "worker", "crm", "orchestration"],
        "content": """
Temporal server tourne en mode dev (start-dev, SQLite emptyDir) dans agent-system.
Services : temporal:7233/7243, temporal-server:7233/7243, temporal-ui:8233.
UI accessible : temporal.neokube.local (Ingress Traefik).

Worker zoho-discovery :
- Image : localhost:5000/neokube/zoho-discovery:latest (180 MB, python:3.12-slim)
- Sources : ~/scripts/zoho-discovery/worker.py
- Task queue : zoho-discovery-queue
- Workflow : ZohoDiscoveryWorkflow
- Activité : discover_zoho_leads(lead_input: dict) → dict
  Appel POST vers LiteLLM /v1/chat/completions, modèle gemini-flash.
  Retourne : score (0-100), summary, next_action, tags.

Secret utilisé : zoho-secrets/LITELLM_MASTER_KEY (namespace agent-system).
ZOHO_ACCESS_TOKEN : optionnel (non configuré).

Build/redeploy :
  cd ~/scripts/zoho-discovery
  docker build -t localhost:5000/neokube/zoho-discovery:latest .
  docker push localhost:5000/neokube/zoho-discovery:latest
  docker save ... | sudo k3s ctr images import -
  kubectl rollout restart deployment/zoho-discovery -n agent-system
        """,
    },

    # ── Secrets & sécurité ────────────────────────────────────────────────────
    {
        "title": "Secrets Kubernetes — Cartographie par namespace",
        "category": "securite",
        "tags": ["secrets", "kubernetes", "api-keys", "credentials"],
        "content": """
cockpit/cockpit-secrets (8 clés) :
  DATABASE_URL, LANGFUSE_PG_PASS, LANGFUSE_PUBLIC_KEY, LANGFUSE_SALT,
  LANGFUSE_SECRET, LANGFUSE_SECRET_KEY, LITELLM_MASTER_KEY,
  MISTRAL_API_KEY, GEMINI_API_KEY (ajouté le 2026-04-11).

open-webui/penpot-secrets (2 clés) :
  HUGGINGFACE_API_KEY, MISTRAL_API_KEY.

agent-system/zoho-secrets (1 clé) :
  LITELLM_MASTER_KEY.

mongodb/mongodb-credentials (2 clés) :
  root-username: admin, root-password: Mongo#Kube2026!.

Alerte sécurité résolue : deployment-mongodb.yaml contenait le mot de passe
MongoDB en clair → fichier supprimé du GitOps le 2026-04-11.
        """,
    },

    # ── SharePoint / Sync ─────────────────────────────────────────────────────
    {
        "title": "SharePoint — Synchronisation rclone bisync",
        "category": "data",
        "tags": ["sharepoint", "rclone", "synchronisation", "documents"],
        "content": """
Outil : rclone bisync (synchronisation bidirectionnelle).
Script : ~/.local/bin/sync-sharepoint.sh.
Logs : ~/.local/share/rclone-sharepoint/<site>.log.

Sites configurés (12) :
Alfie-Formation, All-Company, Archives, Finances, Management,
Neolabs, Neomnia-publishing, Personnel, Production-clients,
Service-Informatique, Service-Marketing, Strategie.

Dossier local : ~/SharePoint/<site>/.
Remote rclone : sp-<site>: (tokens dans ~/.config/rclone/rclone.conf).
Token Microsoft global : ~/token.json.

Production-clients : 1 786 documents. Personnel : 5 602 documents (le plus volumineux).
        """,
    },

    # ── Marketing B2B ────────────────────────────────────────────────────────
    {
        "title": "Principes Marketing B2B — Neomnia Studio",
        "category": "marketing",
        "tags": ["marketing", "b2b", "leads", "strategie", "crm", "zoho"],
        "content": """
Niveau technique : Advanced. Les interlocuteurs cibles sont des décideurs techniques
(CTO, Lead Dev, Head of Product) et des dirigeants PME qui comprennent l'architecture
logicielle. Le contenu doit être précis, sans jargon marketing creux.

Principe fondateur : qualité des leads > quantité.
Un lead qualifié Neomnia doit répondre à au moins 2 critères :
  1. Besoin réel en automatisation, RAG, ou orchestration d'agents IA.
  2. Budget ou intention d'investissement identifiée.
  3. Stack technique compatible (Python, cloud, APIs REST).

Données structurées prioritaires :
  - Source du lead (canal d'acquisition, campagne)
  - Score de maturité IA (0-100, auto-calculé par ZohoDiscovery)
  - Stack technique détectée (GitHub, LinkedIn, offres d'emploi)
  - Signaux d'intention : consultation docs, téléchargements, démo demandée

Scoring automatique (ZohoDiscovery + LLM) :
  score ≥ 75 → SQL (Sales Qualified Lead) : action commerciale immédiate
  score 40-74 → MQL (Marketing Qualified Lead) : nurturing automatisé
  score < 40  → cold lead : entrée séquence longue ou discard

Canal prioritaire : contenu technique (articles, démos, GitHub public).
Éviter : cold emailing générique, volume sans ciblage.

Outils CRM : Zoho Bigin (pipeline), Zoho Campaigns (nurturing).
Intégration cluster : ZohoDiscovery worker → analyse leads via gemini-flash → score Qdrant.
        """,
    },

    # ── Backups ───────────────────────────────────────────────────────────────
    {
        "title": "Backups — Ressources supprimées (Temporal/Zoho)",
        "category": "infrastructure",
        "tags": ["backup", "temporal", "zoho", "restauration"],
        "content": """
Backup complet dans ~/kubinote-backups/zoho-temporal/ (14 fichiers, 2026-04-11) :
- État cluster exporté (kubectl get -o yaml) pour : deployment temporal,
  deployment zoho-discovery, services temporal/temporal-server/temporal-ui,
  ingress temporal-ui, pvc agent-temporal-pvc.
- Sources GitOps originales copiées (préfixe gitops-).

Pour restaurer : kubectl apply -f ~/kubinote-backups/zoho-temporal/<fichier>.yaml
Les YAMLs nettoyés (sans clusterIP hardcodés) sont dans Kubinote-GitOps/apps/agent-system/base/.
        """,
    },
]


# ── Embedding via LiteLLM ────────────────────────────────────────────────────

def embed(text: str) -> list[float]:
    """
    Appelle l'API Gemini text-embedding-004 directement avec outputDimensionality=1536.
    LiteLLM 1.51.0 ne supporte pas ce paramètre via le proxy — appel natif Google.
    """
    resp = httpx.post(
        f"{GEMINI_EMBED_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json={
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": EMBED_DIMS,
        },
        timeout=30.0,
    )
    resp.raise_for_status()
    vector = resp.json()["embedding"]["values"]
    if len(vector) != EMBED_DIMS:
        raise ValueError(f"Dimension inattendue : {len(vector)} ≠ {EMBED_DIMS}")
    return vector


# ── Qdrant ────────────────────────────────────────────────────────────────────

def ensure_collection(client: QdrantClient, reset: bool) -> None:
    existing = [c.name for c in client.get_collections().collections]
    if reset and COLLECTION in existing:
        client.delete_collection(COLLECTION)
        log.info("Collection '%s' supprimée (--reset)", COLLECTION)
        existing = []

    if COLLECTION not in existing:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=EMBED_DIMS, distance=Distance.COSINE),
            optimizers_config={"indexing_threshold": 1000},
            on_disk_payload=True,
        )
        log.info("Collection '%s' créée (dim=%d, Cosine)", COLLECTION, EMBED_DIMS)
    else:
        info = client.get_collection(COLLECTION)
        log.info(
            "Collection '%s' existante — %d vecteurs",
            COLLECTION, info.points_count or 0,
        )


def chunk_id(title: str, idx: int) -> str:
    """ID déterministe basé sur le titre + index chunk."""
    h = hashlib.md5(f"{title}::{idx}".encode()).hexdigest()
    return str(uuid.UUID(h))


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Ingère kubinote-brain dans Qdrant")
    parser.add_argument("--dry-run", action="store_true", help="Affiche les chunks sans ingérer")
    parser.add_argument("--reset",   action="store_true", help="Recrée la collection avant ingestion")
    args = parser.parse_args()

    log.info("Qdrant  : %s", QDRANT_URL)
    log.info("Embedding : gemini-embedding-001 via API Google  [dim=%d]", EMBED_DIMS)
    log.info("Chunks à ingérer : %d", len(KNOWLEDGE_BASE))

    if args.dry_run:
        for i, entry in enumerate(KNOWLEDGE_BASE, 1):
            print(f"\n[{i}] {entry['title']}  ({entry['category']})")
            print(f"     tags : {entry['tags']}")
            print(f"     {len(entry['content'].strip())} caractères")
        log.info("Dry-run — rien n'a été envoyé à Qdrant")
        return

    client = QdrantClient(url=QDRANT_URL, timeout=30)
    ensure_collection(client, args.reset)

    points: list[PointStruct] = []
    errors = 0

    for i, entry in enumerate(KNOWLEDGE_BASE, 1):
        text = f"{entry['title']}\n\n{entry['content'].strip()}"
        log.info("[%d/%d] Embedding : %s", i, len(KNOWLEDGE_BASE), entry["title"])
        try:
            vector = embed(text)
        except Exception as exc:
            log.error("  Erreur embedding : %s", exc)
            errors += 1
            continue

        points.append(
            PointStruct(
                id=chunk_id(entry["title"], 0),
                vector=vector,
                payload={
                    "title":    entry["title"],
                    "category": entry["category"],
                    "tags":     entry["tags"],
                    "content":  entry["content"].strip(),
                    "source":   "ingest_knowledge.py",
                    "date":     "2026-04-11",
                },
            )
        )
        time.sleep(0.3)   # évite le rate-limit Gemini free tier

    if points:
        client.upsert(collection_name=COLLECTION, points=points)
        log.info("Upsert terminé — %d points ingérés (erreurs : %d)", len(points), errors)
        info = client.get_collection(COLLECTION)
        log.info("Collection '%s' : %d vecteurs au total", COLLECTION, info.points_count or 0)
    else:
        log.error("Aucun point à ingérer (tous en erreur ?)")


if __name__ == "__main__":
    main()
