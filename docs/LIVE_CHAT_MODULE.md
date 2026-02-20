# Module de Chat Support en Direct

## Vue d'ensemble

Le module de chat support permet aux visiteurs (invités) et aux utilisateurs enregistrés de communiquer directement avec l'équipe de support. Il inclut :

- **Widget public** : Bouton flottant sur toutes les pages publiques
- **Interface utilisateur** : Page de chat dans le dashboard
- **Console admin** : Gestion complète des conversations
- **Admin Live Chat** : Composant flottant pour initier des conversations avec les clients (Nouveau v2.0)

## Architecture

### Base de données

```
chat_conversations     # Conversations (guests + utilisateurs)
├── chat_messages      # Messages individuels
├── chat_quick_responses # Réponses rapides prédéfinies
└── chat_settings      # Configuration du système
```

### Tables

#### `chat_conversations`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| userId | UUID? | Utilisateur connecté (null pour guest) |
| guestEmail | text? | Email du visiteur |
| guestName | text? | Nom du visiteur |
| guestSessionId | text? | ID de session pour le suivi |
| subject | text | Sujet de la conversation |
| status | text | 'open' \| 'pending' \| 'resolved' \| 'closed' |
| priority | text | 'low' \| 'normal' \| 'high' \| 'urgent' |
| assignedAdminId | UUID? | Admin assigné |
| lastMessageAt | timestamp | Dernier message |
| metadata | jsonb | Données additionnelles (initiatedBy, adminId, etc.) |

#### `chat_messages`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| conversationId | UUID | Référence conversation |
| senderId | UUID? | Expéditeur (null pour guest) |
| senderType | text | 'guest' \| 'user' \| 'admin' \| 'system' |
| content | text | Contenu du message |
| messageType | text | 'text' \| 'image' \| 'file' \| 'system' |
| isRead | boolean | Lu par le destinataire |

## API Endpoints

### Conversations (Public/User)

```
GET  /api/chat/conversations              # Liste des conversations
POST /api/chat/conversations              # Nouvelle conversation
GET  /api/chat/conversations/[id]         # Détail conversation
PATCH /api/chat/conversations/[id]        # Modifier conversation
GET  /api/chat/conversations/[id]/messages # Liste messages
POST /api/chat/conversations/[id]/messages # Envoyer message
```

### Admin

```
GET  /api/admin/chat                      # Toutes les conversations
POST /api/admin/chat/initiate             # Initier une conversation (NEW)
POST /api/admin/chat/[id]/assign          # Assigner à un admin
POST /api/admin/chat/[id]/read            # Marquer comme lu
GET  /api/admin/chat/[id]/messages        # Messages d'une conversation (NEW)
POST /api/admin/chat/[id]/messages        # Envoyer un message (NEW)
GET  /api/admin/chat/quick-responses      # Réponses rapides
POST /api/admin/chat/quick-responses      # Créer réponse rapide
```

---

## Admin Live Chat (Nouveau v2.0)

### Vue d'ensemble

Le composant `AdminLiveChat` permet aux administrateurs d'initier des conversations en direct avec les clients depuis n'importe quelle page admin. Un bouton flottant en bas à droite donne accès à :

1. **Liste des conversations actives** avec indicateurs de statut
2. **Interface de chat en temps réel** avec historique des messages
3. **Création de nouvelle conversation** avec recherche d'utilisateurs

### Composant

```tsx
// components/admin/admin-live-chat.tsx
import { AdminLiveChat } from "@/components/admin/admin-live-chat"

// Automatiquement inclus dans le layout admin
// app/(private)/admin/layout.tsx
```

### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| Bouton flottant | Affiche le nombre de messages non lus |
| Liste des conversations | Filtrable par recherche, triée par activité |
| Indicateurs de statut | Points colorés (bleu=ouvert, ambre=en attente, vert=résolu) |
| Messages non lus | Badge sur chaque conversation |
| Recherche d'utilisateurs | Recherche par nom ou email pour nouvelle conversation |
| Auto-assignation | L'admin qui initie est automatiquement assigné |
| Maximisation | Mode plein écran disponible |
| Actions rapides | Email, téléphone, fermeture de conversation |

### Initier une conversation (Admin → Client)

```typescript
// API: POST /api/admin/chat/initiate
const response = await fetch('/api/admin/chat/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'uuid-du-client',
    subject: 'Suivi de votre commande',
    message: 'Bonjour, nous souhaitons vous informer...'
  })
})

// Response
{
  "success": true,
  "data": {
    "conversation": { /* conversation complète avec relations */ },
    "message": { /* premier message envoyé */ }
  }
}
```

### Envoyer un message (Admin)

