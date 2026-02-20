# Module Support Admin - Documentation Technique

## Vue d'ensemble

Le module de support admin est structuré selon le design TailAdmin avec des pages séparées pour chaque fonctionnalité :

- **Chat Direct** (`/admin/chat`) : Interface de messagerie instantanée avec les clients
- **Liste des Tickets** (`/admin/support`) : Vue tableau des tickets support avec statistiques
- **Réponse aux Tickets** (`/admin/support/reply`) : Interface de réponse détaillée

## Architecture

### Structure des Routes

```
/admin/chat                       # Chat direct (style messagerie)
├── Liste des contacts
├── Zone de messages (bulles)
└── Nouveau conversation dialog

/admin/support                    # Liste des tickets (style tableau)
├── Cartes statistiques (3 cards)
├── Filtres tabs (All, Solved, Pending)
├── Tableau avec sélection multiple
├── Actions groupées
├── Pagination
└── Nouveau ticket dialog

/admin/support/reply?id=<uuid>    # Page de réponse ticket
├── Header avec navigation retour
├── Zone de messages
├── Zone de réponse avec contrôles statut
└── Sidebar détails client
```

### Navigation Sidebar

```typescript
// components/layout/private-dashboard/sidebar.tsx
const supportSubItems = [
  { name: "Chat", href: "/admin/chat" },
  { name: "Tickets", href: "/admin/support" },
]
```

## Pages

### 1. Chat Direct (`/admin/chat`)

**Fichier:** `app/(private)/admin/chat/page.tsx`

Interface de messagerie style TailAdmin avec :

| Section | Description |
|---------|-------------|
| Contacts Panel (gauche) | Liste des conversations avec recherche |
| Messages Panel (droite) | Messages en bulles (admin à droite, client à gauche) |
| Header | Actions (appel, vidéo, info) |
| Input | Zone de saisie avec emoji, attachments |

**Fonctionnalités:**
- Recherche de conversations par nom
- Indicateurs en ligne (online dot)
- Dernière activité visible
- Création de nouvelle conversation avec recherche utilisateur
- Messages en temps réel (polling 5s)

### 2. Liste des Tickets (`/admin/support`)

**Fichier:** `app/(private)/admin/support/page.tsx`

Interface tableau style TailAdmin avec :

| Section | Description |
|---------|-------------|
| Header | Titre + Breadcrumb (Home > Support List) |
| Stats Cards | 3 cards avec icônes (Total, Pending, Solved) |
| Filters | Tabs segmentés (All, Solved, Pending) + Search + Filter |
| Bulk Actions | Barre d'actions quand items sélectionnés |
| Table | Checkbox, Ticket ID, Requested By, Subject, Create Date, Status, Actions |
| Pagination | Navigation par numéros de page |

**Colonnes du tableau:**

| Colonne | Description |
|---------|-------------|
| Checkbox | Case à cocher pour sélection (header = select all) |
| Ticket ID | Format `#XXXXXX` avec indicateur non-lu (point bleu) |
| Requested By | Avatar photo + Nom complet + Email |
| Subject | Titre du ticket (tronqué si trop long) |
| Create Date | Format "dd MMM, yyyy" |
| Status | Badge coloré (In Progress, Pending, Solved, Closed) |
| Actions | Menu ••• (View Details, Delete) |

**Actions groupées (Bulk Actions):**

Quand des tickets sont sélectionnés, une barre d'actions apparaît :

| Action | Description |
|--------|-------------|
| Mark as Solved | Change le statut en "resolved" |
| Close | Change le statut en "closed" |
| Delete | Supprime les tickets sélectionnés |
| Clear | Désélectionne tous les tickets |

**Sélection multiple:**
- Case à cocher sur chaque ligne
- Case "Select All" dans l'en-tête du tableau
- État intermédiaire si sélection partielle
- Surbrillance des lignes sélectionnées

### 3. Réponse aux Tickets (`/admin/support/reply`)

**Fichier:** `app/(private)/admin/support/reply/page.tsx`

Interface de réponse complète avec :

| Section | Description |
|---------|-------------|
| Header | Navigation retour, infos ticket, actions |
| Messages Area | Historique des messages |
| Reply Form | Zone de saisie + contrôles statut |
| Sidebar (lg+) | Détails client et ticket |

**Fonctionnalités:**
- Bouton retour vers la liste
- Affichage du sujet et statut
- Messages avec avatar et timestamp
- Zone de réponse avec Cmd/Ctrl+Enter
- Contrôles de statut inline (In-Progress, Solved, On-Hold)
- Actions rapides (Email, Call, Close)

## API Endpoints

