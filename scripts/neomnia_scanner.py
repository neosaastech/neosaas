#!/usr/bin/env python3
"""
neomnia_scanner.py — Neomnia Studio · Intelligent File Scanner
==============================================================
Phase 1 du protocole d'ingestion RAG :
  - Cartographie récursive sans appel IA
  - Classification par type + extraction métadonnées
  - Filtre heavy_file_filter (visuels > seuil → Scaleway S3)
  - Sortie JSON structurée pour les phases Qdrant / Vision

Architecture extensible :
  ┌─ Scanner (ce module) ──────────────────────────────────────────┐
  │  scan() → ScanReport                                           │
  │  heavy_file_filter() → list[FileEntry]                        │
  └────────────────────────────────────────────────────────────────┘
       ↓ Phase 2 (à brancher)
  ┌─ Qdrant Ingestor (mass-ingestion.py) ──────────────────────────┐
  │  ingest_documents(report.categories["documents"])              │
  └────────────────────────────────────────────────────────────────┘
       ↓ Phase 3 (à brancher)
  ┌─ Vision Processor (à créer) ───────────────────────────────────┐
  │  process_visuals(report.categories["images"])                  │
  └────────────────────────────────────────────────────────────────┘

Usage :
  python neomnia_scanner.py [OPTIONS]

  --root DIR          Répertoire racine à scanner (défaut: ~/SharePoint)
  --output FILE       Fichier JSON de sortie (défaut: ~/scan_report.json)
  --heavy-threshold N Seuil en Mo pour heavy_file_filter (défaut: 5)
  --exclude DIR,...   Dossiers à ignorer (séparés par virgule)
  --max-workers N     Threads parallèles (défaut: 4)
  --quiet             Pas de barre de progression

Variables d'env :
  SCAN_ROOT, SCAN_OUTPUT, SCAN_HEAVY_MB, SCAN_EXCLUDE
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

log = logging.getLogger("neomnia-scanner")
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# ── Taxonomie des types de fichiers ──────────────────────────────────────────

FILE_TAXONOMY: dict[str, list[str]] = {
    "documents": [
        "pdf", "doc", "docx", "odt", "rtf",
        "xls", "xlsx", "ods", "csv",
        "ppt", "pptx", "odp",
        "txt", "md", "rst", "tex",
        "html", "htm", "xml",
        "xmind", "pub",
    ],
    "images": [
        "jpg", "jpeg", "png", "gif", "bmp", "webp",
        "tiff", "tif", "svg", "ico", "heic", "heif",
        "raw", "nef", "cr2", "arw", "dng",
        "psd", "ai", "eps", "sketch",
    ],
    "videos": [
        "mp4", "mov", "avi", "mkv", "wmv", "flv",
        "webm", "m4v", "3gp", "3g2", "mpg", "mpeg",
        "modd", "moff",
    ],
    "audio": [
        "mp3", "wav", "aac", "flac", "ogg", "wma",
        "m4a", "aiff", "opus",
    ],
    "k8s_manifests": [
        # détectés par extension ET contenu (voir _classify_yaml)
        "yaml", "yml",
    ],
    "code": [
        "py", "js", "ts", "go", "rs", "java", "c", "cpp",
        "sh", "bash", "zsh", "ps1", "tf", "hcl",
        "json", "toml", "ini", "env",
    ],
    "archives": [
        "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
        "zp", "zst",
    ],
    "data": [
        "sqlite", "db", "parquet", "avro", "ndjson",
        "jsonl", "arrow",
    ],
}

# Index inversé ext → catégorie
_EXT_INDEX: dict[str, str] = {
    ext: cat
    for cat, exts in FILE_TAXONOMY.items()
    for ext in exts
}

# Marqueurs K8s dans les YAML
_K8S_MARKERS = frozenset([
    "apiVersion:", "kind:", "metadata:", "spec:", "kubectl.kubernetes.io",
])

# Dossiers système à ignorer par défaut
DEFAULT_EXCLUDES = {
    ".git", "__pycache__", ".cache", "node_modules",
    ".terraform", ".venv", "venv", ".DS_Store",
}


# ── Structures de données ─────────────────────────────────────────────────────

@dataclass
class FileEntry:
    """Représente un fichier scanné."""
    path: str               # chemin absolu
    relative_path: str      # chemin relatif depuis la racine du scan
    filename: str
    extension: str          # minuscules, sans point
    category: str           # clé de FILE_TAXONOMY ou "other"
    size_bytes: int
    size_mb: float
    modified_at: str        # ISO 8601
    site: str               # sous-dossier racine (ex: "Production-clients")

    # Champs réservés pour les phases suivantes
    qdrant_indexed: bool = False    # Phase 2 : ingestion Qdrant
    s3_uploaded: bool = False       # Phase 2.5 : upload Scaleway S3
    vision_processed: bool = False  # Phase 3 : analyse Vision IA

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CategoryStats:
    count: int = 0
    total_bytes: int = 0

    @property
    def total_mb(self) -> float:
        return round(self.total_bytes / 1_048_576, 2)

    @property
    def total_gb(self) -> float:
        return round(self.total_bytes / 1_073_741_824, 3)

    def to_dict(self) -> dict:
        return {
            "count": self.count,
            "total_mb": self.total_mb,
            "total_gb": self.total_gb,
        }


@dataclass
class ScanReport:
    """Rapport complet du scan — entrée pour les phases suivantes."""
    scan_root: str
    scanned_at: str
    duration_seconds: float
    total_files: int
    total_bytes: int
    total_gb: float
    heavy_threshold_mb: float
    heavy_files_count: int          # fichiers visuels > seuil
    stats_by_category: dict[str, dict]
    stats_by_site: dict[str, dict]
    categories: dict[str, list[dict]]   # fichiers par catégorie
    errors: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


# ── Classification ────────────────────────────────────────────────────────────

def _classify_yaml(path: Path) -> str:
    """Lit les 5 premières lignes d'un YAML pour détecter un manifest K8s."""
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as fh:
            head = "".join(fh.readline() for _ in range(5))
        if any(marker in head for marker in _K8S_MARKERS):
            return "k8s_manifests"
    except OSError:
        pass
    return "code"


