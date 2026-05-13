#!/usr/bin/env python3
"""
index-architecture-docs.py — Indexe les CLAUDE-*.md dans Qdrant neokube-architecture

Collection dédiée à la connaissance structurelle du cluster NeoKube :
fichiers GitOps, noms de ConfigMaps, ports, outils, antipatterns.

Charlotte recherche cette collection au démarrage de chaque mission complexe
pour trouver les chemins exacts sans les deviner.

Files indexés :
  CLAUDE-agents.md, CLAUDE.md (sections clés), CLAUDE-cluster.md,
  CLAUDE-connector.md, CLAUDE-antipatterns.md, CLAUDE-pipeline.md

Files exclus :
  CLAUDE-charlotte-prompt.md (circulaire — c'est elle)
  CLAUDE-history.md (éphémère)
  CLAUDE-eval.md, CLAUDE-dns.md, CLAUDE-dify.md, CLAUDE-ntfy.md (hors scope)

Usage:
  python3 index-architecture-docs.py           # indexe tout
  python3 index-architecture-docs.py --dry-run # affiche les chunks sans indexer
"""

import asyncio
import base64
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import httpx

LITELLM_URL = "http://litellm.neokube.local"
QDRANT_URL  = "http://qdrant.neokube.local"
COLLECTION  = "neokube-architecture"
EMBED_MODEL = "nomic-embed-text"
VECTOR_DIM  = 768
DRY_RUN     = "--dry-run" in sys.argv

# Fichiers à indexer — ordre = priorité
TARGET_FILES = [
    "CLAUDE-agents.md",
    "CLAUDE.md",
    "CLAUDE-cluster.md",
    "CLAUDE-connector.md",
    "CLAUDE-antipatterns.md",
    "CLAUDE-pipeline.md",
    "CLAUDE-vault.md",
    "CLAUDE-penpot.md",
]

BASE = Path("/home/neokube-beta")


def _kubectl_secret(secret: str, ns: str, key: str) -> str:
    r = subprocess.run(
        ["kubectl", "get", "secret", secret, "-n", ns,
         "-o", f"jsonpath={{.data.{key}}}"],
        capture_output=True, text=True,
    )
    if r.returncode != 0 or not r.stdout.strip():
        return ""
    return base64.b64decode(r.stdout.strip()).decode()


LITELLM_KEY = _kubectl_secret("cockpit-secrets", "cockpit", "LITELLM_MASTER_KEY")


# ─── Embedding ────────────────────────────────────────────────────────────────

async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(
            f"{LITELLM_URL}/v1/embeddings",
            headers={"Authorization": f"Bearer {LITELLM_KEY}"},
            json={"model": EMBED_MODEL, "input": text[:6000]},
        )
    data = r.json()["data"]
    # Antipattern #7 : HuggingFace via LiteLLM retourne 768 scalaires séparés
    # data est soit [{"embedding": [...]}] (OpenAI-style) soit un vecteur flat direct
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], dict):
            first = data[0]["embedding"]
            return first if isinstance(first, list) else [d["embedding"] for d in data]
        else:
            return data  # vecteur flat (HuggingFace)
    return data


# ─── Chunking ─────────────────────────────────────────────────────────────────

def chunk_file(path: Path) -> list[dict]:
    """
    Découpe un CLAUDE-*.md en chunks par section H2/H3.
    Chaque chunk = {source, section, content, tags}.
    Max ~800 chars par chunk pour rester dans la fenêtre de l'embedding model.
    """
    text = path.read_text(encoding="utf-8")
    source = path.name
    chunks = []

    # Split par headers H2 et H3
    sections = re.split(r'\n(#{1,3} .+)\n', text)

    current_section = f"[{source}]"
    buffer = ""

    for part in sections:
        if re.match(r'^#{1,3} ', part):
            if buffer.strip() and len(buffer.strip()) > 60:
                chunks.append(_make_chunk(source, current_section, buffer))
            current_section = part.strip()
            buffer = ""
        else:
            buffer += part

    if buffer.strip() and len(buffer.strip()) > 60:
        chunks.append(_make_chunk(source, current_section, buffer))

    # Split les chunks trop longs (>1000 chars) en sous-chunks
    result = []
    for chunk in chunks:
        content = chunk["content"]
        if len(content) <= 1000:
            result.append(chunk)
        else:
            # Découpe par paragraphes
            paras = [p.strip() for p in content.split('\n\n') if p.strip()]
            sub_buf = ""
            sub_idx = 0
            for para in paras:
                if len(sub_buf) + len(para) > 900:
                    if sub_buf:
                        c = chunk.copy()
                        c["content"] = sub_buf
                        import uuid as _uuid
                        c["section"] = f"{chunk['section']} (part {sub_idx+1})"
                        c["chunk_id"] = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, f"{chunk['chunk_id']}_{sub_idx}"))
                        result.append(c)
                        sub_idx += 1
                        sub_buf = ""
                sub_buf += ("\n\n" if sub_buf else "") + para
            if sub_buf:
                import uuid as _uuid
                c = chunk.copy()
                c["content"] = sub_buf
                c["section"] = f"{chunk['section']} (part {sub_idx+1})"
                c["chunk_id"] = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, f"{chunk['chunk_id']}_{sub_idx}"))
                result.append(c)

    return result


