# Système de Recherche Universel (Admin + Front)

## Vue d'ensemble

Le système de recherche **dynamique** permet aux utilisateurs de naviguer rapidement vers n'importe quelle page du site (front-end, dashboard, admin) ainsi que vers des sections spécifiques, onglets ou éléments de documentation. Le système s'adapte automatiquement aux permissions de l'utilisateur pour n'afficher que les pages accessibles.

## Architecture

### 🏗️ Structure en 3 couches

1. **Catalogue centralisé** : [`lib/search-catalog.ts`](../lib/search-catalog.ts)
   - Définition de tous les éléments indexés
   - Fonction de filtrage selon les permissions
   - Fonction de recherche avec scoring

2. **API endpoint** : [`app/api/search/catalog/route.ts`](../app/api/search/catalog/route.ts)
   - Charge le catalogue selon les rôles de l'utilisateur
   - Retourne uniquement les pages accessibles
   - Cache possible pour performance

3. **Composant UI** : [`components/layout/private-dashboard/header.tsx`](../components/layout/private-dashboard/header.tsx)
   - Charge le catalogue depuis l'API
   - Interface de recherche avec debounce
   - Navigation instantanée

## Localisation

- **Composant UI** : Barre de recherche dans le header (desktop uniquement)
- **Catalogue** : Fichier TypeScript centralisé et réutilisable
- **API** : Endpoint REST accessible à `/api/search/catalog`

## Fonctionnalités

### 1. Recherche Dynamique Multi-niveaux

Le système indexe automatiquement :
- ✅ **Pages publiques** : Accueil, Boutique, Tarifs, Contact, À propos
- ✅ **Pages d'authentification** : Connexion, Inscription
- ✅ **Pages légales** : Privacy, Terms, Mentions
- ✅ **Dashboard utilisateur** : Profil, Paiements, Calendrier, Rendez-vous
- ✅ **Administration** : Users, Orders, Products, Settings, etc.
- ✅ **Onglets de configuration** : Settings > General, Logs, Pages ACL
- ✅ **Types de produits** : Standard, Gratuits, Digitaux, Rendez-vous
- ✅ **Sections spécifiques** : Logo, SEO, GTM, Headers HTTP, etc.
- ✅ **Documentation** : Quick Start, Architecture, Troubleshooting, etc.

### 2. Filtrage par Permissions

Le catalogue est automatiquement filtré selon :
- **Utilisateur non connecté** : Pages publiques uniquement
- **Utilisateur authentifié** : Pages publiques + Dashboard
- **Administrateur** : Toutes les pages + Admin

### 3. Algorithme de Scoring Intelligent

```typescript
Correspondance exacte du nom : +100 points
Début du nom : +50 points
Inclusion dans le nom : +30 points
Inclusion dans le path : +20 points
Mots-clés : +15 points
Catégorie : +10 points
Description : +5 points
```

### 3. Navigation par Ancres

Pour les pages avec onglets (comme Settings), le système utilise des ancres URL :
- `/admin/settings` → Onglet General (par défaut)
- `/admin/settings#logs` → Onglet System Logs
- `/admin/settings#pages` → Onglet Pages ACL

### 4. Support des Query Params

Pour les filtres (comme les types de produits) :
- `/admin/products?type=standard` → Filtre produits standard
- `/admin/products?type=free` → Filtre produits gratuits
- `/admin/products?type=digital` → Filtre produits digitaux
- `/admin/products?type=appointment` → Filtre produits rendez-vous

## Structure du Catalogue

### Interface SearchElement

```typescript
interface SearchElement {
  name: string              // Nom affiché
  path: string              // Chemin de navigation
  category: string          // Catégorie pour filtrage
  keywords: string[]        // Mots-clés de recherche
  section?: string          // Section (front, dashboard, admin, docs)
  description?: string      // Description optionnelle
  requiresAuth?: boolean    // Nécessite authentification
  requiresAdmin?: boolean   // Nécessite rôle admin
}
```

### Sections du Catalogue

Le catalogue est organisé en modules exportés :

1. **`frontendPages`** - Pages publiques du site
2. **`dashboardPages`** - Pages du dashboard utilisateur
3. **`adminPages`** - Pages principales d'administration
4. **`productsPages`** - Gestion des produits et filtres
5. **`settingsPages`** - Paramètres et onglets
6. **`configPages`** - Autres configurations (Email, API, Legal)
7. **`documentationPages`** - Pages de documentation

## Catalogue de Recherche

Voir le fichier [`lib/search-catalog.ts`](../lib/search-catalog.ts) pour la liste complète et à jour.

### Exemples par Section

#### Pages Front-End (Public)

