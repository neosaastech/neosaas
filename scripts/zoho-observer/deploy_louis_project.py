#!/usr/bin/env python3
"""
deploy_louis_project.py — Déploiement autonome projet Louis Nédellec
=====================================================================
Crée 3 jalons + 3 listes de tâches + 15 tâches dans le projet Zoho Projects.
Analyse des repos GitHub pour extraire les tâches.

Usage : python3 deploy_louis_project.py
"""

import json
import time
import sys
import httpx

# ── Config ────────────────────────────────────────────────────────────────────

CLIENT_ID     = "1000.4V3YUOU900QD48BLZC447SLDK18Z0D"
CLIENT_SECRET = "0f9fa46cc6bedde3e808fbc61db6a8d767d2ab7d24"
REFRESH_TOKEN = "1000.7c73844bbbfb6ab831bd9d22197b1af2.ca96d3c756ca92cd0d7f3d2100e7dee4"
PORTAL_ID     = "809731782"
PROJECT_ID    = "2114101000001511016"
API_VER       = "3"
BASE           = "https://projectsapi.zoho.com/restapi"

# ── Dates (aujourd'hui = 11/04/2026, fin = 02/05/2026) ──────────────���────────
# Format Zoho : MM-DD-YYYY

MILESTONES = [
    {"name": "Discovery",        "end_date": "04-18-2026", "flag": "internal"},
    {"name": "Dev & Integration", "end_date": "04-28-2026", "flag": "internal"},
    {"name": "Final QA",          "end_date": "05-02-2026", "flag": "internal"},
]

