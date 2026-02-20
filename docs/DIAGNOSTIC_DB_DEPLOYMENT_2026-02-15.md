# 🔍 Diagnostic — DB "reste dans la même configuration"

**Date** : 15 Février 2026
**Statut** : ✅ Corrigé
**Symptôme** : La base de données ne se mettait jamais à jour, que ce soit en mode destructif ou lors d'une mise à jour de schéma.

---

## 🩺 Causes identifiées

### Cause 1 — Architecture à deux couches dont une couche silencieusement inactive

Le système de déploiement DB repose sur **deux couches** :

| Couche | Outil | Environnement | Rôle |
|--------|-------|---------------|------|
| **A** | `scripts/migrate.ts` (HTTP port 443) | Vercel build | Applique les fichiers SQL de `drizzle/` |
| **B** | `drizzle-kit push` (TCP) | GitHub Actions `db-migrate.yml` | Synchronisation complète du schéma |

**Le problème** : la couche B nécessite les secrets GitHub `DATABASE_URL_UNPOOLED` et `DATABASE_URL` configurés dans **Settings → Secrets and variables → Actions**. Si ces secrets sont absents, le workflow CI échoue silencieusement et la couche B ne s'exécute jamais.

**Action requise (une seule fois)** :
```
GitHub → Settings → Secrets and variables → Actions → New repository secret
  DATABASE_URL          = postgresql://neondb_owner:...@ep-...-pooler...
  DATABASE_URL_UNPOOLED = postgresql://neondb_owner:...@ep-...direct...
```

---

### Cause 2 — `migrate.ts` ne peut pas mettre à jour des tables existantes

Le fichier `drizzle/0000_oval_iron_man.sql` contient `CREATE TABLE "companies"` (sans `IF NOT EXISTS`). Quand la table `companies` existe déjà en base (créée par l'ancien `drizzle-kit push`), le statement déclenche une erreur "already exists" qui est **tolérée et skippée** par `migrate.ts`.

**Conséquence** : si des colonnes ont été ajoutées au schéma après la création initiale de la table (ex : colonnes Stripe `stripe_customer_id`, `stripe_setup_intent_client_secret`, `stripe_default_payment_method`), elles ne sont **jamais ajoutées** à la table existante.

La migration est tout de même marquée comme "appliquée" dans `__drizzle_migrations`. Les déploiements suivants voient "No pending migrations" et ne font rien.

---

### Cause 3 — `db-ensure-columns.ts` non appelé par le build Vercel

Le script `scripts/db-ensure-columns.ts` est conçu pour ajouter les colonnes manquantes via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Cependant :

- Il était **uniquement appelé par GitHub Actions** (`db-migrate-safe.sh`)
- Il n'était **pas intégré** dans `build-with-db.sh` (Vercel)
- Il ne couvrait **pas les colonnes Stripe** (`companies.stripe_*`)

---

## ✅ Corrections appliquées

### 1. `scripts/db-ensure-columns.ts` — Ajout des colonnes Stripe

```typescript
// Colonnes ajoutées dans la liste REQUIRED_COLUMNS :
{ table: 'companies', column: 'stripe_customer_id', ... }
{ table: 'companies', column: 'stripe_setup_intent_client_secret', ... }
{ table: 'companies', column: 'stripe_default_payment_method', ... }
```

### 2. `scripts/build-with-db.sh` — Intégration de `db-ensure-columns.ts`

L'étape 2 (nouvelles) dans le build Vercel appelle maintenant `db-ensure-columns.ts` **avant** `migrate.ts` :

```
Étape 1/3 : Test de connectivité HTTP
Étape 2/3 : db-ensure-columns.ts  ← NOUVEAU
Étape 3/3 : migrate.ts (SQL migration files)
```

### 3. `docs/HOTFIX_PREVIEW_DB_RESET.md` — Correction documentation erronée

La note "Fév 2026" indiquait à tort que `drizzle-kit push` était utilisé sur Vercel. Corrigé.

---

## 🏗️ Architecture DB correcte (état après correction)

```
Développeur modifie db/schema.ts
        │
        ▼
pnpm db:generate     ← crée drizzle/000X_xxxx.sql
        │
        ▼
git push
        │
        ├─── Vercel Build (build-with-db.sh)
        │         ├─ db-ensure-columns.ts    (ALTER TABLE IF NOT EXISTS, HTTP)
        │         ├─ migrate.ts              (applique SQL files, HTTP port 443)
        │         └─ seeds                   (rôles, emails, pages)
        │
        └─── GitHub Actions (db-migrate.yml)
                  ├─ db-ensure-columns.ts    (colonnes critiques)
                  ├─ drizzle-kit push        (sync complète via TCP — source de vérité)
                  └─ seeds
```

**Source de vérité** : `db/schema.ts` → toujours.

---

## ⚠️ Action requise pour activer GitHub Actions

Sans les secrets configurés, seul le build Vercel (`migrate.ts`) fonctionne. Pour activer la couche GitHub Actions :

1. Aller sur `https://github.com/neosaastech/neosaas-website/settings/secrets/actions`
2. Créer les secrets :
   - `DATABASE_URL` = URL poolée Neon
   - `DATABASE_URL_UNPOOLED` = URL directe Neon (sans `-pooler`)
3. Trigger manuel : Actions → `db-migrate` → Run workflow

---

## 🔄 Comment faire une mise à jour de schéma (workflow correct)

```bash
# 1. Modifier db/schema.ts
# 2. Générer la migration SQL
pnpm db:generate

# 3. Vérifier le fichier généré dans drizzle/
# 4. Commiter et pousser
git add db/schema.ts drizzle/
git commit -m "feat: add column X to table Y"
git push
# → GitHub Actions applique drizzle-kit push (sync complète)
# → Vercel build applique migrate.ts (SQL file via HTTP)
```

## 🔄 Comment faire un reset destructif (DB vide → recréation)

```bash
# Option A : Via le script de reset
bash scripts/deployment/reset-database.sh

# Option B : Via Neon console
# 1. Neon Dashboard → Branch → Reset to empty
# 2. Trigger un nouveau déploiement Vercel (redeploy)
#    → migrate.ts crée toutes les tables depuis 0000_oval_iron_man.sql
#    → seeds s'exécutent

# Option C : GitHub Actions manuel
# Actions → db-migrate → Run workflow (force_push: true, run_seed: true)
```

---

**Corrigé par** : Claude Code
**Date** : 15 Février 2026
