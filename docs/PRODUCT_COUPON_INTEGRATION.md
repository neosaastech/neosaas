# 🎟️ Système de Coupons de Réduction Intégré aux Produits

## Vue d'ensemble

Le formulaire de création/modification de produit dispose maintenant d'une section dédiée à la gestion des coupons de réduction. Cette intégration permet de créer et gérer des coupons directement depuis la fiche produit.

## Fonctionnalités

### 1. Section "Discount Coupons"

Une nouvelle section apparaît dans le formulaire de modification de produit (uniquement pour les produits existants) qui permet :

- **Créer rapidement des coupons** spécifiques au produit
- **Visualiser tous les coupons** applicables au produit
- **Gérer les coupons** (copier, supprimer)

### 2. Création de Coupon Simplifié

Lors de la création d'un coupon depuis la fiche produit, celui-ci est automatiquement configuré pour s'appliquer uniquement à ce produit.

#### Champs du formulaire :

| Champ | Description | Requis |
|-------|-------------|---------|
| **Coupon Code** | Code unique du coupon (ex: SUMMER2024) | ✅ Oui |
| **Discount Type** | Pourcentage ou montant fixe | ✅ Oui |
| **Discount Value** | Valeur de la réduction (% ou €) | ✅ Oui |
| **Usage Limit** | Nombre maximum d'utilisations | ❌ Non |
| **Description** | Description du coupon | ❌ Non |
| **Start Date** | Date de début de validité | ❌ Non |
| **End Date** | Date d'expiration | ❌ Non |

#### Exemple de création :

```typescript
// Un coupon créé depuis un produit est automatiquement lié à ce produit
{
  code: "SUMMER2024",
  discountType: "percentage",
  discountValue: 20, // 20%
  applicableProducts: ["product-id"], // Automatiquement défini
  isActive: true
}
```

### 3. Affichage des Coupons Existants

La section affiche tous les coupons qui s'appliquent au produit :
- Coupons créés spécifiquement pour ce produit
- Coupons globaux (sans restriction de produit)

Pour chaque coupon, on affiche :
- **Code** avec bouton de copie
- **Type et valeur** de la réduction
- **Statistiques d'utilisation** (utilisé X/Y fois)
- **Date d'expiration** si configurée
- **Description** si présente
- **Bouton de suppression**

## Interface Utilisateur

### Position dans le formulaire

La section "Discount Coupons" apparaît :
- ✅ Après les toggles "Published" et "Most Popular"
- ✅ Avant le bouton "Create/Update Product"
- ✅ Uniquement pour les produits existants (après sauvegarde)

### Design

- **Couleur** : Gradient ambre/orange (`bg-gradient-to-br from-amber-50 to-orange-50`)
- **Icône** : Ticket (`<Ticket />`)
- **État collapsed/expanded** : Le formulaire de création s'affiche/masque via un bouton "Create Coupon"

### Pour les nouveaux produits

Un message informatif s'affiche :
```
💡 Save the product first to create discount coupons.
```

## Workflow de Création

### 1. Modifier un produit existant
```
Admin Panel → Products → Edit Product
```

### 2. Accéder à la section "Discount Coupons"
- Scroll jusqu'à la section avec l'icône de ticket
- Cliquer sur "Create Coupon" pour afficher le formulaire

### 3. Remplir le formulaire
```typescript
Code: "WELCOME20"
Type: Percentage
Value: 20%
Usage Limit: 100
Description: "Welcome discount for new customers"
End Date: 31/12/2024
```

### 4. Créer le coupon
- Cliquer sur "Create Coupon"
- Le coupon est automatiquement lié au produit
- Il apparaît dans la liste des coupons

### 5. Gérer les coupons
- **Copier le code** : Cliquer sur l'icône de copie
- **Supprimer** : Cliquer sur l'icône de corbeille (avec confirmation)

## Code Technique

### Imports nécessaires
```typescript
import { getCoupons, upsertCoupon, deleteCoupon } from "@/app/actions/coupons"
import { Ticket, Plus, Check, Copy, Trash } from "lucide-react"
```

### États React
```typescript
const [coupons, setCoupons] = useState<any[]>([])
const [showCouponForm, setShowCouponForm] = useState(false)
const [couponLoading, setCouponLoading] = useState(false)
const [copiedCode, setCopiedCode] = useState<string | null>(null)
const [couponFormData, setCouponFormData] = useState({
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
})
```

