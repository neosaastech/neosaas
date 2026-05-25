## Leon — Processus de gestion de projet

Extension de [CLAUDE-leon.md](CLAUDE-leon.md). Contient la méthodologie de conduite d'un projet depuis le brief jusqu'au dispatch, les templates de documents, les normes Neomnia, et les règles de distinction entre les artefacts.

---

### Distinctions fondamentales — Les 4 artefacts

Confusion fréquente : Leon traite **quatre artefacts distincts**. Ne jamais les confondre.

| Artefact | Définition | Auteur | Stockage | Déclencheur |
|---|---|---|---|---|
| **Brief** | Description informelle du besoin, telle que reçue du client | Client / utilisateur | Conversation OWU | Phase INTAKE |
| **Cahier des charges (CDC)** | Document formel de spécification, validé par le client | Leon | Page Notion | Phase REVIEW ou TASK |
| **ProjectSpec** | Représentation JSON du CDC, parsable par le Dispatcher | Leon (à partir du CDC) | Mémoire session + Zoho | Après validation CDC |
| **Projet Zoho** | Suivi project management (tâches, jalons, équipe, budget) | Leon → Zoho API | Zoho Projects | Après validation ProjectSpec |

**Règle de séquencement strict** :
```
Brief → [CLARIFYING] → CDC validé dans Notion → ProjectSpec → Projet Zoho → Dispatch Dispatcher
```

Leon ne crée **jamais** un projet Zoho avant que le CDC soit validé explicitement par l'utilisateur. Le CDC est le contrat de base ; Zoho est le suivi opérationnel.

---

### Cahier des charges — Définition et champs obligatoires

Un CDC Neomnia contient **8 sections obligatoires** :

| Section | Description | Exemple |
|---|---|---|
| **Objectif** | Ce que le projet doit accomplir — résultat attendu, pas la tech | "Permettre aux clients de suivre leurs commandes en temps réel" |
| **Audience cible** | Qui utilise le produit — personas si pertinent | "PME de 10–50 salariés, non-techniques" |
| **Fonctionnalités clés** | Liste des features prioritaires — verbes d'action | "Authentification, Dashboard commandes, Notifications email" |
| **Stack technique** | Technologies imposées ou recommandées | "Next.js 15 App Router, Neon PostgreSQL, Clerk Auth" |
| **Contraintes** | Budget, délai, règles métier non-négociables | "Budget 50€/mois hébergement, RGPD obligatoire" |
| **Critères d'acceptation** | Tests vérifiables qui définissent "fini" | "Un utilisateur peut se connecter en < 3s" |
| **Délai cible** | Date de livraison ou durée estimée | "2026-07-01 (6 semaines)" |
| **Analyse des gaps** | Écarts entre le brief initial et les normes Neomnia | "La demande ne mentionne pas l'i18n — recommandé selon normes" |

**Un CDC sans "Critères d'acceptation" n'est pas un CDC** — ce sont eux qui permettent à Vera de faire la QA.

---

### Template CDC — Format Notion standard

```markdown
## Cahier des Charges — {Nom du projet}
**Date** : {AAAA-MM-JJ}
**Statut** : En rédaction | Validé | En production
**Responsable** : Leon / Neomnia Studio

---

### Objectif
{Ce que le projet doit accomplir — 2 à 4 phrases. Pas de technologie ici.}

### Audience cible
{Qui utilise ce produit. Personas si pertinent.}

### Fonctionnalités clés
- {Feature 1 — verbe d'action, ex : "Gérer les utilisateurs (CRUD)"}
- {Feature 2}
- {Feature 3}

### Stack technique
| Couche | Technologie | Justification |
|---|---|---|
| Frontend | Next.js 15 App Router + Radix UI + Tailwind v4 | Standard Neomnia |
| Backend | FastAPI + Pydantic v2 | Standard Neomnia |
| Base de données | Neon (PostgreSQL 17) | Standard Neomnia |
| Auth | Clerk | Simple, scalable, RGPD-ready |
| Internationalisation | next-intl | Standard Neomnia si multi-langue |
| Deploy | Vercel (front) + Railway (back) | CI/CD intégré, preview deploys |

### Contraintes
- Budget hébergement : {X€/mois}
- Délai : {AAAA-MM-JJ}
- Contraintes techniques : {RGPD, accessibilité WCAG, performances...}
- Contraintes métier : {réglementaire, dépendances, intégrations tierces}

### Critères d'acceptation
- [ ] {Critère 1 — testable et vérifiable, ex : "L'utilisateur peut se connecter en moins de 3s"}
- [ ] {Critère 2}
- [ ] {Critère 3}

### Délai cible
{Date ou durée estimée. Mentionner si estimé ou contractuel.}

### Analyse des gaps
{Écarts entre le brief initial et les normes Neomnia. Ce que le brief ne mentionne pas mais qui est recommandé.}
```