### Conversations

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/chat` | GET | Liste des conversations avec stats |
| `/api/admin/chat/[id]` | GET | Détails conversation + messages |
| `/api/admin/chat/[id]` | PATCH | Mise à jour statut/priorité |
| `/api/admin/chat/[id]` | DELETE | Suppression conversation |

### Messages

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/chat/[id]/messages` | GET | Liste des messages |
| `/api/admin/chat/[id]/messages` | POST | Envoi d'un message |

### Actions

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/admin/chat/[id]/assign` | POST | Assignation à un admin |
| `/api/admin/chat/[id]/read` | POST | Marquer comme lu |
| `/api/admin/chat/initiate` | POST | Initier une conversation |
| `/api/admin/users` | GET | Recherche d'utilisateurs |

## Temps Réel

### Approche Actuelle (Polling)

- **Liste des tickets** : Rafraîchissement toutes les 30 secondes
- **Chat direct** : Rafraîchissement toutes les 15 secondes (liste) + 5 secondes (messages)
- **Page de réponse** : Rafraîchissement toutes les 5 secondes

## Styles

### Statuts

| Statut | Label | Badge Class |
|--------|-------|-------------|
| open | In Progress | bg-blue-100 text-blue-700 |
| pending | Pending | bg-amber-100 text-amber-700 |
| resolved | Solved | bg-green-100 text-green-700 |
| closed | Closed | bg-gray-100 text-gray-700 |

### Priorités

| Priorité | Badge Class |
|----------|-------------|
| low | border-gray-300 bg-gray-50 text-gray-700 |
| normal | border-blue-300 bg-blue-50 text-blue-700 |
| high | border-orange-300 bg-orange-50 text-orange-700 |
| urgent | border-red-300 bg-red-50 text-red-700 |

## Catégories de Notifications

### Vue d'ensemble

Le système utilise trois catégories de notifications pour différencier le traitement des tickets :

| Catégorie | Description | Comportement |
|-----------|-------------|--------------|
| **info** | Notifications passives | Overlay d'information (pas de chat) |
| **action** | Notifications actives | Chat disponible, action requise |
| **urgent** | Notifications prioritaires | Badge rouge, traitement immédiat |

### Catégorie Info (Passif)

**Patterns de sujets:**
- `profile.updated` - Mise à jour de profil
- `user.logged_in` - Connexion utilisateur
- `user.registered` - Inscription
- `password.changed` - Changement de mot de passe
- `email.verified` - Email vérifié
- `settings.updated` - Paramètres modifiés
- `subscription.renewed` - Renouvellement abonnement
- `payment.success` - Paiement réussi
- `order.completed` - Commande terminée
- `order.shipped` - Commande expédiée
- `order.delivered` - Commande livrée

**Comportement:**
- Clic sur le ticket → Ouvre l'overlay `InfoOverlay`
- Pas de chat associé
- Affiche les détails: client, timestamps, métadonnées
- Badge gris dans la liste

### Catégorie Action (Actif)

**Patterns de sujets:**
- `order.physical` - Commande physique
- `order.digital` - Commande digitale
- `order.subscription` - Abonnement
- `support.request` - Demande de support
- `support.new` - Nouveau ticket
- `contact.form` - Formulaire de contact
- `quote.request` - Demande de devis
- `refund.request` - Demande de remboursement

**Comportement:**
- Clic sur le ticket → Ouvre `/admin/support/reply?id=<uuid>`
- Chat disponible
- Actions: répondre, changer statut
- Badge bleu dans la liste

### Catégorie Urgent (Prioritaire)

**Patterns de sujets:**
- `order.appointment` - Rendez-vous commande
- `appointment.pending` - Rendez-vous en attente
- `appointment.urgent` - Rendez-vous urgent
- `payment.failed` - Paiement échoué
- `security.alert` - Alerte sécurité

**Comportement:**
- Clic sur le ticket → Ouvre `/admin/support/reply?id=<uuid>`
- Chat disponible
- Traitement prioritaire
- Badge rouge dans la liste
- Peut déclencher auto-assignation (futur)

### Composant InfoOverlay

**Fichier:** `components/admin/info-overlay.tsx`

Panneau coulissant pour les notifications de type 'info' :

| Section | Description |
|---------|-------------|
| Header | Icône catégorie + titre "Notification Details" |
| Subject | Sujet + ID du ticket |
| Customer | Avatar + nom + email du client |
| Change Details | Affichage détaillé des modifications (pour profile changes) |
| Timeline | Date création + dernière activité |
| Notice | Message "Informational Notification - No action required" |

**Caractéristiques v4.3.0:**
- Tout le texte en **anglais** (pas de français)
- **Pas de status/priority** affichés pour les notifications 'info'
- Affichage détaillé des **changements de profil** avec valeurs avant/après
- Support des **changements multiples** avec liste formatée
- Icône ✓ verte pour les notifications passives

**Exemple d'affichage pour Profile Updated:**
```
CHANGE DETAILS (3 fields modified)
┌────────────────────────────────────────┐
│ First Name                              │
│ "John" → "Johnny"                      │
├────────────────────────────────────────┤
│ Last Name                               │
│ "Doe" → "Smith"                        │
├────────────────────────────────────────┤
│ Email                                   │
│ "old@email.com" → "new@email.com"      │
└────────────────────────────────────────┘

