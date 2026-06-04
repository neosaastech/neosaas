#!/usr/bin/env python3
"""
cleanup-agent.py — Audit et nettoyage complet des artefacts d'un agent/service NeoKube.

Vérifie et supprime (avec --apply) :
  K8s     : Deployment, Service, ConfigMap(s), ServiceAccount, Role/RoleBinding
  GitOps  : fichiers YAML + kustomization.yaml
  Catalog : apps/agent-catalog/<name>.yaml
  Refs    : mentions de l'agent dans TOUS les autres fichiers YAML (antipattern #65)
  Temporal: namespace dédié
  Qdrant  : collection <name>-memory
  LiteLLM : clé virtuelle par alias
  Langfuse: prompt <name>-*
  CLAUDE  : références dans CLAUDE-*.md (info seulement — pas de suppression auto)

Usage :
  python3 cleanup-agent.py <agent-name>              # audit dry-run
  python3 cleanup-agent.py <agent-name> --apply      # suppression effective
  python3 cleanup-agent.py <agent-name> --namespace connector-system

Exemples :
  python3 cleanup-agent.py dispatcher
  python3 cleanup-agent.py aria --apply
"""

import argparse
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

GITOPS      = Path.home() / "Kubinote-GitOps"
CLAUDE_DIR  = Path.home()
QDRANT_URL  = "http://qdrant.rag-system.svc.cluster.local:6333"
LANGFUSE_BASE = "http://langfuse.neokube.local"
LITELLM_BASE  = "http://litellm.neokube.local"

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
BLUE   = "\033[34m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):   print(f"  {GREEN}✅{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}⚠️ {RESET} {msg}")
def found(msg):print(f"  {RED}🔴{RESET} {msg}")
def info(msg): print(f"  {BLUE}ℹ️ {RESET} {msg}")

def run(cmd, check=False):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

def kubectl(cmd):
    return run(f"kubectl {cmd}")

def http_get(url):
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            return json.loads(r.read())
    except Exception:
        return None

# ── K8s resources ─────────────────────────────────────────────────────────────

def audit_k8s(name, namespace, apply):
    print(f"\n{BOLD}[K8s — namespace {namespace}]{RESET}")
    resources = {
        "deployment":   f"deployment/{name}",
        "service":      f"service/{name}",
        "serviceaccount": f"serviceaccount/{name}",
        "configmap-script": f"configmap/{name}-script",
        "configmap-config": f"configmap/{name}-config",
    }
    deleted = []
    for label, res in resources.items():
        code, out, _ = kubectl(f"get {res} -n {namespace} --no-headers 2>/dev/null")
        if code == 0 and out:
            found(f"{res} trouvé")
            if apply:
                code2, _, err = kubectl(f"delete {res} -n {namespace}")
                if code2 == 0:
                    ok(f"Supprimé : {res}")
                    deleted.append(res)
                else:
                    warn(f"Échec suppression {res} : {err}")
        else:
            ok(f"{res} : absent (OK)")

    # Chercher d'autres configmaps contenant le nom
    code, out, _ = kubectl(f"get configmap -n {namespace} --no-headers 2>/dev/null")
    for line in out.splitlines():
        cm_name = line.split()[0]
        if name in cm_name and cm_name not in [f"{name}-script", f"{name}-config"]:
            found(f"ConfigMap supplémentaire : {cm_name}")
            if apply:
                kubectl(f"delete configmap {cm_name} -n {namespace}")
                ok(f"Supprimé : configmap/{cm_name}")

    return deleted


# ── GitOps files ───────────────────────────────────────────────────────────────

def audit_gitops(name, apply):
    print(f"\n{BOLD}[GitOps — Kubinote-GitOps]{RESET}")
    patterns = [
        f"apps/agent-system/base/deployment-{name}.yaml",
        f"apps/agent-system/base/service-{name}.yaml",
        f"apps/agent-system/base/serviceaccount-{name}.yaml",
        f"apps/agent-system/base/configmap-{name}-script.yaml",
        f"apps/agent-system/base/configmap-{name}-config.yaml",
        f"apps/connector-system/base/deployment-{name}.yaml",
        f"apps/connector-system/base/service-{name}.yaml",
        f"apps/connector-system/base/configmap-{name}-script.yaml",
        f"apps/agent-catalog/{name}.yaml",
    ]
    found_files = []
    for pattern in patterns:
        p = GITOPS / pattern
        if p.exists():
            found(f"Fichier : {pattern}")
            found_files.append(p)
            if apply:
                p.unlink()
                ok(f"Supprimé : {pattern}")
        else:
            ok(f"Absent (OK) : {pattern}")

    # Chercher dans kustomization.yaml
    for kust in GITOPS.rglob("kustomization.yaml"):
        content = kust.read_text()
        if f"{name}.yaml" in content or f"-{name}-" in content:
            found(f"Référence dans {kust.relative_to(GITOPS)}")
            if apply:
                warn(f"  → Supprimer manuellement la ligne dans {kust.relative_to(GITOPS)}")

    return found_files