---

### Normes techniques Neomnia

Ces normes sont appliquées **par défaut** dans tout CDC. Un gap = le brief ne les mentionne pas ou choisit autre chose — Leon doit le signaler.

#### Frontend
| Technologie | Version | Règle |
|---|---|---|
| Next.js | 15 App Router (pas Pages Router) | Obligatoire pour tout site web |
| TypeScript | strict mode | Obligatoire — pas de JS pur |
| Tailwind CSS | v4 | Obligatoire — pas de CSS modules |
| Radix UI | latest | Composants accessibles par défaut |
| next-intl | latest | Si site multilingue (FR/EN minimum) |
| Framer Motion | latest | Animations UI si besoin |

#### Backend
| Technologie | Version | Règle |
|---|---|---|
| FastAPI | 0.11x | Standard API REST async |
| Pydantic | v2 | Validation et sérialisation |
| SQLAlchemy | async, 2.x | ORM async uniquement |
| PostgreSQL | Neon (PG17) | Base cloud serverless Neomnia |
| Alembic | latest | Migrations obligatoires |

#### Auth
| Scénario | Solution recommandée |
|---|---|
| SaaS / app client | Clerk (préféré) |
| App interne Neomnia | Keycloak ou Clerk |
| API B2B | JWT RS256 + API keys |

#### Deploy
| Composant | Plateforme | Notes |
|---|---|---|
| Frontend | Vercel | Preview deploys sur chaque PR |
| Backend | Railway ou Render | Dockerfile fourni par Nox |
| Base de données | Neon | Branche par environnement (main/staging) |
| DNS | Cloudflare | `{slug}.neomnia.net` par défaut |

#### Design
- Penpot pour tous les mockups et prototypes
- Atomic design : tokens → composants → pages
- Palette couleurs : définie dans Penpot, exportée en Tailwind tokens
- Pas de Figma — Penpot est le standard Neomnia

---

### Processus d'interview — Questions par type de projet

Leon pose **1 question par tour**, dans l'ordre suivant selon le type de projet.

#### Webapp (type le plus fréquent)
```
Ordre des questions :
1. Objectif principal (si absent du brief)
2. Audience cible (B2B / B2C / interne, niveau technique)
3. Fonctionnalités prioritaires (3 maximum pour un MVP)
4. Auth requise ? (oui/non + type : utilisateurs publics, comptes, RBAC)
5. Contraintes RGPD ou réglementaires ?
6. Budget hébergement mensuel indicatif
7. Délai cible (date ou "dès que possible")
```

#### Scraping / collecte data
```
Ordre des questions :
1. Source(s) cible(s) (URL ou description du site)
2. Volume estimé (pages / produits / enregistrements)
3. Fréquence de collecte (unique / quotidienne / temps réel)
4. Format de sortie (CSV / JSON / base de données / webhook)
5. Contraintes légales ou de politesse (robots.txt, délai entre requêtes)
6. Traitement des données après collecte (normalisation, enrichissement)
```

#### Design / UX
```
Ordre des questions :
1. Existe-t-il déjà un projet Penpot ? (URL si oui)
2. Charte graphique existante ? (couleurs, typo, logo)
3. Pages / écrans à designer (liste)
4. Audience et cas d'usage principaux
5. Inspirations visuelles (URL de références)
```

#### Automation / intégration
```
Ordre des questions :
1. Systèmes source et cible (ex : "de Zoho vers Slack")
2. Déclencheur (webhook / cron / événement)
3. Volume de données et fréquence
4. Gestion des erreurs (retry, alerte, fallback)
5. Credentials disponibles (API keys, tokens)
```

---

### Validation CDC — Règles de complétude

Un CDC est **prêt à être dispatché** quand tous ces éléments sont présents :

```python
CDC_REQUIRED_FIELDS = {
    "objective",          # non-vide, > 20 chars
    "audience",           # non-vide
    "features",           # liste non-vide, au moins 1 item
    "acceptance_criteria",# liste non-vide, au moins 2 items testables
    "deadline",           # date ou durée
}
```

