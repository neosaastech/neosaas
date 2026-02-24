# Documentation du Tunnel d'Achat (Checkout Flow)

**Dernière mise à jour:** 20 février 2026  
**Statut:** ✅ Architecture unifiée - Un seul processCheckout() avec paiement Stripe Invoice intégré  
**Payment processor:** Stripe Direct (mode test/live piloté depuis `/admin`)

## ⚠️ Notes Importantes

### Architecture Checkout (8 janvier 2026)

**Version Unique Active:**
- 📁 **Fichier:** `app/actions/ecommerce.ts`
- 🎯 **Fonction:** `processCheckout(cartId, appointmentsData?)`
- ✅ **Utilisée par:**
  - Frontend: `app/(private)/dashboard/checkout/page.tsx`
  - API: `app/api/checkout/route.ts` (corrigé le 8/01/2026)
  - Tests: `app/api/test/checkout/route.ts`

**Doublons Supprimés:**
- ❌ `lib/checkout/checkout-service.ts` (supprimé - 815 lignes code mort)
- ❌ `lib/checkout/team-notifications.ts` (supprimé - 767 lignes orphelin)

📝 **Voir:** [AUDIT_DOUBLONS_COMPLET_2026-01-08.md](./AUDIT_DOUBLONS_COMPLET_2026-01-08.md)

---

## Vue d'ensemble

Le tunnel d'achat permet aux utilisateurs authentifiés de finaliser leurs commandes avec un paiement **Stripe direct**.

> ⚠️ **Lago a été retiré (16 fév. 2026).** Les sections de ce document qui référencent Lago (`getLagoClient`, `lago.customers.create`, etc.) sont **legacy**. Le flux actuel utilise **Stripe Direct** avec mode test/live piloté depuis `/admin` → Payment Config. Voir [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md).

> ⚠️ **Note (itération 16 fév. 2026)** : Lago a été retiré de cette version. Les sections “Intégration Lago” présentes plus bas doivent être considérées comme **legacy** tant qu'elles n'ont pas été nettoyées.

## Flux Utilisateur

```
┌─────────────────┐
│  Browse Products│
│  (/dashboard)   │
└────────┬────────┘
         │ Click "Add to Cart"
         ▼
┌─────────────────┐
│   Cart Page     │
│ (/dashboard/cart)│
│                 │
│ - View items    │
│ - Update qty    │
│ - Remove items  │
│ - See total     │
└────────┬────────┘
         │ Click "Passer la commande"
         ▼
┌─────────────────┐
│  Checkout Page  │
│(/dashboard/checkout)
│                 │
│ - Billing info  │
│ - Appointment   │
│   slot selection│
│ - Payment method│
│ - Order summary │
└────────┬────────┘
         │ Click "Payer" / "Valider" (DEV mode)
         ▼
┌─────────────────┐
│  processCheckout│
│  Server Action  │
│                 │
│ app/actions/    │
│ ecommerce.ts    │
│                 │
│ - Create order  │
│ - Create items  │
│ - Stripe payment│
│   (one-time/sub)│
│ - Create appts  │
│ - Sync calendar │
│ - Send emails   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Confirmation   │
│      Page       │
│                 │
│ - Order summary │
│ - Product type  │
│   specific msgs │
│ - Download links│
│   (digital)     │
│ - Appointments  │
│   details       │
│ - Email sent ✓  │
└─────────────────┘
```

## Pages du Système

### 1. Page Panier (`/dashboard/cart`)

**Fichier:** `app/(private)/dashboard/cart/page.tsx`

**Fonctionnalités:**
- ✅ Affichage de tous les articles du panier
- ✅ Modification de la quantité (boutons +/-)
- ✅ Suppression d'articles
- ✅ Calcul en temps réel (sous-total, TVA, total)
- ✅ Badge panier dans le header
- ✅ Navigation vers le checkout

**Actions disponibles:**
- `updateCartItemQuantity(productId, quantity)` - Modifier la quantité
- `removeFromCart(productId)` - Supprimer un article
- `getCart()` - Charger le panier

**État vide:**
- Message "Votre panier est vide"
- Bouton "Découvrir nos produits" → `/dashboard`

---

### 2. Page Checkout (`/dashboard/checkout`)

**Fichier:** `app/(private)/dashboard/checkout/page.tsx`

**Sections:**

#### A. Informations de Facturation (Auto-remplies)
- ✅ Nom complet (depuis le profil utilisateur)
- ✅ Email (depuis le profil utilisateur)
- ✅ Entreprise (si renseignée)
- ✅ Bouton "Modifier mes informations" → `/dashboard/settings`

**Source des données (cascade):**
```typescript
// 1. Try localStorage first (cached)
localStorage.getItem("userProfile")

// 2. Try API fetch from /api/user/profile
const res = await fetch('/api/user/profile')

// 3. Fallback values for DEV mode
{ name: "Utilisateur", email: "Non renseigné", company: undefined }
```

**Aucun champ de saisie** - Les informations sont affichées en lecture seule.

#### B. Méthode de Paiement
Affichage dynamique selon la configuration Lago:

**Mode DEV:**
- Message "Mode Développement" - Lago désactivé
- Pas de sélection de méthode de paiement
- Bouton "Valider la commande (Test)"

**Mode TEST/PRODUCTION:**
- ✅ Carte bancaire (via Stripe) - si `lago_stripe_enabled`
- ✅ PayPal - si `lago_paypal_enabled`
- Sélection visuelle avec highlight
- Bouton "Payer X€"

