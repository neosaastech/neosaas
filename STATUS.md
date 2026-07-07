# 📊 État du Projet NeoSaaS

**Dernière mise à jour**: 22 janvier 2026
**Branche principale**: main
**Branche courante**: conn
**Version**: 1.0.1

---

## 🚨 Corrections Récentes

### Release Docker Prod — préparation v1.0.3 (7 juillet 2026)

**Contexte** : préparation d'un paquet de déploiement production conteneurisé avant push vers le dépôt cible `neosaastech/neosaas`.

**Changements** :

- ✅ **Docker multi-stage prod** : ajout de `Dockerfile` (deps/builder/runner) pour build Next.js puis exécution en mode production.
- ✅ **Contexte Docker propre** : ajout de `.dockerignore` pour exclure artefacts locaux (`.git`, `node_modules`, `.next`, etc.).
- ✅ **Orchestration prod** : ajout de `docker-compose.prod.yml` avec variables d'environnement runtime (DB, auth, Stripe).
- ✅ **Versioning release** : bump applicatif `1.0.2` → `1.0.3`.

**Fichiers modifiés** :

- `Dockerfile`
- `.dockerignore`
- `docker-compose.prod.yml`
- `package.json`
- `STATUS.md`
- `docs/PROJECT.md`

**Impact** : base prête pour build/push image Docker et déploiement production versionné.

### Fix Build/Déploiement — séparation client/serveur des variables template (7 juillet 2026)

**Contexte** : le build Next.js échouait avec des erreurs `next/headers` et `pg` (`dns/fs/net`) chargés côté client via la chaîne d'import des variables template.

**Changements** :

- ✅ **Import client sécurisé** : `components/admin/content/template-variables-hint.tsx` importe désormais le catalogue depuis `lib/pages/template-variables-core.ts` (module sans dépendances serveur).
- ✅ **Stabilisation Turbopack** : `next.config.mjs` définit explicitement `turbopack.root` pour éviter l'inférence de racine sur un lockfile parent.
- ✅ **Registry client-safe pour l'éditeur de blocs** : les composants admin client (`BlockEditor`/`BlockPreview`) utilisent `lib/layers/registry-client.ts`, ce qui évite de charger le bloc `blog-list` (dépendant DB) dans le bundle navigateur.
- ✅ **Paiements dashboard client-safe** : `components/dashboard/stripe-card-form.tsx` n'importe plus `lib/stripe` côté client; il utilise `createStripeSetupIntent` (server action) qui renvoie déjà `clientSecret` + `publishableKey`.

**Fichiers modifiés** :

- `components/admin/content/template-variables-hint.tsx`
- `components/admin/content/block-editor.tsx`
- `components/admin/content/block-preview.tsx`
- `lib/layers/registry-client.ts`
- `components/dashboard/stripe-card-form.tsx`
- `next.config.mjs`
- `STATUS.md`
- `docs/PROJECT.md`

**Impact** : suppression du couplage client → auth/db sur ce flux, ce qui débloque le build sur cette erreur de déploiement.

### Dépendances — Mise à jour mineure de compatibilité outils (7 juillet 2026)

**Contexte** : besoin d'appliquer uniquement les mises à jour mineures/patch pour améliorer la compatibilité sans introduire de ruptures majeures.

**Changements** :

- ✅ **Upgrade mineur/patch appliqué** sur les dépendances front et runtime (Radix UI, React 19.2.x, Stripe SDK mineur, PG, Tailwind merge, etc.).
- ✅ **Upgrade mineur/patch appliqué** sur les dépendances dev (`@types/node`, `@types/pg`, `@types/react`, `drizzle-kit`, `postcss`, `tailwindcss`, `tsx`).
- ⚠️ **Majors volontairement exclues** (ex: Tailwind 4, TypeScript 6, Zod 4, Stripe 22) pour éviter les régressions.

**Fichiers modifiés** :

- `package.json`
- `docs/PROJECT.md`
- `STATUS.md`

**Impact** : meilleure stabilité des dépendances dans la même major, avec un risque de régression réduit pour les outils du projet.

---

### README — Versioning auto + logo + vidéo FR (23 mars 2026)

**Contexte** : Les changements de release n'étaient pas suffisamment visibles. Besoin d'une distinction claire dans `README.md` avec branding et ressource vidéo.

**Changements** :

- ✅ **Logo ajouté** : intégration du logo NeoSaaS depuis `https://avatars.githubusercontent.com/u/215877912?s=48&v=4` en tête du README.
- ✅ **Versioning automatique documenté** : nouvelle section dédiée au workflow GitHub release (`.github/workflows/release.yml`) et aux commandes locales associées.
- ✅ **Vidéo et chaîne FR ajoutées** : intégration du lien YouTube d'explication dans une section dédiée.
- ✅ **Lien status corrigé** : mise à jour du lien `Project status` vers `./STATUS.md`.

