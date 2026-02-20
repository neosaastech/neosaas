# Stratégie Produits v4.0 - Système à 3 Catégories

**Date:** 7 janvier 2026  
**Version:** 4.0  
**Statut:** ✅ Implémenté

---

## 📋 Vue d'Ensemble

Notre nouvelle stratégie produits organise l'ensemble du catalogue en **3 catégories principales** avec des workflows spécifiques pour chacune :

1. **Physical** - Produits physiques avec livraison postale
2. **Digital** - Produits numériques avec livraison instantanée
3. **Appointment** - Rendez-vous/consultations

Chaque type peut être **gratuit ou payant**. Les produits appointment peuvent avoir un **prix fixe** (forfait) ou un **tarif horaire** (affiché sur page produit et pricing).

---

## 🏗️ Architecture Technique

### 1. Types de Produits

| Type | Description | Exemple | Livraison |
|------|-------------|---------|-----------|
| `physical` | Produit physique tangible | Livre, gadget, merchandising | Envoi postal avec tracking |
| `digital` | Produit numérique | eBook, logiciel, template | Code/URL instantané |
| `appointment` | Rendez-vous/consultation | Coaching, formation, audit | Réservation calendrier |

### 2. Schéma Base de Données

#### Table `products`

```typescript
{
  id: uuid,
  title: string,
  description: string,
  price: integer, // Centimes - Prix fixe ou forfait
  hourlyRate: integer | null, // Centimes - Pour appointments uniquement
  type: 'physical' | 'digital' | 'appointment',
  isFree: boolean, // true = gratuit (tous types confondus)
  
  // Digital-specific
  fileUrl: string | null,
  deliveryCode: string | null, // Code généré après achat
  downloadUrl: string | null, // URL de téléchargement généré
  licenseKey: string | null,
  licenseInstructions: string | null,
  
  // Physical-specific
  requiresShipping: boolean,
  weight: integer | null, // grammes
  dimensions: jsonb | null, // { length, width, height } en cm
  stockQuantity: integer | null,
  shippingNotes: string | null,
  
  // Appointment-specific
  appointmentMode: 'packaged' | 'hourly' | null,
  appointmentDuration: integer | null, // minutes
  outlookEventTypeId: string | null,
  
  // Common
  currency: string,
  vatRateId: uuid | null,
  isPublished: boolean,
  isFeatured: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Table `shipments` (NOUVEAU)

```typescript
{
  id: uuid,
  orderId: uuid, // Référence à orders.id
  orderItemId: uuid | null, // Référence à orderItems.id
  productId: uuid | null, // Référence à products.id
  status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'failed',
  trackingNumber: string | null, // Ex: 6A12345678FR (Colissimo)
  carrier: 'colissimo' | 'chronopost' | 'ups' | 'dhl' | 'fedex' | 'other' | null,
  trackingUrl: string | null, // URL de suivi du transporteur
  shippingAddress: jsonb, // { name, street, city, postalCode, country, phone }
  estimatedDeliveryDate: timestamp | null,
  shippedAt: timestamp | null,
  deliveredAt: timestamp | null,
  notes: string | null,
  emailsSent: jsonb, // [{type: 'shipped', sentAt: '...'}]
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🔄 Workflows par Type

### 1. Physical - Produits Physiques

**Flow de commande:**

```
1. Client ajoute au panier → 2. Checkout → 3. Paiement
                                              ↓
4. Commande créée → 5. Shipment créé (status: pending)
                                              ↓
6. Admin marque "expédié" → 7. Email envoyé au client
   - Ajoute tracking number    - Statut: Shipped
   - Sélectionne carrier       - Numéro de suivi
                                              ↓
8. Transporteur livre → 9. Admin confirme livraison
                          - Email "Delivered"
```

**Emails automatiques:**
- ✉️ **Commande confirmée** : "Votre commande #ORD-xxx a été validée"
- ✉️ **Colis expédié** : "Votre colis est en route ! Tracking : XXX"
- ✉️ **Colis livré** : "Votre commande est arrivée 🎉"

**Interface Admin:**
- Dashboard "Shipments" avec liste des envois
- Filtres par statut (pending, shipped, delivered)
- Action rapide "Marquer comme expédié"
- Formulaire : tracking number, carrier, estimated delivery

---

### 2. Digital - Produits Numériques

**Flow de commande:**

```
1. Client ajoute au panier → 2. Checkout → 3. Paiement
                                              ↓
4. Commande créée → 5. Code généré automatiquement
                     - deliveryCode: "ABC-123-XYZ"
                     - downloadUrl: generated
                                              ↓
6. Email envoyé immédiatement
   - Code d'activation
   - Lien de téléchargement
   - Instructions
```

**Génération automatique:**
```typescript
// Exemple de code généré
deliveryCode: `${productId.slice(0,6)}-${randomString(6)}-${timestamp.slice(-6)}`
downloadUrl: `${CDN_URL}/downloads/${orderId}/${productId}?token=${secureToken}`
```

**Email de livraison:**
```
🎉 Votre produit numérique est prêt !

Produit: [Product Title]
Code d'activation: ABC-123-XYZ
Lien de téléchargement: [Download URL]

Instructions:
[License Instructions si disponible]
```

**Pas de tracking physique** - Livraison instantanée

---

### 3. Appointment - Rendez-vous

**Flow de réservation:**

```
1. Client sélectionne produit → 2. Choix créneau (calendrier)
                                              ↓
3. Formulaire booking → 4. Checkout/Paiement (si payant)
   - Nom, email           ↓
   - Téléphone          5. Appointment créé (status: pending)
   - Notes                ↓
                        6. Emails envoyés :
                           - Client: Confirmation RDV
                           - Admin: Nouveau RDV
                                              ↓
                        7. Admin confirme → Status: confirmed
                           - Sync calendrier
                           - Email de confirmation finale
```

**Modes de tarification:**

| Mode | Description | Prix | Facturation |
|------|-------------|------|-------------|
| **Packaged** | Forfait payé à l'avance | `price` | À la réservation |
| **Hourly** | Tarif horaire indicatif | `hourlyRate` | Post-facturation (affichage uniquement) |
| **Free** | Gratuit | 0 | Pas de paiement |

**Affichage sur page produit:**
```tsx
// Si hourlyRate existe
<div className="price">
  <span>À partir de</span>
  <strong>{hourlyRate}€/h</strong>
</div>

// Si price (forfait)
<div className="price">
  <strong>{price}€</strong>
  <span>la session</span>
</div>

// Si gratuit
<div className="price">
  <strong>Gratuit</strong>
</div>
```

---

## 🛠️ Implémentation Technique

### 1. Mise à Jour du Checkout Flow

**Fichier:** `app/actions/ecommerce.ts`

```typescript
export async function processCheckout(cartId: string, appointmentsData?: Record<string, AppointmentData>) {
  // ...existing code...

  // 7. Create order items and handle by type
  for (const item of cart.items) {
    // Create order item
    await db.insert(orderItems).values({...})

    // Type-specific processing
    switch (item.product.type) {
      case 'physical':
        // Create shipment entry
        await db.insert(shipments).values({
          orderId: order.id,
          orderItemId: orderItem.id,
          productId: item.product.id,
          status: 'pending',
          shippingAddress: order.shippingAddress,
        })
        break

      case 'digital':
        // Generate delivery code and download URL
        const deliveryCode = generateDeliveryCode(item.product.id)
        const downloadUrl = generateSecureDownloadUrl(order.id, item.product.id)
        
        // Update order item with digital delivery info
        await db.update(orderItems)
          .set({ 
            metadata: { deliveryCode, downloadUrl } 
          })
          .where(eq(orderItems.id, orderItem.id))
        
        // Send digital delivery email
        await sendDigitalProductEmail({...})
        break

      case 'appointment':
        // Create appointment if data provided
        if (appointmentsData[item.product.id]) {
          await db.insert(appointments).values({...})
          await sendAppointmentNotifications({...})
        }
        break
    }
  }
}
```

### 2. Emails Système

**Physical Products:**
- `lib/emails/shipment-emails.ts`
  - `sendOrderConfirmationEmail()`
  - `sendShipmentNotificationEmail()`
  - `sendDeliveryConfirmationEmail()`

**Digital Products:**
- `lib/emails/digital-delivery-emails.ts`
  - `sendDigitalProductEmail()`

**Appointments:**
- `lib/notifications/appointment-notifications.ts` (existant)
  - `sendAppointmentConfirmationToClient()`
  - `sendAppointmentNotificationToAdmin()`

### 3. Interface Admin - Gestion des Shipments

**Page:** `app/(private)/admin/shipments/page.tsx`

**Fonctionnalités:**
- Liste des envois avec filtres (status, date, carrier)
- Action "Mark as Shipped" → Modal avec form
  - Tracking number
  - Carrier (dropdown)
  - Estimated delivery date
- Action "Mark as Delivered"
- Historique des emails envoyés

**Table UI:**
```
| Order # | Product | Status | Tracking | Carrier | Created | Actions |
|---------|---------|--------|----------|---------|---------|---------|
| ORD-123 | Livre   | Pending| -        | -       | 07/01   | [Ship] |
| ORD-124 | Gadget  | Shipped| 6A123... | Colissimo| 06/01  | [✓ Delivered] |
```

---

## 📊 Migration depuis v3.0

### Types Obsolètes (Rétrocompatibilité)

| v3.0 (Legacy) | v4.0 (Nouveau) | Action |
|---------------|----------------|--------|
| `standard` | `physical` | Mapper automatiquement |
| `free` | `physical` + `isFree: true` | Convertir |
| `consulting` | `appointment` | Renommer |
| `digital` | `digital` | Inchangé ✅ |

### Script de Migration (Optionnel)

```sql
-- Mapper standard → physical
UPDATE products SET type = 'physical' WHERE type = 'standard';

-- Mapper consulting → appointment
UPDATE products SET type = 'appointment' WHERE type = 'consulting';

-- Convertir free → physical avec isFree
UPDATE products SET 
  type = 'physical',
  is_free = true 
WHERE type = 'free';
```

---

## 🎯 Bénéfices

### Pour le Business
- ✅ **Clarté** : 3 catégories simples et distinctes
- ✅ **Flexibilité** : Tous types peuvent être gratuits ou payants
- ✅ **Upsell** : Affichage tarif horaire encourage réservations
- ✅ **Tracking** : Suivi précis des envois physiques

### Pour les Clients
- ✅ **Transparence** : Savent exactement ce qu'ils achètent
- ✅ **Instantané** : Produits digitaux livrés immédiatement
- ✅ **Suivi** : Tracking en temps réel pour envois physiques
- ✅ **Simplicité** : Réservation appointment intégrée au checkout

### Pour les Admins
- ✅ **Gestion centralisée** : Dashboard shipments unique
- ✅ **Automatisation** : Emails envoyés automatiquement
- ✅ **Visibilité** : Statuts clairs (pending/shipped/delivered)

---

## 📝 Prochaines Étapes

- [ ] Créer interface admin `/admin/shipments`
- [ ] Implémenter emails shipment
- [ ] Tester flow complet physical product
- [ ] Tester flow complet digital product
- [ ] Migrer produits existants si nécessaire
- [ ] Documenter API endpoints pour shipments
- [ ] Ajouter tracking Colissimo/Chronopost/UPS

---

## 🔗 Références

- [CHECKOUT_FLOW.md](./CHECKOUT_FLOW.md) - Tunnel d'achat général
- [APPOINTMENT_BOOKING_CHECKOUT_FLOW.md](./APPOINTMENT_BOOKING_CHECKOUT_FLOW.md) - Flow appointments
- [PRODUCTS_TYPE_SYSTEM.md](./PRODUCTS_TYPE_SYSTEM.md) - Système types v3.0 (legacy)
- [EMAIL_SYSTEM_ARCHITECTURE.md](./EMAIL_SYSTEM_ARCHITECTURE.md) - Architecture emails

---

**Status:** 🚀 Ready for Implementation  
**Version:** 4.0  
**Last Updated:** 7 janvier 2026