#### C. Récapitulatif de Commande
- Liste des articles
- Quantités
- Prix unitaires
- Sous-total
- TVA (20%)
- Total
- Badge "Paiement sécurisé"

---

### 3. Header avec Icône Panier

**Fichier:** `components/layout/private-dashboard/header.tsx`

**Fonctionnalités:**
- ✅ Icône panier (`ShoppingCart`)
- ✅ Badge avec nombre d'articles
- ✅ Animation lors de l'ajout au panier
- ✅ Lien vers `/dashboard/cart`
- ✅ Masqué si panier vide

**Code:**
```tsx
{itemCount > 0 && (
  <Link href="/dashboard/cart">
    <Button variant="ghost" size="icon" className="relative">
      <ShoppingCart className="h-5 w-5" />
      <span className="badge">{itemCount}</span>
    </Button>
  </Link>
)}
```

---

## Architecture du Flux Technique

### 1. Ajout au Panier
```typescript
// Action: addToCart(productId, quantity)
// Fichier: app/actions/ecommerce.ts

1. Vérifier si l'utilisateur est connecté
2. Si oui: lier le panier à l'utilisateur (userId)
3. Si non: créer un panier cookie (cartCookie)
4. Rechercher le produit dans la DB
5. Créer/Mettre à jour cart_items
6. Revalider les caches (/cart, /dashboard/cart)
7. Retourner le panier mis à jour
```

### 2. Gestion du Panier (Cart Page)
```typescript
// Actions disponibles:
// - getCart() - Charger le panier complet
// - updateCartItemQuantity(productId, quantity) - Modifier une quantité
// - removeFromCart(productId) - Supprimer un article

// Fichier: app/(private)/dashboard/cart/page.tsx

1. Charger le panier via getCart()
2. Afficher les articles avec images, prix, quantités
3. Calculer sous-total, TVA (20%), total
4. Permettre modification de quantité (+/-)
5. Permettre suppression d'articles (icône poubelle)
6. Bouton "Passer la commande" → /dashboard/checkout
```

**Fonctions du panier:**

#### A. `updateCartItemQuantity(productId, quantity)`
```typescript
// Met à jour la quantité d'un article
// Si quantity < 1 → supprime l'article
// Revalide les caches automatiquement
```

#### B. `removeFromCart(productId)`
```typescript
// Supprime un article du panier
// Gère les paniers utilisateur ET cookie
// Revalide /cart et /dashboard/cart
```

### 3. Processus de Checkout
```
┌─────────────────────────────────────────┐
│  CHECKOUT PAGE (/dashboard/checkout)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  1. CHARGEMENT AUTOMATIQUE DES DONNÉES  │
├─────────────────────────────────────────┤
│  • userInfo depuis localStorage         │
│  • Cart items via getCart()             │
│  • Customer Lago existant?              │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. AFFICHAGE INFORMATIONS              │
├─────────────────────────────────────────┤
│  BLOC: Informations de Facturation      │
│  • Nom (read-only)                      │
│  • Email (read-only)                    │
│  • Entreprise (read-only si existe)     │
│  • Lien "Modifier" → /dashboard/settings│
│                                          │
│  BLOC: Méthode de Paiement              │
│  • Radio buttons (Carte / PayPal)       │
│  • Badge "Paiement sécurisé"            │
│                                          │
│  BLOC: Récapitulatif                    │
│  • Liste articles + quantités           │
│  • Sous-total                           │
│  • TVA 20%                              │
│  • Total TTC                            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. CLIC SUR "Payer maintenant"         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  ACTION: processCheckout(cartId,        │
│          appointmentsData?)              │
├─────────────────────────────────────────┤
│  Étape 1: Authentification              │
│  • Vérifier session utilisateur         │
│  • Récupérer userId                     │
│                                          │
│  Étape 2: Chargement Panier             │
│  • getCart() → items + produits         │
│  • Calculer totalAmount                 │
│                                          │
│  Étape 3: Coupon (optionnel)             │
│  • validateCoupon(code, userId, total)  │
│  • Appliquer la réduction               │
│                                          │
│  Étape 4: Créer Order dans DB           │
│  • INSERT INTO orders                   │
│  • paymentStatus = "pending"            │
│  • totalAmount (après coupon)           │
│                                          │
│  Étape 5: Order Items (DB)              │
│  • Pour chaque cart item:               │
│    - INSERT INTO order_items            │
│    - License keys générés (digital)     │
│                                          │
│  Étape 6: Paiement Stripe 💳           │
│  • Si totalAmount <= 0 ou isFree:       │
│    → paymentStatus = "paid" (gratuit)   │
│  • Si paymentType = "hourly":           │
│    → paymentStatus = "pending" (différé)│
│  • Si paymentType = "subscription":     │
│    → createStripeSubscription()         │
│    → Retourne clientSecret si 3DS       │
│  • Si one_time (physical/digital):      │
│    → createStripePayment()              │
│    → Charge immédiate via carte défaut  │
│    → paymentStatus = "paid" si OK       │
│  • Si échec → paymentStatus = "failed"  │
│    → Return errorCode + message         │
│                                          │
│  Étape 7: Admin Notifications           │
│  • notifyAdminNewOrder()                │
│  • notifyAdminPhysicalProductsToShip()  │
│  • notifyClientDigitalProductAccess()   │
│                                          │
│  Étape 8: Créer Rendez-vous (DB)        │
│  • Si appointmentsData fourni:          │
│    - Validation serveur des créneaux    │
│    - INSERT INTO appointments           │
│    - sendAllAppointmentNotifications()  │
│                                          │
│  Étape 9: Emails Confirmation Commande  │
│  • emailRouter.sendEmail({ template })  │
│  • 1 email par type de produit :        │
│    - order_confirmation_physical        │
│    - order_confirmation_digital         │
│    - order_confirmation_subscription    │
│    - order_confirmation (fallback)      │
│  • + payment_confirmation (toujours)    │
│                                          │
│  Étape 10: Coupon Usage + Cart Convert  │
│  • recordCouponUsage() si coupon        │
│  • UPDATE carts SET converted = true    │
│  • revalidatePath("/cart", "/orders")   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. REDIRECTION                         │
├─────────────────────────────────────────┤
│  • Toujours vers:                       │
│    → /dashboard/checkout/confirmation?  │
│      orderId=xxx                        │
│                                          │
│  • Sur la page de confirmation:         │
│    - Récapitulatif commande             │
│    - Liste des produits                 │
│    - Liste des rendez-vous créés ✨     │
│    - Message "Emails envoyés" ✨        │
│                                          │
│  • Toast: "Commande validée !"          │
│  • Emails envoyés automatiquement ✨    │
│                                          │
│  • Si erreur: reste sur /checkout       │
│  • Toast: message d'erreur              │
└─────────────────────────────────────────┘
```

