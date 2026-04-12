"""
KnowledgeDB — Base de connaissances RAG SQLite pour NeoKube.

Deux stores :
  - incident_experiences : mémoire structurée des incidents K8s
      [error_context | ai_diagnosis | solution_applied | success_result | tags]
  - manifest_sources     : manifests YAML de ~/.kube/manifests (Source of Truth K8s)

Recherche par mots-clés (LIKE) — zéro dépendance externe, pas de vecteurs.
"""
import os
import re
import glob
import sqlite3
import logging
from typing import Optional

log = logging.getLogger("knowledge-db")

_MANIFESTS_DIR = os.path.expanduser("~/.kube/manifests")


class KnowledgeDB:
    """
    Base de connaissances SQLite avec deux tables :

    incident_experiences :
        Mémoire des incidents passés. Structure :
        - error_context    : log brut ou description de l'erreur
        - ai_diagnosis     : diagnostic produit par l'IA ou un humain
        - solution_applied : commande / action appliquée
        - success_result   : résultat observé (confirme la solution)
        - tags             : labels courts (tls, oom, image, rbac…)

    manifest_sources :
        Manifests YAML ingérés depuis ~/.kube/manifests.
        Utilisés comme Source of Truth pour le diagnostic.
    """

    def __init__(self, db_path: str) -> None:
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._init_schema()
        log.info(f"[KB] KnowledgeDB prête → {db_path}")

    def _init_schema(self) -> None:
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS incident_experiences (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                error_context    TEXT    NOT NULL,
                ai_diagnosis     TEXT    NOT NULL,
                solution_applied TEXT    NOT NULL,
                success_result   TEXT    DEFAULT '',
                tags             TEXT    DEFAULT '',
                created_at       TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );

            CREATE INDEX IF NOT EXISTS idx_incident_tags
                ON incident_experiences(tags);

            CREATE TABLE IF NOT EXISTS manifest_sources (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                manifest_path TEXT    NOT NULL UNIQUE,
                manifest_name TEXT    DEFAULT '',
                kind          TEXT    DEFAULT '',
                namespace     TEXT    DEFAULT '',
                content       TEXT    NOT NULL,
                parsed_at     TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
            );
        """)
        self._conn.commit()

    # ── Incidents ─────────────────────────────────────────────────────────────

    def store_incident(
        self,
        error_context:    str,
        ai_diagnosis:     str,
        solution_applied: str,
        success_result:   str = "",
        tags:             str = "",
    ) -> int:
        """Insère un nouvel incident. Retourne l'id créé."""
        cur = self._conn.execute("""
            INSERT INTO incident_experiences
                (error_context, ai_diagnosis, solution_applied, success_result, tags)
            VALUES (?, ?, ?, ?, ?)
        """, (error_context, ai_diagnosis, solution_applied, success_result, tags))
        self._conn.commit()
        log.info(f"[KB] Incident stocké id={cur.lastrowid} tags={tags!r}")
        return cur.lastrowid

    def search_incidents(self, query: str, top_k: int = 3) -> list[dict]:
        """
        Recherche par mots-clés dans error_context, ai_diagnosis et tags.
        Retourne les top_k résultats les plus récents.
        """
        # Filtrer les mots trop courts (articles, etc.)
        keywords = [w for w in re.split(r"\s+", query.lower().strip()) if len(w) >= 3]
        if not keywords:
            return []

        clauses = " OR ".join(
            "(lower(error_context) LIKE ? OR lower(ai_diagnosis) LIKE ? OR lower(tags) LIKE ?)"
            for _ in keywords
        )
        params: list = []
        for kw in keywords:
            params += [f"%{kw}%", f"%{kw}%", f"%{kw}%"]
        params.append(top_k)

        cur = self._conn.execute(
            f"SELECT * FROM incident_experiences WHERE {clauses} ORDER BY id DESC LIMIT ?",
            params,
        )
        return [dict(row) for row in cur.fetchall()]

    def list_incidents(self, limit: int = 20) -> list[dict]:
        cur = self._conn.execute(
            "SELECT * FROM incident_experiences ORDER BY id DESC LIMIT ?", (limit,)
        )
        return [dict(row) for row in cur.fetchall()]

    # ── Manifests ─────────────────────────────────────────────────────────────

    def ingest_manifests(self, manifests_dir: str = _MANIFESTS_DIR) -> int:
        """
        Parcourt tous les fichiers YAML/YML du répertoire et les stocke en DB.
        Utilise UPSERT sur le chemin fichier → ré-ingestion idempotente.
        Retourne le nombre de fichiers traités.
        """
        patterns = [
            os.path.join(manifests_dir, "*.yaml"),
            os.path.join(manifests_dir, "*.yml"),
        ]
        yaml_files = []
        for p in patterns:
            yaml_files.extend(glob.glob(p))

        ingested = 0
        for fpath in yaml_files:
            try:
                with open(fpath, encoding="utf-8") as f:
                    content = f.read()

                kind = self._yaml_field(content, "kind")
                name = self._yaml_field(content, "name")
                ns   = self._yaml_field(content, "namespace")

                self._conn.execute("""
                    INSERT INTO manifest_sources
                        (manifest_path, manifest_name, kind, namespace, content)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(manifest_path) DO UPDATE SET
                        content   = excluded.content,
                        kind      = excluded.kind,
                        namespace = excluded.namespace,
                        parsed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
                """, (fpath, name, kind, ns, content))
                ingested += 1
            except Exception as exc:
                log.warning(f"[KB] Skipping {fpath}: {exc}")

        self._conn.commit()
        log.info(f"[KB] {ingested}/{len(yaml_files)} manifests ingérés depuis {manifests_dir}")
        return ingested

    def get_manifest(self, kind: str = "", name: str = "") -> list[dict]:
        """Récupère les manifests par kind et/ou name (correspondance partielle)."""
        cur = self._conn.execute("""
            SELECT manifest_name, kind, namespace, content, parsed_at
            FROM manifest_sources
            WHERE lower(kind) LIKE ? AND lower(manifest_name) LIKE ?
            ORDER BY id DESC
        """, (f"%{kind.lower()}%", f"%{name.lower()}%"))
        return [dict(row) for row in cur.fetchall()]

    def search_manifests(self, query: str) -> list[dict]:
        """Recherche plein-texte dans le contenu des manifests."""
        cur = self._conn.execute("""
            SELECT manifest_name, kind, namespace,
                   substr(content, 1, 800) AS content_preview, parsed_at
            FROM manifest_sources
            WHERE lower(content) LIKE ?
            ORDER BY id DESC LIMIT 5
        """, (f"%{query.lower()}%",))
        return [dict(row) for row in cur.fetchall()]

    def manifest_count(self) -> int:
        row = self._conn.execute("SELECT COUNT(*) FROM manifest_sources").fetchone()
        return row[0] if row else 0

    def incident_count(self) -> int:
        row = self._conn.execute("SELECT COUNT(*) FROM incident_experiences").fetchone()
        return row[0] if row else 0

    # ── Utilitaire ────────────────────────────────────────────────────────────

    @staticmethod
    def _yaml_field(content: str, field: str) -> str:
        """Extrait un champ scalaire YAML de premier niveau sans parser YAML."""
        m = re.search(rf"^\s*{field}:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
        return m.group(1).strip().strip("\"'") if m else ""
