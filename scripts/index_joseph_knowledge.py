#!/usr/bin/env python3
"""
index_joseph_knowledge.py — Reconstruit design-knowledge avec du contenu structuré réel.

Usage:
  python3 ~/scripts/index_joseph_knowledge.py           # flush + re-index
  python3 ~/scripts/index_joseph_knowledge.py --dry-run # affiche les chunks sans indexer
"""
import argparse, json, sys, time, uuid
import httpx

QDRANT_URL   = "http://qdrant.neokube.local"
LITELLM_URL  = "http://litellm.neokube.local"
LITELLM_KEY  = "sk-neokube-litellm-master"
EMBED_MODEL  = "nomic-embed-text"
COLLECTION   = "design-knowledge"
VECTOR_SIZE  = 768
BATCH_SIZE   = 20

# ── Corpus design-knowledge ───────────────────────────────────────────────────
# Chaque chunk : {id, source, category, content}
# source: "ux-heuristics" | "section-patterns" | "neomnia-design" | "wireframe-principles" | "joseph-session"

KNOWLEDGE_CHUNKS = [

    # ── UX Heuristics (Nielsen) ───────────────────────────────────────────────
    {"id": "ux-h01", "source": "ux-heuristics", "category": "visibility",
     "content": "Visibilité de l'état du système : l'interface doit toujours tenir l'utilisateur informé de ce qui se passe via un feedback approprié dans un délai raisonnable. Exemple wireframe : indicateur de chargement sur les CTA, confirmation visuelle après soumission de formulaire."},

    {"id": "ux-h02", "source": "ux-heuristics", "category": "match",
     "content": "Correspondance entre le système et le monde réel : utiliser les mots, phrases et concepts familiers à l'utilisateur plutôt que des termes orientés système. Dans les wireframes, les labels de navigation doivent refléter le vocabulaire métier du client (ex : 'Nos réalisations' > 'Portfolio', 'Parler à un expert' > 'Contact')."},

    {"id": "ux-h03", "source": "ux-heuristics", "category": "control",
     "content": "Liberté et contrôle : prévoir des sorties clairement marquées pour les actions non désirées. Dans les wireframes, les formulaires doivent avoir un bouton Annuler, les modales une croix de fermeture, les flux multi-étapes un bouton Retour."},

    {"id": "ux-h04", "source": "ux-heuristics", "category": "consistency",
     "content": "Cohérence et standards : les utilisateurs ne devraient pas se demander si des mots, situations ou actions différentes signifient la même chose. Dans les wireframes, utiliser le même composant Nav sur toutes les pages, même hauteur header, même position CTA primaire."},

    {"id": "ux-h05", "source": "ux-heuristics", "category": "error-prevention",
     "content": "Prévention des erreurs : une bonne conception prévient les problèmes avant qu'ils ne surviennent. Dans les wireframes, marquer les champs obligatoires, indiquer les formats attendus (ex: JJ/MM/AAAA), désactiver le bouton Submit si le formulaire est incomplet."},

    {"id": "ux-h06", "source": "ux-heuristics", "category": "recognition",
     "content": "Reconnaissance plutôt que rappel : minimiser la charge mémoire de l'utilisateur — les objets, actions et options doivent être visibles. Dans les wireframes, les icônes doivent être accompagnées de labels texte, les breadcrumbs indiquent la position dans l'arborescence."},

    {"id": "ux-h07", "source": "ux-heuristics", "category": "flexibility",
     "content": "Flexibilité et efficacité : les accélérateurs (non vus par les novices) peuvent accélérer l'interaction pour les experts. Dans les wireframes B2B, prévoir un accès direct au dashboard ou aux fonctions clés sans passer par la homepage."},

    {"id": "ux-h08", "source": "ux-heuristics", "category": "aesthetic",
     "content": "Design esthétique et minimaliste : les dialogues ne doivent pas contenir d'informations non pertinentes. Dans les wireframes, chaque section ne porte qu'un message principal. Hero = 1 headline + 1 sous-titre + max 2 CTA. Services = 3 à 6 cartes max. Footer = liens essentiels uniquement."},

    {"id": "ux-h09", "source": "ux-heuristics", "category": "recovery",
     "content": "Aider les utilisateurs à reconnaître, diagnostiquer et corriger les erreurs : les messages d'erreur doivent être exprimés en langage courant, indiquer précisément le problème et suggérer une solution. Dans les wireframes, prévoir des zones d'erreur inline sous chaque champ de formulaire."},

    {"id": "ux-h10", "source": "ux-heuristics", "category": "help",
     "content": "Aide et documentation : même si le système peut être utilisé sans documentation, il peut être nécessaire de fournir de l'aide. Dans les wireframes, prévoir une FAQ ou section Aide visible dans le footer et/ou dans les pages à friction élevée (tarifs, formulaires complexes)."},

    # ── Section patterns par type de site ─────────────────────────────────────
    {"id": "sp-vitrine-01", "source": "section-patterns", "category": "vitrine",
     "content": "Site vitrine agence/conseil — structure type : Hero (headline + valeur unique + CTA 'Parler à un expert') → Services/Expertises (grid 3 colonnes, icônes + titre + description courte) → Preuves sociales (logos clients ou chiffres clés) → Réalisations/Cas clients (3 cartes) → CTA secondaire (bandeau coloré) → Contact/Footer. Hauteur desktop estimée : 2400-3200px."},

    {"id": "sp-vitrine-02", "source": "section-patterns", "category": "vitrine",
     "content": "Section Hero vitrine — contenu recommandé : titre H1 (max 8 mots, proposition de valeur directe) + sous-titre (20-30 mots, explication + cible) + CTA primaire (action immédiate) + CTA secondaire (voir les réalisations/en savoir plus). Background : image ou gradient. Hauteur : 460-520px desktop, 520-600px mobile."},

    {"id": "sp-saas-01", "source": "section-patterns", "category": "saas",
     "content": "Site SaaS — structure type : Hero (headline bénéfice + screenshot/mockup produit + CTA 'Essai gratuit') → Social proof (logos + chiffres : X clients, Y% satisfaction) → Features (3-4 cartes en 2 colonnes avec icône + titre + description) → How it works (steps 1-2-3 linéaire) → Pricing (2-3 plans, plan central mis en avant) → FAQ (5-8 questions, accordéon) → CTA final (bande colorée). Hauteur desktop : 3500-5000px."},

    {"id": "sp-saas-02", "source": "section-patterns", "category": "saas",
     "content": "Section Pricing SaaS — bonnes pratiques : 2 ou 3 plans (Free/Pro/Enterprise). Plan recommandé = mise en avant visuelle (bordure colorée + badge 'Recommandé'). Présenter en tableau horizontal desktop, accordéon mobile. Chaque plan : titre + prix/mois + liste 5-8 features + CTA. Indiquer clairement les features exclusives au plan supérieur."},

    {"id": "sp-ecom-01", "source": "section-patterns", "category": "e-commerce",
     "content": "Landing e-commerce produit — structure type : Hero produit (image grand format + titre + prix + CTA 'Ajouter au panier') → Caractéristiques (grid 2x2 ou 3x1 icônes) → Galerie images (slider) → Avis clients (grid cartes 3 colonnes, note étoiles) → Produits associés → FAQ. La fiche produit doit avoir un 'sticky add-to-cart' en mobile. Hauteur desktop : 2800-4000px."},

    {"id": "sp-corporate-01", "source": "section-patterns", "category": "corporate",
     "content": "Site corporate/institutionnel — structure type : Hero sobre (image + titre court + sous-titre institucional) → À propos (texte + image alternés) → Chiffres clés (4 métriques en ligne) → Équipe (grid photos + noms + titres) → Actualités (3 dernières news en cartes) → Contact avec carte. Ton : professionnel, sobre, crédibilité. Hauteur desktop : 2800-3600px."},

    {"id": "sp-landing-01", "source": "section-patterns", "category": "landing-page",
     "content": "Landing page conversion (campagne) — règles : 1 seul objectif = 1 seul CTA répété. Pas de navigation principale (réduire les sorties). Structure : Hero court → Pain point (le problème) → Solution (le produit/service) → Preuves (témoignages + logos) → Offre (pricing ou lead gen form) → Garantie → CTA final. Hauteur desktop : 1800-2800px."},

    {"id": "sp-contact-01", "source": "section-patterns", "category": "contact",
     "content": "Page Contact — structure recommandée : hero court (titre + sous-titre rassurant) → formulaire principal (nom, email, sujet, message, RGPD checkbox, submit) → informations alternatives (adresse, téléphone, email direct) → carte Google Maps optionnelle. Sur mobile, formulaire pleine largeur. Hauteur desktop : 700-1000px."},

    {"id": "sp-about-01", "source": "section-patterns", "category": "about",
     "content": "Page À propos/L'agence — structure recommandée : hero (mission + valeurs en 1 phrase) → histoire (texte + image) → valeurs (3-4 cards) → équipe (grid photos 2x2 ou 3x2, nom + rôle + photo) → chiffres clés (4 métriques) → CTA 'Travailler ensemble'. Hauteur desktop : 2200-3000px."},

    # ── Principes design Neomnia ───────────────────────────────────────────────
    {"id": "neo-d01", "source": "neomnia-design", "category": "identity",
     "content": "Identité visuelle Neomnia Studio — couleurs de référence : Primary #32AFB1 (bleu-vert teal, modernité et confiance), Primary Dark #1E6363 (hover, header foncé), Dark #262626 (texte corps), Light BG #F8FFFE (fond section alterné). Typographie : Inter (UI, titres, corps). Le teal #32AFB1 signale les actions et les accents — ne pas l'utiliser pour les fonds de section."},

    {"id": "neo-d02", "source": "neomnia-design", "category": "tone",
     "content": "Ton et positionnement Neomnia : agence de production digitale B2B, spécialiste IA et automatisation. Les wireframes pour des clients Neomnia doivent refléter un positionnement premium, sobre et efficace. Éviter les effets visuels superflus. Favoriser des layouts asymétriques et du whitespace généreux. Le copy des wireframes doit être explicite, pas de lorem ipsum."},

    {"id": "neo-d03", "source": "neomnia-design", "category": "components",
     "content": "Composants Neomnia — standards : Boutons primaires = background primary, texte white, border-radius 6-8px, padding 12-20px. Boutons secondaires = border 2px primary, texte primary, fond white. Cards = fond white, shadow légère (box-shadow 0 2px 8px rgba(0,0,0,0.08)), border-radius 12px, padding 24px. Nav desktop = fond white ou primary_dark, height 64-80px, logo gauche + liens centre + CTA droite."},

    {"id": "neo-d04", "source": "neomnia-design", "category": "grid",
     "content": "Grilles Neomnia — standards : Desktop 1440px, max-content 1200px, 12 colonnes 80px + 24px gutter. Mobile 375px, 4 colonnes 16px margin. Dans les wireframes penpot-engine, la largeur de travail est 1440px desktop et 375px mobile. Les sections sont full-width en fond, contenu centré sur max 1200px. Padding vertical sections : min 80px desktop, 48px mobile."},

    {"id": "neo-d05", "source": "neomnia-design", "category": "ux-principles",
     "content": "Principes UX Neomnia pour les clients : (1) Mobile-first — chaque wireframe desktop a son équivalent mobile dans le même artboard. (2) Conversion first — chaque page a au moins un CTA visible above the fold. (3) Contenu réel — les wireframes montrent du vrai copy (headline client, vraies sections), jamais lorem ipsum. (4) Accessibilité — contraste WCAG AA minimum, taille texte min 14px corps."},

    # ── Wireframe principles ──────────────────────────────────────────────────
    {"id": "wf-p01", "source": "wireframe-principles", "category": "structure",
     "content": "Structure d'un wireframe professionnel : (1) Nav/Header en haut — toujours le même composant sur toutes les pages. (2) Hero — première section, above the fold, contient la proposition de valeur + CTA. (3) Corps — 3 à 7 sections selon la page. (4) CTA intermédiaire — bande colorée entre des blocs de contenu dense. (5) Footer — toujours en bas, liens secondaires + légaux."},

    {"id": "wf-p02", "source": "wireframe-principles", "category": "annotations",
     "content": "Annotations dans les wireframes Penpot : les frames portent le nom de la section (ex : '01 — Hero', '02 — Services'). Les labels sont en gris #888. Les zones d'image utilisent un placeholder gris avec croix diagonale. Les textes de wireframe sont en Inter, la taille importe peu, la hiérarchie H1 > H2 > body doit être visible par la taille relative."},

    {"id": "wf-p03", "source": "wireframe-principles", "category": "breakpoints",
     "content": "Breakpoints wireframe — desktop (1440px) et mobile (375px) sont les deux références. Desktop : nav horizontale, grid multi-colonnes, sections larges. Mobile : nav hamburger ou simplifiée, colonnes empilées, CTA pleine largeur. Dans penpot-engine, les artboards desktop et mobile sont côte à côte dans la page Wireframes avec un label clair (ex : 'Accueil — Desktop 1440' + 'Accueil — Mobile 375')."},

    {"id": "wf-p04", "source": "wireframe-principles", "category": "fidelity",
     "content": "Fidélité des wireframes mid-fi (niveau Neomnia) : on ne fait pas du lo-fi (boîtes grises) ni du hi-fi (pixel perfect). Le mid-fi montre la structure réelle, les vraies proportions, le copy réel, les couleurs primaires (primary, dark, gray) mais sans les images finales (placeholder). Les polices sont standardisées (Inter). L'objectif est de valider structure + contenu avant la maquette haute-fidélité."},

    {"id": "wf-p05", "source": "wireframe-principles", "category": "handoff",
     "content": "Handoff wireframe → développement : les wireframes penpot-engine sont livrés avec (1) URL workspace Penpot éditable, (2) tokens design (primary_color, dark, light_bg) documentés, (3) noms de sections standardisés. Le développeur peut utiliser les tokens comme point de départ CSS. La page Design System documente palette + typographie + grille."},

    {"id": "wf-p06", "source": "wireframe-principles", "category": "sections",
     "content": "Choix du type de section dans penpot_build_structured : hero (1 titre + CTA, hauteur 420-520px) · content (texte long + image, 300-400px) · services (grid 3 cartes, 320-400px) · cta (bandeau coloré court, 100-140px) · form (formulaire contact, 400-480px) · grid2x2 (4 éléments 2 colonnes, 350-450px) · grid3x3 (6-9 éléments 3 colonnes, 380-480px) · custom (hauteur libre)."},

    {"id": "wf-p07", "source": "wireframe-principles", "category": "mobile",
     "content": "Spécificités mobile dans les wireframes : (1) Nav simplifiée — logo + hamburger icon, menu déroulant. (2) CTA pleine largeur — pas de bouton inline. (3) Cards empilées — grid 1 colonne. (4) Formulaires — labels au-dessus des champs (pas inline). (5) Images — full-width, ratio 16:9. (6) Font size minimum — 16px body, 14px secondary. (7) Touch targets — min 44px de hauteur pour les éléments cliquables."},
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def embed_one(text: str) -> list[float]:
    r = httpx.post(
        f"{LITELLM_URL}/v1/embeddings",
        headers={"Authorization": f"Bearer {LITELLM_KEY}"},
        json={"model": EMBED_MODEL, "input": text[:1000]},
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()["data"][0]["embedding"]


def recreate_collection():
    # Delete
    r = httpx.delete(f"{QDRANT_URL}/collections/{COLLECTION}", timeout=30.0)
    print(f"DELETE {COLLECTION}: {r.status_code}")
    time.sleep(1)
    # Create
    r = httpx.put(
        f"{QDRANT_URL}/collections/{COLLECTION}",
        json={"vectors": {"size": VECTOR_SIZE, "distance": "Cosine"}},
        timeout=30.0,
    )
    r.raise_for_status()
    print(f"CREATE {COLLECTION}: {r.status_code}")


def upsert_batch(points: list[dict]):
    r = httpx.put(
        f"{QDRANT_URL}/collections/{COLLECTION}/points",
        json={"points": points},
        timeout=60.0,
    )
    r.raise_for_status()


def main(dry_run: bool):
    print(f"Chunks à indexer : {len(KNOWLEDGE_CHUNKS)}")
    if dry_run:
        for c in KNOWLEDGE_CHUNKS:
            print(f"  [{c['source']}] {c['id']} — {c['content'][:80]}…")
        return

    recreate_collection()

    points = []
    for idx, c in enumerate(KNOWLEDGE_CHUNKS):
        emb = embed_one(c["content"])
        points.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, c["id"])),
            "vector": emb,
            "payload": {
                "content": c["content"],
                "source": c["source"],
                "category": c["category"],
                "chunk_id": c["id"],
                "indexed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        })
        print(f"  embedded {idx+1}/{len(KNOWLEDGE_CHUNKS)} [{c['id']}]")
        # Upsert par batch de 10
        if len(points) >= BATCH_SIZE or idx == len(KNOWLEDGE_CHUNKS) - 1:
            upsert_batch(points)
            print(f"  → upserted {len(points)} points")
            points = []
            time.sleep(0.3)

    # Verify
    r = httpx.get(f"{QDRANT_URL}/collections/{COLLECTION}", timeout=10.0)
    count = r.json().get("result", {}).get("points_count", "?")
    print(f"\ndesign-knowledge : {count} points ✅")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(args.dry_run)
