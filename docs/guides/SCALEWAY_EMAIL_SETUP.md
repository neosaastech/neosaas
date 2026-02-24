# Configuration de Scaleway Transactional Email (TEM)

Ce guide vous explique comment configurer et utiliser Scaleway TEM pour l'envoi d'emails transactionnels dans votre application.

## Prérequis

1. Un compte Scaleway
2. Un projet Scaleway créé
3. Un domaine vérifié dans Scaleway TEM

## Étape 1 : Obtenir les identifiants Scaleway

> ⚠️ **Important** : Pour Scaleway TEM, **2 informations sont obligatoires** :
> - **Secret Key** : La clé secrète de l'API
> - **Project ID** : L'identifiant du projet Scaleway
>
> L'Access Key (identifiant de la clé) est **optionnel** pour TEM.

### 1.1 Accéder à la console Scaleway

Rendez-vous sur https://console.scaleway.com

### 1.2 Créer une clé API

1. Allez dans **Identity and Access Management (IAM)**
2. Cliquez sur **API Keys**
3. Créez une nouvelle clé API avec les permissions suivantes :
   - `TransactionalEmailFullAccess` ou au minimum `TransactionalEmailEmailManager`
4. **Copiez immédiatement la Secret Key** (ne sera plus visible après !)

> 💡 **Note** : L'Access Key (format `SCWXXXXXXXXX`) n'est pas utilisé par l'API TEM, seule la Secret Key est requise pour l'authentification.

### 1.3 Récupérer le Project ID

Le Project ID est **indispensable** pour identifier votre projet dans les appels API TEM.

1. Dans la console Scaleway, cliquez sur **Settings** dans le menu latéral
2. Allez dans **Project Settings**
3. Copiez le **Project ID** (format UUID : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

> 💡 **Astuce** : Stockez ces informations dans un gestionnaire de mots de passe sécurisé.

## Étape 2 : Vérifier votre domaine

### 2.1 Ajouter un domaine dans TEM

1. Allez dans **Transactional Email** dans la console Scaleway
2. Cliquez sur **Add domain**
3. Entrez votre nom de domaine (ex: `example.com`)

### 2.2 Configurer les enregistrements DNS

Ajoutez les enregistrements SPF, DKIM et autres requis dans votre zone DNS :

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.scw-tem.cloud ~all

Type: TXT
Name: scw1._domainkey
Value: [Valeur fournie par Scaleway]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@example.com
```

### 2.3 Vérifier le domaine

Une fois les DNS propagés (peut prendre jusqu'à 48h), cliquez sur **Verify** dans la console Scaleway.

## Étape 3 : Configurer l'application

### 3.1 Via l'interface Admin (RECOMMANDÉ)

La méthode la plus simple est d'utiliser l'interface d'administration :

1. Accédez à `/admin/api` dans votre application
2. Cliquez sur **Add API** ou modifiez la configuration Scaleway existante
3. Remplissez les **2 champs obligatoires** :

| Champ | Requis | Description |
|-------|--------|-------------|
| **Secret Key** | ✅ Oui | Clé secrète de l'API (format UUID) |
| **Project ID** | ✅ Oui | ID de votre projet Scaleway (format UUID) |
| **Access Key** | ❌ Non | Identifiant de la clé API (non utilisé par TEM) |

4. Cliquez sur **Vérifier la clé** pour tester la connexion à l'API TEM
5. Cliquez sur **Save Configuration**

### 3.2 Variables d'environnement (optionnel)

Vous pouvez également définir des variables d'environnement pour le développement :

```bash
# Scaleway Transactional Email (TEM)
SCW_PROJECT_ID=your-scaleway-project-id
SCW_SECRET_KEY=your-scaleway-secret-key
SCW_REGION=fr-par
```

> ⚠️ **Note** : En production, utilisez toujours l'interface admin `/admin/api`. Les credentials sont chiffrés en base de données avec AES-256-GCM.

### 3.3 Via l'API (avancé)

```bash
curl -X POST http://localhost:3000/api/services/scaleway \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "email",
    "environment": "production",
    "isActive": true,
    "isDefault": true,
    "config": {
      "projectId": "your-project-id",
      "secretKey": "your-secret-key"
    },
    "metadata": {
      "region": "fr-par"
    }
  }'
