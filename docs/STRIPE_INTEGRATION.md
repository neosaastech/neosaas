# Stripe Direct Payment Integration

**Date de création:** 2026-02-10
**Dernière mise à jour:** 2026-02-20
**Statut:** ✅ Connecté (mode Test) | ⚠️ Webhook secret non configuré | ⚠️ Aucune donnée encore synchronisée en Stripe
**Version:** 3.2

---

## 🏗️ Principe Fondamental : Entreprise = Customer Stripe

> **RAPPEL CRITIQUE** : Toutes les données Stripe sont rattachées à l'**entreprise** (`company`), jamais à l'utilisateur individuel.

| NeoSaaS | Stripe | Lien |
|---|---|---|
| `company.name` | Customer `name` | ✅ Nom entreprise (JAMAIS user.firstName) |
| `company.email` | Customer `email` | ✅ Email entreprise |
| `company.siret` | `metadata.siret` | ✅ |
| `company.vatNumber` | `metadata.vat_number` | ✅ |
| `users` (role writer) | `metadata.writer_user_emails` | Utilisateurs autorisés à gérer les cartes |

```
NeoSaaS                          Stripe
─────────────────────────────────────────────────────
Company (entreprise)     ←→      Customer (cus_xxx)
  └── PaymentMethods     ←→        └── PaymentMethods (pm_xxx)
  └── Subscriptions      ←←        └── Subscriptions (sub_xxx) [via webhook + pull]
  └── Orders             ←←        └── Invoices (in_xxx)       [via webhook invoice.paid]
  └── Users (writers)    ──→           metadata.writer_user_emails
```

---

## Vue d'Ensemble

NeoSaaS intègre Stripe directement pour gérer les paiements par entreprise. Cette intégration permet:

- ✅ Association des cartes aux **entreprises** (jamais aux utilisateurs)
- ✅ Gestion directe via l'API Stripe (sans passer par le customer portal Lago)
- ✅ Synchronisation **bidirectionnelle** cartes/clients/abonnements (ajout 18 fév. 2026)
- ✅ Interface admin avec boutons de sync et badge de statut Stripe (ajout 18 fév. 2026)
- ✅ Webhooks Stripe pour les mises à jour en temps réel (12 événements gérés, ajout `customer.deleted` le 19 fév. 2026)
- ✅ Page `/admin/invoices` dédiée (ajout 18 fév. 2026)
- ✅ Cycle de vie customer : création / suppression / retour sans duplication (ajout 19 fév. 2026)
- ✅ Sync profil company → Stripe à chaque synchronisation (nom, email, adresse, SIRET…)
- ✅ Upsert atomique Drizzle pour `payment_methods` — zéro doublon en concurrence (ajout 19 fév. 2026)
- ⚠️ Produits Stripe : non encore créés automatiquement depuis NeoSaaS
- ⚠️ Webhook secret : non encore configuré (code prêt, en attente Admin > API Manager)

---

## Architecture

### Modèle de Données

#### Table `payment_methods`

Stocke les cartes de paiement associées aux entreprises.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID unique |
| `companyId` | UUID | Référence vers `companies` |
| `stripePaymentMethodId` | TEXT | ID Stripe du moyen de paiement |
| `stripeCustomerId` | TEXT | ID du customer Stripe |
| `cardBrand` | TEXT | Marque de carte (visa, mastercard, etc.) |
| `cardLast4` | TEXT | 4 derniers chiffres |
| `cardExpMonth` | INTEGER | Mois d'expiration |
| `cardExpYear` | INTEGER | Année d'expiration |
| `isDefault` | BOOLEAN | Carte par défaut |
| `isActive` | BOOLEAN | Carte active |
| `holderName` | TEXT | Nom du titulaire |
| `addedBy` | UUID | User qui a ajouté la carte |
| `createdAt` | TIMESTAMP | Date de création |
| `lastSyncedAt` | TIMESTAMP | Dernière synchronisation |
| `expiresAt` | TIMESTAMP | Date d'expiration calculée |

#### Table `companies` (champs ajoutés)

| Champ | Type | Description |
|-------|------|-------------|
| `stripeCustomerId` | TEXT | ID du customer Stripe |
| `stripeSetupIntentClientSecret` | TEXT | Secret temporaire pour ajouter une carte |
| `stripeDefaultPaymentMethod` | TEXT | ID de la carte par défaut |

