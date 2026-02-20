# Corrections du Système de Thème - Guide Complet

## 🆕 Dernière Mise à Jour : 15 janvier 2026

### Toggle Mode Clair/Sombre - Correction Complète

**Problèmes résolus :**

1. **ThemeToggle dysfonctionnel**
   - ❌ Avant : Bouton sans `relative` + utilisait `theme` au lieu de `resolvedTheme`
   - ✅ Après : `relative` ajouté + `resolvedTheme` pour détection précise + gestion hydratation SSR

2. **DynamicThemeProvider écrasait le choix utilisateur**
   - ❌ Avant : L'useEffect se ré-exécutait à chaque rendu, réinitialisant le thème
   - ✅ Après : `useRef` pour exécution unique + respect de `localStorage`

**Fichiers modifiés :**
- `components/common/theme-toggle.tsx`
- `components/common/dynamic-theme-provider.tsx`

---

##  Problèmes Corrigés (Historique)

### 1. Mode Sombre Non Fonctionnel
**Problème** : Le système ne détectait pas correctement les changements entre mode clair et sombre.

**Solution** : Le `DynamicThemeProvider` utilise maintenant le hook `useTheme` de `next-themes` pour écouter les changements de thème en temps réel.

### 2. Couleurs Hardcodées dans les Boutons
**Problème** : Certains boutons utilisaient des couleurs en dur (ex: `bg-[#CD7F32]`) au lieu des variables CSS du thème.

**Solution** : Ajout de variantes de boutons qui utilisent les variables CSS :
- `variant="brand"`  Couleur verte Neomnia
- `variant="brand-orange"`  Couleur orange Neomnia
- `variant="brand-magenta"`  Couleur magenta Neomnia
- `variant="brand-navy"`  Couleur navy Neomnia

### 3. Variables CSS Non Accessibles à Tailwind
**Problème** : Les couleurs de marque (`--neomnia-*`) n'étaient pas configurées dans Tailwind.

**Solution** : Ajout des couleurs dans `tailwind.config.ts` sous le namespace `neomnia`.

---

##  Comment Utiliser le Système de Thème

### Modification des Couleurs dans l'Admin

1. Accédez à `/admin/settings/theme`
2. Utilisez les onglets "Mode Clair" et "Mode Sombre" pour configurer les palettes
3. Chaque couleur peut être modifiée via :
   - Un color picker visuel
   - Une valeur HSL textuelle (ex: `180 50% 50%`)
4. Cliquez sur "Enregistrer" pour appliquer les changements
5. La page se rechargera automatiquement pour afficher le nouveau thème

### Utilisation des Couleurs dans le Code

#### Option 1 : Classes Tailwind (Recommandé)

```tsx
// Utiliser les couleurs de marque via Tailwind
<div className="bg-neomnia-green text-white">
  Fond vert Neomnia
</div>

<div className="bg-neomnia-orange hover:opacity-90">
  Fond orange avec effet hover
</div>

// Couleurs système personnalisables
<div className="bg-primary text-primary-foreground">
  Utilise la couleur primaire du thème
</div>
```

#### Option 2 : Variables CSS directes

```tsx
// Pour des cas spécifiques
<div style={{ backgroundColor: 'var(--neomnia-green)' }}>
  Utilisation directe
</div>
```

#### Option 3 : Variantes de boutons

```tsx
import { Button } from '@/components/ui/button'

// Bouton avec couleur de marque
<Button variant="brand">
  Action Principale
</Button>

<Button variant="brand-orange">
  Action Orange
</Button>

<Button variant="brand-magenta">
  Action Magenta
</Button>

<Button variant="brand-navy">
  Action Navy
</Button>

// Les boutons standards restent disponibles
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
```

---

##  Couleurs Disponibles

### Couleurs de Marque (Non Personnalisables via Admin)

Ces couleurs sont définies dans `app/globals.css` et sont fixes :

```css
--neomnia-green: #32afb1
--neomnia-green-hover: #2a9b9d
--neomnia-black: #262626
--neomnia-white: #ffffff
--neomnia-gray-dark: #4a4a4a
--neomnia-gray-light: #d8d8d8
--neomnia-orange: #ff6b35
--neomnia-magenta: #e91e63
--neomnia-navy: #1a365d
```

