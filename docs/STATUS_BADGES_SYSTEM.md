# Système de Badges de Statut

Ce document décrit le système centralisé de badges de statut utilisé dans l'application pour une cohérence visuelle et une maintenance simplifiée.

## Architecture

### Composants Créés

1. **`components/ui/status-badge.tsx`** : Composant réutilisable pour afficher les badges
2. **`lib/status-configs.ts`** : Configurations centralisées pour tous les types de statut

## Utilisation

### Import

```typescript
import { StatusBadge } from "@/components/ui/status-badge"
import { getProductTypeConfig, getOrderStatusConfig, getUserRoleConfig } from "@/lib/status-configs"
```

### Exemples

#### 1. Badge de Type de Produit

```tsx
<StatusBadge 
  config={getProductTypeConfig(product.type)}
  size="sm"
  animated={true}
/>
```

#### 2. Badge de Statut de Commande

```tsx
<StatusBadge 
  config={getOrderStatusConfig(order.status)}
  size="lg"
  animated={true}
/>
```

#### 3. Badge de Rôle Utilisateur

```tsx
<StatusBadge 
  config={getUserRoleConfig(user.role)}
  size="md"
/>
```

### Avec Select (pour édition)

```tsx
<Select value={product.type} onValueChange={handleChange}>
  <SelectTrigger className="h-8 border-0 bg-transparent hover:bg-muted/30 px-0">
    <StatusBadge 
      config={getProductTypeConfig(product.type)}
      size="sm"
      animated={true}
    />
  </SelectTrigger>
  <SelectContent>
    {/* Options ici */}
  </SelectContent>
</Select>
```

## Types de Statut Disponibles

### 1. Types de Produits (`productTypeConfigs`)

| Valeur | Label | Icône | Couleur |
|--------|-------|-------|---------|
| `standard` | Standard | Package | Vert |
| `digital` | Digital | Rocket 🚀 | Bleu |
| `free` | Free | Download | Amber |
| `appointment` | Appointment | Calendar | Violet |
| `undefined` | Undefined | Package | Gris |

**Fonction helper** : `getProductTypeConfig(type: string | null)`

### 2. Statuts de Commande (`orderStatusConfigs`)

| Valeur | Label | Icône | Couleur |
|--------|-------|-------|---------|
| `pending` | En attente | Clock | Jaune |
| `processing` | En cours | Cog | Bleu |
| `paid` | Payée | CheckCircle | Vert |
| `completed` | Terminée | Package | Vert émeraude |
| `cancelled` | Annulée | XCircle | Rouge |
| `refunded` | Remboursée | RefreshCw | Violet |

**Fonction helper** : `getOrderStatusConfig(status: string)`

### 3. Rôles Utilisateur (`userRoleConfigs`)

| Valeur | Label | Icône | Couleur |
|--------|-------|-------|---------|
| `super_admin` | Super Admin | ShieldCheck | Rouge |
| `admin` | Administrator | Shield | Orange |
| `writer` | Writer | UserCog | Bleu |
| `reader` | Reader | Users | Vert |
| `user` | User | Users | Gris |

**Fonction helper** : `getUserRoleConfig(role: string)`

### 4. Statut de Publication (`publicationStatusConfigs`)

| Valeur | Label | Icône | Couleur |
|--------|-------|-------|---------|
| `published` | Published | Eye | Vert |
| `draft` | Draft | FileText | Gris |
| `archived` | Archived | Ban | Rouge |

**Fonction helper** : `getPublicationStatusConfig(isPublished: boolean)`

### 5. Statut Actif/Inactif (`activeStatusConfigs`)

| Valeur | Label | Icône | Couleur |
|--------|-------|-------|---------|
| `active` | Active | Play | Vert |
| `inactive` | Inactive | Pause | Gris |

**Fonction helper** : `getActiveStatusConfig(isActive: boolean)`

## Props du Composant StatusBadge

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `config` | `StatusConfig` | **requis** | Configuration du statut (label, icon, className) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Taille du badge |
| `onClick` | `() => void` | `undefined` | Fonction de clic (rend le badge cliquable) |
| `animated` | `boolean` | `false` | Active l'animation au survol (scale) |

## Interface StatusConfig

```typescript
interface StatusConfig {
  label: string        // Texte affiché
  icon: LucideIcon    // Icône Lucide React
  className: string   // Classes Tailwind pour les couleurs
}
```

