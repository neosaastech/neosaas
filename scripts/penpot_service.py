"""
Admin-Sys Agent — v3.1 + LangGraph Embedded
Tourne sur port 8000 dans le pod (namespace open-webui).
Expose POST /action         {"prompt": str}  → Intent parser direct (Penpot).
Expose POST /v1/orchestrate {"prompt": str}  → Graphe LangGraph : designer → seo_check.
Providers LLM : anthropic | mistral | huggingface (Codestral-22B) | ollama
"""

import re
import uuid
import json
import os
import sqlite3
import difflib
import logging
import requests as _req
import anthropic
from typing import TypedDict
from fastapi import FastAPI
from pydantic import BaseModel
from langgraph.graph import StateGraph, END
try:
    from langgraph.checkpoint.sqlite import SqliteSaver
    _SQLITE_AVAILABLE = True
except ImportError:
    from langgraph.checkpoint.memory import MemorySaver as SqliteSaver
    _SQLITE_AVAILABLE = False

# ---------------------------------------------------------------------------
# Logging — niveau contrôlé par LOG_LEVEL (INFO par défaut, DEBUG pour tokens)
# ---------------------------------------------------------------------------
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, _LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("admin-sys-agent")
if _LOG_LEVEL == "DEBUG":
    log.debug("Mode DEBUG activé — tokens et appels LLM visibles")

app = FastAPI(title="Admin-Sys Agent", version="3.1")

# ---------------------------------------------------------------------------
# Config (lue depuis les variables d'environnement injectées par K8s)
# ---------------------------------------------------------------------------
PENPOT_TOKEN          = os.getenv("PENPOT_TOKEN",          "")
PENPOT_BACKEND        = os.getenv("PENPOT_BACKEND",        "http://penpot-backend.penpot.svc.cluster.local:6060")
CONTEXT_PATH          = os.getenv("CONTEXT_PATH",          "/data/sharepoint/Service-Marketing")
ANTHROPIC_API_KEY     = os.getenv("ANTHROPIC_API_KEY",     "")
MISTRAL_API_KEY       = os.getenv("MISTRAL_API_KEY",       "")  # Codestral via Mistral API
HUGGINGFACE_API_KEY   = os.getenv("HUGGINGFACE_API_KEY",   "")  # Codestral-22B via HF Inference
HUGGINGFACE_MODEL     = os.getenv("HUGGINGFACE_MODEL",     "mistralai/Codestral-22B-v0.1")
GRAPH_DB_PATH     = os.getenv("GRAPH_DB_PATH",     "/tmp/penpot-graph.db")
KNOWLEDGE_DB_PATH = os.getenv("KNOWLEDGE_DB_PATH", "/data/neokube_knowledge.db")
PENPOT_BASE_URL   = os.getenv("PENPOT_BASE_URL",   "https://penpot.neokube.local")

# ── Ollama ───────────────────────────────────────────────────────────────────
OLLAMA_URL        = os.getenv("OLLAMA_URL",        "http://localhost:11434")

# ── PostgreSQL Penpot (pour auto-refresh token) ──────────────────────────────
PENPOT_DB_HOST    = os.getenv("PENPOT_DB_HOST",    "penpot-postgres.penpot.svc.cluster.local")
PENPOT_DB_PORT    = int(os.getenv("PENPOT_DB_PORT", "5432"))
PENPOT_DB_NAME    = os.getenv("PENPOT_DB_NAME",    "penpot")
PENPOT_DB_USER    = os.getenv("PENPOT_DB_USER",    "penpot")
PENPOT_DB_PASS    = os.getenv("PENPOT_DB_PASS",    "penpot")

# Nom canonique du fichier brouillon — partagé entre les nœuds et les endpoints
DRAFT_FILE_NAME   = "NeoKube_Draft_Charles"


# ---------------------------------------------------------------------------
# LangGraph — État partagé entre les nœuds
# ---------------------------------------------------------------------------

class GraphState(TypedDict):
    prompt:          str    # prompt utilisateur original
    provider:        str    # fournisseur LLM (anthropic | openai | ollama)
    model:           str    # modèle LLM (vide = défaut provider)
    thread_id:       str    # ID de conversation pour la persistance
    design_result:   dict   # résultat produit par le nœud designer
    seo_report:      str    # rapport JSON produit par le nœud seo_check
    iterations:      int    # nombre d'itérations LLM utilisées
    # ── Champs sticky (persistés par SqliteSaver entre les appels) ──────────
    current_file_id: str    # file_id Penpot du brouillon courant
    file_url:        str    # URL directe Penpot vers ce fichier


# ---------------------------------------------------------------------------
# PenpotStateStore — persistance des IDs Penpot dans neokube_state.db
# Partage la connexion SQLite de LangGraph (check_same_thread=False).
# Initialisé après _db_conn (voir bas du fichier) ; utilisé via la variable
# globale `state_store` résolue au moment de l'appel (pas de la définition).
# ---------------------------------------------------------------------------

class PenpotStateStore:
    """Stocke les IDs Penpot créés par le sidecar dans la table penpot_files."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn
        self._init_table()

    def _init_table(self) -> None:
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS penpot_files (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id    TEXT    NOT NULL UNIQUE,
                file_name  TEXT    DEFAULT '',
                page_id    TEXT    DEFAULT '',
                frame_id   TEXT    DEFAULT '',
                project_id TEXT    DEFAULT '',
                source     TEXT    DEFAULT 'action',
                created_at TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            )
        """)
        self._conn.commit()
        log.info("[STATE] Table penpot_files prête dans neokube_state.db")

    def save_file(self, file_id: str, file_name: str = "", page_id: str = "",
                  project_id: str = "", source: str = "action") -> None:
        """Insère ou met à jour une entrée fichier (UPSERT sur file_id)."""
        try:
            self._conn.execute("""
                INSERT INTO penpot_files (file_id, file_name, page_id, project_id, source)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(file_id) DO UPDATE SET
                    file_name  = excluded.file_name,
                    page_id    = excluded.page_id,
                    project_id = excluded.project_id,
                    source     = excluded.source
            """, (file_id, file_name, page_id, project_id, source))
            self._conn.commit()
            log.info(f"[STATE] ✓ file_id={file_id!r} name={file_name!r} sauvegardé")
        except Exception as exc:
            log.error(f"[STATE] save_file : {exc}")

    def update_frame(self, file_id: str, frame_id: str) -> None:
        """Met à jour le frame_id d'un fichier existant."""
        try:
            self._conn.execute(
                "UPDATE penpot_files SET frame_id = ? WHERE file_id = ?",
                (frame_id, file_id),
            )
            self._conn.commit()
            log.info(f"[STATE] ✓ frame_id={frame_id!r} → file_id={file_id!r}")
        except Exception as exc:
            log.error(f"[STATE] update_frame : {exc}")

    def list_files(self) -> list[dict]:
        cur = self._conn.execute("""
            SELECT file_id, file_name, page_id, frame_id, project_id, source, created_at
            FROM penpot_files ORDER BY id DESC
        """)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

    def get_last(self) -> dict:
        cur = self._conn.execute("""
            SELECT file_id, file_name, page_id, frame_id, project_id, source, created_at
            FROM penpot_files ORDER BY id DESC LIMIT 1
        """)
        cols = [d[0] for d in cur.description]
        row  = cur.fetchone()
        return dict(zip(cols, row)) if row else {}


# Référence globale — initialisée après _db_conn (résolution Python au call-time)
state_store: "PenpotStateStore | None" = None


# ---------------------------------------------------------------------------
# Helpers Penpot
# ---------------------------------------------------------------------------

