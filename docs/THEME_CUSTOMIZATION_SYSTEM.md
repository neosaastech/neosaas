# Système de Personnalisation de Thème

## 📋 Vue d'ensemble

Le système de personnalisation de thème permet aux administrateurs de configurer entièrement l'apparence du site via l'interface admin, sans modification de code. Il utilise les **variables CSS** pour appliquer dynamiquement les couleurs et styles sur l'ensemble du site.

## 🎯 Fonctionnalités

### 1. Configuration des Couleurs
- **Mode clair** : Palette complète pour le thème lumineux
- **Mode sombre** : Palette complète pour le thème sombre
- **Couleurs principales** :
  - Primary/Secondary/Accent
  - Background/Foreground
  - Success/Warning/Error/Info
  - Border/Input/Ring
  - Muted/Destructive

### 2. Modes d'affichage
- **Clair** : Force le mode clair
- **Sombre** : Force le mode sombre
- **Automatique** : S'adapte aux préférences système de l'utilisateur

### 3. Prévisualisation en temps réel
- Aperçu des couleurs configurées
- Color picker intégré avec conversion HSL
- Saisie manuelle des valeurs HSL

## 🏗️ Architecture

### Structure des fichiers

```
types/
  theme-config.ts         # Types TypeScript pour la configuration du thème

app/
  actions/
    theme-config.ts       # Actions serveur pour gérer le thème
  layout.tsx              # Intégration du thème dans le layout principal

components/
  admin/
    theme-settings.tsx    # Interface admin de configuration
  common/
    dynamic-theme-provider.tsx  # Provider pour appliquer les styles

db/
  schema.ts               # Stockage dans platform_config
```

### Schéma de données

Les configurations de thème sont stockées dans la table `platform_config` avec la clé `theme_config` :

```typescript
{
  name: string
  mode: 'light' | 'dark' | 'auto'
  light: ColorPalette    // Couleurs pour le mode clair
  dark: ColorPalette     // Couleurs pour le mode sombre
  typography: TypographyConfig
  spacing: SpacingConfig
  createdAt?: Date
  updatedAt?: Date
}
```

## 💻 Utilisation

### Depuis l'interface Admin

1. Accédez à **Admin > Settings**
2. Cliquez sur l'onglet **Styles**
3. Configurez :
   - Le mode d'affichage (Clair/Sombre/Auto)
   - Les couleurs pour chaque mode
4. Cliquez sur **Enregistrer**
5. Le site se rechargera automatiquement avec les nouveaux styles

### Programmatiquement

#### Récupérer la configuration actuelle

```typescript
import { getThemeConfig } from '@/app/actions/theme-config'

const theme = await getThemeConfig()
```

#### Mettre à jour le thème

```typescript
import { updateThemeConfig } from '@/app/actions/theme-config'

const result = await updateThemeConfig({
  name: 'Mon Thème',
  mode: 'light',
  light: { /* ... */ },
  dark: { /* ... */ },
  typography: { /* ... */ },
  spacing: { /* ... */ },
})
```

#### Réinitialiser aux valeurs par défaut

```typescript
import { resetThemeConfig } from '@/app/actions/theme-config'

const result = await resetThemeConfig()
```

#### Mettre à jour uniquement les couleurs

```typescript
import { updateThemeColors } from '@/app/actions/theme-config'

const result = await updateThemeColors('light', {
  primary: '220 50% 50%',
  secondary: '200 40% 60%',
})
```

## 🎨 Variables CSS disponibles

### Couleurs

```css
--primary
--primary-foreground
--secondary
--secondary-foreground
--accent
--accent-foreground
--background
--foreground
--card
--card-foreground
--border
--input
--ring
--muted
--muted-foreground
--destructive
--destructive-foreground
--success
--warning
--info
```

### Typographie

```css
--font-family
--font-family-heading
--font-family-mono
--font-size-xs
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl
--font-size-2xl
--font-size-3xl
--font-size-4xl
--font-weight-light
--font-weight-normal
--font-weight-medium
--font-weight-semibold
--font-weight-bold
--line-height-tight
--line-height-normal
--line-height-relaxed
```

### Espacement

```css
--radius-none
--radius-sm
--radius-md
--radius-lg
--radius-xl
--radius-full
--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg
--spacing-xl
--spacing-2xl
```

## 📐 Format des couleurs

Les couleurs utilisent le format **HSL** (Hue, Saturation, Lightness) pour une meilleure compatibilité avec Tailwind CSS et shadcn/ui :

```
Format : "H S% L%"
Exemple : "220 50% 50%" pour un bleu moyen
```