def _make_chunk(source: str, section: str, content: str) -> dict:
    import uuid as _uuid
    text_for_id = f"{source}:{section}:{content[:200]}"
    # Qdrant exige UUID ou entier — on dérive un UUID v5 déterministe depuis le hash
    chunk_id = str(_uuid.uuid5(_uuid.NAMESPACE_DNS, text_for_id))
    # Tags depuis le nom de section et de fichier
    tags = _extract_tags(source, section, content)
    return {
        "chunk_id":  chunk_id,
        "source":    source,
        "section":   section.lstrip('#').strip(),
        "content":   content.strip(),
        "tags":      tags,
    }


def _extract_tags(source: str, section: str, content: str) -> list[str]:
    tags = set()
    # Source-based tags
    if "agents" in source.lower():
        tags.add("agents")
    if "connector" in source.lower():
        tags.add("connectors")
    if "antipattern" in source.lower():
        tags.add("antipatterns")
    if "cluster" in source.lower():
        tags.add("cluster")
    if "pipeline" in source.lower():
        tags.add("pipeline")
    if "vault" in source.lower():
        tags.add("vault")
    # Content-based tags
    lower = (section + " " + content[:500]).lower()
    for kw in ["configmap", "deployment", "namespace", "kubectl", "gitops",
               "charlotte", "leon", "aria", "nox", "dispatcher",
               "qdrant", "temporal", "litellm", "langfuse",
               "mcp", "github", "neon", "vercel", "penpot",
               "vault", "secret", "admin-sys", "streaming",
               "antipattern", "sre", "tools", "outils", "port"]:
        if kw in lower:
            tags.add(kw)
    return sorted(tags)


# ─── Qdrant ───────────────────────────────────────────────────────────────────

async def ensure_collection() -> None:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{QDRANT_URL}/collections/{COLLECTION}")
        if r.status_code == 200:
            pts = r.json()["result"]["points_count"]
            print(f"✅ Collection {COLLECTION} existe ({pts} points)")
            return
        r2 = await c.put(
            f"{QDRANT_URL}/collections/{COLLECTION}",
            json={"vectors": {"size": VECTOR_DIM, "distance": "Cosine"}},
        )
        print(f"✅ Collection {COLLECTION} créée: HTTP {r2.status_code}")


async def upsert_chunk(chunk: dict, vector: list[float]) -> bool:
    import time
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.put(
            f"{QDRANT_URL}/collections/{COLLECTION}/points",
            json={"points": [{
                "id":      chunk["chunk_id"],
                "vector":  vector,
                "payload": {
                    "source":      chunk["source"],
                    "section":     chunk["section"],
                    "content":     chunk["content"],
                    "tags":        chunk["tags"],
                    "indexed_at":  __import__('datetime').datetime.utcnow().isoformat()[:10],
                },
            }]},
        )
    return r.status_code in (200, 201)


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    print(f"\n{'DRY RUN — ' if DRY_RUN else ''}Indexation neokube-architecture")
    print(f"Qdrant : {QDRANT_URL}/collections/{COLLECTION}")
    print(f"LiteLLM: {LITELLM_URL} (model: {EMBED_MODEL})")
    print()

    # Collecter les chunks
    all_chunks = []
    for fname in TARGET_FILES:
        path = BASE / fname
        if not path.exists():
            print(f"⚠️  {fname} introuvable — skip")
            continue
        chunks = chunk_file(path)
        print(f"  {fname}: {len(chunks)} chunks")
        all_chunks.extend(chunks)

    print(f"\nTotal : {len(all_chunks)} chunks à indexer\n")

    if DRY_RUN:
        for c in all_chunks[:5]:
            print(f"  [{c['source']} / {c['section'][:50]}] {c['content'][:100]}...")
        print(f"  ... ({len(all_chunks) - 5} autres)")
        return

    await ensure_collection()
    print()

    ok = err = 0
    for i, chunk in enumerate(all_chunks):
        try:
            vec = await embed(f"{chunk['section']}\n{chunk['content']}")
            success = await upsert_chunk(chunk, vec)
            if success:
                ok += 1
                print(f"  [{i+1}/{len(all_chunks)}] ✅ {chunk['source']} / {chunk['section'][:50]}")
            else:
                err += 1
                print(f"  [{i+1}/{len(all_chunks)}] ❌ upsert failed")
        except Exception as e:
            err += 1
            print(f"  [{i+1}/{len(all_chunks)}] ❌ {chunk['source']}: {e}")

    print(f"\n{'='*50}")
    print(f"Résultat : {ok} OK / {err} erreurs sur {len(all_chunks)} chunks")

    # Smoke test
    if ok > 0:
        print("\nSmoke test — recherche 'configmap sre charlotte script':")
        vec = await embed("configmap sre charlotte script")
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
                json={"vector": vec, "limit": 3, "with_payload": True},
            )
        for hit in r.json().get("result", []):
            src = hit["payload"].get("source", "")
            sec = hit["payload"].get("section", "")[:50]
            score = hit["score"]
            print(f"  score={score:.3f} [{src} / {sec}]")


if __name__ == "__main__":
    asyncio.run(main())
