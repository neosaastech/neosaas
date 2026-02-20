# Architecture du Projet NeoSaaS

## 🎯 Vue d'Ensemble

NeoSaaS est une plateforme SaaS Next.js 14+ avec App Router, construite sur une architecture modulaire et scalable.

**Stack Technique Principal:**
- **Framework:** Next.js 15 (App Router)
- **Base de données:** Neon PostgreSQL + Drizzle ORM
- **Auth:** JWT personnalisé + Cookies httpOnly
- **UI:** Tailwind CSS + shadcn/ui
- **Paiements:** Stripe Direct (mode test/live piloté depuis `/admin`)
- **Email:** Resend + Scaleway TEM
- **Calendar:** Google Calendar + Outlook intégration
- **Package Manager:** pnpm

---

## 📁 Structure du Projet

### Convention de Nommage

```
app/                    # Next.js App Router
├── (public)/          # Routes publiques (sans auth)
├── (private)/         # Routes protégées (auth requise)
├── (errors)/          # Pages d'erreur custom
├── actions/           # Server Actions (logique métier)
├── api/               # API Routes
└── auth/              # Routes d'authentification

components/            # Composants React réutilisables
├── admin/            # Composants admin only
├── chat/             # Module de chat
├── checkout/         # Flux de commande
├── common/           # Composants partagés
├── features/         # Composants par fonctionnalité
├── layout/           # Composants de layout
├── legal/            # Composants légaux
└── ui/               # shadcn/ui components

lib/                   # Utilitaires et helpers
├── auth/             # Authentification
├── calendar/         # Intégration calendrier
├── notifications/    # Système de notifications
├── email/            # Gestion emails
└── data/             # Accès données

db/                    # Database
├── schema.ts         # Schéma Drizzle
└── index.ts          # Configuration DB

types/                 # TypeScript definitions
```

---

## 🏗️ Principes d'Architecture

### 1. Single Source of Truth

**Règle d'Or:** Une fonctionnalité = Un seul fichier de logique

**❌ ANTI-PATTERN:**
```typescript
// NE JAMAIS faire ça
lib/checkout/checkout-service.ts  // Doublon
app/actions/ecommerce.ts          // Original
```

**✅ PATTERN CORRECT:**
```typescript
// Une seule implémentation
app/actions/ecommerce.ts          // ✅ Source unique
```

### 2. Séparation des Responsabilités

#### Server Actions (`app/actions/`)

**Rôle:** Logique métier côté serveur accessible depuis le client

**Utilisation:**
```typescript
// app/actions/ecommerce.ts
'use server'

export async function processCheckout(cartId: string) {
  // Logique métier complète
  // Validations, DB queries, notifications...
}
```

**Imports:**
```typescript
// Dans un composant client
import { processCheckout } from '@/app/actions/ecommerce'
```

#### API Routes (`app/api/`)

**Rôle:** Endpoints REST pour intégrations externes ou webhooks

**Utilisation:**
```typescript
// app/api/checkout/route.ts
export async function POST(request: NextRequest) {
  // Endpoint pour webhook, CLI, ou intégration externe
}
```

**Quand utiliser quoi?**
- **Server Actions:** Interactions client ↔ serveur dans l'app
- **API Routes:** Webhooks, intégrations externes, API publique

#### Bibliothèques (`lib/`)

**Rôle:** Fonctions utilitaires réutilisables, sans logique métier

**Utilisation:**
```typescript
// lib/calendar/sync.ts
export async function syncAppointmentToCalendars(appointmentId: string) {
  // Logique technique pure (pas de business logic)
}
```

---

## 🗺️ Cartographie des Modules Principaux

### Module E-commerce / Checkout

**Source Unique:** `app/actions/ecommerce.ts`

**Fonctions principales:**
- `processCheckout()` - Traitement complet d'une commande (one-time → Stripe Invoice, subscription → Stripe Subscription + DB)
- `applyCoupon()` - Application d'un coupon

