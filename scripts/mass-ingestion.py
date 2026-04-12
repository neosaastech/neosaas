#!/usr/bin/env python3
"""
mass-ingestion.py — Neomnia Studio · Phase 2 RAG
=================================================
Ingesteur de documents vers Qdrant.

Deux modes d'entrée :
  --scan-report FILE   Lit les chemins depuis un scan_report.json
                       (produit par neomnia_scanner.py) — MODE RECOMMANDÉ
  --sharepoint-dir DIR Scan filesystem classique (mode legacy)

Collection cible par défaut : neomnia_core
Chaque vecteur reçoit le tag : source_type = "document"

Usage :
  # Mode scan-report (Phase 2 standard)
  python mass-ingestion.py --scan-report ~/scan_report.json

  # Filtrer sur un ou plusieurs sites
  python mass-ingestion.py --scan-report ~/scan_report.json --sites Production-clients,Strategie

  # Reset complet de la collection
  python mass-ingestion.py --scan-report ~/scan_report.json --reset

  # Legacy filesystem scan
  python mass-ingestion.py --sharepoint-dir ~/SharePoint --collection neomnia_core

Variables d'env :
  QDRANT_URL          URL Qdrant (défaut: http://qdrant.neokube.local)
  QDRANT_API_KEY      Clé API si Qdrant sécurisé (optionnel)
"""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Generator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── Valeurs par défaut ────────────────────────────────────────────────────────
DEFAULT_QDRANT_URL  = os.getenv("QDRANT_URL", "http://51.159.27.101:6333")
DEFAULT_QDRANT_KEY  = os.getenv("QDRANT_API_KEY", "")
DEFAULT_COLLECTION  = "neomnia_core"
DEFAULT_SOURCE_TYPE = "document"
DEFAULT_BATCH_SIZE  = 32
DEFAULT_CHUNK_SIZE  = 512
DEFAULT_CHUNK_OVERLAP = 64
DEFAULT_MODEL        = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DEFAULT_MAX_FILE_MB  = 30      # fichiers > 30 Mo ignorés (CSV data, bases SEO…)
DEFAULT_MAX_CHUNKS   = 500     # sécurité : pas plus de 500 chunks par fichier
PROGRESS_FILE        = Path.home() / ".cache" / "rag-ingestion-progress.json"

# Extensions textuelles riches — on exclut csv/json/yaml (données brutes, pas du texte sémantique)
SUPPORTED_EXTENSIONS = {
    ".txt", ".md", ".rst",
    ".pdf",
    ".doc", ".docx", ".odt", ".rtf",
    ".xls", ".xlsx", ".ods",
    ".ppt", ".pptx", ".odp",
    ".html", ".htm",
}

# Extensions utiles mais à limiter en taille (données tabulaires, logs…)
TABULAR_EXTENSIONS = {".csv", ".json", ".yaml", ".yml", ".xml"}


# ── Lecteurs de fichiers ──────────────────────────────────────────────────────

def read_txt(path: Path) -> str:
    return path.read_text(errors="replace")


def read_pdf(path: Path) -> str:
    try:
        import fitz
        doc = fitz.open(str(path))
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    except Exception as e:
        log.warning("PDF non lisible %s : %s", path.name, e)
        return ""


def read_docx(path: Path) -> str:
    try:
        from docx import Document
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        log.warning("DOCX non lisible %s : %s", path.name, e)
        return ""


def read_xlsx(path: Path) -> str:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
        rows = []
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                line = "\t".join(str(c) if c is not None else "" for c in row)
                if line.strip():
                    rows.append(line)
        wb.close()
        return "\n".join(rows)
    except Exception as e:
        log.warning("XLSX non lisible %s : %s", path.name, e)
        return ""


