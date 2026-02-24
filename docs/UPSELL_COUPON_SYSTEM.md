# 💼 Système d'Upsell et Coupons de Réduction

## 📋 Vue d'ensemble

Ce document décrit les deux nouvelles fonctionnalités ajoutées au système e-commerce :
1. **Système d'Upsell** - Permet d'associer des produits complémentaires
2. **Système de Coupons** - Permet de créer et gérer des codes de réduction

---

## 🔄 Système d'Upsell

### Concept

Le système d'upsell permet d'associer un produit existant comme "produit supplémentaire optionnel" à un autre produit. Lorsqu'un client ajoute le produit principal au panier, le système peut lui proposer automatiquement le produit d'upsell.

### Schéma de Base de Données

**Table : `products`**
```typescript
{
  upsellProductId: uuid | null  // Référence à un autre produit
}
```

**Relation :**
```typescript
upsellProduct: one(products, {
  fields: [products.upsellProductId],
  references: [products.id],
  relationName: "upsell"
})
```

### Configuration dans l'Admin

#### Où ?
`/admin/products` → Créer/Éditer un produit

#### Interface

La section "Upsell Product" apparaît **uniquement si 2 produits ou plus existent** :

```
┌─────────────────────────────────────┐
│ 💼 Upsell Product (Optional)        │
│ ┌─────────────────────────────────┐ │
│ │ Select: Advanced Support Pack   │ │
│ └─────────────────────────────────┘ │
│ Product shown as optional addition  │
│ in the cart                         │
└─────────────────────────────────────┘
```

#### Options disponibles :
- **No upsell** - Aucun produit d'upsell
- **Liste des produits existants** - Avec titre et prix

**Exemple :**
- Produit principal : "Starter Pack" (99€)
- Upsell : "Premium Support" (49€)

### Workflow Utilisateur

1. **Admin crée un produit** avec upsell configuré
2. **Client ajoute le produit** au panier
3. **Système affiche une suggestion** : "Vous pourriez aussi aimer : Premium Support (+49€)"
4. **Client peut accepter/refuser** l'ajout de l'upsell
5. **Les deux produits** apparaissent dans le panier

### Cas d'Usage

✅ **Bonnes pratiques :**
- Formation de base → Formation avancée
- Pack solo → Pack team
- Produit digital → Support premium
- Consultation 1h → Consultation 3h

❌ **À éviter :**
- Produits concurrents (Starter vs Pro)
- Produits similaires qui se chevauchent
- Boucles circulaires (A→B→A)

---

## 🎟️ Système de Coupons de Réduction

### Concept

Les coupons permettent de créer des codes promotionnels que les clients peuvent utiliser pour obtenir une réduction sur leurs achats.

### Schéma de Base de Données

#### Table : `coupons`

```typescript
{
  id: uuid (PK)
  code: text (unique)                    // Ex: SUMMER2024
  description: text | null               // Description du coupon
  discountType: 'percentage' | 'fixed_amount'
  discountValue: integer                 // Pourcentage ou montant en centimes
  currency: text                         // EUR par défaut
  minPurchaseAmount: integer | null      // Montant minimum en centimes
  maxDiscountAmount: integer | null      // Plafond de réduction en centimes
  usageLimit: integer | null             // Nombre total d'utilisations
  usageCount: integer                    // Utilisations actuelles
  perUserLimit: integer | null           // Limite par utilisateur
  startDate: timestamp | null            // Date de début
  endDate: timestamp | null              // Date d'expiration
  applicableProducts: json | null        // Array d'IDs de produits
  excludedProducts: json | null          // Array d'IDs de produits exclus
  isActive: boolean                      // Actif/Inactif
  createdBy: uuid | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Table : `coupon_usage`

```typescript
{
  id: uuid (PK)
  couponId: uuid (FK → coupons)
  userId: uuid | null (FK → users)
  orderId: uuid | null (FK → orders)
  discountAmount: integer                // Montant réduit en centimes
  createdAt: timestamp
}
```

### Gestion dans l'Admin

#### Page : `/admin/coupons`

**Statistiques :**
- Total Coupons
- Actifs
- Utilisations totales
- Expirés

**Filtres :**
- All
- Active
- Expired
- Used Up

**Actions :**
- Créer un nouveau coupon
- Modifier un coupon
- Supprimer un coupon
- Copier le code

### Types de Réduction

#### 1. Pourcentage (%)

```typescript
{
  discountType: 'percentage',
  discountValue: 20,  // 20%
  maxDiscountAmount: 10000  // Max 100€
}
```

**Calcul :**
```
Panier: 500€
Réduction: 500 × 20% = 100€
Plafond: 100€ (respecté)
Total: 400€
```

#### 2. Montant Fixe (€)

```typescript
{
  discountType: 'fixed_amount',
  discountValue: 1000,  // 10€ (en centimes)
}
```

**Calcul :**
```
Panier: 50€
Réduction: 10€
Total: 40€
```

### Règles de Validation

Le système valide automatiquement :

#### ✅ Statut Actif
```typescript
if (!coupon.isActive) {
  return "This coupon is no longer active"
}
```

#### 📅 Dates de Validité
```typescript
const now = new Date()
if (coupon.startDate && new Date(coupon.startDate) > now) {
  return "This coupon is not yet valid"
}
if (coupon.endDate && new Date(coupon.endDate) < now) {
  return "This coupon has expired"
}
```

#### 🔢 Limites d'Utilisation
```typescript
// Limite globale
if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
  return "This coupon has reached its usage limit"
}