# 15 tâches extraites de l'analyse des repos (temp_neosaas, scripts, Kubinote-GitOps)
# Règle : Setup|Tests → non-billable | Feature|Endpoint → billable
TASKS = [
    # ── Discovery (5 tâches) ─────────────────────────────────────────────────
    {
        "milestone": "Discovery",
        "name":      "[Setup] Espace de travail client — Notion, Zoho CRM, accès repos",
        "type":      "Setup",
        "billable":  False,
        "start":     "04-11-2026",
        "end":       "04-12-2026",
        "priority":  "medium",
        "note":      "Issu de scripts/setup-k3s-access.sh et seed-base-data.ts — pattern de bootstrap client",
    },
    {
        "milestone": "Discovery",
        "name":      "[Feature] Audit identité visuelle et positionnement B2B actuel",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-13-2026",
        "end":       "04-15-2026",
        "priority":  "high",
        "note":      "Clients ref : Nespresso, Eurostar, Le Fooding — analyse différenciation marché",
    },
    {
        "milestone": "Discovery",
        "name":      "[Feature] Rapport de qualification stratégique (SQL/MQL brief Neomnia)",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-14-2026",
        "end":       "04-15-2026",
        "priority":  "high",
        "note":      "Brief structuré pour Phoenix Worker V2 — critères budget, autonomie, stack, co-création",
    },
    {
        "milestone": "Discovery",
        "name":      "[Endpoint] Connexion lead Zoho CRM → pipeline commercial Louis Nédellec",
        "type":      "Endpoint",
        "billable":  True,
        "start":     "04-16-2026",
        "end":       "04-17-2026",
        "priority":  "high",
        "note":      "Issu de scripts/zoho-discovery — wiring CRM lead vers workflow Temporal",
    },
    {
        "milestone": "Discovery",
        "name":      "[Tests] Validation du brief avec l'IA Phoenix Worker V2",
        "type":      "Tests",
        "billable":  False,
        "start":     "04-17-2026",
        "end":       "04-18-2026",
        "priority":  "medium",
        "note":      "Test du score LLM, qualification SQL/MQL/cold sur données réelles Louis",
    },

    # ── Dev & Integration (6 tâches) ─────────────────────────────────────────
    {
        "milestone": "Dev & Integration",
        "name":      "[Feature] Conception plateforme de marque — manifeste, valeurs, tonalité",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-18-2026",
        "end":       "04-21-2026",
        "priority":  "high",
        "note":      "Livrable core : brand platform document, inspiré des patterns docs/ de temp_neosaas",
    },
    {
        "milestone": "Dev & Integration",
        "name":      "[Feature] Stratégie éditoriale IA-first — 3 mois de contenu planifié",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-21-2026",
        "end":       "04-24-2026",
        "priority":  "high",
        "note":      "Scripts/seo_master.py + LiteLLM gemini-flash comme moteur de génération",
    },
    {
        "milestone": "Dev & Integration",
        "name":      "[Endpoint] Déploiement système de design (Figma tokens → livrables clients)",
        "type":      "Endpoint",
        "billable":  True,
        "start":     "04-22-2026",
        "end":       "04-24-2026",
        "priority":  "medium",
        "note":      "Pattern issu de components/ et theme/ dans temp_neosaas — design system versionné",
    },
    {
        "milestone": "Dev & Integration",
        "name":      "[Feature] Rédaction 3 études de cas clients (Nespresso, Eurostar, Louvre)",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-23-2026",
        "end":       "04-25-2026",
        "priority":  "high",
        "note":      "Livrables portfolio — copywriting storytelling B2B, format Neomnia Studio",
    },
    {
        "milestone": "Dev & Integration",
        "name":      "[Endpoint] Intégration Zoho Sign — contrats et bons de commande clients",
        "type":      "Endpoint",
        "billable":  True,
        "start":     "04-25-2026",
        "end":       "04-28-2026",
        "priority":  "medium",
        "note":      "Scope ZohoSign.documents.ALL activé — automatisation onboarding contractuel",
    },
    {
        "milestone": "Dev & Integration",
        "name":      "[Setup] Configuration workflow de validation client (Zoho Projects + Notify)",
        "type":      "Setup",
        "billable":  False,
        "start":     "04-25-2026",
        "end":       "04-26-2026",
        "priority":  "low",
        "note":      "Pattern scripts/watch-and-deploy.sh — validation asynchrone avec notifications",
    },

    # ── Final QA (4 tâches) ──────────────────────────────────────────────────
    {
        "milestone": "Final QA",
        "name":      "[Tests] Revue qualité livrables branding — conformité identité",
        "type":      "Tests",
        "billable":  False,
        "start":     "04-28-2026",
        "end":       "04-29-2026",
        "priority":  "high",
        "note":      "Checklist qualité Neomnia — tests A/B messaging, cohérence plateforme de marque",
    },
    {
        "milestone": "Final QA",
        "name":      "[Tests] Test end-to-end pipeline CRM → Zoho Sign → Zoho Books",
        "type":      "Tests",
        "billable":  False,
        "start":     "04-29-2026",
        "end":       "04-30-2026",
        "priority":  "medium",
        "note":      "Pattern scripts/test-api-flow.sh et test-checkout-flow.ts — validation pipeline complet",
    },
    {
        "milestone": "Final QA",
        "name":      "[Feature] Présentation finale & remise des livrables (deck + dossier)",
        "type":      "Feature",
        "billable":  True,
        "start":     "04-30-2026",
        "end":       "05-01-2026",
        "priority":  "high",
        "note":      "Deck Neomnia Studio — présentation de la plateforme de marque + stratégie éditoriale",
    },
    {
        "milestone": "Final QA",
        "name":      "[Endpoint] Activation récurrence — Zoho Projects mission continue post-onboarding",
        "type":      "Endpoint",
        "billable":  True,
        "start":     "05-01-2026",
        "end":       "05-02-2026",
        "priority":  "medium",
        "note":      "Conversion onboarding → mission récurrente — pipeline Zoho Books + contrat reconductible",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_token() -> str:
    resp = httpx.post(
        "https://accounts.zoho.com/oauth/v2/token",
        data={
            "grant_type":    "refresh_token",
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "refresh_token": REFRESH_TOKEN,
        },
        timeout=20.0,
    )
    resp.raise_for_status()
    d = resp.json()
    if "access_token" not in d:
        raise RuntimeError(f"Token refresh failed: {d}")
    print(f"  ✓ Token: {d['access_token'][:25]}...")
    return d["access_token"]


def zh(token: str) -> dict:
    return {
        "Authorization":               f"Zoho-oauthtoken {token}",
        "X-com-zoho-projects-version": API_VER,
    }


def create_milestone(token: str, name: str, end_date: str, flag: str) -> str | None:
    """Crée un jalon et retourne son ID."""
    # Try multiple owner formats
    for owner_param in [
        {"owner": "2114101000000046003"},
        {"owner": "630459010"},
        {"person_responsible": "2114101000000046003"},
        {},  # sans owner
    ]:
        params = {"name": name, "end_date": end_date, "flag": flag, **owner_param}
        resp = httpx.post(
            f"{BASE}/portal/{PORTAL_ID}/projects/{PROJECT_ID}/milestones/",
            headers=zh(token),
            data=params,
            timeout=15.0,
        )
        d = resp.json()
        ms = d.get("milestones", [])
        if ms:
            mid = ms[0]["id"]
            print(f"  ✓ Jalon '{name}' → id={mid} (owner_param={list(owner_param.keys())})")
            return mid
        err = d.get("error", {})
        if err.get("code") != 6831:
            print(f"  ✗ Jalon '{name}': {err}")
            return None

    print(f"  ✗ Jalon '{name}': toutes tentatives échouées")
    return None


def create_tasklist(token: str, name: str, milestone_id: str | None) -> str | None:
    """Crée une liste de tâches liée au jalon."""
    params: dict = {"name": name}
    if milestone_id:
        params["milestone_id"] = milestone_id

    resp = httpx.post(
        f"{BASE}/portal/{PORTAL_ID}/projects/{PROJECT_ID}/tasklists/",
        headers=zh(token),
        data=params,
        timeout=15.0,
    )
    d = resp.json()
    tls = d.get("tasklists", [])
    if tls:
        tlid = tls[0]["id"]
        print(f"  ✓ Liste '{name}' → id={tlid}")
        return tlid
    print(f"  ✗ Liste '{name}': {d.get('error', d)}")
    return None


def create_task(token: str, name: str, tasklist_id: str,
                start: str, end: str, priority: str, billable: bool) -> str | None:
    params = {
        "name":       name,
        "start_date": start,
        "end_date":   end,
        "priority":   priority,
    }
    if tasklist_id:
        params["tasklist_id"] = tasklist_id

    # Zoho Projects billing field
    for bill_key in ["billable", "is_billable", "billing_type"]:
        test_params = {**params, bill_key: "true" if billable else "false"}
        resp = httpx.post(
            f"{BASE}/portal/{PORTAL_ID}/projects/{PROJECT_ID}/tasks/",
            headers=zh(token),
            data=test_params,
            timeout=15.0,
        )
        d = resp.json()
        tasks = d.get("tasks", [])
        if tasks:
            tid = tasks[0].get("id", "?")
            bill_label = "FACTURABLE" if billable else "NON FACTURABLE"
            print(f"  ✓ [{bill_label}] {name[:55]}... → {tid}")
            return tid
        if d.get("error", {}).get("code") not in (6831, 6832):
            break

    # Fallback sans billing
    resp = httpx.post(
        f"{BASE}/portal/{PORTAL_ID}/projects/{PROJECT_ID}/tasks/",
        headers=zh(token),
        data=params,
        timeout=15.0,
    )
    d = resp.json()
    tasks = d.get("tasks", [])
    if tasks:
        tid = tasks[0].get("id", "?")
        bill_label = "FACTURABLE*" if billable else "NON FACTURABLE*"
        print(f"  ✓ [{bill_label}] {name[:55]}... → {tid} (billing à définir manuellement)")
        return tid
    print(f"  ✗ Tâche '{name[:40]}': {d.get('error', d)}")
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Déploiement projet Louis Nédellec — Neomnia Studio")
    print("=" * 60)

    # Token
    print("\n[1/4] Refresh token...")
    try:
        token = get_token()
    except Exception as e:
        print(f"  ✗ {e}")
        sys.exit(1)

    # ── Étape 2 : Jalons ──────────────────────────────────────────────────────
    print("\n[2/4] Création des jalons...")
    milestone_ids: dict[str, str | None] = {}
    for ms in MILESTONES:
        mid = create_milestone(token, ms["name"], ms["end_date"], ms["flag"])
        milestone_ids[ms["name"]] = mid
        time.sleep(0.5)

    # ── Étape 3 : Listes de tâches ────────────────────────────────────────────
    print("\n[3/4] Création des listes de tâches...")
    tasklist_ids: dict[str, str | None] = {}
    for ms in MILESTONES:
        mid  = milestone_ids.get(ms["name"])
        tlid = create_tasklist(token, f"Tâches — {ms['name']}", mid)
        tasklist_ids[ms["name"]] = tlid
        time.sleep(0.5)

    # ── Étape 4 : 15 tâches ───────────────────────────────────────────────────
    print("\n[4/4] Création des 15 tâches...")
    stats = {"total": 0, "ok": 0, "billable": 0, "non_billable": 0}

    for t in TASKS:
        stats["total"] += 1
        tlid = tasklist_ids.get(t["milestone"])
        tid  = create_task(
            token     = token,
            name      = t["name"],
            tasklist_id = tlid or "",
            start     = t["start"],
            end       = t["end"],
            priority  = t["priority"],
            billable  = t["billable"],
        )
        if tid:
            stats["ok"] += 1
            if t["billable"]:
                stats["billable"] += 1
            else:
                stats["non_billable"] += 1
        time.sleep(0.4)

    # ── Résumé ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"RÉSULTAT : {stats['ok']}/{stats['total']} tâches créées")
    print(f"  FACTURABLES     : {stats['billable']}")
    print(f"  NON FACTURABLES : {stats['non_billable']}")
    print(f"\nJalons : {sum(1 for v in milestone_ids.values() if v)}/3")
    for name, mid in milestone_ids.items():
        print(f"  {'✓' if mid else '✗'} {name} → {mid}")
    print(f"\nPortail : https://projects.zoho.com/portal/neomniadotnet")
    print("=" * 60)


if __name__ == "__main__":
    main()
