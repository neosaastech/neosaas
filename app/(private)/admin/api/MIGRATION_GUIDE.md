# 🚀 Migration Guide - Nouveau Système API Hiérarchique

## 📋 Ce qui a été créé

### ✅ Fichiers créés

1. **Base de données** (`db/schema.ts`)
   - Tables `service_brands`, `service_apis`, `service_api_configs`
   - Relations hiérarchiques Brand → APIs → Configs

2. **Définitions des services** (`lib/data/service-brands.ts`)
   - Définition centralisée de tous les services
   - 8 brands préconfigurés (GitHub, Google, Stripe, PayPal, Lago, Resend, AWS, Scaleway)
   - Configuration des champs requis pour chaque API

3. **Composants UI**
   - `components/admin/brand-service-selector.tsx` - Sélecteur hiérarchique pleine largeur
   - `components/admin/service-api-table.tsx` - Table avec filtres avancés
   - `components/admin/service-config-sheet.tsx` - Formulaire de configuration dynamique

4. **Page de démonstration**
   - `app/(private)/admin/api/page-new.tsx` - Nouvelle version utilisant les composants hiérarchiques

5. **Documentation**
   - `docs/ADMIN_API_MANAGEMENT.md` - Documentation complète du système

---

## 🔄 Comment tester le nouveau système

### Étape 1 : Sauvegarder l'ancien système

```bash
cd app/(private)/admin/api/
mv page.tsx page-old.tsx
```

### Étape 2 : Activer le nouveau système

```bash
mv page-new.tsx page.tsx
```

### Étape 3 : Redémarrer le serveur de développement

```bash
pnpm dev
```

### Étape 4 : Tester l'interface

1. Ouvrir `http://localhost:3000/admin/api`
2. Cliquer sur "Add API"
3. Tester le nouveau sélecteur hiérarchique :
   - Sélectionner un Brand (ex: GitHub)
   - Sélectionner une API (ex: OAuth Authentication)
   - Observer la carte de prévisualisation
