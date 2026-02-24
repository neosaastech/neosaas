# Migration Guide - Product Types v4.0

## Vue d'ensemble

Ce document explique la migration du système de produits v3.0 (4 types) vers v4.0 (3 catégories).

## Changements Majeurs v3.0 → v4.0

### Simplification des Types

**Avant (v3.0)** : 4 types confus
- `standard` - Produits payants génériques
- `digital` - Produits digitaux
- `free` - Produits gratuits
- `appointment` (ou `consulting`) - Rendez-vous

**Maintenant (v4.0)** : 3 catégories distinctes
- `physical` - Produits physiques expédiés
- `digital` - Produits digitaux instantanés
- `appointment` - Réservation de créneaux

### Nouvelle Table: Shipments

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  product_id UUID REFERENCES products(id),
  status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  carrier TEXT,
  shipping_address JSONB,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  emails_sent JSONB DEFAULT '{"shipping_confirmation": false, "delivery_confirmation": false}'
);
```

### Nouveaux Champs Produits

**Digital Products:**
- `delivery_code` - Code d'activation généré
- `download_url` - Lien de téléchargement direct
- `license_key` - Template de clé de licence
- `license_instructions` - Instructions d'activation

**Appointment Products:**
- `appointment_mode` - Renommé de `consulting_mode`

---

## Migration des Données

### Option 1: Migration SQL Automatique

```sql
-- 1. Migrer standard → physical (produits avec expédition)
UPDATE products 
SET type = 'physical' 
WHERE type = 'standard' 
  AND requires_shipping = true;

-- 2. Migrer standard → digital (produits téléchargeables)
UPDATE products 
SET type = 'digital' 
WHERE type = 'standard' 
  AND (file_url IS NOT NULL OR download_url IS NOT NULL);

-- 3. Migrer consulting → appointment
UPDATE products 
SET type = 'appointment' 
WHERE type = 'consulting';

-- 4. Gérer les produits free
UPDATE products 
SET 
  type = CASE 
    WHEN requires_shipping THEN 'physical'
    WHEN file_url IS NOT NULL OR download_url IS NOT NULL THEN 'digital'
    ELSE 'digital'
  END,
  is_free = true
WHERE type = 'free';

-- 5. Gérer les produits standard restants (par défaut → physical)
UPDATE products 
SET type = 'physical' 
WHERE type = 'standard';
```

### Option 2: Migration Manuelle via Admin UI

1. **Accéder à Admin → Products**
2. **Filtrer** par type legacy:
   - Filtre: `standard`
   - Filtre: `free`  
   - Filtre: `consulting`
3. **Pour chaque produit**, déterminer le bon type:
   - Expédié physiquement? → `physical`
   - Téléchargement/Code? → `digital`
   - Rendez-vous? → `appointment`
4. **Action groupée** ou **Edition individuelle**
5. **Sauvegarder**

---

## Migration de l'Interface Admin

### Avant (v3.0)
```tsx
// product-form.tsx
<SelectItem value="standard">Standard Product</SelectItem>
<SelectItem value="digital">Digital Product</SelectItem>
<SelectItem value="free">Free Product</SelectItem>
<SelectItem value="consulting">Consulting</SelectItem>
```

### Maintenant (v4.0)
```tsx
// product-form.tsx
<SelectItem value="physical">
  <Box className="h-4 w-4 text-orange-500" />
  Physical - Shipped by mail with tracking
</SelectItem>
<SelectItem value="digital">
  <Monitor className="h-4 w-4 text-blue-500" />
  Digital - Instant delivery via code/download
</SelectItem>
<SelectItem value="appointment">
  <Calendar className="h-4 w-4 text-purple-500" />
  Appointment - Book a time slot after purchase
