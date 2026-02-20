# Plan d'Intégration Stripe - Paiement Direct par Entreprise

**Date:** 2026-02-10
**Objectif:** Implémenter un modèle de paiement Stripe en parallèle de Lago, où les cartes sont associées aux entreprises (companies) plutôt qu'aux utilisateurs.

---

## Vue d'Ensemble

### Architecture Actuelle
- **Lago:** Système de facturation principal
- **Stripe via Lago:** Les cartes sont gérées via le customer portal Lago
- **Association:** Les cartes sont actuellement associées aux utilisateurs via Lago customers

### Architecture Cible
- **Lago:** Continue de gérer la facturation (factures, abonnements)
- **Stripe Direct:** Gestion directe des cartes de paiement via l'API Stripe
- **Association:** Les cartes sont associées aux entreprises (companies)
- **Customer Stripe:** Chaque entreprise = 1 customer Stripe
- **Métadonnées:** Les users (writers) de l'entreprise sont stockés dans les métadonnées du customer

---

## Modifications du Schéma de Base de Données

### 1. Table `payment_methods` (Nouvelle)

Stocke les moyens de paiement (cartes) associés aux entreprises.

```typescript
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  // Stripe identifiers
  stripePaymentMethodId: text("stripe_payment_method_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull(),

  // Card details (non-sensitive)
  type: text("type").notNull().default("card"), // 'card', 'sepa_debit', etc.
  cardBrand: text("card_brand"), // 'visa', 'mastercard', etc.
  cardLast4: text("card_last4"), // Last 4 digits
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardCountry: text("card_country"),

  // Status
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // Metadata
  holderName: text("holder_name"), // Cardholder name
  billingAddress: jsonb("billing_address"), // Billing address details
  metadata: jsonb("metadata"), // Additional Stripe metadata

  // Added by user
  addedBy: uuid("added_by").references(() => users.id),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"), // Last sync with Stripe
  expiresAt: timestamp("expires_at"), // Computed from exp_month/exp_year
})
```

### 2. Modification de la table `companies`

Ajouter des champs pour stocker le customer Stripe et les tokens.

```typescript
// Ajouts à la table companies:
stripeCustomerId: text("stripe_customer_id").unique(), // Stripe Customer ID
stripeSetupIntentClientSecret: text("stripe_setup_intent_client_secret"), // Pour ajouter des cartes
stripeDefaultPaymentMethod: text("stripe_default_payment_method"), // ID de la carte par défaut
```

### 3. Table `stripe_sync_logs` (Nouvelle - optionnelle)

Pour tracker les synchronisations avec Stripe.

```typescript
export const stripeSyncLogs = pgTable("stripe_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  syncType: text("sync_type").notNull(), // 'full', 'cards', 'customer'
  status: text("status").notNull(), // 'success', 'failed', 'partial'
  cardsAdded: integer("cards_added").default(0),
  cardsUpdated: integer("cards_updated").default(0),
  cardsRemoved: integer("cards_removed").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

---

## Modifications du Code

### 1. Fichiers à Créer

#### `lib/stripe-customers.ts`
Gestion des customers Stripe (création, mise à jour, récupération).

```typescript
/**
 * Créer ou récupérer un customer Stripe pour une entreprise
 */
export async function ensureStripeCustomer(companyId: string): Promise<StripeCustomer>

/**
 * Mettre à jour les métadonnées d'un customer Stripe
 */
export async function updateStripeCustomerMetadata(customerId: string, metadata: any): Promise<void>

/**
 * Récupérer un customer Stripe
 */
export async function getStripeCustomer(customerId: string): Promise<StripeCustomer>
```

#### `lib/stripe-payment-methods.ts`
Gestion des moyens de paiement.

```typescript
/**
 * Récupérer toutes les cartes d'une entreprise depuis Stripe
 */
export async function getCompanyPaymentMethods(companyId: string): Promise<PaymentMethod[]>

/**
 * Créer un Setup Intent pour ajouter une nouvelle carte
 */
export async function createSetupIntent(companyId: string): Promise<SetupIntent>

/**
 * Attacher une carte à un customer Stripe
 */
export async function attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<void>