```

## Étape 4 : Tester l'envoi d'emails

### 4.1 Via l'API

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinataire@example.com",
    "from": "expediteur@votre-domaine.com",
    "fromName": "Votre Application",
    "subject": "Test email",
    "htmlContent": "<h1>Bonjour</h1><p>Ceci est un email de test.</p>",
    "textContent": "Bonjour\n\nCeci est un email de test.",
    "provider": "scaleway-tem"
  }'
```

### 4.2 Vérifier l'envoi

Consultez les logs de votre application pour voir :
- La confirmation d'envoi avec le message ID
- Les éventuelles erreurs

Vous pouvez aussi consulter les statistiques dans la console Scaleway TEM.

## Étape 5 : Vérifier la configuration

Utilisez le script de vérification :

```bash
npm run db:push  # Assurez-vous que la base est à jour
npx tsx scripts/check-email-config.ts
```

Ce script affichera :
- Les providers configurés
- L'état d'activation
- Les identifiants (masqués)

## Plans et limites

### Plan Essential (gratuit)
- 1 000 emails par jour
- Support basic

### Plan Scale
- 100 000 emails par jour
- Support prioritaire
- Webhooks avancés

Pour changer de plan, modifiez la propriété `plan` dans la configuration :
```typescript
{
  "plan": "scale"  // ou "essential"
}
```

## Troubleshooting

### Erreur : "Scaleway TEM requires projectId and secretKey"

**Cause** : Le Project ID n'est pas configuré dans l'interface admin.

**Solution** :
1. Accédez à `/admin/api`
2. Modifiez la configuration Scaleway
3. Ajoutez votre **Project ID** (voir [Étape 1.2](#12-récupérer-le-project-id-obligatoire))
4. Sauvegardez

### Erreur : "Clés Scaleway manquantes (Access Key, Secret Key et Project ID requis)"

**Cause** : Un ou plusieurs des trois champs obligatoires sont vides.

**Solution** : Vérifiez que les trois champs sont remplis :
- Project ID
- Access Key
- Secret Key

### Erreur : "Domain not verified"

Vérifiez que :
- Votre domaine est bien vérifié dans la console Scaleway
- Vous utilisez une adresse email du domaine vérifié comme `from`

### Erreur : "Authentication failed" / "401 Unauthorized"

Vérifiez que :
- Le `Secret Key` est correct et n'a pas expiré
- La clé API a les bonnes permissions (`TransactionalEmailFullAccess`)
- Le `Project ID` correspond au projet où le domaine est configuré
- L'`Access Key` est bien celui associé au `Secret Key`

### Erreur : "Rate limit exceeded"

Vous avez dépassé la limite du plan :
- Essential : 1 000 emails/jour
- Scale : 100 000 emails/jour

### Emails non reçus

1. Vérifiez les enregistrements DNS (SPF, DKIM, DMARC)
2. Consultez les logs dans la console Scaleway TEM
3. Vérifiez les dossiers spam
4. Assurez-vous que le domaine expéditeur est vérifié

## Ressources

- [Documentation officielle Scaleway TEM](https://www.scaleway.com/en/docs/managed-services/transactional-email/)
- [API Reference](https://www.scaleway.com/en/developers/api/transactional-email/)
- [Console Scaleway](https://console.scaleway.com/transactional-email)

## Support

Pour toute question ou problème :
1. Consultez d'abord ce guide
2. Vérifiez les logs de l'application
3. Consultez la documentation Scaleway
4. Contactez le support Scaleway si nécessaire