def classify_file(path: Path) -> str:
    """Retourne la catégorie d'un fichier selon sa taxonomie."""
    ext = path.suffix.lstrip(".").lower()
    if not ext:
        return "other"
    cat = _EXT_INDEX.get(ext, "other")
    # Affinage YAML : code ou manifest K8s ?
    if cat == "k8s_manifests":
        cat = _classify_yaml(path)
    return cat


# ── Filtre heavy_file_filter ──────────────────────────────────────────────────

def heavy_file_filter(
    entries: list[FileEntry],
    threshold_mb: float = 5.0,
    categories: tuple[str, ...] = ("images", "videos"),
) -> list[FileEntry]:
    """
    Isole les fichiers visuels dépassant le seuil de taille.

    Ces fichiers sont candidats à l'upload sur Scaleway S3 plutôt qu'à
    l'ingestion Qdrant (trop volumineux pour l'embedding textuel, traités
    par la phase Vision).

    Args:
        entries:       liste complète des FileEntry
        threshold_mb:  seuil en Mo (défaut: 5 Mo)
        categories:    catégories concernées (défaut: images + vidéos)

    Returns:
        Liste de FileEntry triée par taille décroissante.

    Phase suivante :
        for entry in heavy_file_filter(report_entries):
            s3_client.upload(entry.path, bucket="neokube-visuals")
            entry.s3_uploaded = True
    """
    threshold_bytes = int(threshold_mb * 1_048_576)
    heavy = [
        e for e in entries
        if e.category in categories and e.size_bytes >= threshold_bytes
    ]
    return sorted(heavy, key=lambda e: e.size_bytes, reverse=True)


# ── Scanner principal ─────────────────────────────────────────────────────────

def _walk_files(root: Path, excludes: set[str]) -> Iterator[Path]:
    """Générateur récursif de fichiers en ignorant les dossiers exclus."""
    try:
        for entry in os.scandir(root):
            if entry.name in excludes:
                continue
            if entry.is_symlink():
                continue
            if entry.is_dir(follow_symlinks=False):
                yield from _walk_files(Path(entry.path), excludes)
            elif entry.is_file(follow_symlinks=False):
                yield Path(entry.path)
    except PermissionError as exc:
        log.debug("Permission refusée : %s", exc)


def _process_file(path: Path, root: Path, site: str) -> FileEntry | None:
    """Construit un FileEntry pour un fichier. Retourne None si inaccessible."""
    try:
        stat = path.stat()
    except OSError:
        return None

    size_bytes = stat.st_size
    ext = path.suffix.lstrip(".").lower()
    category = classify_file(path)
    modified_at = datetime.fromtimestamp(
        stat.st_mtime, tz=timezone.utc
    ).isoformat()

    return FileEntry(
        path=str(path),
        relative_path=str(path.relative_to(root)),
        filename=path.name,
        extension=ext,
        category=category,
        size_bytes=size_bytes,
        size_mb=round(size_bytes / 1_048_576, 3),
        modified_at=modified_at,
        site=site,
    )