---

## Actions Serveur (Server Actions)

### `addToCart(productId, quantity)`
**Fichier:** `app/actions/ecommerce.ts`

**Logique:**
1. Vérifier utilisateur (session ou cookie)
2. Récupérer le produit depuis la DB
3. Créer/mettre à jour le panier
4. Ajouter/mettre à jour cart_items
5. Revalider caches
6. Retourner le panier

**Logs:**
- ✅ "Adding to cart - productId: X, quantity: Y"
- ✅ "Cart item added/updated"
- ✅ "Product not found"
- ❌ Erreurs d'authentification

---

### `updateCartItemQuantity(productId, quantity)`
**Fichier:** `app/actions/ecommerce.ts`

**Logique:**
1. Vérifier utilisateur
2. Charger le panier actif
3. Si quantity < 1 → appeler removeFromCart()
4. Sinon → UPDATE cart_items SET quantity
5. Revalider /cart et /dashboard/cart

**Retour:**
- `{ success: true, cart }` si réussi
- `{ success: false, error }` si échec

---

### `removeFromCart(productId)`
**Fichier:** `app/actions/ecommerce.ts`

**Logique:**
1. Vérifier utilisateur
2. Charger le panier actif
3. DELETE FROM cart_items WHERE productId
4. Revalider caches

**Retour:**
- `{ success: true, cart }` si réussi
- `{ success: false, error }` si échec

---

### `getCart()`
**Fichier:** `app/actions/ecommerce.ts`

**Logique:**
1. Vérifier utilisateur (userId ou cartCookie)
2. Charger cart avec items et produits associés
3. Exclure les paniers convertis
4. Retourner null si vide

**Retour:**
```typescript
{
  id: string,
  items: [
    {
      id: string,
      quantity: number,
      product: {
        id: string,
        name: string,
        price: number,
        image: string,
        description: string
      }
    }
  ]
}
```

---

### `processCheckout()`
**Fichier:** `app/actions/ecommerce.ts`

**Points de Log (60+ logs):**
- ✅ Authentification utilisateur
- ✅ Chargement du panier
- ✅ Création customer Lago
- ✅ Création add-ons
- ✅ Création invoice
- ✅ Création order DB
- ✅ Envoi email
- ✅ Conversion panier
- ❌ Toutes les erreurs possibles

**Retour:**
- `{ success: true, orderId, invoiceUrl }` si réussi
- `{ success: false, error }` si échec

---

## Schéma de Base de Données

### Table `carts`
```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  cart_cookie TEXT,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table `cart_items`
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID REFERENCES carts(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  invoice_id TEXT UNIQUE,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Intégration Lago

### Architecture

L'intégration Lago utilise des **appels HTTP directs** (pas de SDK) via `lagoFetch()`.

**Fichiers principaux :**
- `app/actions/lago-sync.ts` — Synchronisation complète (customers, taxes, plans, add-ons, coupons)
- `app/actions/payments.ts` — Actions de paiement (factures, abonnements, portail)
- `lib/lago.ts` — Configuration (mode, sélection de clé API)
- `lib/lago-utils.ts` — Normalisation d'URL

### Workflow Lago (Checkout)

#### 1. Créer un Customer (via sync ou checkout)
```typescript
// Direct HTTP call
const response = await lagoFetch(apiUrl, apiKey, '/customers', {
  method: 'POST',
  body: JSON.stringify({
    customer: {
      external_id: user.userId,
      email: user.email,
      name: user.email,
      currency: 'EUR',
      billing_configuration: {
        payment_provider: 'stripe',  // si lago_stripe_enabled
        sync_with_provider: true,
      }
    }
  })
})
```

#### 2. Créer une Subscription (produit abonnement)
```typescript
// app/actions/payments.ts
import { createSubscription } from '@/app/actions/payments'

