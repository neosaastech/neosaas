#!/usr/bin/env python3
"""
rag_monitor.py — Monitoring de la qualité RAG via Qdrant + Langfuse

Toutes les 30 minutes :
  1. Encode la requête de référence "Mission Croissance"
  2. Interroge Qdrant (collection neomnia_core)
  3. Enregistre le score du Fragment #1 dans Langfuse
  4. Logue les top-3 résultats en console + dans un fichier CSV

Usage :
  python3 rag_monitor.py                         # boucle infinie
  python3 rag_monitor.py --once                  # une seule passe
  python3 rag_monitor.py --interval 600          # toutes les 10 min
  python3 rag_monitor.py --query "autre question"

Logs CSV : /tmp/rag_monitor_scores.csv
"""

import argparse
import csv
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

QDRANT_URL    = os.getenv("QDRANT_URL", "http://51.159.27.101:6333")
COLLECTION    = os.getenv("QDRANT_COLLECTION", "neomnia_core")
EMBED_MODEL   = os.getenv("EMBED_MODEL",   "paraphrase-multilingual-MiniLM-L12-v2")

LANGFUSE_HOST       = os.getenv("LANGFUSE_HOST",       "http://langfuse.neokube.local")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "pk-lf-neokube-65c7fe8ce2894d7e")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "sk-lf-neokube-62a0bcee3a72d8de5fba107324")

DEFAULT_QUERY    = "Quelles sont les spécificités techniques du projet Mission Croissance ?"
DEFAULT_INTERVAL = 30 * 60   # 30 minutes en secondes
TOP_K            = 3

LOG_CSV = Path("/tmp/rag_monitor_scores.csv")

# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("rag_monitor")


def load_clients():
    """Charge les clients Qdrant, SentenceTransformer et Langfuse (lazy, une seule fois)."""
    from sentence_transformers import SentenceTransformer
    from qdrant_client import QdrantClient
    from langfuse import Langfuse

    log.info("Chargement du modèle d'embedding : %s", EMBED_MODEL)
    embed_model = SentenceTransformer(EMBED_MODEL)

    log.info("Connexion Qdrant : %s", QDRANT_URL)
    qdrant = QdrantClient(url=QDRANT_URL)

    log.info("Connexion Langfuse : %s", LANGFUSE_HOST)
    langfuse = Langfuse(
        public_key=LANGFUSE_PUBLIC_KEY,
        secret_key=LANGFUSE_SECRET_KEY,
        host=LANGFUSE_HOST,
    )

    return embed_model, qdrant, langfuse


def run_probe(query: str, embed_model, qdrant, langfuse) -> dict:
    """
    Exécute une sonde RAG complète :
      - encode la requête
      - interroge Qdrant
      - enregistre dans Langfuse
      - retourne un dict avec les résultats
    """
    ts = datetime.now(timezone.utc)
    ts_str = ts.strftime("%Y-%m-%dT%H:%M:%SZ")

    # ── 1. Récupérer le nb de points indexés ──────────────────────────────────
    try:
        info = qdrant.get_collection(COLLECTION)
        points_count = info.points_count or 0
    except Exception as e:
        log.warning("Impossible de lire la collection : %s", e)
        points_count = -1

    # ── 2. Encoder la requête ─────────────────────────────────────────────────
    vector = embed_model.encode(query).tolist()

    # ── 3. Recherche Qdrant ───────────────────────────────────────────────────
    results = qdrant.query_points(
        collection_name=COLLECTION,
        query=vector,
        limit=TOP_K,
        with_payload=True,
    ).points

    top_score  = results[0].score  if results else 0.0
    top_source = results[0].payload.get("relative_path", "N/A") if results else "N/A"
    top_text   = results[0].payload.get("text", "")[:300]       if results else ""

    # ── 4. Trace Langfuse ─────────────────────────────────────────────────────
    trace = langfuse.trace(
        name="rag-quality-probe",
        input={"query": query},
        output={
            "top_score":   round(top_score, 6),
            "top_source":  top_source,
            "top_snippet": top_text,
        },
        metadata={
            "collection":    COLLECTION,
            "points_indexed": points_count,
            "top_k":         TOP_K,
            "embed_model":   EMBED_MODEL,
        },
        tags=["rag-monitor", "mission-croissance"],
    )

    # Score principal — evolution trackable dans le dashboard Langfuse
    trace.score(
        name="rag_top1_similarity",
        value=round(top_score, 6),
        comment=f"Fragment #1 source: {top_source}",
    )

    # Score secondaire — nb de vecteurs indexés (progression de l'ingestion)
    trace.score(
        name="vectors_indexed",
        value=float(points_count),
        comment="Nombre de vecteurs dans neomnia_core au moment de la sonde",
    )

    # Spans pour chaque fragment retourné
    for i, r in enumerate(results, 1):
        trace.span(
            name=f"fragment_{i}",
            input={"rank": i},
            output={
                "score":   round(r.score, 6),
                "source":  r.payload.get("relative_path", "N/A"),
                "site":    r.payload.get("site", "N/A"),
                "snippet": r.payload.get("text", "")[:200],
            },
        )

    langfuse.flush()

    return {
        "timestamp":      ts_str,
        "points_indexed": points_count,
        "top_score":      round(top_score, 6),
        "top_source":     top_source,
        "results":        results,
    }


def log_to_csv(probe: dict) -> None:
    """Ajoute une ligne dans le CSV de suivi local."""
    write_header = not LOG_CSV.exists()
    with LOG_CSV.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(["timestamp", "points_indexed", "top_score", "top_source"])
        writer.writerow([
            probe["timestamp"],
            probe["points_indexed"],
            probe["top_score"],
            probe["top_source"],
        ])


def print_probe(probe: dict) -> None:
    """Affichage console détaillé de la sonde."""
    log.info("─" * 70)
    log.info("SONDE RAG — %s", probe["timestamp"])
    log.info("Collection : %s | Vecteurs indexés : %s",
             COLLECTION, probe["points_indexed"])
    log.info("Score top-1 : %.4f  ←  %s", probe["top_score"], probe["top_source"])
    log.info("─" * 70)

    for i, r in enumerate(probe["results"], 1):
        snippet = r.payload.get("text", "")[:200].replace("\n", " ")
        log.info(
            "  [#%d | %.4f] %s\n         %.200s",
            i, r.score,
            r.payload.get("relative_path", "?"),
            snippet,
        )

    log.info("─" * 70)


# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Monitoring RAG — Qdrant + Langfuse")
    parser.add_argument("--query",    default=DEFAULT_QUERY, help="Question de référence")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL,
                        help="Intervalle en secondes (défaut: 1800 = 30 min)")
    parser.add_argument("--once",     action="store_true",
                        help="Exécuter une seule sonde puis quitter")
    args = parser.parse_args()

    embed_model, qdrant, langfuse = load_clients()

    log.info("Monitoring démarré — query: %r", args.query)
    log.info("Intervalle : %d s | Collection : %s | Langfuse : %s",
             args.interval, COLLECTION, LANGFUSE_HOST)

    iteration = 0
    while True:
        iteration += 1
        log.info("=== Sonde #%d ===", iteration)

        try:
            probe = run_probe(args.query, embed_model, qdrant, langfuse)
            print_probe(probe)
            log_to_csv(probe)
            log.info("✓ Langfuse trace envoyée | CSV : %s", LOG_CSV)
        except Exception as e:
            log.error("Erreur sonde #%d : %s", iteration, e, exc_info=True)

        if args.once:
            break

        log.info("Prochaine sonde dans %d min…", args.interval // 60)
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
