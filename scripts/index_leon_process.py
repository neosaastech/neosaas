#!/usr/bin/env python3
"""
Indexation de la documentation Leon dans Qdrant leon-memory.

Sources indexées :
  - CLAUDE-leon.md
  - CLAUDE-leon-process.md

Collection : leon-memory (768 dims, cosine, paraphrase-multilingual-mpnet-base-v2 via nomic-embed-text)

Usage :
  python3 ~/scripts/index_leon_process.py [--dry-run]
"""

import os
import sys
import json
import time
import hashlib
import asyncio
import argparse
from pathlib import Path

import httpx

LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://litellm.cockpit.svc.cluster.local:4000")
LITELLM_API_KEY  = os.environ.get("LITELLM_API_KEY", "")
QDRANT_URL       = os.environ.get("QDRANT_URL", "http://qdrant.rag-system.svc.cluster.local:6333")
COLLECTION       = "leon-memory"
EMBED_MODEL      = "nomic-embed-text"
CHUNK_SIZE       = 400   # mots
CHUNK_OVERLAP    = 60    # mots

SOURCES = [
    Path.home() / "CLAUDE-leon.md",
    Path.home() / "CLAUDE-leon-process.md",
]


# ── Découpage en chunks ──────────────────────────────────────────────────────

def chunk_text(text: str, source: str) -> list[dict]:
    """Découpe un texte en chunks avec overlap, retourne des dicts payload."""
    words = text.split()
    chunks = []
    i = 0
    chunk_index = 0
    while i < len(words):
        chunk_words = words[i : i + CHUNK_SIZE]
        chunk_text_str = " ".join(chunk_words)
        # Titre : première ligne non-vide du chunk
        title_line = next(
            (l.strip("# \t") for l in chunk_text_str.splitlines() if l.strip()),
            f"{source} §{chunk_index}"
        )
        chunks.append({
            "id":      hashlib.md5(f"{source}:{i}:{chunk_text_str[:80]}".encode()).hexdigest()[:16],
            "title":   title_line[:120],
            "content": chunk_text_str,
            "source":  source,
            "chunk":   chunk_index,
            "offset":  i,
        })
        i += CHUNK_SIZE - CHUNK_OVERLAP
        chunk_index += 1
    return chunks


# ── Embeddings ───────────────────────────────────────────────────────────────

async def embed_one(text: str) -> list[float]:
    """Antipattern #7 : HuggingFace via LiteLLM retourne 1 embedding par appel.
    Toujours passer un seul texte (string, pas list)."""
    async with httpx.AsyncClient(timeout=30.0) as c:
        r = await c.post(
            f"{LITELLM_BASE_URL}/v1/embeddings",
            headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
            json={"model": EMBED_MODEL, "input": text},
        )
        r.raise_for_status()
        emb = r.json()["data"][0]["embedding"]
        if emb and isinstance(emb[0], list):
            emb = emb[0]
        return emb


# ── Qdrant ───────────────────────────────────────────────────────────────────

async def ensure_collection(dims: int = 768):
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.get(f"{QDRANT_URL}/collections/{COLLECTION}")
        if r.status_code == 200:
            count = r.json().get("result", {}).get("points_count", 0)
            print(f"Collection {COLLECTION} existe déjà ({count} points)")
            return
        print(f"Création collection {COLLECTION} ({dims} dims, cosine)…")
        r2 = await c.put(
            f"{QDRANT_URL}/collections/{COLLECTION}",
            json={"vectors": {"size": dims, "distance": "Cosine"}},
        )
        r2.raise_for_status()
        print(f"Collection {COLLECTION} créée.")


async def upsert_points(points: list[dict]):
    """Upsert en batch de 50."""
    async with httpx.AsyncClient(timeout=30.0) as c:
        for i in range(0, len(points), 50):
            batch = points[i : i + 50]
            r = await c.put(
                f"{QDRANT_URL}/collections/{COLLECTION}/points",
                json={"points": batch},
            )
            r.raise_for_status()
            print(f"  Upsert {i}–{i+len(batch)-1} OK")


async def delete_source(source: str):
    """Supprime tous les points d'une source (pour re-indexation propre)."""
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.post(
            f"{QDRANT_URL}/collections/{COLLECTION}/points/delete",
            json={"filter": {"must": [{"key": "source", "match": {"value": source}}]}},
        )
        if r.status_code in (200, 201):
            print(f"  Points existants de '{source}' supprimés.")


# ── Main ─────────────────────────────────────────────────────────────────────

async def main(dry_run: bool = False):
    await ensure_collection()

    all_points = []
    for path in SOURCES:
        if not path.exists():
            print(f"[WARN] Fichier absent : {path}")
            continue
        text = path.read_text(encoding="utf-8")
        source = path.name
        chunks = chunk_text(text, source)
        print(f"{source} → {len(chunks)} chunks")

        if dry_run:
            for c in chunks[:3]:
                print(f"  [{c['chunk']}] {c['title'][:60]}…")
            continue

        # Supprimer l'ancienne version
        await delete_source(source)

        # Antipattern #7 : embedder 1 chunk à la fois
        for idx, ch in enumerate(chunks):
            vec = await embed_one(ch["content"])
            all_points.append({
                "id":      int(ch["id"], 16) % (2**63),
                "vector":  vec,
                "payload": {
                    "title":   ch["title"],
                    "content": ch["content"],
                    "source":  ch["source"],
                    "chunk":   ch["chunk"],
                },
            })
            print(f"  [{idx+1}/{len(chunks)}] embeddings {source} OK")
            await asyncio.sleep(0.2)

    if not dry_run and all_points:
        print(f"\nUpsert de {len(all_points)} points dans {COLLECTION}…")
        await upsert_points(all_points)
        print(f"\n✅ Indexation terminée — {len(all_points)} points dans {COLLECTION}")
    elif dry_run:
        print("\n[DRY RUN] Aucun upsert effectué.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # Recherche LITELLM_API_KEY si absent de l'env
    if not LITELLM_API_KEY:
        print("[WARN] LITELLM_API_KEY absent de l'env — tentative via Vault")
        import subprocess
        vault_token = subprocess.getoutput("kubectl get secret leon-vault-writer -n agent-system -o jsonpath='{.data.VAULT_TOKEN}' | base64 -d 2>/dev/null")
        if vault_token:
            import urllib.request
            req = urllib.request.Request(
                "http://vault.security.svc.cluster.local:8200/v1/secret/data/neokube/agents/leon",
                headers={"X-Vault-Token": vault_token},
            )
            try:
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = json.loads(resp.read())["data"]["data"]
                    os.environ["LITELLM_API_KEY"] = data.get("LITELLM_KEY_LEON", "")
            except Exception as e:
                print(f"[WARN] Vault inaccessible : {e}")

    asyncio.run(main(dry_run=args.dry_run))
