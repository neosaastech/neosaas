# Architecture du système d'emailing

Guide complet du système d'envoi d'emails avec Scaleway TEM

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Templates HTML](#templates-html)
- [Logs centralisés](#logs-centralisés)
- [Utilisation](#utilisation)
- [Déploiement](#déploiement)

## Vue d'ensemble

Le système d'emailing est construit autour de :

✅ **Scaleway TEM** - Seul provider supporté pour l'envoi d'emails
✅ **Configuration centralisée** - Via `service_api_configs` table
✅ **Templates HTML professionnels** - 6 templates pré-configurés
✅ **Logs centralisés** - Traçabilité complète via `service_api_usage`
✅ **Sécurité** - Chiffrement AES-256-GCM des credentials

## Architecture

### Tables de base de données

```
service_api_configs          ← Configuration Scaleway (chiffrée)
├── service_api_usage        ← Logs centralisés des appels API
│
email_templates              ← Templates HTML par défaut
├── email_history            ← Historique des emails envoyés
├── email_events             ← Événements (opens, clicks, bounces)
└── email_statistics         ← Statistiques agrégées

email_provider_configs       ← DEPRECATED (legacy)
```

### Flux de données

```
1. Configuration
   ┌─────────────────────┐
   │ Admin UI (/admin/api)│
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ service_api_configs │  ← Credentials Scaleway
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ emailConfigRepository│  ← Adaptateur
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ ScalewayTemProvider │  ← Envoi email
   └─────────────────────┘

2. Envoi d'email
   ┌─────────────────────┐
   │   API /email/send   │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │   emailRouter       │  ← Routage
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ ScalewayTemProvider │  ← Envoi via Scaleway API
   └──────────┬──────────┘
              │
              ├─────────────────────►┌──────────────────┐
              │                      │ service_api_usage│  ← Log
              │                      └──────────────────┘
              │
              └─────────────────────►┌──────────────────┐
                                     │  email_history   │  ← Historique
                                     └──────────────────┘
```

## Configuration

### 1. Configurer Scaleway TEM

#### Via l'interface admin (recommandé)

1. Accédez à `/admin/api`
2. Cliquez sur **Add API** ou sélectionnez "Scaleway"
3. Environnement : "Production"
4. Remplissez les **2 champs obligatoires** :

| Champ | Requis | Où le trouver |
|-------|--------|---------------|
| **Secret Key** | ✅ Oui | IAM → API Keys (visible uniquement à la création) |
| **Project ID** | ✅ Oui | Console Scaleway → Settings → Project Settings |
| **Access Key** | ❌ Non | Non utilisé par l'API TEM |

5. Cliquez sur **Vérifier la clé** pour tester la connexion TEM
6. Cochez "Active" et "Default"
7. Cliquez sur "Save Configuration"

> 💡 **Note** : L'Access Key n'est pas requis pour TEM. Seuls la Secret Key et le Project ID sont nécessaires.

#### Via l'API

```bash
curl -X POST http://localhost:3000/api/services/scaleway \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "email",
    "environment": "production",
    "isActive": true,
    "isDefault": true,
    "config": {
      "secretKey": "your-secret-key",
      "projectId": "your-project-id"
    },
    "metadata": {
      "region": "fr-par"
    }
  }'
```

### 2. Configurer l'expéditeur par défaut

Pour éviter les rejets d'emails, il est crucial de définir une adresse d'expédition par défaut qui correspond à un domaine vérifié dans Scaleway TEM.

1. Accédez à `/admin/config` (Configuration Générale)
2. Dans la section "Email Settings", remplissez le champ **Default Sender Email**
3. Exemple : `no-reply@neosaas.tech`

Cette adresse sera utilisée si aucun expéditeur n'est défini spécifiquement dans le template d'email.

### 3. Vérifier la configuration

```bash
npm run check:email-config
```

Affiche :
- Les providers configurés
- L'état d'activation
- Les identifiants (masqués)

## Templates HTML

### Templates pré-configurés

| Type | Description | Variables |
|------|-------------|-----------|
| `registration` | Bienvenue - Inscription | firstName, siteName, actionUrl |
| `email_verification` | Vérification d'email | firstName, siteName, actionUrl |
| `password_reset` | Réinitialisation mot de passe | firstName, siteName, actionUrl |
| `user_invitation` | Invitation utilisateur | companyName, siteName, actionUrl |
| `order_confirmation` | Confirmation de commande | firstName, orderNumber, orderDate, actionUrl |
| `notification` | Notification générale | firstName, notificationMessage, actionUrl |

### Initialiser les templates (post-déploiement)

```bash
npm run seed:email-templates
```

Ce script :
- ✅ Crée les 6 templates HTML professionnels
- ✅ Supporte les variables dynamiques ({{firstName}}, {{actionUrl}}, etc.)
- ✅ Design responsive et moderne
- ✅ Versions HTML + texte plain

### Utiliser un template

```typescript
import { emailRouter } from '@/lib/email/services/email-router.service';
import { db } from '@/db';
import { emailTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

// 1. Récupérer le template
const template = await db
  .select()
  .from(emailTemplates)
  .where(eq(emailTemplates.type, 'registration'))
  .limit(1);

// 2. Remplacer les variables
const variables = {
  firstName: 'Jean',
  siteName: 'NeoSaaS',
  actionUrl: 'https://example.com/verify',
};

let htmlContent = template[0].htmlContent;
let subject = template[0].subject;

for (const [key, value] of Object.entries(variables)) {
  const regex = new RegExp(`{{${key}}}`, 'g');
  htmlContent = htmlContent.replace(regex, value);
  subject = subject.replace(regex, value);
}

// 3. Envoyer
await emailRouter.sendEmail({
  to: 'user@example.com',
  from: template[0].fromEmail,
  fromName: template[0].fromName,
  subject,
  htmlContent,
});
```

## Logs centralisés

### Consultation des logs

#### Logs d'envoi d'emails

```typescript
import { serviceApiRepository } from '@/lib/services/repository';

// Récupérer les logs
const config = await serviceApiRepository.getConfig('scaleway', 'production');
const logs = await serviceApiRepository.getUsageStats(config.id, 100);

// Afficher
logs.forEach(log => {
  console.log(`[${log.status}] ${log.operation} - ${log.errorMessage || 'OK'}`);
});
```

#### Via la base de données

```sql
-- Logs des 24 dernières heures
SELECT
  operation,
  status,
  error_message,
  response_time,
  created_at
FROM service_api_usage
WHERE
  service_name = 'scaleway'
  AND operation = 'send_email'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Types de logs

| Operation | Description |
|-----------|-------------|
| `email_provider_init` | Initialisation du provider |
| `send_email` | Envoi d'un email |
| Status: `success` / `failed` | État de l'opération |

## Utilisation

### Envoyer un email simple

```typescript
import { emailRouter } from '@/lib/email/services/email-router.service';

const result = await emailRouter.sendEmail({
  to: 'destinataire@example.com',
  from: 'expediteur@votre-domaine.com',
  fromName: 'NeoSaaS',
  subject: 'Test email',
  htmlContent: '<h1>Bonjour</h1><p>Ceci est un email de test.</p>',
  textContent: 'Bonjour\n\nCeci est un email de test.',
});

if (result.success) {
  console.log(`Email envoyé ! ID: ${result.messageId}`);
} else {
  console.error(`Erreur: ${result.error}`);
}
```

### Envoyer via l'API

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinataire@example.com",
    "from": "expediteur@votre-domaine.com",
    "fromName": "NeoSaaS",
    "subject": "Test email",
    "htmlContent": "<h1>Bonjour</h1>",
    "textContent": "Bonjour"
  }'
```

## Déploiement

### Checklist post-déploiement

```bash
# 1. Pousser le schéma de base de données
npm run db:push

# 2. Initialiser les templates HTML
npm run seed:email-templates

# 3. Configurer Scaleway via l'admin UI
# Accéder à https://votre-domaine.com/admin/api

# 4. Vérifier la configuration
npm run check:email-config

# 5. Tester l'envoi d'un email de test
curl -X POST https://votre-domaine.com/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "noreply@votre-domaine.com",
    "subject": "Test",
    "htmlContent": "<p>Test</p>"
  }'
```

### Variables d'environnement requises

```env
# Base de données
DATABASE_URL=postgresql://...

# Chiffrement (min 32 caractères)
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# URLs
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

**Note** : Les credentials Scaleway ne sont PAS dans les variables d'environnement.
Ils sont configurés via l'interface admin et stockés chiffrés en base de données.

## Troubleshooting

### Erreur : "No email provider available"

**Cause** : Scaleway TEM n'est pas configuré

**Solution** :
```bash
# 1. Vérifier la configuration
npm run check:email-config

# 2. Si absente, configurer via /admin/api
```

### Erreur : "Scaleway TEM requires projectId and secretKey"

**Cause** : Le Project ID est manquant dans la configuration

**Solution** :
1. Accédez à `/admin/api`
2. Modifiez la configuration Scaleway
3. Ajoutez votre **Project ID** (trouvable dans Console Scaleway → Settings → Project Settings)
4. Sauvegardez

### Erreur : "Scaleway API error: 401"

**Cause** : Token API invalide ou expiré

**Solution** :
1. Vérifiez votre token dans la console Scaleway
2. Vérifiez que le Project ID correspond au projet de la clé API
3. Mettez à jour via `/admin/api`

### Erreur : "Domain not verified"

**Cause** : Le domaine expéditeur n'est pas vérifié dans Scaleway TEM

**Solution** :
1. Accédez à https://console.scaleway.com/transactional-email
2. Ajoutez et vérifiez votre domaine
3. Configurez les DNS (SPF, DKIM, DMARC)

### Les emails ne sont pas reçus

**Vérifications** :
1. ✅ Domaine vérifié dans Scaleway TEM
2. ✅ DNS correctement configurés (SPF, DKIM)
3. ✅ Vérifier les logs : `npm run check:email-config`
4. ✅ Consulter les stats dans la console Scaleway
5. ✅ Vérifier le dossier spam

## Support

- [Documentation Scaleway TEM](https://www.scaleway.com/en/docs/managed-services/transactional-email/)
- [Guide de configuration](./guides/SCALEWAY_EMAIL_SETUP.md)
- [Architecture des services](./SERVICE_API_MANAGEMENT.md)