def scan(
    root: Path,
    heavy_threshold_mb: float = 5.0,
    excludes: set[str] | None = None,
    max_workers: int = 4,
    quiet: bool = False,
) -> ScanReport:
    """
    Point d'entrée principal du scanner.

    Args:
        root:               répertoire racine à scanner
        heavy_threshold_mb: seuil pour heavy_file_filter
        excludes:           noms de dossiers à ignorer
        max_workers:        threads pour les stat() I/O-bound
        quiet:              désactive la progression

    Returns:
        ScanReport complet, prêt à sérialiser en JSON.
    """
    if not root.exists():
        raise FileNotFoundError(f"Répertoire introuvable : {root}")

    excludes = (excludes or set()) | DEFAULT_EXCLUDES
    t_start = time.monotonic()

    # Détection des sites (sous-dossiers racine)
    sites = {
        d.name: d
        for d in root.iterdir()
        if d.is_dir() and d.name not in excludes
    } if root.is_dir() else {"root": root}

    all_entries: list[FileEntry] = []
    errors: list[str] = []

    # Stats accumulateurs
    stats_cat: dict[str, CategoryStats] = {}
    stats_site: dict[str, CategoryStats] = {}
    total_bytes = 0

    log.info("Scan démarré → %s (%d sites détectés)", root, len(sites))

    for site_name, site_dir in sorted(sites.items()):
        if not quiet:
            log.info("  ↳ site : %s", site_name)

        file_paths = list(_walk_files(site_dir, excludes))
        if not quiet:
            log.info("    %d fichiers trouvés", len(file_paths))

        # Traitement parallèle des stat()
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(_process_file, p, root, site_name): p
                for p in file_paths
            }
            for future in as_completed(futures):
                path = futures[future]
                try:
                    entry = future.result()
                except Exception as exc:
                    errors.append(f"{path}: {exc}")
                    continue

                if entry is None:
                    continue

                all_entries.append(entry)
                total_bytes += entry.size_bytes

                # Accumulation stats catégorie
                s = stats_cat.setdefault(entry.category, CategoryStats())
                s.count += 1
                s.total_bytes += entry.size_bytes

                # Accumulation stats site
                ss = stats_site.setdefault(site_name, CategoryStats())
                ss.count += 1
                ss.total_bytes += entry.size_bytes

    # Groupement par catégorie pour le rapport
    categories_grouped: dict[str, list[dict]] = {}
    for entry in all_entries:
        categories_grouped.setdefault(entry.category, []).append(entry.to_dict())

    # Tri interne par taille décroissante
    for cat in categories_grouped:
        categories_grouped[cat].sort(key=lambda e: e["size_bytes"], reverse=True)

    heavy = heavy_file_filter(all_entries, threshold_mb=heavy_threshold_mb)

    duration = round(time.monotonic() - t_start, 2)
    log.info(
        "Scan terminé en %.1fs — %d fichiers, %.2f Go",
        duration, len(all_entries), total_bytes / 1_073_741_824,
    )
    if heavy:
        log.info("  heavy_file_filter : %d fichiers visuels > %.0f Mo", len(heavy), heavy_threshold_mb)

    return ScanReport(
        scan_root=str(root),
        scanned_at=datetime.now(tz=timezone.utc).isoformat(),
        duration_seconds=duration,
        total_files=len(all_entries),
        total_bytes=total_bytes,
        total_gb=round(total_bytes / 1_073_741_824, 3),
        heavy_threshold_mb=heavy_threshold_mb,
        heavy_files_count=len(heavy),
        stats_by_category={k: v.to_dict() for k, v in sorted(stats_cat.items())},
        stats_by_site={k: v.to_dict() for k, v in sorted(stats_site.items())},
        categories=categories_grouped,
        errors=errors,
    )


# ── Hooks d'extension (stubs pour phases suivantes) ──────────────────────────

def hook_qdrant_ingest(report: ScanReport, qdrant_url: str = "") -> None:
    """
    Phase 2 — Ingestion Qdrant des documents textuels.

    Brancher ici mass-ingestion.py :
        from mass_ingestion import batch_ingest
        docs = [FileEntry(**e) for e in report.categories.get("documents", [])]
        batch_ingest(docs, qdrant_url=qdrant_url, collection="neomnia")
    """
    doc_count = len(report.categories.get("documents", []))
    log.info("[hook_qdrant_ingest] %d documents prêts — brancher mass-ingestion.py", doc_count)


