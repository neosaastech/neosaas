# GitHub OAuth - Configuration Automatique (v2.0 BDD)

> ⚠️ **OBSOLÈTE - Ce document décrit la v2.0 (archivé le 2026-01-23)**
>
> **➡️ Voir [Architecture v3.0](./GITHUB_OAUTH_ARCHITECTURE_V3.md) pour la version actuelle**
>
> ### Changements en v3.0 :
> - 🔐 **Cryptage AES-256-GCM unifié** pour tous les credentials
> - 📊 **Logging complet** dans `service_api_usage`
> - ✅ **Support multi-format** Client ID (Iv1., Ov1, Ov2, Ov23)
> - 🎨 **UX améliorée** avec toasts, spinners, messages d'erreur clairs
> - 🔄 **Architecture unifiée** via `serviceApiRepository`
>
> **[Guide de migration v2.0 → v3.0](./GITHUB_OAUTH_ARCHITECTURE_V3.md#migration-from-v20)**

---

## ✨ Résumé (v2.0 - Archivé)

Configuration GitHub OAuth **en un clic** via `/admin/api` - stockage en BDD, aucune variable Vercel requise.

## 🎯 Ce qui a changé (v2.0)

| Avant (v1.0) | Maintenant (v2.0) |
|--------------|-------------------|
| ❌ Nécessitait `VERCEL_PROJECT_ID` | ✅ Aucune variable Vercel requise |
| ❌ Nécessitait `VERCEL_API_TOKEN` | ✅ Stockage direct en BDD |
| ❌ Configuration manuelle complexe | ✅ Un seul champ : GitHub PAT |
| ❌ Système séparé des autres services | ✅ Cohérent avec Stripe/PayPal |

## 📝 Étapes d'utilisation

### 1. Créer un GitHub PAT

1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. **Permissions requises** :
   - ✅ `admin:org` (ou `write:org`)
   - ✅ `user:email`
4. Copier le token (commence par `ghp_...`)

### 2. Configurer dans l'admin

1. Aller sur `/admin/api`
2. Cliquer "Modifier" pour GitHub
3. Coller le PAT
4. Cliquer "Enregistrer"

### 3. Processus automatique

Le système :
1. Valide le PAT
2. Crée une OAuth App sur GitHub
3. Stocke les credentials en BDD (chiffré AES-256-GCM)

✅ **C'est tout !**

## 🗂️ Stockage

**Table** : `service_api_configs`

```sql
serviceName: "github"
serviceType: "oauth"
config: {
  clientId: "...",     -- Chiffré
  clientSecret: "..."  -- Chiffré
}
```

Même système que Stripe, PayPal, etc.

## 🔧 Architecture technique

### Fichiers modifiés

1. **[app/api/admin/configure-github-oauth/route.ts](../app/api/admin/configure-github-oauth/route.ts)**
   - ✅ Stockage en BDD
   - ❌ Plus de logique Vercel
   
2. **[app/(private)/admin/api/page.tsx](../app/(private)/admin/api/page.tsx)**
   - Interface simplifiée
   - Un seul champ : GitHub PAT

3. **[db/schema.ts](../db/schema.ts)**
   - Table `service_api_configs` existante utilisée

## 📊 Endpoints API

### POST `/api/admin/configure-github-oauth`

**Request:**
```json
{
  "githubPat": "ghp_..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration GitHub OAuth terminée avec succès..."
}
```

### GET `/api/admin/configure-github-oauth`

**Response:**
```json
{
  "success": true,
  "details": {
    "isActive": true,
    "lastTested": "2026-01-21T14:30:00Z",
    "metadata": {...}
  }
}
```

## 🐛 Debugging

### Logs à vérifier

```
📥 [GitHub OAuth Config] Requête reçue
✅ [GitHub OAuth Config] Auth successful
🔑 ÉTAPE 1 - Validation du PAT GitHub...
✅ PAT valide - utilisateur: username
🔧 ÉTAPE 2 - Création de l'OAuth App GitHub...
✅ OAuth App créée avec succès
💾 ÉTAPE 3 - Stockage en BDD...
✅ Configuration stockée en BDD avec succès
🎉 Configuration terminée avec succès !
```

### Erreurs courantes

| Log | Cause | Solution |
|-----|-------|----------|
| `PAT invalide` | Token expiré | Nouveau PAT |
| `Permissions insuffisantes` | Scopes manquants | Ajouter `admin:org` |
| `Stockage BDD échoué` | Connexion DB | Vérifier `DATABASE_URL` |

## 🔒 Sécurité

- **Chiffrement** : AES-256-GCM
- **Clé** : Variable `ENCRYPTION_KEY`
- **Stockage** : PostgreSQL (Neon)
- **Auth** : Admin uniquement

## ❓ FAQ

**Q : Puis-je supprimer les variables `VERCEL_PROJECT_ID` et `VERCEL_API_TOKEN` ?**  
R : Oui ! Elles ne sont plus utilisées.

**Q : Les credentials GitHub existants dans `.env` fonctionnent-ils encore ?**  
R : Oui, mais la BDD a la priorité.

**Q : Comment voir les credentials stockés ?**  
R : 
```sql
SELECT * FROM service_api_configs 
WHERE service_name = 'github';
```

**Q : Le PAT GitHub doit-il rester actif ?**  
R : Non. Après création de l'OAuth App, le PAT n'est plus nécessaire.

**Q : Puis-je avoir plusieurs configs (dev/prod) ?**  
R : Oui, utilisez le champ `environment`.

## 📦 Variables d'environnement

### Requises
```env
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=your-secret-key
```

### Optionnelles
```env
GITHUB_ORG=NEOMIA              # Défaut: "NEOMIA"
NEXT_PUBLIC_APP_URL=https://... # Défaut: auto-détecté
```

## 🚀 Actions manuelles requises

### Après déploiement

1. **Supprimer route.ts et renommer route-fixed.ts** :
   ```bash
   rm app/api/admin/configure-github-oauth/route.ts
   mv app/api/admin/configure-github-oauth/route-fixed.ts route.ts
   rm app/api/admin/configure-github-oauth/route-new.ts
   rm app/api/admin/configure-github-oauth/route.ts.backup
   ```

2. **Redémarrer l'app** pour charger le nouveau code

3. **Tester** via `/admin/api`

## 📚 Ressources

- [GitHub PAT Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [Drizzle ORM](https://orm.drizzle.team/)

---

**Version** : 2.0 (Stockage BDD)  
**Date** : 21 janvier 2026  
**Auteur** : GitHub Copilot
