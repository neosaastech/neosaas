# 📊 État du Projet NeoSaaS

> **Statut global et historique du projet** - Mis à jour automatiquement

**Dernière mise à jour**: 20 février 2026  
**Version**: 1.3.1-preview  
**Branche active**: `Preview` (Reset à `ddef125`)  
**Environnement**: Production (DB Neon PostgreSQL · Stripe Direct · Resend/Scaleway TEM)

---

## 🚀 Démarrage Rapide - Navigation

| Besoin | Document | Temps |
|--------|----------|-------|
| **Vue d'ensemble des actions** | [ACTIONS_SUMMARY.md](./ACTIONS_SUMMARY.md) | ⏱️ 5 min |
| **Logs et monitoring** | [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) | ⏱️ 10 min |
| **Guide OAuth complet** | [GITHUB_OAUTH_ARCHITECTURE_V3.md](./GITHUB_OAUTH_ARCHITECTURE_V3.md) | ⏱️ 15 min |
| **Setup Google OAuth** | [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) | ⏱️ 20 min |
| **Plan migration OAuth** | [OAUTH_MIGRATION_PLAN.md](./OAUTH_MIGRATION_PLAN.md) | ⏱️ 10 min |
| **Commencer le projet** | [00-START-HERE.md](./00-START-HERE.md) | ⏱️ 5 min |

---

## 🎯 Vue d'ensemble

| Composant | Statut | Version | Notes |
|-----------|--------|---------|-------|
| **Frontend** | ✅ Production | v1.0 | English-only |
| **Backend** | ✅ Production | v1.0 | Multilingue |
| **Base de données** | ✅ Pipeline unifié | PostgreSQL + Drizzle | 4 couches cohérentes — voir [MIGRATION_ARCHITECTURE.md](./MIGRATION_ARCHITECTURE.md) |
| **OAuth GitHub** | ⚠️ Migration requise | v2.0 (legacy + modulaire) | 340+ lignes dupliquées |
| **OAuth Google** | ✅ Prêt | v2.0 (modulaire) | Pas encore activé |
| **Emails** | ✅ Opérationnel | Multi-provider | Resend/Scaleway/AWS SES — Templates e-commerce depuis admin |
| **Payments (Stripe Direct)** | ✅ Intégré | v1.2 | Sync produits complète + paiement checkout + webhooks order update |
| **Admin Panel** | ✅ Production | v1.0 | Responsive design |

---

## ⚠️ ACTIONS EN COURS

📋 **Tableau de Suivi Détaillé** → Voir [`ACTIONS_SUMMARY.md`](./ACTIONS_SUMMARY.md)

### Tableau Récapitulatif

| # | Action | Statut | Priorité | Temps Est. | Doc |
|---|--------|--------|----------|-----------|-----|
| 1 | **Migration OAuth** - Éliminer 340+ lignes dupliquées | ⏳ Attente | 🔴 CRITIQUE | 3-4h | [OAUTH_MIGRATION_PLAN.md](./OAUTH_MIGRATION_PLAN.md) |
| 2 | **Google OAuth** - Config + activation | ⏳ Config | 🟡 IMPORTANT | 30min | [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) |
| 3 | **OAuth Admin UI** - Tests des toggles | ⏳ Tests | 🟡 IMPORTANT | 1h | [OAUTH_ADMIN_SETTINGS_ACTIVATION.md](./OAUTH_ADMIN_SETTINGS_ACTIVATION.md) |
| 4 | **OAuth Fixes** - Validation en prod | ⏳ Prod | 🟡 IMPORTANT | 1-2h | [CORRECTION_BUGS_OAUTH_2026-01-23.md](./CORRECTION_BUGS_OAUTH_2026-01-23.md) |
| 5 | **Logging Dashboard** - Admin monitoring | ⏳ Dev | 🟢 IMPORTANT | 2-3j | [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) |
| 6 | **Database Reset** - Configuration automatique | ✅ Actif | 🟡 IMPORTANT | - | [deployment/DATABASE_RESET.md](./deployment/DATABASE_RESET.md) |

---

### 🔴 Critique - Migration OAuth

**Problème** : 340+ lignes de code OAuth dupliquées

**État** :
- ✅ Architecture modulaire prête (`lib/oauth/providers/`)
- ✅ Documentation complète
- ⏳ Migration nécessaire

**Fichiers Concernés**:
- Legacy: `app/api/auth/oauth/github/route.ts` + `callback/route.ts`
- À supprimer: `lib/oauth/github-config.ts`
- À utiliser: `lib/oauth/providers/github.ts`

**Bénéfices** :
- 95% réduction du code OAuth
- Google OAuth en 15 min vs 4h
- Architecture unifiée

📖 **Action** : Lire [`OAUTH_MIGRATION_PLAN.md`](./OAUTH_MIGRATION_PLAN.md)

---

### 🟡 Important - Google OAuth Configuration

**État** :
- ✅ Code API complet
- ✅ Frontend automatique
- ⏳ Google Cloud Console setup
- ⏳ Sauvegarde credentials requise

**Étapes**:
1. Créer OAuth App dans Google Cloud Console
2. Configurer callback: `https://www.neosaas.tech/api/auth/oauth/google/callback`
3. Sauvegarder Client ID + Secret dans `/admin/api`
4. Tester le flow complet

📖 **Action** : Suivre [`GOOGLE_OAUTH_SETUP.md`](./GOOGLE_OAUTH_SETUP.md)

---

### 🟡 Important - Configuration Base de Données

**Statut actuel** : Mise à jour automatique du schéma à chaque déploiement (mode persistant)

**Comportement** :
- 🔄 `drizzle-kit push --force --verbose` synchronise `db/schema.ts` → base Neon
- ✅ Données existantes préservées
- 🌱 Email templates et permissions reseedés

**Source de vérité** : `db/schema.ts`
**Pipeline** : `vercel.json` → `scripts/build-with-db.sh` → `drizzle-kit push` → `next build`

---

## 📈 Historique des Modifications

### 📅 20 Février 2026 - Fix : Création d'invoice items Stripe (`amount` + `quantity` mutuellement exclusifs) (v1.3.0-beta)

**✅ Complété** — Correction de l'erreur `You may only specify one of these parameters: amount, quantity` lors du checkout avec une commande de type `appointment`.

**Root cause** : Dans `createStripeInvoicePayment()`, la boucle de création des `invoiceitems` envoyait **à la fois** `amount` (montant total) **et** `quantity` dans le body de `POST /v1/invoiceitems`. L'API Stripe interdit cette combinaison : il faut soit `amount` seul (total fixe), soit `unit_amount` + `quantity`.