def _hdrs():
    return {
        "Authorization": f"Token {PENPOT_TOKEN}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }

def _get(cmd: str, params: dict = None) -> dict:
    url = f"{PENPOT_BACKEND}/api/rpc/command/{cmd}"
    try:
        r = _req.get(url, headers=_hdrs(), params=params or {}, timeout=5)
        return r.json() if r.ok else {"error": r.status_code, "detail": r.text[:300]}
    except Exception as e:
        return {"error": "network", "detail": str(e)}

def _post(cmd: str, body: dict) -> dict:
    url = f"{PENPOT_BACKEND}/api/rpc/command/{cmd}"
    try:
        r = _req.post(url, headers=_hdrs(), json=body, timeout=5)
        return r.json() if r.ok else {"error": r.status_code, "detail": r.text[:300]}
    except Exception as e:
        return {"error": "network", "detail": str(e)}

def _all_projects() -> list:
    teams = _get("get-teams")
    if not isinstance(teams, list):
        return []
    result = []
    for t in teams:
        ps = _get("get-projects", {"team-id": t.get("id", "")})
        if isinstance(ps, list):
            for p in ps:
                result.append({
                    "name":      p.get("name", ""),
                    "id":        p.get("id", ""),
                    "team_id":   t.get("id", ""),
                    "team_name": t.get("name", ""),
                })
    return result

def _resolve_project(name: str) -> dict:
    projects = _all_projects()
    if not projects:
        return {}
    nl = name.lower()
    for p in projects:
        if p["name"].lower() == nl or p["team_name"].lower() == nl:
            return p
    for p in projects:
        if nl in p["name"].lower() or nl in p["team_name"].lower():
            return p
    cands = {}
    for p in projects:
        cands[p["name"]] = p
        cands[p["team_name"]] = p
    m = difflib.get_close_matches(name, list(cands.keys()), n=1, cutoff=0.35)
    return cands[m[0]] if m else {}


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

def act_get_profile(_: dict) -> dict:
    d = _get("get-profile")
    if "error" in d:
        return d
    return {
        "name":               d.get("fullname"),
        "email":              d.get("email"),
        "default_project_id": d.get("defaultProjectId"),
        "default_team_id":    d.get("defaultTeamId"),
    }

def act_list_projects(_: dict) -> dict:
    projects = _all_projects()
    return {"projects": projects, "count": len(projects)}

def act_resolve_project(p: dict) -> dict:
    name = p.get("name", p.get("project_name", ""))
    if not name:
        return {"error": "Paramètre 'name' requis"}
    proj = _resolve_project(name)
    if not proj:
        all_p = _all_projects()
        return {"error": f"Projet '{name}' introuvable", "available": [x["name"] for x in all_p]}
    return proj

def act_create_file(p: dict) -> dict:
    name         = p.get("name", p.get("file_name", "Nouveau design"))
    project_id   = p.get("project_id", "")
    project_name = p.get("project_name", "")

    if not project_id:
        if project_name:
            proj = _resolve_project(project_name)
            if not proj:
                return {"error": f"Projet '{project_name}' introuvable"}
            project_id = proj["id"]
        else:
            prof = _get("get-profile")
            project_id = prof.get("defaultProjectId", "")

    if not project_id:
        return {"error": "Projet cible non résolu"}

    res = _post("create-file", {"name": name, "project-id": project_id, "is-shared": False})
    if "error" in res:
        return res
    data    = res.get("data", {})
    # Penpot retourne soit "pages" (liste ordonnée) soit "pagesIndex"/"pages-index" (dict)
    pages_list = data.get("pages", [])
    page_id    = pages_list[0] if pages_list else next(iter(
        data.get("pagesIndex", data.get("pages-index", {})).keys()
    ), "")
    out = {"file_id": res.get("id", ""), "file_name": res.get("name", ""), "page_id": page_id, "revn": res.get("revn", 0)}
    if state_store and out["file_id"]:
        state_store.save_file(
            file_id=out["file_id"],
            file_name=out["file_name"],
            page_id=out["page_id"],
            project_id=project_id,
        )
    return out

def _geom(x, y, w, h) -> dict:
    """Retourne les champs géométriques obligatoires pour l'API Penpot update-file."""
    return {
        "selrect": {"x": x, "y": y, "width": w, "height": h,
                    "x1": x, "y1": y, "x2": x + w, "y2": y + h},
        "points": [
            {"x": x,     "y": y},
            {"x": x + w, "y": y},
            {"x": x + w, "y": y + h},
            {"x": x,     "y": y + h},
        ],
        "transform":         {"a": 1, "b": 0, "c": 0, "d": 1, "e": 0, "f": 0},
        "transform-inverse": {"a": 1, "b": 0, "c": 0, "d": 1, "e": 0, "f": 0},
    }

def act_create_frame(p: dict) -> dict:
    file_id = p.get("file_id", "")
    page_id = p.get("page_id", "")
    if not file_id or not page_id:
        return {"error": "file_id et page_id requis"}
    sid       = str(uuid.uuid4())
    parent_id = p.get("parent_id", page_id)
    frame_id  = page_id  # frame racine : frame-id = page_id
    x, y, w, h = p.get("x", 0), p.get("y", 0), p.get("width", 400), p.get("height", 300)
    changes = [{
        "type": "add-obj", "id": sid,
        "page-id": page_id, "parent-id": parent_id,
        "frame-id": frame_id,
        "ignore-touched": True,
        "obj": {
            "id": sid, "type": "frame",
            "name":   p.get("name", "Frame"),
            "x": x, "y": y, "width": w, "height": h,
            "rotation": 0,
            "parent-id": parent_id,
            "frame-id":  frame_id,
            **_geom(x, y, w, h),
            "fills":   [{"fill-color": p.get("fill_color", "#FFFFFF"), "fill-opacity": 1}],
            "strokes": [], "shadow": [], "exports": [],
            "hidden": False, "blocked": False, "locked": False,
            "clip-content": True, "show-in-viewer": True, "shapes": [],
        },
    }]
    res = _post("update-file", {"id": file_id, "session-id": str(uuid.uuid4()), "revn": p.get("revn", 0), "vern": 0, "changes": changes})
    if "error" in res:
        return res
    return {"shape_id": sid, "new_revn": res.get("revn", 1)}

def act_insert_text(p: dict) -> dict:
    file_id = p.get("file_id", "")
    page_id = p.get("page_id", "")
    text    = p.get("text", "")
    if not file_id or not page_id or not text:
        return {"error": "file_id, page_id et text requis"}
    sid       = str(uuid.uuid4())
    parent_id = p.get("parent_id", page_id)
    # frame-id = parent si c'est un frame, sinon page_id (fallback)
    frame_id  = p.get("frame_id", parent_id if parent_id != page_id else page_id)
    x, y, w, h = p.get("x", 20), p.get("y", 20), p.get("width", 360), p.get("height", 50)
    changes = [{
        "type": "add-obj", "id": sid,
        "page-id": page_id, "parent-id": parent_id,
        "frame-id": frame_id,
        "ignore-touched": True,
        "obj": {
            "id": sid, "type": "text",
            "name":   text[:40],
            "x": x, "y": y, "width": w, "height": h,
            "rotation": 0,
            "parent-id": parent_id,
            "frame-id":  frame_id,
            **_geom(x, y, w, h),
            "fills": [], "strokes": [],
            "hidden": False, "blocked": False, "locked": False,
            "grow-type": "auto-height",
            "content": {"type": "root", "children": [{"type": "paragraph-set", "children": [{"type": "paragraph", "children": [{
                "text":       text,
                "fontSize":   str(p.get("font_size", 16)),
                "fontFamily": "sourcesanspro",
                "fontStyle":  "normal",
                "fontWeight": str(p.get("font_weight", 400)),
                "fillColor":  p.get("font_color", "#000000"),
                "fillOpacity": 1,
            }]}]}]},
        },
    }]
    res = _post("update-file", {"id": file_id, "session-id": str(uuid.uuid4()), "revn": p.get("revn", 0), "vern": 0, "changes": changes})
    if "error" in res:
        return res
    return {"shape_id": sid, "new_revn": res.get("revn", 1)}

def act_create_design(p: dict) -> dict:
    f = act_create_file(p)
    if "error" in f:
        return {"error": "create_file failed", "detail": f}
    file_id, page_id = f["file_id"], f["page_id"]

    fr = act_create_frame({
        "file_id": file_id, "page_id": page_id,
        "name": "Main Frame", "x": 50, "y": 50, "width": 800, "height": 500,
        "fill_color": p.get("bg_color", "#F8F9FA"),
    })
    frame_id = fr.get("shape_id", page_id)

    act_insert_text({
        "file_id": file_id, "page_id": page_id, "parent_id": frame_id,
        "text": p.get("headline", "Titre"), "x": 80, "y": 100,
        "width": 640, "height": 70, "font_size": 36, "font_weight": 700, "font_color": "#1A1A2E",
    })

    if p.get("subtext"):
        act_insert_text({
            "file_id": file_id, "page_id": page_id, "parent_id": frame_id,
            "text": p["subtext"], "x": 80, "y": 185,
            "width": 640, "height": 40, "font_size": 18, "font_color": "#555577",
        })

    out = {
        "status":   "ok",
        "file_id":  file_id,
        "page_id":  page_id,
        "frame_id": frame_id,
        "file_name": p.get("name", p.get("file_name", "Design IA")),
    }
    if state_store and file_id:
        state_store.update_frame(file_id, frame_id)
    return out

def act_fetch_ux(p: dict) -> dict:
    base  = CONTEXT_PATH
    query = p.get("query", "").lower()
    if not os.path.isdir(base):
        return {"error": f"Dossier introuvable : {base}"}
    results = []
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if not d.startswith(".") and "archive" not in d.lower()]
        for fname in files:
            if not any(fname.lower().endswith(e) for e in (".md", ".txt", ".json", ".csv")):
                continue
            fpath = os.path.join(root, fname)
            rel   = os.path.relpath(fpath, base)
            try:
                content = open(fpath, encoding="utf-8", errors="ignore").read(4000)
                if query and query not in content.lower() and query not in rel.lower():
                    continue
                results.append({"file": rel, "excerpt": content[:800]})
                if len(results) >= 5:
                    break
            except Exception:
                continue
        if len(results) >= 5:
            break
    if not results:
        return {"warning": f"Aucun fichier pour '{query}'", "available": os.listdir(base)[:20]}
    return {"query": query or "all", "count": len(results), "context": results}


