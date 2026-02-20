# Stripe — Suivi de Développement & État de Synchronisation

**Date** : 18 Février 2026
**Auteur** : Documentation System
**Statut Global** : 🟡 Connecté (Test) | 🔴 Webhook non configuré | 🔴 Aucune donnée réelle synchronisée

---

## 🎯 Rappel Architectural

> **Règle fondamentale NeoSaaS** :
> Le Customer Stripe = l'**Entreprise** (`company`), jamais l'utilisateur.
>
> - `company.name` → `Customer.name` ✅ (vérifié dans le code)
> - `company.email` → `Customer.email` ✅
> - Les `users` ne sont référencés que dans `metadata.writer_user_emails`
>   (liste des utilisateurs autorisés à gérer les cartes de la company)

---

## 📊 État de Synchronisation au 18/02/2026

### Données dans Stripe (mode Test)

| Donnée | Quantité | Commentaire |
|---|---|---|
| Customers | 1 | 1 customer test |
| Products | 0 | Aucun produit créé |
| Subscriptions | 0 | Aucun abonnement actif |
| Invoices | 0 | Aucune facture |
| Balance | 0.00 EUR | Compte test vide |

### Données dans NeoSaaS (DB locale)

| Table | État |
|---|---|
| `companies.stripeCustomerId` | La plupart à NULL (non liées) |
| `payment_methods` | Vide (aucune carte synchronisée) |
| `subscriptions` | Données locales non issues de Stripe |
| `orders` | Commandes locales sans lien Stripe |
| `stripe_sync_logs` | Vide (pas de sync effectuée) |

---

## 🔄 Journal des Syncs Effectuées

| Date | Type | Direction | Résultat |
|---|---|---|---|
| 18/02/2026 | Customers | NeoSaaS → Stripe | 0 créés, 0 erreurs (aucune company unlinked ?) |
| — | Import customers | Stripe → NeoSaaS | Non encore exécuté |
| — | Import subscriptions | Stripe → NeoSaaS | Non encore exécuté |
| — | Sync cartes | Stripe → NeoSaaS | Non encore exécuté |

> **Observation** : Le résultat "0 créés" lors du push NeoSaaS → Stripe peut indiquer :
> - Soit toutes les companies sont déjà liées
> - Soit il n'y a pas encore de companies dans la base locale
> → Vérifier la table `companies` et la valeur de `stripeCustomerId`

---

## 🔌 Configuration Stripe Actuelle

| Paramètre | Valeur | Statut |
|---|---|---|
| Mode | Test / Sandbox | ✅ |
| Secret Key | Configurée (`sk_test_...`) | ✅ |
| Publishable Key | Configurée (`pk_test_...`) | ✅ |
| Webhook Secret | **Non configuré** | 🔴 BLOQUANT |
| Webhook URL | `/api/stripe/webhook` | ✅ code prêt |
| Connexion API | 5/5 checks OK | ✅ |

---

## 🔴 Points Bloquants

### 1. Webhook Secret manquant — CRITIQUE

**Impact** : Sans webhook secret, NeoSaaS ne reçoit aucun événement Stripe en temps réel.
Conséquences :
- Les cartes ajoutées dans Stripe ne se synchronisent pas
- Les paiements confirmés ne créent pas d'orders en DB
- Les subscriptions créées dans Stripe ne sont pas enregistrées

**Action** : Voir `docs/STRIPE_WEBHOOK_SETUP.md` pour la procédure.

### 2. Aucun Produit dans Stripe

**Impact** : Impossible de créer des subscriptions ou invoices depuis Stripe.
**Action** : Créer les produits manuellement dans le Dashboard Stripe :
- Dashboard → Products → Add product
- Définir les prix (mensuel, annuel, etc.)
- Récupérer les `price_id` (format `price_xxx`) pour les associer aux plans NeoSaaS

### 3. Vérifier le mapping companies ↔ Stripe Customers

**Question ouverte** : Pourquoi "0 créés" lors du push NeoSaaS → Stripe ?

**À vérifier** :
```sql
-- Combien de companies existent ?
SELECT COUNT(*) FROM companies;

-- Combien ont un stripeCustomerId ?
SELECT COUNT(*) FROM companies WHERE stripe_customer_id IS NOT NULL;

-- Lesquelles n'ont pas de stripeCustomerId ?
SELECT id, name, email FROM companies WHERE stripe_customer_id IS NULL;
```

---

## ✅ Checklist d'Activation Complète

### Étape 1 — Webhook (PRIORITÉ 1)
- [ ] Créer l'endpoint dans Stripe Dashboard (test mode)
- [ ] Sélectionner les 11 événements (voir `STRIPE_WEBHOOK_SETUP.md`)
- [ ] Copier le `whsec_...` dans Admin > API Management > Stripe
- [ ] Vérifier réception via Stripe Dashboard > Recent Deliveries