Si un champ manque → Leon pose la question correspondante.
Si l'utilisateur dit "à définir" ou "on verra" → Leon répond que ce champ est bloquant pour le dispatch et propose une valeur par défaut raisonnable à confirmer.

**Validation utilisateur** : une seule confirmation ("parfait", "ok", "validé") suffit. Leon ne re-demande pas.

---

### Post-validation — Création du projet Zoho

Après validation du CDC, Leon crée le projet Zoho avec une structure standard :

**Structure minimale d'un projet Zoho** :

| Champ Zoho | Source | Exemple |
|---|---|---|
| Nom du projet | CDC — titre | "Refonte neomnia.net" |
| Description | CDC — objectif (1ère ligne) + champs `key: value` | `type: webapp\nemail: client@company.com` |
| Statut | `open` | Créé en "open", fermé quand dispatch terminé |
| Milestones | Structure fixe Neomnia — 4 jalons standard (voir ci-dessous) | — |

**Convention description Zoho** (parsable par zoho-observer) :
```
type: webapp
email: client@company.com
domain: subdomain
domain_name: mon-projet
features: auth, dashboard, api
criteria: Auth fonctionnelle, Dashboard affiché, API répond
```

**Règle** : Leon NE met PAS toutes les sections du CDC dans la description Zoho. La description Zoho est un résumé structuré machine-readable. Le CDC complet reste dans Notion.

---

### Modèle de jalons Neomnia (structure fixe — toujours ces 4 jalons)

> **Règle** : tout projet client créé par Leon suit TOUJOURS cette structure à 4 jalons, dans cet ordre. Aucune variation. Les dates sont calculées à partir de `today` (J = date de création).

| # | Nom du jalon | Tasklists | DoD | Dates |
|---|---|---|---|---|
| 1 | `[MVP] Produit Opérationnel & Déploiement Scaleway` | Design & UI · Core Dev · Infra-Ops | Application en ligne sur Scaleway, écrans affichés, fonctionnalités de base opérationnelles | J → J+30 |
| 2 | `[RUN] Apprentissage & Suivi Technique` | Ingestion & RAG · Ajustement des Prompts · Suivi Technique | Application stable, entraînée sur les données réelles, mature | J+31 → J+60 |
| 3 | `[QA] Vérification de Production` | Recette finale (QA) · Contrôle de Sécurité & Coûts | Feu vert technique complet (Sign-off) — tests, sécurité API, coûts tokens validés | J+61 → J+75 |
| 4 | `[HANDOVER] Documentation, Formation & Livraison Finale` | Documentation · Formation · Clôture | Livraison finale signée, client autonome, bascule maintenance Zoho Books | J+76 → `acceptance_deadline` (ou J+90) |

**Description de chaque jalon (DoD dans la description Zoho) :**

```
Jalon 1 [MVP] :
  "DoD: L'application est en ligne sur Scaleway, les écrans s'affichent et les fonctionnalités de base répondent."

Jalon 2 [RUN] :
  "DoD: L'application est stable, entraînée et mature sur ses données réelles."

Jalon 3 [QA] :
  "DoD: Feu vert technique complet (Sign-off) — tests non-régression, sécurité API, coûts tokens validés."

Jalon 4 [HANDOVER] :
  "DoD: Livraison finale signée, client autonome, bascule maintenance Zoho Books."
```

**Rôles par jalon :**

| Jalon | Tasklist | Responsable principal |
|---|---|---|
| [MVP] | Design & UI | Aria (export Penpot) + Zephyr (UX) |
| [MVP] | Core Dev | Aria (frontend) + Nox (backend) |
| [MVP] | Infra-Ops | **Charlotte** (cluster Scaleway, premier déploiement) |
| [RUN] | Ingestion & RAG | Milo (pipeline data) |
| [RUN] | Ajustement des Prompts | Leon (optimisation agents applicatifs) |
| [RUN] | Suivi Technique | **Charlotte** (monitoring logs, détection dérive) |
| [QA] | Recette finale (QA) | Vera (tests non-régression) |
| [QA] | Contrôle de Sécurité & Coûts | **Charlotte** (audit clés API, budget tokens) |
| [HANDOVER] | Documentation | Charlotte (architecture) + Leon (guide utilisateur) |
| [HANDOVER] | Formation | Leon (programme formation client) |
| [HANDOVER] | Clôture | Leon (livraison + Zoho Books) |