const result = await createSubscription({
  planCode: 'product-uuid-monthly',  // format: {product_id}-{interval}
  externalCustomerId: user.userId,
})
```

#### 3. Créer une Invoice one-time (produit ponctuel)
```typescript
// app/actions/payments.ts
import { createOneTimeInvoice } from '@/app/actions/payments'

const result = await createOneTimeInvoice({
  addOnCode: 'product-uuid',
  description: 'Achat ponctuel',
  units: 1,
  currency: 'EUR',
})
```

#### 4. Enregistrer un paiement PayPal
```typescript
// app/actions/payments.ts
import { recordPaymentInLago } from '@/app/actions/payments'

const result = await recordPaymentInLago({
  invoiceId: 'lago-invoice-id',
  amountCents: 4900,
  reference: 'paypal-transaction-id',
})
```

### Product -> Lago Mapping

| `paymentType` NeoSaaS | Lago Entity | Action de checkout |
|---|---|---|
| `subscription` | Plan | `createSubscription()` |
| `one_time` | Add-on | `createOneTimeInvoice()` |
| `hourly` | Add-on | `createOneTimeInvoice()` |

> Voir [LAGO_CONFIGURATION.md](./LAGO_CONFIGURATION.md) pour la documentation complète de la synchronisation.

---

## Gestion des États

### État du Panier (Cart Context)
**Fichier:** `contexts/cart-context.tsx`

```typescript
const CartContext = createContext({
  itemCount: number,
  refreshCart: () => void
});
```

**Utilisation:**
```typescript
const { itemCount, refreshCart } = useCart();

// Badge dans le header
{itemCount > 0 && <Badge>{itemCount}</Badge>}

// Rafraîchir après modification
await updateCartItemQuantity(productId, newQty);
refreshCart();
```

### État du Checkout
**Fichier:** `app/(private)/dashboard/checkout/page.tsx`

```typescript
const [userInfo, setUserInfo] = useState({
  firstName: '',
  lastName: '',
  email: '',
  company: ''
});

