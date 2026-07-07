# 🚨 ACTIONS REQUISES - GitHub OAuth v2.0

## ✅ Fichiers créés

- ✅ `route-fixed.ts` - Nouvelle version (BDD, pas de Vercel)
- ✅ `GITHUB_OAUTH_V2_BDD.md` - Documentation v2.0

## 🔴 Actions manuelles à faire MAINTENANT

### 1. Remplacer le fichier route.ts

```bash
# Supprimer l'ancien fichier
rm app/api/admin/configure-github-oauth/route.ts

# Renommer le nouveau
mv app/api/admin/configure-github-oauth/route-fixed.ts \
   app/api/admin/configure-github-oauth/route.ts

# Nettoyer les fichiers temporaires
rm app/api/admin/configure-github-oauth/route-new.ts
rm app/api/admin/configure-github-oauth/route.ts.backup
```

### 2. Vérifier le fichier

```bash
# Vérifier que le fichier commence par:
head -5 app/api/admin/configure-github-oauth/route.ts
```

**Doit afficher:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";
import { db } from "@/db";
import { serviceApiConfigs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
```

### 3. Redémarrer l'application

```bash
# Development
pnpm dev

# OU Production (Vercel)
# Commit + Push → Auto-deploy
```

### 4. Tester

1. Aller sur `/admin/api`
2. Cliquer "Modifier" pour GitHub
3. Coller un GitHub PAT
4. Cliquer "Enregistrer"
5. Vérifier les logs console

**Logs attendus:**
```
📥 [GitHub OAuth Config] Requête reçue
✅ [GitHub OAuth Config] Auth successful
📝 [GitHub OAuth Config] GitHub PAT reçu: ghp_xxx...
🌐 [GitHub OAuth Config] Configuration: {siteUrl, callbackUrl}
🔑 ÉTAPE 1 - Validation du PAT GitHub...
✅ PAT valide - utilisateur: username
🔧 ÉTAPE 2 - Création de l'OAuth App GitHub...
✅ OAuth App créée avec succès
💾 ÉTAPE 3 - Stockage en BDD...
✅ Configuration stockée en BDD avec succès
🎉 Configuration terminée avec succès !
```

## ❌ Ce qui NE doit PLUS apparaître

```
❌ Variables Vercel manquantes
❌ VERCEL_PROJECT_ID
❌ VERCEL_API_TOKEN
❌ Configuration Vercel manquante
```

## 📋 Checklist

- [ ] `route.ts` remplacé par `route-fixed.ts`
- [ ] Fichiers temporaires supprimés  
- [ ] Application redémarrée
- [ ] Test réussi via `/admin/api`
- [ ] Logs montrent "Stockage en BDD"
- [ ] Aucune référence à Vercel dans les logs

## 📚 Documentation

- **Guide utilisateur**: [GITHUB_OAUTH_V2_BDD.md](./GITHUB_OAUTH_V2_BDD.md)
- **Ancienne doc** : [GITHUB_OAUTH_AUTO_CONFIG.md](./GITHUB_OAUTH_AUTO_CONFIG.md) (deprecated)

## 🆘 Si ça ne fonctionne pas

1. Vérifier que `route.ts` contient bien `import { db } from "@/db"`
2. Vérifier `DATABASE_URL` est configuré
3. Vérifier `ENCRYPTION_KEY` est configuré  
4. Vérifier que le PAT GitHub a les bonnes permissions (`admin:org`)
5. Regarder les logs complets dans la console

---

**Date**: 21 janvier 2026  
**Version**: 2.0 (Stockage BDD)  
**Migration**: Vercel → BDD