#### Table `stripe_sync_logs`

Logs de synchronisation pour le monitoring.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | ID unique |
| `companyId` | UUID | Entreprise concernée |
| `syncType` | TEXT | Type de sync (cards, customer, etc.) |
| `status` | TEXT | success, failed, partial |
| `cardsAdded` | INTEGER | Nombre de cartes ajoutées |
| `cardsUpdated` | INTEGER | Nombre de cartes mises à jour |
| `cardsRemoved` | INTEGER | Nombre de cartes supprimées |
| `errorMessage` | TEXT | Message d'erreur éventuel |
| `duration` | INTEGER | Durée en millisecondes |
| `createdAt` | TIMESTAMP | Date de création |

---

## ♻️ Cycle de Vie du Customer Stripe

> **Ajouté le 19 fév. 2026** — gestion robuste de la création, suppression et retour d'un client Stripe.

### Scénarios gérés automatiquement

| Scénario | Détection | Action |
|----------|-----------|--------|
| Nouveau client | `stripeCustomerId` absent en DB | Création dans Stripe via `ensureStripeCustomer()` |
| Client supprimé dans Stripe | Webhook `customer.deleted` | Désactivation cartes locales + effacement `stripeCustomerId` |
| Client disparu (sans webhook) | `ensureStripeCustomer()` → Stripe renvoie `deleted: true` | Même effacement, puis recherche par email, puis re-création |
| Client revenant (même email) | `ensureStripeCustomer()` → `stripe.customers.search` par email | Re-liaison sans créer de doublon |
| Email modifié dans NeoSaaS | `ensureStripeCustomer()` détecte la divergence email | Mise à jour Stripe automatique |

### Algorithme de `ensureStripeCustomer(companyId)`

`company.email` est la **référence canonique** — c'est toujours l'email de l'entreprise.

```
1. La company a un stripeCustomerId en DB ?
   ├─ OUI → Récupérer le customer dans Stripe
   │         ├─ Supprimé → effacer stripeCustomerId en DB → aller en 2
   │         ├─ Email différent → sync email dans Stripe → retourner l'ID
   │         └─ OK → retourner l'ID
   └─ NON → aller en 2

2. Chercher dans Stripe par email (stripe.customers.search)
   ├─ Trouvé → re-lier (update companies.stripeCustomerId) → retourner l'ID
   └─ Non trouvé → créer nouveau customer Stripe → sauvegarder → retourner l'ID
```

### Suppression d'un Customer depuis le Dashboard Stripe

Quand un administrateur supprime un customer directement dans Stripe :

1. Stripe envoie l'événement `customer.deleted` au webhook `/api/stripe/webhook`
2. NeoSaaS marque toutes les cartes de la company `isActive = false, isDefault = false`
3. NeoSaaS efface `stripeCustomerId` et `stripeDefaultPaymentMethod` sur la company
4. Un log système (`level: warning`) est créé pour traçabilité
5. Lors du prochain accès, `ensureStripeCustomer()` crée un nouveau customer automatiquement

> **Note :** Pour supprimer un customer proprement depuis NeoSaaS (et non depuis Stripe),
> utiliser l'API admin `POST /api/admin/stripe/reset-customer` qui gère la séquence complète.

---

## 🛡️ Anti-Doublons : Upsert Drizzle

> **Ajouté le 19 fév. 2026** — `savePaymentMethodToDB()` utilise un upsert atomique.

La fonction `savePaymentMethodToDB()` dans `lib/stripe-payment-methods.ts` utilise
`onConflictDoUpdate` sur la contrainte unique `stripePaymentMethodId` :

```typescript
await db
  .insert(paymentMethods)
  .values({ /* données complètes */ })
  .onConflictDoUpdate({
    target: paymentMethods.stripePaymentMethodId,
    set: { /* champs à mettre à jour */ },
  })
  .returning()
```

**Garanties :**

| Propriété | Détail |
|-----------|--------|
| **Aucun doublon** | Même si deux webhooks arrivent simultanément pour la même carte |
| **Atomique** | Une seule requête SQL au lieu de deux (find + insert/update) |
| **Idempotent** | Appeler N fois avec le même PM Stripe = résultat identique |
| **Préservation du défaut** | `isDefault` n'est PAS écrasé lors d'un conflit — géré séparément par `setDefaultPaymentMethod()` |