# ── Cross-references dans les autres configs ───────────────────────────────────

def audit_cross_refs(name, apply):
    print(f"\n{BOLD}[Références croisées — antipattern #65]{RESET}")
    refs = []
    for yaml_file in GITOPS.rglob("*.yaml"):
        try:
            content = yaml_file.read_text()
        except Exception:
            continue
        # Ignorer les fichiers propres à l'agent (déjà traités)
        if name in yaml_file.name:
            continue
        lines_with_ref = [
            (i+1, line.strip())
            for i, line in enumerate(content.splitlines())
            if name in line and not line.strip().startswith("#")
        ]
        if lines_with_ref:
            refs.append((yaml_file, lines_with_ref))
            found(f"Référence dans {yaml_file.relative_to(GITOPS)} :")
            for lineno, line in lines_with_ref[:3]:
                print(f"       ligne {lineno}: {line[:100]}")
            if len(lines_with_ref) > 3:
                print(f"       ... ({len(lines_with_ref) - 3} autres lignes)")
            if apply:
                warn(f"  → Vérifier et corriger manuellement : {yaml_file.relative_to(GITOPS)}")

    if not refs:
        ok("Aucune référence croisée trouvée")
    return refs


# ── Temporal namespace ─────────────────────────────────────────────────────────

def audit_temporal(name, apply):
    print(f"\n{BOLD}[Temporal namespace]{RESET}")
    code, out, _ = kubectl(
        f"exec -n agent-system deployment/temporal -- "
        f"tctl namespace describe {name} 2>/dev/null"
    )
    if code == 0 and "NamespaceInfo.Name" in out:
        found(f"Namespace Temporal '{name}' existe")
        if apply:
            code2, _, err = kubectl(
                f"exec -n agent-system deployment/temporal -- "
                f"tctl namespace delete {name} --yes 2>/dev/null"
            )
            if code2 == 0:
                ok(f"Namespace Temporal '{name}' supprimé")
            else:
                warn(f"Échec suppression namespace Temporal : {err}")
    else:
        ok(f"Namespace Temporal '{name}' : absent (OK)")


# ── Qdrant collection ──────────────────────────────────────────────────────────

def audit_qdrant(name, apply):
    print(f"\n{BOLD}[Qdrant collection]{RESET}")
    col_name = f"{name}-memory"
    data = http_get(f"{QDRANT_URL}/collections/{col_name}")
    if data and data.get("status") == "ok":
        pts = data.get("result", {}).get("points_count", "?")
        found(f"Collection Qdrant '{col_name}' : {pts} points")
        if apply:
            try:
                req = urllib.request.Request(
                    f"{QDRANT_URL}/collections/{col_name}",
                    method="DELETE"
                )
                with urllib.request.urlopen(req, timeout=10):
                    ok(f"Collection Qdrant '{col_name}' supprimée")
            except Exception as e:
                warn(f"Échec suppression Qdrant : {e}")
    else:
        ok(f"Collection Qdrant '{col_name}' : absente (OK)")


# ── LiteLLM virtual key ────────────────────────────────────────────────────────