// Limite par utilisateur
if (userUsageCount >= coupon.perUserLimit) {
  return "You have already used this coupon the maximum number of times"
}
```

#### 💰 Montant Minimum
```typescript
if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
  return `Minimum purchase of ${minAmount} € required`
}
```

#### 📦 Produits Applicables/Exclus
```typescript
// Produits spécifiques
if (coupon.applicableProducts) {
  const hasApplicableProduct = productIds.some(id => 
    applicableIds.includes(id)
  )
  if (!hasApplicableProduct) {
    return "This coupon is not valid for the products in your cart"
  }
}

// Produits exclus
if (coupon.excludedProducts) {
  const hasExcludedProduct = productIds.some(id => 
    excludedIds.includes(id)
  )
  if (hasExcludedProduct) {
    return "This coupon cannot be used with some products in your cart"
  }
}
```

### Actions Serveur

#### 📖 Récupérer les coupons
```typescript
import { getCoupons } from "@/app/actions/coupons"

const { success, data } = await getCoupons()
```

#### 🔍 Récupérer par code
```typescript
import { getCouponByCode } from "@/app/actions/coupons"

const { success, data } = await getCouponByCode("SUMMER2024")
```

#### ✅ Valider un coupon
```typescript
import { validateCoupon } from "@/app/actions/coupons"

const result = await validateCoupon(
  code: "SUMMER2024",
  userId: "user-uuid",
  cartTotal: 50000,  // 500€ en centimes
  productIds: ["prod-1", "prod-2"]
)

if (result.success) {
  console.log("Discount:", result.data.discountAmount)
  console.log("Final Total:", result.data.finalTotal)
}
```

#### 💾 Créer/Mettre à jour
```typescript
import { upsertCoupon } from "@/app/actions/coupons"

const result = await upsertCoupon({
  code: "WINTER2024",
  description: "Winter sale - 25% off",
  discountType: "percentage",
  discountValue: 25,
  minPurchaseAmount: 5000,  // 50€
  maxDiscountAmount: 10000,  // 100€
  usageLimit: 100,
  perUserLimit: 1,
  startDate: new Date("2024-12-01"),
  endDate: new Date("2024-12-31"),
  isActive: true
})
```

#### 📝 Enregistrer l'utilisation
```typescript
import { recordCouponUsage } from "@/app/actions/coupons"

await recordCouponUsage({
  couponId: "coupon-uuid",
  userId: "user-uuid",
  orderId: "order-uuid",
  discountAmount: 2500  // 25€ en centimes
})
```

---

## 🔗 Intégration dans le Checkout

### 1. Ajouter un champ coupon dans le panier

```typescript
// Page panier ou checkout
const [couponCode, setCouponCode] = useState("")
const [appliedCoupon, setAppliedCoupon] = useState(null)