## Pages Refactorisées

Les pages suivantes utilisent maintenant le système centralisé :

1. ✅ **`app/(private)/admin/products/products-table.tsx`**
   - Badge de type de produit avec animation
   
2. ✅ **`app/(private)/admin/products/products-page-client.tsx`**
   - Filtres avec icônes cohérentes

3. ✅ **`app/(private)/admin/orders/[orderId]/page.tsx`**
   - Badge de statut de commande avec animation

4. ✅ **`app/(private)/dashboard/profile/page.tsx`**
   - Badge de rôle utilisateur sous la position

## Avantages du Système

### 1. **Cohérence Visuelle**
- Tous les badges utilisent les mêmes couleurs et styles
- Iconographie uniforme dans toute l'application

### 2. **Maintenabilité**
- Une seule source de vérité pour les configurations
- Facile d'ajouter de nouveaux types de statut
- Modifications centralisées affectent toute l'application

### 3. **Réutilisabilité**
- Composant unique pour tous les types de badges
- Configurations partagées entre différents modules

### 4. **TypeScript**
- Types stricts pour éviter les erreurs
- Autocomplétion IDE pour les configurations

## Ajouter un Nouveau Type de Statut

### Étape 1 : Ajouter la configuration dans `lib/status-configs.ts`

```typescript
// Ajouter les icônes nécessaires
import { NewIcon } from "lucide-react"

// Créer les configurations
export const newStatusConfigs: Record<string, StatusConfig> = {
  status1: {
    label: "Status 1",
    icon: NewIcon,
    className: "bg-blue-100 text-blue-700 border-blue-300"
  },
  // ...
}

// Créer la fonction helper
export function getNewStatusConfig(status: string): StatusConfig {
  return newStatusConfigs[status] || defaultConfig
}
```

### Étape 2 : Utiliser dans les composants

```tsx
import { StatusBadge } from "@/components/ui/status-badge"
import { getNewStatusConfig } from "@/lib/status-configs"

<StatusBadge 
  config={getNewStatusConfig(item.status)}
  size="md"
/>
```

## Palette de Couleurs Standard

| Catégorie | Classe Tailwind | Utilisation |
|-----------|----------------|-------------|
| Bleu | `bg-blue-100 text-blue-700 border-blue-300` | Processing, Digital, Writer |
| Vert | `bg-green-100 text-green-700 border-green-300` | Success, Paid, Reader, Active |
| Jaune | `bg-yellow-100 text-yellow-700 border-yellow-300` | Warning, Pending |
| Rouge | `bg-red-100 text-red-700 border-red-300` | Error, Cancelled, Super Admin |
| Orange | `bg-orange-100 text-orange-700 border-orange-300` | Admin, Custom |
| Violet | `bg-purple-100 text-purple-700 border-purple-300` | Appointment, Refunded |
| Gris | `bg-gray-100 text-gray-700 border-gray-300` | Neutral, Draft, Undefined |
| Émeraude | `bg-emerald-100 text-emerald-700 border-emerald-300` | Completed |

## Best Practices

1. **Toujours utiliser les fonctions helper** au lieu d'accéder directement aux configs
2. **Ajouter l'animation** sur les badges cliquables : `animated={true}`
3. **Utiliser la bonne taille** :
   - `sm` : Dans les tableaux compacts
   - `md` : Affichage standard
   - `lg` : Badges importants ou formulaires
4. **Classes personnalisées** : Toujours utiliser le pattern `bg-X-100 text-X-700 border-X-300`

## Exemples Complets

### Dans un Tableau

```tsx
<TableCell>
  <Select
    value={item.status}
    onValueChange={(val) => updateStatus(item.id, val)}
  >
    <SelectTrigger className="h-8 border-0 bg-transparent hover:bg-muted/30 px-0">
      <StatusBadge 
        config={getOrderStatusConfig(item.status)}
        size="sm"
        animated={true}
      />
    </SelectTrigger>
    <SelectContent>
      {/* Options */}
    </SelectContent>
  </Select>
</TableCell>
```

### Dans une Card

```tsx
<div className="flex items-center gap-2">
  <span>{user.position}</span>
  <StatusBadge 
    config={getUserRoleConfig(user.role)}
    size="md"
  />
</div>
```

### Badge en Lecture Seule

```tsx
<StatusBadge 
  config={getProductTypeConfig(product.type)}
  size="md"
/>
```