✓ Informational Notification
This is a passive notification for informational purposes only.
No action is required.
```

### Service de Catégorisation

**Fichier:** `lib/services/notification-category.ts`

```typescript
import { determineCategory, categoryHasChat, categoryConfig } from '@/lib/services/notification-category'

// Determine category from subject
const category = determineCategory('order.appointment') // 'urgent'
const category2 = determineCategory('Profile Updated')  // 'info'
const category3 = determineCategory('New Appointment')  // 'action'

// Check if chat is available
const hasChat = categoryHasChat('info') // false

// Display configuration
const config = categoryConfig['action']
// { label: 'Action Required', hasChat: true, badgeClass: '...' }
```

### Notification Functions

**Fichier:** `lib/notifications/admin-notifications.ts`

**Single field change:**
```typescript
import { notifyAdminProfileChange } from '@/lib/notifications/admin-notifications'

await notifyAdminProfileChange({
  userId: user.id,
  userEmail: user.email,
  userName: "John Doe",
  changeType: 'name',
  changeTitle: 'Name Updated',
  changeDescription: 'User changed their name',
  previousValue: 'John Doe',
  newValue: 'Johnny Smith'
})
```

**Multiple field changes (v4.3.0):**
```typescript
import { notifyAdminProfileChanges } from '@/lib/notifications/admin-notifications'

await notifyAdminProfileChanges({
  userId: user.id,
  userEmail: user.email,
  userName: "John Doe",
  changes: [
    { field: "firstName", previousValue: "John", newValue: "Johnny" },
    { field: "lastName", previousValue: "Doe", newValue: "Smith" },
    { field: "email", previousValue: "old@email.com", newValue: "new@email.com" },
    { field: "phone", previousValue: null, newValue: "+33612345678" }
  ]
})
```

The metadata will contain:
```json
{
  "notificationType": "profile_change",
  "actionRequired": false,
  "changesCount": 4,
  "changes": [
    { "field": "First Name", "from": "John", "to": "Johnny" },
    { "field": "Last Name", "from": "Doe", "to": "Smith" },
    { "field": "Email", "from": "old@email.com", "to": "new@email.com" },
    { "field": "Phone", "from": "(empty)", "to": "+33612345678" }
  ]
}
```

### Filtrage par Catégorie

**API:**
```
GET /api/admin/chat?category=urgent
GET /api/admin/chat?category=info,action  # Multiple
```

**Frontend:**
- Onglets de filtrage: All, Info, Action, Urgent
- Stats cards par catégorie
- Colonne "Type" dans le tableau

### Migration

L'enum `notification_category` est défini dans `db/schema.ts` et appliqué automatiquement par `drizzle-kit push`.

Pour mettre à jour le schéma :
```bash
pnpm db:push
```

Le script:
1. Crée l'enum `notification_category`
2. Ajoute la colonne `category` avec défaut 'action'
3. Peuple les catégories basé sur les patterns de sujets
4. Crée les index pour le filtrage

## Base de Données

### Tables Utilisées

```sql
chat_conversations
├── id (uuid)
├── user_id (uuid, FK)
├── guest_email (text)
├── guest_name (text)
├── subject (text)
├── status (open|pending|resolved|closed)
├── priority (low|normal|high|urgent)
├── category (info|action|urgent)  -- NEW: Catégorie de notification
├── assigned_admin_id (uuid, FK)
├── last_message_at (timestamp)
├── created_at (timestamp)
└── metadata (jsonb)

