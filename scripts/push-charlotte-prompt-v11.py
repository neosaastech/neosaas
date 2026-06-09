#!/usr/bin/env python3
"""push-charlotte-prompt-v11.py — v31 Langfuse (2026-06-09)"""
from __future__ import annotations
import base64, json, sys, urllib.request

LF_BASE   = "http://langfuse.neokube.local"
LF_PK     = "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
PROMPT_NAME = "charlotte-sre"
DRY_RUN   = "--dry-run" in sys.argv

with open("/tmp/charlotte_prompt_v31.txt") as f:
    NEW_PROMPT = f.read()

def lf_request(method, path, body=None):
    creds = base64.b64encode(f"{LF_PK}:".encode()).decode()
    data  = json.dumps(body).encode() if body else None
    req   = urllib.request.Request(
        f"{LF_BASE}{path}", data=data,
        headers={"Authorization": f"Basic {creds}", "Content-Type": "application/json"},
        method=method)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

if DRY_RUN:
    print(f"[DRY-RUN] {len(NEW_PROMPT)} chars")
    print("Patch Stalwart direct action:", "stalwart-connector:8007/accounts/create" in NEW_PROMPT)
    print("Patch Mail step 4b:", "4b. MAIL" in NEW_PROMPT)
    sys.exit(0)

result = lf_request("POST", "/api/public/prompts", {
    "name": PROMPT_NAME, "prompt": NEW_PROMPT,
    "type": "text", "labels": ["production"], "config": {}})
print(f"✅ Prompt poussé — version {result.get('version')} — {len(NEW_PROMPT)} chars")
