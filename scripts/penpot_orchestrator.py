#!/usr/bin/env python3
"""
penpot_orchestrator.py — Traduit un prompt en langage naturel en appel JSON
vers le micro-service Penpot Agent (localhost:8000/action).

Usage :
    python3 penpot_orchestrator.py "Génère une section Pricing pour NeoKube"
    penpot "Ajoute un Hero bleu nuit au fichier NeoKube Landing V2"
"""

import sys
import re
import json
import argparse
import requests

SERVICE           = "http://localhost:8000/action"
SERVICE_ORCHESTRATE = "http://localhost:8000/v1/orchestrate"

# ---------------------------------------------------------------------------
# Résolution d'intent : prompt naturel → payload structuré
# ---------------------------------------------------------------------------

DEFAULT_PROJECT = "Neomnia"
DEFAULT_FILE    = "NeoKube Landing V2"

SECTION_PRESETS = {
    "pricing": {
        "section_name": "Pricing Section",
        "bg_color":     "#0F172A",
        "title_color":  "#F8FAFC",
        "card_color":   "#1E293B",
        "text_color":   "#94A3B8",
        "accent_color": "#6366F1",
    },
    "hero": {
        "section_name": "Hero Section",
        "bg_color":     "#0D1117",
        "title_color":  "#F8FAFC",
        "card_color":   "#161B22",
        "text_color":   "#8B949E",
        "accent_color": "#58A6FF",
    },
    "features": {
        "section_name": "Features Section",
        "bg_color":     "#F8FAFC",
        "title_color":  "#0F172A",
        "card_color":   "#FFFFFF",
        "text_color":   "#475569",
        "accent_color": "#6366F1",
    },
    "cta": {
        "section_name": "CTA Section",
        "bg_color":     "#6366F1",
        "title_color":  "#FFFFFF",
        "card_color":   "#4F46E5",
        "text_color":   "#C7D2FE",
        "accent_color": "#FFFFFF",
    },
    "testimonials": {
        "section_name": "Testimonials Section",
        "bg_color":     "#F1F5F9",
        "title_color":  "#0F172A",
        "card_color":   "#FFFFFF",
        "text_color":   "#475569",
        "accent_color": "#6366F1",
    },
}

PRICING_TIERS = [
    {"name": "Starter",    "price": "0€",    "sub": "/ mois",  "features": ["1 cluster K8s", "5 pipelines CI/CD", "Monitoring basique",    "Support communauté"],  "cta": "Commencer gratuitement", "highlight": False},
    {"name": "Pro",        "price": "49€",   "sub": "/ mois",  "features": ["5 clusters K8s", "Pipelines illimités", "Monitoring avancé",   "Support prioritaire",  "IaC Terraform inclus"],          "cta": "Démarrer l'essai",       "highlight": True},
    {"name": "Enterprise", "price": "Sur devis", "sub": "",    "features": ["Clusters illimités", "SLA 99,99%",      "Monitoring dédié",    "Support 24/7",         "Onboarding personnalisé"],       "cta": "Contacter l'équipe",     "highlight": False},
]


def resolve_intent(prompt: str) -> dict:
    """Traduit le prompt en payload d'action structuré."""
    low = prompt.lower()

    # ── Extraction du fichier cible ──────────────────────────────────────
    file_match = re.search(
        r'(?:fichier|file|dans|to|for|pour)\s+["\']?([A-Za-z0-9 _\-V]+)["\']?',
        prompt, re.I
    )
    target_file = file_match.group(1).strip() if file_match else DEFAULT_FILE

    # ── Extraction du projet ─────────────────────────────────────────────
    proj_match = re.search(r'projet\s+["\']?(\w+)["\']?', prompt, re.I)
    project = proj_match.group(1) if proj_match else DEFAULT_PROJECT

    # ── Détection du type de section ────────────────────────────────────
    section_type = next(
        (k for k in SECTION_PRESETS if k in low),
        None
    )

    # ── Actions de haut niveau ───────────────────────────────────────────

    # Pricing en priorité (avant create_design pour éviter le faux match)
    if section_type == "pricing" or re.search(r'\b(pricing|tarif|prix|plan)\b', low):
        return _build_pricing_payload(target_file, project)

    # Création design complet
    if re.search(r'\b(crée|créer|create|génère|generate|nouveau|new)\b.*\b(design|landing|page)\b', low):
        title_match = re.search(r'(?:titre|title|headline)[:\s]+["\']?(.+?)["\']?(?:$|\n|,)', prompt, re.I)
        return {
            "action":       "create_design",
            "file_name":    target_file,
            "headline":     title_match.group(1).strip() if title_match else target_file,
            "project_name": project,
        }

    # Ajout section générique
    if section_type and re.search(r'\b(ajoute|add|crée|create|génère|generate|section)\b', low):
        return _build_section_payload(section_type, target_file, project, prompt)

    # Lecture contexte UX
    if re.search(r'\b(contexte|context|ux|marketing|seo)\b', low):
        query_match = re.search(r'(?:sur|about|query)[:\s]+(.+)', prompt, re.I)
        return {"action": "fetch_ux", "query": query_match.group(1).strip() if query_match else low}

    # Liste projets
    if re.search(r'\b(list|liste|projets|projects)\b', low):
        return {"action": "list_projects"}

    # Profil
    if re.search(r'\b(profil|profile|qui|who)\b', low):
        return {"action": "get_profile"}

    # Fallback : envoyer le prompt brut
    return {"action": "raw", "prompt": prompt}