---

## Fonctions et Services

### `lib/stripe-customers.ts`

Gestion des customers Stripe.

**Fonctions principales:**

- `ensureStripeCustomer(companyId)` - Créer ou récupérer un customer Stripe (avec lookup email + gestion cycle de vie)
- `updateStripeCustomerMetadata(companyId)` - Mettre à jour les métadonnées
- `getStripeCustomer(customerId)` - Récupérer un customer
- `deleteStripeCustomer(companyId)` - Supprimer un customer

**Admin Lookup (ajouté 17 fév. 2026):**

- Endpoint `GET /api/admin/payments/stripe-customers` — recherche des companies et leur `stripeCustomerId`
- Paramètres : `?search=...` (nom/email/SIRET), `?linked=true|false`
- UI dans Payment Settings : table avec filtres, lien "Open in Stripe" vers le Dashboard
- Le lien respecte le mode test/live : `dashboard.stripe.com/[test/]customers/{id}`

**Métadonnées stockées:**

```json
{
  "neosaas_company_id": "uuid",
  "siret": "12345678901234",
  "vat_number": "FR12345678901",
  "writer_user_ids": "user1_id,user2_id",
  "writer_user_emails": "user1@company.com,user2@company.com",
  "lago_customer_id": "lago_uuid"
}
```

### `lib/stripe-payment-methods.ts`

Gestion des moyens de paiement (cartes).

**Fonctions principales:**

- `getCompanyPaymentMethodsFromStripe(companyId)` - Récupérer depuis Stripe
- `getCompanyPaymentMethodsFromDB(companyId)` - Récupérer depuis la base de données
- `createSetupIntent(companyId, userId?)` - Créer un Setup Intent pour ajouter une carte
- `attachPaymentMethod(paymentMethodId, companyId)` - Attacher une carte
- `detachPaymentMethod(paymentMethodId, companyId)` - Supprimer une carte
- `setDefaultPaymentMethod(companyId, paymentMethodId)` - Définir carte par défaut
- `savePaymentMethodToDB(stripePaymentMethod, companyId, addedBy?)` - Sauvegarder en base (upsert atomique)

### `lib/stripe-sync.ts`

Moteur de synchronisation bidirectionnelle NeoSaaS ↔ Stripe.

**Fonctions de sync cartes (existantes) :**

- `syncCompanyPaymentMethods(companyId)` - Sync cartes d'une entreprise
- `syncAllCompanies()` - Sync cartes de toutes les entreprises
- `getCompanySyncLogs(companyId, limit)` - Récupérer les logs
- `getSyncStatistics()` - Statistiques globales

**Fonctions de sync bidirectionnel (ajout 18 fév. 2026) :**

- `syncStripeCustomersFromStripe()` — Pull tous les customers Stripe, associe aux companies NeoSaaS par email ou `metadata.neosaas_company_id`. Retourne `{ matched, updated, notFound, errors, details[] }`.
- `syncStripeSubscriptionsFromStripe()` — Pull toutes les subscriptions Stripe, crée/met à jour la table locale `subscriptions`. Retourne `{ created, updated, skipped, errors, total }`.

**Processus de synchronisation cartes (mis à jour 19 fév. 2026) :**

> `syncCompanyPaymentMethods(companyId)` effectue désormais les étapes suivantes dans l'ordre :

1. `ensureStripeCustomer()` — vérifie / crée / re-lie le customer Stripe (retourne `customerCreated: boolean`)
2. `updateStripeCustomerMetadata()` — pousse le profil NeoSaaS complet vers Stripe (nom, email, adresse, SIRET, TVA, writers)
3. Récupérer les cartes depuis Stripe
4. Comparer avec la base de données (upsert atomique via `onConflictDoUpdate`)
5. Ajouter les nouvelles cartes
6. Mettre à jour les cartes existantes
7. Marquer les cartes supprimées comme inactives
8. Synchroniser le défaut (`invoice_settings.default_payment_method`)
9. Logger les résultats dans `stripe_sync_logs`

