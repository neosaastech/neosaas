# Composants UI - Status Badge

## Vue d'ensemble

Le composant `StatusBadge` fournit un affichage cohérent et réutilisable pour tous les badges de statut dans l'application (types de produits, statuts de commande, rôles utilisateur, etc.).

## Import

```tsx
import { StatusBadge } from "@/components/ui/status-badge"
```

## Utilisation Basique

```tsx
<StatusBadge 
  config={{
    label: "Active",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-300"
  }}
/>
```

## Avec Configurations Centralisées

Utilisez les configurations prédéfinies depuis `lib/status-configs.ts` :

```tsx
import { StatusBadge } from "@/components/ui/status-badge"
import { getUserRoleConfig } from "@/lib/status-configs"

<StatusBadge config={getUserRoleConfig(user.role)} />
```

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `config` | `StatusConfig` | **requis** | Configuration contenant label, icon et className |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Taille du badge |
| `onClick` | `() => void` | - | Fonction callback si le badge est cliquable |
| `animated` | `boolean` | `false` | Active l'animation scale au survol |

## Tailles

- **sm** : Compact (tableaux denses)
- **md** : Standard (affichage général)
- **lg** : Large (formulaires, en-têtes)

## Exemples

### Badge Simple

```tsx
<StatusBadge 
  config={getOrderStatusConfig("paid")}
  size="md"
/>
```

### Badge Animé

```tsx
<StatusBadge 
  config={getProductTypeConfig("digital")}
  size="sm"
  animated={true}
/>
```

### Badge dans un Select

```tsx
<Select value={status} onValueChange={setStatus}>
  <SelectTrigger className="border-0 bg-transparent">
    <StatusBadge 
      config={getOrderStatusConfig(status)}
      size="lg"
      animated={true}
    />
  </SelectTrigger>
  <SelectContent>
    {/* Options */}
  </SelectContent>
</Select>
```

## Voir aussi

- [Documentation complète du système de badges](../../docs/STATUS_BADGES_SYSTEM.md)
- [Configurations de statut](../../lib/status-configs.ts)
