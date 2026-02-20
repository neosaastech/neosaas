# Règles de Design Responsive pour les Tableaux Admin

> **Dernière mise à jour :** 2 janvier 2026  
> **Auteur :** Système  
> **Objectif :** Établir des règles cohérentes pour rendre tous les tableaux de l'espace admin mobile-friendly

## 📋 Vue d'Ensemble

Tous les tableaux de l'interface d'administration doivent être **responsive** et offrir une expérience optimale sur desktop et mobile. Ce document définit les règles et bonnes pratiques à suivre.

---

## 🎯 Principes Fondamentaux

### 1. **Double Vue : Desktop + Mobile**

- **Desktop (≥768px)** : Affichage en tableau classique (`<Table>`)
- **Mobile (<768px)** : Affichage en cartes (`<Card>`)

### 2. **Breakpoint Tailwind**

Utiliser systématiquement le breakpoint `md:` (768px) :

```tsx
<div className="hidden md:block">
  {/* Vue tableau desktop */}
</div>

<div className="md:hidden">
  {/* Vue cartes mobile */}
</div>
```

### 3. **TabsList en Pleine Largeur**

Pour une meilleure UX, les onglets doivent occuper toute la largeur disponible :

```tsx
<TabsList className="grid w-full grid-cols-2">  {/* 2 onglets */}
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
</TabsList>

<TabsList className="grid w-full grid-cols-4">  {/* 4 onglets */}
  <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  <TabsTrigger value="tab4">Tab 4</TabsTrigger>
</TabsList>
```

**❌ Éviter :**
```tsx
<TabsList>  {/* width: fit-content - pas responsive */}
```

**✅ Recommandé :**
```tsx
<TabsList className="grid w-full grid-cols-N">  {/* N = nombre d'onglets */}
```

### 4. **Fonctionnalités Identiques**

Les deux vues (desktop/mobile) doivent offrir les **mêmes fonctionnalités** :
- ✅ Sélection multiple (checkboxes)
- ✅ Actions sur les lignes (supprimer, éditer, etc.)
- ✅ Filtrage et recherche
- ✅ Affichage des badges/statuts
- ✅ Export de données (CSV, XLS)

---

## 🏗️ Architecture Recommandée

### Option 1 : Composant Réutilisable `ResponsiveAdminTable`

Utiliser le composant générique situé dans :
```
components/admin/responsive-admin-table.tsx
```