| Nom | Path | Mots-clés |
|-----|------|-----------|
| Accueil | `/` | home, accueil, landing |
| Boutique | `/store` | store, shop, boutique, magasin, acheter |
| Tarifs & Plans | `/pricing` | pricing, tarifs, plans, abonnements |
| Contact | `/contact` | contact, support, aide |
| Mentions légales | `/legal/mentions` | legal, mentions légales, juridique |
| Privacy | `/legal/privacy` | privacy, confidentialité, rgpd, gdpr |

#### Dashboard Utilisateur (Authentifié)

| Nom | Path | Mots-clés |
|-----|------|-----------|
| Dashboard Principal | `/dashboard` | accueil, home, dashboard |
| Mon Profil | `/dashboard/profile` | profile, compte, utilisateur, settings |
| Paiements | `/dashboard/payments` | billing, facture, paiement |
| Calendrier | `/dashboard/calendar` | calendar, calendrier, planning |
| Mes Rendez-vous | `/dashboard/appointments` | appointments, rendez-vous, booking |

## Utilisation

### Pour l'utilisateur

1. Cliquer dans la barre de recherche en haut à droite
2. Taper des mots-clés (français ou anglais)
3. Sélectionner le résultat souhaité
4. Navigation automatique vers la page/onglet/section

### Exemples de recherches

- **"logs"** → Trouve "Logs Système" et navigue vers `/admin/settings#logs`
- **"logo"** → Trouve "Logo & Branding" et navigue vers `/admin/settings#general`
- **"gratuit"** → Trouve "Produits Gratuits" et navigue vers `/admin/products`
- **"acl"** → Trouve "Pages & ACL" et navigue vers `/admin/settings#pages`
- **"gtm"** → Trouve "Google Tag Manager" et navigue vers `/admin/settings#general`
- **"seo"** → Trouve "SEO & Métadonnées" et navigue vers `/admin/settings#general`

## Ajouter de Nouveaux Éléments

### Méthode recommandée (Catalogue centralisé)

Éditer le fichier [`lib/search-catalog.ts`](../lib/search-catalog.ts) :

```typescript
// Ajouter dans la section appropriée (frontendPages, adminPages, etc.)
export const adminPages: SearchElement[] = [
  // ... éléments existants
  
  {
    name: "Nouvelle Fonctionnalité",
    path: "/admin/nouvelle-page",
    category: "Administration",
    section: "admin",
    keywords: ["nouveau", "new", "feature", "fonctionnalité"],
    description: "Description de la nouvelle page",
    requiresAuth: true,
    requiresAdmin: true
  },
]
```

### Propriétés importantes

