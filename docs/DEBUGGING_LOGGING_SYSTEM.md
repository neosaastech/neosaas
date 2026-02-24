# Système de Debugging et Logging

## Vue d'ensemble

Le système de logging intégré fournit des informations détaillées sur toutes les opérations critiques de l'application, facilitant le debugging et le diagnostic des problèmes utilisateur.

## Logging dans Products Management

### Localisation
Le système de logging est principalement implémenté dans :
- `app/(private)/admin/products/products-table.tsx`

### Types d'opérations loggées

#### 1. Création/Modification de produits
```typescript
console.log('[ProductsTable] handleSaveFromPanel - Starting save', { 
  isNewProduct, 
  editValues 
})
console.log('[ProductsTable] handleSaveFromPanel - Price conversion:', 
  editValues.price, '€ =', priceInCents, 'cents')
console.log('[ProductsTable] handleSaveFromPanel - Product data to save:', 
  productData)
console.log('[ProductsTable] handleSaveFromPanel - Result:', result)
```

**Informations loggées** :
- Mode (création ou modification)
- Valeurs du formulaire
- Conversion prix (€ → cents)
- Données envoyées à l'API
- Résultat de l'opération

#### 2. Suppression de produits
```typescript
console.log('[ProductsTable] handleDelete - Starting deletion for product:', 
  deleteId)
console.error('[ProductsTable] handleDelete - Failed:', result.error)
```

**Informations loggées** :
- ID du produit à supprimer
- Statut de l'opération
- Erreurs éventuelles

#### 3. Mise à jour de champs individuels
```typescript
console.log('[ProductsTable] updateField - Field:', field, 
  'Value:', value, 'Product ID:', id)
console.log('[ProductsTable] updateField - Result:', result)
console.log('[ProductsTable] updateField - Refreshing router...')
```

**Informations loggées** :
- Champ modifié (title, price, type, etc.)
- Nouvelle valeur
- ID du produit
- Résultat de l'opération

#### 4. Upload d'images
```typescript
console.log('[ProductsTable] handleImageUpload - Product:', productId, 
  'File:', file.name, 'Size:', file.size)
console.log('[ProductsTable] handleImageUpload - Response status:', 
  response.status)
console.log('[ProductsTable] handleImageUpload - Success:', data)
```

**Informations loggées** :
- ID du produit
- Nom du fichier
- Taille du fichier
- Statut HTTP de la réponse
- Données retournées

#### 5. Overlay cascade (Dialog VAT)
```typescript
console.log('[ProductsTable] Opening VAT dialog from product panel')
```

**Informations loggées** :
- Événement d'ouverture du dialog VAT depuis le panel produit

## Format des logs

### Préfixe standard
Tous les logs utilisent le format : `[NomComposant] fonction - Message`

Exemples :
- `[ProductsTable] handleSaveFromPanel - Starting save`
- `[ProductsTable] updateField - Field: price`
- `[ProductsTable] handleDelete - Failed: Database error`

### Niveaux de log

#### `console.log()` - Informations
Opérations normales, flux de données, états

#### `console.warn()` - Avertissements
Validations échouées, données manquantes (non bloquantes)

```typescript
console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: Title is empty')
console.warn('[ProductsTable] handleSaveFromPanel - Validation failed: Invalid price:', editValues.price)
```

#### `console.error()` - Erreurs
Échecs d'opérations, exceptions, erreurs API

```typescript
console.error('[ProductsTable] handleDelete - Failed:', result.error)
console.error('[ProductsTable] updateField - Exception:', error)
console.error('[ProductsTable] handleImageUpload - Failed:', errorText)
```

## Utilisation pour le debugging

### Ouvrir la console
1. Ouvrir les DevTools : **F12** ou **Ctrl+Shift+I** (Windows/Linux) / **Cmd+Option+I** (Mac)
2. Aller dans l'onglet **Console**
3. Filtrer par `[ProductsTable]` pour voir uniquement les logs pertinents

### Scénarios de debugging courants

#### Problème : Le produit n'est pas créé
**Logs à vérifier** :
```
[ProductsTable] handleSaveFromPanel - Starting save { isNewProduct: true, ... }
[ProductsTable] handleSaveFromPanel - Price conversion: ...
[ProductsTable] handleSaveFromPanel - Product data to save: {...}
[ProductsTable] handleSaveFromPanel - Result: { success: false, error: "..." }
```

**Diagnostic** : Vérifier `result.error` pour identifier la cause

#### Problème : Le prix est incorrect
**Logs à vérifier** :
```
[ProductsTable] handleSaveFromPanel - Price conversion: 120.50 € = 12050 cents
```

**Diagnostic** : Vérifier la conversion €→cents