chat_messages
├── id (uuid)
├── conversation_id (uuid, FK)
├── sender_id (uuid, FK)
├── sender_type (guest|user|admin|system)
├── sender_name (text)
├── sender_email (text)
├── content (text)
├── message_type (text|image|file|system)
├── is_read (boolean)
├── read_at (timestamp)
└── created_at (timestamp)
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `app/(private)/admin/chat/page.tsx` | Chat direct (messagerie) |
| `app/(private)/admin/support/page.tsx` | Liste des tickets (tableau avec sélection) |
| `app/(private)/admin/support/reply/page.tsx` | Réponse aux tickets |
| `app/api/admin/chat/route.ts` | API liste conversations |
| `app/api/admin/chat/[id]/route.ts` | API détails/update/delete |
| `app/api/admin/chat/[id]/messages/route.ts` | API messages |
| `app/api/admin/users/route.ts` | API recherche utilisateurs |
| `components/layout/private-dashboard/sidebar.tsx` | Navigation |
| `components/admin/info-overlay.tsx` | Overlay notifications info |
| `lib/services/notification-category.ts` | Service catégorisation |
| `db/schema.ts` | Schéma DB (enum notification_category) |

## Changelog

### v4.3.0 (2026-01-16)
- **InfoOverlay amélioré (English only)**
  - Tout le texte maintenant en anglais
  - Status/Priority masqués pour les notifications 'info'
  - Affichage détaillé des changements de profil (avant → après)
  - Support des changements multiples avec compteur
  - Icône ✓ verte pour "Informational Notification"
- **Nouvelle fonction `notifyAdminProfileChanges`**
  - Support des changements de profil multiples
  - Métadonnées structurées avec tableau `changes`
  - Formatage automatique des noms de champs (camelCase → Proper Case)
- **Patterns de catégorisation améliorés**
  - Regex plus flexibles (dots, spaces, underscores)
  - Support français et anglais
  - Patterns pour appointments, orders, support, etc.
- **API default behavior**
  - Notifications 'info' exclues par défaut de `/api/admin/chat`
  - Paramètre `category=all` pour inclure toutes les catégories
  - Support page passe `category=all` automatiquement

### v4.2.0 (2026-01-16)
- **Système de catégorisation des notifications**
  - Trois catégories: Info, Action, Urgent
  - Enum `notification_category` dans la base de données
  - Service `notification-category.ts` pour la détermination automatique
- **Composant InfoOverlay**
  - Panneau coulissant pour les notifications 'info'
  - Affichage détaillé: client, timestamps, métadonnées
  - Message indiquant l'absence de chat
- **Filtrage par catégorie**
  - Onglets: All, Info, Action, Urgent
  - Paramètre API `?category=info,action,urgent`
  - Stats cards par catégorie (6 cards total)
- **Colonne Type dans le tableau**
  - Badges colorés par catégorie
  - Comportement de clic différencié
- **Migration SQL**
  - Script `add-notification-category.sql`
  - Index optimisés pour le filtrage

### v4.4.0 (2026-01-16)
- **User Profile Overlay**
  - New `UserProfileOverlay` component (`components/admin/user-profile-overlay.tsx`)
  - Right-side sliding panel showing customer details
  - Contact info, statistics, and quick actions
  - WhatsApp integration with formatted phone numbers
  - Link to full admin user profile page
- **WhatsApp Integration**
  - Replaced phone call buttons with WhatsApp links
  - Custom WhatsApp SVG icon component
  - Phone number formatting for WhatsApp URLs
- **French to English Translation**
  - All date formatting now uses `enUS` locale
  - "Hier" → "Yesterday"
  - "Notification de suivi client" → "Client tracking notification"
  - All UI text translated to English
- **Notification Metadata Fix**
  - Fixed metadata storage in conversations (not messages)
  - Profile changes now display old/new values in InfoOverlay
  - Proper `changes` array structure for multiple field updates
- **Header Notification Filtering**
  - Info notifications excluded from header bell
  - Only 'action' and 'urgent' notifications appear in header
  - Info notifications visible only in support ticket list

### v4.1.0 (2026-01-16)
- Ajout des cases à cocher pour sélection multiple
- Barre d'actions groupées (Mark as Solved, Close, Delete)
- Amélioration de la colonne "Requested By" avec avatar photo
- Filtres tabs style TailAdmin (All, Solved, Pending)
- Breadcrumb navigation (Home > Support List)
- Stats cards avec icônes repositionnées à gauche

### v4.0.0 (2026-01-16)
- Restructuration en pages séparées (Chat, Tickets, Reply)
- `/admin/chat` : Interface de chat direct style messagerie
- `/admin/support` : Liste des tickets avec stats cards et tableau
- `/admin/support/reply` : Page de réponse dédiée
- Navigation sidebar mise à jour avec sous-menu Support
- API `/api/admin/users` pour recherche de clients

### v3.0.0 (2026-01-16)
- Interface unifiée `/admin/support` (remplacée)

### v2.0.0 (2026-01-16)
- Ajout du composant AdminLiveChat flottant
- API initiate pour conversations admin->client