**Flux paiement one-time (20 fév. 2026) :**
```
processCheckout()
  └── createStripeInvoicePayment()   ← remplace createStripePayment (PaymentIntent)
        ├── POST /invoiceitems (une ligne par article)
        ├── POST /invoices (auto_advance: false)
        ├── POST /invoices/{id}/finalize
        └── POST /invoices/{id}/pay  → invoice_pdf URL générée
```

**Flux abonnement (20 fév. 2026) :**
```
processCheckout()
  └── createStripeSubscription()  → retourne status + currentPeriodEnd
        └── db.insert(subscriptions)  ← persistance customerId = company.id
```

**Dépendances:**
```
app/actions/ecommerce.ts
  ├── app/actions/payments.ts (createStripeInvoicePayment, createStripeSubscription)
  ├── lib/notifications/appointment-notifications.ts (Emails)
  ├── lib/notifications/admin-notifications.ts (Chat admin)
  ├── lib/calendar/sync.ts (Sync calendrier)
  └── db/schema.ts (Database)
```

**❌ Ne PAS créer:**
- `lib/checkout/checkout-service.ts`
- `lib/ecommerce/process-order.ts`
- Toute autre implémentation alternative

### Module Calendar

**Architecture:**
```
lib/calendar/
├── sync.ts              # ✅ Synchronisation Google/Outlook
└── icalendar.ts         # ✅ Génération fichiers .ics

app/api/calendar/
├── route.ts             # ✅ GET/DELETE connections
├── connect/route.ts     # ✅ Initiate OAuth
└── callback/route.ts    # ✅ Handle OAuth callback
```

**Flux:**
1. User déclenche OAuth → `app/api/calendar/connect`
2. Callback OAuth → `app/api/calendar/callback`
3. Synchronisation → `lib/calendar/sync.ts`

### Module Chat

**Architecture:**
```
app/api/chat/
├── conversations/       # User chat routes
└── messages/

app/api/admin/chat/      # Admin chat routes

lib/notifications/
└── admin-notifications.ts  # Chat notifications
```

**Types de notifications:**
- **User → Admin:** Via `admin-notifications.ts`
- **Admin → User:** Via routes admin chat

### Module Notifications

**Architecture:**
```
lib/notifications/
├── appointment-notifications.ts  # ✅ Emails RDV (client + admin)
└── admin-notifications.ts        # ✅ Notifications chat admin
```

**Workflow Appointment:**
```typescript
// Dans app/actions/ecommerce.ts
await Promise.all([
  sendAppointmentConfirmationToClient(...),  // Email client
  sendAppointmentNotificationToAdmin(...),   // Email admin
  notifyAdminNewAppointment(...)             // Chat admin
])
```

---

## 🚫 Règles Anti-Doublons

### Checklist Avant Création de Fichier

Avant de créer un nouveau fichier avec de la logique, vérifier:

1. ✅ Cette fonctionnalité existe-t-elle déjà?
   ```bash
   # Rechercher les fonctions similaires
   grep -r "processCheckout" app/ lib/
   ```

2. ✅ Où devrait vivre cette logique selon l'architecture?
   - Logique métier → `app/actions/`
   - Utilitaire technique → `lib/`
   - API externe → `app/api/`

3. ✅ Y a-t-il un fichier existant où ajouter cette fonction?
   - Préférer étendre un fichier existant
   - Créer nouveau fichier si vraiment nécessaire

### Règles d'Import

**✅ AUTORISÉ:**
```typescript
// Server Actions peuvent importer lib
import { syncAppointmentToCalendars } from '@/lib/calendar/sync'

// API Routes peuvent importer actions
import { processCheckout } from '@/app/actions/ecommerce'

// Components peuvent importer actions
import { getUsers } from '@/app/actions/users'
```

**❌ INTERDIT:**
```typescript
// lib/ ne doit PAS importer app/actions
import { processCheckout } from '@/app/actions/ecommerce' // ❌

// Créer un doublon au lieu d'importer
// lib/checkout/checkout-service.ts avec même logique que ecommerce.ts // ❌
```

---