def hook_vision_process(report: ScanReport, model: str = "") -> None:
    """
    Phase 3 — Traitement Vision IA des images.

    Brancher ici un modèle multimodal (LLaVA, GPT-4o, Mistral-Vision) :
        heavy = heavy_file_filter([FileEntry(**e)
                                   for e in report.categories.get("images", [])])
        for entry in heavy:
            caption = vision_model.describe(entry.path)
            # stocker dans Qdrant collection "neomnia-visuals"
    """
    img_count = len(report.categories.get("images", []))
    log.info("[hook_vision_process] %d images prêtes — brancher module Vision", img_count)


def hook_s3_upload(report: ScanReport, bucket: str = "neokube-visuals") -> None:
    """
    Phase 2.5 — Upload Scaleway S3 des fichiers lourds.

    Brancher ici boto3 + credentials Scaleway :
        import boto3
        s3 = boto3.client("s3", endpoint_url="https://s3.nl-ams.scw.cloud", ...)
        for entry in heavy_file_filter(...):
            s3.upload_file(entry.path, bucket, entry.relative_path)
    """
    heavy_count = report.heavy_files_count
    log.info("[hook_s3_upload] %d fichiers lourds prêts → bucket '%s'", heavy_count, bucket)


# ── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Neomnia Scanner — cartographie intelligente de fichiers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "--root",
        default=os.getenv("SCAN_ROOT", str(Path.home() / "SharePoint")),
        help="Répertoire racine à scanner",
    )
    p.add_argument(
        "--output",
        default=os.getenv("SCAN_OUTPUT", str(Path.home() / "scan_report.json")),
        help="Fichier JSON de sortie",
    )
    p.add_argument(
        "--heavy-threshold",
        type=float,
        default=float(os.getenv("SCAN_HEAVY_MB", "5")),
        metavar="MB",
        help="Seuil heavy_file_filter en Mo (défaut: 5)",
    )
    p.add_argument(
        "--exclude",
        default=os.getenv("SCAN_EXCLUDE", ""),
        help="Dossiers à ignorer, séparés par virgule",
    )
    p.add_argument(
        "--max-workers",
        type=int,
        default=4,
        metavar="N",
        help="Threads parallèles (défaut: 4)",
    )
    p.add_argument(
        "--summary-only",
        action="store_true",
        help="Rapport sans la liste détaillée des fichiers (plus léger)",
    )
    p.add_argument(
        "--quiet",
        action="store_true",
        help="Pas de logs de progression",
    )
    return p


def _print_summary(report: ScanReport) -> None:
    """Affiche un résumé humain dans le terminal."""
    print("\n" + "═" * 60)
    print(f"  NEOMNIA SCANNER — Rapport de scan")
    print("═" * 60)
    print(f"  Racine      : {report.scan_root}")
    print(f"  Durée       : {report.duration_seconds}s")
    print(f"  Total       : {report.total_files:,} fichiers · {report.total_gb:.2f} Go")
    print(f"  Heavy (>{report.heavy_threshold_mb:.0f}Mo) : {report.heavy_files_count:,} visuels → Scaleway S3")
    print(f"  Erreurs     : {len(report.errors)}")
    print()
    print("  Par catégorie :")
    for cat, stats in sorted(report.stats_by_category.items(), key=lambda x: -x[1]["total_mb"]):
        bar_len = min(30, int(stats["total_gb"] * 3))
        bar = "█" * bar_len
        print(f"    {cat:<18} {stats['count']:>7,} fichiers  {stats['total_gb']:>8.2f} Go  {bar}")
    print()
    print("  Par site :")
    for site, stats in sorted(report.stats_by_site.items(), key=lambda x: -x[1]["total_mb"]):
        print(f"    {site:<28} {stats['count']:>6,} fichiers  {stats['total_gb']:>7.2f} Go")
    print("═" * 60)
    print()


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    output = Path(args.output).expanduser().resolve()
    excludes = set(filter(None, args.exclude.split(",")))

    report = scan(
        root=root,
        heavy_threshold_mb=args.heavy_threshold,
        excludes=excludes,
        max_workers=args.max_workers,
        quiet=args.quiet,
    )

    # Affichage terminal
    _print_summary(report)

    # Sérialisation JSON
    data = report.to_dict()
    if args.summary_only:
        data.pop("categories", None)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)

    log.info("Rapport JSON écrit → %s", output)

    # Appel des hooks (stubs — à activer manuellement)
    hook_qdrant_ingest(report)
    hook_vision_process(report)
    hook_s3_upload(report)

    if report.errors:
        log.warning("%d erreur(s) de lecture — voir report.errors", len(report.errors))
        sys.exit(1)


if __name__ == "__main__":
    main()