/**
 * Détacher/supprimer une carte
 */
export async function detachPaymentMethod(paymentMethodId: string): Promise<void>

/**
 * Définir une carte comme carte par défaut
 */
export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>
```

#### `lib/stripe-sync.ts`
Synchronisation des cartes depuis Stripe vers la base de données.

```typescript
/**
 * Synchroniser toutes les cartes d'une entreprise depuis Stripe
 */
export async function syncCompanyPaymentMethods(companyId: string): Promise<SyncResult>

/**
 * Synchroniser toutes les entreprises (tâche planifiée)
 */
export async function syncAllCompanies(): Promise<SyncResult[]>
```

#### `app/actions/stripe-payments.ts`
Actions serveur pour gérer les paiements Stripe.

```typescript
/**
 * Récupérer les cartes d'une entreprise
 */
export async function getCompanyCards(companyId?: string)

/**
 * Ajouter une nouvelle carte
 */
export async function addPaymentMethod(paymentMethodId: string)

/**
 * Supprimer une carte
 */
export async function removePaymentMethod(paymentMethodId: string)

/**
 * Définir une carte par défaut
 */
export async function setDefaultCard(paymentMethodId: string)

/**
 * Créer un paiement avec Stripe
 */
export async function createStripePayment(amount: number, metadata: any)
```

### 2. Fichiers à Modifier

#### `app/actions/payments.ts`
Ajouter la logique pour utiliser Stripe directement au lieu de Lago customer portal.

```typescript
// Nouvelle fonction
export async function getStripePaymentMethods() {
  // Récupérer les cartes depuis la table payment_methods
  // Au lieu de les récupérer depuis Lago
}

// Modifier
export async function getCustomerPortalUrl() {
  // Rediriger vers une page interne de gestion des cartes
  // Au lieu du portal Lago
}
```

#### `app/actions/ecommerce.ts` (processCheckout)
Modifier pour utiliser Stripe directement lors du checkout.

```typescript
// Dans processCheckout():
// 1. Récupérer la carte par défaut de l'entreprise
// 2. Créer un PaymentIntent Stripe
// 3. Confirmer le paiement
// 4. Enregistrer dans Lago (optionnel - pour la facturation)
```

#### `components/dashboard/credit-card-sheet.tsx`
Interface pour gérer les cartes.

```typescript
// Modifier pour:
// 1. Afficher les cartes depuis payment_methods
// 2. Utiliser Stripe Elements pour ajouter une carte
// 3. Appeler les nouvelles actions stripe-payments
```

### 3. Routes API à Créer

#### `app/api/stripe/customers/route.ts`
```typescript
// POST - Créer un customer Stripe pour une entreprise
// GET - Récupérer un customer Stripe
// PATCH - Mettre à jour un customer Stripe
```

#### `app/api/stripe/payment-methods/route.ts`
```typescript
// GET - Liste des cartes d'une entreprise
// POST - Ajouter une nouvelle carte
// DELETE - Supprimer une carte
// PATCH - Définir carte par défaut
```

#### `app/api/stripe/setup-intent/route.ts`
```typescript
// POST - Créer un Setup Intent pour ajouter une carte
```

#### `app/api/stripe/sync/route.ts`
```typescript
// POST - Déclencher une synchronisation manuelle
// GET - Statut de la dernière synchronisation
```

#### `app/api/stripe/webhook/route.ts`
```typescript
// POST - Recevoir les webhooks Stripe
// Events: payment_method.attached, payment_method.detached, etc.
```

---

## Flux de Données

### 1. Création d'un Customer Stripe (Entreprise)

```
1. Entreprise créée dans NeoSaaS
   ↓
2. Trigger: createStripeCustomer()
   ↓
3. API Stripe: POST /v1/customers
   - email: company.email
   - name: company.name
   - metadata: {
       neosaas_company_id: company.id,
       siret: company.siret,
       vat_number: company.vatNumber,
       writers: [user1.id, user2.id], // Users avec rôle writer
       address: {...}
     }
   ↓
4. Stockage: companies.stripeCustomerId = customer.id
   ↓
5. Synchronisation initiale: syncCompanyPaymentMethods()
```

### 2. Ajout d'une Carte

```
1. User clique "Ajouter une carte"
   ↓