4. Remplir le formulaire (les champs sont dynamiques selon l'API choisie)
5. Tester la connexion (optionnel, mock pour l'instant)
6. Sauvegarder

---

## 🔌 Implémenter les Routes API (À faire)

Le nouveau système nécessite quelques routes API pour fonctionner complètement :

### Route 1 : Lister toutes les configurations

**Fichier** : `app/api/admin/services/configs/route.ts`

```typescript
import { NextResponse } from "next/server"
import { db } from "@/db"
import { serviceApiConfigs, serviceApis, serviceBrands } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  try {
    // Fetch all configs with brand and API info
    const configs = await db
      .select({
        id: serviceApiConfigs.id,
        environment: serviceApiConfigs.environment,
        isActive: serviceApiConfigs.isActive,
        isDefault: serviceApiConfigs.isDefault,
        lastTestedAt: serviceApiConfigs.lastTestedAt,
        lastTestStatus: serviceApiConfigs.lastTestStatus,
        lastTestMessage: serviceApiConfigs.lastTestMessage,
        metadata: serviceApiConfigs.metadata,
        apiId: serviceApis.id,
        apiName: serviceApis.name,
        apiType: serviceApis.apiType,
        brandId: serviceBrands.id,
        brandName: serviceBrands.name,
        brandSlug: serviceBrands.slug,
      })
      .from(serviceApiConfigs)
      .innerJoin(serviceApis, eq(serviceApiConfigs.serviceApiId, serviceApis.id))
      .innerJoin(serviceBrands, eq(serviceApis.brandId, serviceBrands.id))

    return NextResponse.json({
      success: true,
      data: configs
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

### Route 2 : Créer/Mettre à jour une configuration

**Fichier** : `app/api/admin/services/configs/route.ts` (ajouter POST/PUT)

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { brandId, apiId, environment, config } = body

    // 1. Find the service API
    const api = await db
      .select()
      .from(serviceApis)
      .where(eq(serviceApis.id, apiId))
      .limit(1)

    if (!api[0]) {
      throw new Error('API not found')
    }

    // 2. Encrypt the config
    const encryptedConfig = encryptData(JSON.stringify(config))

    // 3. Insert into DB
    const [newConfig] = await db
      .insert(serviceApiConfigs)
      .values({
        serviceApiId: api[0].id,
        environment,
        isActive: true,
        encryptedConfig,
        metadata: body.metadata || {}
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: newConfig
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

### Route 3 : Tester une configuration

**Fichier** : `app/api/admin/services/[brandSlug]/[apiId]/test/route.ts`

```typescript
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: { brandSlug: string; apiId: string } }
) {
  try {
    const { config } = await request.json()
    const { brandSlug, apiId } = params

    // Test logic based on brandSlug and apiId
    if (brandSlug === 'github' && apiId === 'github-oauth') {
      // Test GitHub OAuth
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${config.clientId}`, // This is wrong, just for demo
          'Accept': 'application/vnd.github+json'
        }
      })

      if (!response.ok) {
        throw new Error('Invalid GitHub credentials')
      }

      return NextResponse.json({
        success: true,
        message: 'GitHub OAuth credentials are valid',
        responseTime: 120
      })
    }

    // Add more test logic for other services...

    return NextResponse.json({
      success: false,
      message: 'Test not implemented for this service'
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 400 })
  }
}
```

---

## 🗄️ Migration de la Base de Données

### Étape 1 : Appliquer le nouveau schéma

```bash
pnpm db:push
```

Cela créera les nouvelles tables :
- `service_brands`
- `service_apis`
- `service_api_configs`

### Étape 2 : Seed les brands et APIs (optionnel)

Créer un script de seed : `db/seed-services.ts`

```typescript
import { db } from "./index"
import { serviceBrands, serviceApis } from "./schema"
import { SERVICE_BRANDS } from "@/lib/data/service-brands"

async function seedServices() {
  console.log("🌱 Seeding service brands and APIs...")

  for (const brandDef of SERVICE_BRANDS) {
    // Insert brand
    const [brand] = await db
      .insert(serviceBrands)
      .values({
        name: brandDef.name,
        slug: brandDef.slug,
        description: brandDef.description,
        logoUrl: brandDef.logoUrl,
        websiteUrl: brandDef.websiteUrl,
        category: brandDef.category,
        isActive: brandDef.isActive,
        sortOrder: brandDef.sortOrder,
      })
      .onConflictDoNothing()
      .returning()

    // Insert APIs for this brand
    for (const apiDef of brandDef.apis) {
      await db
        .insert(serviceApis)
        .values({
          brandId: brand.id,
          name: apiDef.name,
          slug: apiDef.slug,
          description: apiDef.description,
          apiType: apiDef.apiType,
          documentationUrl: apiDef.documentationUrl,
          isActive: true,
          metadata: {
            requiredFields: apiDef.requiredFields,
            testable: apiDef.testable
          }
        })
        .onConflictDoNothing()
    }
  }

  console.log("✅ Service brands and APIs seeded!")
}

seedServices()
```

Exécuter :
```bash
tsx db/seed-services.ts
```

---

## 📊 Comparaison Avant/Après

### Avant (Ancien Système)

```typescript
// Liste plate, pas de hiérarchie
const services = [
  { id: "github", name: "GitHub", icon: "github" },
  { id: "stripe", name: "Stripe", icon: "stripe" },
]

// Formulaire avec switch/case géant
switch (selectedService) {
  case "github":
    return <GithubFields />
  case "stripe":
    return <StripeFields />
  // ...
}
```

**Problèmes** :
- ❌ Pas de distinction entre OAuth GitHub et GitHub API
- ❌ Logos hardcodés dans le code
- ❌ Duplication de logique pour chaque service
- ❌ Difficile d'ajouter de nouveaux services

### Après (Nouveau Système)

```typescript
// Définition centralisée et hiérarchique
const SERVICE_BRANDS = [
  {
    id: 'github',
    name: 'GitHub',
    apis: [
      { id: 'github-oauth', name: 'OAuth', requiredFields: [...] },
      { id: 'github-api', name: 'REST API', requiredFields: [...] }
    ]
  }
]

// Formulaire dynamique
{selectedApi.requiredFields.map(field => (
  <DynamicField key={field.name} field={field} />
))}
```

**Avantages** :
- ✅ Hiérarchie claire Brand → APIs
- ✅ Logos centralisés
- ✅ Formulaires générés automatiquement
- ✅ Facile d'ajouter un nouveau service (juste modifier `service-brands.ts`)

---

## 🎨 Aperçu Visuel

### Sélecteur Hiérarchique

```
┌─────────────────────────────────────────────────────┐
│ Filter by Category                                  │
│ ┌───────────────────────────────────────────────┐   │
│ │ 🔐 Authentication & OAuth                     │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Select Service Provider / Brand *                   │
│ ┌───────────────────────────────────────────────┐   │
│ │ [🐙] GitHub - Authentication & OAuth          │   │
│ └───────────────────────────────────────────────┘   │
│                                                      │
│ Options:                                             │
│   🔐 Authentication & OAuth                          │
│     ├─ [🐙] GitHub                                   │
│     └─ [G] Google                                    │
│   💳 Payments & Billing                              │
│     ├─ [Stripe] Stripe                               │
│     └─ [PayPal] PayPal                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Select API / Service Type * (2 available)           │
│ ┌───────────────────────────────────────────────┐   │
│ │ [OAUTH] OAuth Authentication                  │   │
│ │         GitHub OAuth 2.0 for user auth        │   │
│ └───────────────────────────────────────────────┘   │
│                                                      │
│ Options:                                             │
│   [OAUTH] OAuth Authentication                       │
│   [REST] REST API (Personal Access Token)           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📋 Preview                                           │
│ ┌───────────────────────────────────────────────┐   │
│ │ [🐙] GitHub → OAuth Authentication            │   │
│ │                                                │   │
│ │ GitHub OAuth 2.0 for user authentication      │   │
│ │                                                │   │
│ │ [🔐 Auth] [oauth] [✓ Testable]                │   │
│ │                                                │   │
│ │ 📚 View Documentation →                        │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Migration

- [ ] Sauvegarder l'ancienne page (`page.tsx` → `page-old.tsx`)
- [ ] Activer la nouvelle page (`page-new.tsx` → `page.tsx`)
- [ ] Appliquer le schéma DB (`pnpm db:push`)
- [ ] Seed les brands/APIs (optionnel mais recommandé)
- [ ] Implémenter les routes API :
  - [ ] `GET /api/admin/services/configs`
  - [ ] `POST /api/admin/services/configs`
  - [ ] `PUT /api/admin/services/configs/:id`
  - [ ] `DELETE /api/admin/services/configs/:id`
  - [ ] `POST /api/admin/services/:brand/:api/test`
- [ ] Tester l'ajout d'une nouvelle configuration
- [ ] Tester la modification d'une configuration existante
- [ ] Tester la suppression
- [ ] Tester les filtres de la table
- [ ] Vérifier que les logos s'affichent correctement
- [ ] Migrer les configurations existantes (si nécessaire)

---

## 🆘 Troubleshooting

### Erreur : "Cannot find module '@/lib/data/service-brands'"

**Solution** : Le fichier `service-brands.ts` a bien été créé. Redémarrer le serveur de développement.

### Les logos GitHub/Google ne s'affichent pas

**Solution** : Les logos sont en SVG inline dans les composants. Si vous voulez utiliser des images :
1. Placer les images dans `/public/images/brands/`
2. Changer `logoComponent: 'svg'` en `logoComponent: 'image'`

### Erreur DB : "relation service_brands does not exist"

**Solution** : Lancer `pnpm db:push` pour créer les nouvelles tables.

### Les champs du formulaire sont vides

**Solution** : Vérifier que vous avez bien sélectionné un Brand ET une API dans le sélecteur.

---

## 📚 Documentation Complète

Voir [`docs/ADMIN_API_MANAGEMENT.md`](../../docs/ADMIN_API_MANAGEMENT.md) pour la documentation complète du système.

---

**Dernière mise à jour** : 23 janvier 2026  
**Prêt pour production** : Non (nécessite implémentation des routes API)  
**Prêt pour tests** : Oui (avec données mock)