</SelectItem>
```

### Filtres et Actions Groupées

**Avant:**
- Filtres: All, Standard, Digital, Free, Appointment
- Actions: Change Type (4 options)

**Maintenant:**
- Filtres: All, Physical, Digital, Appointment
- Actions: Change Type (3 options)

---

## Migration du Checkout

### Checkout Interface (Traduction)

**Avant v4.0:** Texte mélangé français/anglais

**Maintenant v4.0:** 100% anglais

Fichiers modifiés:
- `app/(private)/dashboard/checkout/page.tsx`
- `components/checkout/appointment-modal.tsx`

Exemples de traductions:
```diff
- "Retour au Dashboard" → "Back to Dashboard"
- "Voir le panier" → "View Cart"
- "Rendez-vous" → "Appointment"
- "Sélectionner un créneau" → "Select Time Slot"
- "Informations de facturation" → "Billing Information"
- "Valider la commande (Test)" → "Validate Order (Test)"
```

### Checkout Logic (Backend)

Aucun changement nécessaire - le backend supporte déjà les 3 types:

```typescript
// app/actions/ecommerce.ts
export async function processCheckout(
  cartId: string,
  appointmentsData?: Record<string, AppointmentData>
) {
  // ✅ Physical → Create shipment
  if (item.product.type === 'physical') {
    await createShipment(...)
  }
  
  // ✅ Digital → Generate code
  if (item.product.type === 'digital') {
    await generateDeliveryCode(...)
  }
  
  // ✅ Appointment → Create booking
  if (item.product.type === 'appointment' && appointmentsData) {
    await createAppointment(...)
  }
  
  // ✅ Clear cart
  await db.update(carts).set({ status: "converted" })
}
```

---

## Rétrocompatibilité

### Support des Types Legacy

Les anciens types restent fonctionnels grâce à `lib/status-configs.ts`:

```typescript
export const productTypeConfigs = {
  // v4.0 Types
  physical: { label: "Physical", icon: Box, ... },
  digital: { label: "Digital", icon: Monitor, ... },
  appointment: { label: "Appointment", icon: Calendar, ... },
  
  // Legacy Types (v3.0)
  standard: { label: "Standard (Legacy)", icon: Package, ... },
  free: { label: "Free (Legacy)", icon: Download, ... },
  consulting: { label: "Consulting (Legacy)", icon: Users, ... },
}
```

**Comportement:**
- ✅ Anciens produits continuent de fonctionner
- ✅ Badge "(Legacy)" affiché dans l'admin
- ✅ Pas d'erreur de checkout
- ⚠️ Ne peuvent plus être créés (seulement édités)

---

## Checklist de Migration

### Phase 1: Préparation
- [ ] Sauvegarder la base de données
- [ ] Documenter les produits existants (types, quantités)
- [ ] Informer l'équipe du changement

### Phase 2: Migration Backend
- [ ] Déployer le schéma v4.0 (table shipments, nouveaux champs)
- [ ] Exécuter le script SQL de migration
- [ ] Vérifier les données migrées
- [ ] Tester les requêtes sur les nouveaux types

### Phase 3: Migration Frontend
- [ ] Déployer la nouvelle UI (formulaires, filtres)
- [ ] Vérifier l'affichage des 3 types
- [ ] Tester la création de produits
- [ ] Tester l'édition de produits existants

### Phase 4: Tests Checkout
- [ ] Tester achat produit Physical
  - [ ] Shipment créé
  - [ ] Email admin envoyé
  - [ ] Panier vidé
- [ ] Tester achat produit Digital
  - [ ] Code généré
  - [ ] Email client avec code
  - [ ] Panier vidé
- [ ] Tester achat produit Appointment
  - [ ] Modal de sélection créneau (anglais)
  - [ ] Appointment créé en DB
  - [ ] Email confirmation
  - [ ] Panier vidé

### Phase 5: Migration Produits Legacy
- [ ] Identifier produits `standard` restants
- [ ] Identifier produits `free`
- [ ] Identifier produits `consulting`
- [ ] Convertir manuellement ou via script
- [ ] Vérifier après conversion

### Phase 6: Validation Finale
- [ ] Tous produits ont un type v4.0
- [ ] Aucun produit legacy visible dans création
- [ ] Checkout fonctionne pour les 3 types
- [ ] Emails envoyés correctement
- [ ] Documentation mise à jour

---

## Rollback (Si Nécessaire)

### Retour à v3.0

```sql
-- 1. Restaurer les types legacy
UPDATE products SET type = 'standard' WHERE type = 'physical';
UPDATE products SET type = 'consulting' WHERE type = 'appointment';

-- 2. Gérer les produits gratuits
UPDATE products 
SET type = 'free' 
WHERE is_free = true;

