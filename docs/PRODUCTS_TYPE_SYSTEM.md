# Système de Types de Produits v4.0

## Vue d'ensemble

Le système e-commerce supporte **4 types de produits distincts** avec une option **gratuit** disponible pour tous les types :

1. **Physical** (`physical`) - Produits physiques expédiés par courrier (icône Box - orange)
2. **Digital** (`digital`) - Produits numériques téléchargeables avec licence optionnelle (icône Monitor - bleu)
3. **Consulting** (`consulting`) - Services de consulting avec rendez-vous (icône Users - violet)
4. **Standard** (`standard`) - Produits génériques payants (icône Package - vert)

> **Mise à jour du 9 février 2026** : v4.0 - Ajout des types de paiement (`paymentType`) et intégration Lago billing (plans/add-ons).

---

## Types de Paiement (`paymentType`)

Chaque produit a un **type de paiement** indépendant du type de produit. Ce champ détermine comment le produit est facturé et comment il est synchronisé vers Lago :

| `paymentType` | Libellé | Types de produit éligibles | Entité Lago | Description |
|---|---|---|---|---|
| `one_time` | Paiement unique | Physical, Digital, Appointment | **Add-on** | Paiement unique à l'achat (défaut) |
| `hourly` | Taux horaire | Appointment uniquement | **Add-on** | Taux indicatif, facturation post-session |
| `subscription` | Abonnement | Digital, Appointment | **Plan** | Facturation récurrente (hebdo/mensuelle/annuelle) |

### Champs de prix par abonnement

Quand `paymentType = 'subscription'`, le produit utilise des champs de prix spécifiques par intervalle :

```typescript
{
  paymentType: 'subscription',
  subscriptionPriceWeekly: 990,           // 9.90 EUR/semaine (en centimes, optionnel)
  subscriptionPriceMonthly: 2990,         // 29.90 EUR/mois (en centimes, optionnel)
  subscriptionPriceYearly: 29900,         // 299.00 EUR/an (en centimes, optionnel)
}
```

Au moins un prix d'abonnement doit être défini. Si aucun n'est défini, le champ `price` principal est utilisé avec un intervalle mensuel par défaut.

### Synchronisation Lago

| `paymentType` | Entité Lago | Code Lago | Notes |
|---|---|---|---|
| `subscription` | **Plan** (`POST /plans`) | `{product_id}-{interval}` | Un plan par intervalle actif |
| `one_time` | **Add-on** (`POST /add_ons`) | `{product_id}` | Un add-on par produit |
| `hourly` | **Add-on** (`POST /add_ons`) | `{product_id}` | Un add-on par produit |

> **Important** : Un produit abonnement avec 3 intervalles crée **3 plans Lago** distincts.
> Les produits avec `price <= 0` sont ignorés lors de la sync (comptés comme "skipped").

Voir [LAGO_CONFIGURATION.md](./LAGO_CONFIGURATION.md) pour la documentation complète.

---

## Option Gratuit

**Tous les types de produits peuvent être gratuits** via une case à cocher `isFree` dans le formulaire produit.

Quand un produit est marqué comme gratuit :
- Aucun paiement n'est collecté
- Le client passe directement à la confirmation
- Les produits digitaux donnent un accès immédiat
- Les produits physiques nécessitent toujours une adresse de livraison
- Le consulting permet une prise de rendez-vous directe

---

## 1. Produits Physiques (`physical`)

### Caractéristiques
- 📦 **Livraison par courrier** requise
- ⚡ **Notification urgente** à l'admin pour expédition
- 📍 **Adresse de livraison** collectée au checkout
- 📊 **Suivi** : poids, dimensions, stock
- ✉️ **Email de validation** envoyé au client

### Workflow
1. Client ajoute au panier
2. Paiement (sauf si gratuit)
3. Collecte adresse de livraison
4. Page de confirmation
5. Admin reçoit notification urgente par email
6. Admin expédie et met à jour le statut
7. Client notifié de l'expédition

### Configuration
```typescript
{
  type: "physical",
  isFree: false,              // true = gratuit
  price: 4900,                // 49.00 EUR en centimes
  vatRateId: "uuid-tva",
  requiresShipping: true,     // Toujours true
  weight: 500,                // Poids en grammes
  dimensions: {               // Dimensions en cm
    length: 20,
    width: 15,
    height: 5
  },
  stockQuantity: 100,
  shippingNotes: "Fragile - Manipuler avec soin"
}
```

### Statuts de commande
- `pending` - En attente de traitement
- `processing` - En cours de préparation
- `shipped` - Expédié (numéro de suivi ajouté)
- `delivered` - Livré

---

## 2. Produits Numériques (`digital`)

### Caractéristiques
- 💻 **Lien de téléchargement** fourni après achat
- 🔑 **Clé de licence** optionnelle
- 📝 **Instructions d'activation** personnalisables
- ⚡ **Livraison instantanée** après paiement

