# 🔌 Admin API Management - Hierarchical Service System

> **Date de création** : 23 janvier 2026  
> **Dernière mise à jour** : 16 février 2026  
> **Statut** : ✅ Implémenté  
> **Auteur** : Système NeoSaaS

---

## 📋 Vue d'Ensemble

Le système de gestion des APIs dans l'interface admin utilise une architecture hiérarchique **Brand → Services → APIs** pour organiser et gérer toutes les intégrations de services externes (OAuth, paiement, email, cloud, etc.).

### Problèmes Résolus

✅ **Logos 404** - Images manquantes pour certains services  
✅ **Sélecteur étroit** - Maintenant pleine largeur avec meilleure UX  
✅ **Services désorganisés** - Regroupement logique par marque et catégorie  
✅ **Duplication de configuration** - Un seul endroit pour configurer chaque API  

---

## 🏗️ Architecture

### Hiérarchie à 3 Niveaux

```
Brand (GitHub, Google, Stripe...)
  └── Services/APIs (OAuth, REST API, CLI...)
       └── Configurations (dev, staging, prod)
```

**Exemple concret :**
```
GitHub
  ├── OAuth Authentication (clientId, clientSecret)
  └── REST API (personalAccessToken)

Google
  ├── OAuth 2.0 (clientId, clientSecret, redirectUri)
  └── Calendar API (apiKey, serviceAccountEmail)

Scaleway
  ├── Transactional Email (secretKey, projectId)
  └── Object Storage (accessKey, secretKey, region)
```

---

## 📁 Fichiers Créés

### 1. Schéma de Base de Données

**Fichier** : `db/schema.ts`

**Tables créées** :

#### `service_brands`
Représente les marques/fournisseurs de services (GitHub, Google, etc.)

