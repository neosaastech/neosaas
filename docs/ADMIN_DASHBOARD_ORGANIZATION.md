# Admin Dashboard - Organisation et Responsivité

> **Dernière mise à jour :** 17 février 2026
> **Auteur :** Système
> **Objectif :** Documentation de la page `/admin` (Business Dashboard)

---

## 📋 Vue d'ensemble

La page **Admin** (`/admin`) est le tableau de bord principal pour la gestion business de la plateforme. Elle affiche les statistiques, paiements, factures et la configuration Stripe.

**URL** : `/admin`  
**Fichier** : `app/(private)/admin/page.tsx`  
**Accès** : Administrateurs uniquement

---

## Structure des onglets

### Organisation (3 onglets)

La page est organisée en **3 onglets principaux** :

1. **Overview** - Vue d'ensemble des statistiques
2. **Recent Orders** - Commandes récentes et factures liées
3. **Payment Config** - Configuration Stripe (mode test/live, test de connexion)

### Historique des changements

#### Version actuelle (3 onglets) - 16 février 2026
```
┌──────────┬────────────────┬──────────────┐
│ Overview │ Recent Orders  │ Payment Config │
└──────────┴────────────────┴──────────────┘
```
**Avantages** :
- Terminologie correcte (Orders vs Payments)
- Vue des commandes avec leurs factures liées
- Interface cohérente

---

## Responsivité des onglets

### TabsList responsive

```tsx
<TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
```

**Comportement** :
- **Mobile (< 640px)** : 1 onglet par ligne (empilés verticalement)
- **Tablette et Desktop (≥ 640px)** : 3 onglets sur une ligne

### Texte adaptatif

```tsx
<TabsTrigger value="payments">
  <span className="hidden sm:inline">Recent Orders</span>
  <span className="sm:hidden">Orders</span>
</TabsTrigger>

<TabsTrigger value="lago">
  <span className="hidden sm:inline">Payment Config</span>
  <span className="sm:hidden">Payments</span>
</TabsTrigger>
```

**Résultat** :
- **Mobile** : "Orders" et "Payments" (texte court)
- **Desktop** : "Recent Orders" et "Payment Config" (texte complet)

---

## Onglet 1 : Overview

**Composant** : `components/admin/dashboard-stats.tsx`

### A. Métriques (4 cartes)

**Grille responsive** :
```tsx
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

| Écran | Colonnes | Layout |
|-------|----------|--------|
| Mobile (< 640px) | 1 | Empilées verticalement |
| Tablette (640-1024px) | 2 | 2x2 grille |
| Desktop (≥ 1024px) | 4 | 1x4 ligne |

**Métriques affichées** :
1. 💰 **Total Revenue** - Revenu total à vie
2. 👥 **Total Subscriptions** - Nombre total d'abonnements
3. 💳 **Active Plans** - Plans actuellement actifs
4. 🏢 **Total Companies** - Entreprises enregistrées

---

### B. Graphiques principaux (2 sections)

#### Section Revenue Overview + Recent Invoices

**Grille responsive** :
```tsx
grid-cols-1 lg:grid-cols-7
```

| Écran | Layout |
|-------|--------|
| Mobile/Tablette (< 1024px) | Empilés verticalement (pleine largeur) |
| Desktop (≥ 1024px) | 2 colonnes (4 cols / 3 cols) |

##### 1. Revenue Overview (Graphique en barres)

**Classe** : `lg:col-span-4`

**Hauteur responsive** :
```tsx
h-[250px] sm:h-[300px] lg:h-[350px]
```
- Mobile : 250px
- Tablette : 300px
- Desktop : 350px

**Contenu** :
- Graphique en barres (BarChart)
- Revenu mensuel des 6 derniers mois
- Axe Y en dollars (`$`)
- Tooltip au survol

##### 2. Recent Invoices (Liste)

**Classe** : `lg:col-span-3`

**Contenu** :
- 5 dernières factures
- Pour chaque facture :
  - Nom de l'entreprise
  - Numéro de commande
  - Montant
  - Date
- Bouton "View All" → `/admin/invoices`

---

#### Section Growth Analysis + New Writers

**Grille responsive** :
```tsx
grid-cols-1 md:grid-cols-2
```

| Écran | Layout |
|-------|--------|
| Mobile (< 768px) | Empilés verticalement |
| Tablette/Desktop (≥ 768px) | 2 colonnes |

##### 1. Growth Analysis (Courbes doubles)

**Hauteur** : `h-[250px] sm:h-[300px]`

**Contenu** :
- Graphique LineChart à 2 courbes
- 🔵 **Registrations** - Nouvelles inscriptions
- 🟢 **Activations (Paid)** - Premiers achats
- Permet de visualiser le taux de conversion

##### 2. New Writers (Area Chart)

**Hauteur** : `h-[250px] sm:h-[300px]`

**Contenu** :
- Graphique AreaChart
- Courbe orange avec dégradé
- Évolution des inscriptions de "writers" (rôle individuel)

---

### C. Tableau des inscriptions récentes

**Titre** : Recent Registrations & Active Companies

**Responsivité** :
```tsx
<div className="overflow-x-auto">
  <Table>
    ...
  </Table>