```typescript
// API: POST /api/admin/chat/[id]/messages
await fetch(`/api/admin/chat/${conversationId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Votre colis a été expédié.'
  })
})
```

### Métadonnées de conversation

Quand un admin initie une conversation, les métadonnées suivantes sont stockées :

```typescript
metadata: {
  initiatedBy: 'admin',
  adminId: 'uuid-de-l-admin',
  adminName: 'Prénom Nom'
}
```

---

## Widget Public (Utilisateur/Visiteur)

Le widget est automatiquement inclus sur toutes les pages publiques via `ChatWidgetWrapper` dans le layout public.

```tsx
// app/(public)/layout.tsx
import { ChatWidgetWrapper } from "@/components/chat/chat-widget-wrapper"

// Le widget gère automatiquement :
// - Les visiteurs anonymes (sessionId stocké en localStorage)
// - Les utilisateurs connectés (via UserProvider)
```

### Créer une conversation (API)

```typescript
// Guest
const response = await fetch('/api/chat/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Question sur le produit',
    message: 'Bonjour, je voudrais...',
    guestEmail: 'visiteur@example.com',
    guestName: 'Jean Dupont'
  })
})

// Le response inclut guestSessionId à stocker pour les prochaines requêtes
```

### Envoyer un message

```typescript
// Utilisateur connecté
await fetch(`/api/chat/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Merci pour votre réponse !',
  })
})

// Guest (avec sessionId)
await fetch(`/api/chat/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Merci pour votre réponse !',
    guestSessionId: storedSessionId
  })
})
```

---

## Interface Admin (Pages dédiées)

Le module admin est divisé en plusieurs pages selon le design TailAdmin :

### `/admin/chat` - Chat Direct

Interface de messagerie instantanée style WhatsApp/Messenger :
- **Panel gauche** : Liste des contacts avec recherche
- **Panel droit** : Messages en bulles (admin à droite, client à gauche)
- **Actions** : Appel, vidéo, info, pièces jointes

### `/admin/support` - Liste des Tickets

Interface tableau avec statistiques :
- **Stats cards** : Total Tickets, Pending Tickets, Solved Tickets
- **Filtres** : All, Solved, Pending, In Progress + recherche
- **Tableau** : Ticket ID, Requested By, Subject, Create Date, Status
- **Pagination** : Navigation par page

### `/admin/support/reply?id=xxx` - Réponse aux Tickets

Page de réponse dédiée avec :
- **Header** : Navigation retour, infos ticket, actions
- **Messages** : Historique complet de la conversation
- **Reply Form** : Zone de saisie + contrôles de statut
- **Sidebar** : Détails client et ticket (lg+)

### Workflow typique

1. Visiteur envoie un message → Statut "Ouvert"
2. Admin répond → Statut "En attente" (attend réponse utilisateur)
3. Utilisateur répond → Retour à "Ouvert"
4. Admin résout → Statut "Résolu" ou "Fermé"

### Workflow Admin → Client (Nouveau)

1. Admin clique sur le bouton de chat flottant
2. Admin clique sur "+" pour nouvelle conversation
3. Admin recherche le client par nom ou email
4. Admin rédige le sujet et le message initial
5. Conversation créée avec l'admin auto-assigné
6. Client reçoit le message (visible dans son dashboard)

---

## Interface Utilisateur

Accessible via `/dashboard/chat`

### Fonctionnalités

- Liste des conversations existantes
- Créer une nouvelle conversation
- Voir les réponses du support
- Continuer une conversation
- Recevoir les messages initiés par l'admin

---

## Personnalisation

### Styles du widget

Le widget utilise les variables CSS du thème. Personnalisez via Tailwind :

```css
/* Couleur primaire du widget */
.chat-widget-button {
  @apply bg-primary text-primary-foreground;
}
```

### Messages système

Les messages système (assignation, fermeture) sont automatiquement ajoutés avec `senderType: 'system'` et `messageType: 'system'`.

---

## Sécurité

- Les guests sont identifiés par `guestSessionId` (UUID)
- Les utilisateurs connectés via JWT cookie
- Les admins vérifient leur rôle avant d'accéder aux fonctions admin
- Les conversations sont filtrées par propriétaire (userId ou guestSessionId)
- L'API `/api/admin/chat/initiate` est protégée par `requireAdmin()`

---

## Fichiers du Module

### Composants

| Fichier | Description |
|---------|-------------|
| `components/chat/chat-widget.tsx` | Widget public pour visiteurs/utilisateurs |
| `components/chat/chat-widget-wrapper.tsx` | Wrapper pour inclusion dans layout public |
| `components/admin/admin-live-chat.tsx` | Composant de chat flottant pour admins (NEW) |

### API Routes

| Fichier | Description |
|---------|-------------|
| `app/api/chat/conversations/route.ts` | CRUD conversations publiques |
| `app/api/chat/conversations/[id]/messages/route.ts` | Messages publiques |
| `app/api/admin/chat/route.ts` | Liste conversations admin |
| `app/api/admin/chat/initiate/route.ts` | Initier conversation admin (NEW) |
| `app/api/admin/chat/[id]/messages/route.ts` | Messages admin (NEW) |
| `app/api/admin/chat/[id]/assign/route.ts` | Assignation |
| `app/api/admin/chat/[id]/read/route.ts` | Marquer comme lu |

### Pages

| Fichier | Description |
|---------|-------------|
| `app/(private)/admin/chat/page.tsx` | Chat direct avec clients (style messagerie) |
| `app/(private)/admin/support/page.tsx` | Liste des tickets support (style tableau) |
| `app/(private)/admin/support/reply/page.tsx` | Réponse aux tickets |
| `app/(private)/dashboard/chat/page.tsx` | Chat utilisateur |

---

## Intégrations

### Système de Notifications Admin
Pour les notifications avancées avec gestion par type de produit, validation de rendez-vous, et politique d'assignation, voir la documentation dédiée: **[ADMIN_NOTIFICATION_SYSTEM.md](./ADMIN_NOTIFICATION_SYSTEM.md)**

### LLM
Le module est préparé pour l'intégration avec des LLM (voir `LLM_INTEGRATION.md`) pour des réponses automatiques.

---

## Changelog

### v4.4.0 (2026-01-16)
- **User Profile Overlay**
  - New `UserProfileOverlay` component
  - Sliding right panel with customer details
  - Contact info, statistics, quick actions
  - WhatsApp integration
  - Link to full profile page
- **WhatsApp Integration**
  - Replaced phone call buttons with WhatsApp
  - Custom WhatsApp SVG icon
  - Formatted phone numbers for WhatsApp URLs
- **French to English Translation**
  - All dates use `enUS` locale
  - "Hier" → "Yesterday"
  - All UI text in English
- **Notification Metadata Fix**
  - Metadata stored in conversations (not messages)
  - Profile changes show old/new values in InfoOverlay
  - Proper `changes` array structure
- **Header Notification Filtering**
  - Info notifications excluded from header bell
  - Only action/urgent in header notifications
  - Info visible only in support ticket list

### v4.3.0 (2026-01-16)
- **InfoOverlay English-only**
  - All text in English (removed French)
  - No status/priority for 'info' category notifications
  - Detailed profile change display (before → after)
  - Multiple changes support with counter
- **New `notifyAdminProfileChanges` function**
  - Multiple profile field changes in single notification
  - Structured `changes` array in metadata
- **Improved categorization patterns**
  - Flexible regex (dots, spaces, underscores)
  - French and English support
- **API default: exclude 'info'**
  - Info notifications excluded by default from chat list
  - Use `category=all` to include all

### v4.2.0 (2026-01-16)
- Système de catégorisation: Info, Action, Urgent
- InfoOverlay component for 'info' notifications
- Category filtering in API and frontend
- Migration script for existing data

### v4.1.0 (2026-01-16)
- Ajout sélection multiple avec cases à cocher dans la liste des tickets
- Barre d'actions groupées (Mark as Solved, Close, Delete)
- Amélioration colonne "Requested By" avec avatar photo
- Filtres tabs style TailAdmin
- Breadcrumb navigation

### v4.0.0 (2026-01-16)
- Restructuration complète selon design TailAdmin
- `/admin/chat` : Nouvelle interface de chat direct (style messagerie)
- `/admin/support` : Liste des tickets avec stats cards et tableau
- `/admin/support/reply` : Page de réponse dédiée
- Navigation sidebar avec sous-menu Support (Chat, Tickets)
- API `/api/admin/users` pour recherche de clients

### v2.0.0 (2026-01-16)
- Ajout du composant `AdminLiveChat` pour chat flottant admin
- Nouvelle API `/api/admin/chat/initiate` pour initier des conversations
- Nouvelle API `/api/admin/chat/[id]/messages` pour les messages admin
- Auto-assignation lors de l'initiation d'une conversation
- Interface maximisable avec recherche de conversations
- Recherche d'utilisateurs pour nouvelle conversation
- Indicateurs de statut et messages non lus
- Actions rapides (email, téléphone, fermeture)

### v1.0.0 (Initial)
- Widget de chat public
- Interface admin pour la gestion des tickets
- Système d'assignation et de statuts
