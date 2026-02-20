# Stripe Webhook Setup Guide

> **Version** : 2.0 — Mise à jour 2026-02-18 (11 événements gérés)
> **Concerne** : Déploiement production & sandbox
> ⚠️ **Statut actuel** : Webhook secret NON configuré — à faire en priorité

---

## Pourquoi les webhooks ?

NeoSaaS utilise les webhooks Stripe pour :

| Événement | Action | Statut |
|---|---|---|
| `customer.subscription.created` | Créer l'enregistrement abonnement en DB | ✅ |
| `customer.subscription.updated` | Mettre à jour le statut / période | ✅ |
| `customer.subscription.deleted` | Marquer `status = 'canceled'` | ✅ |
| `invoice.paid` | Créer une commande `orders` dans la DB | ✅ |
| `invoice.payment_failed` | Logger l'échec (notification à venir) | ✅ |
| `payment_intent.succeeded` | Logger le succès de paiement | ✅ |
| `payment_intent.payment_failed` | Logger l'échec | ✅ |
| `payment_method.attached` | Sauvegarder la carte en DB | ✅ |
| `payment_method.detached` | Marquer la carte inactive | ✅ |
| `payment_method.updated` | Mettre à jour la carte en DB | ✅ |
| `customer.updated` | Re-sync cartes + default payment method | ✅ |

> **Important** : Tous ces événements sont rejetés si le webhook secret n'est pas configuré.
> Le handler répond HTTP 500 si `credentials.webhookSecret` est absent.

---

## Étape 1 — Ajouter l'endpoint dans Stripe Dashboard

1. Connectez-vous à [dashboard.stripe.com](https://dashboard.stripe.com/webhooks)
2. Cliquez **+ Add endpoint**
3. Entrez l'URL :
   ```
   https://votre-domaine.com/api/stripe/webhook
   ```
4. Sélectionnez les **11 événements** suivants :

   ```
   payment_intent.succeeded
   payment_intent.payment_failed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.paid
   invoice.payment_failed
   payment_method.attached
   payment_method.detached
   payment_method.updated
   customer.updated
   ```

5. Cliquez **Add endpoint**

---

## Étape 2 — Récupérer le Webhook Secret

Après création de l'endpoint, Stripe affiche un **Signing secret** (`whsec_...`).

1. Copiez ce secret
2. Dans **Admin > API Management > Stripe** :
   - Collez-le dans le champ **Webhook Secret**
   - Sauvegardez

Ou en variable d'environnement (fallback) :
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

## Étape 3 — Vérifier la réception des événements

### Via Stripe Dashboard
- Dashboard → Webhooks → votre endpoint → **Recent deliveries**
- Un code `200` = traitement réussi

### Via les logs NeoSaaS
- Admin → System Logs → catégorie `stripe`
- Toutes les réceptions sont loguées

### Via Stripe CLI (développement local)

```bash
# Installer la CLI Stripe
brew install stripe/stripe-cli/stripe

# S'authentifier
stripe login

# Forwarder vers votre serveur local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Dans un autre terminal, déclencher un événement test
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.paid
```

---

## Étape 4 — Test en sandbox

### Cartes de test Stripe

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0025 0000 3155` | Authentification 3DS requise |
| `4000 0000 0000 9995` | Paiement décliné (fonds insuffisants) |
| `4000 0000 0000 0002` | Carte refusée |

Date d'expiration : n'importe quelle date future
CVC : n'importe quel nombre à 3 chiffres

### Script E2E automatisé

```bash
# Copier les variables d'environnement
cp .env.example .env.local
# Renseigner STRIPE_SECRET_KEY=sk_test_... et DATABASE_URL

# Lancer les tests
pnpm tsx scripts/test-stripe-e2e.ts
```

---

## Étape 5 — Sécurité de l'endpoint

Le webhook est protégé par vérification de signature HMAC :

```typescript
// app/api/stripe/webhook/route.ts
event = stripe.webhooks.constructEvent(body, signature, credentials.webhookSecret)
```

Si la signature est invalide → HTTP 400 immédiat.

**Ne jamais exposer** `whsec_...` côté client ou dans les logs.

---

## Troubleshooting

### "No webhook secret configured"
→ Configurer dans Admin > API Management > Stripe > Webhook Secret

### "Invalid signature"
→ Vérifier que le body n'est pas transformé (parse JSON) avant la vérification.
Le handler lit le body brut (`request.text()`) avant tout traitement.

### L'événement n'est pas traité
→ Vérifier les **Recent deliveries** dans Stripe Dashboard.
→ Chercher l'event type dans les logs NeoSaaS (catégorie `stripe`).

### Timeout (Stripe renvoie si pas de réponse en 30s)
→ Le handler répond immédiatement et traite en async.
→ Si le traitement échoue, l'événement est relivré jusqu'à 3 fois.

---

## Architecture du Handler

```
POST /api/stripe/webhook
  ├── Vérification signature (Stripe SDK)
  ├── Switch sur event.type
  │   ├── payment_method.attached → savePaymentMethodToDB()
  │   ├── payment_method.detached → marquer inactive en DB
  │   ├── customer.updated        → syncCompanyPaymentMethods()
  │   ├── payment_intent.succeeded → logSystemEvent(category: stripe)
  │   ├── payment_intent.payment_failed → logSystemEvent(level: warning)
  │   ├── customer.subscription.* → upsert subscriptions table
  │   ├── invoice.paid            → créer orders record + log
  │   └── invoice.payment_failed  → logSystemEvent(level: warning)
  └── HTTP 200 { received: true, eventType }
```

---

## Variables d'environnement

| Variable | Description | Source |
|---|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète (sk_live_... ou sk_test_...) | Stripe Dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique (pk_live_... ou pk_test_...) | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook (whsec_...) | Stripe Dashboard → Webhooks |

> Préférer le stockage via **Admin > API Management** (chiffré en AES-256-GCM) plutôt que les variables d'environnement.
