# Products Details Panel System

## Vue d'ensemble

Le système de **Details Panel** pour les produits permet de gérer complètement les produits (création et modification) directement depuis la page `/admin/products` sans avoir besoin de naviguer vers une page dédiée. Le système utilise des **overlays en cascade** permettant d'accéder à des fonctionnalités additionnelles (comme la gestion des TVA) sans quitter le contexte de création/modification.

## Fonctionnalités

### 1. Création de produits
- **Bouton "Add Product"** en haut à droite de la page
- Ouvre le Details Panel en mode création
- Tous les champs sont éditables
- Validation automatique (titre et prix requis)
- Calcul en temps réel de la TVA
- **Accès direct à la gestion des TVA** sans quitter le panel

### 2. Modification de produits
- Cliquer sur l'icône **Info (i)** dans la colonne Actions
- Le panel s'ouvre en mode lecture
- Cliquer sur **"Edit"** dans la section "Product Details"
- Tous les champs deviennent éditables
- Calcul en temps réel de la TVA
- **Accès direct à la gestion des TVA** sans quitter le panel

### 3. Gestion des TVA intégrée (Overlay Cascade)
- Pendant la création ou modification d'un produit
- Bouton **"Manage VAT"** dans la section Pricing
- Ouvre le dialog de gestion des TVA **par-dessus** le panel produit
- Permet d'ajouter/modifier des taux de TVA
- Retour automatique au panel produit après la fermeture
- Les nouveaux taux sont immédiatement disponibles dans le sélecteur

### 3. Champs éditables

#### Informations générales
- **Title*** (obligatoire) - Titre du produit
- **Description** (optionnelle) - Description détaillée

#### Configuration
- **Product Type** - Standard, Digital, Free ou Appointment
- **Publication Status** - Published (publié) ou Draft (brouillon)

#### Tarification
- **Price (excl. VAT)*** (obligatoire) - Prix HT
- **VAT Rate** (optionnelle) - Taux de TVA applicable

## Interface utilisateur

### Mode Création (nouveau produit)
```
┌─────────────────────────────────┐
│ ➕ New Product                  │
│ Create a new product            │
├─────────────────────────────────┤
│ Product Details                 │
│ ├─ Title *                      │
│ ├─ Description                  │
│ ├─ Product Type                 │
│ └─ Publication Status           │
│                                 │
│ Pricing                         │
│ ├─ Price (excl. VAT) *          │
│ ├─ VAT Rate                     │
│ ├─ VAT (auto-calculated)        │
│ └─ Total (incl. VAT)            │
│                                 │
│ [Create] [Cancel]               │
└─────────────────────────────────┘
```

### Mode Lecture (produit existant)
```
┌─────────────────────────────────┐
│ Product Title          120.00 € │
│ Product details and quick       │
│ actions                         │
├─────────────────────────────────┤
│ Publication Status              │
│ [👁] Published                  │
│                                 │
│ Product Type                    │
│ 📦 Digital                      │
│                                 │
│ VAT Rate                        │
│ 20.00%                          │
│                                 │
│ Pricing              [Edit]     │
│ Price (excl. VAT): 120.00 €     │
│ VAT (20.00%): 24.00 €           │
│ Total (incl. VAT): 144.00 €     │
│                                 │
│ Information                     │
│ Created: 31 décembre 2025       │
│ Product ID: abc12345...         │
│                                 │
│ Quick Actions                   │
│ [✏️ Edit Full Details]          │
│ [🗑️ Delete Product]             │
└─────────────────────────────────┘
```

### Mode Édition
```
┌─────────────────────────────────┐
│ Product Details      [Edit]     │
│ ├─ Title *                      │
│ │  [Input: Product Title]       │
│ ├─ Description                  │
│ │  [Textarea: Description...]   │
│ ├─ Product Type                 │
│ │  [Select: Digital/Appointment]│
│ └─ Publication Status           │
│    [Select: Published/Draft]    │
│                                 │
│ Pricing                         │
│ ├─ Price (excl. VAT) *          │
│ │  [Input: 120.00]              │
│ ├─ VAT Rate      [Manage VAT]   │← Ouvre dialog TVA
│ │  [Select: VAT rates...]       │
│ ├─ VAT (auto-calculated)        │
│ │  24.00 €                      │
│ └─ Total (incl. VAT)            │
│    144.00 €                     │
│                                 │
│ [Save] [Cancel]                 │
└─────────────────────────────────┘
```

