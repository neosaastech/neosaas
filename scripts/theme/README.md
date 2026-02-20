# Scripts de Gestion du Thème

## Scripts Disponibles

### 1. Initialiser le Thème par Défaut

Initialise le thème par défaut dans la base de données (optionnel).

```bash
npm run init-theme
# ou
tsx scripts/init-theme.ts
```

Ce script :
- Vérifie si un thème existe déjà
- Insère le thème par défaut si aucun thème n'existe
- Ne remplace PAS un thème existant

### 2. Réinitialiser le Thème

Pour réinitialiser le thème, utilisez l'interface admin :
1. Admin > Settings > Styles
2. Cliquez sur "Réinitialiser"

Ou via code :

```typescript
import { resetThemeConfig } from '@/app/actions/theme-config'

await resetThemeConfig()
```

## Notes

- Le système fonctionne sans ces scripts (thème par défaut en fallback)
- Les scripts sont fournis pour faciliter la configuration initiale
- Utilisez l'interface admin pour toute modification ultérieure
