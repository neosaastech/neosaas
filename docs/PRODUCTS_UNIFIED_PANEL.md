# Panneau Unifié de Gestion des Produits

## Vue d'ensemble

Le système de gestion des produits a été amélioré pour offrir une expérience utilisateur optimale en consolidant toutes les opérations de création et modification dans **une seule fenêtre calque** (drawer/panel) à droite de l'écran.

## Changements Principaux

### ✅ Avant
- **Deux modes différents** :
  - Fenêtre calque pour les détails (lecture seule + modifications limitées)
  - Page pleine séparée (`/admin/products/[id]`) pour l'édition complète
  - Fenêtre calque basique pour la création

### ✨ Maintenant
- **Un seul mode unifié** :
  - Toutes les opérations dans la fenêtre calque à droite
  - Création ET modification complètes au même endroit
  - Même interface pour créer et modifier un produit

## Fonctionnalités du Panneau Unifié

### 🎨 Identité Visuelle Complète
- **Upload d'image** : Ajoutez ou modifiez l'image du produit
- **Sélection d'icône de secours** : Choisissez parmi 12 icônes disponibles
- **Prévisualisation en temps réel** : Voyez immédiatement les changements
- **Gestion d'image** :
  - Pour les nouveaux produits : l'image est stockée temporairement et uploadée lors de la sauvegarde
  - Pour les produits existants : upload immédiat ou suppression directe

### 📝 Informations Complètes du Produit
- **Titre** (obligatoire)
- **Description** (optionnelle, textarea multi-lignes)
- **Type de produit** : Standard, Digital, Free ou Appointment
- **Statut de publication** : Published ou Draft

### 💰 Tarification Avancée
- **Prix HT** (hors TVA) avec validation
- **Sélection du taux de TVA** avec accès direct à la gestion des taux
- **Calcul automatique en temps réel** :
  - Montant de la TVA
  - Prix TTC (toutes taxes comprises)
  - Affichage dynamique pendant la saisie

### 🔄 Modes de Fonctionnement

#### Mode Création (Nouveau Produit)
1. Cliquez sur le bouton **"Add Product"**
2. Le panneau s'ouvre en mode édition
3. Remplissez tous les champs nécessaires
4. Ajoutez une image et/ou choisissez une icône
5. Cliquez sur **"Create Product"**
6. L'image est automatiquement uploadée après la création

#### Mode Visualisation (Lecture)
1. Cliquez sur l'icône **Info** (ℹ️) dans le tableau
2. Le panneau affiche tous les détails du produit
3. Actions rapides disponibles :
   - Basculer le statut de publication
   - Modifier le produit (passe en mode édition)
   - Supprimer le produit

#### Mode Édition (Modification)
1. Depuis le mode visualisation, cliquez sur **"Edit Product"**
   OU
   Cliquez directement sur l'icône **Pencil** (✏️) dans le tableau
2. Le panneau passe en mode édition avec tous les champs modifiables
3. Modifiez les informations souhaitées
4. Ajoutez/changez l'image si nécessaire
5. Cliquez sur **"Save Changes"**

## Avantages UX/UI

### ✅ Amélioration de l'Expérience Utilisateur
- **Cohérence** : Même interface pour créer et modifier
- **Rapidité** : Pas de changement de page
- **Contexte** : Le tableau reste visible en arrière-plan
- **Fluidité** : Transitions douces entre les modes
- **Efficacité** : Tout est accessible en un seul endroit

### 🎯 Fonctionnalités Pratiques
- **Validation en temps réel** : Messages d'erreur clairs
- **Calculs automatiques** : Prix TTC calculé instantanément
- **Preview d'image** : Voir l'image avant sauvegarde
- **Annulation facile** : Bouton Cancel toujours disponible
- **Sticky buttons** : Boutons Save/Cancel toujours visibles en bas

## Structure Technique

### États Gérés
```typescript
- detailsProductId: ID du produit affiché (ou 'new')
- isEditingInPanel: Mode édition activé
- isNewProduct: Mode création activé
- imagePreview: URL de preview de l'image
- pendingImageFile: Fichier image en attente (nouveaux produits)
- editValues: Valeurs du formulaire
```

### Fonctions Principales
- `handleOpenNewProduct()` : Ouvre le panneau en mode création
- `handleImageUploadInPanel()` : Gère l'upload d'image
- `removeImageInPanel()` : Supprime l'image
- `handleSaveFromPanel()` : Sauvegarde le produit (création ou modification)

### Workflow de Sauvegarde

#### Nouveau Produit
1. Validation des champs
2. Création du produit via `upsertProduct()`
3. Upload de l'image si présente (avec l'ID du nouveau produit)
4. Fermeture du panneau
5. Refresh de la page

#### Modification de Produit
1. Validation des champs
2. Mise à jour via `upsertProduct()` avec l'ID existant
3. Upload d'image si modifiée
4. Fermeture du panneau
5. Refresh de la page

## Pages Obsolètes

Les pages suivantes ne sont **plus utilisées** et peuvent être supprimées :
- `/admin/products/new/page.tsx` - Remplacé par le panneau
- `/admin/products/[id]/page.tsx` - Remplacé par le panneau
- `product-form.tsx` - Composant de formulaire obsolète

> **Note** : Ces fichiers existent encore dans le projet mais ne sont plus accessibles via l'interface utilisateur.

## Migration

Aucune migration de données n'est nécessaire. Le système est **rétrocompatible** et fonctionne avec tous les produits existants.

## Tests Recommandés

1. ✅ Créer un nouveau produit avec image
2. ✅ Créer un nouveau produit avec icône uniquement
3. ✅ Modifier un produit existant
4. ✅ Changer l'image d'un produit
5. ✅ Supprimer l'image d'un produit
6. ✅ Modifier le prix et vérifier le calcul TVA
7. ✅ Basculer entre Published/Draft
8. ✅ Annuler une modification
9. ✅ Valider les champs obligatoires

## Support

Pour toute question ou problème :
1. Vérifiez la console du navigateur pour les logs
2. Tous les logs sont préfixés par `[ProductsTable]`
3. Les erreurs d'upload d'image sont loguées séparément

---

**Date de mise à jour** : 2 janvier 2026  
**Version** : 2.0 - Panneau Unifié