def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".pdf":
        return read_pdf(path)
    if ext in (".docx", ".doc", ".odt", ".rtf"):
        return read_docx(path)
    if ext in (".xlsx", ".xls", ".ods"):
        return read_xlsx(path)
    return read_txt(path)


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if not text.strip():
        return []
    chunks, start = [], 0
    while start < len(text):
        chunk = text[start: start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


# ── Sources de fichiers ───────────────────────────────────────────────────────

def files_from_scan_report(
    report_path: Path,
    sites_filter: list[str] | None = None,
) -> list[dict]:
    """
    Lit scan_report.json (produit par neomnia_scanner.py) et retourne
    la liste des entrées de la catégorie 'documents'.

    Args:
        report_path:   chemin vers scan_report.json
        sites_filter:  si fourni, ne garde que ces sites SharePoint

    Returns:
        Liste de dicts FileEntry avec au moins : path, relative_path,
        filename, extension, site, size_mb.
    """
    with report_path.open(encoding="utf-8") as fh:
        report = json.load(fh)

    entries = report.get("categories", {}).get("documents", [])
    log.info("scan_report.json → %d documents trouvés", len(entries))

    if sites_filter:
        before = len(entries)
        entries = [e for e in entries if e.get("site") in sites_filter]
        log.info("  Filtre sites %s → %d/%d documents", sites_filter, len(entries), before)

    # Ne garder que les extensions supportées (hors données brutes)
    all_exts = SUPPORTED_EXTENSIONS | TABULAR_EXTENSIONS
    entries = [
        e for e in entries
        if f".{e.get('extension', '').lower()}" in all_exts
    ]
    log.info("  Extensions supportées → %d documents retenus", len(entries))

    return entries


def files_from_directory(root: Path) -> Generator[Path, None, None]:
    """Mode legacy : scan filesystem."""
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


# ── Fingerprint (reprise) ─────────────────────────────────────────────────────

def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    h.update(str(path.stat().st_size).encode())
    with open(path, "rb") as f:
        h.update(f.read(8192))
    return h.hexdigest()


def load_progress() -> set[str]:
    if PROGRESS_FILE.exists():
        return set(json.loads(PROGRESS_FILE.read_text()))
    return set()


def save_progress(done: set[str]) -> None:
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PROGRESS_FILE.write_text(json.dumps(list(done)))


# ── Qdrant ────────────────────────────────────────────────────────────────────

def make_qdrant_client(url: str, api_key: str):
    from qdrant_client import QdrantClient
    kwargs: dict = {"url": url, "timeout": 60}
    if api_key:
        kwargs["api_key"] = api_key
    return QdrantClient(**kwargs)


def ensure_collection(client, name: str, vector_size: int) -> None:
    from qdrant_client.models import Distance, VectorParams
    existing = [c.name for c in client.get_collections().collections]
    if name not in existing:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        log.info("Collection '%s' créée (dim=%d)", name, vector_size)
    else:
        info = client.get_collection(name)
        count = info.points_count or 0
        log.info("Collection '%s' existante — %d vecteurs déjà indexés", name, count)


def upsert_batch(
    client,
    collection: str,
    ids: list[str],
    vectors: list,
    payloads: list[dict],
) -> None:
    from qdrant_client.models import PointStruct
    points = [
        PointStruct(
            id=abs(hash(uid)) % (2**63),
            vector=vec,
            payload=payload,
        )
        for uid, vec, payload in zip(ids, vectors, payloads)
    ]
    client.upsert(collection_name=collection, points=points)


def build_payload(
    file_path: Path,
    root: Path | None,
    chunk_index: int,
    total_chunks: int,
    chunk_text_: str,
    source_type: str,
    extra_meta: dict | None = None,
) -> dict:
    """
    Construit le payload Qdrant standardisé.

    source_type: "document"  ← tag Phase 2
    En Phase 3 : source_type: "image"
    En Phase 4 : source_type: "vision_caption"
    """
    relative = str(file_path.relative_to(root)) if root else file_path.name
    site = Path(relative).parts[0] if Path(relative).parts else ""

    payload = {
        # ── Identité du fichier ──
        "source":        str(file_path),
        "relative_path": relative,
        "filename":      file_path.name,
        "extension":     file_path.suffix.lower().lstrip("."),
        "site":          site,
        # ── Chunk ──
        "chunk_index":   chunk_index,
        "total_chunks":  total_chunks,
        "text":          chunk_text_,
        # ── Tag de différenciation Phase 2/3 ──
        "source_type":   source_type,
        # ── Champs réservés phases suivantes ──
        "s3_key":        None,    # Phase 2.5 : chemin S3 une fois uploadé
        "vision_caption": None,   # Phase 3 : caption générée par LLM Vision
    }
    if extra_meta:
        payload.update(extra_meta)
    return payload


# ── Ingestion principale ──────────────────────────────────────────────────────

def ingest(
    file_entries: list[dict] | None,
    file_paths: list[Path] | None,
    root: Path | None,
    qdrant_url: str,
    qdrant_key: str,
    collection: str,
    source_type: str,
    batch_size: int,
    chunk_size: int,
    chunk_overlap: int,
    model_name: str,
    reset: bool,
    max_file_mb: float = DEFAULT_MAX_FILE_MB,
    max_chunks_per_file: int = DEFAULT_MAX_CHUNKS,
) -> None:
    """
    Cœur de l'ingestion. Accepte soit des FileEntry dicts (mode scan-report)
    soit une liste de Path (mode legacy).
    """
    t_start = time.monotonic()

    # Chargement du modèle d'embedding
    log.info("Chargement modèle embedding : %s", model_name)
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(model_name)
    vector_size = model.get_sentence_embedding_dimension()
    log.info("Modèle prêt — dimension vectorielle : %d", vector_size)

    # Connexion Qdrant
    log.info("Connexion Qdrant → %s", qdrant_url)
    client = make_qdrant_client(qdrant_url, qdrant_key)
    client.get_collections()  # test connexion
    log.info("Qdrant OK")

    if reset:
        try:
            client.delete_collection(collection)
            log.info("Collection '%s' supprimée (--reset)", collection)
        except Exception:
            pass

    ensure_collection(client, collection, vector_size)

    done = set() if reset else load_progress()
    if done:
        log.info("Reprise : %d fichiers déjà traités (skip)", len(done))

    # Normalisation de la liste de fichiers
    if file_entries is not None:
        items = [(Path(e["path"]), e) for e in file_entries]
    else:
        items = [(p, None) for p in (file_paths or [])]

    total = len(items)
    log.info("Démarrage ingestion — %d fichiers → collection '%s'", total, collection)
    log.info("source_type = '%s' | chunk_size = %d | batch = %d | max_file = %.0fMo | max_chunks = %d",
             source_type, chunk_size, batch_size, max_file_mb, max_chunks_per_file)

    batch_ids: list[str] = []
    batch_texts: list[str] = []
    batch_payloads: list[dict] = []
    files_done = 0
    total_chunks = 0
    errors = 0

    def flush_batch() -> None:
        nonlocal total_chunks
        if not batch_texts:
            return
        vectors = model.encode(
            batch_texts, batch_size=16, show_progress_bar=False
        ).tolist()
        upsert_batch(client, collection, batch_ids, vectors, batch_payloads)
        total_chunks += len(batch_texts)
        batch_ids.clear()
        batch_texts.clear()
        batch_payloads.clear()
        gc.collect()

    for i, (file_path, entry_meta) in enumerate(items, 1):
        try:
            fhash = file_hash(file_path)
        except OSError:
            log.warning("[%d/%d] Inaccessible : %s", i, total, file_path)
            errors += 1
            continue

        uid_base = f"{file_path}:{fhash}"
        if uid_base in done:
            continue

        size_mb = entry_meta["size_mb"] if entry_meta else round(file_path.stat().st_size / 1_048_576, 2)

        # Garde-fou taille : fichiers trop lourds = données brutes, pas de texte sémantique
        if size_mb > max_file_mb:
            log.warning("[%d/%d] SKIP (%.0f Mo > %.0f Mo limite) : %s",
                        i, total, size_mb, max_file_mb,
                        (entry_meta["relative_path"] if entry_meta else file_path.name)[:80])
            done.add(uid_base)
            continue

        log.info(
            "[%d/%d] %s (%.1f Mo)",
            i, total,
            (entry_meta["relative_path"] if entry_meta else file_path.name),
            size_mb,
        )

        try:
            text = extract_text(file_path)
        except Exception as exc:
            log.warning("  Erreur lecture : %s", exc)
            done.add(uid_base)
            errors += 1
            continue

        if not text.strip():
            log.debug("  Vide — ignoré")
            done.add(uid_base)
            continue

        chunks = chunk_text(text, chunk_size, chunk_overlap)
        if not chunks:
            done.add(uid_base)
            continue

        # Garde-fou chunks : tronque les fichiers qui génèrent trop de chunks
        if len(chunks) > max_chunks_per_file:
            log.warning("  TRONQUÉ : %d chunks → %d (limite par fichier)", len(chunks), max_chunks_per_file)
            chunks = chunks[:max_chunks_per_file]

        log.info("  → %d chunks", len(chunks))

        for j, chunk in enumerate(chunks):
            uid = f"{uid_base}:chunk{j}"
            payload = build_payload(
                file_path=file_path,
                root=root,
                chunk_index=j,
                total_chunks=len(chunks),
                chunk_text_=chunk,
                source_type=source_type,
                extra_meta={
                    "site": entry_meta.get("site", "") if entry_meta else "",
                    "size_mb": size_mb,
                },
            )
            batch_ids.append(uid)
            batch_texts.append(chunk)
            batch_payloads.append(payload)

            if len(batch_texts) >= batch_size:
                flush_batch()

        done.add(uid_base)
        files_done += 1

        if files_done % 20 == 0:
            save_progress(done)
            elapsed = time.monotonic() - t_start
            rate = files_done / elapsed if elapsed > 0 else 0
            eta = (total - i) / rate if rate > 0 else 0
            log.info(
                "  [checkpoint] %d/%d fichiers | %d chunks | %.1f f/s | ETA ~%ds",
                files_done, total, total_chunks, rate, int(eta),
            )

    flush_batch()
    save_progress(done)

    elapsed = round(time.monotonic() - t_start, 1)
    log.info("=" * 65)
    log.info("Ingestion terminée en %ss", elapsed)
    log.info("  Fichiers traités : %d / %d  (erreurs: %d)", files_done, total, errors)
    log.info("  Chunks indexés   : %d", total_chunks)
    log.info("  Collection       : '%s' sur %s", collection, qdrant_url)
    log.info("  source_type      : '%s'", source_type)

    # Vérifie le count final dans Qdrant
    try:
        info = client.get_collection(collection)
        log.info("  Vecteurs Qdrant  : %d", info.points_count or 0)
    except Exception:
        pass


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Neomnia Mass Ingestion — Documents → Qdrant neomnia_core",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    src = p.add_mutually_exclusive_group()
    src.add_argument(
        "--scan-report",
        metavar="FILE",
        default=str(Path.home() / "scan_report.json"),
        help="Rapport JSON de neomnia_scanner.py (défaut: ~/scan_report.json)",
    )
    src.add_argument(
        "--sharepoint-dir",
        metavar="DIR",
        help="Mode legacy : scan filesystem direct",
    )

    p.add_argument(
        "--sites",
        default="",
        metavar="SITE1,SITE2",
        help="Filtrer sur des sites SharePoint spécifiques (virgule-séparé)",
    )
    p.add_argument(
        "--qdrant-url",
        default=DEFAULT_QDRANT_URL,
        help=f"URL Qdrant (défaut: {DEFAULT_QDRANT_URL})",
    )
    p.add_argument(
        "--qdrant-api-key",
        default=DEFAULT_QDRANT_KEY,
        help="Clé API Qdrant (optionnel)",
    )
    p.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help=f"Nom de la collection Qdrant (défaut: {DEFAULT_COLLECTION})",
    )
    p.add_argument(
        "--source-type",
        default=DEFAULT_SOURCE_TYPE,
        help=f"Tag source_type dans le payload (défaut: {DEFAULT_SOURCE_TYPE})",
    )
    p.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    p.add_argument("--chunk-size", type=int, default=DEFAULT_CHUNK_SIZE)
    p.add_argument("--chunk-overlap", type=int, default=DEFAULT_CHUNK_OVERLAP)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument(
        "--max-file-mb",
        type=float,
        default=DEFAULT_MAX_FILE_MB,
        help=f"Ignore les fichiers > N Mo (défaut: {DEFAULT_MAX_FILE_MB})",
    )
    p.add_argument(
        "--max-chunks",
        type=int,
        default=DEFAULT_MAX_CHUNKS,
        help=f"Tronque à N chunks max par fichier (défaut: {DEFAULT_MAX_CHUNKS})",
    )
    p.add_argument(
        "--reset",
        action="store_true",
        help="Supprime et recrée la collection + ignore la progression sauvegardée",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    sites_filter = [s.strip() for s in args.sites.split(",") if s.strip()]

    if args.sharepoint_dir:
        # ── Mode legacy ──
        root = Path(args.sharepoint_dir).expanduser().resolve()
        if not root.exists():
            log.error("Répertoire introuvable : %s", root)
            sys.exit(1)
        file_paths = list(files_from_directory(root))
        log.info("Mode filesystem : %d fichiers dans %s", len(file_paths), root)
        ingest(
            file_entries=None,
            file_paths=file_paths,
            root=root,
            qdrant_url=args.qdrant_url,
            qdrant_key=args.qdrant_api_key,
            collection=args.collection,
            source_type=args.source_type,
            batch_size=args.batch_size,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap,
            model_name=args.model,
            reset=args.reset,
            max_file_mb=args.max_file_mb,
            max_chunks_per_file=args.max_chunks,
        )
    else:
        # ── Mode scan-report (Phase 2 standard) ──
        report_path = Path(args.scan_report).expanduser().resolve()
        if not report_path.exists():
            log.error("scan_report.json introuvable : %s", report_path)
            log.error("Lancez d'abord : python neomnia_scanner.py")
            sys.exit(1)

        entries = files_from_scan_report(report_path, sites_filter or None)
        if not entries:
            log.error("Aucun document trouvé dans le rapport (catégorie 'documents')")
            sys.exit(1)

        ingest(
            file_entries=entries,
            file_paths=None,
            root=None,
            qdrant_url=args.qdrant_url,
            qdrant_key=args.qdrant_api_key,
            collection=args.collection,
            source_type=args.source_type,
            batch_size=args.batch_size,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap,
            model_name=args.model,
            reset=args.reset,
            max_file_mb=args.max_file_mb,
            max_chunks_per_file=args.max_chunks,
        )


if __name__ == "__main__":
    main()