**Avantages :**
- Code DRY (Don't Repeat Yourself)
- Maintenance centralisée
- API cohérente entre tous les tableaux

**Exemple d'utilisation :**

```tsx
import { ResponsiveAdminTable } from "@/components/admin/responsive-admin-table"

<ResponsiveAdminTable
  columns={[
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Statut' }
  ]}
  data={items}
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  renderCell={(item, column) => {
    if (column.key === 'status') {
      return <Badge>{item.status}</Badge>
    }
    return item[column.key]
  }}
  renderMobileCard={(item, isSelected, onToggleSelect) => (
    <Card>
      <CardHeader>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </CardHeader>
      <CardContent>
        <div>{item.name}</div>
        <div>{item.email}</div>
      </CardContent>
    </Card>
  )}
/>
```

### Option 2 : Implémentation Custom

Pour des tableaux avec logique métier complexe, implémenter manuellement en suivant le pattern :

```tsx
{/* Desktop Table */}
<div className="hidden md:block rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead><Checkbox /></TableHead>
        <TableHead>Colonne 1</TableHead>
        <TableHead>Colonne 2</TableHead>
        <TableHead className="w-12"></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id}>
          <TableCell><Checkbox /></TableCell>
          <TableCell>{item.col1}</TableCell>
          <TableCell>{item.col2}</TableCell>
          <TableCell>{/* Actions */}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

{/* Mobile Cards */}
<div className="md:hidden space-y-4">
  {items.map(item => (
    <Card key={item.id}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Checkbox />
          {/* Actions */}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Colonne 1: </span>
          <span className="font-medium">{item.col1}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Colonne 2: </span>
          <span className="font-medium">{item.col2}</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 🔧 Fonctionnalités Essentielles

### 1. Sélection Multiple

**Desktop :**
```tsx
<TableHead className="w-12">
  <Checkbox
    checked={data.length > 0 && selectedIds.size === data.length}
    onCheckedChange={toggleSelectAll}
  />
</TableHead>
```

**Mobile :**
```tsx
<CardHeader>
  <Checkbox
    checked={selectedIds.has(item.id)}
    onCheckedChange={() => toggleSelect(item.id)}
  />
</CardHeader>
```

### 2. Filtrage et Recherche

Toujours positionner les filtres **au-dessus** du tableau/cartes :

```tsx
<div className="flex flex-col md:flex-row gap-4 mb-4">
  {/* Barre de recherche */}
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
    <Input
      placeholder="Rechercher..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>
  
  {/* Filtre par statut */}
  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="w-full md:w-[180px]">
      <SelectValue placeholder="Filtrer par statut" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tous</SelectItem>
      <SelectItem value="active">Actif</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### 3. Import/Export de Données

**Tous les tableaux admin doivent offrir des fonctionnalités d'export :**

#### Export CSV
```tsx
const handleExportCSV = () => {
  const itemsToExport = selectedIds.size > 0 
    ? data.filter(item => selectedIds.has(item.id))
    : data

  const csvContent = [
    ["Column1", "Column2", "Column3"], // Headers
    ...itemsToExport.map(item => [
      item.field1,
      item.field2,
      item.field3
    ])
  ].map(row => row.join(",")).join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `export_${new Date().toISOString().split('T')[0]}.csv`
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

#### Export Excel (XLS)
```tsx
const handleExportXLS = () => {
  const itemsToExport = selectedIds.size > 0 
    ? data.filter(item => selectedIds.has(item.id))
    : data

  const tableContent = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Column1</th>
              <th>Column2</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToExport.map(item => `
              <tr>
                <td>${item.field1}</td>
                <td>${item.field2}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([tableContent], { type: "application/vnd.ms-excel" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = "export.xls"
  link.click()
}
```

#### Boutons d'Export
```tsx
<div className="flex gap-2">
  <Button 
    variant="outline" 
    size="sm" 
    onClick={handleExportCSV}
    disabled={data.length === 0}
  >
    <Download className="mr-2 h-4 w-4" />
    Export CSV
  </Button>
  
  <Button 
    variant="outline" 
    size="sm" 
    onClick={handleExportXLS}
    disabled={data.length === 0}
  >
    <FileDown className="mr-2 h-4 w-4" />
    Export XLS
  </Button>
</div>
```

**Position recommandée :** Barre d'actions au-dessus du tableau, à droite après les filtres.

### 4. Actions Groupées

Afficher les boutons d'action uniquement quand des éléments sont sélectionnés :

```tsx
{selectedIds.size > 0 && (
  <Button
    variant="destructive"
    size="sm"
    onClick={handleDeleteSelected}
    disabled={isDeleting}
  >
    {isDeleting ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <Trash2 className="mr-2 h-4 w-4" />
    )}
    Supprimer ({selectedIds.size})
  </Button>
)}
```

### 4. Actions Individuelles

**Desktop :** Dernière colonne du tableau
```tsx
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    className="h-8 w-8 p-0"
    onClick={() => handleAction(item.id)}
  >
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
</TableCell>
```

**Mobile :** En haut à droite de la carte
```tsx
<CardHeader className="pb-3">
  <div className="flex items-start justify-between">
    <Checkbox />
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</CardHeader>
```

---

## 📱 Optimisations Mobile

### 1. Espacement et Lisibilité

```tsx
<div className="md:hidden space-y-4">  {/* Espacement entre cartes */}
  <Card>
    <CardHeader className="pb-3">     {/* Réduire padding bottom */}
      {/* Contenu */}
    </CardHeader>
    <CardContent className="space-y-2 text-sm">  {/* Taille texte réduite */}
      {/* Contenu */}
    </CardContent>
  </Card>
</div>
```

### 2. Truncate et Overflow

Pour les textes longs (User Agent, descriptions, etc.) :

**Desktop :**
```tsx
<TableCell className="max-w-[300px] truncate text-xs" title={fullText}>
  {fullText}
</TableCell>
```

**Mobile :**
```tsx
<p className="text-xs text-muted-foreground break-all mt-1">
  {fullText}
</p>
```

### 3. Badges et Statuts

Garder la même apparence sur desktop et mobile :

```tsx
<Badge variant={status === 'accepted' ? 'default' : 'destructive'}>
  {status}
</Badge>
```

---

## 🎨 Classes Tailwind Communes

### Conteneurs
```tsx
className="hidden md:block"           // Desktop only
className="md:hidden"                 // Mobile only
className="rounded-md border"         // Bordure tableau
className="space-y-4"                 // Espacement cartes mobile
```

### Tableaux
```tsx
className="w-12"                      // Colonne checkbox
className="whitespace-nowrap"         // Éviter retour à la ligne
className="font-mono text-xs"         // Code/IP/IDs
className="max-w-[300px] truncate"    // Texte long
```

### Cartes Mobile
```tsx
className="pb-3"                      // CardHeader padding
className="space-y-2 text-sm"         // CardContent
className="text-muted-foreground"     // Labels
className="font-medium"               // Valeurs
className="break-all"                 // Long texte (URLs, etc.)
```

### Boutons
```tsx
className="h-8 w-8 p-0"              // Bouton icône
className="flex items-center gap-2"   // Bouton avec icône + texte
```

---

## ✅ Checklist d'Implémentation

Avant de finaliser un tableau admin, vérifier :

- [ ] Vue desktop (`hidden md:block`) avec `<Table>`
- [ ] Vue mobile (`md:hidden`) avec `<Card>`
- [ ] Sélection multiple fonctionnelle sur les deux vues
- [ ] Actions individuelles accessibles sur les deux vues
- [ ] Filtrage/recherche visible et fonctionnel
- [ ] **Export CSV/XLS implémenté**
- [ ] Message d'état vide cohérent
- [ ] Badges/statuts identiques sur les deux vues
- [ ] Textes longs gérés (truncate desktop, break-all mobile)
- [ ] Loading states avec `<Loader2>`
- [ ] Confirmation avant suppression (si pertinent)
- [ ] **TabsList en pleine largeur** (`grid w-full grid-cols-X`)

---

## 📚 Exemples de Référence

### Tableaux Conformes

1. **Products Table** : [app/(private)/admin/products/products-table.tsx](../app/(private)/admin/products/products-table.tsx)
   - ✅ Vue desktop/mobile
   - ✅ Sélection multiple
   - ✅ Filtrage par devise
   - ✅ Actions groupées
   - ✅ Export CSV

2. **Legal/Consents Table** : [app/(private)/admin/legal/legal-management.tsx](../app/(private)/admin/legal/legal-management.tsx)
   - ✅ Vue desktop/mobile
   - ✅ Recherche et filtres
   - ✅ Suppression individuelle et groupée
   - ✅ Export CSV
   - ✅ TabsList pleine largeur

3. **Users Table** : [components/admin/users-table.tsx](../components/admin/users-table.tsx)
   - ✅ Sélection multiple
   - ✅ Actions groupées
   - ✅ Export CSV, XLS, et PDF
   - ✅ Filtrage et recherche
   - **Référence pour import/export**

4. **Organization Page** : [app/(private)/admin/users/page.tsx](../app/(private)/admin/users/page.tsx)
   - ✅ TabsList pleine largeur (`grid w-full grid-cols-2`)
   - ✅ Design UX optimisé
   - **Référence pour structure de page**

5. **Composant Générique** : [components/admin/responsive-admin-table.tsx](../components/admin/responsive-admin-table.tsx)
   - ✅ Réutilisable
   - ✅ Type-safe avec TypeScript
   - ✅ Props flexibles
   - ✅ Rendering personnalisable

---

## 🚀 Migration de Tableaux Existants

Pour mettre à jour un tableau non-responsive :

### 1. Identifier les colonnes essentielles

```tsx
// Desktop : toutes les colonnes
// Mobile : seulement les plus importantes
```

### 2. Wrapper le tableau existant

```tsx
<div className="hidden md:block">
  {/* Tableau existant */}
</div>
```

### 3. Créer la vue mobile

```tsx
<div className="md:hidden space-y-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Adapter les données */}
    </Card>
  ))}
</div>
```

### 4. Synchroniser les états

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

// Utiliser le même state pour desktop et mobile
```

---

## 📞 Support et Questions

Pour toute question sur l'implémentation :
- Consulter les exemples de référence ci-dessus
- Utiliser le composant `ResponsiveAdminTable` pour les cas simples
- Adapter le pattern pour les cas complexes

**Note :** Ce document sera mis à jour au fur et à mesure des évolutions du design system.
