# 🚀 Guide de Déploiement - NeoSaaS

## Architecture de branches

```
dev      → Développement (auto-deploy sur Vercel Preview)
preview  → Pré-production (auto-deploy sur Vercel Preview)
main     → Production (auto-deploy sur Vercel Production)
```

## Variables d'environnement

### Obligatoires pour tous les environnements

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Secret pour JWT + Cryptage (min 32 chars) | `bGpraDUyNDk4Nzk4Nzk4Nzk4Nw==` |
| `NEXTAUTH_URL` | URL de l'application | `https://app.neosaas.com` |
| `DATABASE_URL` | PostgreSQL Neon | `postgresql://user:pass@host/db` |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app (utilisée par Stripe) | `https://app.neosaas.com` |

### Variables Stripe (gérées via Admin > API Management)

Les clés Stripe sont stockées chiffrées en base de données et gérées via l'interface Admin.
Elles peuvent aussi être définies comme variables d'environnement en fallback :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (fallback) | `sk_live_...` ou `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe (fallback) | `pk_live_...` ou `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature webhook | `whsec_...` |

> **Note** : Lago a été supprimé. Les variables `LAGO_API_KEY`, `LAGO_API_URL` ne sont plus utilisées.

### Configuration Vercel

1. **Settings** → **Environment Variables**
2. Ajouter les variables ci-dessus pour :
   - ✅ Production
   - ✅ Preview
   - ✅ Development

## Workflow de déploiement

### 1. Développement local

```bash
# Installer les dépendances
pnpm install

# Lancer en mode développement
npm run dev

# Initialiser les templates d'emails
npx tsx scripts/seed-email-templates.ts

# Initialiser les permissions de pages
npx tsx scripts/sync-pages.ts

# Tester le cryptage
npx tsx scripts/test-api-encryption.ts

# Tester l'API
bash scripts/test-api-flow.sh

### 2. Déploiement Automatisé (Vercel)

Le processus de déploiement sur Vercel est entièrement automatisé via le script `scripts/build-with-db.sh`. Ce script orchestre l'exécution de toutes les fonctions nécessaires à la mise en production :

1.  **Vérification de l'environnement** : Détection du mode Vercel et des variables DB.
2.  **Synchronisation Base de Données** : Applique les migrations SQL via `scripts/migrate.ts` (driver Neon HTTP, port 443). Requiert `DATABASE_URL`. En environnement preview sans `DATABASE_URL`, les migrations sont ignorées silencieusement (non bloquant).
3.  **Configuration des Emails** (`pnpm seed:email-templates`) :
    *   Injection/Mise à jour des templates d'emails transactionnels (SendGrid/Scaleway).
4.  **Synchronisation des Permissions** (`pnpm seed:pages`) :
    *   Scan des routes de l'application.
    *   Mise à jour des permissions et rôles en base.
5.  **Build Next.js** : Compilation de l'application frontend/backend.

> **Note** : Les migrations ne s'exécutent que si `DATABASE_URL` est définie. En preview sans cette variable, le build continue sans mise à jour de schéma (non bloquant).

### Stack de dépendances DB (2026)

| Composant | Package | Variable |
|-----------|---------|----------|
| Driver DB | `@neondatabase/serverless` | `DATABASE_URL` |
| ORM | `drizzle-orm` | — |
| Migrations | `drizzle-kit` | `DATABASE_URL_UNPOOLED` |
| Hébergement | Vercel + Neon | — |

> `@vercel/postgres` n'est **pas** utilisé. Il est neutralisé via l'override pnpm dans `package.json` pour éviter les warnings de dépréciation au build.

### Scripts Utiles

- `scripts/setup-vercel-env.sh` : Configure automatiquement les variables d'environnement sur Vercel (Production, Preview, Development) à partir de votre fichier `.env`.
- `scripts/vercel-api-setup.sh` : Configure spécifiquement les clés API (CRON_SECRET, API_KEY) sur Vercel.
- `scripts/check-email-config.ts` : Vérifie la configuration des emails transactionnels.

```