2. Création Setup Intent
   API: POST /v1/setup_intents
   - customer: stripeCustomerId
   ↓
3. Affichage Stripe Elements (frontend)
   - CardElement
   - confirmSetup()
   ↓
4. Stripe confirme et attache la carte
   Webhook: payment_method.attached
   ↓
5. Synchronisation automatique
   - Récupérer les détails de la carte
   - INSERT INTO payment_methods
   ↓
6. Affichage dans l'interface
```

### 3. Paiement avec Stripe

```
1. User finalise checkout
   ↓
2. Récupération carte par défaut
   SELECT * FROM payment_methods
   WHERE company_id = ? AND is_default = true
   ↓
3. Création PaymentIntent
   API: POST /v1/payment_intents
   - amount: total * 100 (centimes)
   - currency: "eur"
   - customer: stripeCustomerId
   - payment_method: defaultCardId
   - confirm: true
   ↓
4. Paiement confirmé
   Webhook: payment_intent.succeeded
   ↓
5. Création facture Lago (optionnel)
   - Enregistrer le paiement externe
   - Garder la cohérence facturation
   ↓
6. Création commande NeoSaaS
   - Status: paid
   - Payment provider: stripe
   - Payment intent ID
```

### 4. Synchronisation Périodique

```
Cron Job (toutes les 1h ou quotidien)
   ↓
Pour chaque entreprise avec stripeCustomerId:
   ↓
1. API Stripe: GET /v1/payment_methods
   - customer: stripeCustomerId
   - type: card
   ↓
2. Comparaison avec payment_methods table
   ↓
3. Mise à jour:
   - Nouvelles cartes → INSERT
   - Cartes expirées → UPDATE is_active = false
   - Cartes supprimées → DELETE ou soft delete
   ↓
4. Log dans stripe_sync_logs
```

---

## Sécurité

### 1. Tokens Sécurisés

- **Setup Intent Client Secret:** Stocké temporairement dans `companies.stripeSetupIntentClientSecret`
- **Durée de vie:** 24h maximum
- **Nettoyage:** Supprimé après utilisation ou expiration

### 2. Webhooks

- **Signature Verification:** Vérifier `stripe-signature` header
- **Endpoint Secret:** Stocké dans `service_api_configs` (chiffré)
- **IP Whitelist:** Optionnel - restreindre aux IPs Stripe

### 3. PCI Compliance

- **Aucune donnée sensible stockée:** Seulement last4, brand, exp_month, exp_year
- **Stripe Elements:** Utiliser pour la saisie de carte (iframe Stripe)
- **Tokens:** Jamais de numéros de carte complets dans notre système

---

## Configuration Stripe

### Variables d'Environnement (Fallback)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Base de Données (Préféré)

Stocker dans `service_api_configs`:

```json
{
  "serviceName": "stripe",
  "environment": "production",
  "config": {
    "secretKey": "sk_live_...",
    "publishableKey": "pk_live_...",
    "webhookSecret": "whsec_..."
  }
}
```

---

## Interface Utilisateur

### 1. Page de Gestion des Cartes (`/dashboard/payment-methods`)

**Pour les Writers:**
- Liste des cartes de l'entreprise
- Ajouter une nouvelle carte
- Supprimer une carte
- Définir une carte par défaut
- Voir les informations de carte (last4, brand, expiration)

**Components:**
- `<CardList />` - Liste des cartes
- `<AddCardButton />` - Bouton pour ajouter
- `<StripeCardForm />` - Formulaire avec Stripe Elements
- `<CardItem />` - Item de carte avec actions

### 2. Admin Dashboard (`/admin/payments/stripe`)

**Pour les Admins:**
- Liste de toutes les entreprises avec customers Stripe
- Voir les cartes de chaque entreprise
- Déclencher une synchronisation manuelle
- Voir les logs de synchronisation
- Statistiques (nombre de cartes, taux d'expiration, etc.)

---

## Migration

### Étapes de Migration

1. **Phase 1: Préparation**
   - Créer les nouvelles tables
   - Déployer le nouveau code (désactivé)
   - Tester en environnement de test

2. **Phase 2: Migration des Données**
   - Pour chaque entreprise avec un Lago customer:
     - Créer un customer Stripe
     - Synchroniser les cartes depuis Lago/Stripe
     - Stocker dans payment_methods

3. **Phase 3: Activation Progressive**
   - Activer pour quelques entreprises test
   - Vérifier les paiements
   - Monitorer les erreurs

4. **Phase 4: Migration Complète**
   - Activer pour toutes les entreprises
   - Rediriger les flux de paiement vers Stripe direct
   - Garder Lago pour la facturation

### Script de Migration

```typescript
// scripts/migrate-to-stripe-customers.ts

