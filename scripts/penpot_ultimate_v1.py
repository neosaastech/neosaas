"""
title: Penpot Ultimate
author: neokube-beta
description: Send a text command to the Penpot design agent and get a JSON result.
version: 1.1.0
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
            description="Penpot agent microservice URL.",
        )

    def __init__(self):
        self.valves = self.Valves()

    def action(self, text: str) -> str:
        """
        Send a command to the Penpot design agent and return the result.

        Args:
            text: A JSON string describing the design action to perform.

        Returns:
            JSON string with the result of the Penpot action.
        """
        try:
            r = requests.post(
                f"{self.valves.SERVICE_URL}/action",
                json={"prompt": text},
                timeout=30,
            )
            return json.dumps(r.json(), ensure_ascii=False, indent=2)
        except requests.exceptions.ConnectionError:
            return json.dumps({"error": "Service unavailable at " + self.valves.SERVICE_URL})
        except requests.exceptions.Timeout:
            return json.dumps({"error": "Timeout after 30s"})
        except Exception as e:
            return json.dumps({"error": str(e)})