const [cart, setCart] = useState(null);
const [paymentMethod, setPaymentMethod] = useState('card');
const [isProcessing, setIsProcessing] = useState(false);
```

---

## Emails de Confirmation

> **Pipeline** : `processCheckout()` → `emailRouter.sendEmail({ template, data })` → `EmailRouterService.resolveTemplate()` → DB `email_templates` → Scaleway TEM

### Templates par type de produit

| Template DB | Quand | Variables spécifiques |
|-------------|-------|----------------------|
| `order_confirmation_physical` | Panier contient un produit physique | `items`, `total` |
| `order_confirmation_digital` | Panier contient un produit numérique | `items`, `total`, `licenseKey`, `licenseInstructions`, `downloadUrl` |
| `order_confirmation_subscription` | Panier contient un abonnement | `planName`, `billingInterval`, `nextRenewalDate`, `total` |
| `order_confirmation` | Fallback (panier mixte) | `items`, `total` |
| `payment_confirmation` | **Toujours envoyé** en complément | `orderNumber`, `total`, `paymentMethod` |

### Variables communes à tous les templates

- `{{firstName}}` - Prénom de l'utilisateur
- `{{orderNumber}}` - Numéro de commande
- `{{orderDate}}` - Date de commande
- `{{total}}` - Total TTC
- `{{currency}}` - Devise
- `{{items}}` - Liste des articles (JSON)
- `{{actionUrl}}` - Lien vers le détail de commande

### Résolution de template (pipeline)

1. `emailRouter.sendEmail({ template: 'xxx', data: {...} })` est appelé
2. `resolveTemplate()` cherche le template `xxx` dans la table `email_templates`
3. Si trouvé : les placeholders `{{variable}}` sont remplacés par les valeurs de `data`
4. Si pas trouvé : warning dans les logs, l'email est envoyé avec les champs `subject`/`htmlContent` bruts
5. Les champs `from`, `fromName`, `subject` du template DB servent de fallback si non fournis dans le message

**Envoi (code actuel):**
```typescript
await emailRouter.sendEmail({
  to: [user.email],
  template: 'order_confirmation_subscription',
  subject: `Subscription Activated #${orderNumber}`,
  data: {
    firstName: user.name?.split(' ')[0] || 'Customer',
    orderNumber,
    orderDate: new Date().toLocaleDateString(),
    planName: product.title,
    billingInterval: product.paymentType === 'subscription' ? 'month' : 'one_time',
    total: (totalAmount / 100).toFixed(2),
  }
})
```

> **Admin** : Tous les templates sont personnalisables depuis `/admin/mail`.

---

## Étapes Détaillées

### 1. Authentification Utilisateur

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

```typescript
const user = await getCurrentUser()
if (!user) {
  return { success: false, error: "Not authenticated" }
}
```

**Logs:**
- ✅ `[processCheckout] ✅ User authenticated { userId, email }`
- ❌ `[processCheckout] ❌ User not authenticated`

---

### 2. Chargement du Panier

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Récupère le panier actif de l'utilisateur avec tous les items et produits associés.

```typescript
const cart = await db.query.carts.findFirst({
  where: and(
    eq(carts.id, cartId),
    eq(carts.userId, user.id),
    eq(carts.status, "active")
  ),
  with: {
    items: {
      with: {
        product: true
      }
    }
  }
})
```

**Validations:**
- Panier existe
- Panier appartient à l'utilisateur
- Panier contient au moins 1 item

**Logs:**
- ✅ `[processCheckout] ✅ Cart loaded { cartId, itemCount, items }`
- ❌ `[processCheckout] ❌ Cart not found { cartId }`
- ❌ `[processCheckout] ❌ Cart is empty { cartId }`

---

### 3. Initialisation Lago

**Fichier:** `lib/lago.ts` - `getLagoClient()`

Initialise le client Lago avec les credentials depuis la base de données.

```typescript
let lago
try {
  lago = await getLagoClient()
} catch (e) {
  console.warn("Lago not configured, skipping Lago integration")
}
```

**Configuration requise:**
- `lago_api_key` ou `lago_api_key_test` (selon le mode)
- `lago_api_url` (optionnel, défaut: https://api.getlago.com/v1)
- `lago_mode` (production|test)

**Logs:**
- ✅ `[processCheckout] ✅ Lago client initialized successfully`
- ⚠️ `[processCheckout] ⚠️  Lago not configured { error }`

---

### 4. Création/Mise à jour du Customer Lago

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Crée ou vérifie le customer dans Lago avec l'ID utilisateur comme `external_id`.

```typescript
await lago.customers.create({
  customer: {
    external_id: user.id,
    name: user.name || user.email,
    email: user.email,
    currency: "USD"
  }
})
```

**Logs:**
- ✅ `[processCheckout] ✅ Lago customer created { external_id }`
- ℹ️ `[processCheckout] ℹ️  Lago customer already exists { external_id }`

---

### 5. Création des Add-ons Lago

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Pour chaque produit du panier, crée ou vérifie l'add-on correspondant dans Lago.

```typescript
for (const item of cart.items) {
  await lago.addOns.create({
    add_on: {
      name: item.product.title,
      code: item.product.id,
      amount_cents: item.product.price,
      amount_currency: "USD",
      description: item.product.description || undefined
    }
  })
  
  fees.push({
    add_on_code: item.product.id,
    units: item.quantity.toString()
  })
}
```

**Logs:**
- ✅ `[processCheckout] ✅ Add-on created { code, name }`
- ℹ️ `[processCheckout] ℹ️  Add-on already exists { code }`
- ✅ `[processCheckout] ✅ Invoice fees prepared { feeCount }`

---

### 6. Création de l'Invoice Lago

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Crée une invoice dans Lago pour les produits du panier.

```typescript
invoiceResult = await lago.invoices.create({
  invoice: {
    customer: { external_id: user.id },
    currency: "USD",
    fees: fees
  }
})
```

**Erreurs possibles:**
- `customer_has_no_valid_payment_method` → Redirection vers le portal client
- `422 Unprocessable Entity` → Données invalides

**Logs:**
- ✅ `[processCheckout] ✅ Lago invoice created { lago_id, number, total_amount_cents, status }`
- ❌ `[processCheckout] ❌ Lago invoice creation failed { error, status, data }`
- ⚠️ `[processCheckout] ⚠️  Payment method missing { userId }`

**Gestion de l'erreur de paiement:**

```typescript
if (error === "customer_has_no_valid_payment_method") {
  // Redirection vers le portal Lago
  const portalUrl = await lago.customers.getPortalUrl(user.id)
  window.location.href = portalUrl
}
```

---

### 7. Création de la Commande (DB)

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Crée l'enregistrement de commande dans la base de données locale.

```typescript
const [order] = await db.insert(orders).values({
  userId: user.id,
  companyId: user.companyId,
  orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  totalAmount: totalAmount,
  status: "completed",
  paymentStatus: "pending",
  metadata: {
    lago_invoice_id: invoiceResult.data.lago_invoice.lago_id,
    lago_invoice_number: invoiceResult.data.lago_invoice.number
  }
}).returning()
```

**Champs importants:**
- `orderNumber`: Identifiant unique (format: `ORD-{timestamp}-{random}`)
- `totalAmount`: En centimes (ex: 29900 pour 299.00 EUR)
- `status`: État de la commande (completed, pending, cancelled, refunded)
- `paymentStatus`: État du paiement (pending, paid, failed, refunded)
- `metadata`: Données Lago (invoice_id, invoice_number)

**Logs:**
- ✅ `[processCheckout] ✅ Order created { orderId, orderNumber }`
- 💰 `[processCheckout] 💰 Order details { orderNumber, totalAmount, itemCount, hasLagoInvoice }`

---

### 8. Création des Order Items

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Crée les lignes de commande pour chaque produit.

```typescript
for (const item of cart.items) {
  await db.insert(orderItems).values({
    orderId: order.id,
    itemType: "product",
    itemId: item.product.id,
    itemName: item.product.title,
    quantity: item.quantity,
    unitPrice: item.product.price,
    totalPrice: item.product.price * item.quantity
  })
}
```

**Logs:**
- ✅ `[processCheckout] ✅ Order item created { itemName, quantity, unitPrice, totalPrice }`

---

### 9. Création des Rendez-vous (Nouveau) ✨

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Si des données de rendez-vous ont été collectées (`appointmentsData`), création automatique des rendez-vous en base de données.

```typescript
// appointmentsData structure
Record<productId, {
  startTime: Date,
  endTime: Date,
  timezone: string,
  attendeeEmail: string,
  attendeeName: string,
  attendeePhone?: string,
  notes?: string
}>

