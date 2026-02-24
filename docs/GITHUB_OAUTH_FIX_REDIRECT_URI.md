# GitHub OAuth - Fix Redirect URI (Action Immédiate)

**Date**: 2026-01-23  
**Client ID**: `Ov23licqdRXt8oc0sqqQ`  
**Erreur**: "The redirect_uri is not associated with this application"

---

## ✅ Solution Rapide (5 minutes)

### Étape 1 : Vérifier GitHub

1. Allez sur : https://github.com/settings/developers
2. Trouvez l'OAuth App avec le Client ID `Ov23licqdRXt8oc0sqqQ`
3. Notez **exactement** l'"Authorization callback URL" configurée

**Doit être** : `https://www.neosaas.tech/api/auth/oauth/github/callback`

Si ce n'est pas le cas :
- Cliquez sur "Update application"
- Modifiez l'"Authorization callback URL" pour mettre : `https://www.neosaas.tech/api/auth/oauth/github/callback`
- Sauvegardez

### Étape 2 : Vérifier la base de données

1. Allez sur : https://www.neosaas.tech/admin/api
2. Connectez-vous en tant qu'admin
3. Section "GitHub OAuth Configuration"
4. Remplissez **exactement** :

```
Client ID: Ov23licqdRXt8oc0sqqQ
Client Secret: 1899059a069decd1f582d05b3aac7159773c638b
Callback URL: https://www.neosaas.tech/api/auth/oauth/github/callback
```

**⚠️ IMPORTANT** : Le "Callback URL" doit être l'URL **COMPLÈTE**, pas juste le chemin.

- ❌ Incorrect : `/api/auth/oauth/github/callback`
- ✅ Correct : `https://www.neosaas.tech/api/auth/oauth/github/callback`

### Étape 3 : Vérifier les variables Vercel

1. Allez sur : https://vercel.com/neosaastech/neosaas-website/settings/environment-variables
2. Vérifiez que `NEXT_PUBLIC_APP_URL` existe et vaut : `https://www.neosaas.tech`

Si elle n'existe pas :
- Cliquez "Add New"
- Name: `NEXT_PUBLIC_APP_URL`
- Value: `https://www.neosaas.tech`
- Environnement: Production
- Sauvegardez et redéployez

### Étape 4 : Test

1. Ouvrez un navigateur en **mode incognito**
2. Allez sur : https://www.neosaas.tech/auth/login
3. Cliquez sur "Se connecter avec GitHub"
4. Vous devriez être redirigé vers GitHub sans erreur

---

## 🔍 Si ça ne fonctionne toujours pas

### Vérifier l'URL réellement envoyée

1. Allez sur : https://vercel.com/neosaastech/neosaas-website/logs
2. Recherchez `[GitHub OAuth]`
3. Trouvez la ligne `Callback URL (redirect_uri):`
4. Comparez avec l'URL configurée sur GitHub

### Exemple de log correct :

```
✅ [GitHub OAuth] Redirection vers GitHub
   - Client ID: Ov23licqdR...
   - Callback URL (redirect_uri): https://www.neosaas.tech/api/auth/oauth/github/callback
```

Si l'URL est différente (ex: `https://neosaas-website-xxx.vercel.app/...`), c'est que la configuration en base de données n'est pas correcte.

---

## 🚨 Problème probable

Votre callback URL en base de données est probablement :
- Soit **relative** : `/api/auth/oauth/github/callback`
- Soit sur un **autre domaine** : `https://neosaas-website-preview.vercel.app/...`

### Solution

Forcez l'URL complète dans `/admin/api` :

1. Connectez-vous à `/admin/api`
2. Dans "Callback URL", mettez l'URL **ABSOLUE** : `https://www.neosaas.tech/api/auth/oauth/github/callback`
3. Sauvegardez
4. Retestez

---

## ✅ Checklist de validation

- [ ] GitHub OAuth App callback URL = `https://www.neosaas.tech/api/auth/oauth/github/callback`
- [ ] Base de données callback URL = `https://www.neosaas.tech/api/auth/oauth/github/callback`
- [ ] Vercel `NEXT_PUBLIC_APP_URL` = `https://www.neosaas.tech`
- [ ] Les 3 URLs sont **exactement identiques** (pas de différence de www, slash, http/https)
- [ ] Test en mode incognito réussi

---

## 📞 Besoin d'aide ?

Si après ces étapes le problème persiste, consultez le guide complet :
[`docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md`](./GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md)
