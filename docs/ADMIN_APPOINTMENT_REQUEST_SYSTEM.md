# Implémentation du Système de Rendez-vous Admin-Client

## Date
7 janvier 2026

## Objectif
Permettre aux administrateurs de demander des rendez-vous aux clients, et aux clients de valider ces demandes. Ajouter une vue calendrier pour visualiser tous les rendez-vous du groupe et des clients.

## Fonctionnalités Implémentées

### 1. **API Admin - Création de Rendez-vous** ✅
**Fichier:** `app/api/admin/appointments/route.ts`

#### Nouvelles fonctionnalités:
- **Action `create`**: Permet aux admins de créer une demande de rendez-vous
  - Recherche le client par email
  - Crée le rendez-vous avec statut `pending` (en attente de confirmation)
  - Assigne automatiquement l'admin qui a créé la demande
  - Pré-remplit les informations du client (nom, email, téléphone)

#### Exemple de requête:
```json
POST /api/admin/appointments
{
  "action": "create",
  "clientEmail": "client@example.com",
  "title": "Consultation technique",
  "description": "Discussion sur le projet",
  "startTime": "2026-01-15T10:00:00Z",
  "endTime": "2026-01-15T11:00:00Z",
  "type": "free",
  "location": "Bureau Paris",
  "meetingUrl": "https://meet.google.com/abc-defg-hij",
  "notes": "Client VIP - prévoir documentation"
}
```

---

### 2. **Page Admin - Vue Calendrier** ✅
**Fichier:** `app/(private)/admin/appointments/calendar/page.tsx`

#### Caractéristiques:
- **Bibliothèque**: `react-big-calendar` (déjà installée)
- **Visualisation**: Tous les rendez-vous (groupe + clients)
- **Vues disponibles**: Mois, Semaine, Jour, Agenda
- **Création rapide**: Cliquer sur un créneau horaire ouvre un dialog de création
- **Navigation**: Retour vers la vue liste via bouton "List View"

#### Dialog de Création de Rendez-vous:
- Email du client (obligatoire)
- Titre (obligatoire)
- Description
- Type: Gratuit / Payant (avec prix si payant)
- Localisation
- URL de visioconférence
- Notes internes (visibles uniquement par les admins)

#### Couleurs de statut:
- 🟡 **Jaune**: Pending (en attente)
- 🟢 **Vert**: Confirmed (confirmé)
- ⚪ **Gris**: Completed (terminé)
- 🔴 **Rouge**: Cancelled / No Show (annulé / absent)

---

### 3. **Page Admin Liste - Navigation** ✅
**Fichier:** `app/(private)/admin/appointments/page.tsx`

#### Modification:
- Ajout d'un bouton "Calendar View" dans le header
- Redirection vers `/admin/appointments/calendar`

---

### 4. **API Rendez-vous - Validation Client** ✅
**Fichier:** `app/api/appointments/[id]/route.ts`

#### Modification de la logique de confirmation:
**Avant:**
- Seuls les admins pouvaient confirmer les rendez-vous

**Après:**
- **Clients**: Peuvent confirmer leurs propres rendez-vous si statut = `pending`
- **Admins**: Peuvent changer n'importe quel rendez-vous vers n'importe quel statut
- Seuls les admins peuvent marquer les rendez-vous comme `completed`

#### Logique de sécurité:
```typescript
if (validated.status === 'confirmed') {
  const isOwnAppointment = existing.userId === user.userId
  const wasPending = existing.status === 'pending'
  
  if (!userIsAdmin && (!isOwnAppointment || !wasPending)) {
    return 403 // Forbidden
  }
}
```

---

### 5. **Page Client - Section Confirmation** ✅
**Fichier:** `app/(private)/dashboard/appointments/page.tsx`

#### Nouvelles fonctionnalités:
- **Section dédiée en haut de page**: Affiche les rendez-vous en attente
- **Design visuel**: Carte jaune/or pour attirer l'attention
- **Informations affichées**:
  - Titre du rendez-vous
  - Date et heure
  - Localisation (si spécifiée)
  - Description
- **Actions disponibles**:
  - Bouton "Détails" → Voir toutes les informations
  - Bouton "Confirmer" → Validation en un clic

#### Fonction de confirmation:
```typescript
const handleConfirmAppointment = async (appointmentId: string) => {
  const response = await fetch(`/api/appointments/${appointmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'confirmed' }),
  })
  // Toast notification + refresh de la liste
}
```

---

## Structure de la Base de Données

### Table `appointments`
Colonnes utilisées pour la nouvelle fonctionnalité:

| Colonne | Type | Description |
|---------|------|-------------|
| `assignedAdminId` | UUID | Admin qui a créé ou est assigné au rendez-vous |
| `status` | TEXT | `pending`, `confirmed`, `cancelled`, `completed`, `no_show` |
| `attendeeEmail` | TEXT | Email du client |
| `attendeeName` | TEXT | Nom complet du client |
| `attendeePhone` | TEXT | Téléphone du client |
| `notes` | TEXT | Notes internes (admins uniquement) |

---

## Flux Utilisateur

### Scénario: Admin demande un rendez-vous

1. **Admin** → `/admin/appointments/calendar`
2. **Admin** clique sur un créneau horaire
3. **Admin** remplit le formulaire:
   - Email du client: `jean.dupont@example.com`
   - Titre: "Consultation initiale"
   - Type: Gratuit
   - Localisation: "Bureau Lyon"
4. **Admin** clique sur "Send Request"
5. **Système** crée le rendez-vous avec:
   - `status: pending`
   - `userId: <id du client>`
   - `assignedAdminId: <id de l'admin>`