**Accès via Tailwind** :
- `bg-neomnia-green`, `text-neomnia-green`
- `bg-neomnia-orange`, `text-neomnia-orange`
- `bg-neomnia-magenta`, `text-neomnia-magenta`
- `bg-neomnia-navy`, `text-neomnia-navy`
- Etc.

### Couleurs Système (Personnalisables via Admin)

Ces couleurs peuvent être modifiées dans l'admin et s'adaptent au mode clair/sombre :

- `primary` / `primary-foreground`
- `secondary` / `secondary-foreground`
- `accent` / `accent-foreground`
- `background` / `foreground`
- `card` / `card-foreground`
- `muted` / `muted-foreground`
- `destructive` / `destructive-foreground`
- `border`, `input`, `ring`
- `success`, `warning`, `info`

**Accès via Tailwind** :
- `bg-primary`, `text-primary`
- `bg-secondary`, `text-secondary-foreground`
- Etc.

---

##  Fonctionnement du Mode Sombre

Le système gère automatiquement trois modes :

1. **Light** : Force le mode clair
2. **Dark** : Force le mode sombre
3. **Auto** : Suit la préférence système de l'utilisateur

### Configuration du Mode

Dans le panneau admin :
```tsx
<Select value={theme.mode}>
  <SelectItem value="light">Clair</SelectItem>
  <SelectItem value="dark">Sombre</SelectItem>
  <SelectItem value="auto">Automatique</SelectItem>
</Select>
```

### Application Automatique

Le `DynamicThemeProvider` :
1. Détecte le mode actif
2. Applique la palette appropriée (light ou dark)
3. Ajoute/retire la classe `dark` sur `<html>`
4. Met à jour toutes les variables CSS en temps réel

---

##  Migration des Boutons Existants

### Avant (Couleurs Hardcodées)

```tsx
//  À éviter
<button className="bg-[#CD7F32] hover:bg-[#B26B27] text-white">
  Get Started
</button>
```

### Après (Utilisation du Système)

```tsx
//  Recommandé
import { Button } from '@/components/ui/button'

<Button variant="brand" size="lg">
  Get Started
</Button>

// Ou si vous avez besoin d'orange spécifiquement
<Button variant="brand-orange" size="lg">
  Get Started
</Button>
```

---

##  Dépannage

### Le mode sombre ne s'applique pas

1. Vérifiez que le `ThemeProvider` est bien dans le layout
2. Assurez-vous que `DynamicThemeProvider` est un enfant de `ThemeProvider`
3. Vérifiez la console pour des erreurs JavaScript

### Les couleurs ne changent pas après modification

1. Cliquez sur "Enregistrer" dans l'admin
2. Attendez le rechargement automatique de la page
3. Si nécessaire, videz le cache du navigateur (Ctrl+Shift+R)

### Les classes Tailwind `neomnia-*` ne fonctionnent pas

1. Vérifiez que `tailwind.config.ts` contient la configuration `neomnia`
2. Redémarrez le serveur de développement (`npm run dev`)
3. Si besoin, supprimez `.next` et relancez

---

##  Architecture Technique

### Flux des Couleurs

```
DB (platformConfig) 
   getThemeConfig() 
   Layout (SSR)
   <style> inline CSS variables
   DynamicThemeProvider (CSR)
   Variables CSS dynamiques
   Tailwind utilise ces variables
   Components
```

### Fichiers Modifiés

1. **tailwind.config.ts** - Ajout des couleurs `neomnia.*`
2. **components/common/dynamic-theme-provider.tsx** - Écoute des changements de thème
3. **components/ui/button.tsx** - Nouvelles variantes `brand-*`
4. **app/globals.css** - Définition des couleurs de base (existant)

---

##  Bonnes Pratiques

1. **Toujours utiliser les variantes de boutons** au lieu de classes personnalisées
2. **Privilégier les couleurs système** (`primary`, `accent`) pour la cohérence
3. **Tester en mode clair ET sombre** avant de valider
4. **Documenter** les choix de couleurs spécifiques dans les commentaires
