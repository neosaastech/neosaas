# 🚀 Nouvelles Fonctionnalités : Upsell & Coupons

## ✅ Modifications Effectuées

### 1. Schéma de Base de Données (`db/schema.ts`)

#### Ajout du champ Upsell aux produits
```typescript
// products table
upsellProductId: uuid | null  // Référence au produit d'upsell
```

#### Nouvelles tables pour les coupons
```typescript
// coupons - Codes de réduction
coupons {
  id, code, description, discountType, discountValue, 
  currency, minPurchaseAmount, maxDiscountAmount,
  usageLimit, usageCount, perUserLimit,
  startDate, endDate, applicableProducts, excludedProducts,
  isActive, createdBy, createdAt, updatedAt
}

// coupon_usage - Historique d'utilisation
couponUsage {
  id, couponId, userId, orderId, discountAmount, createdAt
}
```

### 2. Actions Serveur (`app/actions/coupons.ts`)

Nouvelles fonctions créées :
- `getCoupons()` - Récupérer tous les coupons
- `getCouponById(id)` - Récupérer un coupon par ID
- `getCouponByCode(code)` - Récupérer un coupon par code
- `validateCoupon(...)` - Valider l'application d'un coupon
- `upsertCoupon(...)` - Créer/Modifier un coupon
- `deleteCoupon(id)` - Supprimer un coupon
- `recordCouponUsage(...)` - Enregistrer l'utilisation

### 3. Interface Admin Coupons

#### Nouveaux fichiers créés :

**`app/(private)/admin/coupons/page.tsx`**
- Page serveur qui charge les données

**`app/(private)/admin/coupons/coupons-page-client.tsx`**
- Composant client avec :
  - 4 cartes statistiques (Total, Actifs, Utilisations, Expirés)
  - Barre de recherche
  - Filtres (All, Active, Expired, Used Up)

**`app/(private)/admin/coupons/coupons-table.tsx`**
- Tableau de gestion des coupons avec :
  - Affichage des coupons (code, description, réduction, usage, validité, statut)
  - Bouton "Copier le code" pour chaque coupon
  - Création/Édition via modal
  - Suppression avec confirmation
  - Gestion des produits applicables/exclus

### 4. Interface de Création de Produits (`products-table.tsx`)

Modifications apportées :

1. **Ajout du champ `upsellProductId` au state :**
```typescript
upsellProductId: string | null
```

2. **Nouveau sélecteur d'upsell** (visible si 2+ produits) :
```tsx
<Select value={upsellProductId}>
  <SelectItem value="none">No upsell</SelectItem>
  {products.map(p => (
    <SelectItem value={p.id}>{p.title} ({price})</SelectItem>
  ))}
</Select>
```

3. **Intégration dans la sauvegarde** :
- Ajout de `upsellProductId` à `productData` lors de la création/modification

### 5. Documentation (`docs/UPSELL_COUPON_SYSTEM.md`)

Documentation complète incluant :
- Vue d'ensemble des deux systèmes
- Schémas de base de données détaillés
- Guide de configuration admin
- Exemples de code pour l'intégration
- Règles de validation des coupons
- Exemples de coupons types
- Checklist d'implémentation
- Personnalisation et améliorations futures

---

## 🔄 Prochaines Étapes pour Migration

### 1. Appliquer le schéma à la base de données

```bash
# Dans le terminal du projet
npm run db:push
```

Cela créera :
- Le champ `upsellProductId` dans la table `products`
- La table `coupons`
- La table `coupon_usage`
- Toutes les relations associées

### 2. Vérifier les migrations

```bash
npm run db:studio
```

Vous devriez voir :
- `products.upsellProductId` (nouveau champ)
- `coupons` (nouvelle table)
- `coupon_usage` (nouvelle table)

### 3. Tester les fonctionnalités

#### Test Upsell :
1. Aller sur `/admin/products`
2. Créer au moins 2 produits
3. Éditer un produit
4. Voir apparaître le sélecteur "Upsell Product"
5. Sélectionner un autre produit comme upsell
6. Sauvegarder

#### Test Coupons :
1. Aller sur `/admin/coupons`
2. Cliquer sur "Add Coupon"
3. Remplir le formulaire :
   - Code : TEST2024
   - Type : Percentage
   - Valeur : 20
   - Limite : 100 utilisations
4. Sauvegarder
5. Vérifier que le coupon apparaît dans la liste

---

## 📋 Intégration dans le Panier (À Faire)

### Étape 1 : Ajouter le champ coupon au panier

Fichier : `app/(private)/dashboard/checkout/page.tsx`

```typescript
const [couponCode, setCouponCode] = useState("")
const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
const [couponError, setCouponError] = useState("")

const handleApplyCoupon = async () => {
  setCouponError("")
  
  const result = await validateCoupon(
    couponCode,
    user?.id || null,
    subtotal,
    cart.items.map(item => item.productId)
  )
  
  if (result.success) {
    setAppliedCoupon(result.data)
    toast.success(`Coupon ${couponCode} appliqué !`)
  } else {
    setCouponError(result.error || "Coupon invalide")
    toast.error(result.error)
  }
}
```

### Étape 2 : Afficher le champ dans l'UI