def _build_pricing_payload(file_name: str, project: str) -> dict:
    """Payload dédié pour une section Pricing complète avec 3 plans."""
    return {
        "action":       "create_pricing_section",
        "file_name":    file_name,
        "project_name": project,
        "section": {
            "name":       "Pricing Section",
            "bg_color":   "#0F172A",
            "y_offset":   1400,
            "width":      1440,
            "height":     900,
            "title":      "Un plan pour chaque étape de votre croissance",
            "title_color":"#F8FAFC",
            "tiers":      PRICING_TIERS,
        }
    }


def _build_section_payload(section_type: str, file_name: str, project: str, prompt: str) -> dict:
    preset = SECTION_PRESETS[section_type]
    title_match = re.search(r'(?:titre|title|headline)[:\s]+["\']?(.+?)["\']?(?:$|\n|,)', prompt, re.I)
    title = title_match.group(1).strip() if title_match else preset["section_name"]
    return {
        "action":       "create_frame",
        "file_name":    file_name,
        "project_name": project,
        "name":         preset["section_name"],
        "fill_color":   preset["bg_color"],
        "width":        1440,
        "height":       800,
        "title":        title,
    }


# ---------------------------------------------------------------------------
# Exécution
# ---------------------------------------------------------------------------

def run(prompt: str, dry_run: bool = False, agent: bool = False) -> None:
    if agent:
        # Mode Master Agent : envoie le prompt brut à /v1/orchestrate
        print(f"\n🤖 Mode Agent   : {prompt}")
        if dry_run:
            print(f"(dry-run — cible : POST {SERVICE_ORCHESTRATE})")
            return
        try:
            r = requests.post(SERVICE_ORCHESTRATE, json={"prompt": prompt}, timeout=120)
            result = r.json()
            if "response" in result:
                print(f"\n✅ Réponse ({result.get('iterations',1)} itération(s)) :\n")
                print(result["response"])
            else:
                print(f"❌ Erreur :\n{json.dumps(result, indent=2, ensure_ascii=False)}")
        except requests.exceptions.ConnectionError:
            print(f"❌ Service indisponible : {SERVICE_ORCHESTRATE}")
            print("   → Vérifiez que le sidecar tourne et que le port-forward est actif")
        except requests.exceptions.Timeout:
            print("❌ Timeout (120s)")
        except Exception as e:
            print(f"❌ Erreur : {e}")
        return

    # Mode intent resolver classique
    payload = resolve_intent(prompt)

    print(f"\n📝 Prompt    : {prompt}")
    print(f"🔧 Intent    : {payload.get('action','?')}")
    print(f"📦 Payload   :\n{json.dumps(payload, indent=2, ensure_ascii=False)}\n")

    if dry_run:
        print("(dry-run — pas d'envoi)")
        return

    try:
        r = requests.post(SERVICE, json={"prompt": json.dumps(payload)}, timeout=60)
        result = r.json()
        print(f"✅ Réponse   :\n{json.dumps(result, indent=2, ensure_ascii=False)}")
    except requests.exceptions.ConnectionError:
        print(f"❌ Service indisponible : {SERVICE}")
        print("   → Vérifiez que le sidecar tourne : kubectl logs -n open-webui <pod> -c penpot-agent")
    except requests.exceptions.Timeout:
        print("❌ Timeout (60s)")
    except Exception as e:
        print(f"❌ Erreur : {e}")


# ---------------------------------------------------------------------------
# Entrée
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Penpot Orchestrator — envoie un prompt de design au micro-service Penpot Agent."
    )
    parser.add_argument("prompt", nargs="?", help="Prompt en langage naturel")
    parser.add_argument("--dry-run", action="store_true", help="Affiche le payload sans l'envoyer")
    parser.add_argument("--agent",   action="store_true", help="Mode Master Agent (LLM + Tool Use via /v1/orchestrate)")
    parser.add_argument("--json", dest="raw_json", help="Payload JSON brut (bypass l'intent resolver)")
    args = parser.parse_args()

    if args.raw_json:
        payload = json.loads(args.raw_json)
        print(f"📦 Payload direct :\n{json.dumps(payload, indent=2, ensure_ascii=False)}\n")
        if not args.dry_run:
            r = requests.post(SERVICE, json={"prompt": json.dumps(payload)}, timeout=60)
            print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    elif args.prompt:
        run(args.prompt, dry_run=args.dry_run, agent=args.agent)
    else:
        parser.print_help()