| Propriété | Type | Requis | Description |
|-----------|------|--------|-------------|
| `name` | string | ✅ | Nom affiché dans les résultats |
| `path` | string | ✅ | Chemin de navigation (peut inclure #ancre ou ?params) |
| `category` | string | ✅ | Catégorie pour organisation |
| `section` | string | ❌ | Section (front, dashboard, admin, docs) |
| `keywords` | string[] | ✅ | Mots-clés de recherche (FR + EN) |
| `description` | string | ❌ | Description optionnelle (utilisée dans le scoring) |
| `requiresAuth` | boolean | ❌ | True si authentification requise |
| `requiresAdmin` | boolean | ❌ | True si rôle admin requis |

### Bonnes pratiques

1. **Nom clair et descriptif**
   - ✅ "Gestion des Utilisateurs"
   - ❌ "Users"

2. **Path complet avec ancres/params si nécessaire**
   - ✅ `/admin/settings#logs` (pour onglet)
   - ✅ `/admin/products?type=free` (pour filtre)
   - ✅ `/admin/users` (page simple)

3. **Catégorie cohérente**
   - Utiliser les catégories existantes : Administration, Commerce, Configuration, etc.
   - Créer une nouvelle catégorie seulement si nécessaire

4. **Mots-clés riches et multilingues**
   - ✅ Inclure français ET anglais
   - ✅ Ajouter synonymes et variantes
   - ✅ Inclure abréviations (SEO, GTM, ACL, etc.)
   - ✅ Penser aux termes que les utilisateurs pourraient chercher

5. **Permissions appropriées**
   - Pages publiques : `requiresAuth: false` (ou omettre)
   - Dashboard : `requiresAuth: true`
   - Admin : `requiresAuth: true, requiresAdmin: true`

## Avantages du Système

### ✅ Architecture dynamique et centralisée
- Catalogue unique dans [`lib/search-catalog.ts`](../lib/search-catalog.ts)
- API endpoint qui filtre selon les permissions
- Facile à maintenir et à étendre

### ✅ Filtrage automatique par permissions
- Utilisateurs non connectés : Pages publiques uniquement
- Utilisateurs authentifiés : + Dashboard
- Administrateurs : Toutes les pages

### ✅ Résolution du problème de pagination
- Les utilisateurs peuvent trouver des sections spécifiques sans parcourir les pages paginées
- Exemple : Chercher "digital" pour trouver les produits digitaux sans filtrer manuellement

### ✅ Navigation dans les onglets
- Accès direct aux onglets sans avoir à naviguer d'abord vers la page puis cliquer sur l'onglet
- Exemple : Chercher "logs" mène directement à l'onglet Logs de Settings

### ✅ Découverte de fonctionnalités
- Les utilisateurs peuvent découvrir des fonctionnalités en tapant des mots-clés génériques
- Exemple : Chercher "google" révèle Google Tag Manager

### ✅ Support multilingue
- Fonctionne avec des mots-clés en français et en anglais
- Permet une adoption internationale

### ✅ Recherche dans tout le site
- Pages publiques (front-end)
- Dashboard utilisateur
- Administration
- Documentation

## Limitations Actuelles

1. **Desktop uniquement** : La barre de recherche est masquée sur mobile (contrainte d'espace)
2. **Cache simple** : Le catalogue est chargé une fois au chargement de la page
3. **Pas de recherche de contenu** : Ne recherche pas dans le contenu des pages, uniquement les titres et mots-clés

## Améliorations Futures Possibles

1. **Version mobile** : Modal de recherche accessible via un bouton sur mobile
2. **Cache amélioré** : Mise en cache côté client avec rafraîchissement périodique
3. **Historique de recherche** : Mémoriser les recherches récentes
4. **Suggestions** : Afficher des suggestions populaires
5. **Raccourci clavier** : Ajouter un raccourci type `Cmd+K` ou `Ctrl+K`
6. **Recherche de données** : Rechercher dans les produits, utilisateurs, commandes, etc.
7. **Indexation automatique** : Scanner automatiquement les routes du projet
8. **Analytics** : Tracker les recherches pour améliorer le catalogue

## Flux de Données

```
┌──────────────┐
│   Utilisateur│
│  se connecte │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ Header charge le         │
│ catalogue via API        │
│ /api/search/catalog      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ API vérifie les rôles    │
│ de l'utilisateur         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ getFilteredCatalog()     │
│ filtre selon permissions │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Retour du catalogue      │
│ filtré au client         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Utilisateur tape une     │
│ recherche                │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ searchCatalog() calcule  │
│ les scores et trie       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Affichage des résultats  │
│ (max 8)                  │
└──────────────────────────┘
```

## Performance

- **Debounce** : 300ms pour éviter trop de recalculs
- **Limitation** : Affichage de 8 résultats maximum
- **Tri intelligent** : Résultats triés par pertinence (scoring)

## Maintenance

Lors de l'ajout de nouvelles pages ou fonctionnalités :

1. ✅ **Ajouter l'entrée** dans [`lib/search-catalog.ts`](../lib/search-catalog.ts)
2. ✅ **Définir les permissions** (`requiresAuth`, `requiresAdmin`)
3. ✅ **Définir des mots-clés pertinents** (français + anglais)
4. ✅ **Tester la recherche** avec différents termes
5. ✅ **Mettre à jour cette documentation** si nécessaire

### Exemple complet

```typescript
// Dans lib/search-catalog.ts

export const adminPages: SearchElement[] = [
  // ... autres pages
  
  {
    name: "Gestion des Rapports",
    path: "/admin/reports",
    category: "Analytics",
    section: "admin",
    keywords: [
      "reports", "rapports",
      "analytics", "analytique",
      "statistics", "statistiques",
      "dashboard", "tableau de bord"
    ],
    description: "Consulter les rapports et statistiques",
    requiresAuth: true,
    requiresAdmin: true
  },
]
```

## Fichiers du Système

| Fichier | Rôle | Description |
|---------|------|-------------|
| [`lib/search-catalog.ts`](../lib/search-catalog.ts) | Catalogue | Définition de tous les éléments indexés |
| [`app/api/search/catalog/route.ts`](../app/api/search/catalog/route.ts) | API | Endpoint qui retourne le catalogue filtré |
| [`components/layout/private-dashboard/header.tsx`](../components/layout/private-dashboard/header.tsx) | UI | Interface de recherche |
| [`docs/ADMIN_SEARCH_SYSTEM.md`](./ADMIN_SEARCH_SYSTEM.md) | Documentation | Ce fichier |

## Support

Pour toute question ou problème :
- Consulter le code source du catalogue : [`lib/search-catalog.ts`](../lib/search-catalog.ts)
- Vérifier les logs de la console en cas d'erreur
- Tester avec différents mots-clés pour optimiser le scoring
- Vérifier que l'API `/api/search/catalog` retourne bien les données