# ---------------------------------------------------------------------------
# Section Pricing dédiée
# ---------------------------------------------------------------------------

def act_create_pricing_section(p: dict) -> dict:
    """Crée une section Pricing complète avec 3 plans dans un fichier existant ou nouveau."""
    section = p.get("section", {})

    # Résoudre le fichier cible
    file_name    = p.get("file_name", "NeoKube Landing V2")
    project_name = p.get("project_name", "")
    file_id      = p.get("file_id", "")
    page_id      = p.get("page_id", "")

    if not file_id:
        # Chercher le fichier existant par nom dans le projet
        proj = _resolve_project(project_name) if project_name else {}
        project_id = proj.get("id", "")
        if not project_id:
            prof = _get("get-profile")
            project_id = prof.get("defaultProjectId", "")

        files = _get("get-project-files", {"project-id": project_id})
        if isinstance(files, list):
            for f in files:
                if f.get("name", "").lower() == file_name.lower():
                    file_id = f.get("id", "")
                    break

        if not file_id:
            return {"error": f"Fichier '{file_name}' introuvable. Utilisez file_id explicitement."}

    if not page_id:
        fdata = _get("get-file", {"id": file_id, "features[]": "fdata/objects-map"})
        pages = fdata.get("data", {}).get("pages", [])
        page_id = pages[0] if pages else ""

    if not page_id:
        return {"error": "Impossible de résoudre page_id"}

    y0         = section.get("y_offset", 1400)
    width      = section.get("width",    1440)
    height     = section.get("height",   900)
    bg         = section.get("bg_color", "#0F172A")
    title_col  = section.get("title_color", "#F8FAFC")
    card_col   = section.get("card_color",  "#1E293B")
    title_text = section.get("title", "Un plan pour chaque étape de votre croissance")
    tiers      = section.get("tiers", [
        {"name":"Starter",    "price":"0€",       "sub":"/mois", "features":["1 cluster K8s","5 pipelines CI/CD","Support communauté"],           "cta":"Commencer gratuitement","highlight":False},
        {"name":"Pro",        "price":"49€",      "sub":"/mois", "features":["5 clusters K8s","Pipelines illimités","Support prioritaire","IaC"],  "cta":"Démarrer l'essai",      "highlight":True},
        {"name":"Enterprise", "price":"Sur devis","sub":"",      "features":["Clusters illimités","SLA 99,99%","Support 24/7","Onboarding dédié"], "cta":"Contacter l'équipe",    "highlight":False},
    ])

    created = []

    # ── Frame de fond ────────────────────────────────────────────────────
    bg_frame = act_create_frame({"file_id":file_id,"page_id":page_id,
        "name":"Pricing Section","x":0,"y":y0,"width":width,"height":height,"fill_color":bg})
    if "error" in bg_frame:
        return bg_frame
    bg_id = bg_frame["shape_id"]
    created.append(f"Frame fond ({bg})")

    # ── Titre de section ─────────────────────────────────────────────────
    act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":bg_id,"frame_id":bg_id,
        "text":title_text,"x":120,"y":y0+60,"width":1200,"height":70,
        "font_size":40,"font_weight":700,"font_color":title_col})
    created.append("Titre section")

    # ── 3 cartes plan ────────────────────────────────────────────────────
    n       = len(tiers)
    margin  = 60
    c_width = (width - margin * (n + 1)) // n   # ≈ 420px pour 3 plans
    c_y     = y0 + 180

    for i, tier in enumerate(tiers):
        cx       = margin + i * (c_width + margin)
        is_pro   = tier.get("highlight", False)
        c_fill   = "#6366F1" if is_pro else card_col
        c_height = 520

        # Frame carte
        card = act_create_frame({"file_id":file_id,"page_id":page_id,
            "parent_id":bg_id,
            "name":tier["name"],"x":cx,"y":c_y,"width":c_width,"height":c_height,
            "fill_color":c_fill})
        if "error" in card:
            continue
        cid = card["shape_id"]
        created.append(f"Carte {tier['name']}")

        # Badge "Recommandé"
        if is_pro:
            act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":cid,"frame_id":cid,
                "text":"★ Recommandé","x":cx+20,"y":c_y+18,"width":c_width-40,"height":30,
                "font_size":13,"font_weight":600,"font_color":"#E0E7FF"})

        # Nom du plan
        act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":cid,"frame_id":cid,
            "text":tier["name"],"x":cx+30,"y":c_y+60,"width":c_width-60,"height":44,
            "font_size":24,"font_weight":700,"font_color":"#FFFFFF" if is_pro else title_col})

        # Prix
        price_str = f"{tier['price']}  {tier.get('sub','')}".strip()
        act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":cid,"frame_id":cid,
            "text":price_str,"x":cx+30,"y":c_y+120,"width":c_width-60,"height":50,
            "font_size":36,"font_weight":800,"font_color":"#FFFFFF" if is_pro else "#6366F1"})

        # Features
        feat_text = "\n".join(f"✓  {f}" for f in tier.get("features", []))
        act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":cid,"frame_id":cid,
            "text":feat_text,"x":cx+30,"y":c_y+190,"width":c_width-60,"height":220,
            "font_size":15,"font_weight":400,"font_color":"#C7D2FE" if is_pro else "#64748B"})

        # CTA
        act_insert_text({"file_id":file_id,"page_id":page_id,"parent_id":cid,"frame_id":cid,
            "text":tier.get("cta","Commencer"),"x":cx+30,"y":c_y+c_height-70,
            "width":c_width-60,"height":44,
            "font_size":16,"font_weight":700,
            "font_color":"#6366F1" if not is_pro else "#FFFFFF"})

    return {
        "status":   "ok",
        "file_id":  file_id,
        "page_id":  page_id,
        "section":  "Pricing Section",
        "y_offset": y0,
        "frames":   len(tiers) + 1,
        "created":  created,
    }


# ---------------------------------------------------------------------------
# Intent parser (JSON first, puis langage naturel)
# ---------------------------------------------------------------------------

ACTIONS = {
    "get_profile":        act_get_profile,
    "profile":            act_get_profile,
    "list_projects":      act_list_projects,
    "projects":           act_list_projects,
    "resolve_project":    act_resolve_project,
    "find_project":       act_resolve_project,
    "create_file":        act_create_file,
    "create_frame":       act_create_frame,
    "insert_text":        act_insert_text,
    "add_text":           act_insert_text,
    "create_design":      act_create_design,
    "design":             act_create_design,
    "fetch_ux":              act_fetch_ux,
    "fetch_ux_experience":   act_fetch_ux,
    "context":               act_fetch_ux,
    "create_pricing_section": act_create_pricing_section,
    "pricing":               act_create_pricing_section,
}

# ---------------------------------------------------------------------------
# Master Agent — System Prompt (persisté dans backups/prompts/)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
Tu es le cerveau de NeoKube, l'orchestrateur de design IA.
Tu as accès à des outils Penpot pour créer et modifier des designs directement dans Penpot (outil de design open-source).

## Contexte produit
NeoKube est une plateforme DevOps cloud-native (Kubernetes, CI/CD, IaC Terraform).
Identité visuelle : moderne, dark mode, couleurs indigo/bleu nuit — palette principale : #0F172A (fond), #6366F1 (accent indigo), #F8FAFC (texte clair), #1E293B (carte/surface).