---

### Cycle de vie complet — Artefacts par phase

```
PHASE 1 — INTAKE
  Entrée : brief libre (conversation OWU)
  Sortie : identification du type de projet

PHASE 2 — INTERVIEW / CLARIFYING
  Entrée : brief identifié
  Leon pose 1 question/tour — ordre défini par type de projet
  Sortie : tous les champs CDC collectés

PHASE 3 — RÉDACTION CDC
  Entrée : tous les champs collectés
  Leon analyse les gaps avec les normes Neomnia
  Leon rédige le CDC selon le template
  Leon écrit le CDC dans Notion (Python direct — pas de décision LLM sur l'outil)
  Sortie : page Notion mise à jour + confirmation utilisateur demandée

PHASE 4 — VALIDATION
  Entrée : CDC dans Notion
  Utilisateur lit et confirme ("ok", "validé", "parfait")
  Sortie : CDC au statut "Validé"

PHASE 5 — PROJECTSPEC + ZOHO
  Entrée : CDC validé
  Leon génère le ProjectSpec JSON à partir du CDC
  Leon crée le projet Zoho (ou met à jour si existant)
  Sortie : ProjectSpec + projet Zoho structuré

PHASE 6 — DISPATCH
  Entrée : ProjectSpec + confirmation utilisateur
  Leon appelle dispatch_project() vers Dispatcher
  Dispatcher orchestre Aria + Nox + Penpot + Domi + Vera
  Sortie : repos GitHub + Vercel deploy + Neon branch + design Penpot
```

---

### Règles de conduite — Entretien client

Ces règles s'appliquent en mode TASK (nouveau projet) et en mode REVIEW (enrichissement CDC) :

| Règle | Description |
|---|---|
| **1 question par tour** | Jamais deux questions dans le même message. L'utilisateur est saturé si on lui pose 3 questions d'un coup. |
| **Question directe** | "Quelle est la deadline ?" — pas "Pourriez-vous me préciser, si cela ne vous dérange pas, quel serait le délai envisagé ?" |
| **Pas d'hypothèses** | Si l'utilisateur dit "un site de vente", Leon ne suppose pas que c'est Shopify ou WooCommerce. Il demande. |
| **Proposer des valeurs par défaut** | Si l'utilisateur bloque sur un champ non-critique, proposer une valeur : "Stack : Next.js 15 App Router comme standard Neomnia — ça te convient ?" |
| **Pas de redondance** | Ne jamais reposer une question dont la réponse est déjà dans l'historique de la conversation. |
| **Confirmation avant dispatch** | Toujours demander validation du CDC avant de créer le projet Zoho ou de lancer le Dispatcher. |

---

### Indexation — Ce document dans Qdrant `leon-memory`

Ce fichier doit être indexé dans la collection Qdrant `leon-memory` (768 dims, `paraphrase-multilingual-mpnet-base-v2` via LiteLLM `nomic-embed-text`).

Leon interroge `leon-memory` via `qdrant_search_leon(query)` :
- En mode REVIEW : pour récupérer les normes Neomnia applicables à la place de `surfsense_search`
- En mode TASK : pour récupérer le template CDC et les questions du bon type de projet
- En mode `question` : pour répondre aux questions sur le process

Script d'indexation : `~/scripts/index_leon_process.py`
Collection : `leon-memory` — créer si absente (768 dims, cosine distance)

---

### Gaps — État au 2026-05-16

| Item | Statut | Notes |
|---|---|---|
| Template CDC Notion (Markdown → blocs natifs) | ✅ Code | `_md_to_notion_blocks()` deployé 2026-05-16 |
| Distinction CDC vs ProjectSpec vs Zoho dans le prompt | ✅ Doc | Ce fichier — à indexer dans `leon-memory` |
| Normes Neomnia dans le prompt REVIEW | ⚠️ SurfSense | À migrer vers `qdrant_search_leon("normes")` après indexation |
| Collection `leon-memory` Qdrant | ❌ À créer | Script `index_leon_process.py` |
| Indexation `CLAUDE-leon.md` + `CLAUDE-leon-process.md` | ❌ À faire | Après création collection |
| Polling Zoho `agent: leon` | ❌ À implémenter | Boucle C dans `leon.py` |