## 📋 Workflow de Développement

### Ajouter une Nouvelle Fonctionnalité

1. **Identifier le module concerné**
   - E-commerce? → `app/actions/ecommerce.ts`
   - Users? → `app/actions/users.ts`
   - Calendar? → `lib/calendar/`

2. **Vérifier l'existant**
   ```bash
   # Recherche semantic
   grep -r "similar_function" app/ lib/
   ```

3. **Choisir l'emplacement**
   - Logique métier = Server Action
   - Utilitaire = lib/
   - Endpoint = API Route

4. **Implémenter**
   - Suivre le pattern existant
   - Réutiliser les helpers de lib/
   - Ajouter gestion d'erreur appropriée

5. **Documenter**
   - JSDoc sur la fonction
   - Mettre à jour ce fichier si nouveau module
   - Ajouter entrée dans ACTION_LOG.md

### Code Review Checklist

- [ ] Pas de doublon de code existant
- [ ] Imports cohérents avec architecture
- [ ] Gestion d'erreur avec try-catch
- [ ] TypeScript types corrects
- [ ] **Documentation mise à jour** (voir règle ci-dessous)
- [ ] Suit les conventions de nommage
- [ ] Auth utilise `roles?: string[]` (PAS `role` singulier)

---

## 📝 Règle : Documentation Obligatoire à Chaque Itération

> **Applicable à TOUS les agents IA et développeurs.**
> Voir aussi : [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)

**Chaque modification de code DOIT être accompagnée d'une mise à jour de la documentation correspondante.**

### Matrice de correspondance Code → Documentation

| Code modifié | Doc(s) à mettre à jour |
|---|---|
| `app/actions/ecommerce.ts` | `CHECKOUT_FLOW.md`, `STRIPE_INTEGRATION.md` |
| `app/actions/payments.ts` | `STRIPE_INTEGRATION.md` |
| `app/(private)/dashboard/payments/page.tsx` | `STRIPE_INTEGRATION.md` |
| `app/api/admin/payments/*` | `STRIPE_INTEGRATION.md`, `ADMIN_DASHBOARD_ORGANIZATION.md` |
| `app/api/admin/config/*` | `ADMIN_SETTINGS_ORGANIZATION.md` |
| `components/admin/*` | `ADMIN_DASHBOARD_ORGANIZATION.md` |
| `app/api/auth/oauth/*` | Docs OAuth correspondantes |
| `db/schema.ts` | `ARCHITECTURE.md` |
| `lib/stripe.ts` | `STRIPE_INTEGRATION.md` |
| Tout fichier | `STATUS.md` (historique des changements) |

### Format Changelog

```markdown
## 📅 Changelog
### [DATE]
- **[Résumé]** : Description
- **Fichiers modifiés** : `fichier1.tsx`, `fichier2.ts`
- **Impact** : Ce qui change
```

---

## 🔍 Détection Automatique

### Scripts Recommandés

```json
// package.json
{
  "scripts": {
    "lint:unused": "eslint . --ext .ts,.tsx",
    "analyze:dead-code": "npx ts-prune",
    "analyze:duplicates": "npx jscpd app/ lib/"
  }
}
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run type-check
npm run lint
```

---

## 📚 Références

### Documentation Associée

- [ACTION_LOG.md](./ACTION_LOG.md) - Journal des modifications
- [AUDIT_DOUBLONS_COMPLET_2026-01-08.md](./AUDIT_DOUBLONS_COMPLET_2026-01-08.md) - Audit doublons
- [CORRECTIONS_DOUBLONS_2026-01-08.md](./CORRECTIONS_DOUBLONS_2026-01-08.md) - Corrections appliquées
- [VERIFICATION_GLOBALE_2026-01-08.md](./VERIFICATION_GLOBALE_2026-01-08.md) - État de santé

### Modules Documentés

