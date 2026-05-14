#!/usr/bin/env python3
"""
index-claude-docs-surfsense.py
Indexe les fichiers CLAUDE*.md dans SurfSense (espace 2 — Infrastructure NeoKube).

Usage:
  python3 index-claude-docs-surfsense.py            # indexer tous les CLAUDE*.md
  python3 index-claude-docs-surfsense.py --dry-run  # simuler sans uploader
  python3 index-claude-docs-surfsense.py --force    # ré-uploader même si déjà présents
  python3 index-claude-docs-surfsense.py --space-id 3  # cibler un autre espace
"""
import os, sys, time, argparse, logging
from pathlib import Path
import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s — %(message)s")
log = logging.getLogger("claude-surfsense")

SURFSENSE_URL  = "http://surfsense-api.neokube.local"
TOKEN          = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMGY0M2EyMC02Zjk1LTQ0ZmQtODI5MS00ZmMyMzEwZmNjNjIiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTgwOTQ4OTA4M30.Mr47Y2ShtMCvJtQ0d86FJQt3gXk-bVjUxsDrkS7ETdo"
SPACE_ID       = 2
SPACE_NAME     = "Infrastructure NeoKube"
SPACE_DESC     = "Runbooks et architecture NeoKube : agents, cluster, Vault, DNS, antipatterns, pipeline"
DOCS_DIR       = Path("/home/neokube-beta/Kubinote-GitOps/docs")
FALLBACK_DIR   = Path("/home/neokube-beta")

HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def _get_docs_dir() -> Path:
    if DOCS_DIR.exists():
        return DOCS_DIR
    log.warning("Dossier Kubinote-GitOps/docs absent — fallback vers ~/CLAUDE*.md")
    return FALLBACK_DIR


def find_claude_md(base: Path) -> list[Path]:
    if base == FALLBACK_DIR:
        return sorted(base.glob("CLAUDE*.md"))
    return sorted(base.glob("CLAUDE*.md"))


def ensure_space(space_id: int) -> int:
    """Vérifie que l'espace cible existe ; si non, crée un nouvel espace.
    Retourne l'ID de l'espace effectif (peut différer de space_id si création)."""
    # 1. Vérifier si l'espace demandé existe
    try:
        r = httpx.get(
            f"{SURFSENSE_URL}/api/v1/searchspaces/{space_id}",
            headers=HEADERS, timeout=10,
        )
        if r.status_code == 200:
            log.info("Espace %d trouvé : %s", space_id, r.json().get("name", ""))
            return space_id
    except Exception as e:
        log.warning("ensure_space GET: %s", e)

    # 2. Chercher si un espace du même nom existe déjà
    try:
        r_list = httpx.get(
            f"{SURFSENSE_URL}/api/v1/searchspaces",
            headers=HEADERS, timeout=10,
        )
        if r_list.status_code == 200:
            for sp in r_list.json():
                if sp.get("name", "").lower() == SPACE_NAME.lower():
                    found_id = sp["id"]
                    log.info("Espace '%s' existant trouvé — id=%d", SPACE_NAME, found_id)
                    return found_id
    except Exception as e:
        log.warning("ensure_space list: %s", e)

    # 3. Créer l'espace
    log.info("Espace '%s' absent — création...", SPACE_NAME)
    try:
        r2 = httpx.post(
            f"{SURFSENSE_URL}/api/v1/searchspaces",
            headers={**HEADERS, "Content-Type": "application/json"},
            json={"name": SPACE_NAME, "description": SPACE_DESC},
            timeout=10,
        )
        if r2.status_code in (200, 201):
            created = r2.json()
            new_id = created.get("id", space_id)
            log.info("Espace créé — id=%d name=%s", new_id, created.get("name"))
            return new_id
        log.error("Création espace HTTP %s: %s", r2.status_code, r2.text[:300])
    except Exception as e:
        log.error("ensure_space create: %s", e)
    return 0


def get_existing_titles(space_id: int) -> set[str]:
    try:
        r = httpx.get(
            f"{SURFSENSE_URL}/api/v1/documents/search/titles",
            headers=HEADERS,
            params={"search_space_id": space_id, "page_size": 10000},
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list):
                titles = data
            elif "items" in data:
                titles = [item["title"] for item in data["items"]]
            else:
                titles = data.get("titles", [])
            result = {t.lower() for t in titles}
            log.info("Déjà indexés dans espace %d : %d documents", space_id, len(result))
            return result
    except Exception as e:
        log.warning("get_existing_titles: %s", e)
    return set()


def upload_file(f: Path, space_id: int) -> bool:
    try:
        with open(f, "rb") as fh:
            r = httpx.post(
                f"{SURFSENSE_URL}/api/v1/documents/fileupload",
                headers=HEADERS,
                data={"search_space_id": str(space_id), "should_summarize": "false"},
                files=[("files", (f.name, fh, "text/markdown"))],
                timeout=60,
            )
        if r.status_code == 200:
            return True
        log.error("Upload %s HTTP %s: %s", f.name, r.status_code, r.text[:200])
        return False
    except Exception as e:
        log.error("Upload %s exception: %s", f.name, e)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Simuler sans uploader")
    parser.add_argument("--force", action="store_true", help="Ré-uploader même si présent")
    parser.add_argument("--space-id", type=int, default=SPACE_ID, help="ID espace SurfSense (défaut: 2)")
    args = parser.parse_args()

    space_id = args.space_id
    base = _get_docs_dir()
    files = find_claude_md(base)

    if not files:
        log.error("Aucun CLAUDE*.md trouvé dans %s", base)
        sys.exit(1)

    log.info("=== index-claude-docs-surfsense — %d fichiers depuis %s ===", len(files), base)

    if not args.dry_run:
        actual_space_id = ensure_space(space_id)
        if not actual_space_id:
            log.error("Impossible de créer/trouver l'espace SurfSense — abandon")
            sys.exit(1)
        if actual_space_id != space_id:
            log.info("ID espace effectif : %d (demandé : %d)", actual_space_id, space_id)
        space_id = actual_space_id

    existing = set() if (args.dry_run or args.force) else get_existing_titles(space_id)

    ok = err = skip = 0
    for f in files:
        if not args.force and f.name.lower() in existing:
            log.info("  — %s (déjà indexé)", f.name)
            skip += 1
            continue
        if args.dry_run:
            log.info("  [dry] %s (%d octets)", f.name, f.stat().st_size)
            ok += 1
            continue
        if upload_file(f, space_id):
            log.info("  ✓ %s", f.name)
            ok += 1
        else:
            err += 1
        time.sleep(0.5)

    log.info("=== TERMINÉ — %d uploadés, %d erreurs, %d déjà présents ===", ok, err, skip)
    if err > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
