# Stripe Integration - Quick Start Guide

**Guide rapide de démarrage pour l'intégration Stripe**

---

## 🚀 Installation et Configuration (5 minutes)

### 1. Configurer les Credentials Stripe

#### Option A: Via l'Interface Admin (Recommandé)

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copier vos clés API (Secret key, Publishable key)
3. Dans NeoSaaS, aller sur `/admin/api`
4. Créer une nouvelle configuration Stripe:
   - Service: `stripe`
   - Environment: `production`
   - Config:
     ```json
     {
       "secretKey": "sk_live_...",
       "publishableKey": "pk_live_...",
       "webhookSecret": "whsec_..."
     }
     ```

#### Option B: Variables d'Environnement (Fallback)

```env
# .env.local
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Appliquer les Migrations de Base de Données

```bash
# Pousser le nouveau schéma vers la base de données
pnpm db:push

# Vérifier que les nouvelles tables existent
# - payment_methods
# - stripe_sync_logs
# - companies (avec nouveaux champs stripe*)
```

### 3. Configurer le Webhook Stripe

1. Aller sur [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer "Add endpoint"
3. URL: `https://votredomaine.com/api/stripe/webhook`
4. Événements à écouter:
   - ✅ `payment_method.attached`
   - ✅ `payment_method.detached`
   - ✅ `payment_method.updated`
   - ✅ `customer.updated`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Copier le "Signing secret" (commence par `whsec_`)
6. Ajouter dans la config Stripe (étape 1)

---

## 💳 Utilisation

### Pour les Utilisateurs

1. **Accéder à la page de gestion des cartes**
   - Aller sur `/dashboard/payment-methods`

2. **Ajouter une nouvelle carte**
   - Cliquer "Add Payment Method"
   - Remplir les informations de carte
   - Cliquer "Save Card"
   - ✅ Carte ajoutée et visible immédiatement

3. **Gérer les cartes**
   - Voir toutes les cartes de l'entreprise
   - Définir une carte par défaut
   - Supprimer des cartes
   - Voir les cartes expirées

4. **Synchroniser avec Stripe**
   - Cliquer "Sync with Stripe"
   - Les cartes sont mises à jour depuis Stripe

### Pour les Développeurs

#### Créer un customer Stripe pour une entreprise

```typescript
import { ensureStripeCustomer } from '@/lib/stripe-customers'

const { customerId, created } = await ensureStripeCustomer(companyId)
console.log(`Customer ${customerId} ${created ? 'created' : 'exists'}`)
```

#### Récupérer les cartes d'une entreprise

```typescript
import { getCompanyPaymentMethodsFromDB } from '@/lib/stripe-payment-methods'

const cards = await getCompanyPaymentMethodsFromDB(companyId)
console.log(`Found ${cards.length} cards`)
```

#### Créer un paiement

```typescript
import { createStripePayment } from '@/app/actions/stripe-payments'

const result = await createStripePayment({
  amount: 2990, // 29.90 EUR en centimes
  currency: 'eur',
  description: 'Commande #12345',
  useDefaultCard: true,
  metadata: {
    orderId: '12345',
    userId: 'user-uuid',
  }
})

if (result.success) {
  console.log('Payment successful:', result.data.paymentIntentId)
} else {
  console.error('Payment failed:', result.error)
}
```

#### Synchroniser les cartes

```typescript
import { syncCompanyPaymentMethods } from '@/lib/stripe-sync'

const result = await syncCompanyPaymentMethods(companyId)
console.log(`Sync result: +${result.cardsAdded} ~${result.cardsUpdated} -${result.cardsRemoved}`)
```

---

## 🔍 Vérification

### Vérifier que tout fonctionne

```bash
# 1. Vérifier les tables de base de données
psql $DATABASE_URL -c "SELECT * FROM payment_methods LIMIT 5;"

# 2. Vérifier les logs de synchronisation
psql $DATABASE_URL -c "SELECT * FROM stripe_sync_logs ORDER BY created_at DESC LIMIT 10;"

# 3. Tester le webhook (via Stripe CLI)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 4. Déclencher un événement test
stripe trigger payment_method.attached
```

### Tester l'interface utilisateur

1. Se connecter avec un compte utilisateur
2. Aller sur `/dashboard/payment-methods`
3. Cliquer "Add Payment Method"
4. Utiliser une carte de test Stripe:
   - Numéro: `4242 4242 4242 4242`
   - Expiration: n'importe quelle date future
   - CVC: n'importe quel 3 chiffres
5. Vérifier que la carte apparaît dans la liste

---

## 📊 Monitoring

### Voir les logs de synchronisation

```sql
-- Derniers syncs
SELECT
  company_id,
  sync_type,
  status,
  cards_added,
  cards_updated,
  cards_removed,
  duration,
  created_at
FROM stripe_sync_logs
ORDER BY created_at DESC
LIMIT 20;

-- Syncs échoués
SELECT * FROM stripe_sync_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Voir les cartes actives

```sql
-- Cartes par entreprise
SELECT
  c.name AS company,
  COUNT(pm.id) AS total_cards,
  SUM(CASE WHEN pm.is_default THEN 1 ELSE 0 END) AS default_cards,
  SUM(CASE WHEN pm.expires_at < NOW() THEN 1 ELSE 0 END) AS expired_cards
FROM companies c
LEFT JOIN payment_methods pm ON pm.company_id = c.id AND pm.is_active = true
GROUP BY c.id, c.name
ORDER BY total_cards DESC;
```

---

## 🛠️ Dépannage

### Erreur: "Stripe credentials not configured"

**Solution:**
- Vérifier la configuration dans `/admin/api`
- Ou ajouter les variables d'environnement
- Redémarrer l'application

### Erreur: "User is not associated with a company"

**Solution:**
- L'utilisateur doit avoir un `companyId`
- Créer une entreprise ou associer l'utilisateur à une entreprise existante

### Carte non visible après ajout

**Solution:**
1. Vérifier les logs du webhook Stripe
2. Cliquer "Sync with Stripe" pour forcer la synchronisation
3. Vérifier la table `payment_methods` dans la base de données

### Webhook signature verification failed

**Solution:**
- Vérifier que le webhook secret est correct
- Dans le dashboard Stripe, copier le signing secret
- Mettre à jour la configuration Stripe avec ce secret

---

## 📚 Documentation Complète

- [Plan d'Implémentation](./STRIPE_PAYMENT_INTEGRATION_PLAN.md)
- [Documentation Technique](./STRIPE_INTEGRATION.md)
- [Stripe API Docs](https://stripe.com/docs/api)

---

## ✅ Checklist de Déploiement

Avant de déployer en production:

- [ ] Credentials Stripe configurés (production)
- [ ] Webhook Stripe configuré et testé
- [ ] Migrations de base de données appliquées
- [ ] Tests effectués avec des cartes de test
- [ ] Logs de synchronisation vérifiés
- [ ] Interface utilisateur testée
- [ ] Monitoring configuré
- [ ] Documentation à jour

---

**Guide créé le:** 2026-02-10
**Version:** 1.0
