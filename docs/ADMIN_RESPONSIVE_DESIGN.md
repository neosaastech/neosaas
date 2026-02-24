# Admin Panel - Responsive Design

## Vue d'ensemble

Tous les tableaux et pages de l'interface d'administration sont maintenant entièrement responsives, offrant une expérience optimale sur desktop, tablette et mobile.

## Pattern de design responsive

### Approche dual-view

Pour tous les tableaux complexes, nous utilisons une approche **dual-view** :

1. **Vue Desktop (md: et supérieur)** : Table classique avec toutes les colonnes
2. **Vue Mobile (< md:)** : Cards compactes avec les informations essentielles

### Breakpoint

- **Mobile** : < 768px
- **Desktop/Tablette** : ≥ 768px (md:)

## Pages et composants rendus responsive

### 1. Dashboard principal (`/admin`)

**Fichier** : `app/(private)/admin/page.tsx`

**Améliorations** :
- TabsList responsive : `grid-cols-1 sm:grid-cols-3`
- Onglets fusionnés : **Payments & Invoices** en un seul onglet (réduction de 4 à 3 onglets)
- Texte adaptatif sur mobile :
  - "Payments & Invoices" → "Payments" sur mobile
  - "Lago Parameters" → "Lago" sur mobile
- Les tableaux Payments et Invoices s'affichent dans le même onglet avec espacement approprié

**Composant Dashboard Stats** : `components/admin/dashboard-stats.tsx`

**Grilles responsive** :
- **Métriques Overview** : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - 1 colonne sur mobile
  - 2 colonnes sur tablette
  - 4 colonnes sur desktop
- **Graphiques principaux** : `grid-cols-1 lg:grid-cols-7`
  - Pleine largeur sur mobile/tablette
  - 2 colonnes (4/3 split) sur desktop
- **Graphiques Growth/Writers** : `grid-cols-1 md:grid-cols-2`
  - Pleine largeur sur mobile
  - 2 colonnes sur tablette et desktop

**Hauteurs adaptatives des graphiques** :
- **Revenue Overview** : `h-[250px] sm:h-[300px] lg:h-[350px]`
  - 250px sur mobile
  - 300px sur tablette
  - 350px sur desktop
- **Growth Analysis & Writers** : `h-[250px] sm:h-[300px]`
  - 250px sur mobile
  - 300px sur tablette et desktop

**Tableau responsive** :
- Tableau "Recent Registrations & Active Companies" avec `overflow-x-auto`
- Scroll horizontal sur mobile pour préserver la lisibilité

### 2. Tableau Users (`/admin/users`)

**Fichier** : `components/admin/users-table.tsx`

**Vue Desktop** :
- Table complète avec toutes les colonnes
- Actions : Edit, Delete, Permissions, Impersonate

**Vue Mobile** :
- Cards avec avatar utilisateur
- Checkbox de sélection
- Nom, email, rôle
- Badges de statut (Active, Verified, etc.)
- Boutons d'action (Edit, Delete)

**Fonctionnalités** :
- ✅ CSV Import/Export
- ✅ Bulk actions (delete, role change)
- ✅ Filtres et recherche
- ✅ Gestion des invitations pending

### 3. Tableau Companies (`/admin/companies`)

**Fichier** : `components/admin/companies-table.tsx`

**Vue Desktop** :
- Table avec colonnes : Name, SIRET, Location, Users, Status
- Actions dropdown

**Vue Mobile** :
- Cards avec icône Building
- Nom et email
- SIRET et localisation
- Badge de statut
- Compteur d'utilisateurs
- Boutons Edit/Delete

**Fonctionnalités** :
- ✅ CSV Import/Export
- ✅ Bulk status updates
- ✅ Recherche et filtres

### 4. Tableau Logs (`/admin/logs`)

**Fichier** : `app/(private)/admin/logs/logs-client.tsx`

**Vue Desktop** :
- Table avec : Date, Level, Category, Message, User, Resource, IP
- Bouton Eye pour voir les détails

**Vue Mobile** :
- Cards avec badges Level et Category
- Date formatée
- Message (line-clamp-2)
- User et IP en bas de carte
- Bouton Eye pour détails complets

**Fonctionnalités** :
- ✅ Filtres avancés (search, category, level, dates, amount)
- ✅ Dialog de détails complet
- ✅ Delete filtered logs

### 5. Tableau VAT Rates (`/admin/vat-rates`)

**Fichier** : `app/(private)/admin/vat-rates/vat-rates-table.tsx`

**Vue Desktop** :
- Table : Name, Country, Rate, Description, Default, Status, Actions

**Vue Mobile** :
- Cards avec icône MapPin
- Badge du pays
- Taux en grand (formaté en %)
- Description si présente
- Boutons Star (default) et Status toggle
- Menu actions (Edit, Delete)

**Fonctionnalités** :
- ✅ Toggle default rate
- ✅ Toggle active/inactive
- ✅ Edit et Delete

### 6. Tableau Payments (`/admin` → Payments tab)

**Fichier** : `components/admin/payments-table.tsx`

**Vue Desktop** :
- Table : Order Number, Origin, Amount, Method, Date