```typescript
{
  id: uuid,
  name: text,          // 'GitHub', 'Google', 'Stripe'
  slug: text,          // 'github', 'google', 'stripe'
  description: text,
  logoUrl: text,       // Chemin vers le logo
  websiteUrl: text,
  category: text,      // 'auth', 'payment', 'email', 'cloud', etc.
  isActive: boolean,
  sortOrder: integer,
  metadata: jsonb,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `service_apis`
Les APIs/services individuels sous une marque

```typescript
{
  id: uuid,
  brandId: uuid,       // Référence à service_brands
  name: text,          // 'OAuth Authentication', 'REST API'
  slug: text,          // 'oauth', 'rest-api'
  description: text,
  apiType: text,       // 'oauth', 'rest', 'graphql', 'cli', 'webhook'
  documentationUrl: text,
  isActive: boolean,
  sortOrder: integer,
  metadata: jsonb,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `service_api_configs`
Configurations réelles avec credentials chiffrés

```typescript
{
  id: uuid,
  serviceApiId: uuid,     // Référence à service_apis
  environment: text,       // 'development', 'staging', 'production'
  isActive: boolean,
  isDefault: boolean,
  encryptedConfig: text,   // AES-256-GCM encrypted credentials
  lastTestedAt: timestamp,
  lastTestStatus: text,    // 'success', 'failed', 'pending'
  lastTestMessage: text,
  metadata: jsonb,         // Non-sensitive metadata (regions, domains)
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. Définitions des Services

**Fichier** : `lib/data/service-brands.ts`

Contient la définition centralisée de tous les services disponibles :

```typescript
export const SERVICE_BRANDS: ServiceBrandDefinition[] = [
  {
    id: 'github',
    name: 'GitHub',
    slug: 'github',
    category: 'authentication',
    logoUrl: '/images/brands/github-logo.svg',
    apis: [
      {
        id: 'github-oauth',
        name: 'OAuth Authentication',
        apiType: 'oauth',
        requiredFields: [
          { name: 'clientId', label: 'Client ID', type: 'text', required: true },
          { name: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
          // ...
        ]
      },
      // ...
    ]
  },
  // ... autres brands
]
```

**Services actuellement définis** :
- GitHub (OAuth, REST API)
- Google (OAuth, Calendar API)
- Stripe (Payment Processing)
- PayPal (Checkout & Payments)
- Lago (Billing & Subscriptions)
- Resend (Email Delivery)
- AWS (SES)
- Scaleway (TEM, Object Storage)

### 3. Composants UI

#### `components/admin/brand-service-selector.tsx`

Sélecteur hiérarchique en 2 étapes :

**Features** :
- ✅ Sélection Brand (étape 1)
- ✅ Sélection API/Service (étape 2)
- ✅ Filtre par catégorie
- ✅ Affichage des logos
- ✅ Carte de prévisualisation
- ✅ Pleine largeur responsive

**Utilisation** :
```tsx
<BrandServiceSelector
  selectedBrandId={brandId}
  selectedApiId={apiId}
  onBrandChange={setBrandId}
  onApiChange={(apiId, brand, api) => {
    // Handle selection
  }}
  showCategoryFilter={true}
/>
```

#### `components/admin/service-api-table.tsx`

Table avec filtres avancés et tri :

**Features** :
- ✅ Recherche par nom
- ✅ Filtre par catégorie, brand, environnement
- ✅ Tri par brand, API, date de test
- ✅ Affichage du statut (Active, Last Test)
- ✅ Actions (Test, Edit, Delete)
- ✅ Logos des brands
- ✅ Badge spécial pour Payment Providers
- ✅ **Badges environnement colorés** (ajout 16 fév. 2026) :
  - 🟢 `PROD` (vert + icône Rocket) — environnement production
  - 🟡 `TEST` / `SANDBOX` (ambré + icône FlaskConical) — environnement test/sandbox
  - ⚪ Autre (gris + icône ShieldAlert) — environnement non défini
- ✅ **Fond de ligne conditionnel** : ambré pour test/sandbox, violet pour paiement

**Utilisation** :
```tsx
<ServiceApiTable
  configs={allConfigs}
  loading={loading}
  onTest={handleTest}
  onEdit={handleEdit}
  onDelete={handleDelete}
  testingId={testingId}
/>
```

#### `components/admin/service-config-sheet.tsx`

Formulaire de configuration dynamique :

**Features** :
- ✅ Champs dynamiques basés sur `requiredFields` de l'API
- ✅ Validation des champs requis
- ✅ Masquage/affichage des mots de passe
- ✅ Sélection d'environnement
- ✅ Test de connexion
- ✅ Affichage des résultats de test
- ✅ Liens vers documentation

**Utilisation** :
```tsx
<ServiceConfigSheet
  open={sheetOpen}
  onOpenChange={setSheetOpen}
  mode="create" // or "edit"
  onSave={async (config) => {
    // Save logic
  }}
  onTest={async (config) => {
    // Test logic
    return { success: true, message: "Connection successful" }
  }}
/>
```

---

## 🎨 UX/UI Améliorations

### Avant (Problèmes)

❌ Liste déroulante simple et étroite  
❌ Pas de logos visibles  
❌ Tous les services mélangés  
❌ Pas de regroupement logique  
❌ Difficulté à trouver un service spécifique  

### Après (Améliorations)

✅ **Sélecteur hiérarchique pleine largeur**
- Étape 1 : Choisir le brand (GitHub, Google, etc.)
- Étape 2 : Choisir le service/API sous ce brand

✅ **Logos visibles partout**
- Dans le sélecteur
- Dans la table
- SVG pour GitHub, Google
- Images pour Stripe, PayPal
- Icônes custom pour Scaleway

✅ **Regroupement par catégories**
- 🔐 Authentication & OAuth
- ☁️ Cloud Services
- 💳 Payments & Billing
- 📧 Email Services
- 🗄️ Storage & CDN

✅ **Filtres avancés**
- Par catégorie
- Par brand
- Par environnement (production, test, sandbox) — avec icônes Rocket/FlaskConical dans le dropdown
- Recherche textuelle

✅ **Tri flexible**
- Par nom de brand
- Par nom d'API
- Par date de dernier test

✅ **Carte de prévisualisation**
- Montre Brand + API sélectionnés
- Catégorie et type d'API
- Badge "Testable" si applicable
- Lien vers documentation

---

## 🔧 Configuration d'une Nouvelle API

### Étape 1 : Ajouter le Brand (si nouveau)

Dans `lib/data/service-brands.ts` :

```typescript
{
  id: 'new-brand',
  name: 'New Brand',
  slug: 'new-brand',
  description: 'Description du service',
  logoUrl: '/images/brands/new-brand-logo.svg',
  websiteUrl: 'https://newbrand.com',
  category: 'cloud', // ou auth, payment, email, etc.
  isActive: true,
  sortOrder: 50,
  apis: [
    // ... définir les APIs ci-dessous
  ]
}
```

### Étape 2 : Définir les APIs

```typescript
apis: [
  {
    id: 'new-brand-api',
    name: 'API Name',
    slug: 'api-name',
    description: 'What this API does',
    apiType: 'rest', // oauth, rest, graphql, cli, webhook
    documentationUrl: 'https://docs.newbrand.com',
    testable: true, // Peut-on tester cette API ?
    requiredFields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password', // text, password, url, select
        placeholder: 'sk_...',
        required: true,
        helpText: 'Found in your dashboard under API Keys'
      },
      {
        name: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: [
          { value: 'us-east-1', label: 'US East' },
          { value: 'eu-west-1', label: 'EU West' },
        ]
      }
    ]
  }
]
```

### Étape 3 : Ajouter le Logo

Placer le fichier logo dans :
- `/public/images/brands/new-brand-logo.svg` (pour SVG)
- `/public/images/brands/new-brand-logo.png` (pour PNG)

Ou utiliser un composant SVG inline dans `brand-service-selector.tsx` et `service-api-table.tsx` (voir exemples GitHub/Google).

### Étape 4 : Implémenter la Route API de Test (optionnel)

Si `testable: true`, créer :

`app/api/admin/services/[brand]/[api]/test/route.ts`

```typescript
export async function POST(request: Request) {
  const { config } = await request.json()
  
  try {
    // Tester la connexion avec les credentials
    const response = await fetch('https://api.newbrand.com/test', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    })
    
    if (!response.ok) throw new Error('Invalid credentials')
    
    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      responseTime: 123
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 400 })
  }
}
```

---

## 🔐 Sécurité

### Chiffrement des Credentials

Toutes les configurations sont chiffrées avant stockage :
- **Algorithme** : AES-256-GCM
- **Stockage** : Colonne `encryptedConfig` dans `service_api_configs`
- **Clé de chiffrement** : Variable d'environnement `ENCRYPTION_KEY`

### Métadonnées Non-Sensibles

Données **NON chiffrées** stockées dans `metadata` :
- Régions (AWS, Scaleway)
- Domaines (Resend)
- Redirect URIs (OAuth)
- Toute donnée publique ou non-sensible

### Affichage Sécurisé

- Mots de passe masqués par défaut
- Bouton Eye/EyeOff pour afficher temporairement
- Jamais de credentials dans les URLs
- Pas de logs des credentials

---

## 📊 Catégories de Services

| Catégorie | Icon | Exemples |
|-----------|------|----------|
| Authentication & OAuth | 🔐 | GitHub OAuth, Google OAuth |
| Cloud Services | ☁️ | AWS, Scaleway, Azure |
| Payments & Billing | 💳 | Stripe, PayPal, Lago |
| Email Services | 📧 | Resend, AWS SES, Scaleway TEM |
| Storage & CDN | 🗄️ | Scaleway Object Storage, AWS S3 |
| Communication | 💬 | Twilio, SendGrid |
| Development Tools | 👨‍💻 | GitHub API, GitLab |
| Analytics & Tracking | 📊 | Google Analytics, Mixpanel |

---

## 🧪 Tests

### Test de Configuration Manuelle

1. Ouvrir `/admin/api`
2. Cliquer sur "Add API"
3. Sélectionner un Brand (ex: GitHub)
4. Sélectionner une API (ex: OAuth)
5. Remplir les champs requis
6. Cliquer "Test Connection"
7. Vérifier le résultat (✅ Success ou ❌ Failed)
8. Sauvegarder

### Test Automatisé des Routes API

```bash
# Test GitHub OAuth
curl -X POST http://localhost:3000/api/admin/services/github/oauth/test \
  -H "Content-Type: application/json" \
  -d '{"config": {"clientId": "xxx", "clientSecret": "yyy"}}'