6. **Client** se connecte → `/dashboard/appointments`
7. **Client** voit une carte jaune en haut:
   > "Rendez-vous en attente de confirmation"
8. **Client** clique sur "Confirmer"
9. **Système** change `status: confirmed`
10. **Admin** voit le rendez-vous confirmé dans le calendrier (couleur verte)

---

## Points Techniques

### Validation Email Client
Le client **doit exister** dans le système (table `users`).
Si l'email n'existe pas, l'API retourne une erreur 404.

```typescript
const clientUser = await db.query.users.findFirst({
  where: eq(users.email, clientEmail),
})

if (!clientUser) {
  return { error: 'Client not found with this email', status: 404 }
}
```

### Sécurité
- **Authentification**: Vérification JWT via `verifyAuth()`
- **Autorisation**:
  - Clients: Peuvent confirmer UNIQUEMENT leurs propres rendez-vous pending
  - Admins: Accès complet à tous les rendez-vous

### Notifications (TODO)
Actuellement, il y a un commentaire dans le code:
```typescript
// TODO: Send notification email to client about the appointment request
```

**Recommandation**: Utiliser le système d'emails existant pour notifier le client.

---

## URLs et Navigation

| URL | Description | Rôle |
|-----|-------------|------|
| `/admin/appointments` | Vue liste admin | Admin |
| `/admin/appointments/calendar` | Vue calendrier admin | Admin |
| `/dashboard/appointments` | Vue liste client (avec section confirmation) | Client |
| `/dashboard/calendar` | Vue calendrier client | Client |

---

## Prochaines Étapes Recommandées

1. **Notifications Email**
   - Envoyer un email au client quand l'admin crée une demande
   - Inclure un lien direct vers la page de confirmation
   - Template email professionnel

2. **Webhook / Notifications en temps réel**
   - WebSocket ou Server-Sent Events pour notifier instantanément
   - Badge de notification sur l'icône de rendez-vous

3. **Historique des actions**
   - Logger qui a créé le rendez-vous
   - Logger qui l'a confirmé et quand

4. **Export iCal**
   - Permettre aux clients d'ajouter le rendez-vous à leur calendrier externe

5. **Rappels automatiques**
   - Email de rappel 24h avant le rendez-vous
   - Email de rappel 1h avant (optionnel)

---

## Tests Recommandés

### Tests Manuels
1. ✅ Admin crée une demande pour un client existant
2. ✅ Admin crée une demande pour un email inexistant → Erreur
3. ✅ Client confirme un rendez-vous pending
4. ✅ Client tente de confirmer un rendez-vous déjà confirmé → Erreur
5. ✅ Client voit la section jaune seulement si rendez-vous pending
6. ✅ Navigation entre vue liste et calendrier (admin)
7. ✅ Cliquer sur un événement dans le calendrier
8. ✅ Créer un rendez-vous via le calendrier

### Tests API
```bash
# Test création admin
curl -X POST http://localhost:3000/api/admin/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "action": "create",
    "clientEmail": "test@example.com",
    "title": "Test",
    "startTime": "2026-01-20T10:00:00Z",
    "endTime": "2026-01-20T11:00:00Z"
  }'

# Test confirmation client
curl -X PUT http://localhost:3000/api/appointments/<appointment-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <client-token>" \
  -d '{"status": "confirmed"}'
```

---

## Résumé des Fichiers Modifiés/Créés

### Créés ✨
- `app/(private)/admin/appointments/calendar/page.tsx` - Vue calendrier admin

### Modifiés 🔧
- `app/api/admin/appointments/route.ts` - Ajout action "create"
- `app/api/appointments/[id]/route.ts` - Logique de confirmation client
- `app/(private)/admin/appointments/page.tsx` - Bouton vers calendrier
- `app/(private)/dashboard/appointments/page.tsx` - Section confirmation

---

## Conclusion

Le système est maintenant **fonctionnel et complet** :
- ✅ Les admins peuvent demander des rendez-vous aux clients
- ✅ Les clients peuvent visualiser et confirmer les demandes
- ✅ Vue calendrier complète pour visualiser tous les rendez-vous
- ✅ Navigation fluide entre vues liste et calendrier
- ✅ Sécurité et validation appropriées

Le système est prêt pour les tests et peut être étendu avec les notifications email et autres améliorations listées ci-dessus.