**Vue Mobile** :
- Cards avec icône CreditCard
- Order number et badge method
- Nom du client et email
- Montant en grand (couleur bronze)
- Date

**Fonctionnalités** :
- ✅ Affichage company ou user
- ✅ Formatage monétaire

### 7. Tableau Invoices (`/admin` → Invoices tab)

**Fichier** : `components/admin/invoices-table.tsx`

**Vue Desktop** :
- Table : N° Commande, Client, Montant, Statut, Date, Actions
- 3 boutons actions : Eye (détails), UserCog (edit user), Edit (order)

**Vue Mobile** :
- Cards avec icône FileText
- N° commande et badge statut
- Client et email
- Montant et date
- 3 boutons : Voir, User, Edit

**Fonctionnalités** :
- ✅ Filtres avancés (search, status, date range, amount range)
- ✅ Dialog détails avec user history
- ✅ Impersonate user
- ✅ Links vers edit user et order
- ✅ Card de filtres responsive

## Patterns de code utilisés

### 1. Dual-view structure

```tsx
{/* Desktop Table View */}
<div className="hidden md:block rounded-md border">
  <Table>
    {/* Table content */}
  </Table>
</div>

{/* Mobile Card View */}
<div className="md:hidden space-y-3">
  {items.map((item) => (
    <Card key={item.id} className="p-4">
      {/* Card content */}
    </Card>
  ))}
</div>
```

### 2. Responsive buttons

```tsx
<Button variant="outline" size="sm">
  <Icon className="h-4 w-4 mr-2" />
  <span className="hidden sm:inline">Full Text</span>
  <span className="sm:hidden">Short</span>
</Button>
```

### 3. Responsive grids

```tsx
<TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
  {/* Tabs */}
</TabsList>

<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Filters */}
</div>
```

### 4. Responsive dialogs

```tsx
<DialogContent className="max-w-2xl max-h-[80vh]">
  <DialogFooter className="gap-2 flex-col sm:flex-row">
    {/* Boutons empilés sur mobile, côte à côte sur desktop */}
  </DialogFooter>
</DialogContent>
```

## Guidelines pour futures implémentations

### 1. Toujours tester sur mobile

- Vérifier le débordement horizontal (overflow-x)
- S'assurer que tous les boutons sont cliquables (taille minimale 44x44px)
- Tester les dialogs et dropdowns

### 2. Prioriser l'information

Sur mobile, afficher :
- **Essentiels** : ID/Nom, Statut, Montant
- **Secondaires** : Dates, descriptions courtes
- **Tertiaires** : Via bouton "Voir plus" ou dialog

### 3. Utiliser les composants UI appropriés

- **Desktop** : Table avec colonnes
- **Mobile** : Cards avec flex layout
- **Tous** : Badges pour statuts, icônes pour contexte visuel

### 4. Gérer les longues chaînes

```tsx
{/* Truncate long text */}
<div className="truncate max-w-[200px]" title={fullText}>
  {fullText}
</div>

{/* Line clamp for multi-line */}
<div className="line-clamp-2">
  {longDescription}
</div>
```

### 5. Espacement cohérent

- Cards : `p-4` padding, `space-y-3` spacing
- Mobile cards container : `space-y-3`
- Borders : `border-t` pour séparer sections

## CSV Import/Export

Disponible sur :
- ✅ Users table
- ✅ Companies table

**Format documenté** : Voir [CSV_IMPORT_FORMAT.md](./CSV_IMPORT_FORMAT.md)

## Accessibilité

- ✅ Labels pour screen readers (`sr-only`)
- ✅ Tooltips sur icônes (attribut `title`)
- ✅ Contraste des couleurs conforme
- ✅ Navigation au clavier possible
- ✅ Focus visible sur éléments interactifs

## Tests recommandés

### Devices à tester
1. **Mobile** : iPhone SE (375px), iPhone 12 (390px)
2. **Tablet** : iPad (768px), iPad Pro (1024px)
3. **Desktop** : 1280px, 1920px

### Checklist par page
- [ ] Pas de scroll horizontal
- [ ] Tous les boutons accessibles
- [ ] Textes lisibles (pas trop petits)
- [ ] Dialogs s'affichent correctement
- [ ] Filtres fonctionnels
- [ ] Actions (edit, delete) opérationnelles

## Performance

- Utilisation de `hidden md:block` et `md:hidden` au lieu de `display: none` JavaScript
- Pas de duplication de données (même state pour desktop et mobile)
- Lazy loading des dialogs via trigger

## Maintenance

Pour ajouter une nouvelle colonne/field :
1. Ajouter dans la Table (desktop view)
2. Décider si essentiel pour mobile
3. Si oui, ajouter dans Card layout
4. Sinon, accessible via dialog/détails

## Notes importantes

- **Breakpoint md:** 768px (Tailwind default)
- **Couleur accent:** `#CD7F32` (bronze)
- **Icons:** Lucide React
- **UI Components:** Shadcn/ui

## Changelog

**2025-01-02**
- ✅ Rendu responsive : Users, Companies, Logs, VAT Rates, Payments, Invoices
- ✅ Ajout CSV import/export sur Users et Companies
- ✅ Amélioration TabsList admin dashboard (2 cols sur mobile)
- ✅ Documentation complète créée

