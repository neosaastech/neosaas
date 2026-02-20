# Search Catalog

## Description

Ce fichier contient le catalogue centralisé de recherche utilisé par le système de recherche universel du site.

## Structure

Le catalogue est organisé en modules exportés :

- **`frontendPages`** - Pages publiques du site front-end
- **`dashboardPages`** - Pages du dashboard utilisateur (authentifié)
- **`adminPages`** - Pages principales d'administration
- **`productsPages`** - Gestion des produits et filtres par type
- **`settingsPages`** - Paramètres, onglets et sections
- **`configPages`** - Autres configurations (Email, API, Legal)
- **`documentationPages`** - Pages de documentation

## Fonctions utilitaires

### `getFullSearchCatalog()`

Retourne le catalogue complet en combinant tous les modules.

```typescript
const catalog = getFullSearchCatalog()
```

### `getFilteredCatalog(userRoles?: string[])`

Filtre le catalogue selon les rôles de l'utilisateur.

```typescript
const catalog = getFilteredCatalog(['admin'])
// Retourne toutes les pages accessibles aux admins
```

### `searchCatalog(query: string, catalog: SearchElement[])`

Recherche dans le catalogue avec algorithme de scoring.

```typescript
const results = searchCatalog('produits', catalog)
// Retourne les résultats triés par pertinence
```

## Utilisation

### Dans l'API

```typescript
import { getFilteredCatalog } from '@/lib/search-catalog'

const catalog = getFilteredCatalog(userRoles)
return NextResponse.json({ catalog })
```

### Dans un composant

```typescript
import { searchCatalog, type SearchElement } from '@/lib/search-catalog'

const results = searchCatalog(query, catalogFromAPI)
```

## Ajouter un nouvel élément

```typescript
export const adminPages: SearchElement[] = [
  // ... éléments existants
  
  {
    name: "Nouvelle Page",
    path: "/admin/nouvelle-page",
    category: "Administration",
    section: "admin",
    keywords: ["nouveau", "new", "page"],
    description: "Description de la page",
    requiresAuth: true,
    requiresAdmin: true
  },
]
```

## Documentation complète

Voir [`docs/ADMIN_SEARCH_SYSTEM.md`](../docs/ADMIN_SEARCH_SYSTEM.md) pour la documentation complète.