- [APPOINTMENT_BOOKING_CHECKOUT_FLOW.md](./APPOINTMENT_BOOKING_CHECKOUT_FLOW.md) - Flux de réservation
- [CALENDAR_APPOINTMENTS_MODULE.md](./CALENDAR_APPOINTMENTS_MODULE.md) - Module calendrier
- [LIVE_CHAT_MODULE.md](./LIVE_CHAT_MODULE.md) - Module chat
- [EMAIL_SYSTEM_ARCHITECTURE.md](./EMAIL_SYSTEM_ARCHITECTURE.md) - Système d'emails

---

## 🎯 Leçons Apprises

### Cas Concret: Doublon Checkout (Jan 2026)

**Problème:**
- Deux implémentations de `processCheckout()`
- `lib/checkout/checkout-service.ts` (815 lignes - jamais utilisé)
- `app/actions/ecommerce.ts` (version active)

**Cause:**
- Manque de documentation architecture
- Pas de vérification avant création fichier
- Pas de détection automatique

**Solution:**
- Suppression du doublon
- Création de ce document ARCHITECTURE.md
- Mise en place de règles claires

**Prévention:**
- ✅ Consulter ARCHITECTURE.md avant toute création
- ✅ Rechercher fonctionnalités similaires
- ✅ Code review systématique

---

## ⚠️ Doublons de Composants UI Connus (15 janvier 2026)

### 1. Formulaire Produit - Double Interface

**Situation actuelle:** Deux interfaces pour créer/éditer des produits

| Interface | Fichier | Accès |
|-----------|---------|-------|
| Page complète | `app/(private)/admin/products/product-form.tsx` | `/admin/products/new` ou `/admin/products/[id]` |
| Modal rapide | `app/(private)/admin/products/products-table.tsx` (Sheet) | Bouton "New Product" depuis la table |

**Impact:**
- Les modifications doivent être faites dans LES DEUX fichiers
- Risque de désynchronisation des fonctionnalités

**Champs partagés à maintenir synchronisés:**
- Informations produit (title, description, type, price...)
- Configuration digitale (downloadUrl, licenseKey, licenseInstructions)
- Configuration physique (shipping, stock...)
- Configuration rendez-vous (duration, mode...)

**Solution recommandée (future):**
Créer un composant `ProductFormFields` partagé importé par les deux interfaces.

---

### 2. Confirmation de Commande - Double Implémentation

**Situation actuelle:** Deux composants quasi-identiques

| Composant | Fichier | Usage |
|-----------|---------|-------|
| Overlay | `components/checkout/checkout-confirmation-overlay.tsx` | Popup depuis checkout |
| Page | `app/(private)/dashboard/checkout/confirmation/page.tsx` | Navigation directe |

**Fonctionnalités dupliquées (~90%):**
- Affichage des articles commandés
- Gestion des produits digitaux (clés licence, téléchargement)
- Affichage des rendez-vous avec export .ics
- Status badges et styling

**Solution recommandée:**
Fusionner en un composant unique avec prop `variant: 'overlay' | 'page'`

---

### 3. Rendez-vous - Wrapper Pattern

**Situation actuelle:** Pattern de wrapper légitime

| Composant | Fichier | Rôle |
|-----------|---------|------|
| Modal | `components/checkout/appointment-modal.tsx` | Wrapper Dialog |
| Booking | `components/checkout/appointment-booking.tsx` | Logique complète |

**Verdict:** ✅ Pattern acceptable - Le modal est un wrapper légitime

---

## 📋 Checklist Anti-Doublon pour Composants

Avant de créer un nouveau composant, vérifier:

1. **Y a-t-il un composant similaire?**
   ```bash
   ls -la components/
   grep -r "ComponentName" components/ app/
   ```

2. **Peut-on réutiliser un composant existant?**
   - Ajouter des props pour les variations
   - Utiliser `variant` ou `mode` props

3. **Si duplication nécessaire:**
   - Documenter dans ce fichier
   - Créer un ticket pour fusionner à terme
   - S'assurer que les deux versions restent synchronisées

---

**Date de création:** 8 janvier 2026
**Dernière mise à jour:** 19 février 2026
**Mainteneurs:** Équipe de développement NeoSaaS