### Étape 2 — Synchronisation initiale
- [ ] Cliquer "Full bidirectional sync" dans Payment Settings (customers)
- [ ] Cliquer "Import from Stripe" (subscriptions)
- [ ] Vérifier la liste customers dans Payment Settings (Load Customers)
- [ ] Vérifier les logs : Admin > System Logs > catégorie `stripe`

### Étape 3 — Créer données de test Stripe
- [ ] Créer 1 produit dans Stripe Dashboard
- [ ] Créer 1 subscription de test avec la carte `4242 4242 4242 4242`
- [ ] Vérifier que le webhook `customer.subscription.created` est reçu
- [ ] Vérifier que la table `subscriptions` est mise à jour
- [ ] Vérifier que `invoice.paid` crée bien un `order` en DB

### Étape 4 — Validation
- [ ] Au moins 1 company avec `stripeCustomerId` en DB
- [ ] Au moins 1 carte dans `payment_methods`
- [ ] Au moins 1 subscription dans `subscriptions` issue de Stripe
- [ ] Webhook recent deliveries → tous en HTTP 200
- [ ] Badge Stripe "connected" visible dans l'Overview admin

---

## 🛠️ Endpoints de Sync Disponibles

```bash
# Vérifier le statut de la connexion Stripe
GET /api/admin/payments/test-stripe?mode=test

# Stats des companies liées/non liées
GET /api/stripe/sync/customers

# Import customers depuis Stripe (Stripe → NeoSaaS)
POST /api/stripe/sync/customers
Body: { "direction": "stripe_to_neosaas" }

# Push companies non liées vers Stripe (NeoSaaS → Stripe)
POST /api/stripe/sync/customers
Body: { "direction": "neosaas_to_stripe" }

# Sync bidirectionnel complet
POST /api/stripe/sync/customers
Body: { "direction": "both" }

# Stats subscriptions
GET /api/stripe/sync/subscriptions

# Import subscriptions depuis Stripe
POST /api/stripe/sync/subscriptions

# Sync cartes d'une company
POST /api/stripe/sync
Body: { "syncAll": false }

# Sync cartes de toutes les companies
POST /api/stripe/sync
Body: { "syncAll": true }
```

---

## 📁 Fichiers Clés

| Fichier | Rôle | Modifié le |
|---|---|---|
| `lib/stripe-customers.ts` | Création/update Customer Stripe | 10/02/2026 |
| `lib/stripe-payment-methods.ts` | Gestion cartes | 10/02/2026 |
| `lib/stripe-sync.ts` | Moteur sync (cartes + customers + subscriptions) | **18/02/2026** |
| `app/api/stripe/webhook/route.ts` | Handler 11 événements | 17/02/2026 |
| `app/api/stripe/sync/route.ts` | Sync cartes | 10/02/2026 |
| `app/api/stripe/sync/customers/route.ts` | Sync customers bidirectionnel | **18/02/2026** |
| `app/api/stripe/sync/subscriptions/route.ts` | Sync subscriptions | **18/02/2026** |
| `components/admin/payment-settings.tsx` | UI sync + test connexion | **18/02/2026** |
| `components/admin/dashboard-stats.tsx` | Badge statut + bouton sync | **18/02/2026** |
| `app/(private)/admin/invoices/page.tsx` | Page factures (lien Overview fixé) | **18/02/2026** |

---

## 📝 Historique des Modifications

### 18 Février 2026
- ✅ Ajout de `syncStripeCustomersFromStripe()` dans `lib/stripe-sync.ts`
- ✅ Ajout de `syncStripeSubscriptionsFromStripe()` dans `lib/stripe-sync.ts`
- ✅ Création de `POST /api/stripe/sync/customers` (bidirectionnel)
- ✅ Création de `GET /api/stripe/sync/customers` (stats)
- ✅ Création de `POST /api/stripe/sync/subscriptions`
- ✅ Création de `GET /api/stripe/sync/subscriptions`
- ✅ Ajout section "Data Synchronization" dans `PaymentSettings` (boutons Import/Push/Both)
- ✅ Ajout badge statut Stripe + bouton sync rapide dans `DashboardStats` (Overview)
- ✅ Création page `/admin/invoices` (lien mort corrigé)
- ✅ Confirmation : `company.name` utilisé (pas user name) dans Customer Stripe

### 17 Février 2026
- ✅ Webhook handler étendu à 11 événements (subscription.*, invoice.*)
- ✅ Interface Payment Settings : Admin Lookup Stripe Customers
- ✅ Endpoint `GET /api/admin/payments/stripe-customers`

### 10 Février 2026
- ✅ Implémentation initiale Stripe Direct
- ✅ `lib/stripe-customers.ts`, `lib/stripe-payment-methods.ts`, `lib/stripe-sync.ts`
- ✅ Webhooks basiques (payment_method.*, customer.updated, payment_intent.*)

---

*Dernière mise à jour : 18 Février 2026*