**Processus de synchronisation customers (Stripe → NeoSaaS) :**

1. Lister tous les customers Stripe (pagination automatique)
2. Pour chaque customer : chercher la company par `metadata.neosaas_company_id`, puis par email
3. Si trouvée et non encore liée → mettre à jour `companies.stripeCustomerId`
4. Retourner le rapport détaillé

**Processus de synchronisation subscriptions (Stripe → NeoSaaS) :**

1. Lister toutes les subscriptions Stripe (tous statuts)
2. Pour chaque subscription : trouver la company via `stripeCustomerId`
3. Upsert dans la table `subscriptions` locale
4. Logger les erreurs sans interrompre le batch

---

## Actions Serveur

### `app/actions/stripe-payments.ts`

Actions utilisables par le frontend.

**Gestion des cartes:**

- `getCompanyCards()` - Récupérer les cartes de l'entreprise
- `createCardSetupIntent()` - Créer un Setup Intent
- `confirmPaymentMethodAdded(paymentMethodId)` - Confirmer l'ajout
- `removePaymentMethod(paymentMethodId)` - Supprimer une carte
- `setDefaultCard(paymentMethodId)` - Définir carte par défaut

**Paiements:**

- `createStripePayment(params)` - Créer un paiement

**Synchronisation:**

- `syncPaymentMethods()` - Synchroniser les cartes
- `syncAllCompaniesPaymentMethods()` - Synchroniser toutes les entreprises (admin)

**Customer:**

- `ensureCompanyStripeCustomer()` - S'assurer qu'un customer existe
- `updateCompanyStripeMetadata()` - Mettre à jour les métadonnées

---

## Routes API

### Routes API — Référence complète (mise à jour 18 fév. 2026)

#### Sync cartes

| Méthode | Route | Body | Description |
|---|---|---|---|
| `GET` | `/api/stripe/sync` | — | Stats globales de sync cartes |
| `POST` | `/api/stripe/sync` | `{ "syncAll": true/false }` | Déclenche sync cartes |

#### Sync customers (NEW)

| Méthode | Route | Body | Description |
|---|---|---|---|
| `GET` | `/api/stripe/sync/customers` | — | Stats companies liées/non liées |
| `POST` | `/api/stripe/sync/customers` | `{ "direction": "stripe_to_neosaas" \| "neosaas_to_stripe" \| "both" }` | Sync customers bidirectionnel |

Réponse POST :
```json
{
  "success": true,
  "direction": "both",
  "results": {
    "stripeToNeosaas": { "matched": 1, "updated": 2, "notFound": 0, "errors": 0 },
    "neosaasToStripe": { "created": 1, "errors": 0, "skipped": 3 }
  }
}
```

#### Sync subscriptions (NEW)

| Méthode | Route | Body | Description |
|---|---|---|---|
| `GET` | `/api/stripe/sync/subscriptions` | — | Stats abonnements locaux vs Stripe |
| `POST` | `/api/stripe/sync/subscriptions` | — | Pull toutes les subscriptions depuis Stripe |

Réponse POST :
```json
{
  "success": true,
  "message": "Synced 5 subscriptions: 2 created, 3 updated, 0 skipped, 0 errors",
  "data": { "created": 2, "updated": 3, "skipped": 0, "errors": 0, "total": 5 }
}
```