**Fichiers modifiés** :

- `README.md`
- `STATUS.md`

**Impact** : La stratégie de release automatique est immédiatement visible depuis la page d'accueil du repository, avec accès direct à la vidéo d'explication en français.

---

### Release GitHub Actions — Workflow officiel (23 mars 2026)

**Contexte** : La configuration de release devait être centralisée dans `.github/workflows` plutôt que dépendre uniquement de commandes locales.

**Changements** :

- ✅ **Nouveau workflow release** : ajout de `.github/workflows/release.yml` avec déclenchement manuel (`workflow_dispatch`) et choix du bump (`patch|minor|major`).
- ✅ **Automatisation complète** : bump de version, commit, tag Git (`vX.Y.Z`), puis création de GitHub Release avec notes auto-générées.
- ✅ **Documentation mise à jour** : section `Release Automation` ajoutée dans `docs/PROJECT.md`.

**Fichiers modifiés** :

- `.github/workflows/release.yml`
- `docs/PROJECT.md`
- `STATUS.md`

**Impact** : Le flux officiel de release est désormais exécutable depuis GitHub Actions, traçable et standardisé pour toute l'équipe.

---

### Versioning automatique — Passage à 1.0.1 (23 mars 2026)

**Contexte** : Le projet avait des références en `1.0.0` dans la documentation mais `package.json` était encore en `0.1.0`. Besoin d'un workflow simple pour générer automatiquement la prochaine version.

**Changements** :
- ✅ **Version applicative alignée** : `package.json` passe de `0.1.0` à `1.0.1`.
- ✅ **Scripts de bump automatique ajoutés** : `version:patch`, `version:minor`, `version:major`, `release:auto`.
- ✅ **Documentation des scripts** : section `Available Scripts` mise à jour dans `docs/PROJECT.md`.

**Fichiers modifiés** :
- `package.json`
- `docs/PROJECT.md`
- `STATUS.md`

**Impact** : La prochaine version peut maintenant être générée automatiquement avec `pnpm release:auto` (bump patch) ou via les commandes semver dédiées.

---

### Admin Recent Orders — Traduction EN + PDF Factures + Gestion Abonnements (25 mars 2026)

**Contexte** : L'onglet "Recent Orders" du Business Dashboard admin avait du contenu en français, aucun accès aux PDFs de factures Stripe, et aucun outil pour piloter les abonnements côté admin.

**Changements** :
- ✅ **FR→EN dans `invoices-table.tsx`** : Tous les labels, boutons, titres de dialogs, messages toast et confirmations traduits en anglais.
- ✅ **PDF factures** : 3 colonnes ajoutées à la table `orders` (`stripe_invoice_id`, `invoice_pdf`, `hosted_invoice_url`). Boutons "Download PDF" et "View Invoice" dans les dialogs factures. Webhook `invoice.paid` stocke désormais ces URLs. `getAllInvoices()` expose ces champs avec un join `users`.
- ✅ **Gestion admin abonnements** : 5 nouvelles server actions dans `admin-dashboard.ts` (`adminGetAllSubscriptions`, `adminGetCompanySubscriptions`, `adminCancelSubscription`, `adminResumeSubscription`, `adminPauseSubscription`, `adminUnpauseSubscription`). Nouveau composant `AdminSubscriptions` affiché dans l'onglet Recent Orders.

**Fichiers modifiés** :
- `components/admin/invoices-table.tsx`
- `components/admin/admin-subscriptions.tsx` (nouveau)
- `app/(private)/admin/page.tsx`
- `app/actions/admin-dashboard.ts`
- `lib/data/invoices.ts`
- `app/api/stripe/webhook/route.ts`
- `db/schema.ts`
- `scripts/db-ensure-columns.ts`

**Impact** : L'admin peut télécharger les PDFs directement depuis le tableau des factures, et gérer en temps réel les abonnements clients (pause, annulation, restauration) sans quitter le dashboard.

---

### Fix Tunnel Appointment — Migration Lago résiduelle + Paiement Stripe + Email (20 février 2026)

**Contexte** : Le tunnel d'achat pour les produits de type `appointment` échouait en runtime à cause d'une référence orpheline à `lagoConfig` jamais définie. De plus, le statut de paiement des rendez-vous n'était pas mis à jour après encaissement Stripe, et aucun email de confirmation spécifique n'était envoyé.

