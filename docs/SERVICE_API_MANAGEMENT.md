# Service API Management

Guide complet pour la gestion des configurations API des services tiers (Lago, Stripe, PayPal, Scaleway, Resend, AWS SES).

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Interface administrateur](#interface-administrateur)
- [Services supportés](#services-supportés)
- [Utilisation de l'API](#utilisation-de-lapi)
- [Sécurité](#sécurité)
- [Exemples d'utilisation](#exemples-dutilisation)

## Vue d'ensemble

Le système de gestion des API centralise la configuration de tous les services tiers utilisés par la plateforme. Toutes les clés API sont **chiffrées avec AES-256-GCM** avant d'être stockées dans la base de données.

### Fonctionnalités principales

✅ **Configuration centralisée** - Un seul endroit pour gérer toutes les API
✅ **Chiffrement fort** - AES-256-GCM pour toutes les données sensibles
✅ **Multi-environnement** - Production, Test, Sandbox
✅ **Test de connexion** - Validation des configurations avant utilisation
✅ **Tracking d'usage** - Statistiques d'utilisation de chaque API
✅ **Interface intuitive** - UI admin pour configuration facile

## Interface administrateur

### Accès

Naviguez vers `/admin/api` dans votre interface d'administration.

### Configurer un service

1. **Sélectionnez le service** dans le menu déroulant (Lago, Stripe, PayPal, Scaleway, Resend, AWS)
2. **Choisissez l'environnement** (Production, Test, Sandbox)
3. **Remplissez les champs requis** (marqués avec *)
4. **Testez la connexion** avec le bouton "Test Connection"
5. **Sauvegardez** avec le bouton "Save Configuration"

### Messages de feedback

- ✅ **Succès** : Toast vert en haut à droite
- ❌ **Erreur** : Toast rouge avec le message d'erreur
- 🔄 **Test** : Résultat affiché sous le formulaire (vert = succès, rouge = échec)

## Services supportés

### 1. Lago (Billing & Invoicing)

**Champs requis :**
- API Key (production)
- API Key test (optionnel)
- API URL (défaut : `https://api.getlago.com/v1`)

**Environnements :**
- Production : Clé API production
- Test/Dev : Clé API test

**Fonctionnalités :**
- Synchronisation automatique : customers, taxes, plans (abonnements), add-ons (ponctuels), coupons
- Mode dev/test/production configurable dans Admin > Settings > Payments
- Résultats de sync loggés dans `system_logs` (Admin > Settings > System Logs)
- Actions de paiement : factures, abonnements, enregistrement PayPal

> Voir [LAGO_CONFIGURATION.md](./LAGO_CONFIGURATION.md) pour la documentation complète.

### 2. Stripe (Paiements)

**Champs requis :**
- Secret Key (`sk_...`)
- Publishable Key (`pk_...`)
- Webhook Secret (optionnel)

**Environnements :**
- Production : `sk_live_...`, `pk_live_...`
- Test : `sk_test_...`, `pk_test_...`

**Intégration Lago :** Quand `lago_stripe_enabled = true`, chaque customer syncé vers Lago reçoit `billing_configuration.payment_provider = "stripe"`. La clé Stripe doit aussi être configurée dans le dashboard Lago (Organization > Integrations > Stripe).

### 3. PayPal (Paiements)

**Champs requis :**
- Client ID
- Client Secret
- Webhook ID (optionnel)

**Environnements :**
- Production : Mode `live`
- Sandbox : Mode `sandbox`

### 3. Scaleway (Cloud Infrastructure & Email TEM)

**Champs pour TEM (emails transactionnels) :**
| Champ | Requis pour TEM | Description |
|-------|-----------------|-------------|
| **Secret Key** | ✅ Oui | Clé secrète API (format UUID) |
| **Project ID** | ✅ Oui | ID du projet Scaleway (format UUID) |
| **Access Key** | ❌ Non | Identifiant de la clé API (non utilisé par TEM) |

**Champs optionnels :**
- Organization ID
- Region (fr-par, nl-ams, pl-waw) - dans metadata

> 💡 **Note pour Scaleway TEM** : Seuls la **Secret Key** et le **Project ID** sont requis pour l'envoi d'emails. L'Access Key n'est pas utilisé par l'API TEM. Voir [SCALEWAY_EMAIL_SETUP.md](./guides/SCALEWAY_EMAIL_SETUP.md) pour le guide complet.

**Où trouver ces informations :**
1. **Secret Key** : IAM → API Keys → Create API Key (visible une seule fois)
2. **Project ID** : Console Scaleway → Settings → Project Settings

### 4. Resend (Email)

**Champs requis :**
- API Key (`re_...`)
- Domain (optionnel)

### 5. AWS (Services Cloud)

**Champs requis :**
- Access Key ID (`AKIA...`)
- Secret Access Key
- Region (us-east-1, eu-west-1, etc.)
- Session Token (optionnel)

## Utilisation de l'API

### Endpoints disponibles

#### 1. Lister les configurations

```http
GET /api/services
GET /api/services?service=stripe
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serviceName": "stripe",
      "serviceType": "payment",
      "environment": "production",
      "isActive": true,
      "isDefault": true
    }
  ]
}
```

#### 2. Obtenir une configuration

```http
GET /api/services/stripe?environment=production
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "serviceName": "stripe",
    "serviceType": "payment",
    "environment": "production",
    "isActive": true,
    "config": {
      "secretKey": "sk_...",
      "publishableKey": "pk_...",
      "webhookSecret": "whsec_..."
    }
  }
}
```

#### 3. Créer/Mettre à jour une configuration

```http
POST /api/services/stripe
Content-Type: application/json

{
  "serviceType": "payment",
  "environment": "production",
  "isActive": true,
  "isDefault": true,
  "config": {
    "secretKey": "sk_...",
    "publishableKey": "pk_...",
    "webhookSecret": "whsec_..."
  }
}
```

#### 4. Tester une configuration

```http
POST /api/services/stripe/test
Content-Type: application/json

{
  "environment": "production"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Stripe configuration is valid",
  "responseTime": 245
}
```

#### 5. Statistiques d'usage

```http
GET /api/services/stripe/usage?configId=uuid&limit=100
```

#### 6. Supprimer une configuration

```http
DELETE /api/services/stripe?id=uuid
```

## Sécurité

### Chiffrement des données

Toutes les clés API sont chiffrées avant le stockage :

```typescript
import { encrypt, decrypt } from '@/lib/email/utils/encryption'

// Chiffrement (fait automatiquement par le repository)
const encrypted = await encrypt(JSON.stringify(apiKey))

// Déchiffrement (fait automatiquement lors de la récupération)
const decrypted = await decrypt(encrypted)
```

### Variable d'environnement requise

Assurez-vous que `ENCRYPTION_SECRET` est défini dans votre `.env` :

```env
ENCRYPTION_SECRET=your-secret-key-at-least-32-characters-long
```

### Permissions

Seuls les administrateurs authentifiés peuvent :
- Lire les configurations
- Créer/modifier des configurations
- Tester les connexions
- Voir les statistiques d'usage

## Exemples d'utilisation

### Initialiser Stripe dans votre code

```typescript
import { initStripe } from '@/lib/services'

// Dans une fonction async
const stripeConfig = await initStripe('production')

// Utiliser avec la SDK Stripe
import Stripe from 'stripe'
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2023-10-16'
})
```

### Initialiser AWS SES

```typescript
import { initAWS } from '@/lib/services'

const awsConfig = await initAWS('production')

import { SESClient } from '@aws-sdk/client-ses'
const sesClient = new SESClient({
  credentials: awsConfig.credentials,
  region: awsConfig.region
})
```

### Tracker l'utilisation d'une API

```typescript
import { serviceApiRepository } from '@/lib/services'

await serviceApiRepository.trackUsage({
  configId: 'uuid',
  serviceName: 'stripe',
  operation: 'create_payment',
  status: 'success',
  responseTime: 234,
  costEstimate: 30 // in cents
})
```

## Architecture

```
lib/services/
├── types.ts          # Définitions TypeScript
├── repository.ts     # Accès base de données
├── initializers.ts   # Initialisation des services
└── index.ts          # Exports

app/api/services/
├── route.ts          # Liste des services
├── [service]/
│   ├── route.ts      # CRUD service
│   ├── test/
│   │   └── route.ts  # Test de connexion
│   └── usage/
│       └── route.ts  # Statistiques

app/(private)/admin/api/
└── page.tsx          # Interface UI
```

## Troubleshooting

### Erreur : "ENCRYPTION_SECRET must be at least 32 characters"

Vérifiez que la variable `ENCRYPTION_SECRET` dans `.env` fait au moins 32 caractères.

### Erreur : "Configuration not found"

La configuration n'existe pas pour ce service/environnement. Créez-la via l'interface admin.

### Test échoue mais la clé est valide

Vérifiez :
1. L'environnement sélectionné (production vs test)
2. Les permissions de la clé API sur le service tiers
3. Les quotas et limites de l'API

## Support

Pour toute question ou problème, consultez :
- [Documentation principale](./README.md)
- [Guide de déploiement](./DEPLOYMENT_STATUS.md)
- [Troubleshooting général](./TROUBLESHOOTING.md)