### Overlay Cascade - Dialog VAT
```
┌─────────────────────────────────┐
│ Product Panel (arrière-plan)    │
│ ├─ Pricing                      │
│ │  └─ [Manage VAT] ←clicked     │
│ │                               │
│ │  ┌───────────────────────┐    │
│ │  │ VAT Rates Dialog      │    │← Overlay au-dessus
│ │  │ ├─ Standard: 20%      │    │
│ │  │ ├─ Reduced: 5.5%      │    │
│ │  │ └─ [+ Add Rate]       │    │
│ │  │                       │    │
│ │  │ [Close]               │    │
│ │  └───────────────────────┘    │
│ │                               │
│ └─ [Save] [Cancel]              │
└─────────────────────────────────┘
```

## Validation

### Champs obligatoires
- **Title** : Ne peut pas être vide
- **Price** : Doit être > 0

### Messages d'erreur
- "Title is required" - Si le titre est vide
- "Valid price is required" - Si le prix est invalide ou ≤ 0

###**Si besoin d'une nouvelle TVA** :
   - Cliquer sur **"Manage VAT"** dans la section Pricing
   - Ajouter le taux de TVA nécessaire
   - Fermer le dialog (le nouveau taux apparaît automatiquement)
6. Vérifier le calcul de la TVA si applicable
7. Cliquer sur **"Create"**
8. Le produit est créé et la liste est rafraîchie

### Modifier un produit existant
1. Cliquer sur l'icône **Info (i)** dans la colonne Actions
2. Consulter les informations en mode lecture
3. Cliquer sur **"Edit"** dans la section "Product Details"
4. Modifier les champs souhaités
5. **Si besoin de modifier les TVA** :
   - Cliquer sur **"Manage VAT"** dans la section Pricing
   - Gérer les taux de TVA
   - Fermer le dialog
6. Vérifier le calcul de la TVA en temps réel
7. Cliquer sur **"Save"** pour enregistrer ou **"Cancel"** pour annuler
8``

## Workflow utilisateur

### Créer un nouveau produit
1. Cliquer sur **"Add Product"**
2. Remplir le titre (obligatoire)
3. Remplir le prix HT (obligatoire)
4. Optionnel : ajouter description, type, statut, TVA
5. Vérifier le calcul de la TVA si applicable
6. Cliquer sur **"Create"**
7. Le produit est créé et la liste est rafraîchie

### Modifier un produit existant
1. Cliquer sur l'icône **Info (i)** dans la colonne Actions
2. Consulter les informations en mode lecture
3. Cliquer sur **"Edit"** dans la section "Product Details"
4. Modifier les champs souhaités
5. Vérifier le calcul de la TVA en temps réel
6. Cliquer sur **"Save"** pour enregistrer ou **"Cancel"** pour annuler
7. Le produit est mis à jour et la liste est rafraîchie

## Architecture technique

- **Prop `onOpenVatDialog`** pour ouvrir le dialog TVA
- **Logs détaillés** pour chaque opération (création, modification, suppression, upload)

#### `products-page-client.tsx`
- Référence au tableau via `useRef<ProductsTableHandle>`
- Bouton "Add Product" appelle `tableRef.current?.openNewProduct()`
- Import du type `ProductsTableHandle`
- **Passe `onOpenVatDialog`** au composant ProductsTable pour permettre l'overlay

### Logging système

Le système inclut des logs détaillés pour faciliter le debugging :

```typescript
// Logs de création/modification
console.log('[ProductsTable] handleSaveFromPanel - Starting save', { isNewProduct, editValues })
console.log('[ProductsTable] handleSaveFromPanel - Price conversion:', editValues.price, '€ =', priceInCents, 'cents')
console.log('[ProductsTable] handleSaveFromPanel - Product data to save:', productData)
console.log('[ProductsTable] handleSaveFromPanel - Result:', result)

// Logs de suppression
console.log('[ProductsTable] handleDelete - Starting deletion for product:', deleteId)
console.error('[ProductsTable] handleDelete - Failed:', result.error)

// Logs de mise à jour de champ
console.log('[ProductsTable] updateField - Field:', field, 'Value:', value, 'Product ID:', id)

// Logs d'upload d'image
console.log('[ProductsTable] handleImageUpload - Product:', productId, 'File:', file.name, 'Size:', file.size)

// Logs d'overlay
console.log('[ProductsTable] Opening VAT dialog from product panel')
```