// Pour chaque produit de type "appointment"
if (appointmentsData && appointmentsData[item.product.id]) {
  const appointmentData = appointmentsData[item.product.id]
  
  const [appointment] = await db.insert(appointments).values({
    id: uuidv4(),
    userId: user.id,
    title: item.product.title,
    startTime: appointmentData.startTime,
    endTime: appointmentData.endTime,
    timezone: appointmentData.timezone,
    attendeeEmail: appointmentData.attendeeEmail,
    attendeeName: appointmentData.attendeeName,
    attendeePhone: appointmentData.attendeePhone,
    notes: appointmentData.notes,
    status: 'confirmed',
    paymentStatus: 'paid',
    metadata: {
      orderId: order.id,           // ← Lien avec la commande
      productId: item.product.id,
      price: item.product.price,
      currency: item.product.currency
    }
  }).returning()
  
  // Envoi des notifications email
  await sendAllAppointmentNotifications({
    appointmentId: appointment.id,
    productTitle: item.product.title,
    startTime: appointmentData.startTime,
    endTime: appointmentData.endTime,
    timezone: appointmentData.timezone,
    attendeeName: appointmentData.attendeeName,
    attendeeEmail: appointmentData.attendeeEmail,
    attendeePhone: appointmentData.attendeePhone,
    price: item.product.price,
    currency: item.product.currency,
    notes: appointmentData.notes,
    userId: user.id
  })
}
```

**Emails envoyés automatiquement:**
1. **Email client** - Confirmation du rendez-vous avec détails
2. **Email admin** - Notification de nouveau rendez-vous
3. **Chat admin** - Notification dans l'interface d'administration

**Logs:**
- ✅ `[processCheckout] ✅ Appointment created { appointmentId, productTitle, startTime }`
- ✅ `[processCheckout] ✅ Appointment notifications sent { clientEmail, adminEmail, adminChat }`

---

### 10. Envoi de l'Email de Confirmation Commande

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Envoie un email de confirmation via le système d'email configuré (Scaleway/Resend).

```typescript
await emailRouter.sendEmail({
  to: [user.email],
  template: "order_confirmation",
  subject: `Order Confirmation #${orderNumber}`,
  data: {
    firstName: user.name?.split(' ')[0] || "Customer",
    orderNumber,
    orderDate: new Date().toLocaleDateString(),
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}`,
    items: cart.items.map(i => ({
      name: i.product.title,
      quantity: i.quantity,
      price: (i.product.price / 100).toFixed(2)
    })),
    total: (totalAmount / 100).toFixed(2)
  }
})
```

**Template requis:** `order_confirmation`

**Logs:**
- ✅ `[processCheckout] ✅ Confirmation email sent successfully`
- ❌ `[processCheckout] ❌ Failed to send order confirmation email { error }`

---

### 11. Conversion du Panier

**Fichier:** `app/actions/ecommerce.ts` - `processCheckout()`

Marque le panier comme converti pour empêcher sa réutilisation.

```typescript
await db.update(carts)
  .set({ status: "converted" })
  .where(eq(carts.id, cart.id))
```

**Statuts du panier:**
- `active`: Panier en cours
- `converted`: Converti en commande
- `abandoned`: Abandonné

**Logs:**
- ✅ `[processCheckout] ✅ Cart converted { cartId }`
- 🎉 `[processCheckout] 🎉 Checkout completed { orderId, orderNumber, totalAmount }`

---

## Système de Test

### Script de Test Automatisé

**Fichier:** `scripts/test-checkout-flow.ts`

Script complet pour tester tout le tunnel d'achat.

#### Usage

```bash
# Test complet avec Lago (mode production)
pnpm tsx scripts/test-checkout-flow.ts

# Test avec Lago en mode test
pnpm tsx scripts/test-checkout-flow.ts --mode=test

# Test sans Lago (uniquement DB)
pnpm tsx scripts/test-checkout-flow.ts --skip-lago

# Test sans nettoyage (garder les données)
pnpm tsx scripts/test-checkout-flow.ts --no-cleanup
```

#### Ce que le script teste

1. ✅ **Création/Recherche utilisateur de test**
   - Email: `test-checkout@neosaas.com`
   - Création automatique si inexistant

2. ✅ **Récupération/Création de produits de test**
   - Utilise les produits publiés existants
   - Crée 2 produits de test si aucun n'existe

3. ✅ **Création du panier**
   - Nettoie les anciens paniers actifs
   - Crée un nouveau panier avec les produits

4. ✅ **Intégration Lago (optionnel)**
   - Création customer
   - Création add-ons
   - Création invoice
   - Gestion portal URL si paiement manquant

5. ✅ **Création de la commande**
   - Order record
   - Order items
   - Conversion panier

6. ✅ **Nettoyage (optionnel)**
   - Suppression des commandes de test
   - Suppression des paniers de test

#### Format de sortie

```
🚀 DÉMARRAGE DU TEST DU TUNNEL D'ACHAT
================================================================================

🔍 Étape 1: Recherche/Création utilisateur de test
✅ Recherche utilisateur test
   Utilisateur existant trouvé
   Data: { "userId": "...", "email": "test-checkout@neosaas.com" }

🛍️ Étape 2: Récupération des produits de test
✅ Récupération produits
   2 produit(s) trouvé(s)
   Data: [...]

🛒 Étape 3: Création du panier de test
✅ Création panier
   Panier créé
   Data: { "cartId": "..." }

💳 Étape 4: Test intégration Lago
✅ Connexion Lago
   Client Lago initialisé (mode: production)
✅ Vérification customer Lago
   Customer existant trouvé
...

📊 RÉSUMÉ DU TEST DU TUNNEL D'ACHAT
================================================================================
✅ Succès: 15
❌ Erreurs: 0
⚠️  Warnings: 1
⏭️  Ignorés: 0
================================================================================
✅ TEST RÉUSSI
================================================================================
```

---

## Points de Débogage

### Logs à surveiller

#### Succès complet
```
[processCheckout] 🛒 Starting checkout process
[processCheckout] ✅ User authenticated
[processCheckout] ✅ Cart loaded
[processCheckout] ✅ Lago client initialized
[processCheckout] ✅ Lago customer created
[processCheckout] ✅ Add-on created (x N)
[processCheckout] ✅ Invoice fees prepared
[processCheckout] ✅ Lago invoice created
[processCheckout] ✅ Order created
[processCheckout] ✅ Order item created (x N)
[processCheckout] ✅ Confirmation email sent
[processCheckout] ✅ Cart converted
[processCheckout] 🎉 Checkout completed
```

#### Erreur: Panier vide
```
[processCheckout] 🛒 Starting checkout process
[processCheckout] ✅ User authenticated
[processCheckout] ❌ Cart is empty
```

#### Erreur: Méthode de paiement manquante
```
[processCheckout] 🛒 Starting checkout process
[processCheckout] ✅ User authenticated
[processCheckout] ✅ Cart loaded
[processCheckout] ✅ Lago client initialized
[processCheckout] ✅ Lago customer created
[processCheckout] ✅ Add-on created
[processCheckout] ✅ Invoice fees prepared
[processCheckout] ❌ Lago invoice creation failed
[processCheckout] ⚠️  Payment method missing
```

→ **Action:** Rediriger l'utilisateur vers le portal Lago pour ajouter une carte

#### Erreur: Lago non configuré
```
[processCheckout] 🛒 Starting checkout process
[processCheckout] ✅ User authenticated
[processCheckout] ✅ Cart loaded
[processCheckout] ⚠️  Lago not configured
[processCheckout] ✅ Order created
[processCheckout] 🎉 Checkout completed
```

→ La commande est créée mais sans invoice Lago

---

## Scénarios de Test

### 1. Test Basique (Sans Lago)

**Objectif:** Vérifier la création de commande sans intégration Lago

```bash
pnpm tsx scripts/test-checkout-flow.ts --skip-lago
```

**Résultat attendu:**
- Utilisateur créé/trouvé
- Produits récupérés
- Panier créé
- ⏭️ Lago ignoré
- Commande créée
- Email envoyé
- Nettoyage effectué

---

### 2. Test Complet avec Lago (Mode Test)

**Objectif:** Vérifier l'intégration complète Lago en mode test

```bash
pnpm tsx scripts/test-checkout-flow.ts --mode=test
```

**Pré-requis:**
- Configuration Lago en mode test dans la BD:
  - `lago_mode = 'test'`
  - `lago_api_key_test` configuré

**Résultat attendu:**
- Toutes les étapes réussies
- Customer créé dans Lago (mode test)
- Add-ons créés
- Invoice créée
- Commande créée avec `metadata.lago_invoice_id`

---

### 3. Test avec Méthode de Paiement Manquante

**Objectif:** Simuler l'erreur de paiement manquant

**Setup:**
1. Créer un customer dans Lago sans méthode de paiement
2. Exécuter le test

```bash
pnpm tsx scripts/test-checkout-flow.ts
```

**Résultat attendu:**
- ⚠️ Warning: Payment method missing
- URL du portal générée
- Commande NON créée (échec gracieux)

---

### 4. Test Manuel via UI

**Objectif:** Tester le flux complet depuis l'interface utilisateur

**Étapes:**
1. Se connecter avec un compte utilisateur
2. Ajouter des produits au panier: `/dashboard` → Cliquer "Add to Cart"
3. Accéder au checkout: `/dashboard/checkout`
4. Remplir les informations (pré-remplies depuis le profil)
5. Cliquer "Pay {montant}"

**Vérifications:**
- Logs dans la console navigateur
- Logs serveur (console)
- Email reçu
- Commande visible dans `/orders` (si implémenté)
- Panier vidé après succès

---

## Monitoring en Production

### Métriques à suivre

1. **Taux de succès des checkouts**
   - Ratio: Commandes créées / Tentatives de checkout
   - Objectif: > 95%

2. **Erreurs Lago**
   - Frequency des erreurs `PAYMENT_METHOD_MISSING`
   - Erreurs API Lago (422, 500, etc.)

3. **Performance**
   - Temps moyen de checkout (cible: < 3s)
   - Temps de réponse Lago API (cible: < 1s)

4. **Emails**
   - Taux de livraison emails de confirmation
   - Délai d'envoi

### Dashboard de monitoring (suggestions)

```sql
-- Commandes créées dans les dernières 24h
SELECT COUNT(*) as orders_last_24h
FROM orders
WHERE "createdAt" >= NOW() - INTERVAL '24 hours';

-- Commandes par statut de paiement
SELECT "paymentStatus", COUNT(*)
FROM orders
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "paymentStatus";

-- Montant total des ventes (derniers 30 jours)
SELECT SUM("totalAmount") / 100 as total_revenue_eur
FROM orders
WHERE "createdAt" >= NOW() - INTERVAL '30 days'
  AND status = 'completed';

-- Commandes avec invoice Lago
SELECT COUNT(*) as with_lago, 
       (SELECT COUNT(*) FROM orders) as total
FROM orders
WHERE metadata ? 'lago_invoice_id';
```

---

## Troubleshooting

### Problème: "Cart is empty"

**Causes possibles:**
- L'utilisateur n'a pas ajouté de produits
- Le panier a été vidé entre temps
- Session expirée

**Solution:**
- Vérifier que `addToCart()` a bien été appelé
- Vérifier les logs: `[addToCart] Added product to cart`
- Rediriger vers `/dashboard` ou `/store`

---

### Problème: "Lago not configured"

**Causes:**
- Clés API Lago manquantes dans `platformConfig`
- Mode Lago incorrect
- URL Lago invalide

**Solution:**
1. Vérifier la configuration:
```sql
SELECT * FROM platform_config
WHERE key LIKE 'lago%';
```

2. Ajouter les clés manquantes:
```sql
INSERT INTO platform_config (key, value)
VALUES 
  ('lago_api_key', 'your_key_here'),
  ('lago_mode', 'production'),
  ('lago_api_url', 'https://api.getlago.com/v1');
```

---

### Problème: "Payment method missing"

**Cause:**
- Le customer Lago n'a pas de carte enregistrée

**Solution:**
1. Rediriger l'utilisateur vers le portal Lago
2. L'utilisateur ajoute une carte
3. Réessayer le checkout

**Code (déjà implémenté):**
```typescript
if (result.error === "PAYMENT_METHOD_MISSING") {
  const portalResult = await getCustomerPortalUrl()
  window.location.href = portalResult.url
}
```

---

### Problème: Email non envoyé

**Causes (par ordre de fréquence) :**
1. Template manquant dans la table `email_templates` (ex: `order_confirmation_digital` non seedé)
2. Aucun provider email configuré dans `/admin/api` (Scaleway TEM)
3. Domaine expéditeur non vérifié dans Scaleway
4. Service email down (Scaleway/Resend)

**Diagnostic :**
1. Chercher dans les logs : `Template 'xxx' not found in DB` → le template n'a pas été seedé
2. Chercher : `No email provider available` → configurer Scaleway TEM dans `/admin/api`
3. Vérifier les templates en DB :
```sql
SELECT type, subject, "isActive" FROM email_templates ORDER BY type;
```

4. Re-seeder les templates si manquants :
```bash
pnpm tsx scripts/seed-email-templates-en.ts
```

5. Tester l'envoi depuis `/admin/mail` → « Send Test »

---

## Améliorations Futures

### 1. Support Multi-devises
- Détecter la devise utilisateur
- Convertir les prix dynamiquement
- Synchroniser avec Lago

### 2. Webhooks Lago
- Écouter les événements Lago (payment_succeeded, invoice_created)
- Mettre à jour automatiquement `paymentStatus`
- Envoyer des notifications

### 3. Retry Logic
- Retry automatique en cas d'erreur Lago temporaire
- Exponential backoff
- Circuit breaker

### 4. Taxes/VAT
- Calcul automatique des taxes
- Support multi-juridictions
- Intégration avec Lago Tax

### 5. Analytics
- Tracking des abandons de panier
- Funnel analysis
- A/B testing checkout flow

---

## Références

- [Lago API Documentation](https://doc.getlago.com/api-reference/intro)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- Documentation Email: `docs/EMAIL_SYSTEM_ARCHITECTURE.md`
- Documentation Lago: `docs/LAGO_CONFIGURATION.md`

---

## 📅 Changelog

### [2026-02-20] — Fix complet tunnel Appointment (Lago résiduel + paiement + email)
- **[Bug #1 BLOQUANT]** : `devMode: lagoConfig.mode === 'dev'` (ligne ~1432) causait `ReferenceError` à runtime → supprimé
- **[Bug #2]** : `isPaid = (hourlyRate || 0) > 0` ignorait `price` → corrigé en `price = product.price || product.hourlyRate; isPaid = price > 0`
- **[Bug #3]** : Appointment restait `isPaid: false / paymentStatus: 'pending'` après paiement Stripe → après `db.insert(appointments)`, si `paymentResult.status === 'paid'`, `db.update` avec `isPaid: true, paymentStatus: 'paid', status: 'confirmed', paidAt, stripePaymentIntentId`
- **[Bug #4]** : Aucun email spécifique appointment → branche `else if (hasAppointmentItems)` ajoutée dans step 8 avec date/heure RDV formatée dans le sujet et les items
- **[Fichiers modifiés]** : `app/actions/ecommerce.ts`

### [2026-02-20] — Facturation Stripe Invoice dans processCheckout
- **[Remplacement PaymentIntent → Invoice]** : `processCheckout` dans `app/actions/ecommerce.ts` utilise maintenant `createStripeInvoicePayment` au lieu de `createStripePayment`. Les paiements one-time génèrent de vraies factures Stripe avec PDF.
- **[Fichiers modifiés]** : `app/actions/ecommerce.ts`, `app/actions/payments.ts`
- **[Flux one-time]** : `InvoiceItem` par ligne → `Invoice` (auto_advance false) → `finalize` → `pay` → `invoice_pdf`
- **[Flux si carte absente]** : Invoice créée et finalisée, `paymentStatus = 'pending'`, l'utilisateur peut payer depuis le dashboard via `hosted_invoice_url`
- **[Abonnements]** : Après `createStripeSubscription`, insertion dans la table `subscriptions` avec `customerId = company.id`
