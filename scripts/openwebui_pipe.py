"""
title: Penpot Master Agent
author: neokube-beta
description: Pipe Open WebUI → Penpot Master Agent (sidecar K8s). Crée et modifie des designs Penpot via LLM + Tool Use.
version: 1.0.0
license: MIT
requirements: requests
"""

import json
import requests
from pydantic import BaseModel, Field


class Pipe:
    """
    Pipe Open WebUI pour le Penpot Master Agent.

    Copier-coller ce fichier dans Open WebUI > Workspace > Functions > New Pipe.
    Configurer ORCHESTRATE_URL dans les Valves si nécessaire.

    Architecture :
      Open WebUI (message user)
        → Pipe.pipe()
          → POST /v1/orchestrate (sidecar K8s port 8000)
            → LLMManager (Claude / GPT-4o / Llama)
              → Tool Use → Penpot API
            ← réponse texte
          ← réponse texte
        ← réponse affichée dans le chat
    """

    class Valves(BaseModel):
        ORCHESTRATE_URL: str = Field(
            default="http://penpot-sidecar:8000/v1/orchestrate",
            description=(
                "URL du Master Agent Penpot. "
                "En K8s : http://penpot-sidecar:8000/v1/orchestrate  "
                "En local (port-forward) : http://localhost:8000/v1/orchestrate"
            ),
        )
        LLM_PROVIDER: str = Field(
            default="anthropic",
            description="Provider LLM actif : anthropic | openai | ollama",
        )
        LLM_MODEL: str = Field(
            default="",
            description=(
                "Modèle à utiliser (vide = défaut du provider). "
                "Exemples : claude-sonnet-4-5, gpt-4o, llama3.1"
            ),
        )
        TIMEOUT: int = Field(
            default=120,
            description="Timeout HTTP en secondes (le Master Agent peut prendre ~30s pour des actions complexes).",
        )

    def __init__(self):
        self.valves = self.Valves()
        self.name   = "Penpot Master Agent"

    def pipe(self, body: dict) -> str:
        """
        Point d'entrée Open WebUI.

        Extrait le dernier message utilisateur du body, transmet l'historique
        complet de conversation au Master Agent, retourne la réponse texte.

        Args:
            body: Corps de la requête Open WebUI (messages, model, stream, etc.)

        Returns:
            Réponse textuelle du Master Agent Penpot.
        """
        messages    = body.get("messages", [])
        user_msgs   = [m for m in messages if m.get("role") == "user"]
        user_prompt = user_msgs[-1].get("content", "") if user_msgs else ""

        if not user_prompt:
            return "Erreur : aucun message utilisateur trouvé dans le body."

        payload = {
            "prompt":   user_prompt,
            "messages": messages,          # historique complet pour contexte
            "provider": self.valves.LLM_PROVIDER,
            "model":    self.valves.LLM_MODEL,
        }

        try:
            r = requests.post(
                self.valves.ORCHESTRATE_URL,
                json=payload,
                timeout=self.valves.TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()

            if "response" in data:
                iterations = data.get("iterations", "?")
                provider   = data.get("provider", self.valves.LLM_PROVIDER)
                # Ajouter une note discrète sur le nombre de tours LLM
                return f"{data['response']}\n\n*({provider} · {iterations} itération(s))*"

            if "error" in data:
                return f"❌ Erreur Master Agent : {data['error']}"

            # Réponse inattendue — la retourner brute
            return json.dumps(data, ensure_ascii=False, indent=2)

        except requests.exceptions.ConnectionError:
            return (
                f"❌ Service indisponible : `{self.valves.ORCHESTRATE_URL}`\n"
                "→ Vérifiez que le sidecar penpot-agent tourne dans le pod open-webui."
            )
        except requests.exceptions.Timeout:
            return (
                f"❌ Timeout ({self.valves.TIMEOUT}s) — le Master Agent n'a pas répondu à temps.\n"
                "→ Augmentez TIMEOUT dans les Valves ou vérifiez les logs du sidecar."
            )
        except requests.exceptions.HTTPError as exc:
            return f"❌ Erreur HTTP {exc.response.status_code} : {exc.response.text[:300]}"
        except Exception as exc:
            return f"❌ Erreur inattendue : {exc}"
