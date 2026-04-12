"""
title: Penpot Agent Tool
author: neokube-beta
description: Délègue toutes les actions Penpot au micro-service local (localhost:8000). Un seul paramètre string — aucune erreur de schéma possible.
version: 1.0.0
license: MIT
requirements: requests
"""

import requests
import json
from pydantic import BaseModel, Field


class Tools:

    class Valves(BaseModel):
        SERVICE_URL: str = Field(
            default="http://localhost:8000",
            description="URL du micro-service Penpot Agent (sidecar dans le pod).",
        )

    def __init__(self):
        self.valves = self.Valves()

    def call_penpot(self, prompt: str) -> str:
        """
        Envoie une commande au micro-service Penpot Agent et retourne le résultat.

        Le paramètre prompt accepte trois formats :
        1. Langage naturel : "Crée un design Landing Page dans le projet Neomnia"
        2. Commande courte : "create_design file_name=Landing project_name=Neomnia"
        3. JSON structuré  : '{"action":"create_design","file_name":"Landing","project_name":"Neomnia"}'

        Commandes disponibles :
        - get_profile          : profil Penpot de l'utilisateur connecté
        - list_projects        : liste tous les projets et teams
        - resolve_project name=X : trouve un projet par nom approximatif
        - create_file file_name=X project_name=Y : crée un nouveau fichier
        - create_frame file_id=X page_id=Y name=Z x=0 y=0 width=800 height=500
        - insert_text file_id=X page_id=Y text="Mon texte" x=80 y=100
        - create_design file_name=X headline=Y project_name=Z [subtext=W bg_color=#F8F9FA]
        - fetch_ux [query=acquisition] : lit les fichiers contexte Marketing/SEO

        Args:
            prompt: Commande en langage naturel, format clé=valeur, ou JSON.

        Returns:
            JSON string avec le résultat de l'action Penpot.
        """
        url = f"{self.valves.SERVICE_URL}/action"
        try:
            r = requests.post(url, json={"prompt": prompt}, timeout=30)
            if r.ok:
                return json.dumps(r.json(), ensure_ascii=False, indent=2)
            return json.dumps({"error": f"Service HTTP {r.status_code}", "detail": r.text[:300]})
        except requests.exceptions.ConnectionError:
            return json.dumps({
                "error": "Micro-service indisponible",
                "tip": "Vérifiez que le sidecar penpot-agent tourne : kubectl logs -n open-webui <pod> -c penpot-agent",
                "service_url": url,
            })
        except requests.exceptions.Timeout:
            return json.dumps({"error": "Timeout (30s) — le micro-service ne répond pas"})
        except Exception as e:
            return json.dumps({"error": str(e)})