#### Test & Administration

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/admin/payments/test-stripe?mode=test\|live` | Test connexion Stripe (5 checks) |
| `GET` | `/api/admin/payments/stripe-customers` | Liste companies avec stripeCustomerId |
| `POST` | `/api/stripe/webhook` | Réception événements Stripe |

### `POST /api/stripe/webhook`

Webhook Stripe pour recevoir les événements en temps réel.

**12 événements gérés (mise à jour 19 fév. 2026) :**

| Événement | Action NeoSaaS |
|---|---|
| `payment_method.attached` | Sauvegarde carte → `payment_methods` |
| `payment_method.detached` | Marque carte inactive |
| `payment_method.updated` | Met à jour carte en DB |
| `customer.updated` | Re-sync cartes + default PM |
| `customer.deleted` | Désactive toutes les cartes, efface `stripeCustomerId` sur la company |
| `payment_intent.succeeded` | Log système (catégorie: stripe) |
| `payment_intent.payment_failed` | Log système (warning) |
| `customer.subscription.created` | Upsert → table `subscriptions` |
| `customer.subscription.updated` | Upsert → table `subscriptions` |
| `customer.subscription.deleted` | `status = 'canceled'` |
| `invoice.paid` | Crée un enregistrement `orders` + log |
| `invoice.payment_failed` | Log système (warning) |

> ⚠️ **Prérequis** : Le webhook secret doit être configuré dans Admin > API Management.
> Sans webhook secret, tous ces événements sont rejetés (HTTP 500).
> Voir `docs/STRIPE_WEBHOOK_SETUP.md` pour la procédure complète.

**Configuration :**

1. Aller dans le dashboard Stripe
2. Webhooks > Add endpoint
3. URL : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionner les 12 événements ci-dessus
5. Copier le signing secret (`whsec_...`) dans Admin > API Management > Stripe

---

## Interface Utilisateur

### Page `/dashboard/payment-methods`

Page de gestion des moyens de paiement.

**Fonctionnalités:**

- Affichage de toutes les cartes de l'entreprise
- Badge "Default" sur la carte par défaut
- Badge "Expired" sur les cartes expirées
- Bouton "Add Payment Method" pour ajouter une carte
- Bouton "Sync with Stripe" pour synchroniser
- Actions par carte:
  - Set as Default
  - Remove (avec confirmation)

**Sécurité:**

- Accessible uniquement aux utilisateurs avec `companyId`
- Utilise Stripe Elements pour la saisie sécurisée
- Aucune donnée sensible stockée (seulement last4, brand, expiration)

---

## Flux Utilisateur

### 1. Ajout d'une carte

```
Utilisateur clique "Add Payment Method"
    ↓
Création Setup Intent via createCardSetupIntent()
    ↓
Affichage du formulaire Stripe Elements
    ↓
Utilisateur saisit les informations de carte
    ↓
Confirmation via stripe.confirmCardSetup()
    ↓
Webhook payment_method.attached reçu
    ↓
Sauvegarde dans payment_methods via savePaymentMethodToDB()
    ↓
Si première carte → définie comme défaut
    ↓
Rafraîchissement de la liste
```

### 2. Paiement avec Stripe

```
Utilisateur finalise checkout
    ↓
Récupération de la carte par défaut
    ↓
Création PaymentIntent via createStripePayment()
    - amount: total en centimes
    - customer: stripeCustomerId
    - payment_method: defaultCardId
    - confirm: true
    ↓
Paiement confirmé
    ↓
Webhook payment_intent.succeeded reçu
    ↓
Création commande + facture Lago (optionnel)
    ↓
Email de confirmation
```

### 3. Synchronisation

**Manuelle:**

```
Utilisateur clique "Sync with Stripe"
    ↓
Appel syncPaymentMethods()
    ↓
Récupération des cartes depuis Stripe
    ↓
Comparaison avec la base de données
    ↓
Mise à jour des différences
    ↓
Affichage du résultat
```

**Automatique:**

```
Webhook Stripe reçu
    ↓
Vérification signature
    ↓
Traitement selon le type d'événement
    ↓
Mise à jour de la base de données
    ↓
Log dans stripe_sync_logs
```

**Planifiée (à implémenter):**

```
Cron job (quotidien ou horaire)
    ↓
Appel syncAllCompanies()
    ↓
Pour chaque entreprise avec stripeCustomerId
    ↓
Synchronisation des cartes
    ↓
Logs et monitoring
```

---

## Configuration

### Variables d'Environnement (Fallback)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Base de Données (Recommandé)

Stocker dans `service_api_configs`:

```sql
INSERT INTO service_api_configs (service_name, service_type, environment, config)
VALUES (
  'stripe',
  'payment',
  'production',
  '{"secretKey": "sk_live_...", "publishableKey": "pk_live_...", "webhookSecret": "whsec_..."}'
);
```

---

## Sécurité

### PCI Compliance

✅ **Conformité PCI DSS:**

- Aucun numéro de carte complet stocké
- Seulement last4, brand, expiration
- Utilisation de Stripe Elements (iframe sécurisé)
- Tokens Stripe pour les transactions
- Webhooks vérifiés par signature

### Protection des Données

- Client secrets temporaires (24h max)
- Chiffrement des credentials dans `service_api_configs`
- Vérification des permissions (companyId)
- Logs de toutes les opérations

---

## Monitoring et Maintenance

### Logs à Surveiller

```sql
-- Logs de synchronisation récents
SELECT * FROM stripe_sync_logs
ORDER BY created_at DESC
LIMIT 20;