-- Note: La table shipments restera (pas de problème)
  
  // 3. Sauvegarde du produit
  const result = await upsertProduct(productData)
  
  // 4. ⭐ NOUVEAU: Upload de l'image après création si nécessaire
  if (isNewProduct && pendingImageFile && result.data?.id) {
    const imgFormData = new FormData()
    imgFormData.append("image", pendingImageFile)
    imgFormData.append("productId", result.data.id)
    
    await fetch("/api/products/image", {
      method: "POST",
      body: imgFormData
    })
  }
  
  // 5. Fermeture et refresh
}
```

### Interface du Panneau
#### Avant (Basique)
- ✅ Affichage des détails
- ✅ Changement de statut Published/Draft
- ❌ Pas d'upload d'image
- ❌ Pas de sélection d'icône
- ❌ Édition limitée (juste un bouton "Edit" qui redirige)

#### Maintenant (Complet)
- ✅ Affichage des détails (mode lecture)
- ✅ Édition complète inline (mode édition)
- ✅ Upload d'image avec preview
- ✅ Sélection d'icône de secours
- ✅ Tous les champs éditables
- ✅ Calcul automatique TVA
- ✅ Validation en temps réel
- ✅ Sticky buttons (Save/Cancel)

## Points d'Attention

### Comportement de l'Image

#### Nouveau Produit
```typescript
// 1. Utilisateur upload une image
setPendingImageFile(file)
setImagePreview(base64String) // Preview locale

// 2. Utilisateur clique "Create Product"
const result = await upsertProduct({...}) // Crée le produit

// 3. Upload de l'image avec l'ID du nouveau produit
if (result.data?.id && pendingImageFile) {
  uploadImage(result.data.id, pendingImageFile)
}
```

#### Produit Existant
```typescript
// Upload immédiat lors du changement d'image
const handleImageUploadInPanel = async (file: File) => {
  if (!isNewProduct && detailsProduct) {
    await uploadImage(detailsProduct.id, file)
    router.refresh() // Rafraîchit pour voir la nouvelle image
  }
}
```

### Gestion des Modes

```typescript
// Mode Lecture (Visualisation)
isEditingInPanel = false
isNewProduct = false
detailsProductId = "uuid-du-produit"

// Mode Édition
isEditingInPanel = true
isNewProduct = false
detailsProductId = "uuid-du-produit"

// Mode Création
isEditingInPanel = true
isNewProduct = true
detailsProductId = "new"
```

### Initialisation des Valeurs

```typescript
// Lors de l'ouverture d'un produit existant
useEffect(() => {
  if (detailsProduct) {
    setEditValues({
      title: detailsProduct.title,
      description: detailsProduct.description || '',
      price: (detailsProduct.price / 100).toFixed(2),
      type: detailsProduct.type || 'digital',
      vatRateId: detailsProduct.vatRateId || '',
      isPublished: detailsProduct.isPublished,
      icon: detailsProduct.icon || 'ShoppingBag' // ⭐ NOUVEAU
    })
    setImagePreview(detailsProduct.imageUrl) // ⭐ NOUVEAU
    setPendingImageFile(null) // ⭐ NOUVEAU
  }
}, [detailsProduct])
```

## Compatibilité

### Rétrocompatibilité
✅ **Tous les produits existants fonctionnent sans modification**
- Produits sans icône : affichent `Package` par défaut
- Produits avec image : affichent l'image
- Produits sans image ni icône : affichent `Package`

### API Inchangée
✅ **Aucune modification des actions serveur**
- `upsertProduct()` : Même signature, accepte juste `icon` en plus
- `/api/products/image` : Inchangé
- `deleteProduct()` : Inchangé

### Base de Données
✅ **Aucune migration nécessaire**
- La colonne `icon` existe déjà
- Tous les produits peuvent avoir ou non une icône
- Valeur par défaut gérée côté client

## Nettoyage (Optionnel)

### Fichiers Obsolètes à Supprimer
Une fois que vous êtes sûr que le nouveau système fonctionne :

```bash
# ⚠️ ATTENTION: Supprimez uniquement si vous êtes certain !