### 2. Intégration dans le processus de déploiement (CI/CD)

Chaque script ou exécutable critique pour le fonctionnement de l'application doit être intégré dans le processus de déploiement automatisé.
Le point d'entrée de ce processus est le script `scripts/build-with-db.sh`, déclaré dans `vercel.json` via `"buildCommand": "bash scripts/build-with-db.sh"`.

> **⚠️ CRITIQUE** : Sans `buildCommand` dans `vercel.json`, Vercel peut exécuter `next build` directement, en bypassant la mise à jour du schéma.

Actuellement, les scripts suivants sont exécutés automatiquement :

1.  **Mise à jour de la BDD** (si `DATABASE_URL` définie) :
    *   Test de connectivité HTTP (port 443, compatible Vercel)
    *   `scripts/db-ensure-columns.ts` : Garantit les colonnes critiques
    *   `scripts/migrate.ts` : Applique les migrations SQL via Neon HTTP driver
2.  **Templates d'emails** (`pnpm seed:email-templates`) :
    *   `scripts/seed-email-templates.ts` : Initialise les modèles d'emails dans la BDD.
3.  **Permissions des pages** (`pnpm seed:pages`) :
    *   `scripts/sync-pages.ts` : Synchronise les permissions d'accès aux pages.
4.  **Configuration Email (Preview/Dev)** :
    *   `scripts/fix-email-provider-defaults.ts` : Ajuste la configuration pour les environnements de test.

**⚠️ Important :** Si vous ajoutez un nouveau script qui doit être exécuté lors du déploiement (ex: migration de données, seeding spécifique), vous **devez** l'ajouter dans `scripts/build-with-db.sh`.

**📚 Changements de Schéma Importants :**
- **Système de Types de Produits** (Jan 2026) : Nouvelle table `product_leads` + refonte du champ `products.type`. Voir [PRODUCTS_TYPE_SYSTEM.md](./PRODUCTS_TYPE_SYSTEM.md) pour les détails.
- **Migration Lago → Stripe** (Fév 2026) : Suppression de Lago. Schéma `subscriptions` refactorisé (`stripeSubscriptionId`, `stripePriceId`, `currentPeriodStart/End`, `cancelAtPeriodEnd`). Champ `appointments.stripePaymentIntentId` remplace les anciens champs Lago. Voir la section [Migration Stripe](#migration-stripe) ci-dessous.

### 3. Push vers `dev`

```bash
git checkout dev
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin dev
```

→ Déploiement automatique sur **Vercel Preview**

### 3. Merge vers `preview`

```bash
git checkout preview
git merge dev
git push origin preview
```

→ Déploiement automatique sur **Vercel Preview** (URL stable)

### 4. Merge vers `main` (Production)

```bash
# Après validation sur preview
git checkout main
git merge preview
git push origin main
```

→ Déploiement automatique sur **Vercel Production**

## Checklist pré-déploiement

- [ ] Variables d'environnement configurées sur Vercel
- [ ] Tests locaux passent (`npm run test` si configuré)
- [ ] Build local réussit (`npm run build`)
- [ ] Migrations de base de données appliquées (`npm run db:push` ou `drizzle-kit migrate`)
- [ ] Pas d'erreurs TypeScript (`npx tsc --noEmit`)

## Mises à jour de la Base de Données

Lors de l'ajout de nouveaux composants nécessitant des changements de schéma (ex: système d'emails, logs, etc.), il est impératif de mettre à jour la base de données.

### Méthode unique : drizzle-kit push (via schema.ts)

**Source de vérité** : `db/schema.ts`

```bash
# En local
npm run db:push

# En production (automatique via build-with-db.sh)
# drizzle-kit push --force --verbose est exécuté à chaque déploiement Vercel
```

> **Important** : Ne jamais modifier la base manuellement via SQL.
> Toujours passer par `db/schema.ts` + `drizzle-kit push`.

### Initialisation des données
Après une mise à jour du schéma, pensez à réinitialiser les données de référence :

```bash
# Templates d'emails
npx tsx scripts/seed-email-templates.ts

# Permissions
npx tsx scripts/sync-pages.ts
```

