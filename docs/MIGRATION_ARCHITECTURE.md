# Architecture des Migrations de Base de Données

**Dernière mise à jour :** 19 février 2026  
**Statut :** ✅ Référence unique — à lire avant tout changement de schéma

---

## 🗺️ Vue d'ensemble — Les 4 couches de protection

```
db/schema.ts (source de vérité unique)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 1 — Safety Net : scripts/db-ensure-columns.ts          │
│  CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS │
│  → Protège contre toute suppression accidentelle de table/colonne  │
│  → Exécuté EN PREMIER dans tous les pipelines                      │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 2 — SQL Migrations : scripts/migrate.ts                │
│  Applique les .sql depuis drizzle/ (journal _journal.json)      │
│  → Idempotent : tracke dans __drizzle_migrations               │
│  → Seul système autorisé à écrire dans __drizzle_migrations    │
│  → Commande : pnpm db:migrate                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼ (GitHub Actions uniquement — TCP disponible)
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 3 — Schema Push : drizzle-kit push                     │
│  Introspect db/schema.ts → génère + applique le DDL diff       │
│  → Corrige les écarts résiduels post-migrations                 │
│  → NON exécuté sur Vercel (port TCP bloqué)                    │
│  → Commande : pnpm db:push                                      │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUCHE 4 — Vérification : scripts/db-verify-schema.ts         │
│  Confirme que toutes les tables/colonnes critiques existent     │
│  → Échoue le build si quelque chose manque                      │
│  → Commande : pnpm db:verify                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Pipelines par contexte

### Vercel Build (`scripts/build-with-db.sh`)
> HTTP uniquement — port TCP bloqué par Vercel

| Étape | Script | Objectif |
|-------|--------|----------|
| 1 | `db-ensure-columns.ts` | Safety net tables + colonnes |
| 2 | `scripts/migrate.ts` | SQL migrations + mise à jour `__drizzle_migrations` |
| 3 | Seeds | Données de base, templates email, permissions |

### GitHub Actions (`.github/workflows/db-migrate.yml` → `scripts/db-migrate-safe.sh`)
> TCP disponible — pipeline complet

| Étape | Script | Objectif |
|-------|--------|----------|
| 1 | `db-ensure-columns.ts` | Safety net tables + colonnes |
| 2 | `scripts/migrate.ts` | SQL migrations + `__drizzle_migrations` |
| 3 | `drizzle-kit push` | Ferme les écarts résiduels (TCP) |
| 4 | `db-verify-schema.ts` | Vérifie colonnes/tables critiques |
| 5 | Seeds | `db:seed-base`, templates email, pages |

### Developer local
```bash
# Appliquer les migrations en attente :
pnpm db:migrate

# Synchronisation manuelle du schéma (si tu viens de modifier db/schema.ts) :
pnpm db:push

# Vérifier l'état :
pnpm db:verify