**Bugs critiques corrigés** (tous dans `app/actions/ecommerce.ts`) :
- ✅ **Bug #1 BLOQUANT — `lagoConfig` ReferenceError** : `devMode: lagoConfig.mode === 'dev'` dans les `metadata` de l'appointment causait un `ReferenceError` fatal à runtime (import Lago absent depuis le 16/02/2026). **Fix** : ligne supprimée.
- ✅ **Bug #2 — Logique `isPaid` incorrecte** : `const isPaid = (item.product.hourlyRate || 0) > 0` ignorait le champ `price`. Les appointments avec `price > 0` et `hourlyRate = 0` étaient traités comme gratuits. **Fix** : `const price = item.product.price || item.product.hourlyRate || 0; const isPaid = price > 0`.
- ✅ **Bug #3 — Appointment jamais marqué payé post-Stripe** : L'appointment était inséré avec `isPaid: false, paymentStatus: 'pending'` même quand Stripe avait déjà encaissé le paiement (step 6b). **Fix** : après `db.insert(appointments)`, si `paymentResult.status === 'paid'`, mise à jour avec `isPaid: true, paymentStatus: 'paid', status: 'confirmed', paidAt: new Date(), stripePaymentIntentId`.
- ✅ **Bug #4 — Email appointment générique** : Absence de branche `appointment` dans step 8 (emails de confirmation). Le template générique `order_confirmation` était envoyé sans détails RDV. **Fix** : ajout d'une branche `else if (hasAppointmentItems)` avec sujet et items incluant la date/heure formatée du rendez-vous.

**Note** : Le couponCode était déjà correctement transmis dans `handleAppointmentBooked` (checkout/page.tsx). Aucune correction nécessaire.

**Fichiers modifiés** :
- `app/actions/ecommerce.ts` — Bugs #1 à #4 corrigés (step 7b + step 8)

**Impact** : Le tunnel appointment est désormais entièrement fonctionnel — paiement Stripe encaissé, rendez-vous confirmé en DB, email transactionnel avec date/heure envoyé.

---

### Audit Doublons Système Paiement — Corrections Critiques (20 février 2026)

**Contexte** : Audit complet du système de paiement/facturation pour détecter les doublons et incohérences entre la BDD et le code.

**Bugs critiques corrigés** :
- ✅ **Bug duplication orders via webhook** (`app/api/stripe/webhook/route.ts`) : Le handler `invoice.paid` cherchait l'order par `orderNumber = invoice.id`, alors que `processCheckout` crée l'order avec un nanoid et stocke l'`invoiceId` dans `paymentIntentId`. Résultat : un 2ème order dupliqué était créé à chaque paiement par invoice. **Fix** : le webhook cherche maintenant en priorité par `paymentIntentId = invoice.id` (via `or()`), et n'insère un nouvel enregistrement que si aucun order pré-existant n'est trouvé.
- ✅ **`companiesRelations` incomplète** (`db/schema.ts`) : `subscriptions: many(subscriptions)` était absent — les requêtes relationnelles Drizzle `companies → subscriptions` échouaient silencieusement. **Fix** : relation ajoutée.
- ✅ **`subscriptionsRelations` manquante** (`db/schema.ts`) : Aucune relation inverse `subscription → company` n'était définie. **Fix** : `subscriptionsRelations` créée avec `company: one(companies, { fields: [customerId] })`.
- ⚠️ **`createStripePayment` dépréciée** (`app/actions/stripe-payments.ts`) : Ancienne fonction PaymentIntent direct (sans invoice), orpheline depuis le 16 fév. 2026. Marquée `@deprecated` avec redirection vers `createStripeInvoicePayment`.

**Fichiers modifiés** :
- `app/api/stripe/webhook/route.ts` — handler `invoice.paid` + import `or`
- `db/schema.ts` — `companiesRelations` + `subscriptionsRelations`
- `app/actions/stripe-payments.ts` — JSDoc `@deprecated` sur `createStripePayment`

---

### Facturation Stripe Invoice + Gestion Abonnements Dashboard (20 février 2026)

**Problème** : Le paiement se réalisait en base de données mais aucune facture n'apparaissait dans Stripe. `createStripePayment` créait un bare PaymentIntent sans invoice.

**Corrections appliquées** :
- ✅ **Nouveau `createStripeInvoicePayment`** (`app/actions/payments.ts`) : Flux complet `InvoiceItems → Invoice → finalize → pay` qui génère une vraie facture Stripe avec PDF téléchargeable
- ✅ **`processCheckout` mis à jour** (`app/actions/ecommerce.ts`) : Remplace `createStripePayment` par `createStripeInvoicePayment` pour les achats one-time
- ✅ **Persistance abonnements** (`app/actions/ecommerce.ts`) : Après `createStripeSubscription`, insertion dans la table `subscriptions` (`customerId = company.id`)
- ✅ **Gestion abonnements** (`app/actions/payments.ts`) : `getCompanySubscriptions`, `cancelSubscription`, `resumeSubscription`, `pauseSubscription`, `unpauseSubscription`
- ✅ **Dashboard payments refactorisé** (`app/(private)/dashboard/payments/page.tsx`) : Section abonnements actifs avec menu pause/résiliation/reprise, tableau factures avec PDF download, badges statuts colorés