# Pages d'édition pleine page (obsolètes)
rm -r app/(private)/admin/products/new/
rm -r app/(private)/admin/products/[id]/

# Composant de formulaire (obsolète)
rm app/(private)/admin/products/product-form.tsx
```

### Avant de Supprimer
✅ Testez le nouveau panneau avec :
1. Création d'un nouveau produit
2. Modification d'un produit existant
3. Upload d'image sur nouveau et existant
4. Changement d'icône
5. Validation des champs
6. Annulation d'édition

## Tests de Régression

### Scénarios à Tester

#### 1. Création Basique
- [ ] Créer un produit avec titre uniquement
- [ ] Créer un produit avec tous les champs
- [ ] Créer un produit sans image (seulement icône)
- [ ] Créer un produit avec image (sans icône)

#### 2. Upload d'Image
- [ ] Upload image sur nouveau produit → vérifier l'upload post-création
- [ ] Upload image sur produit existant → vérifier upload immédiat
- [ ] Changer l'image d'un produit
- [ ] Supprimer l'image d'un produit

#### 3. Édition
- [ ] Modifier le titre d'un produit
- [ ] Modifier le prix et vérifier le calcul TTC
- [ ] Changer le type (Digital ↔ Appointment)
- [ ] Changer le statut (Published ↔ Draft)
- [ ] Modifier la TVA et vérifier le recalcul

#### 4. Annulation
- [ ] Créer un produit puis annuler → panneau se ferme
- [ ] Modifier un produit puis annuler → revient en mode lecture
- [ ] Modifier plusieurs champs puis annuler → valeurs restaurées

#### 5. Edge Cases
- [ ] Créer un produit avec prix = 0
- [ ] Créer un produit sans TVA
- [ ] Créer un produit avec description vide
- [ ] Upload d'une très grande image (> 5MB)
- [ ] Upload d'un format invalide (PDF, TXT, etc.)

## Dépannage

### Problème : L'image ne s'affiche pas après création
**Cause** : L'upload post-création a échoué  
**Solution** : Vérifier les logs dans la console, vérifier les permissions du dossier `public/profiles/`

### Problème : Le calcul TVA est incorrect
**Cause** : Taux de TVA en pourcentage au lieu de basis points  
**Solution** : Les taux sont stockés en basis points (ex: 2000 = 20.00%). La division par 10000 est correcte.

### Problème : Le panneau ne se ferme pas
**Cause** : État `detailsProductId` non réinitialisé  
**Solution** : Vérifier que `setDetailsProductId(null)` est appelé

### Problème : Les modifications ne sont pas sauvegardées
**Cause** : Validation échouée ou erreur réseau  
**Solution** : 
1. Vérifier les logs console préfixés `[ProductsTable]`
2. Vérifier la validation des champs (titre et prix requis)
3. Vérifier la connexion réseau

## Logs de Debug

Tous les logs sont préfixés par `[ProductsTable]` :

```typescript
// Logs de création/modification
'[ProductsTable] handleSaveFromPanel - Starting save'
'[ProductsTable] handleSaveFromPanel - Product data to save:'
'[ProductsTable] handleSaveFromPanel - Result:'

// Logs d'upload d'image
'[ProductsTable] handleImageUploadInPanel - File:'
'[ProductsTable] handleImageUploadInPanel - Response status:'

// Logs de suppression
'[ProductsTable] removeImageInPanel - isNewProduct:'
```

Activez le mode verbose dans la console pour voir tous les détails.

## Performance

### Optimisations Appliquées
- ✅ **Preview locale** : Image encodée en base64 côté client (pas de round-trip serveur)
- ✅ **Upload conditionnel** : Image uploadée seulement si modifiée
- ✅ **Calcul local** : Prix TTC calculé côté client (pas d'appel API)
- ✅ **Debounce implicite** : Calculs uniquement sur changement de valeur

### Métriques Attendues
- Création produit : < 2s (avec image)
- Modification produit : < 1s
- Upload image : < 3s (selon taille)
- Ouverture panneau : < 100ms
- Fermeture panneau : < 100ms

---

**Version** : 2.0  
**Date de migration** : 2 janvier 2026  
**Rétrocompatibilité** : ✅ Oui  
**Migration DB requise** : ❌ Non