### Système d'overlay cascade

Le système permet d'empiler plusieurs interfaces :

1. **Niveau 0** : Page principale `/admin/products`
2. **Niveau 1** : Sheet "Product Details Panel" (`z-index: auto`)
3. **Niveau 2** : Dialog "VAT Rates" (`z-index: 5
7. **Overlay cascade** - Accès aux fonctionnalités sans quitter le contexte
8. **Debugging** - Logs détaillés dans la console pour diagnostic
9. **Flexibilité** - Gestion des TVA intégrée au workflow de création

## Debugging et troubleshooting

### Activer les logs
Les logs sont automatiquement activés dans la console du navigateur. Ouvrez les DevTools (F12) et consultez l'onglet Console pour voir :
- Opérations de création/modification
- Validation des données
- Erreurs éventuelles
- Conversions de prix
- Statut des appels API

### Messages de log courants

**Création réussie** :
```
[ProductsTable] handleSaveFromPanel - Starting save { isNewProduct: true, editValues: {...} }
[ProductsTable] handleSaveFromPanel - Price conversion: 120.00 € = 12000 cents
[ProductsTable] handleSaveFromPanel - Create mode
[ProductsTable] handleSaveFromPanel - Product data to save: { title: "...", price: 12000, ... }
[ProductsTable] handleSaveFromPanel - Result: { success: true, ... }
[ProductsTable] handleSaveFromPanel - Success, closing panel and refreshing
```

**Erreur de validation** :
```
[ProductsTable] handleSaveFromPanel - Starting save { isNewProduct: false, editValues: {...} }
[ProductsTable] handleSaveFromPanel - Validation failed: Title is empty
```

**Erreur de sauvegarde** :
```
[ProductsTable] handleSaveFromPanel - Result: { success: false, error: "..." }
[ProductsTable] handleSaveFromPanel - Failed: Database connection error
```0+`)

Le Dialog VAT s'affiche au-dessus du Sheet produit grâce aux z-index de shadcn/ui.
À la fermeture du Dialog, le Sheet produit reste ouvert et les données sont rafraîchies.alues` avec tous les champs
- Fonction `handleSaveFromPanel()` gère création ET modification
- Validation des champs obligatoires
- Calcul automatique de la TVA

#### `products-page-client.tsx`
- Référence au tableau via `useRef<ProductsTableHandle>`
- Bouton "Add Product" appelle `tableRef.current?.openNewProduct()`
- Import du type `ProductsTableHandle`

### États du composant

```typescript
// État du panel
const [detailsProductId, setDetailsProductId] = useState<string | null>(null)
const [isNewProduct, setIsNewProduct] = useState(false)
const [isEditingInPanel, setIsEditingInPanel] = useState(false)

// Valeurs d'édition complètes
const [editValues, setEditValues] = useState<{
  title: string;
  description: string;
  price: string;
  type: string;
  vatRateId: string;
  isPublished: boolean;
}>({...})
```

### Interface exposée

```typescript
export interface ProductsTableHandle {
  openNewProduct: () => void
}
```

## Avantages du système

1. **UX améliorée** - Pas besoin de naviguer vers une autre page
2. **Édition rapide** - Modification directe depuis la liste
3. **Feedback immédiat** - Calcul de TVA en temps réel
4. **Validation** - Vérification des champs avant sauvegarde
5. **Cohérence** - Même interface pour création et modification
6. **Performance** - Moins de changements de page

## Notes importantes

- Le Details Panel utilise le composant **Sheet** de shadcn/ui
- Les prix sont stockés en **centimes** dans la base de données
- Les taux de TVA sont en **points de base** (2000 = 20%)
- L'action `upsertProduct` gère automatiquement création/modification selon la présence de l'`id`
- Le panel se ferme automatiquement après une création/modification réussie
- Un `router.refresh()` est appelé pour mettre à jour la liste

## Compatibilité

- ✅ Fonctionne avec le système de badges existant
- ✅ Compatible avec les actions inline du tableau
- ✅ Préserve la navigation vers la page d'édition complète
- ✅ Intégré avec le système de toast notifications
- ✅ Responsive (Sheet adaptatif)