### Conversion HSL ↔ HEX

Le composant `ThemeSettings` inclut des fonctions de conversion automatique :
- Color picker (HEX) → Valeur HSL
- Saisie manuelle HSL possible

## 🔄 Fonctionnement

1. **Chargement initial** :
   - Le layout principal charge la configuration du thème depuis la base de données
   - Les variables CSS sont générées et injectées dans le `<head>`

2. **Application côté client** :
   - Le `DynamicThemeProvider` applique les variables CSS sur le `document.documentElement`
   - Les composants utilisent ces variables via Tailwind

3. **Mise à jour** :
   - Les modifications depuis l'admin sont sauvegardées dans `platform_config`
   - Un rechargement de la page applique les nouveaux styles

## 🎯 Bonnes pratiques

### Pour les développeurs

1. **Utiliser les variables CSS** :
   ```css
   /* ✅ Bon */
   background: hsl(var(--primary));
   color: hsl(var(--primary-foreground));
   
   /* ❌ À éviter */
   background: #CD7F32;
   ```

2. **Utiliser les classes Tailwind** :
   ```tsx
   {/* ✅ Bon */}
   <Button className="bg-primary text-primary-foreground">
   
   {/* ❌ À éviter */}
   <Button className="bg-[#CD7F32]">
   ```

3. **Respecter les paires de couleurs** :
   - `primary` avec `primary-foreground`
   - `secondary` avec `secondary-foreground`
   - `destructive` avec `destructive-foreground`

### Pour les administrateurs

1. **Contraste** : Assurez-vous d'un bon contraste entre les couleurs de fond et de texte
2. **Cohérence** : Maintenez une harmonie entre les modes clair et sombre
3. **Test** : Testez les deux modes après chaque modification

## 🔧 Maintenance

### Ajouter une nouvelle couleur

1. Ajouter à `ColorPalette` dans [types/theme-config.ts](vscode-vfs://github%2B7b2276223a312c22726566223a7b2274797065223a342c226964223a22636f6e74656e74227d7d/neosaastech/neosaas-website/types/theme-config.ts)
2. Ajouter aux thèmes par défaut `light` et `dark`
3. Ajouter dans `ThemeSettings` pour l'interface admin
4. La variable CSS sera automatiquement générée

### Modifier le thème par défaut

Éditez [types/theme-config.ts](vscode-vfs://github%2B7b2276223a312c22726566223a7b2274797065223a342c226964223a22636f6e74656e74227d7d/neosaastech/neosaas-website/types/theme-config.ts) :

```typescript
export const defaultTheme: ThemeConfig = {
  // Modifier ici
}
```

## 📊 Stockage

Les données sont stockées dans `platform_config` :

| Clé | Valeur | Type |
|-----|--------|------|
| `theme_config` | Configuration complète JSON | text |

## 🚀 Déploiement

Aucune migration de base de données n'est nécessaire car le système utilise la table `platform_config` existante.

## 🐛 Dépannage

### Les couleurs ne s'appliquent pas

1. Vérifiez que la configuration est bien sauvegardée dans la base de données
2. Rechargez complètement la page (Ctrl+Shift+R)
3. Vérifiez la console pour des erreurs JavaScript

### Les valeurs HSL ne fonctionnent pas

1. Format attendu : `"H S% L%"` (ex: `"220 50% 50%"`)
2. Pas d'unités pour H (hue)
3. % requis pour S et L

### Le mode automatique ne fonctionne pas

1. Vérifiez que JavaScript est activé
2. Le mode automatique utilise `prefers-color-scheme`
3. Testez en changeant les préférences système

## 📝 Exemples

### Thème personnalisé complet

```typescript
const customTheme: ThemeConfig = {
  name: 'Corporate Blue',
  mode: 'light',
  light: {
    primary: '220 90% 56%',           // Bleu vif
    primaryForeground: '0 0% 100%',   // Blanc
    secondary: '210 40% 96%',         // Gris clair
    secondaryForeground: '222 47% 11%',
    // ... autres couleurs
  },
  dark: {
    // Configuration pour le mode sombre
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontFamilyHeading: 'Inter, sans-serif',
    // ... autres options
  },
  spacing: {
    borderRadius: {
      md: '0.5rem',
      // ... autres valeurs
    },
    spacing: {
      md: '1rem',
      // ... autres valeurs
    },
  },
}
```

## 🔗 Ressources

- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [HSL Color Picker](https://hslpicker.com/)
- [Coolors - Palette Generator](https://coolors.co/)