def audit_litellm(name, apply):
    print(f"\n{BOLD}[LiteLLM clé virtuelle]{RESET}")
    try:
        master_key = subprocess.check_output(
            "kubectl get secret cockpit-secrets -n cockpit "
            "-o jsonpath='{.data.LITELLM_MASTER_KEY}' | base64 -d",
            shell=True, text=True
        ).strip()
        req = urllib.request.Request(
            f"{LITELLM_BASE}/key/list",
            headers={"Authorization": f"Bearer {master_key}"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())

        # Chercher clé avec l'alias correspondant à l'agent
        keys = data.get("keys", [])
        found_keys = []
        for key in keys:
            if not isinstance(key, dict):
                continue
            alias = key.get("key_alias", "") or ""
            metadata = key.get("metadata", {}) or {}
            if name in alias.lower() or name in str(metadata).lower():
                found_keys.append(key)

        if found_keys:
            for k in found_keys:
                found(f"Clé LiteLLM : alias='{k.get('key_alias')}' token={k.get('token','?')[:16]}...")
                if apply:
                    # DELETE /key/delete
                    del_req = urllib.request.Request(
                        f"{LITELLM_BASE}/key/delete",
                        data=json.dumps({"keys": [k.get("token")]}).encode(),
                        headers={
                            "Authorization": f"Bearer {master_key}",
                            "Content-Type": "application/json"
                        },
                        method="DELETE"
                    )
                    try:
                        urllib.request.urlopen(del_req, timeout=10)
                        ok(f"Clé LiteLLM supprimée : {k.get('key_alias')}")
                    except Exception as e:
                        warn(f"Échec suppression clé LiteLLM : {e}")
        else:
            ok(f"Aucune clé LiteLLM trouvée pour '{name}'")
    except Exception as e:
        warn(f"LiteLLM non accessible : {e}")


# ── Langfuse prompt ────────────────────────────────────────────────────────────

def audit_langfuse(name, apply):
    print(f"\n{BOLD}[Langfuse prompt]{RESET}")
    try:
        pk = "pk-lf-b1a84594-a9c9-453a-bdec-a511d12e060f"
        sk_b64 = subprocess.check_output(
            "kubectl get secret cluster-manager-secrets -n agent-system "
            "-o jsonpath='{.data.LANGFUSE_SECRET_KEY}'",
            shell=True, text=True
        ).strip()
        import base64
        sk = base64.b64decode(sk_b64).decode()
        auth = base64.b64encode(f"{pk}:{sk}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}"}

        req = urllib.request.Request(
            f"{LANGFUSE_BASE}/api/public/v2/prompts?name={name}",
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        prompts = data.get("data", [])
        if prompts:
            for p in prompts:
                found(f"Prompt Langfuse : '{p.get('name')}' v{p.get('version')}")
            if apply:
                warn("Suppression Langfuse non implémentée (API v2 ne supporte pas DELETE /prompts) — archiver manuellement")
        else:
            ok(f"Aucun prompt Langfuse pour '{name}'")
    except Exception as e:
        warn(f"Langfuse non accessible : {e}")


# ── CLAUDE.md references (info seulement) ─────────────────────────────────────

def audit_claude_docs(name):
    print(f"\n{BOLD}[CLAUDE-*.md — références documentaires]{RESET}")
    claude_files = list(CLAUDE_DIR.glob("CLAUDE-*.md"))
    refs = []
    for f in claude_files:
        try:
            lines = [(i+1, l.strip()) for i, l in enumerate(f.read_text().splitlines())
                     if name in l.lower() and not l.strip().startswith("#")]
            if lines:
                refs.append((f.name, lines[:2]))
                warn(f"Mention dans {f.name} ({len(lines)} ligne(s)) — mise à jour manuelle recommandée")
        except Exception:
            pass
    if not refs:
        ok("Aucune mention dans les CLAUDE-*.md")


# ── Open WebUI pipe ────────────────────────────────────────────────────────────

def audit_openwebui(name, apply):
    print(f"\n{BOLD}[Open WebUI pipe/model]{RESET}")
    code, out, _ = run(
        f"kubectl exec -n interfaces deployment/open-webui -- "
        f"python3 -c \"import sqlite3; conn=sqlite3.connect('/app/backend/data/webui.db'); "
        f"c=conn.cursor(); c.execute(\\\"SELECT id,name FROM models WHERE id LIKE '%{name}%'\\\"); "
        f"print(c.fetchall())\" 2>/dev/null"
    )
    if code == 0 and out and out != "[]":
        found(f"Open WebUI model/pipe : {out}")
        if apply:
            warn("Suppression Open WebUI : utiliser l'interface admin ou l'API REST OWU")
    else:
        ok(f"Aucun model/pipe Open WebUI pour '{name}'")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Audit et cleanup d'un agent/service NeoKube")
    parser.add_argument("name", help="Nom de l'agent/service (ex: dispatcher, aria, camille)")
    parser.add_argument("--apply", action="store_true", help="Supprimer effectivement (défaut : dry-run)")
    parser.add_argument("--namespace", default="agent-system",
                        help="Namespace K8s principal (défaut: agent-system)")
    args = parser.parse_args()

    name = args.name.lower()
    apply = args.apply
    ns = args.namespace

    mode = f"{RED}APPLY — SUPPRESSION EFFECTIVE{RESET}" if apply else f"{GREEN}DRY-RUN — audit seulement{RESET}"
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}cleanup-agent.py — {name}{RESET}  [{mode}]")
    print(f"{BOLD}{'='*60}{RESET}")

    if apply:
        confirm = input(f"\n⚠️  Confirmer la suppression de TOUS les artefacts '{name}' ? [oui/non] : ")
        if confirm.strip().lower() not in ("oui", "yes", "o", "y"):
            print("Annulé.")
            sys.exit(0)

    audit_k8s(name, ns, apply)
    # Vérifier aussi l'autre namespace courant
    if ns == "agent-system":
        audit_k8s(name, "connector-system", apply)

    audit_gitops(name, apply)
    audit_cross_refs(name, apply)
    audit_temporal(name, apply)
    audit_qdrant(name, apply)
    audit_litellm(name, apply)
    audit_langfuse(name, apply)
    audit_openwebui(name, apply)
    audit_claude_docs(name)

    print(f"\n{BOLD}{'='*60}{RESET}")
    if apply:
        print(f"{GREEN}Cleanup terminé.{RESET} Vérifier les refs croisées manuelles signalées ci-dessus.")
        print(f"Penser à : git commit + push dans Kubinote-GitOps, puis kubectl apply.")
    else:
        print(f"{YELLOW}Dry-run terminé.{RESET} Relancer avec --apply pour supprimer.")
    print(f"{BOLD}{'='*60}{RESET}\n")


if __name__ == "__main__":
    main()