### Workflow
1. Client ajoute au panier
2. Paiement (sauf si gratuit)
3. Page de confirmation avec lien de téléchargement
4. Clé de licence affichée (si configurée)
5. Email avec instructions envoyé

### Configuration
```typescript
{
  type: "digital",
  isFree: false,
  price: 2900,                // 29.00 EUR
  vatRateId: "uuid-tva",
  fileUrl: "https://s3.../file.zip",
  licenseKey: "PROD-XXXX-XXXX-XXXX",  // Template avec XXXX = aléatoire
  licenseInstructions: "Entrez votre clé de licence dans Paramètres > Activation"
}
```

---

## 3. Produits Consulting (`consulting`)

### Deux Modes

#### Mode Forfait (`consultingMode: 'packaged'`)
- 💰 **Prix fixe** payé d'avance
- Le client paie puis prend rendez-vous
- Paiement complet avant la session

#### Mode Horaire (`consultingMode: 'hourly'`)
- 📅 **Pas de paiement** initial
- Le client prend rendez-vous directement
- Taux horaire indicatif affiché
- Facturation post-session selon temps réel

### Caractéristiques
- 👥 **Prise de rendez-vous** après achat (forfait) ou directement (horaire)
- ⏱️ **Durée de session** configurable
- 📆 **Intégration calendrier** (Outlook)
- ✉️ **Notification équipe** avec détails du RDV

### Workflow (Mode Forfait)
1. Client ajoute au panier
2. Paiement
3. Modal de prise de rendez-vous
4. Page de confirmation
5. Événement calendrier créé
6. Admin notifié

### Workflow (Mode Horaire)
1. Client ajoute au panier (pas de paiement)
2. Modal de prise de rendez-vous
3. Lead créé
4. Admin notifié pour suivi
5. Facturation post-session

### Configuration
```typescript
// Mode Forfait
{
  type: "consulting",
  consultingMode: "packaged",
  isFree: false,
  price: 29900,               // 299.00 EUR forfait
  vatRateId: "uuid-tva",
  appointmentDuration: 60,    // 60 minutes
  outlookEventTypeId: "event-type-id"
}

// Mode Horaire
{
  type: "consulting",
  consultingMode: "hourly",
  isFree: false,              // Prix = 0, taux horaire indicatif
  price: 0,
  hourlyRate: 15000,          // 150.00 EUR/h indicatif
  appointmentDuration: 60,
  outlookEventTypeId: "event-type-id"
}
```

---

## 4. Produits Standard (`standard`)

### Caractéristiques
- 📦 **Paiement classique** au checkout
- ✅ **TVA** applicable
- Pas de workflow spécifique

### Configuration
```typescript
{
  type: "standard",
  isFree: false,
  price: 9900,               // 99.00 EUR
  vatRateId: "uuid-tva"
}
```

---

## Notifications Admin par Type

| Type | Template Email | Priorité |
|------|---------------|----------|
| `physical` | Commande Produit Physique | **URGENT** |
| `digital` | Achat Produit Numérique | Normal |
| `consulting` | Réservation Consulting | Normal |
| `standard` | Nouvelle Commande | Normal |

---

## Logique de Tarification

```typescript
// Détermine si le produit nécessite un paiement
const requiresPayment = !product.isFree && (
  product.type === 'physical' ||
  product.type === 'digital' ||
  product.type === 'standard' ||
  (product.type === 'consulting' && product.consultingMode === 'packaged')
)
```

---

## Interface Admin - Formulaire Produit

### Sections par Type

**Physical :**
- Poids (grammes)
- Dimensions (L x l x H cm)
- Quantité en stock
- Notes de livraison

**Digital :**
- URL de téléchargement
- Template de clé de licence
- Instructions d'activation

**Consulting :**
- Sélecteur de mode (Forfait/Horaire)
- Taux horaire (mode horaire)
- Durée de session
- ID Type d'événement Outlook

**Tous les Types :**
- Case à cocher "Produit gratuit"
- Prix (si non gratuit et non consulting horaire)
- Taux de TVA
- Devise
- Configuration upsell

---

## Migration depuis v2.0

| Ancien Type | Nouveau Type | Notes |
|-------------|-------------|-------|
| `standard` | `standard` | Aucun changement |
| `digital` | `digital` | Ajouter champs licence si besoin |
| `free` | Tout type + `isFree: true` | Convertir vers type approprié |
| `appointment` | `consulting` | Définir `consultingMode: 'hourly'` |

---

## Bonnes Pratiques

1. **Produits Physiques** : Toujours configurer les notes de livraison pour manipulation spéciale
2. **Produits Numériques** : Utiliser des URLs S3 sécurisées avec expiration
3. **Consulting Forfait** : Définir clairement la durée de session attendue
4. **Consulting Horaire** : Inclure le taux horaire indicatif pour transparence
5. **Produits Gratuits** : Utiliser avec parcimonie pour génération de leads ou échantillons

---

**Dernière mise à jour :** 2026-02-09
**Version :** 4.0