#### Problème : L'image ne s'upload pas
**Logs à vérifier** :
```
[ProductsTable] handleImageUpload - Product: abc123, File: image.jpg, Size: 234567
[ProductsTable] handleImageUpload - Response status: 413
[ProductsTable] handleImageUpload - Failed: File too large
```

**Diagnostic** : Vérifier le statut HTTP et le message d'erreur

#### Problème : La modification ne s'applique pas
**Logs à vérifier** :
```
[ProductsTable] updateField - Field: title, Value: "New Title", Product ID: abc123
[ProductsTable] updateField - Result: { success: true }
[ProductsTable] updateField - Refreshing router...
```

**Diagnostic** : Vérifier que `success: true` et que le refresh est appelé

## Traçabilité complète d'une opération

### Exemple : Création d'un produit avec TVA

```
1. [ProductsTable] handleSaveFromPanel - Starting save { 
     isNewProduct: true, 
     editValues: { 
       title: "Formation TypeScript", 
       price: "299.00", 
       type: "digital", 
       vatRateId: "vat_20" 
     } 
   }

2. [ProductsTable] handleSaveFromPanel - Price conversion: 299.00 € = 29900 cents

3. [ProductsTable] handleSaveFromPanel - Create mode

4. [ProductsTable] handleSaveFromPanel - Product data to save: {
     title: "Formation TypeScript",
     description: null,
     price: 29900,
     type: "digital",
     vatRateId: "vat_20",
     isPublished: false
   }

5. [ProductsTable] handleSaveFromPanel - Result: { 
     success: true, 
     product: { id: "prod_xyz123", ... } 
   }

6. [ProductsTable] handleSaveFromPanel - Success, closing panel and refreshing
```

### Exemple : Modification de prix avec erreur

```
1. [ProductsTable] updateField - Field: price, Value: 15000, Product ID: prod_abc

2. [ProductsTable] updateField - Result: { 
     success: false, 
     error: "Price must be greater than 0" 
   }

3. [ProductsTable] updateField - Failed: Price must be greater than 0
```

## Monitoring de production

### Désactivation des logs en production
Pour désactiver les logs en production, créer un helper :

```typescript
// lib/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) console.log(...args)
  },
  warn: (...args: any[]) => {
    if (isDevelopment) console.warn(...args)
  },
  error: (...args: any[]) => {
    console.error(...args) // Toujours logger les erreurs
  }
}

// Utilisation
logger.log('[ProductsTable] handleSaveFromPanel - Starting save', data)
```

### Intégration avec un service de monitoring
Pour envoyer les logs à un service externe (Sentry, LogRocket, etc.) :

```typescript
// lib/logger.ts
import * as Sentry from '@sentry/nextjs'

export const logger = {
  error: (message: string, data?: any) => {
    console.error(message, data)
    Sentry.captureException(new Error(message), {
      extra: data
    })
  }
}
```

## Best Practices

### 1. Contexte suffisant
✅ **BON** : `console.log('[ProductsTable] updateField - Field:', field, 'Value:', value)`  
❌ **MAUVAIS** : `console.log('Updating...')`

### 2. Données structurées
✅ **BON** : `console.log('[ProductsTable] Save', { isNew, data })`  
❌ **MAUVAIS** : `console.log('[ProductsTable] Save', isNew, data, status, ...)`

### 3. Erreurs détaillées
✅ **BON** : `console.error('[ProductsTable] Failed:', result.error, { productId, data })`  
❌ **MAUVAIS** : `console.error('Error')`

### 4. Niveaux appropriés
- Opérations normales → `console.log()`
- Validations échouées → `console.warn()`
- Erreurs/Exceptions → `console.error()`

### 5. Préfixes cohérents
- Toujours utiliser `[NomComposant] fonction - Message`
- Permet le filtrage dans la console
- Facilite la recherche dans les logs

## Extension du système

Pour ajouter du logging dans un nouveau composant :

```typescript
// Exemple : Orders management
const handleCreateOrder = async () => {
  console.log('[OrdersTable] handleCreateOrder - Starting creation', { 
    items, 
    customer 
  })
  
  try {
    const result = await createOrder(orderData)
    console.log('[OrdersTable] handleCreateOrder - Result:', result)
    
    if (result.success) {
      console.log('[OrdersTable] handleCreateOrder - Order created:', result.order.id)
    } else {
      console.error('[OrdersTable] handleCreateOrder - Failed:', result.error)
    }
  } catch (error) {
    console.error('[OrdersTable] handleCreateOrder - Exception:', error)
  }
}
```

## Résumé

Le système de logging fournit :
- ✅ **Visibilité** complète sur les opérations
- ✅ **Diagnostic** rapide des problèmes
- ✅ **Traçabilité** des modifications
- ✅ **Contexte** riche pour le debugging
- ✅ **Format** standardisé et filtrable