# Safety net manuel :
pnpm db:ensure
```

---

## 📁 Fichiers du pipeline

| Fichier | Rôle | Appel |
|---------|------|-------|
| `db/schema.ts` | **Source de vérité unique** — ne jamais modifier la DB sans passer par ici | Référence |
| `drizzle/meta/_journal.json` | Index des migrations (idx, tag, timestamp) | Auto (drizzle-kit generate) |
| `drizzle/000X_*.sql` | Fichiers SQL des migrations | Auto ou manuel |
| `scripts/migrate.ts` | Runner HTTP journal-based (**autorité unique** sur `__drizzle_migrations`) | `pnpm db:migrate` |
| `scripts/db-ensure-columns.ts` | Safety net — `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` | `pnpm db:ensure` |
| `scripts/db-verify-schema.ts` | Post-migration verification — échoue si colonnes/tables manquantes | `pnpm db:verify` |
| `scripts/build-with-db.sh` | Pipeline Vercel (HTTP only) | `pnpm build` |
| `scripts/db-migrate-safe.sh` | Pipeline GitHub Actions (TCP) | CI automatique |
| `db/migrate.ts` | ⛔ DÉPRÉCIÉ — ne pas utiliser (schéma incompatible) | — |

---

## ⚠️ Règles critiques

### 1. `__drizzle_migrations` — une seule source d'écriture
> **Seul `scripts/migrate.ts` doit écrire dans cette table.**

`db/migrate.ts` (Drizzle ORM migrator) utilise un schéma incompatible (`id TEXT, hash TEXT, created_at BIGINT`) contre (`id SERIAL, tag TEXT, idx INT, applied_at TIMESTAMPTZ`). Ce fichier est **déprécié** et ne doit jamais être exécuté.

### 2. Ajouter une migration
```bash
# 1. Modifier db/schema.ts
# 2. Générer le fichier SQL :
pnpm db:generate  # crée drizzle/000X_tag.sql + met à jour _journal.json
# 3. Pusher le commit → GitHub Actions applique automatiquement
```

### 3. Ajouter une nouvelle table
En plus de `pnpm db:generate`, **ajouter l'entrée `REQUIRED_TABLES`** dans `scripts/db-ensure-columns.ts` avec un `CREATE TABLE IF NOT EXISTS` complet. Cela protège contre les resets accidentels.

### 4. `drizzle-kit push` vs `scripts/migrate.ts`
| | `scripts/migrate.ts` | `drizzle-kit push` |
|---|---|---|
| Trace | Oui (`__drizzle_migrations`) | Non |
| Déstructif | Non | Peut l'être |
| TCP requis | Non (HTTP Neon) | Oui |
| Vercel | ✅ | ❌ |
| GH Actions | ✅ | ✅ |
| Recommandé | **Principal** | Complément |

---

## 🔍 État de la DB en production

### Migrations appliquées (19 fév. 2026)

| idx | tag | Applied at |
|-----|-----|------------|
| 0 | `0000_oval_iron_man` | 2026-02-16 17:25 UTC |
| 1 | `0001_stripe_product_sync` | 2026-02-18 16:19 UTC |
| 2 | `0002_stripe_unification` | 2026-02-18 17:11 UTC |

### Tables principales

| Table | Colonnes clés | Créée par |
|-------|--------------|-----------|
| `companies` | `stripe_customer_id`, `stripe_setup_intent_client_secret`, `stripe_default_payment_method` | migration 0000 |
| `payment_methods` | tous les champs carte + FK `company_id` | migration 0000 + safety net |
| `subscriptions` | `stripe_subscription_id`, `stripe_price_id`, `current_period_*`, `cancel_at_period_end` | migration 0002 |
| `appointments` | `stripe_payment_intent_id` | migration 0002 |
| `products` | `stripe_product_id`, `stripe_price_*`, `payment_type` | migration 0001 |

---

## 🛡️ Safety Net détaillé (`db-ensure-columns.ts`)

Le script garantit l'existence de :

**Tables** (`REQUIRED_TABLES`) :
- `payment_methods` — recréée si absente (évite le crash Drizzle `TypeError: Cannot convert undefined or null to object`)

**Colonnes** (`REQUIRED_COLUMNS`) :
- `companies` : `stripe_customer_id`, `stripe_setup_intent_client_secret`, `stripe_default_payment_method`
- `products` : `payment_type`, `stripe_product_id`, `stripe_price_*`, `subscription_price_*`
- `appointments` : `stripe_payment_intent_id`
- `subscriptions` : `stripe_subscription_id`, `stripe_price_id`, `current_period_*`, `cancel_at_period_end`
- `order_items` : `product_id`

---

## 📅 Changelog

### [19 février 2026] — Document créé, audit doublons
- **[AUDIT]** Identification des doublons : `db/migrate.ts` (Drizzle ORM migrator) conflite avec `scripts/migrate.ts` (custom runner) sur `__drizzle_migrations`
- **[FIX]** `db/migrate.ts` déprécié (marqué comme stub vide avec avertissement)
- **[FIX]** `scripts/db-migrate-safe.sh` (GH Actions) corrigé : ajout de l'étape `pnpm db:migrate` (étape 2) pour mettre à jour `__drizzle_migrations` — sans cette étape, Vercel re-tentait toutes les migrations
- **[FEAT]** `scripts/db-verify-schema.ts` : ajout de la table `payment_methods` dans les vérifications
- **[FEAT]** `scripts/db-ensure-columns.ts` : section `REQUIRED_TABLES` ajoutée pour `payment_methods`
- **Fichiers modifiés** : `db/migrate.ts`, `scripts/db-migrate-safe.sh`, `scripts/db-verify-schema.ts`, `scripts/db-ensure-columns.ts`