## Migration Stripe

> **Applicable lors du premier déploiement post-migration Lago → Stripe (Fév 2026)**

### 1. Appliquer le schéma Drizzle

Le schéma a été mis à jour dans `db/schema.ts`. La migration SQL est générée dans `drizzle/0000_oval_iron_man.sql`.

Le script `scripts/build-with-db.sh` exécute `drizzle-kit push --force` automatiquement à chaque déploiement Vercel.

En cas de besoin manuel (avec accès à la DB) :
```bash
# Générer le SQL de migration (sans appliquer)
pnpm drizzle-kit generate

# Appliquer directement (nécessite DATABASE_URL valide)
pnpm db:push
```

### 2. Configurer le webhook Stripe

Voir la documentation complète : [docs/STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md)

```
URL du webhook : https://<votre-domaine>/api/stripe/webhook
```

Événements requis :
- `payment_intent.succeeded` / `payment_intent.payment_failed`
- `customer.subscription.created` / `updated` / `deleted`
- `invoice.paid` / `invoice.payment_failed`
- `checkout.session.completed`

### 3. Migrer les données clients Lago → Stripe (one-time)

```bash
# Dry-run (inspecter sans modifier)
pnpm tsx scripts/migrate-lago-to-stripe.ts

# Appliquer la migration
pnpm tsx scripts/migrate-lago-to-stripe.ts --no-dry-run
```

Génère un rapport JSON + SQL de rollback dans `scripts/`.

### 4. Créer les produits/prix Stripe

```bash
pnpm tsx scripts/seed-stripe-products.ts
```

Crée les produits et prix récurrents dans Stripe à partir des produits en base.
Génère un mapping JSON `scripts/stripe-price-map-<timestamp>.json`.

### 5. Valider le tunnel d'achat (E2E)

```bash
# Nécessite STRIPE_SECRET_KEY=sk_test_... dans .env.local
pnpm tsx scripts/test-stripe-e2e.ts
```

Exécute 15 tests sandbox : credentials, customer, payment methods, PaymentIntent, Checkout Session, Subscription, Invoices, Webhook.

### Checklist post-migration

- [ ] Webhook Stripe configuré dans le Dashboard Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté dans Vercel env vars
- [ ] Script de migration données exécuté (`--no-dry-run`)
- [ ] Seeder de prix Stripe exécuté
- [ ] Tests E2E passent (`test-stripe-e2e.ts`)
- [ ] Page Admin > Paiements affiche "Stripe connecté ✅"

## Monitoring

### Vérifier le déploiement

1. **Vercel Dashboard** → Deployments
2. Vérifier les logs de build
3. Tester l'URL de déploiement
4. Vérifier que l'authentification fonctionne

### Rollback si nécessaire

1. Vercel Dashboard → Deployments
2. Cliquer sur un déploiement précédent
3. **Promote to Production**

## Troubleshooting

### Erreur : "NEXTAUTH_SECRET is required"

**Cause** : Variable d'environnement manquante
**Solution** :
1. Vercel → Settings → Environment Variables
2. Ajouter `NEXTAUTH_SECRET` pour tous les environnements
3. Redéployer

### Erreur : "relation does not exist" ou "column does not exist"

**Cause** : Schéma de base de données pas à jour
**Solution** :
1. Vérifier que `vercel.json` contient `"buildCommand": "bash scripts/build-with-db.sh"`
2. Vérifier que `db/schema.ts` contient les tables/colonnes attendues
3. Redéployer (le script exécute `drizzle-kit push --force` automatiquement)
4. Si urgence : lancer `npm run db:push` localement avec la bonne DATABASE_URL

### Erreur : Cryptage échoue

**Cause** : `NEXTAUTH_SECRET` trop court (<32 caractères)
**Solution** : Générer une nouvelle clé :
```bash
openssl rand -base64 32
```

## Support

Pour toute question :
- GitHub Issues : [neosaastech/neosaas-website](https://github.com/neosaastech/neosaas-website)
- Documentation : `/docs`