**Correction** : Remplacement de `amount` par `unit_amount = Math.round(amount / quantity)` + `quantity` pour tous les items (suppression de l'ancienne logique conditionnelle sur `quantity > 1`).

**Fichiers modifiés** :
- `app/actions/payments.ts` — boucle `for (const item of params.items)` dans `createStripeInvoicePayment()` : remplacement `amount` par `unit_amount` calculé
- `docs/STATUS.md` — cette entrée

**Impact** :
- Le checkout avec des rendez-vous (type `appointment`, qty=1) fonctionne à nouveau
- La logique `unit_amount` est correcte pour toutes les quantités (1 et >1)

---

### 📅 20 Février 2026 - Fix : Téléchargement facture via PaymentIntent (`Received unknown parameter: payment_intent`) (v1.2.9-beta)

**✅ Complété** — Correction du bouton de téléchargement de facture pour les commandes one-time sans `stripeInvoiceId` en base.

**Root cause** : Le fallback `paymentIntentId` appelait `GET /invoices?payment_intent={pi}&limit=1`, mais ce paramètre de filtre **n'existe pas dans l'API Stripe**. Stripe retournait `400 Received unknown parameter: payment_intent`.

**Correction dans `getInvoicePdfUrl()`** :
1. `GET /payment_intents/{id}` → récupère le PaymentIntent
2. Lecture du champ `pi.invoice` (présent si le PI a été créé via l'Invoice API)
3. `GET /invoices/{invoice_id}` → retourne `invoice_pdf` et `hosted_invoice_url`
4. Si `pi.invoice` est absent (PI direct sans invoice) → message d'erreur explicite

**Fichiers modifiés** :
- `app/actions/admin-dashboard.ts` — `getInvoicePdfUrl()` : remplacement `GET /invoices?payment_intent=...` par `GET /payment_intents/{id}` → `pi.invoice` → `GET /invoices/{id}`
- `components/admin/invoices-table.tsx` — commentaire `InvoiceDownloadButton` mis à jour
- `docs/STATUS.md` — cette entrée

**Impact** :
- Le téléchargement de facture fonctionne pour toutes les commandes créées via l'Invoice API Stripe (one-time et subscriptions)
- Pour les commandes créées via PaymentIntent direct (sans invoice), un message d'erreur clair indique l'absence de facture Stripe

---

### 📅 20 Février 2026 - Fix Critique : Colonne `orders.tax_amount` absente en production (v1.2.8-beta)

**✅ Complété** — Correction du crash `NeonDbError: column orders.tax_amount does not exist` qui bloquait l'onglet "Recent Orders" du tableau de bord admin.

**Root cause** : `tax_amount` avait été ajouté dans `db/schema.ts` (colonne Stripe TVA) et référencé dans `lib/data/invoices.ts`, mais n'avait jamais été déclaré dans le safety net `scripts/db-ensure-columns.ts`. `drizzle-kit push` aurait dû l'ajouter, mais ne s'est manifestement pas exécuté sur cette colonne après sa définition dans le schéma.

**Colonnes manquantes confirmées en prod** :
- `orders.tax_amount` (INTEGER) — montant TVA en centimes retourné par le webhook `invoice.paid`

**Corrections** :
1. `scripts/db-ensure-columns.ts` — ajout de l'entrée `tax_amount` dans `REQUIRED_COLUMNS` avec `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_amount" integer`
2. `db/setup/full-reset.sql` — ajout des 4 colonnes Stripe manquantes dans la définition `CREATE TABLE orders` : `stripe_invoice_id`, `invoice_pdf`, `hosted_invoice_url`, `tax_amount`

**Audit doublons `REQUIRED_COLUMNS`** : 23 entrées vérifiées — aucun doublon (toutes les paires `table.colonne` sont uniques).

**Fichiers modifiés** :
- `scripts/db-ensure-columns.ts` — safety net étendu
- `db/setup/full-reset.sql` — définition initiale de la table orders complétée
- `docs/STATUS.md` — cette entrée

**Impact** :
- Au prochain déploiement, `db-ensure-columns.ts` ajoute `tax_amount` automatiquement avant le build Next.js
- L'onglet "Recent Orders" / "Invoices" redevient fonctionnel
- Les futurs full-reset incluront toutes les colonnes Stripe d'emblée

---

### 📅 20 Février 2026 - UI Admin Users : Bulk Delete + Délégation DPO / Représentant légal (v1.2.7-beta)

**✅ Complété** — Complétion du module de gestion des utilisateurs avec un bouton de suppression groupée et des actions de délégation DPO / Représentant légal par utilisateur.

**Ajout 1 : Bouton "Delete" dans la barre de sélection multiple**

La barre d'actions groupées (`selectedUsers.length > 0`) disposait de `Revoke` et `Activate`. Un bouton **Delete** (rouge) a été ajouté. Il déclenche `handleBulkDelete()` : confirmation native, boucle sur `deleteUser()` pour chaque ID sélectionné (avec la correction FK v1.2.6), toast de résultat, nettoyage de la liste locale et des sélections.

**Ajout 2 : Menu "···" par ligne — Assigner DPO / Représentant légal**

Pour chaque ligne utilisateur, un `DropdownMenu` avec icône `MoreHorizontal` apparaît si `isSuperAdmin` est actif et que l'utilisateur de la ligne n'est pas l'utilisateur courant. Le menu expose :
- **Set as DPO** (`ShieldCheck`) → appelle `handleSetDpo(user.id)` → action `setDpo()` (cible doit être admin/super_admin)
- **Set as Legal Rep.** (`Gavel`) → appelle `handleSetSiteManager(user.id)` → action `setSiteManager()`

Les éléments du menu affichent `(current)` en bleu/violet si le rôle est déjà assigné.

**Fichiers modifiés** :
- `components/admin/users-table.tsx` — ajout `handleBulkDelete`, `handleSetDpo`, `handleSetSiteManager` + bouton bulk delete + DropdownMenu par ligne
- `docs/STATUS.md` — cette entrée

**Impact** :
- Les super admins peuvent supprimer plusieurs utilisateurs en une opération
- Les super admins peuvent déléguer le rôle DPO et Représentant légal directement depuis la table, sans passer par la fiche d'édition

---

### 📅 20 Février 2026 - Fix Critique : Suppression utilisateurs + Contrainte DPO RGPD (v1.2.6-beta)

**✅ Complété** — Correction du bug de suppression définitive d'utilisateurs (violation FK) + renforcement de la règle d'assignation du DPO RGPD.

**Bug 1 : Suppression utilisateur bloquée par clés étrangères `ON DELETE NO ACTION`**

**Root cause** : La suppression d'un utilisateur échouait avec `23503 - update or delete on table "users" violates foreign key constraint "system_logs_user_id_users_id_fk"`. Quatre tables déclarent une FK vers `users.id` sans clause `ON DELETE CASCADE/SET NULL` :
- `system_logs.user_id` → `users.id` (**cause du log d'erreur**)
- `terms_of_service.created_by` → `users.id`
- `payment_methods.added_by` → `users.id`
- `user_invitations.invited_by` → `users.id`

**Correction** : Dans `deleteUser()`, avant le `db.delete(users)`, les quatre colonnes FK sont passées à `NULL` en parallèle via `Promise.all([...])`. L'audit de piste est préservé (les logs system restent, mais sans référence à l'utilisateur supprimé — conforme RGPD effacement).

**Bug 2 : DPO assignable à n'importe quel utilisateur**

**Correction** : `setDpo()` vérifie désormais que l'utilisateur cible possède le rôle `admin` ou `super_admin` avant de le désigner DPO. Si l'utilisateur n'a pas ce rôle, l'action retourne `"The DPO must be a platform administrator (admin or super_admin)"`.

**Fichiers modifiés** :
- `app/actions/users.ts` — `deleteUser()` + `setDpo()` + imports
- `docs/STATUS.md` — cette entrée

**Impact** :
- La suppression définitive d'utilisateurs fonctionne sans erreur FK
- Le DPO RGPD ne peut être assigné qu'à un admin ou super admin de la plateforme

---

### 📅 20 Février 2026 - Onboarding Agent IA : Lecture documentation & configuration environnement (v1.2.5-beta)

**✅ Complété** — Lecture complète de la documentation du projet et enregistrement de l'environnement de développement actif.

**Documentation lue** :
- `docs/00-START-HERE.md` — Point d'entrée principal
- `docs/ARCHITECTURE.md` — Architecture globale, modules, règles anti-doublons
- `docs/STATUS.md` — Historique complet des modifications
- `docs/DOCUMENTATION_INDEX.md` — Index de tous les documents

**Environnement de développement configuré** :
- `DATABASE_URL` : Neon PostgreSQL pooler, eu-central-1 (SSL + channel_binding)
- `PGUSER` : `authenticator`
- `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` : API Anthropic via token VCP Vercel
- Branche active : `prepprodvefir`

**Fichiers modifiés** : `docs/STATUS.md`, `docs/DOCUMENTATION_INDEX.md`

---

### 📅 19 Février 2026 - Admin Invoices : Refactoring module facturation (v1.2.4-beta)

**✅ Complété** — Refactoring complet du tableau des factures dans `/admin` (onglet Recent → module Invoices).

**Problèmes résolus** :
- Suppression des actions inutiles : boutons **View** (œil / dialog de détail), **User** (UserCog → `/admin/users?edit=...`), **Edit** (crayon → `/admin/orders/...`), ainsi que toute la logique History et Impersonate associée
- Ajout d'une colonne **Type** avec badges visuels (`Subscription` / `One-time` / `Hourly`) 
- Ajout d'un filtre **Type** dans la barre de filtres (All types / One-time / Subscription / Hourly)
- Ajout d'un bouton **Export CSV** (avec BOM UTF-8 pour compatibilité Excel) exportant les données filtrées
- Simplification de la colonne Actions : uniquement le lien de téléchargement PDF ou le lien vers la facture hébergée Stripe

**Détails techniques** :
- `lib/data/invoices.ts` — Ajout d'une sous-requête corrélée SQL pour récupérer `products.payment_type` via `order_items` → champ `billingType` exposé sur chaque facture
- `components/admin/invoices-table.tsx` — Suppression de ~200 lignes (dialogs, impersonation, history) + ajout du filtre Type + export CSV + helpers `billingTypeLabel()` et `billingTypeBadge()`

**Fichiers modifiés** :
- `lib/data/invoices.ts`
- `components/admin/invoices-table.tsx`
- `docs/STATUS.md`

---

### 📅 19 Février 2026 - Branche `correction-error-pages` : Bouton téléchargement factures admin (v1.2.3-beta)

**✅ Complété** — Le tableau des factures admin (`/admin` → onglet Invoices) affiche désormais un bouton de téléchargement fonctionnel pour chaque ligne, y compris les commandes dont les URLs n'ont pas encore été stockées en base de données.

**Problème root-cause** : Les abonnements (statut `pending`) et les commandes récentes ne disposaient pas encore de `invoicePdf` / `hostedInvoiceUrl` en base (ces champs sont peuplés par le webhook Stripe `invoice.paid`). La colonne "Invoice" affichait simplement `—`.

**Corrections** :
1. **`app/actions/admin-dashboard.ts`** — Ajout du server action `getInvoicePdfUrl(stripeInvoiceId)` : appel Stripe REST `GET /v1/invoices/{id}` (admin-only), retourne `invoicePdf` + `hostedInvoiceUrl` frais depuis Stripe.
2. **`components/admin/invoices-table.tsx`** — Extraction du composant `InvoiceDownloadButton` avec 3 niveaux de fallback :
   - `invoicePdf` → lien direct `download`
   - `hostedInvoiceUrl` → ouverture de la page Stripe hébergée
   - `stripeInvoiceId` → bouton avec spinner qui appelle `getInvoicePdfUrl()` puis ouvre l'URL
3. **`lib/data/invoices.ts`** — `stripeInvoiceId` était déjà sélectionné dans la query (pas de changement nécessaire).

**Fichiers modifiés** :
- `app/actions/admin-dashboard.ts`
- `components/admin/invoices-table.tsx`
- `docs/STATUS.md`

---

### 📅 19 Février 2026 - Branche `correction-error-pages` : Refactor module Invoices admin (v1.2.3-beta)

**✅ Complété** — Nettoyage du tableau des factures (`/admin` Recent → Invoices) : suppression des boutons inutiles, ajout de la colonne Type, filtre Type et export CSV.

**Changements** :
- Supprimé : boutons View, User, Edit, History, Impersonate (~200 lignes)
- Ajouté : colonne **Type** (Subscription / One-time / Hourly) via sous-requête SQL sur `order_items → products.payment_type`
- Ajouté : filtre **Type** dans les filtres existants (5 colonnes au lieu de 4)
- Ajouté : bouton **Export CSV** (UTF-8 BOM, Excel-compatible)
- Colonne Invoice : uniquement le lien PDF Stripe ou lien hébergé

**Fichiers modifiés** :
- `lib/data/invoices.ts` — ajout champ `billingType`
- `components/admin/invoices-table.tsx` — refactor complet actions

---

### 📅 19 Février 2026 - Branche `correction-error-pages` : Audit & Cartographie des pages d'erreur

**✅ Complété** — Lecture complète de la documentation et cartographie de l'état des pages d'erreur dans la branche `correction-error-pages`.

**État des pages d'erreur** :
- `app/(errors)/404/page.tsx` — Page 404 via `ErrorPageLayout` ✅
- `app/(errors)/500/page.tsx` — Page 500 via `ErrorPageLayout` ✅
- `app/(errors)/503/page.tsx` — Page 503 via `ErrorPageLayout` ✅
- `app/(errors)/maintenance/page.tsx` — Page maintenance (composant inline) ✅
- `app/(errors)/success/page.tsx` — Page succès (composant inline) ✅
- `app/not-found.tsx` — Page 404 native Next.js (composant inline, non via `ErrorPageLayout`) ✅
- `app/error.tsx` — Boundary d'erreur global Next.js via `ErrorPageLayout` ✅
- `components/common/error-page-layout.tsx` — Layout partagé pour pages d'erreur ✅

**Observation** : `app/not-found.tsx` est une implémentation inline parallèle à `app/(errors)/404/page.tsx`. Les deux affichent le même contenu 404 mais avec des structures légèrement différentes (not-found.tsx n'utilise pas `ErrorPageLayout`).

**Environnement de développement actif** :
- DB : Neon PostgreSQL (pool Neon · eu-central-1)
- ORM : Drizzle (push mode)
- Paiements : Stripe Direct (mode test/live depuis `/admin`)
- Package manager : pnpm

**Fichiers modifiés** : `docs/STATUS.md`

---

### 📅 19 Février 2026 - Fix Critique : Drizzle `TypeError: Cannot convert undefined or null to object` (v1.2.3-beta)

**✅ Complété** — Résolution du crash `Object.entries(null)` au niveau de `ch._prepare()` de Drizzle ORM, qui bloquait toutes les requêtes relationnelles (`db.query.*`).

**Root cause** : `chatConversationsRelations` déclarait **3 relations vers `users`** (`user`, `assignedAdmin`, `closedByUser`), mais `user` n'avait pas de `relationName`. En présence de plusieurs FK vers la même table, Drizzle exige que toutes soient nommées. L'ambiguïté corrompait la map relationnelle interne, causant `Object.entries(null)` dès la première requête préparée.

**Corrections** :
- **`db/schema.ts` — `chatConversationsRelations`** : Ajout de `relationName: "conversationUser"` sur la relation `user` (était sans nom, créant l'ambiguïté avec `assignedAdmin` et `closedByUser`)
- **`db/schema.ts` — `usersRelations`** : Ajout des 5 relations inverses obligatoires (Drizzle impose les deux côtés quand `relationName` est utilisé) :
  - `appointments` avec `relationName: "appointmentUser"`
  - `assignedAppointments` avec `relationName: "appointmentAssignedAdmin"`
  - `chatConversations` avec `relationName: "conversationUser"`
  - `assignedChatConversations` avec `relationName: "assignedAdmin"`
  - `closedChatConversations` avec `relationName: "closedBy"`

**Fichiers modifiés** : `db/schema.ts`
**Impact** : Toutes les requêtes `db.query.*` (profil utilisateur, dashboard, admin, paiements) fonctionnent de nouveau sans crash.

---

### 📅 19 Février 2026 - Fix Critque : Cartes liées à la company, pas à l'utilisateur (v1.2.2-beta)

**✅ Complété** — Les méthodes de paiement (cartes) sont désormais **toujours liées à l'entreprise** et non à l'utilisateur individuel :

**Problème root-cause** : `app/actions/payments.ts` recherchait le customer Stripe par `metadata["neosaas_user_id"]` → chaque utilisateur memb re de la même entreprise voyait ses propres cartes au lieu des cartes de l'entreprise.

**Corrections** :

1. **`app/actions/payments.ts`** — Réécriture complète des helpers internes :
   - Supprimé `findOrCreateStripeCustomer(userId, email)` (orienté user)
   - Ajouté `getUserCompanyId(userId)` et `getCompanyStripeCustomerId(userId)` qui passent par `ensureStripeCustomer(companyId)` (le bon customer)
   - `getStripePaymentMethods()` → cherche par `companies.stripeCustomerId` (la company), plus par `neosaas_user_id`
   - `getInvoices()` → idem, factures de la company
   - `createStripeSetupIntent()` → SetupIntent attaché au customer de la company + métadonnées `neosaas_company_id`
   - `deleteStripePaymentMethod()` → vérifie que la carte appartient au customer de la company + soft-delete dans `payment_methods`
   - `setDefaultPaymentMethod()` → met à jour le default sur le customer de la company
   - `createStripeCheckoutSession()` et `createStripeSubscription()` → utilisent le customer de la company

2. **`components/dashboard/credit-card-sheet.tsx`** — Import et appel de `confirmPaymentMethodAdded` après confirmation Stripe :
   - Avant : `handleCardSaved` appelait juste `onRefresh()` sans sauvegarder en DB
   - Après : `handleCardSaved(paymentMethodId)` appelle `confirmPaymentMethodAdded` → sauvegarde dans `payment_methods` avec `company_id` correct
   - Ajout d'un état `isSavingCard` avec spinner pendant la sauvegarde DB

**Résultat** : Tous les utilisateurs rattachés à la même entreprise voient les mêmes cartes. L'ajout d'une carte par n'importe quel membre l'enregistre sur le compte Stripe **de la company**, pas sur un compte individuel.

**Fichiers modifiés** :
- `app/actions/payments.ts`
- `components/dashboard/credit-card-sheet.tsx`

---

### 📅 20 Février 2026 - Audit & Unification Pipeline Migration DB (v1.2.1-beta)

**✅ Complété** — Audit complet des mécanismes de mise à jour de base de données + élimination des doublons et conflits :

**Problèmes identifiés et corrigés** :

1. **`db/migrate.ts` — Conflit de schéma fatal** : L'ancien runner Drizzle ORM écrivait dans `__drizzle_migrations` avec `(id TEXT, hash TEXT, created_at BIGINT)` — incompatible avec le schéma custom `(id SERIAL, tag TEXT, idx INT, applied_at TIMESTAMPTZ)`. Déprécié → stub vide `export {}` avec avertissement.

2. **`scripts/db-migrate-safe.sh` — Étape `db:migrate` manquante** : Le pipeline GitHub Actions appliquait `drizzle-kit push` sans exécuter `scripts/migrate.ts` → `__drizzle_migrations` jamais mis à jour par CI → Vercel re-tentait toutes les migrations à chaque déploiement. **Correction** : ajout de `pnpm db:migrate` comme étape 2/4.

3. **`scripts/db-verify-schema.ts` — Table `payment_methods` absente** : La vérification post-migration ne contrôlait pas `payment_methods`. Ajout de la table + 9 colonnes critiques.

4. **`docs/MIGRATION_ARCHITECTURE.md`** — **NOUVEAU** : Document de référence complet sur l'architecture 4 couches (safety net → journal SQL → schema push → vérification).

**Fichiers modifiés** :
- `db/migrate.ts` — déprécié (stub vide)
- `scripts/db-migrate-safe.sh` — ajout étape `pnpm db:migrate`
- `scripts/db-verify-schema.ts` — vérification `payment_methods`
- `docs/MIGRATION_ARCHITECTURE.md` — **NOUVEAU**
- `docs/STATUS.md` — cette entrée

**Impact** :
- GH Actions met maintenant à jour `__drizzle_migrations` avant que Vercel ne tente ses propres migrations
- Aucun doublon conflictuel dans les mécanismes de migration
- Pipeline documenté : [MIGRATION_ARCHITECTURE.md](./MIGRATION_ARCHITECTURE.md)

---

### 📅 17 Février 2026 - Pipeline Drizzle : Migration Stripe Colonnes (v1.2.0-beta)

**✅ Complété** — Corrections du pipeline de migration Drizzle pour les colonnes Stripe produits :

**Problème identifié** : Les 5 colonnes Stripe (`stripe_product_id`, `stripe_price_one_time`, `stripe_price_weekly`, `stripe_price_monthly`, `stripe_price_yearly`) ajoutées dans `db/schema.ts` n'avaient aucune migration SQL correspondante. La colonne `stripe_price_one_time` n'était même pas dans le filet de sécurité `db-ensure-columns.ts`.

**Corrections** :
1. **`scripts/db-ensure-columns.ts`** — Ajout de `stripe_price_one_time` dans `REQUIRED_COLUMNS` (était la seule colonne Stripe manquante du safety net)
2. **`drizzle/0001_stripe_product_sync.sql`** — **NOUVEAU** : Migration SQL avec 5 `ALTER TABLE ADD COLUMN IF NOT EXISTS` pour toutes les colonnes Stripe
3. **`drizzle/meta/_journal.json`** — Ajout entrée idx 1 pour la nouvelle migration
4. **`drizzle/meta/0000_snapshot.json`** — Ajout des 5 colonnes Stripe dans la définition de la table products (snapshot Drizzle)
5. **`db/setup/full-reset.sql`** — Ajout des 5 colonnes Stripe dans le CREATE TABLE products (script de reset manuel)
6. **`scripts/db-verify-schema.ts`** — Ajout des 5 colonnes Stripe dans les vérifications post-migration

**3 chemins de déploiement corrigés** :
- **Vercel builds** (HTTP) : `db-ensure-columns.ts` → `migrate.ts` applique `0001_stripe_product_sync.sql`
- **GitHub Actions** (TCP) : `db-ensure-columns.ts` → `drizzle-kit push` lit le snapshot mis à jour
- **Reset manuel** : `full-reset.sql` inclut désormais les colonnes Stripe

**Fichiers modifiés** :
- `scripts/db-ensure-columns.ts` — ajout `stripe_price_one_time`
- `drizzle/0001_stripe_product_sync.sql` — **NOUVEAU**
- `drizzle/meta/_journal.json` — entrée migration idx 1
- `drizzle/meta/0000_snapshot.json` — 5 colonnes Stripe ajoutées
- `db/setup/full-reset.sql` — colonnes Stripe dans CREATE TABLE
- `scripts/db-verify-schema.ts` — vérification colonnes Stripe

**Commandes de test** :
```bash
# Vérifier les colonnes dans Neon
pnpm db:verify

# Appliquer les colonnes manquantes
pnpm db:ensure

# Migration complète (Vercel path)
pnpm db:migrate

# Sync schéma complet (GitHub Actions path)
pnpm db:push
```

### 📅 17 Février 2026 - Synchronisation Produits-Stripe & Pipeline Paiement (v1.2.0-beta)

**✅ Complété** — 7 problèmes critiques corrigés dans le pipeline produit → Stripe → paiement :

1. **Schéma `stripePriceOneTime`** — Ajout du champ manquant dans la table `products` pour stocker le Stripe Price ID des produits à paiement unique.

2. **Réécriture complète `syncProductToStripe()`** — La fonction gère désormais TOUS les types de produits :
   - **One-time** (physical/digital) : crée un Stripe Product + un one-time Price, stocké dans `stripePriceOneTime`
   - **Subscription** : crée des Prices récurrents (weekly/monthly/yearly) selon les prix configurés
   - **Hourly** : crée un Stripe Product uniquement (facturation différée)
   - **Détection de changement de prix** : si le prix DB≠Stripe, l'ancien Price est archivé et un nouveau est créé
   - **Skip des produits gratuits** : les produits `isFree=true` ou `price<=0` ne sont plus synchronisés inutilement

3. **`archiveStripeProduct()`** — Nouvelle fonction pour archiver proprement un produit Stripe : archive d'abord tous ses Prices actifs, puis le Product lui-même.

4. **`deleteProduct()` → archive Stripe** — La suppression d'un produit archive automatiquement le Product Stripe correspondant (non-blocking).

5. **Paiement Stripe dans `processCheckout()`** — Le checkout CHARGE réellement le client :
   - Commandes gratuites → `paymentStatus: 'paid'` immédiat, pas d'appel Stripe
   - Produits one-time → `createStripePayment()` avec la carte par défaut de l'entreprise
   - Abonnements → `createStripeSubscription()` avec retour `clientSecret` pour confirmation 3D Secure
   - Produits hourly → paiement différé (`paymentStatus: 'pending'`)
   - En cas d'échec : commande marquée `failed`, code erreur `PAYMENT_METHOD_MISSING` ou `PAYMENT_FAILED`

6. **Webhook `payment_intent.succeeded` → update orders** — Le handler webhook met à jour `orders.paymentStatus = 'paid'` + `paidAt` en trouvant la commande par `metadata.orderId` ou fallback par `paymentIntentId`.

7. **Webhook `payment_intent.payment_failed` → update orders** — Le handler marque la commande comme `failed` avec la même logique de lookup.

**Fichiers modifiés** :
- `db/schema.ts` — ajout `stripePriceOneTime` dans la table products
- `lib/stripe-products.ts` — réécriture `syncProductToStripe()` + ajout `archiveStripeProduct()`
- `app/actions/ecommerce.ts` — `deleteProduct()` wired to archive + bloc paiement dans `processCheckout()`
- `app/api/stripe/webhook/route.ts` — `payment_intent.succeeded/failed` → update orders

**Impact** :
- Le checkout crée réellement un paiement Stripe (avant = seulement un `paymentStatus: 'pending'` sans appel Stripe)
- Tous les types de produits (physical, digital, appointment) sont correctement synchronisés avec Stripe
- Les changements de prix sont détectés et resynchronisés automatiquement
- Les webhooks confirment les paiements même en cas de latence réseau

### 📅 17 Février 2026 - Corrections Admin Dashboard & Stripe

**✅ Complété** :
- **Fix critique : Admin Dashboard crash** — Suppression du `try/catch` dans `admin/layout.tsx` qui interceptait les exceptions `NEXT_REDIRECT` de Next.js, provoquant "Error: An error occurred in the Server Components render". Le layout laisse désormais `requireAdmin()` propager ses redirects naturellement.
- **Fix sérialisation dates** — `getDashboardStats()` convertit les `Date` en ISO strings avant retour via Server Action (évite les erreurs de sérialisation RSC → Client).
- **Fix null safety** — `r.amount / 100` dans les données revenue protégé contre `null` avec `Number(r.amount) || 0`.
- **Fix Balance API test HTTP 400** — L'endpoint `/v1/balance` de Stripe n'accepte pas `?limit=1`. Le helper `checkStripeEndpoint` exclut désormais le paramètre pour les requêtes Balance et retourne directement le solde disponible.
- **Suppression double fetch Balance** — Le bloc "Extra detail: fetch actual balance amount" était redondant, supprimé.
- **Import mort nettoyé** — `AdminAlerts` retiré des imports de `admin/layout.tsx` (importé mais non utilisé).
- **Nouvelle feature : Stripe Customer Lookup** — Section dédiée dans Payment Settings pour retrouver les clients Stripe depuis les données entreprise du projet. Recherche par nom/email/SIRET, filtres linked/unlinked, lien direct vers le Stripe Dashboard.

**Fichiers modifiés** :
- `app/(private)/admin/layout.tsx` — try/catch supprimé, import mort retiré
- `lib/data/admin-dashboard.ts` — sérialisation Date→ISO, fix null safety revenue
- `app/api/admin/payments/test-stripe/route.ts` — fix Balance limit param, nettoyage double fetch
- `components/admin/payment-settings.tsx` — ajout section Stripe Customers (table, recherche, lien dashboard)
- `app/api/admin/payments/stripe-customers/route.ts` — **NOUVEAU** endpoint GET pour lookup companies ↔ Stripe

**Impact** :
- Le dashboard admin `/admin` s'affiche à nouveau avec les tableaux de performance
- Le test Stripe ne retourne plus HTTP 400 sur Balance — les 5/5 checks passent
- Les entreprises peuvent être retrouvées dans Stripe en 1 clic

### 📅 16 Février 2026 - Migration Paiements Stripe Direct

**✅ Complété** :
- Remplacement Lago → Stripe Direct dans Payment Configuration (/admin)
- Ajout toggle Test/Live pour Stripe avec persistance `stripe_mode` en `platform_config`
- Correction bug critique auth `test-stripe` route (erreur 500 → `user.role` remplacé par `user.roles?.some(...)`)
- Test de connexion Stripe enrichi : 5 endpoints vérifiés en parallèle (Balance, Customers, Products, Tax Rates, Invoices)
- Distinction visuelle test/production dans la table API Management (badges colorés, fond conditionnel)
- Composant `payment-settings.tsx` 100% Stripe (toggle mode, avertissement live, résultats détaillés)

**Fichiers modifiés** :
- `app/api/admin/payments/test-stripe/route.ts` — auth corrigée + test multi-endpoints
- `app/api/admin/config/route.ts` — ajout persistance `stripe_mode`
- `components/admin/payment-settings.tsx` — toggle test/live + checks individuels
- `components/admin/service-api-table.tsx` — badges environnement colorés

**Impact** :
- Page /admin Payment Configuration fonctionne (plus d'erreur 500)
- Admin peut basculer entre test et production Stripe
- Vérification complète de la connectivité Stripe en 1 clic

### 📅 23 Janvier 2026 - Architecture OAuth Modulaire

**✅ Nouveau** :
- Architecture OAuth v2.0 modulaire créée
- Provider pattern (BaseOAuthProvider)
- Helpers partagés (handleOAuthUser, etc.)
- Google OAuth provider prêt
- Documentation complète (4 fichiers)

**⚠️ À faire** :
- Migrer routes vers nouvelle architecture
- Supprimer fichier legacy github-config.ts

**Fichiers** :
- [`OAUTH_ARCHITECTURE.md`](./oauth/OAUTH_ARCHITECTURE.md)
- [`OAUTH_DUPLICATES_AUDIT.md`](./OAUTH_DUPLICATES_AUDIT.md)
- [`OAUTH_MIGRATION_PLAN.md`](./OAUTH_MIGRATION_PLAN.md)
- [`OAUTH_ACTION_REQUIRED.md`](./OAUTH_ACTION_REQUIRED.md)

---

### 📅 22 Janvier 2026 - i18n Cleanup + UX Improvements

**✅ Complété** :
- Frontend 100% en anglais (suppression textes français)
- UX Settings page améliorée (tabsList grid-cols-4)
- API Manager GitHub organisé en 2 sections:
  - 🔵 OAuth (User Authentication)
  - 🟣 API (Server Integration) - À venir
- URL callback dynamique et copiable
- Test automatique configuration OAuth
- Validation format Client ID (Iv1.*/Ov2.*)

**Impact** :
- Configuration 3x plus rapide
- Moins d'erreurs utilisateur
- Interface plus professionnelle

---

### 📅 22 Janvier 2026 - Reset Automatique Base de Données

**⚠️ Historique** (corrigé depuis) :
- ~~Script `build-with-db.sh` utilisait `pnpm db:hard-reset`~~
- ~~Reset automatique sans variable d'environnement~~

**✅ Correction (Fév 2026)** : Passage au mode persistant (`drizzle-kit push`) pour tous les environnements. Les fichiers `db/push-schema.ts` et `db/migrations/` ont été supprimés. Source de vérité unique : `db/schema.ts`.
- **À désactiver pour production avec données persistantes**

---

### 📅 Janvier 2026 - GitHub OAuth Database Config

**✅ Migré vers configuration base de données** :
- Credentials OAuth stockés en BDD (cryptés AES-256-GCM)
- Plus de variables ENV requises
- Configuration via interface admin
- Auto-détection du domaine (production/preview)

**Fichiers modifiés** :
- `lib/oauth/github-config.ts` - Récupération depuis BDD
- `app/api/auth/oauth/github/route.ts` - Utilise BDD
- `app/api/auth/oauth/github/callback/route.ts` - Utilise BDD

**Bénéfices** :
- Configuration sans redéploiement
- Multi-environment supporté
- Sécurité améliorée

---

## 🏗️ Architecture Actuelle

### Stack Technique

```
Frontend:
├── Next.js 15+ (App Router)
├── React 18
├── Tailwind CSS
└── shadcn/ui

Backend:
├── Next.js API Routes
├── Server Components
└── Drizzle ORM

Database:
├── PostgreSQL (Neon)
├── Drizzle ORM
└── Migrations automatiques

Authentification:
├── JWT (lib/auth)
├── OAuth GitHub (BDD config)
├── OAuth Google (prêt)
└── Cookie-based sessions

Services:
├── Stripe (Payments direct — test/live toggle)
├── Resend/Scaleway/AWS SES (Emails)
└── Service API Manager (configs)
```

### Modules Principaux

| Module | Status | Documentation |
|--------|--------|---------------|
| **Authentification** | ✅ Production | [`guides/AUTHENTICATION_SETUP.md`](./guides/AUTHENTICATION_SETUP.md) |
| **OAuth Social** | ⚠️ Migration | [`oauth/`](./oauth/) |
| **Gestion Utilisateurs** | ✅ Production | [`guides/USER_MANAGEMENT.md`](./guides/USER_MANAGEMENT.md) |
| **Rôles & Permissions** | ✅ Production | [`architecture/ROLES_PERMISSIONS.md`](./architecture/ROLES_PERMISSIONS.md) |
| **Emails** | ✅ Production | [`modules/EMAIL_SYSTEM.md`](./modules/EMAIL_SYSTEM.md) |
| **Paiements (Stripe Direct)** | ✅ Intégré | [`STRIPE_INTEGRATION.md`](./STRIPE_INTEGRATION.md) |
| **Admin Panel** | ✅ Production | [`guides/ADMIN_PANEL.md`](./guides/ADMIN_PANEL.md) |
| **API Manager** | ✅ Production | [`guides/API_MANAGER.md`](./guides/API_MANAGER.md) |

---

## 📊 Métriques Code

### Statistiques Générales

```
Fichiers TypeScript: ~250
Composants React: ~80
Routes API: ~30
Pages: ~25
```

### Dette Technique Identifiée

| Catégorie | Lignes | Impact | Action |
|-----------|--------|--------|--------|
| **OAuth Doublons** | 340 lignes | 🔴 Critique | Migration v2.0 |
| **Unused imports** | ~50 lignes | 🟡 Moyen | Cleanup automatique |
| **Console logs** | ~30 | 🟢 Faible | Suppression progressive |

**Détails doublons OAuth** : [`OAUTH_DUPLICATES_AUDIT.md`](./OAUTH_DUPLICATES_AUDIT.md)

---

## 🚀 Roadmap

### Court Terme (1-2 semaines)

- [ ] **Migration OAuth v2.0** - Éliminer doublons
- [ ] **Activer Google OAuth** - 15 min après migration
- [ ] **Tests automatisés** - Coverage OAuth
- [ ] **Docs cleanup** - Archiver anciennes versions

### Moyen Terme (1-2 mois)

- [ ] **Facebook OAuth** - Utiliser architecture modulaire
- [ ] **LinkedIn OAuth** - Utiliser architecture modulaire
- [ ] **Microsoft OAuth** - Utiliser architecture modulaire
- [ ] **Performance optimization** - Bundle size, lazy loading
- [ ] **Monitoring** - Sentry, Analytics

### Long Terme (3-6 mois)

- [ ] **Mobile app** - React Native
- [ ] **API publique** - REST + GraphQL
- [ ] **Webhooks** - Event system
- [ ] **Multi-tenancy** - Isolation complète

---

## 🐛 Bugs Connus

### Résolus

- ✅ **Toggle OAuth ne fonctionnait pas** - Corrigé 22/01/2026
- ✅ **redirect_uri error sans logs** - Corrigé 22/01/2026
- ✅ **Page vide après première connexion OAuth** - Corrigé 23/01/2026
- ✅ **Cookie mismatch (token vs auth-token)** - Corrigé 23/01/2026
- ✅ **Cache en production** - Corrigé avec headers + dynamic routes

### En Cours

- ⚠️ **OAuth code duplication** - Migration en cours (voir OAUTH_ACTION_REQUIRED.md)

### Backlog

- 🔵 **Email templates preview** - À implémenter
- 🔵 **Bulk user import** - À implémenter

---

## 📝 Conventions de Développement

### Commits

```
feat: Nouvelle fonctionnalité
fix: Correction de bug
docs: Documentation uniquement
style: Formatage, semi-colons, etc.
refactor: Refactoring code
test: Ajout/modification tests
chore: Tâches build, config, etc.
```

### Branches

```
main - Production
dev - Développement
feature/* - Nouvelles fonctionnalités
fix/* - Corrections bugs
docs/* - Documentation
```

### Code Style

- **TypeScript strict mode** : Activé
- **ESLint** : Configuré
- **Prettier** : Configuré
- **Commits** : Conventional Commits

---

## 📞 Support & Ressources

### Documentation

- **Index principal** : [`00-START-HERE.md`](./00-START-HERE.md)
- **Architecture** : [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **OAuth** : [`OAUTH_INDEX.md`](./OAUTH_INDEX.md)
- **Troubleshooting** : [`troubleshooting/`](./troubleshooting/)

### Outils de Debug

- **Logs** : Console browser + Terminal
- **Database** : Drizzle Studio (`pnpm db:studio`)
- **API** : Postman/Insomnia
- **React DevTools** : Extension browser

### Contact

- **GitHub Issues** : [neosaastech/neosaas-website/issues](https://github.com/neosaastech/neosaas-website/issues)
- **Email** : support@neosaas.tech

---

## 🎯 Résumé Actions Prioritaires

1. **📖 Lire** [`OAUTH_ACTION_REQUIRED.md`](./OAUTH_ACTION_REQUIRED.md)
2. **🔧 Migrer** OAuth vers architecture v2.0 (3-4h)
3. **⚡ Activer** Google OAuth (15 min)
4. **🧪 Tester** Flow complet (30 min)
5. **🚀 Déployer** (15 min)

---

## 📅 Changelog

### 19 février 2026 — Refactoring module Admin Invoices + bouton de téléchargement Stripe + fix build

- **[REFACTOR] `components/admin/invoices-table.tsx`** : Réécriture complète du tableau des factures admin. Suppression des boutons inutiles (View, User, Edit, Impersonate, Dialog historique). Fichier nettoyé et unififié (anciens fragments résiduels des itérations précédentes supprimés).
- **[FEAT] Colonne “Type”** : badge `Abonnement` / `Ponctuel` / `Horaire` depuis sous-requête SQL `order_items → products.payment_type`.
- **[FEAT] Colonne “TVA”** : affiche `orders.tax_amount` (en cents) si disponible, `—` sinon. Nouveau champ `tax_amount` ajouté dans `db/schema.ts` (orders table) et renseigné par le webhook `invoice.paid`.
- **[FEAT] Colonne “Utilisateur”** : nom et email de l’utilisateur à l’origine de la commande affichés en sous-ligne dans la colonne Client (pas de colonne supplémentaire, gain de place).
- **[FEAT] Filtre Type** : Select `Ponctuel / Abonnement / Horaire`.
- **[FEAT] Export CSV** : colonnes Order#, Client, User, Type, Montant, TVA, Statut, Date, Invoice URL.
- **[FEAT] `InvoiceDownloadButton` (4 niveaux)** : `invoicePdf` (direct) → `hostedInvoiceUrl` (Stripe) → `stripeInvoiceId` (server action) → `paymentIntentId` (recherche `GET /invoices?payment_intent={pi}`). Le bouton s’affiche dès que l’un des 4 champs est présent. Plus de `—` si un `paymentIntentId` existe.
- **[FIX BUILD] `getInvoicePdfUrl` signature élargie** : accepte maintenant `(stripeInvoiceId?: string | null, paymentIntentId?: string | null)`. La signature `string` stricte a été supprimée.
- **[FIX] Active Plans = 0** : `getDashboardStats()` comptait uniquement `status = ‘active’`. Élargi à `IN (‘active’, ‘trialing’, ‘incomplete’)` via `inArray`. Import `inArray` ajouté dans `lib/data/admin-dashboard.ts`.
- **[FIX] Webhook `invoice.paid`** : stocke `taxAmount: invoice.tax ?? null` dans les deux branches (update order existant + création nouveau record).
- **Fichiers modifiés** : `components/admin/invoices-table.tsx`, `lib/data/invoices.ts`, `app/actions/admin-dashboard.ts`, `app/api/stripe/webhook/route.ts`, `db/schema.ts`, `lib/data/admin-dashboard.ts`, `docs/STATUS.md`
- **Impact** : L’admin peut télécharger toutes les factures (même sans `stripeInvoiceId` via fallback PaymentIntent). La TVA Stripe est visible dans le tableau. L’utilisateur à l’origine de la commande est identifiable. Le compteur Active Plans est correct.

- **[REFACTOR] `components/admin/invoices-table.tsx`** : Nettoyage complet du tableau des factures admin (636 → 492 lignes). Suppression des boutons inutiles : View, User (historique), Edit, Impersonate. Suppression des Dialogs, états et fonctions associés (`loadUserHistory`, `impersonateUser`). Colonne `router` retirée (plus utilisée).
- **[FEAT] Colonne "Type" avec badges** : Ajout d'une colonne affichant le type de facturation (`Abonnement`, `Ponctuel`, `Horaire`) via des badges colorés. La valeur provient d'un sous-requête SQL sur `order_items → products.payment_type` ajoutée dans `lib/data/invoices.ts`.
- **[FEAT] Filtre "Type"** : Nouveau filtre Select par type de facturation (`billingTypeFilter`), s'applique en temps réel avec les filtres existants (recherche, statut, date, montant).
- **[FEAT] Export CSV** : Bouton "Exporter CSV" générant un fichier UTF-8 BOM avec colonnes : Order#, Client, Email, Type, Montant, Statut, Date, Invoice URL. Compatible Excel.
- **[FEAT] `InvoiceDownloadButton`** : Composant avec 3 niveaux de fallback : (1) `invoicePdf` → lien direct PDF, (2) `hostedInvoiceUrl` → page Stripe hébergée, (3) `stripeInvoiceId` → appel serveur `getInvoicePdfUrl()` avec spinner `Loader2` pendant le chargement.
- **[FEAT] `getInvoicePdfUrl` (server action)** : Ajout dans `app/actions/admin-dashboard.ts`. Appelle `verifyAdminAccess()`, `getStripeCredentials()`, puis `stripeFetch(secretKey, /invoices/{id})` et retourne `{ success, invoicePdf?, hostedInvoiceUrl?, error? }`.
- **[FIX BUILD] Export manquant `getInvoicePdfUrl`** : Turbopack signalait `Export getInvoicePdfUrl doesn't exist in target module`. Cause : un appel `multi_replace_string_in_file` précédent avait silencieusement échoué à écrire la fonction. Corrigé par `replace_string_in_file` ciblé — fonction ajoutée en fin de fichier (lignes 249-285).
- **Fichiers modifiés** : `components/admin/invoices-table.tsx`, `lib/data/invoices.ts`, `app/actions/admin-dashboard.ts`, `docs/STATUS.md`
- **Impact** : Le tableau des factures admin est allégé et fonctionnel. Les factures Stripe sont téléchargeables même si le webhook `invoice.paid` n'a pas encore peuplé `invoicePdf` en BDD. L'export CSV permet un suivi comptable rapide.

### 19 février 2026 — Diagnostic & restauration DB : table `payment_methods` absente + cleanup Lago

- **[FIX CRITIQUE] Table `payment_methods` manquante en production** : Vérification directe sur Neon — la table n'existait pas malgré les 3 migrations marquées comme appliquées dans `__drizzle_migrations`. Cause probable : `reset-db.ts` ou un reset manuel a supprimé la table après que la migration 0000 ait été appliquée. La table a été recréée avec toutes ses colonnes, contraintes FK et index.
- **[FIX CRITIQUE] `getUserCompanyId` avait une syntaxe Drizzle incorrecte** : `db.query.users.id` → corrigé en `users.id` (import du schema). La fonction renommée `getUserCompanyIdFromDB`.
- **[FIX] `confirmPaymentMethodAdded` : `companyId` lu depuis la DB** : Avant, `companyId` venait exclusivement du JWT (potentiellement obsolète si la session précède l'association user↔entreprise). Désormais, le companyId est rechargé depuis la DB via `getUserCompanyIdFromDB(user.userId)` avec fallback sur le JWT.
- **[FIX] Colonnes Lago orphelines supprimées** : `subscriptions.lago_id`, `subscriptions.plan_code`, `appointments.lago_invoice_id`, `appointments.lago_transaction_id`, `companies.lago_id` — ces colonnes devaient être supprimées par migration 0002 mais étaient encore présentes. Supprimées manuellement pour synchroniser la DB avec `db/schema.ts`.
- **[SAFETY NET] `db-ensure-columns.ts` étendu** : Ajout d'une section `REQUIRED_TABLES` qui crée `payment_methods` avec `CREATE TABLE IF NOT EXISTS` si elle est absente. Ce filet de sécurité se déclenche avant les migrations à chaque déploiement.
- **Fichiers modifiés** : `app/actions/stripe-payments.ts`, `scripts/db-ensure-columns.ts`
- **DB modifiée directement** : `CREATE TABLE payment_methods` + FK + index, `DROP COLUMN IF EXISTS lago_*` sur 3 tables
- **Impact** : Les cartes peuvent maintenant être sauvegardées. La liaison carte ↔ entreprise est complète. plus de crash Drizzle `TypeError: Cannot convert undefined or null to object`.

### 19 février 2026 — Fix critique Stripe : liaison carte → entreprise + Nom du titulaire

- **[FIX CRITIQUE] `StripeCardFormAuto.handleSuccess` n'appelait pas `confirmPaymentMethodAdded`** : La carte était confirmée côté Stripe (attachée au customer entreprise via le SetupIntent) mais jamais sauvegardée en BDD avec `companyId`. La carte apparaissait donc comme un nouveau customer orphelin dans Stripe. Désormais, `handleSuccess(paymentMethodId)` appelle `confirmPaymentMethodAdded(pmId)` qui persiste la liaison carte ↔ entreprise.
- **[FIX CRITIQUE] `CardFormInner` ne transmettait pas le PM ID** : `stripe.confirmCardSetup` retourne `setupIntent.payment_method` — cet ID n'était pas extrait ni transmis au callback `onSuccess`. Corrigé : `onSuccess(paymentMethodId)` sur toute la chaîne.
- **[FEAT] Champ "Nom du titulaire" obligatoire** : Ajout d'un champ `holderName` dans le formulaire de carte. Transmis à Stripe via `billing_details.name`, stocké dans `payment_methods.holder_name`. Le bouton "Save Card" est désactivé si vide.
- **[RULE] Règle B2B renforcée** : Customer Stripe = entreprise (jamais l'utilisateur). Toute carte est liée à l'entreprise de l'utilisateur actif. Si l'utilisateur change d'entreprise, il accède aux cartes de la nouvelle entreprise.
- **[UX] État `confirming`** : Loader ajouté pendant la sauvegarde en BDD après confirmation Stripe.
- **Fichiers modifiés** : `components/dashboard/stripe-card-form.tsx`, `components/dashboard/add-payment-method-dialog.tsx`, `docs/STRIPE_INTEGRATION.md`
- **Impact** : Les cartes sont désormais correctement associées à l'entreprise, plus de customers dupliqués côté Stripe.

### 19 février 2026 — Documentation — Apprentissage projet & ENVIRONMENT.md

- **[DOCS] Lecture complète de la documentation** : Session d'apprentissage du projet depuis `/docs`. Vue d'ensemble acquise : architecture Next.js 15 App Router, Drizzle ORM + Neon PostgreSQL, Stripe Direct, OAuth modulaire, système email multi-provider.
- **[DOCS] Création `docs/setup/ENVIRONMENT.md`** : Fichier manquant créé (référencé dans `QUICK_START.md` mais absent). Documente toutes les variables d'environnement : `DATABASE_URL`, `PGPASSWORD`, `PGUSER`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` (Vercel Copilot Platform via proxy), providers email, note sur les credentials OAuth/Stripe stockés en BDD.
- **Variables d'environnement dev enregistrées** : `DATABASE_URL` → Neon eu-central-1 (pooler HTTP), `PGUSER=authenticator` (utilisateur RLS), `ANTHROPIC_BASE_URL` → proxy Vercel AI Gateway (teamId Vercel), `ANTHROPIC_AUTH_TOKEN` → token `vcp_*` Vercel Copilot Platform.
- **Fichiers modifiés** : `docs/setup/ENVIRONMENT.md` (NOUVEAU), `docs/STATUS.md`
- **Impact** : Les développeurs disposent d'une documentation complète des variables d'environnement, incluant la configuration IA via Vercel.

### 17 février 2026 — v1.1.2-beta — Email Template Resolution & Admin Commerce Templates

- **[FIX] Pipeline de résolution de templates email** : `EmailRouterService.sendEmail()` résout désormais les templates depuis la DB quand `message.template` est fourni. Avant cette correction, les champs `template` / `data` envoyés par `processCheckout()` étaient silencieusement ignorés → tous les emails e-commerce partaient vides.
- **[FIX] Type `EmailMessage` enrichi** : Ajout de `template?: string` et `data?: Record<string, any>` pour le typage fort.
- **[FEAT] Admin Mail — 9 templates configurables** : La page `/admin/mail` affiche désormais 9 types de templates (au lieu de 4) répartis en 3 groupes (Account, Commerce, Payment) : `registration`, `user_invitation`, `account_deletion`, `email_update_notification`, `order_confirmation`, `order_confirmation_physical`, `order_confirmation_digital`, `order_confirmation_subscription`, `payment_confirmation`.
- **[FEAT] Variables contextuelles par type** : Le sélecteur de variables dans l'éditeur de template s'adapte au type sélectionné (variables e-commerce, digitales, abonnement, paiement).
- **[FEAT] Preview enrichi** : L'aperçu HTML inclut des exemples pour toutes les variables commerce (`orderNumber`, `total`, `licenseKey`, `planName`, etc.).
- **Fichiers modifiés** : `lib/email/types/index.ts`, `lib/email/services/email-router.service.ts`, `app/(private)/admin/mail/page.tsx`
- **Impact** : Les emails transactionnels du checkout fonctionnent maintenant correctement via les templates DB, et l'admin peut personnaliser chaque type d'email individuellement.

### 20 février 2026 — Reset Branch Preview

- **[RESET] Branch Preview à `ddef125`** : Réinitialisation forcée de la branche `Preview` pour alignement avec la version validée (commit `ddef125cc896f6d73dfd86a2a2c04469c8e02691`).
- **[ENV] Configuration Environment** : Mise à jour des variables d'environnement critiques (`ANTHROPIC_BASE_URL`, `PGPASSWORD`, `ANTHROPIC_AUTH_TOKEN`, `DATABASE_URL`, `PGUSER`) pour le déploiement Preview.
- **Fichiers modifiés** : `.env`, `docs/STATUS.md`, `docs/DOCUMENTATION_INDEX.md`
- **Impact** : L'environnement de preview est maintenant aligné sur une version stable connue avec les secrets de production/preview configurés.

---

**Dernière révision** : 20 février 2026 par GitHub Copilot  
**Prochaine révision** : À chaque modification majeure