const handleApplyCoupon = async () => {
  const result = await validateCoupon(
    couponCode,
    userId,
    cartTotal,
    productIds
  )
  
  if (result.success) {
    setAppliedCoupon(result.data)
    toast.success(`Coupon applied! -${result.data.discountAmount / 100}€`)
  } else {
    toast.error(result.error)
  }
}
```

### 2. Afficher la réduction

```tsx
<div className="space-y-2">
  <div className="flex justify-between">
    <span>Subtotal</span>
    <span>{(cartTotal / 100).toFixed(2)} €</span>
  </div>
  
  {appliedCoupon && (
    <div className="flex justify-between text-green-600">
      <span>Discount ({appliedCoupon.coupon.code})</span>
      <span>-{(appliedCoupon.discountAmount / 100).toFixed(2)} €</span>
    </div>
  )}
  
  <div className="flex justify-between font-bold text-lg">
    <span>Total</span>
    <span>
      {((appliedCoupon?.finalTotal || cartTotal) / 100).toFixed(2)} €
    </span>
  </div>
</div>
```

### 3. Enregistrer après paiement

```typescript
// Dans checkout-service.ts
if (appliedCoupon) {
  await recordCouponUsage({
    couponId: appliedCoupon.coupon.id,
    userId: userId,
    orderId: order.id,
    discountAmount: appliedCoupon.discountAmount
  })
}
```

---

## 📊 Exemples de Coupons

### Black Friday
```typescript
{
  code: "BLACKFRIDAY2024",
  description: "Black Friday - 30% off everything",
  discountType: "percentage",
  discountValue: 30,
  maxDiscountAmount: 50000,  // Max 500€
  startDate: new Date("2024-11-29"),
  endDate: new Date("2024-11-30"),
  usageLimit: 500,
  isActive: true
}
```

### First Purchase
```typescript
{
  code: "WELCOME10",
  description: "Welcome! 10€ off your first order",
  discountType: "fixed_amount",
  discountValue: 1000,  // 10€
  minPurchaseAmount: 5000,  // Min 50€
  perUserLimit: 1,
  isActive: true
}
```

### Product-Specific
```typescript
{
  code: "STARTER50",
  description: "50% off Starter Pack only",
  discountType: "percentage",
  discountValue: 50,
  applicableProducts: ["starter-pack-uuid"],
  usageLimit: 20,
  isActive: true
}
```

---

## 🚀 Migration de la Base de Données

### 1. Créer les tables

```bash
npm run db:push
# ou
npm run db:migrate
```

### 2. Vérifier les schémas

```bash
npm run db:studio
```

Les nouvelles tables seront créées :
- `coupons`
- `coupon_usage`

Le champ `upsellProductId` sera ajouté à `products`.

---

## 🎨 Personnalisation

### Modifier les couleurs des badges de statut

```typescript
// Dans coupons-table.tsx
const getCouponStatus = (coupon: Coupon) => {
  // Personnaliser les couleurs ici
  if (!coupon.isActive) return { 
    label: "Inactive", 
    color: "bg-gray-500" 
  }
  // ...
}
```

### Ajouter des conditions de validation personnalisées

```typescript
// Dans app/actions/coupons.ts → validateCoupon()
// Ajouter vos règles métier spécifiques
if (customCondition) {
  return { success: false, error: "Custom error message" }
}
```

---

## ✅ Checklist d'Implémentation

### Configuration Initiale
- [x] Schéma de base de données créé
- [x] Actions serveur implémentées
- [x] Page admin coupons créée
- [x] Sélecteur upsell ajouté aux produits

### Intégration Checkout
- [ ] Champ coupon dans le panier
- [ ] Validation en temps réel
- [ ] Affichage de la réduction
- [ ] Enregistrement de l'utilisation
- [ ] Proposition d'upsell dans le panier

### Tests
- [ ] Créer un coupon pourcentage
- [ ] Créer un coupon montant fixe
- [ ] Tester les limites d'utilisation
- [ ] Tester les dates de validité
- [ ] Tester les produits applicables/exclus
- [ ] Tester l'upsell dans le panier

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs serveur
2. Vérifier la console navigateur
3. Consulter la documentation Drizzle ORM
4. Tester avec Prisma Studio ou pgAdmin

---

## 🔄 Prochaines Améliorations Possibles

- [ ] Coupons avec conditions météo/localisation
- [ ] Coupons à usage unique (QR code)
- [ ] Génération automatique de codes
- [ ] Système de parrainage
- [ ] Analytics détaillés des coupons
- [ ] Export des données d'utilisation
- [ ] Upsell dynamique basé sur l'historique
- [ ] Cross-sell (plusieurs produits suggérés)
- [ ] Bundle pricing (réduction si achat groupé)