-- Échecs de synchronisation
SELECT * FROM stripe_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Cartes expirées
SELECT c.name, pm.card_last4, pm.expires_at
FROM payment_methods pm
JOIN companies c ON c.id = pm.company_id
WHERE pm.expires_at < NOW()
  AND pm.is_active = true;
```

### Métriques

- Nombre de cartes actives par entreprise
- Taux de succès des synchronisations
- Temps moyen de synchronisation
- Nombre de cartes expirées

---

## Dépannage

### Problème: "Stripe credentials not configured"

**Solution:**

1. Vérifier `service_api_configs` pour Stripe
2. Ajouter les credentials si manquants
3. Vérifier les clés API dans le dashboard Stripe

### Problème: "User is not associated with a company"

**Solution:**

L'utilisateur doit avoir un `companyId` pour gérer les cartes.

### Problème: Webhook signature verification failed

**Solution:**

1. Vérifier que le webhook secret est correct
2. S'assurer que le body de la requête n'est pas modifié
3. Vérifier les logs Stripe pour les détails

### Problème: Carte non affichée après ajout

**Solution:**

1. Vérifier les logs de webhook
2. Déclencher une synchronisation manuelle
3. Vérifier la table `payment_methods`

---

## Migration depuis Lago

Pour migrer les cartes existantes de Lago vers Stripe Direct:

```typescript
// Script de migration (à créer)
import { syncAllCompanies } from '@/lib/stripe-sync'

async function migrate() {
  // 1. Pour chaque entreprise avec lagoId
  // 2. Créer un customer Stripe
  // 3. Synchroniser les cartes depuis Lago/Stripe
  // 4. Mettre à jour les références

  await syncAllCompanies()
}

migrate()
```

---

## État de Synchronisation au 18 Février 2026

### ✅ Synchronisé / Fonctionnel

| Élément | Direction | Mécanisme |
|---|---|---|
| Création Customer Stripe | NeoSaaS → Stripe | `ensureStripeCustomer()` |
| Profil complet (nom, email, adresse, SIRET, TVA, writers) | NeoSaaS → Stripe | `updateStripeCustomerMetadata()` — appelé automatiquement à chaque sync |
| Cartes de paiement | Stripe → NeoSaaS | `syncCompanyPaymentMethods()` |
| Cartes (temps réel) | Stripe → NeoSaaS | Webhook `payment_method.*` |
| Import customers existants | Stripe → NeoSaaS | `POST /api/stripe/sync/customers` |
| Push companies non liées | NeoSaaS → Stripe | `POST /api/stripe/sync/customers` |
| Import subscriptions | Stripe → NeoSaaS | `POST /api/stripe/sync/subscriptions` |
| Subscriptions (temps réel) | Stripe → NeoSaaS | Webhook `customer.subscription.*` |
| Factures payées → Orders | Stripe → NeoSaaS | Webhook `invoice.paid` |

### ❌ Non Encore Synchronisé

| Élément | Situation | Priorité | Action Requise |
|---|---|---|---|
| **Webhook secret** | Non configuré | 🔴 CRITIQUE | Configurer dans Stripe Dashboard + Admin > API Manager |
| **Produits Stripe** | 0 produit (aucun push depuis NeoSaaS) | 🟡 IMPORTANT | Créer manuellement OU implémenter push |
| **Invoices Stripe** | 0 facture (besoin du webhook ou paiements réels) | 🟡 IMPORTANT | Configurer webhook en priorité |
| **Données réelles** | 1 seul customer test en Stripe | 🟡 IMPORTANT | Lancer sync après config webhook |

### 🔄 Prochaines Étapes (ordonnées)

1. **[🔴 CRITIQUE]** Configurer le webhook Stripe :
   - URL : `https://[domaine]/api/stripe/webhook`
   - Événements : les 11 listés dans la section webhook ci-dessus
   - Sauvegarder le `whsec_...` dans Admin > API Management > Stripe
   - Référence : `docs/STRIPE_WEBHOOK_SETUP.md`