### Chargement automatique
```typescript
useEffect(() => {
  const loadCoupons = async () => {
    if (!initialData?.id) return
    
    const result = await getCoupons()
    if (result.success && result.data) {
      // Filtrer les coupons applicables à ce produit
      const productCoupons = result.data.filter((coupon: any) => {
        if (!coupon.applicableProducts) return true // Tous produits
        const applicableIds = coupon.applicableProducts as string[]
        return applicableIds.includes(initialData.id)
      })
      setCoupons(productCoupons)
    }
  }
  loadCoupons()
}, [initialData?.id])
```

### Fonction de création
```typescript
const handleCreateCoupon = async (e: React.FormEvent) => {
  e.preventDefault()
  
  const result = await upsertCoupon({
    code: couponFormData.code,
    description: couponFormData.description || null,
    discountType: couponFormData.discountType,
    discountValue: discountValue,
    // ... autres champs
    applicableProducts: [initialData.id], // Lié au produit actuel
    isActive: true,
  })
  
  // Recharger la liste des coupons
  // ...
}
```

## Avantages

✅ **Création rapide** : Plus besoin d'aller dans la section Coupons séparée  
✅ **Contexte clair** : Le coupon est automatiquement lié au produit  
✅ **Vue d'ensemble** : Voir tous les coupons applicables en un coup d'œil  
✅ **Gestion simplifiée** : Copier/Supprimer directement depuis la fiche produit  
✅ **Pas de doublon** : Impossible de créer un coupon avec un code existant  

## Gestion Avancée

Pour une gestion plus avancée des coupons (coupons multi-produits, exclusions, etc.), utilisez la section dédiée :

```
Admin Panel → Coupons
```

Cette section permet :
- Créer des coupons applicables à plusieurs produits
- Définir des exclusions de produits
- Configurer des limites par utilisateur
- Voir les statistiques d'utilisation détaillées

## Validation

### Règles de validation

1. **Code unique** : Le code du coupon doit être unique dans la base
2. **Valeur positive** : La valeur de réduction doit être > 0
3. **Pourcentage max** : Si type = percentage, max = 100%
4. **Dates cohérentes** : startDate < endDate si les deux sont renseignées
5. **Produit existant** : Le produit doit être sauvegardé avant de créer des coupons

### Messages d'erreur

| Erreur | Message |
|--------|---------|
| Produit non sauvegardé | "Please save the product first before creating coupons" |
| Code dupliqué | "Failed to create coupon" (depuis l'API) |
| Valeur invalide | Validation HTML native (min/max) |

## Exemples d'utilisation

### Exemple 1 : Promotion saisonnière
```
Code: SUMMER24
Type: Percentage
Value: 15%
Usage Limit: 200
End Date: 31/08/2024
Description: "Summer promotion - 15% off"
```

### Exemple 2 : Coupon de bienvenue
```
Code: WELCOME10
Type: Fixed Amount
Value: 10.00€
Usage Limit: -
End Date: -
Description: "Welcome gift for new customers"
```

### Exemple 3 : Vente flash limitée
```
Code: FLASH50
Type: Percentage
Value: 50%
Usage Limit: 50
Start Date: 15/01/2026
End Date: 15/01/2026
Description: "Flash sale - 24h only!"
```

## Intégration avec le Checkout

Les coupons créés via cette interface fonctionnent exactement comme ceux créés dans la section Coupons :

1. Le client entre le code au checkout
2. Le système vérifie la validité (dates, limites, produits applicables)
3. La réduction est appliquée au panier
4. L'utilisation est enregistrée dans `coupon_usage`

Voir [UPSELL_COUPON_SYSTEM.md](./UPSELL_COUPON_SYSTEM.md) pour plus de détails sur le fonctionnement complet du système de coupons.

## Tests

### Liste de vérification

- [ ] Créer un nouveau produit → message informatif affiché
- [ ] Sauvegarder le produit → section coupons accessible
- [ ] Créer un coupon → apparaît dans la liste
- [ ] Copier le code → notification "copied to clipboard"
- [ ] Supprimer un coupon → disparaît de la liste
- [ ] Code dupliqué → erreur affichée
- [ ] Coupon global → apparaît dans la liste
- [ ] Refresh page → coupons toujours affichés

## Améliorations futures

Possibilités d'évolution :

- [ ] **Édition en ligne** : Modifier un coupon directement depuis la fiche produit
- [ ] **Statistiques** : Graphique d'utilisation du coupon
- [ ] **Templates** : Modèles de coupons pré-configurés
- [ ] **Bulk create** : Créer plusieurs coupons d'un coup
- [ ] **Preview** : Voir l'impact du coupon sur le prix
- [ ] **Notifications** : Alertes quand un coupon expire bientôt

---

**Fichier modifié** : `app/(private)/admin/products/product-form.tsx`  
**Date** : Janvier 2026  
**Version** : 1.0