</div>
```

**Colonnes** :
1. Company
2. Email
3. Registration Date
4. Status (Badge)
5. Plan

**Mobile** : Scroll horizontal activé pour préserver toutes les colonnes

---

## Onglet 2 : Recent Orders

**Composants** :
- `components/admin/dashboard-payments.tsx` (affiche les commandes récentes)
- `components/admin/dashboard-invoices.tsx` (affiche les factures liées)

**Structure** :
```tsx
<div className="space-y-6">
  <DashboardPayments />  {/* Recent Orders */}
  <DashboardInvoices />  {/* Invoices linked to orders */}
</div>
```

**Espacement** : `space-y-6` (24px entre les deux sections)

### A. Recent Orders

**Composant** : `PaymentsTable`

**Contenu** :
- Liste des commandes récentes
- Informations par commande :
  - Utilisateur / Entreprise
  - Montant
  - Statut
  - Date
  - Méthode de paiement

### B. Invoices

**Composant** : `InvoicesTable`

**Contenu** :
- Liste des factures liées aux commandes
- Informations par facture :
  - Numéro de facture
  - Client
  - Montant
  - Statut
  - Date d'émission

**Avantage** :
- Vue complète des commandes et factures liées sur un seul écran
- Terminologie cohérente (Orders → Invoices)
- Meilleure vision d'ensemble

---

## Onglet 3 : Payment Configuration

**Composant** : `components/admin/payment-settings.tsx`

**Contenu** :
- Configuration paiements Stripe (payment processor principal)
- Toggle **Stripe Enabled** / **PayPal Enabled**
- Bascule **Test mode** (sandbox) / **Live mode** (production) avec persistance `stripe_mode` en BDD
- **Test de connexion Stripe** : vérifie 5 endpoints en parallèle (Balance, Customers, Products, Tax Rates, Invoices)
- Résultats détaillés : badge environnement (Test/Production), checks individuels pass/fail
- **Stripe Customers Lookup** : table des entreprises liées/non liées à Stripe, recherche par nom/email/SIRET, lien direct vers le Dashboard Stripe pour chaque client lié
- Configuration webhook (URL + événements recommandés)
- Lien vers l'API Manager pour les clés Stripe
- Note conformité PCI

**Stripe Customer Lookup** (ajouté 17 fév. 2026) :
- Endpoint API : `GET /api/admin/payments/stripe-customers?search=...&linked=true|false`
- Affiche le mapping `companies.stripeCustomerId` ↔ Stripe Dashboard
- Filtres : All / Linked / Unlinked avec compteurs
- Recherche par nom, email ou SIRET
- Lien "Open in Stripe" vers `https://dashboard.stripe.com/[test/]customers/{id}`

**Avertissement live** : Quand le mode Live est activé, un bandeau rouge rappelle que les paiements sont réels.

**Note** : Stripe est le payment processor direct. Les clés API sont gérées dans `/admin/api` (API Manager). Le mode (test/live) est stocké dans `platform_config.stripe_mode`.

---

## Système de filtrage (Overview)

### Sélecteur de période

```tsx
<Select defaultValue="30d">
  <SelectContent>
    <SelectItem value="7d">Last 7 days</SelectItem>
    <SelectItem value="30d">Last 30 days</SelectItem>
    <SelectItem value="90d">Last 3 months</SelectItem>
    <SelectItem value="12m">Last year</SelectItem>
  </SelectContent>
</Select>
```

**Valeur par défaut** : 30 jours

---

## États de chargement

### Vérification des droits (Layout)

La vérification des droits admin est gérée en deux couches dans le layout :

```tsx
// app/(private)/admin/layout.tsx
// 1. Server-side: requireAdmin() vérifie les rôles en BDD
//    (PAS de try/catch — laisse redirect() propager au framework)
const user = await requireAdmin()

// 2. Client-side: AdminClientGuard vérifie via API
<AdminClientGuard>
  {children}
</AdminClientGuard>
```

**Important** : Ne PAS envelopper `requireAdmin()` dans un `try/catch` — cela intercepterait les erreurs `NEXT_REDIRECT` de Next.js et provoquerait un crash "Error: An error occurred in the Server Components render".

### Chargement des données

```tsx
if (loading) {
  return (
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  )
}
```

---

## Améliorations de responsivité