```tsx
{/* Section coupons */}
<div className="space-y-2 border-t pt-4">
  <Label>Code promo</Label>
  <div className="flex gap-2">
    <Input
      value={couponCode}
      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
      placeholder="SUMMER2024"
      disabled={!!appliedCoupon}
    />
    {appliedCoupon ? (
      <Button
        variant="outline"
        onClick={() => {
          setAppliedCoupon(null)
          setCouponCode("")
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    ) : (
      <Button onClick={handleApplyCoupon}>
        Appliquer
      </Button>
    )}
  </div>
  {couponError && (
    <p className="text-sm text-red-600">{couponError}</p>
  )}
  {appliedCoupon && (
    <p className="text-sm text-green-600">
      ✓ Réduction de {(appliedCoupon.discountAmount / 100).toFixed(2)} € appliquée
    </p>
  )}
</div>
```

### Étape 3 : Afficher la réduction dans le récapitulatif

```tsx
{/* Récapitulatif */}
<div className="space-y-2 border-t pt-4">
  <div className="flex justify-between">
    <span>Sous-total</span>
    <span>{(subtotal / 100).toFixed(2)} €</span>
  </div>
  
  {appliedCoupon && (
    <div className="flex justify-between text-green-600">
      <span>
        Réduction ({appliedCoupon.coupon.code})
      </span>
      <span>
        -{(appliedCoupon.discountAmount / 100).toFixed(2)} €
      </span>
    </div>
  )}
  
  <div className="flex justify-between font-bold text-lg">
    <span>Total</span>
    <span>
      {((appliedCoupon?.finalTotal || subtotal) / 100).toFixed(2)} €
    </span>
  </div>
</div>
```

### Étape 4 : Enregistrer l'utilisation après paiement

Dans `lib/checkout/checkout-service.ts`, après la création de la commande :

```typescript
// Enregistrer l'utilisation du coupon si applicable
if (appliedCoupon) {
  await recordCouponUsage({
    couponId: appliedCoupon.coupon.id,
    userId: userId || null,
    orderId: order.id,
    discountAmount: appliedCoupon.discountAmount
  })
}
```

---

## 🎨 Affichage de l'Upsell dans le Panier (À Faire)

### Option 1 : Suggestion automatique

Lorsqu'un produit avec upsell est ajouté au panier :

```tsx
{cart.items.map(item => {
  const product = products.find(p => p.id === item.productId)
  const upsellProduct = product?.upsellProductId 
    ? products.find(p => p.id === product.upsellProductId)
    : null
  
  return (
    <div key={item.id}>
      {/* Affichage du produit */}
      <CartItem item={item} />
      
      {/* Suggestion d'upsell si non déjà dans le panier */}
      {upsellProduct && !cart.items.some(i => i.productId === upsellProduct.id) && (
        <div className="ml-8 mt-2 p-3 border rounded-lg bg-amber-50">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                Vous pourriez aussi aimer :
              </p>
              <p className="text-sm text-muted-foreground">
                {upsellProduct.title} - {(upsellProduct.price / 100).toFixed(2)} €
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => addToCart(upsellProduct.id)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})}
```

### Option 2 : Section dédiée

En dessous du panier principal :

```tsx
{/* Produits recommandés */}
{recommendedProducts.length > 0 && (
  <div className="mt-6 border-t pt-6">
    <h3 className="font-semibold mb-4">Complétez votre commande</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {recommendedProducts.map(product => (
        <div key={product.id} className="border rounded-lg p-3">
          <div className="flex items-start gap-3">
            {product.imageUrl && (
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">{product.title}</p>
              <p className="text-sm text-muted-foreground">
                {(product.price / 100).toFixed(2)} €
              </p>
            </div>
            <Button size="sm" onClick={() => addToCart(product.id)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

---

## 🔍 Vérifications

### Base de données
- [ ] Schéma `upsellProductId` ajouté à `products`
- [ ] Table `coupons` créée avec tous les champs
- [ ] Table `coupon_usage` créée
- [ ] Relations correctement configurées

### Interface Admin
- [ ] Page `/admin/coupons` accessible
- [ ] Statistiques affichées correctement
- [ ] Création d'un coupon fonctionne
- [ ] Modification d'un coupon fonctionne
- [ ] Suppression d'un coupon fonctionne
- [ ] Sélecteur d'upsell visible dans les produits (si 2+)

### Fonctionnalités
- [ ] Validation des coupons (dates, limites, montants)
- [ ] Copie du code coupon fonctionne
- [ ] Filtres des coupons fonctionnent
- [ ] Recherche de coupons fonctionne

---

## 📊 Résumé des Fichiers Modifiés/Créés

### Modifiés
- ✏️ `db/schema.ts` - Ajout coupons + upsellProductId
- ✏️ `app/(private)/admin/products/products-table.tsx` - Sélecteur upsell

### Créés
- ➕ `app/actions/coupons.ts` - Actions serveur pour coupons
- ➕ `app/(private)/admin/coupons/page.tsx` - Page admin coupons
- ➕ `app/(private)/admin/coupons/coupons-page-client.tsx` - Composant client
- ➕ `app/(private)/admin/coupons/coupons-table.tsx` - Tableau de coupons
- ➕ `docs/UPSELL_COUPON_SYSTEM.md` - Documentation complète

---

## ✨ Prêt pour Production !

Toutes les fonctionnalités backend et admin sont implémentées. Il ne reste plus qu'à :

1. **Migrer la base de données** : `npm run db:push`
2. **Intégrer dans le panier** : Ajouter le champ coupon et les suggestions d'upsell
3. **Tester en conditions réelles** : Créer des coupons test et vérifier le workflow complet

La documentation complète est disponible dans `docs/UPSELL_COUPON_SYSTEM.md` 🎉