2. **[🟡 IMPORTANT]** Lancer le premier import complet (depuis Payment Settings) :
   - `POST /api/stripe/sync/customers` (`direction: "both"`)
   - `POST /api/stripe/sync/subscriptions`

3. **[🟡 IMPORTANT]** Créer les produits dans Stripe Dashboard pour pouvoir générer des subscriptions et invoices

4. **[🟢 FUTUR]** Implémenter la création automatique de produits Stripe depuis les produits NeoSaaS

5. **[🟢 FUTUR]** Cron job pour synchronisation automatique quotidienne (`syncAllCompanies()`)

6. **[🟢 FUTUR]** Notifications email pour cartes expirées

7. **[🟢 FUTUR]** Support SEPA Direct Debit (moyens de paiement alternatifs)

8. **[🟢 FUTUR]** Gestion des remboursements et disputes

---

## Références

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Elements](https://stripe.com/docs/stripe-js)
- [Setup Intents](https://stripe.com/docs/payments/setup-intents)
- [Webhooks](https://stripe.com/docs/webhooks)
- [PCI Compliance](https://stripe.com/docs/security/guide)

---

## 📅 Changelog

### [19 février 2026] — Fix DB critique : table `payment_methods` absente en production + cleanup Lago

**Problème identifié** : La table `payment_methods` n'existait **pas** dans la base Neon de production malgré les 3 migrations marquées comme appliquées dans `__drizzle_migrations`. Toutes les tentatives de sauvegarde de carte échouaient avec un `TypeError: Cannot convert undefined or null to object` dans Drizzle ORM.

**Cause** : Un `reset-db.ts` ou reset manuel a supprimé la table après que `__drizzle_migrations` ait enregistré la migration 0000. Le runner de migrations `scripts/migrate.ts` voit la migration comme "déjà appliquée" et la saute.

**Actions** :
1. Table `payment_methods` recréée directement dans Neon avec toutes colonnes, FK et index
2. Colonnes Lago orphelines supprimées (`lago_id`, `plan_code`, `lago_invoice_id`, `lago_transaction_id`) — devaient être supprimées par migration 0002 mais encore présentes
3. `db-ensure-columns.ts` enrichi d'une section `REQUIRED_TABLES` — crée `payment_methods` avec `CREATE TABLE IF NOT EXISTS` si absente (filet de sécurité pour les prochains déploiements)
4. `confirmPaymentMethodAdded` : `companyId` rechargé depuis la DB (plus de dépendance au JWT potentiellement stale)
5. `getUserCompanyId` : syntaxe Drizzle corrigée (`users.id` au lieu de `db.query.users.id`)

**Fichiers modifiés** :
- `app/actions/stripe-payments.ts` — `getUserCompanyIdFromDB`, fix `confirmPaymentMethodAdded`
- `scripts/db-ensure-columns.ts` — ajout `REQUIRED_TABLES` avec `payment_methods`

---

### [19 février 2026] — Fix critique : liaison carte → entreprise + champ Nom du titulaire

**Problème identifié** : L'ajout d'une carte de paiement depuis le module `/dashboard/payment-methods` ne
associait **pas** la carte à l'entreprise en base de données. Deux bugs critiques :

1. **`StripeCardFormAuto.handleSuccess`** importait `confirmPaymentMethodAdded` mais **ne l'appelait jamais**.
   La carte était confirmée côté Stripe (attachée au customer entreprise via le SetupIntent) mais jamais
   sauvegardée en BDD avec le `companyId`. Le webhook `payment_method.attached` pouvait compenser si
   configuré, mais le secret webhook n'est pas encore actif — résultat : aucune trace en BDD.

2. **`CardFormInner.handleSubmit`** ne récupérait pas l'ID du PaymentMethod depuis `setupIntent.payment_method`
   et ne le transmettait pas au callback `onSuccess`.

**Solution** :
- `CardFormInner` reçoit maintenant `onSuccess(paymentMethodId: string)` et extrait le PM ID depuis
  `setupIntent.payment_method` après `stripe.confirmCardSetup`.
- `StripeCardFormAuto.handleSuccess(pmId)` appelle désormais `confirmPaymentMethodAdded(pmId)` qui :
  1. Récupère le PM depuis Stripe API
  2. Sauvegarde en BDD avec `user.companyId` (lien entreprise garanti)
  3. Définit comme carte par défaut si c'est la première
  4. Stamp les métadonnées Stripe (writer, company)
- État `confirming` ajouté dans `StripeCardFormAuto` pour afficher un loader pendant la sauvegarde.

**Champ « Nom du titulaire » ajouté** :
- Nouveau champ `holderName` obligatoire dans `CardFormInner`
- Transmis à Stripe via `billing_details.name` dans `confirmCardSetup`
- Stocké dans `payment_methods.holder_name` (champ existant dans le schéma)
- Visible dans le Stripe Dashboard sur la PM
- Le bouton "Save Card" est désactivé si le champ est vide

**Règle métier B2B confirmée** :
> Le customer Stripe = l'entreprise (`company.stripeCustomerId`).
> Toute carte enregistrée par un utilisateur est **liée à son entreprise**, pas à son compte personnel.
> Si l'utilisateur change d'entreprise, il accède aux cartes de la nouvelle entreprise.

**Fichiers modifiés** :
- `components/dashboard/stripe-card-form.tsx` — fix handleSuccess, ajout holderName, types onSuccess
- `components/dashboard/add-payment-method-dialog.tsx` — description mise à jour (contexte B2B)

---

---

## 📅 Changelog

### [2026-02-20] — Audit Doublons & Corrections Critiques (v3.2)
- **[Bug critique — doublons orders]** : Le webhook `invoice.paid` créait un 2ème order en doublon à chaque paiement par invoice. Cause : recherche par `orderNumber = invoice.id`, alors que `processCheckout` crée les orders avec un nanoid et stocke l'`invoiceId` dans la colonne `paymentIntentId`. Fix : recherche via `or(paymentIntentId = invoice.id, orderNumber = invoice.id)` — met à jour l'order existant si trouvé, crée seulement si introuvable (invoices Stripe manuelles).
- **[Schema — relations manquantes]** : `companiesRelations` ne déclarait pas `subscriptions`. Ajout de `subscriptions: many(subscriptions)` + création de `subscriptionsRelations` (relation inverse `subscription → company`).
- **[Dépréciation]** : `createStripePayment` dans `stripe-payments.ts` marquée `@deprecated` — ancienne implémentation PaymentIntent nu, remplacée par `createStripeInvoicePayment`.
- **[Fichiers modifiés]** : `app/api/stripe/webhook/route.ts`, `db/schema.ts`, `app/actions/stripe-payments.ts`
- **[Impact]** : Zéro doublons d'orders via webhook. Requêtes Drizzle `companies → subscriptions` opérationnelles.

### [2026-02-20] — Facturation Stripe Invoice + Gestion Abonnements
- **[Facturation Stripe Invoice]** : Remplacement de `createStripePayment` (PaymentIntent nu) par `createStripeInvoicePayment` (InvoiceItems → Invoice → finalize → pay). Les achats one-time génèrent maintenant de vraies factures Stripe avec PDF téléchargeable.
- **[Fichiers modifiés]** : `app/actions/payments.ts`, `app/actions/ecommerce.ts`
- **[Impact]** : Les factures sont visibles dans `/invoices` Stripe et dans le dashboard utilisateur. Les PDFs sont téléchargeables directement.
- **[Gestion abonnements]** : Ajout de `getCompanySubscriptions`, `cancelSubscription`, `resumeSubscription`, `pauseSubscription`, `unpauseSubscription` dans `app/actions/payments.ts`
- **[Persistance abonnements]** : Après création d'un abonnement Stripe, une entrée est maintenant insérée dans la table `subscriptions` avec `customerId = company.id`
- **[Dashboard payments]** : Refonte complète de `app/(private)/dashboard/payments/page.tsx` — section abonnements actifs avec menu pause/résiliation/reprise, tableau factures avec téléchargement PDF, badges de statut colorés, dialogue de confirmation d'annulation.

**Document créé le:** 2026-02-10
**Dernière mise à jour:** 2026-02-20
**Auteur:** Claude AI
**Version:** 3.1 — Stripe Invoice API + Gestion Abonnements Dashboard