### ✅ 1. Grilles adaptatives

| Élément | Mobile | Tablette | Desktop |
|---------|--------|----------|---------|
| Métriques | 1 col | 2 cols | 4 cols |
| Graphiques principaux | Stack | Stack | 2 cols (4/3) |
| Growth/Writers | Stack | 2 cols | 2 cols |

### ✅ 2. Hauteurs dynamiques

- Graphiques plus petits sur mobile (250px)
- Graphiques moyens sur tablette (300px)
- Graphiques grands sur desktop (350px)

### ✅ 3. Tableaux scrollables

- `overflow-x-auto` sur tableaux complexes
- Préserve toutes les colonnes sur mobile
- Scroll horizontal naturel

### ✅ 4. Texte adaptatif

- Labels courts sur mobile
- Labels complets sur desktop
- Meilleure UX tactile

---

## Breakpoints utilisés

```css
/* Tailwind breakpoints */
sm:  640px   /* Tablette portrait */
md:  768px   /* Tablette paysage */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
```

---

## Fichiers concernés

### Pages
- `app/(private)/admin/page.tsx` - Page principale

### Composants
- `components/admin/dashboard-stats.tsx` - Overview et statistiques
- `components/admin/dashboard-payments.tsx` - Tableau des paiements
- `components/admin/dashboard-invoices.tsx` - Tableau des factures
- `components/admin/admin-subscriptions.tsx` - Gestion des abonnements (pause/annulation/restauration)
- `components/admin/payment-settings.tsx` - Configuration paiements (Stripe/PayPal)
- `components/admin/metric-card.tsx` - Cartes de métriques
- `components/admin/payments-table.tsx` - Table des paiements
- `components/admin/invoices-table.tsx` - Table des factures (EN + boutons PDF)

### Actions
- `app/actions/admin-dashboard.ts` - Actions serveur : stats, paiements, factures + 5 actions abonnements admin

### Hooks
- `lib/hooks/use-require-admin.ts` - Vérification des droits admin

---

## Graphiques utilisés

**Bibliothèque** : Recharts

**Types de graphiques** :
1. **BarChart** - Revenue Overview (barres verticales)
2. **LineChart** - Growth Analysis (courbes doubles)
3. **AreaChart** - New Writers (area avec gradient)

**Configuration commune** :
```tsx
<ResponsiveContainer width="100%" height="100%">
  {/* Chart */}
</ResponsiveContainer>
```

---

## Données affichées

### Métriques
```typescript
interface Metrics {
  revenue: number          // Revenu total
  subscriptions: number    // Nombre d'abonnements
  activePlans: number      // Plans actifs
  companies: number        // Entreprises enregistrées
}
```

### Chart Data
```typescript
interface ChartData {
  name: string            // Mois (ex: "Jan", "Feb")
  revenue: number         // Revenu du mois
  registrations: number   // Inscriptions du mois
  activations: number     // Activations du mois
  writers: number         // Nouveaux writers du mois
}
```

---

## Documentation connexe

- [Admin Responsive Design](./ADMIN_RESPONSIVE_DESIGN.md)
- [Admin UX Patterns](./ADMIN_UX_PATTERNS.md)
- [Stripe Integration](./STRIPE_INTEGRATION.md)
- [Stripe Quick Start](./STRIPE_QUICK_START.md)
- [Admin Tables Responsive Rules](./ADMIN_TABLES_RESPONSIVE_RULES.md)

---

## Changelog

### 16 février 2026
- ✅ Onglet "Lago Parameters" renommé → "Payment Config"
- ✅ Composant `payment-settings.tsx` 100% Stripe (toggle test/live, test 5 endpoints)
- ✅ Persistance mode Stripe (`stripe_mode`) en `platform_config`
- ✅ Correction bug auth route `test-stripe` (erreur 500)
- ✅ Badges environnement colorés dans la table API

### 13 janvier 2026
- ✅ Renommage onglet "Payments & Invoices" → "Recent Orders"
- ✅ Mise à jour titres : "Recent Payments" → "Recent Orders", "Recent Invoices" → "Invoices"
- ✅ Suppression double vérification admin (layout suffit)
- ✅ Texte adaptatif : "Recent Orders" (desktop) / "Orders" (mobile)

### 2 janvier 2026
- ✅ Fusion des onglets Payments et Invoices en un seul
- ✅ Réduction de 4 à 3 onglets
- ✅ Amélioration de la responsivité des grilles (1/2/4 colonnes)
- ✅ Hauteurs adaptatives pour tous les graphiques
- ✅ Texte adaptatif sur les onglets (mobile vs desktop)
- ✅ Ajout de `overflow-x-auto` sur le tableau des inscriptions
- ✅ Navigation tactile améliorée sur mobile