async function migrateCompanyToStripe(companyId: string) {
  // 1. Récupérer l'entreprise et ses users
  // 2. Créer customer Stripe
  // 3. Synchroniser les cartes
  // 4. Mettre à jour la base de données
  // 5. Logger les résultats
}

async function migrateAll() {
  const companies = await db.query.companies.findMany({
    where: eq(companies.lagoId, not(null))
  })

  for (const company of companies) {
    await migrateCompanyToStripe(company.id)
  }
}
```

---

## Tests

### Tests Unitaires

- `lib/stripe-customers.test.ts`
- `lib/stripe-payment-methods.test.ts`
- `lib/stripe-sync.test.ts`
- `app/actions/stripe-payments.test.ts`

### Tests d'Intégration

- Créer un customer Stripe
- Ajouter une carte (mode test)
- Effectuer un paiement (mode test)
- Synchroniser les cartes
- Recevoir un webhook

### Tests E2E

- Flow complet d'ajout de carte
- Flow complet de checkout avec Stripe
- Gestion des erreurs (carte refusée, etc.)

---

## Monitoring

### Métriques à Suivre

1. **Synchronisations**
   - Nombre de syncs par jour
   - Taux de succès
   - Durée moyenne

2. **Paiements**
   - Nombre de paiements Stripe
   - Taux de succès
   - Montant total

3. **Cartes**
   - Nombre de cartes actives
   - Nombre de cartes expirées
   - Nombre de cartes par entreprise

4. **Erreurs**
   - Erreurs API Stripe
   - Erreurs de webhook
   - Échecs de synchronisation

---

## Rollback Plan

En cas de problème majeur:

1. **Désactiver les nouveaux flux**
   - Feature flag: `ENABLE_STRIPE_DIRECT = false`
   - Retour au customer portal Lago

2. **Conserver les données**
   - Ne pas supprimer les tables
   - Garder les logs pour analyse

3. **Communication**
   - Informer les utilisateurs
   - Fournir un délai de résolution

---

## Documentation

### Fichiers à Créer/Mettre à Jour

- `docs/STRIPE_INTEGRATION.md` - Documentation complète
- `docs/STRIPE_API_REFERENCE.md` - Référence API
- `docs/STRIPE_MIGRATION_GUIDE.md` - Guide de migration
- `README.md` - Mettre à jour avec les nouvelles features

---

## Timeline Estimée

| Phase | Tâche | Durée |
|-------|-------|-------|
| 1 | Modifications du schéma DB | 1-2h |
| 2 | Création des fonctions Stripe (lib/) | 3-4h |
| 3 | Actions serveur (app/actions/) | 2-3h |
| 4 | Routes API | 2-3h |
| 5 | Interface utilisateur | 3-4h |
| 6 | Webhooks et synchronisation | 2-3h |
| 7 | Tests | 3-4h |
| 8 | Migration des données | 2-3h |
| 9 | Documentation | 2h |
| **Total** | | **20-28h** |

---

## Prochaines Étapes

1. ✅ Valider ce plan avec l'équipe
2. ⏳ Créer les modifications du schéma
3. ⏳ Implémenter les fonctions Stripe de base
4. ⏳ Créer les actions serveur
5. ⏳ Développer l'interface utilisateur
6. ⏳ Tester en environnement de développement
7. ⏳ Migrer les données existantes
8. ⏳ Déployer en production

---

**Document créé le:** 2026-02-10
**Dernière mise à jour:** 2026-02-10
**Statut:** En cours d'implémentation