**Fichiers modifiés** :
- `app/actions/payments.ts` — 6 nouvelles fonctions + update `createStripeSubscription`
- `app/actions/ecommerce.ts` — import schema, persistance subscription, invoice payment
- `app/(private)/dashboard/payments/page.tsx` — refonte complète

---

### Fix Sync Stripe one_time — Idempotency & Bugs Corrigés (branche `products-synchro`)

**Symptôme** : Les produits `subscription` se synchronisaient vers Stripe, mais pas les produits `one_time`.

**Causes identifiées et corrigées** :
- ✅ **Bug idempotency one_time** (`lib/stripe-products.ts`) : Le chemin `one_time` ne cherchait pas les Prices Stripe existantes avant d'en créer une nouvelle (contrairement au chemin `subscription`). En cas de re-sync après une erreur, Stripe rejetait la création en doublon → erreur silencieusement avalée par le `.catch()`. **Fix** : ajout d'une recherche idempotente `/prices?product=...&type=one_time` avant toute création.
- ✅ **Type invalide `'standard'`** (`app/actions/ecommerce.ts`) : Dans le chemin CREATE de `upsertProduct`, le fallback `type: data.type || 'standard'` stockait `'standard'` (type invalide — valeurs attendues: `'physical'|'digital'|'appointment'`). **Fix** : `type: data.type || 'physical'`.
- ✅ **GET /api/admin/stripe/sync-products** : L'endpoint ne sélectionnait pas `stripePriceOneTime` — les produits one_time apparaissaient faussement comme "synced". **Fix** : ajout de `stripePriceOneTime` + logique de vérification différenciée (`syncNote: 'missing_one_time_price' | 'ok'`).

**Fichiers modifiés** :
- `lib/stripe-products.ts` — bloc `if (needNewPrice)` de la branche one_time
- `app/actions/ecommerce.ts` — fallback `type` en création
- `app/api/admin/stripe/sync-products/route.ts` — GET select + logique `synced`