# Test Stripe
curl -X POST http://localhost:3000/api/admin/services/stripe/payments/test \
  -H "Content-Type: application/json" \
  -d '{"config": {"secretKey": "sk_test_xxx"}}'
```

---

## 🚀 Migration depuis l'Ancien Système

### Ancien Système (À Remplacer)

```typescript
const services = [
  { id: "github", name: "GitHub", icon: "github" },
  { id: "google", name: "Google", icon: "google" },
  // ... liste plate sans hiérarchie
]
```

### Nouveau Système (Hiérarchique)

```typescript
const SERVICE_BRANDS = [
  {
    id: 'github',
    name: 'GitHub',
    apis: [
      { id: 'github-oauth', name: 'OAuth' },
      { id: 'github-api', name: 'REST API' }
    ]
  }
]
```

### Mapping de Migration

| Ancien ID | Nouveau Brand | Nouveau API |
|-----------|---------------|-------------|
| `github` | `github` | `github-oauth` |
| `google` | `google` | `google-oauth` |
| `stripe` | `stripe` | `stripe-payments` |
| `scaleway` | `scaleway` | `scaleway-tem` |

---

## 📝 To-Do & Roadmap

### ✅ Fait
- [x] Schéma DB avec hiérarchie Brand → API → Config
- [x] Définitions centralisées dans `service-brands.ts`
- [x] Composant `BrandServiceSelector` pleine largeur
- [x] Composant `ServiceApiTable` avec filtres
- [x] Composant `ServiceConfigSheet` dynamique
- [x] Logos pour tous les services principaux
- [x] Documentation complète

### 🔄 En Cours
- [ ] Routes API CRUD complètes (`/api/admin/services/`)
- [ ] Migration des configurations existantes
- [ ] Tests automatisés pour tous les composants

### 📋 À Faire
- [ ] Ajout de nouveaux services (Twilio, SendGrid, Azure, etc.)
- [ ] Support multi-tenant (configs par compagnie)
- [ ] Historique des changements de configuration
- [ ] Notifications lors de tests échoués
- [ ] Dashboard de santé des APIs (uptime monitoring)
- [ ] Rotation automatique des clés
- [ ] Audit logs pour accès aux credentials

---

## 🆘 Support & Troubleshooting

### Les logos ne s'affichent pas

**Problème** : 404 sur `/images/brands/xxx-logo.svg`

**Solution** :
1. Vérifier que le fichier existe dans `/public/images/brands/`
2. Ou utiliser un composant SVG inline (voir exemples GitHub/Google)
3. Ou mettre `logoComponent: 'icon'` et gérer dans le code

### Les champs du formulaire n'apparaissent pas

**Problème** : Aucun champ affiché dans `ServiceConfigSheet`

**Solution** :
1. Vérifier que `requiredFields` est bien défini dans `service-brands.ts`
2. S'assurer que Brand + API sont bien sélectionnés
3. Vérifier la console pour erreurs TypeScript

### Le test de connexion échoue toujours

**Problème** : Tous les tests retournent "Failed"

**Solution** :
1. Vérifier que la route `/api/admin/services/[brand]/[api]/test/route.ts` existe
2. Tester les credentials manuellement via API directe
3. Vérifier les logs serveur pour voir l'erreur exacte
4. S'assurer que `testable: true` dans la définition

---

## 📚 Références

- [Architecture Globale](./ARCHITECTURE.md)
- [Admin Dashboard Organization](./ADMIN_DASHBOARD_ORGANIZATION.md)
- [Admin UX Patterns](./ADMIN_UX_PATTERNS.md)
- [Security Best Practices](./SECURITY.md)

---

---

## 📅 Changelog

### 16 février 2026
- **Badges environnement colorés** dans `service-api-table.tsx` : PROD (vert/Rocket), TEST/SANDBOX (ambré/FlaskConical), Autre (gris/ShieldAlert)
- **Fond de ligne conditionnel** : ambré pour test/sandbox, violet pour paiement
- **Icônes dans le filtre environnement** (Rocket, FlaskConical)
- **Test Stripe enrichi** : 5 endpoints (Balance, Customers, Products, Tax Rates, Invoices) au lieu de 1
- **Toggle test/live Stripe** piloté depuis Payment Config (`/admin` onglet 3)
- Correction auth `test-stripe/route.ts` : `user.roles?.some(...)` au lieu de `user.role`

### 23 janvier 2026
- Création initiale du système hiérarchique Brand → Services → APIs
- Composants BrandServiceSelector, ServiceApiTable, ServiceConfigSheet

---

**Dernière mise à jour** : 16 février 2026  
**Maintenance** : Ce document doit être mis à jour à chaque ajout de nouveau service