## Règles de travail
- Utilise TOUJOURS les outils disponibles pour toute action design concrète. Ne simule jamais une action.
- Si tu as besoin d'un file_id ou page_id, commence par list_projects + resolve_project pour les obtenir.
- Pour une section Pricing complète → create_pricing_section.
- Pour un design from scratch → create_design.
- Enchaîne les appels d'outils sans demander confirmation intermédiaire.
- Réponds en français. Sois concis et professionnel.
- Après execution, fournis un résumé : éléments créés, IDs, localisation dans Penpot.
"""

# ---------------------------------------------------------------------------
# Outils Penpot exposés au LLM (format Anthropic tool_use / OpenAI functions)
# ---------------------------------------------------------------------------

PENPOT_TOOLS = [
    {
        "name": "get_profile",
        "description": "Récupère le profil utilisateur Penpot (nom, email, IDs par défaut).",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "list_projects",
        "description": "Liste tous les projets Penpot accessibles avec leurs IDs.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "resolve_project",
        "description": "Trouve un projet Penpot par son nom (fuzzy matching). Retourne l'ID du projet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nom du projet à trouver"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "create_file",
        "description": "Crée un nouveau fichier de design dans un projet Penpot. Retourne file_id et page_id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_name":    {"type": "string", "description": "Nom du fichier"},
                "project_name": {"type": "string", "description": "Nom du projet cible"},
            },
            "required": ["file_name"],
        },
    },
    {
        "name": "create_frame",
        "description": "Crée un frame (rectangle/section) dans un fichier Penpot.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_id":    {"type": "string"},
                "page_id":    {"type": "string"},
                "name":       {"type": "string"},
                "x":          {"type": "number"},
                "y":          {"type": "number"},
                "width":      {"type": "number"},
                "height":     {"type": "number"},
                "fill_color": {"type": "string", "description": "Couleur hex (#RRGGBB)"},
                "parent_id":  {"type": "string", "description": "ID du frame parent (optionnel)"},
                "revn":       {"type": "number"},
            },
            "required": ["file_id", "page_id"],
        },
    },
    {
        "name": "insert_text",
        "description": "Insère un texte dans un fichier Penpot.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_id":     {"type": "string"},
                "page_id":     {"type": "string"},
                "text":        {"type": "string"},
                "x":           {"type": "number"},
                "y":           {"type": "number"},
                "width":       {"type": "number"},
                "height":      {"type": "number"},
                "font_size":   {"type": "number"},
                "font_weight": {"type": "number"},
                "font_color":  {"type": "string"},
                "parent_id":   {"type": "string"},
                "frame_id":    {"type": "string"},
                "revn":        {"type": "number"},
            },
            "required": ["file_id", "page_id", "text"],
        },
    },
    {
        "name": "create_design",
        "description": "Crée un design complet (fichier + frame + titre) dans Penpot.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_name":    {"type": "string", "description": "Nom du fichier à créer"},
                "project_name": {"type": "string"},
                "headline":     {"type": "string", "description": "Titre principal du design"},
                "bg_color":     {"type": "string", "description": "Couleur de fond hex"},
            },
            "required": ["file_name"],
        },
    },
    {
        "name": "fetch_ux",
        "description": "Recherche dans les fichiers de contexte marketing/UX (SharePoint Service-Marketing).",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Terme de recherche"},
            },
            "required": [],
        },
    },
    {
        "name": "create_pricing_section",
        "description": "Crée une section Pricing complète avec 3 plans tarifaires (Starter/Pro/Enterprise) dans un fichier Penpot existant.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_name":    {"type": "string", "description": "Nom du fichier cible"},
                "project_name": {"type": "string", "description": "Nom du projet"},
                "file_id":      {"type": "string", "description": "ID direct du fichier (optionnel)"},
                "page_id":      {"type": "string", "description": "ID de la page (optionnel)"},
                "section": {
                    "type": "object",
                    "description": "Config section : y_offset, width, height, bg_color, title_color, title, tiers[]",
                },
            },
            "required": [],
        },
    },
]

PENPOT_TOOL_ACTIONS = {
    "get_profile":            act_get_profile,
    "list_projects":          act_list_projects,
    "resolve_project":        act_resolve_project,
    "create_file":            act_create_file,
    "create_frame":           act_create_frame,
    "insert_text":            act_insert_text,
    "create_design":          act_create_design,
    "fetch_ux":               act_fetch_ux,
    "create_pricing_section": act_create_pricing_section,
}

# ---------------------------------------------------------------------------
# LLMManager — abstraction multi-provider (Anthropic / OpenAI / Ollama)
# ---------------------------------------------------------------------------

class LLMManager:
    """
    Gestionnaire LLM multi-provider.

    Provider actif   : anthropic (Claude)    ← défaut opérationnel
    Stubs disponibles: openai (GPT-4o), ollama (Llama 3.x)
    Actif (optionnel): mistral (Codestral)   ← SRE / code execution

    Pour activer OpenAI  : définir OPENAI_API_KEY,  passer provider="openai"
    Pour activer Ollama  : définir OLLAMA_URL,       passer provider="ollama"
    Pour activer Mistral : définir MISTRAL_API_KEY,  passer provider="mistral"
    """

    SUPPORTED = ("anthropic", "openai", "ollama", "mistral", "huggingface")

    def __init__(self) -> None:
        self._anthropic_client  = None  # lazy init
        self._mistral_client    = None  # lazy init
        self._hf_client         = None  # lazy init — HuggingFace InferenceClient

    # ── Anthropic (lazy singleton) ────────────────────────────────────────
    @property
    def _anthropic(self):
        if self._anthropic_client is None:
            if not ANTHROPIC_API_KEY:
                raise RuntimeError("ANTHROPIC_API_KEY manquante dans les env vars.")
            self._anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        return self._anthropic_client

    # ── Point d'entrée public ─────────────────────────────────────────────
    def get_llm_response(
        self,
        messages: list,
        tools: list,
        system: str,
        model_name: str = "",
        provider: str = "anthropic",
        max_tokens: int = 4096,
    ) -> dict:
        """
        Appelle le LLM indiqué et retourne un dict normalisé :
        {
            "stop_reason": str,          # "end_turn" | "tool_use" | ...
            "tool_uses":   list[dict],   # [{id, name, input}]
            "text":        str,          # texte final (vide si tool_use)
            "raw":         any,          # objet réponse brut du provider
        }
        """
        log.info(f"[LLM] provider={provider}  model={model_name or 'default'}")
        provider = (provider or "anthropic").lower()
        if provider not in self.SUPPORTED:
            raise ValueError(f"Provider inconnu : '{provider}'. Valides : {self.SUPPORTED}")

        if provider == "anthropic":
            return self._call_anthropic(messages, tools, system,
                                        model_name or "claude-sonnet-4-5", max_tokens)
        if provider == "openai":
            return self._call_openai(messages, tools, system,
                                     model_name or "gpt-4o", max_tokens)
        if provider == "mistral":
            return self._call_mistral(messages, tools, system,
                                      model_name or "codestral-latest", max_tokens)
        if provider == "huggingface":
            return self._call_huggingface(messages, tools, system,
                                          model_name or HUGGINGFACE_MODEL, max_tokens)
        # ollama
        return self._call_ollama(messages, tools, system,
                                 model_name or "llama3.1", max_tokens)

    # ── Anthropic ─────────────────────────────────────────────────────────
    def _call_anthropic(self, messages, tools, system, model, max_tokens) -> dict:
        response = self._anthropic.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            tools=tools,
            messages=messages,
        )
        tool_uses = [
            {"id": b.id, "name": b.name, "input": b.input}
            for b in response.content if b.type == "tool_use"
        ]
        text = "\n".join(b.text for b in response.content if b.type == "text").strip()
        return {"stop_reason": response.stop_reason, "tool_uses": tool_uses,
                "text": text, "raw": response}

    # ── OpenAI (stub) ─────────────────────────────────────────────────────
    def _call_openai(self, messages, tools, system, model, max_tokens) -> dict:
        """
        Stub OpenAI — implémentation à activer quand nécessaire.

        Pour implémenter :
          pip install openai>=1.0
          Convertir PENPOT_TOOLS au format OpenAI function-calling.
          Adapter la boucle tool_use (tool_calls vs tool_use).
        """
        raise NotImplementedError(
            "OpenAI provider non encore activé. "
            "Implémentez _call_openai() et installez openai>=1.0."
        )

    # ── Mistral / Codestral ───────────────────────────────────────────────
    @property
    def _mistral(self):
        if self._mistral_client is None:
            try:
                try:
                    from mistralai.client import Mistral as _Mistral  # v2.x
                except ImportError:
                    from mistralai import Mistral as _Mistral  # v1.x fallback
            except ImportError:
                raise RuntimeError(
                    "mistralai SDK manquant. Installez : pip install mistralai>=1.0.0"
                )
            key = os.getenv("MISTRAL_API_KEY", "")
            if not key:
                raise RuntimeError("MISTRAL_API_KEY manquante dans les env vars.")
            self._mistral_client = _Mistral(api_key=key)
        return self._mistral_client

    def _call_mistral(self, messages, tools, system, model, max_tokens) -> dict:
        """
        Appel Mistral/Codestral — format OpenAI-compatible.
        Codestral ne supporte pas le tool_use Anthropic ; les outils sont ignorés
        (utiliser Codestral en mode texte pur, idéal pour le nœud SRE).
        """
        mistral_messages = [{"role": "system", "content": system}] + [
            {"role": m["role"], "content": m["content"] if isinstance(m["content"], str)
             else json.dumps(m["content"], ensure_ascii=False)}
            for m in messages
        ]
        response = self._mistral.chat.complete(
            model=model,
            messages=mistral_messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        text = response.choices[0].message.content.strip() if response.choices else ""
        return {"stop_reason": "end_turn", "tool_uses": [], "text": text, "raw": response}

    # ── HuggingFace — Codestral-22B-v0.1 ─────────────────────────────────────
    @property
    def _hf(self):
        if self._hf_client is None:
            try:
                from huggingface_hub import InferenceClient
            except ImportError:
                raise RuntimeError(
                    "huggingface_hub manquant. pip install huggingface-hub>=0.22.0"
                )
            key = os.getenv("HUGGINGFACE_API_KEY", "")
            if not key:
                raise RuntimeError("HUGGINGFACE_API_KEY manquante dans les env vars.")
            self._hf_client = InferenceClient(api_key=key)
            log.info(f"[HF] InferenceClient initialisé — modèle cible: {HUGGINGFACE_MODEL}")
        return self._hf_client

    def _call_huggingface(self, messages, tools, system, model, max_tokens) -> dict:
        """
        HuggingFace Inference API — OpenAI-compatible.
        Modèle par défaut : mistralai/Codestral-22B-v0.1
        Mode texte pur (pas de tool_use Anthropic).
        """
        hf_messages = [{"role": "system", "content": system}] + [
            {
                "role": m["role"],
                "content": m["content"] if isinstance(m["content"], str)
                           else json.dumps(m["content"], ensure_ascii=False),
            }
            for m in messages
        ]
        log.debug(f"[HF] → model={model}  messages={len(hf_messages)}  max_tokens={max_tokens}")
        response = self._hf.chat.completions.create(
            model=model,
            messages=hf_messages,
            max_tokens=max_tokens or 4096,
            temperature=0.1,
        )
        text = response.choices[0].message.content or ""
        usage = getattr(response, "usage", None)
        if usage:
            log.debug(
                f"[HF] ← tokens: prompt={getattr(usage,'prompt_tokens','?')}  "
                f"completion={getattr(usage,'completion_tokens','?')}  "
                f"total={getattr(usage,'total_tokens','?')}"
            )
        log.debug(f"[HF] ← {len(text)} chars: {text[:120]}{'…' if len(text)>120 else ''}")
        return {"stop_reason": "end_turn", "tool_uses": [], "text": text, "raw": response}

    # ── Ollama — OpenAI-compatible /api/chat ─────────────────────────────
    def _call_ollama(self, messages, tools, system, model, max_tokens) -> dict:
        """
        Appel Ollama local via /api/chat (format OpenAI-compatible).
        OLLAMA_URL par défaut : http://localhost:11434
        Modèle par défaut     : llama3.1
        """
        url = OLLAMA_URL.rstrip("/") + "/api/chat"
        ollama_msgs = [{"role": "system", "content": system}] + [
            {
                "role": m["role"],
                "content": m["content"] if isinstance(m["content"], str)
                           else json.dumps(m["content"], ensure_ascii=False),
            }
            for m in messages
        ]
        payload = {
            "model":  model,
            "messages": ollama_msgs,
            "stream": False,
            "options": {"num_predict": max_tokens or 4096, "temperature": 0.1},
        }
        log.debug(f"[OLLAMA] → model={model}  url={url}")
        try:
            resp = _req.post(url, json=payload, timeout=120)
            resp.raise_for_status()
            data = resp.json()
            text = data.get("message", {}).get("content", "")
            log.debug(f"[OLLAMA] ← {len(text)} chars")
            return {"stop_reason": "end_turn", "tool_uses": [], "text": text, "raw": data}
        except Exception as exc:
            raise RuntimeError(f"Ollama inaccessible ({OLLAMA_URL}) : {exc}") from exc

    # ── Auto-détection provider ───────────────────────────────────────────
    def auto_detect_provider(self) -> str:
        """
        Détecte le premier provider disponible dans l'ordre de priorité :
        anthropic → huggingface → mistral → ollama → none
        """
        if os.getenv("ANTHROPIC_API_KEY", "").strip():
            log.info("[AUTO] Provider : anthropic")
            return "anthropic"
        if os.getenv("HUGGINGFACE_API_KEY", "").strip():
            log.info("[AUTO] Provider : huggingface (Codestral-22B)")
            return "huggingface"
        if os.getenv("MISTRAL_API_KEY", "").strip():
            log.info("[AUTO] Provider : mistral (Codestral)")
            return "mistral"
        # Sonder Ollama — vérifie qu'il est up ET qu'au moins un modèle est chargé
        try:
            r = _req.get(f"{OLLAMA_URL}/api/tags", timeout=3)
            models = r.json().get("models", [])
            if models:
                log.info(f"[AUTO] Provider : ollama ({len(models)} modèle(s))")
                return "ollama"
            log.warning("[AUTO] Ollama accessible mais aucun modèle chargé")
        except Exception:
            log.warning("[AUTO] Ollama inaccessible")
        return "none"


# Singleton global — réutilise la connexion HTTP Anthropic entre les requêtes
llm_manager = LLMManager()


# ---------------------------------------------------------------------------
# Safe-SQL — Validation Codestral avant exécution SQL
# ---------------------------------------------------------------------------

def safe_sql_check(sql: str, provider: str = "") -> dict:
    """
    Valide une requête SQL via Codestral (HuggingFace ou Mistral) avant exécution.
    Retourne : {"safe": bool, "reason": str, "fixed_sql": str|None}
    """
    if not sql or not sql.strip():
        return {"safe": False, "reason": "SQL vide", "fixed_sql": None}

    # Préférer Codestral pour la validation SQL
    if not provider:
        if os.getenv("HUGGINGFACE_API_KEY", "").strip():
            provider = "huggingface"
        elif os.getenv("MISTRAL_API_KEY", "").strip():
            provider = "mistral"
        else:
            provider = llm_manager.auto_detect_provider()

    if provider == "none":
        log.warning("[SAFE-SQL] Aucun provider — validation ignorée, exécution permise")
        return {"safe": True, "reason": "Aucun LLM disponible pour validation", "fixed_sql": sql}

    _system = (
        "Tu es un expert SQL PostgreSQL et sécurité. "
        "Analyse la requête SQL fournie et réponds UNIQUEMENT en JSON valide (sans markdown) : "
        '{"safe": true|false, "reason": "...", "fixed_sql": "..." ou null}\n\n'
        "Règles :\n"
        "- DROP TABLE, TRUNCATE, DELETE sans WHERE → unsafe\n"
        "- UPDATE sans WHERE sur tables critiques → unsafe\n"
        "- Injection SQL potentielle → unsafe\n"
        "- Propose une version corrigée dans fixed_sql si possible, sinon null"
    )
    try:
        result = llm_manager.get_llm_response(
            messages=[{"role": "user", "content": f"Valide ce SQL :\n```sql\n{sql}\n```"}],
            tools=[], system=_system, provider=provider,
        )
        text = result["text"].strip()
        # Extraire le JSON même s'il y a du texte autour
        m = re.search(r'\{.*\}', text, re.DOTALL)
        return json.loads(m.group(0)) if m else {"safe": True, "reason": text[:200], "fixed_sql": None}
    except json.JSONDecodeError as exc:
        return {"safe": True, "reason": f"Réponse non parseable : {exc}", "fixed_sql": None}
    except Exception as exc:
        log.warning(f"[SAFE-SQL] Erreur : {exc}")
        return {"safe": True, "reason": f"Erreur validation : {exc}", "fixed_sql": None}


# ---------------------------------------------------------------------------
# Token Refresh — Récupère le token Penpot depuis PostgreSQL + patch secret K8s
# ---------------------------------------------------------------------------

def refresh_penpot_token() -> dict:
    """
    1. Connexion directe à penpot-postgres via psycopg2.
    2. Récupère le token d'authentification le plus récent.
    3. Patch le secret K8s penpot-secrets dans open-webui.
    Nécessite : psycopg2-binary + RBAC secrets/patch dans open-webui.
    """
    try:
        import psycopg2
    except ImportError:
        return {"error": "psycopg2-binary non installé. Ajoutez-le aux requirements."}

    try:
        conn = psycopg2.connect(
            host=PENPOT_DB_HOST, port=PENPOT_DB_PORT,
            dbname=PENPOT_DB_NAME, user=PENPOT_DB_USER, password=PENPOT_DB_PASS,
            connect_timeout=5,
        )
    except Exception as exc:
        return {"error": f"Connexion PostgreSQL échouée : {exc}"}

    token = None
    try:
        with conn.cursor() as cur:
            # Penpot 2.x — tokens dans la table token avec propósito 'auth'
            for query in [
                "SELECT content FROM token WHERE purpose='auth' ORDER BY created_at DESC LIMIT 1",
                "SELECT token FROM profile_token ORDER BY created_at DESC LIMIT 1",
                "SELECT token FROM auth_token ORDER BY created_at DESC LIMIT 1",
            ]:
                try:
                    cur.execute(query)
                    row = cur.fetchone()
                    if row:
                        token = row[0]
                        log.info(f"[TOKEN-REFRESH] Token récupéré via : {query[:50]}")
                        break
                except Exception:
                    conn.rollback()
                    continue
    except Exception as exc:
        conn.close()
        return {"error": f"Requête SQL échouée : {exc}"}
    finally:
        conn.close()

    if not token:
        return {"error": "Aucun token trouvé dans PostgreSQL Penpot"}

    # Patch le secret K8s
    try:
        from kubernetes import client as _k8s_client, config as _k8s_config
        import base64
        try:
            _k8s_config.load_incluster_config()
        except Exception:
            _k8s_config.load_kube_config()
        v1 = _k8s_client.CoreV1Api()
        v1.patch_namespaced_secret(
            "penpot-secrets", "open-webui",
            {"data": {"PENPOT_TOKEN": base64.b64encode(token.encode()).decode()}}
        )
        log.info("[TOKEN-REFRESH] ✓ Secret penpot-secrets mis à jour")
        return {"status": "ok", "preview": str(token)[:20] + "..."}
    except Exception as exc:
        log.error(f"[TOKEN-REFRESH] Patch K8s échoué : {exc}")
        return {"status": "token_retrieved_patch_failed", "error": str(exc),
                "preview": str(token)[:20] + "..."}


# ---------------------------------------------------------------------------
# Knowledge ConfigMap — chargée au démarrage, enrichit le contexte agent
# ---------------------------------------------------------------------------

_agent_knowledge: dict = {}

def _load_knowledge_configmap() -> dict:
    """Charge admin-sys-knowledge depuis K8s, ou retourne les fixes intégrés."""
    builtin = {
        "penpot_probe": "penpot-backend health: /api/health → 404. Correct: /api/rpc/command/get-profile (Penpot ≥2.0). initialDelaySeconds=60, failureThreshold=12.",
        "penpot_port":  "penpot-frontend nginx écoute sur 8080, PAS 80. containerPort=8080, service targetPort=8080.",
        "traefik_wl":   "Whitelist Traefik: ajouter 127.0.0.0/8 + 10.42.0.0/16 (Flannel) sinon 403 depuis pods/localhost.",
        "zombie_pods":  "Pods stuck Terminating: kubectl delete pod --force --grace-period=0 (bug K3s runc log.json).",
    }
    try:
        from kubernetes import client as _k8s_client, config as _k8s_config
        try:
            _k8s_config.load_incluster_config()
        except Exception:
            _k8s_config.load_kube_config()
        v1 = _k8s_client.CoreV1Api()
        cm = v1.read_namespaced_config_map("admin-sys-knowledge", "open-webui", _request_timeout=3)
        merged = {**builtin, **(cm.data or {})}
        log.info(f"[KNOWLEDGE] ConfigMap chargée : {list(merged.keys())}")
        return merged
    except Exception as exc:
        log.info(f"[KNOWLEDGE] ConfigMap indisponible ({exc}) — utilisation des fixes intégrés")
        return builtin

_agent_knowledge = _load_knowledge_configmap()
log.info(f"[KNOWLEDGE] {len(_agent_knowledge)} entrées disponibles")


# ---------------------------------------------------------------------------
# LangGraph — Nœud 1 : designer
# Reprend la boucle LLM + Tool Use existante (max 10 itérations).
# Entrée  : state["prompt"], state["provider"], state["model"]
# Sortie  : state["design_result"], state["iterations"]
# ---------------------------------------------------------------------------

def node_designer(state: GraphState) -> dict:
    provider    = state.get("provider", "anthropic")
    model_name  = state.get("model", "")
    user_prompt = state["prompt"]

    # ── Résolution sticky du fichier courant ──────────────────────────────────
    # Priorité 1 : current_file_id déjà dans le checkpoint LangGraph (thread continu)
    current_file_id = state.get("current_file_id", "")

    # Priorité 2 : recherche par nom canonique dans state_store (nouveau thread)
    if not current_file_id and state_store:
        for f in state_store.list_files():
            if f.get("file_name") == DRAFT_FILE_NAME and f.get("file_id"):
                current_file_id = f["file_id"]
                log.info(f"[DESIGNER] Sticky (state_store) → file_id={current_file_id}")
                break

    # ── Construction du prompt enrichi avec contexte fichier ──────────────────
    if current_file_id:
        file_context = (
            f"\n\n[CONTEXTE STICKY] Fichier brouillon existant détecté. "
            f"Travaille DANS ce fichier (file_id='{current_file_id}'). "
            f"Ne crée PAS de nouveau fichier."
        )
    else:
        file_context = (
            f"\n\n[CONTEXTE STICKY] Aucun brouillon existant. "
            f"Commence par créer un fichier nommé exactement '{DRAFT_FILE_NAME}', "
            f"puis effectue la demande dans ce fichier."
        )

    enriched_prompt = user_prompt + file_context
    log.info(f"[DESIGNER] ▶ provider={provider}  file_id={current_file_id or 'à créer'}")
    conv = [{"role": "user", "content": enriched_prompt}]

    def _resolve_file_url(fid: str) -> str:
        return f"{PENPOT_BASE_URL}/view/file/{fid}" if fid else ""

    def _snapshot_state(fid: str, iters: int, text: str, err: str = "") -> dict:
        """Construit le dict de retour du nœud avec les champs sticky."""
        url = _resolve_file_url(fid)
        return {
            "design_result":   {"response": text, "error": err} if err else {"response": text or "Action effectuée."},
            "iterations":      iters,
            "current_file_id": fid,
            "file_url":        url,
        }

    for iteration in range(10):
        log.info(f"[DESIGNER] ── Itération {iteration + 1}/10 ──")
        try:
            result = llm_manager.get_llm_response(
                messages=conv,
                tools=PENPOT_TOOLS,
                system=SYSTEM_PROMPT,
                model_name=model_name,
                provider=provider,
            )
        except Exception as exc:
            log.error(f"[DESIGNER] Erreur LLM : {exc}")
            return _snapshot_state(current_file_id, iteration + 1, "", err=str(exc))

        stop_reason = result["stop_reason"]
        tool_uses   = result["tool_uses"]
        text        = result["text"]
        log.info(f"[DESIGNER] stop={stop_reason}  tools={len(tool_uses)}")

        if stop_reason == "end_turn" or not tool_uses:
            # Capturer le file_id si un fichier a été créé pendant cette session
            if not current_file_id and state_store:
                last = state_store.get_last()
                if last and last.get("file_id"):
                    current_file_id = last["file_id"]
                    log.info(f"[DESIGNER] ✓ Nouveau fichier capturé → {current_file_id}")
            log.info(f"[DESIGNER] ✓ Terminé en {iteration + 1} itération(s).")
            return _snapshot_state(current_file_id, iteration + 1, text)

        conv.append({"role": "assistant", "content": result["raw"].content})

        tool_results = []
        for tu in tool_uses:
            log.info(f"[TOOL] → {tu['name']}  {json.dumps(tu['input'], ensure_ascii=False)[:180]}")
            handler = PENPOT_TOOL_ACTIONS.get(tu["name"])
            try:
                out = handler(tu["input"]) if handler else {"error": f"Outil inconnu : {tu['name']}"}
            except Exception as exc:
                out = {"error": str(exc)}
            log.info(f"[TOOL] ← {tu['name']}  {json.dumps(out, ensure_ascii=False)[:250]}")
            tool_results.append({
                "type":        "tool_result",
                "tool_use_id": tu["id"],
                "content":     json.dumps(out, ensure_ascii=False),
            })
        conv.append({"role": "user", "content": tool_results})

    log.warning("[DESIGNER] Max itérations (10) atteint.")
    if not current_file_id and state_store:
        last = state_store.get_last()
        if last:
            current_file_id = last.get("file_id", "")
    return _snapshot_state(current_file_id, 10, "", err="Max itérations (10) atteint")


# ---------------------------------------------------------------------------
# LangGraph — Nœud 2 : seo_check
# Valide le résultat du designer via un appel LLM dédié (SEO + UX).
# Entrée  : state["design_result"], state["provider"], state["model"]
# Sortie  : state["seo_report"]  (JSON str : {score, ok, suggestions})
# ---------------------------------------------------------------------------

_SEO_SYSTEM = """\
Tu es un expert SEO et UX copywriter. On te soumet le résultat d'une action de design (Penpot).
Analyse ce résultat et valide si le contenu respecte les critères d'une page web professionnelle :
- Titre principal : clair, accrocheur, < 60 caractères ?
- Corps de texte : informatif, sans jargon excessif ?
- Appel à l'action (CTA) : présent et explicite ?
- Cohérence visuelle NeoKube (dark mode, palette indigo) ?

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"score": <0-10>, "ok": <true|false>, "suggestions": ["...", "..."]}
"""

def node_seo_check(state: GraphState) -> dict:
    provider   = state.get("provider", "anthropic")
    model_name = state.get("model", "")
    design     = state.get("design_result", {})

    summary = json.dumps(design, ensure_ascii=False)[:1000]
    log.info(f"[SEO_CHECK] ▶ analyse du résultat design ({len(summary)} chars)")

    try:
        result = llm_manager.get_llm_response(
            messages=[{"role": "user", "content": f"Résultat du design à analyser :\n{summary}"}],
            tools=[],
            system=_SEO_SYSTEM,
            model_name=model_name,
            provider=provider,
        )
        seo_text = result["text"].strip()
    except Exception as exc:
        log.error(f"[SEO_CHECK] Erreur : {exc}")
        seo_text = json.dumps({"score": 0, "ok": False, "suggestions": [str(exc)]})

    log.info(f"[SEO_CHECK] ✓ {seo_text[:200]}")
    return {"seo_report": seo_text}


# ---------------------------------------------------------------------------
# LangGraph — Construction et compilation du graphe
# Flux : designer → seo_check → END
# Persistance : SqliteSaver (fichier local) ou MemorySaver (fallback)
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    from langgraph.graph import START
    builder = StateGraph(GraphState)
    builder.add_node("designer",  node_designer)
    builder.add_node("seo_check", node_seo_check)
    builder.add_edge(START,       "designer")   # API moderne langgraph>=0.2
    builder.add_edge("designer",  "seo_check")
    builder.add_edge("seo_check", END)
    return builder

if _SQLITE_AVAILABLE:
    _db_conn   = sqlite3.connect(GRAPH_DB_PATH, check_same_thread=False)
    _checkpointer = SqliteSaver(_db_conn)
    log.info(f"[GRAPH] SqliteSaver actif → {GRAPH_DB_PATH}")
else:
    _checkpointer = SqliteSaver()
    log.warning("[GRAPH] langgraph-checkpoint-sqlite absent → MemorySaver (pas de persistance disque)")

penpot_graph = _build_graph().compile(checkpointer=_checkpointer)
log.info("[GRAPH] Graphe compilé : designer → seo_check → END")

# Initialiser le store d'état Penpot (partage la connexion SQLite LangGraph)
if _SQLITE_AVAILABLE:
    state_store = PenpotStateStore(_db_conn)
else:
    log.warning("[STATE] SqliteSaver absent — persistance des IDs Penpot désactivée")

# ---------------------------------------------------------------------------
# Orchestrateur agentique — KB + ModelRouter + SelfHealingAgent + Monitor API
# ---------------------------------------------------------------------------
_knowledge_db = None
_model_router = None
_healer       = None

try:
    from knowledge_db import KnowledgeDB
    from model_router import ModelRouter
    from self_healing import SelfHealingAgent
    import monitor_api

    _knowledge_db = KnowledgeDB(KNOWLEDGE_DB_PATH)
    _model_router = ModelRouter()
    _healer       = SelfHealingAgent(_knowledge_db, _model_router)
    monitor_api.init_monitor(_knowledge_db, _healer)
    app.include_router(monitor_api.router)

    # Ingestion initiale des manifests K8s au démarrage
    _knowledge_db.ingest_manifests()
    log.info("[ORCHESTRATOR] KB + ModelRouter + SelfHealingAgent + Monitor API actifs")
except ImportError as _ie:
    log.warning(f"[ORCHESTRATOR] Module agentique absent (normal hors image) : {_ie}")

NL_PATTERNS = [
    (r"\b(profile|profil|who am i)\b",                                    "get_profile",     {}),
    (r"\b(list|liste|show|voir).{0,20}(project|projet)",                  "list_projects",   {}),
    (r"\b(find|trouve|resolve|cherche).{0,20}(project|projet)\s+(.+)",    "resolve_project", lambda m: {"name": m.group(3).strip()}),
    (r"\bcreate.{0,20}design\b",                                          "create_design",   {}),
    (r"\bcréer?.{0,20}design\b",                                          "create_design",   {}),
    (r"\bcreate.{0,20}file\b",                                            "create_file",     {}),
    (r"\bcréer?.{0,20}fichier\b",                                         "create_file",     {}),
    (r"\bcreate.{0,20}frame\b",                                           "create_frame",    {}),
    (r"\b(insert|add|ajoute).{0,20}text\b",                               "insert_text",     {}),
    (r"\b(ux|context|marketing|seo|acquisition)\b",                       "fetch_ux",        {}),
    (r"\bping\b",                                                          "get_profile",     {}),
]

def parse_prompt(prompt: str) -> tuple[str, dict]:
    """Retourne (action_name, params_dict)."""
    stripped = prompt.strip()

    # 1. JSON pur ?
    if stripped.startswith("{"):
        try:
            data   = json.loads(stripped)
            action = data.pop("action", data.pop("command", ""))
            if action in ACTIONS:
                return action, data
        except json.JSONDecodeError:
            pass

    # 2. Format clé=valeur : action param1=val1 param2=val2
    kv_match = re.match(r"^(\w+)\s+(.+)$", stripped)
    if kv_match:
        candidate = kv_match.group(1).lower()
        if candidate in ACTIONS:
            rest   = kv_match.group(2)
            params = {}
            # Chercher key=value ou key="value"
            for m in re.finditer(r'(\w+)=["\']?([^"\'=\s]+)["\']?', rest):
                params[m.group(1)] = m.group(2)
            if not params:
                # Un seul mot sans clé → argument positionnel selon l'action
                params = _positional(candidate, rest.strip())
            return candidate, params

    # 3. Action seule
    if stripped.lower() in ACTIONS:
        return stripped.lower(), {}

    # 4. Langage naturel (regex)
    low = stripped.lower()
    for pattern, action, extractor in NL_PATTERNS:
        m = re.search(pattern, low)
        if m:
            params = extractor(m) if callable(extractor) else {}
            # Extraire file_name / project_name par heuristique
            _extract_nl_params(stripped, action, params)
            return action, params

    return "unknown", {}

def _positional(action: str, value: str) -> dict:
    mapping = {
        "resolve_project": {"name": value},
        "find_project":    {"name": value},
        "create_file":     {"name": value},
        "create_design":   {"file_name": value},
        "fetch_ux":        {"query": value},
        "context":         {"query": value},
    }
    return mapping.get(action, {"value": value})

def _extract_nl_params(prompt: str, action: str, params: dict):
    """Heuristiques pour extraire des paramètres depuis le langage naturel."""
    # file_name / design name — entre guillemets ou après "called/named/nommé"
    m = re.search(r'(?:called|named|nommé[e]?|intitulé[e]?)\s+["\']?([A-Za-z0-9 _-]+)["\']?', prompt, re.I)
    if m and action in ("create_file", "create_design"):
        params.setdefault("file_name", m.group(1).strip())

    # headline — après "with title/headline/avec le titre"
    m = re.search(r'(?:headline|title|titre)[:\s]+["\']?([^"\']+)["\']?', prompt, re.I)
    if m and action == "create_design":
        params.setdefault("headline", m.group(1).strip())

    # project — après "in project / dans le projet / dans"
    m = re.search(r'(?:in project|dans le projet|dans|project)\s+["\']?([A-Za-z0-9 _-]+)["\']?', prompt, re.I)
    if m and action in ("create_file", "create_design"):
        params.setdefault("project_name", m.group(1).strip())

    # query pour fetch_ux
    m = re.search(r'(?:about|sur|query|recherche)\s+["\']?([A-Za-z0-9 _-]+)["\']?', prompt, re.I)
    if m and action in ("fetch_ux", "fetch_ux_experience", "context"):
        params.setdefault("query", m.group(1).strip())


# ---------------------------------------------------------------------------
# Endpoint FastAPI
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Modèles Pydantic
# ---------------------------------------------------------------------------

class ActionRequest(BaseModel):
    prompt: str


class OrchestrateRequest(BaseModel):
    prompt:    str  = ""
    messages:  list = []           # Open WebUI / Pipe format: [{role, content}, ...]
    provider:  str  = "auto"       # auto | anthropic | huggingface | mistral | ollama
    model:     str  = ""           # vide = défaut du provider
    thread_id: str  = ""           # reprise de conversation (persistance SqliteSaver)


class SafeSQLRequest(BaseModel):
    sql:      str = ""
    provider: str = ""  # vide = auto-détection


# ---------------------------------------------------------------------------
# Endpoints FastAPI
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    auto_provider = llm_manager.auto_detect_provider()
    return {
        "status":           "ok",
        "service":          "admin-sys-agent",
        "version":          "3.2",
        "providers":        LLMManager.SUPPORTED,
        "active_provider":  auto_provider,
        "keys_configured":  {
            "anthropic":    bool(ANTHROPIC_API_KEY),
            "huggingface":  bool(HUGGINGFACE_API_KEY),
            "mistral":      bool(MISTRAL_API_KEY),
        },
        "ollama_url":       OLLAMA_URL,
        "state_db":         GRAPH_DB_PATH,
        "state_store":      "sqlite" if state_store else "disabled",
        "knowledge_db":     KNOWLEDGE_DB_PATH if _knowledge_db else "disabled",
        "kb_incidents":     _knowledge_db.incident_count() if _knowledge_db else 0,
        "kb_manifests":     _knowledge_db.manifest_count() if _knowledge_db else 0,
        "agent_knowledge":  len(_agent_knowledge),
        "self_healing":     "active" if _healer else "disabled",
    }


@app.get("/state/files")
def state_files():
    """
    Liste tous les fichiers Penpot créés et persistés dans neokube_state.db.
    Retourne : [{file_id, file_name, page_id, frame_id, project_id, source, created_at}]
    """
    if not state_store:
        return {"error": "Persistance désactivée (langgraph-checkpoint-sqlite manquant)"}
    files = state_store.list_files()
    return {"files": files, "count": len(files)}


@app.get("/state/files/last")
def state_files_last():
    """
    Retourne le dernier fichier Penpot créé (le plus récent dans neokube_state.db).
    Utile pour enchaîner des actions sur le fichier courant sans passer file_id manuellement.
    """
    if not state_store:
        return {"error": "Persistance désactivée"}
    last = state_store.get_last()
    return last if last else {"error": "Aucun fichier enregistré"}


@app.post("/action")
def action(req: ActionRequest):
    """Intent parser direct — pas de LLM, mapping regex → Penpot."""
    action_name, params = parse_prompt(req.prompt)
    handler = ACTIONS.get(action_name)
    if not handler:
        return {
            "error": "Commande non reconnue",
            "received": req.prompt,
            "tip": "Essayez : get_profile | list_projects | create_design file_name=X | fetch_ux query=Z",
        }
    return handler(params)


@app.post("/v1/orchestrate")
def orchestrate(req: OrchestrateRequest):
    """
    Exécute le graphe LangGraph : designer → seo_check → END.

    Accepte :
      { "prompt": "...", "provider": "auto", "model": "", "thread_id": "" }
    ou format Open WebUI Pipe :
      { "messages": [{role, content}, ...], "provider": "auto" }

    provider="auto" (défaut) → détection automatique du premier provider disponible.

    Retourne :
      { "response": "...", "design_result": {...}, "seo_report": {...},
        "thread_id": "...", "iterations": N, "provider": "..." }
    """
    provider   = (req.provider or "auto").lower()
    model_name = req.model or ""

    # ── Auto-détection provider ───────────────────────────────────────────
    if provider == "auto":
        provider = llm_manager.auto_detect_provider()
        if provider == "none":
            return {
                "error": (
                    "Aucun provider LLM disponible. "
                    "Configurez l'un des secrets : ANTHROPIC_API_KEY, HUGGINGFACE_API_KEY, "
                    "MISTRAL_API_KEY, ou lancez Ollama avec un modèle chargé."
                ),
                "providers_checked": list(LLMManager.SUPPORTED),
            }
        log.info(f"[ORCHESTRATE] Auto-détection → {provider}")
    # ── Fallback si clé manquante pour le provider explicite ─────────────
    elif provider == "anthropic" and not ANTHROPIC_API_KEY:
        fallback = llm_manager.auto_detect_provider()
        if fallback == "none":
            return {"error": "ANTHROPIC_API_KEY manquante et aucun provider de repli disponible."}
        log.warning(f"[ORCHESTRATE] anthropic sans clé → repli sur {fallback}")
        provider = fallback

    # Résoudre le prompt depuis messages (Pipe) ou champ direct
    if req.messages:
        user_msgs   = [m for m in req.messages if m.get("role") == "user"]
        user_prompt = user_msgs[-1].get("content", "") if user_msgs else req.prompt
    else:
        user_prompt = req.prompt

    if not user_prompt:
        return {"error": "Prompt vide"}

    # thread_id : reprise ou nouvelle conversation
    thread_id = req.thread_id or str(uuid.uuid4())
    config    = {"configurable": {"thread_id": thread_id}}

    log.info(f"[ORCHESTRATE] ▶ provider={provider}  thread={thread_id}")
    log.info(f"[ORCHESTRATE] prompt={user_prompt[:120]}")

    initial_state: GraphState = {
        "prompt":          user_prompt,
        "provider":        provider,
        "model":           model_name,
        "thread_id":       thread_id,
        "design_result":   {},
        "seo_report":      "",
        "iterations":      0,
        "current_file_id": "",
        "file_url":        "",
    }

    try:
        final_state = penpot_graph.invoke(initial_state, config=config)
    except Exception as exc:
        log.error(f"[ORCHESTRATE] Erreur graphe : {exc}")
        return {"error": str(exc), "thread_id": thread_id}

    design = final_state.get("design_result", {})
    seo    = final_state.get("seo_report", "")

    # Tenter de parser le rapport SEO pour l'exposer en dict
    try:
        seo_parsed = json.loads(seo) if seo else {}
    except json.JSONDecodeError:
        seo_parsed = {"raw": seo}

    response_text = design.get("response") or design.get("error") or "Action effectuée."
    log.info(f"[ORCHESTRATE] ✓ thread={thread_id}  iterations={final_state.get('iterations', 0)}")

    return {
        "response":      response_text,
        "design_result": design,
        "seo_report":    seo_parsed,
        "thread_id":     thread_id,
        "iterations":    final_state.get("iterations", 0),
        "provider":      provider,
    }


@app.post("/v1/safe-sql")
def check_sql(req: SafeSQLRequest):
    """
    Valide une requête SQL via Codestral avant exécution.
    Retourne : {"safe": bool, "reason": str, "fixed_sql": str|None}
    """
    return safe_sql_check(req.sql, req.provider)


@app.post("/v1/token/refresh")
def token_refresh():
    """
    Auto-provisioning : récupère le token Penpot depuis PostgreSQL
    et met à jour le secret K8s penpot-secrets.
    Nécessite : RBAC secrets/patch dans open-webui + accès penpot-postgres.
    """
    log.info("[TOKEN-REFRESH] Déclenchement manuel via /v1/token/refresh")
    return refresh_penpot_token()


@app.get("/v1/knowledge")
def knowledge():
    """Retourne la base de connaissance agent chargée au démarrage."""
    return {"entries": _agent_knowledge, "count": len(_agent_knowledge)}


@app.post("/v1/knowledge")
def knowledge_write(body: dict):
    """
    Ajoute ou met à jour une entrée dans la base de connaissance en mémoire.
    Body : {"key": "...", "value": "..."}
    """
    key   = body.get("key", "").strip()
    value = body.get("value", "").strip()
    if not key or not value:
        return {"error": "Champs 'key' et 'value' requis"}
    _agent_knowledge[key] = value
    log.info(f"[KNOWLEDGE] Entrée mise à jour : {key!r}")
    return {"status": "ok", "key": key, "total": len(_agent_knowledge)}


# ---------------------------------------------------------------------------
# OpenAI-compat API — pour intégration Open WebUI comme "OpenAI API" externe
# ---------------------------------------------------------------------------

@app.get("/v1/models")
def list_models():
    """OpenAI-compat : liste les modèles disponibles."""
    provider = llm_manager.auto_detect_provider()
    return {
        "object": "list",
        "data": [
            {
                "id": "admin-sys-agent",
                "object": "model",
                "created": 1700000000,
                "owned_by": "neokube",
                "provider": provider,
            }
        ],
    }


@app.post("/v1/chat/completions")
def chat_completions(body: dict):
    """
    OpenAI-compat : POST /v1/chat/completions
    Adapte le format OpenAI → /v1/orchestrate → réponse OpenAI.
    """
    messages   = body.get("messages", [])
    stream     = body.get("stream", False)

    if stream:
        from fastapi.responses import StreamingResponse
        import time as _time

        user_msgs   = [m for m in messages if m.get("role") == "user"]
        user_prompt = user_msgs[-1].get("content", "") if user_msgs else ""

        provider = llm_manager.auto_detect_provider()
        if provider == "none":
            text = "Aucun provider LLM disponible. Configurez MISTRAL_API_KEY ou ANTHROPIC_API_KEY."
        else:
            req = OrchestrateRequest(messages=messages, provider=provider)
            result = orchestrate(req)
            text = result.get("response") or result.get("error") or ""

        cid = f"chatcmpl-{uuid.uuid4().hex[:12]}"

        def _stream():
            chunk = {
                "id": cid, "object": "chat.completion.chunk",
                "created": int(_time.time()), "model": "admin-sys-agent",
                "choices": [{"index": 0, "delta": {"role": "assistant", "content": text}, "finish_reason": None}],
            }
            yield f"data: {json.dumps(chunk)}\n\n"
            done = {
                "id": cid, "object": "chat.completion.chunk",
                "created": int(_time.time()), "model": "admin-sys-agent",
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(done)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(_stream(), media_type="text/event-stream")

    # ── Non-streaming ─────────────────────────────────────────────────────
    import time as _time
    provider = llm_manager.auto_detect_provider()
    if provider == "none":
        text = "Aucun provider LLM disponible. Configurez MISTRAL_API_KEY ou ANTHROPIC_API_KEY."
    else:
        req    = OrchestrateRequest(messages=messages, provider=provider)
        result = orchestrate(req)
        text   = result.get("response") or result.get("error") or ""

    return {
        "id":      f"chatcmpl-{uuid.uuid4().hex[:12]}",
        "object":  "chat.completion",
        "created": int(_time.time()),
        "model":   "admin-sys-agent",
        "choices": [
            {
                "index":         0,
                "message":       {"role": "assistant", "content": text},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