**Pour forcer la re-sync de tous les produits existants** :
```bash
curl -X POST https://[votre-domaine]/api/admin/stripe/sync-products \
  -H "Cookie: [session]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### Unification Stripe & Nettoyage Lago (18 février 2026)

**Arrêt des erreurs de production — branches `products-synchro`** :
- ✅ **Patch DB live** : `appointments.stripe_payment_intent_id` + 5 colonnes Stripe sur `subscriptions` appliquées directement sur Neon (6/6 OK)
- ✅ **Migration 0002** : `drizzle/0002_stripe_unification.sql` — ajoute colonnes Stripe, supprime colonnes Lago (`lago_invoice_id`, `lago_transaction_id`, `lago_id`, `plan_code`) sur 3 tables
- ✅ **db-ensure-columns.ts** : couverture ajoutée pour `appointments` + `subscriptions` — toutes les tables critiques désormais protégées
- ✅ **db-schema-sync-http.ts** : refonte complète — colonnes Lago remplacées par Stripe (`companies`, `subscriptions`, `appointments`)
- ✅ **db-verify-schema.ts** : vérifications étendues à `appointments`, `subscriptions`, `companies`
- ✅ **Bug fix** : `lib/notifications/appointment-notifications.ts` — `users.role` (colonne inexistante) remplacé par jointure correcte via `user_roles`/`roles`
- ✅ **Audit complet** : 4 tables vérifiées 100% conformes au `schema.ts` (appointments 34, subscriptions 12, companies 16, products 41 colonnes)
- 🎯 **Erreurs stoppées** : `NeonDbError: column appointments.stripe_payment_intent_id does not exist` + `TypeError: Cannot convert undefined or null to object at Function.entries`

---

### i18n Cleanup - Full English Frontend (22 janvier 2026)

**Modification système**: Frontend 100% en anglais
- ✅ Fichiers modifiés: `app/(private)/admin/api/page.tsx`
- ✅ Suppression de tous les textes français (labels, messages, console logs)
- ✅ Configuration Scaleway, OAuth GitHub, et API GitHub traduits
- 🎯 Impact: Interface cohérente en anglais pour tous les utilisateurs
- ✅ Meilleure compatibilité internationale
- 📝 Note: Le projet est officiellement English-only

---

### UX Improvements - Settings Page & API Manager (22 janvier 2026)

**Amélioration UX - Page Settings**:
- ✅ TabsList en full-width avec `grid-cols-4`
- ✅ Meilleure distribution visuelle des onglets
- ✅ Navigation plus claire et professionnelle

**Amélioration UX - API Manager GitHub**:
- ✅ Configuration GitHub organisée en 2 sections Collapsible:
  - 🔵 OAuth (User Authentication) - Pour la connexion utilisateur
  - 🟣 API (Server Integration) - Pour l'intégration serveur (à venir)
- ✅ URL de callback dynamique et facilement copiable
- ✅ Bouton de copie avec feedback visuel (toast notification)
- ✅ Test automatique de configuration OAuth
- ✅ Validation du format Client ID (Iv1.* ou Ov2.*)
- ✅ Interface plus intuitive avec guides pas-à-pas
- 🎯 Impact: Configuration 3x plus rapide, moins d'erreurs

---

### Configuration Reset Automatique Base de Données (22 janvier 2026)

**Modification système**: Réinitialisation automatique de la base à chaque déploiement
- ✅ Script modifié: `scripts/build-with-db.sh`
- ✅ Comportement: Reset automatique sans variable d'environnement
- ✅ Commande exécutée: `pnpm db:hard-reset` à chaque build Vercel
- 🎯 Impact: Base de données fraîche à chaque déploiement (données perdues)
- ⚠️ **Avertissement**: Ce mode est idéal pour dev/test mais destructif pour production
- 📝 Détails: Suppression de la logique conditionnelle `FORCE_DB_RESET`

---

### Fix Déploiement Vercel (21 janvier 2026)

**Problème résolu**: Erreur de parsing TypeScript lors du build
- ❌ Erreur: Code orphelin dans `app/api/admin/configure-github-oauth/route.ts:387`
- ✅ Solution: Suppression du code dupliqué (lignes 385-538)
- 📝 Détails: Fragment de code Vercel obsolète qui faisait référence à une variable `oauthApp` inexistante hors contexte
- 🎯 Impact: Build Vercel maintenant fonctionnel

---

## 🚀 Fonctionnalités Récentes

### OAuth Social Authentication (22 janvier 2026)

**Statut global**: 🟢 Fonctionnel (86% complété - 6/7 tâches)

> ⚠️ **Note importante**: L'API GitHub ne permet pas la création automatique d'OAuth Apps. La configuration doit être faite manuellement via l'interface GitHub. Voir [GITHUB_OAUTH_MANUAL_SETUP.md](./docs/GITHUB_OAUTH_MANUAL_SETUP.md) pour le guide détaillé.

| Tâche | Composant | Statut | Fichier(s) |
|-------|-----------|--------|------------|
| 1️⃣ Schéma DB | Infrastructure | ✅ Complété | `db/schema.ts` |
| 2️⃣ Admin Settings | Interface Admin | ✅ Complété | `app/(private)/admin/settings/page.tsx` |
| 3️⃣ API Manager | Configuration OAuth | ✅ Complété + Enhanced | `app/(private)/admin/api/page.tsx` |
| 4️⃣ Routes OAuth | API Endpoints | ✅ Complété | `app/api/auth/oauth/github/*` |
| 4️⃣.1 Helper Config | Configuration BDD | ✅ Complété | `lib/oauth/github-config.ts` |
| 4️⃣.2 Setup Endpoint | Guide configuration | ✅ Complété | `app/api/admin/configure-github-oauth/route.ts` |
| 5️⃣ Login UI | Interface utilisateur | ✅ Complété | `app/auth/login/page.tsx`, `app/auth/register/page.tsx` |
| 5️⃣.1 OAuth Config API | Endpoint configuration | ✅ Complété | `app/api/auth/oauth/config/route.ts` |
| 6️⃣ Server Actions | Actions serveur | ⏳ À faire | `app/actions/oauth.ts` |
| 7️⃣ Tests | Validation | ⏳ À faire | - |

**Documentation**: 
- 📘 **Guide de démarrage rapide**: [`GITHUB_OAUTH_MANUAL_SETUP.md`](./docs/GITHUB_OAUTH_MANUAL_SETUP.md) ✨ NOUVEAU
- 📗 **Documentation technique**: [`OAUTH_DATABASE_CONFIG.md`](./docs/OAUTH_DATABASE_CONFIG.md)
- 📙 **Vue d'ensemble**: [`OAUTH_NO_ENV_IMPLEMENTATION.md`](./docs/OAUTH_NO_ENV_IMPLEMENTATION.md)
- 📕 **Documentation initiale**: [`OAUTH_SOCIAL_AUTH.md`](./docs/OAUTH_SOCIAL_AUTH.md)

#### Détails des modifications

**1. Base de données (`db/schema.ts`)**
- ✅ Table `oauth_connections` créée avec chiffrement AES-256-GCM
- ✅ Relations Drizzle ORM avec table `users`
- ✅ Types TypeScript: `OAuthConnection`, `NewOAuthConnection`
- ✅ Index unique sur `[provider, providerUserId]`

**2. Admin Settings (`/admin/settings`)**
- ✅ Module "Social Media Connection" ajouté
- ✅ Toggle Switch pour GitHub et Google
- ✅ État: `socialAuthEnabled: { github: boolean, google: boolean }`
- ✅ Auto-save avec JSON serialization
- ✅ Lien vers `/admin/api` pour configuration

**3. API Manager (`/admin/api`)** - ✅ ENHANCED (22 janvier 2026)
- ✅ Migration Dialog → Sheet (UX cohérence)
- ✅ Services OAuth: GitHub et Google ajoutés
- ✅ ServiceIcon avec SVG GitHub (mono) et Google (4 couleurs)
- ✅ Configuration: clientId, clientSecret, redirectUri
- ✅ Validation et sauvegarde avec chiffrement
- ✨ **NOUVEAU**: Interface GitHub avec Collapsible sections
  - 🔵 OAuth (User Authentication) - Configuration complète avec test
  - 🟣 API (Server Integration) - Préparé pour PAT (à venir)
- ✨ **NOUVEAU**: URL callback dynamique avec bouton copier
- ✨ **NOUVEAU**: Test automatique de format Client ID
- ✨ **NOUVEAU**: Interface 100% anglais

**4. Routes OAuth (`/api/auth/oauth/github/*`)** - ✅ NOUVEAU (21 janvier 2026)
- ✅ Helper de configuration BDD: `lib/oauth/github-config.ts`
  - Fonction `getGitHubOAuthConfig()` récupère depuis `service_api_configs`
  - **Pas de dépendance aux variables d'environnement** ✨
  - Support multi-environnements (production/preview/dev)
- ✅ Route d'initiation: `app/api/auth/oauth/github/route.ts`
  - GET vers `/api/auth/oauth/github`
  - Redirige vers GitHub avec credentials de la BDD
  - Protection CSRF avec cookie state
- ✅ Route callback: `app/api/auth/oauth/github/callback/route.ts`
  - Échange code → access token (credentials BDD)
  - Récupération infos utilisateur GitHub
  - Création/liaison compte automatique
  - Génération JWT et redirection dashboard

**5. Login/Register UI (`/auth/*`)** - ✅ NOUVEAU (22 janvier 2026)
- ✅ Boutons sociaux dynamiques basés sur la configuration BDD
- ✅ API endpoint: `app/api/auth/oauth/config/route.ts`
  - Retourne `{ github: boolean, google: boolean }` basé sur configs actives
- ✅ Pages login et register utilisent `useEffect` pour charger la config
- ✅ Boutons GitHub/Google apparaissent uniquement si configurés
- ✅ **Pas de doublons** - Configuration centralisée dans `/admin/api`
- ✅ Suppression des anciens contrôles dans `/admin/settings`

**Architecture Clé**:
- ✅ **Configuration 100% base de données** (table `service_api_configs`)
- ✅ **Pas de variables ENV requises** pour OAuth
- ✅ **Gestion automatique des comptes**: création si nouveau, liaison si existant
- ✅ **Single Source of Truth**: Configuration uniquement dans `/admin/api`
- ✅ **UI dynamique**: Boutons sociaux s'affichent automatiquement
- ✅ **Sécurité**: CSRF protection, état vérifié, tokens chiffrés

**Prochaines étapes**:
1. Ajouter bouton "Se connecter avec GitHub" dans `/auth/login`
2. Créer `app/actions/oauth.ts` (unlinkAccount, listConnections)
3. Interface utilisateur pour gérer les connexions sociales
4. Tests complets du flux OAuth

**📚 Documentation Complète**:
- [OAUTH_NO_ENV_IMPLEMENTATION.md](./docs/OAUTH_NO_ENV_IMPLEMENTATION.md) - Vue d'ensemble ✨ NOUVEAU
- [OAUTH_DATABASE_CONFIG.md](./docs/OAUTH_DATABASE_CONFIG.md) - Guide technique complet ✨ NOUVEAU
- [OAUTH_SOCIAL_AUTH.md](./docs/OAUTH_SOCIAL_AUTH.md) - Documentation initiale

---

## 📋 Modules Principaux

| Module | Statut | Description | Documentation |
|--------|--------|-------------|---------------|
| 🔐 Authentication | ✅ Production | JWT + httpOnly cookies + OAuth (en cours) | [AUTHENTICATION_ONBOARDING.md](./docs/AUTHENTICATION_ONBOARDING.md) |
| 🛒 E-commerce | ✅ Production | Produits, panier, commandes, checkout | [ECOMMERCE_SETUP.md](./docs/ECOMMERCE_SETUP.md) |
| 📅 Calendrier | ✅ Production | Rendez-vous, disponibilités | [CALENDAR_APPOINTMENTS_MODULE.md](./docs/CALENDAR_APPOINTMENTS_MODULE.md) |
| 💬 Chat | ✅ Production | Conversations admin/user | [LIVE_CHAT_MODULE.md](./docs/LIVE_CHAT_MODULE.md) |
| 📧 Email | ✅ Production | Resend + templates React Email | [EMAIL_SYSTEM_ARCHITECTURE.md](./docs/EMAIL_SYSTEM_ARCHITECTURE.md) |
| 💳 Lago | ✅ Production | Facturation et abonnements | [LAGO_CONFIGURATION.md](./docs/LAGO_CONFIGURATION.md) |
| 👤 OAuth Social | 🟡 En cours | GitHub + Google (43%) | [OAUTH_SOCIAL_AUTH.md](./docs/OAUTH_SOCIAL_AUTH.md) |

---

## 🏗️ Architecture Technique

- **Framework**: Next.js 15+ (App Router)
- **Base de données**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: JWT + httpOnly cookies
- **Chiffrement**: AES-256-GCM (tokens OAuth, API secrets)
- **Email**: Resend
- **Paiements**: Stripe, PayPal
- **Hosting**: Vercel

**Documentation architecture**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 📊 État de la Préparation - Version Gratuite NeoSaaS

**Date**: 9 janvier 2026
**Branche**: freenium  
**Objectif**: Créer une version gratuite minimale sans e-commerce, calendrier et chat

---

## ✅ Actions Complétées

### 1. Documentation Créée

| Fichier | Description | Statut |
|---------|-------------|--------|
| `PREPARATION_GUIDE.md` | Guide complet étape par étape | ✅ Créé |
| `SECURITY_WARNING.md` | Alerte sécurité pour credentials | ✅ Créé |
| `.env.example` | Template d'environnement propre | ✅ Créé |
| `README.md` | Documentation mise à jour | ✅ Modifié |
| `scripts/prepare-free-version.ps1` | Script PowerShell de nettoyage | ✅ Créé |

### 2. Analyse du Projet

✅ Architecture complète analysée
✅ Tous les modules identifiés:
  - E-commerce (products, carts, orders, etc.)
  - Calendrier (appointments, calendar_connections, etc.)
  - Chat (conversations, messages, etc.)
  - Auth & Users (À GARDER)
  - Emails (À GARDER)
  - Lago (À GARDER)

---

## ⚠️ Actions Restantes CRITIQUES

### 1. SÉCURITÉ - PRIORITÉ MAXIMALE

🔴 **Le fichier `.env` contient des credentials sensibles!**

```env
DATABASE_URL='postgresql://neondb_owner:__NEON_PASSWORD_REDACTED__@<your-neon-host>-pooler...'
NEXTAUTH_SECRET='supersecretkeythatisatleast32characterslong'
```

**ACTIONS REQUISES IMMÉDIATEMENT:**

- [ ] **Révoquer le password de la base Neon** ou créer nouvelle DB
- [ ] **Générer nouveau NEXTAUTH_SECRET**: `openssl rand -base64 32`
- [ ] **Vérifier que `.env` n'a JAMAIS été committé**: `git log --all -- .env`
- [ ] **Ajouter `.env` au .gitignore** (déjà présent mais vérifier)

### 2. Suppression des Fichiers

**Méthode Recommandée**: Étant sur un dépôt GitHub virtuel, utilisez l'interface VS Code ou GitHub pour supprimer:

#### A. Dossiers E-Commerce
```
components/checkout/
contexts/cart-context.tsx
app/(private)/dashboard/checkout/
app/(private)/dashboard/checkout-lago/
app/(private)/dashboard/cart/
app/(private)/admin/products/
app/(private)/admin/orders/
app/(private)/admin/coupons/
app/(private)/admin/vat-rates/
app/(private)/admin/test-checkout/
app/actions/ecommerce.ts
app/actions/coupons.ts
```

#### B. Dossiers Calendrier
```
app/(private)/dashboard/calendar/
app/(private)/dashboard/appointments/
app/(private)/admin/appointments/
app/actions/appointments.ts
lib/calendar/
lib/notifications/appointment-notifications.ts
```

#### C. Dossiers Chat
```
components/chat/
app/(private)/dashboard/chat/
app/(private)/admin/chat/
app/api/chat/
```

#### D. Documentation et Tests
```
docs/                   # ⚠️ Tout le dossier!
cypress/
cypress.config.ts
check-admin-debug.ts
check-templates-debug.ts
scripts/test-checkout-flow.ts
```

### 3. Nettoyer `db/schema.ts`

**FICHIER MASSIF - 1444 lignes**

Supprimer manuellement ces sections (voir PREPARATION_GUIDE.md pour détails):

- [ ] Tables `products`, `carts`, `cart_items`, `orders`, `order_items`
- [ ] Tables `shipments`, `coupons`, `coupon_usage`, `vat_rates`
- [ ] Tables `product_leads`, `outlook_integrations`
- [ ] Tables `appointments`, `appointment_slots`, `appointment_exceptions`, `calendar_connections`
- [ ] Tables `chat_conversations`, `chat_messages`, `chat_quick_responses`, `chat_settings`
- [ ] Tables `llm_api_keys`, `llm_usage_logs` (si pas utilisé)
- [ ] Toutes les relations associées
- [ ] Tous les types TypeScript associés

**Tables à GARDER:**
- ✅ `users`, `companies`, `roles`, `permissions`, `user_roles`
- ✅ `subscriptions` (Lago)
- ✅ `email_*` (tous les emails)
- ✅ `service_api_configs`, `user_api_keys`
- ✅ `system_logs`, `page_permissions`, `platform_config`
- ✅ `terms_of_service`, `cookie_consents`

### 4. Créer le Formulaire de Contact

Créer ces 3 fichiers (voir PREPARATION_GUIDE.md pour le code):

- [ ] `components/features/contact-form.tsx`
- [ ] `app/api/contact/route.ts`
- [ ] `app/(private)/dashboard/support/page.tsx`

### 5. Nettoyer `package.json`

Supprimer dépendances inutilisées:

```bash
pnpm remove react-big-calendar @microsoft/microsoft-graph-client googleapis
```

Et toute autre dépendance liée aux modules supprimés.

### 6. Vérifications et Tests

- [ ] Compiler le projet: `pnpm build`
- [ ] Corriger toutes les erreurs TypeScript
- [ ] Vérifier les imports cassés
- [ ] Pousser le schéma DB: `pnpm db:push`
- [ ] Tester localement: `pnpm dev`

### 7. Préparation Git/GitHub

- [ ] Vérifier que `.env` n'est PAS tracké
- [ ] Faire un commit propre
- [ ] Pousser vers `https://github.com/neosaastech/neosaas`

---

## 📋 Checklist Finale

### Sécurité
- [ ] Credentials DB révoqués/changés
- [ ] NEXTAUTH_SECRET régénéré
- [ ] `.env` vérifié (pas dans git)
- [ ] `.env.example` créé
- [ ] Aucun secret dans le code

### Fichiers
- [ ] Modules e-commerce supprimés
- [ ] Modules calendrier supprimés
- [ ] Modules chat supprimés
- [ ] Dossier `docs/` supprimé
- [ ] Tests Cypress supprimés

### Code
- [ ] `db/schema.ts` nettoyé
- [ ] Formulaire de contact créé
- [ ] `package.json` nettoyé
- [ ] Compilation réussie
- [ ] Pas d'imports cassés

### Documentation
- [ ] `README.md` mis à jour
- [ ] `SECURITY_WARNING.md` créé
- [ ] `.env.example` documenté
- [ ] Guides créés

### Git/GitHub
- [ ] Commit propre
- [ ] Push vers GitHub
- [ ] Vérification finale de sécurité

---

## 🎯 Prochaines Étapes Recommandées

1. **IMMÉDIAT**: Révoquer credentials dans `.env`
2. **URGENT**: Supprimer les fichiers inutiles (manuellement via VS Code)
3. **IMPORTANT**: Nettoyer `db/schema.ts`
4. **NORMAL**: Créer formulaire de contact
5. **FINAL**: Tests, build, et push vers GitHub

---

## 🆘 En Cas de Problème

Si vous rencontrez des erreurs après les suppressions:

1. **Erreurs de compilation TypeScript**: 
   - Chercher les imports cassés
   - Supprimer les références aux modules supprimés

2. **Erreurs de base de données**:
   - Vérifier que toutes les tables supprimées ont leurs relations supprimées aussi
   - Faire `pnpm db:push --force` si nécessaire (en dev uniquement!)

3. **Erreurs de runtime**:
   - Vérifier les routes dans `app/`
   - Vérifier les composants dans `components/`
   - Vérifier les liens dans la navigation

---

**📌 Note**: Ce document sera supprimé avant le push final vers le dépôt public.
