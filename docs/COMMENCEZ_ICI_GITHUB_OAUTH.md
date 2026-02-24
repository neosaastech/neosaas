# 🎯 COMMENCEZ ICI - Résoudre l'erreur GitHub OAuth

**Date** : 23 janvier 2026  
**Votre problème** : "The redirect_uri is not associated with this application"

---

## ⚡ Solution en 3 Étapes (15 minutes)

### Étape 1 : Vérifier GitHub (5 min)

1. Allez sur : **https://github.com/settings/developers**
2. Trouvez votre OAuth App (Client ID: `Ov23licqdRXt8oc0sqqQ`)
3. Vérifiez que "Authorization callback URL" est **EXACTEMENT** :
   ```
   https://www.neosaas.tech/api/auth/oauth/github/callback
   ```

**Si ce n'est pas le cas** :
- Cliquez "Update application"
- Modifiez l'URL
- Sauvegardez

---

### Étape 2 : Vérifier votre Base de Données (5 min)

1. Allez sur : **https://www.neosaas.tech/admin/api**
2. Connectez-vous en tant qu'admin
3. Section "GitHub OAuth Configuration"
4. Remplissez **EXACTEMENT** :

```
Client ID: Ov23licqdRXt8oc0sqqQ
Client Secret: 1899059a069decd1f582d05b3aac7159773c638b
Callback URL: https://www.neosaas.tech/api/auth/oauth/github/callback
```

**⚠️ TRÈS IMPORTANT** :
- Le "Callback URL" doit être l'URL **COMPLÈTE**
- ❌ PAS `/api/auth/oauth/github/callback`
- ✅ MAIS `https://www.neosaas.tech/api/auth/oauth/github/callback`

---

### Étape 3 : Test (5 min)

1. Ouvrez un **navigateur en mode incognito**
2. Allez sur : **https://www.neosaas.tech/auth/login**
3. Cliquez sur "**Se connecter avec GitHub**"
4. Vous devriez voir la page d'autorisation GitHub (pas d'erreur)

**✅ Si ça fonctionne** : Problème résolu !

**❌ Si ça ne fonctionne toujours pas** : Passez à la section suivante.

---

## 🔍 Diagnostic Avancé (si le problème persiste)

### Vérification 1 : Variable Vercel

1. Allez sur : **https://vercel.com/neosaastech/neosaas-website/settings/environment-variables**
2. Cherchez `NEXT_PUBLIC_APP_URL`
3. Vérifiez qu'elle existe et vaut : `https://www.neosaas.tech`

**Si elle n'existe pas** :
- Cliquez "Add New"
- Name: `NEXT_PUBLIC_APP_URL`
- Value: `https://www.neosaas.tech`
- Environment: Production
- Sauvegardez
- **Redéployez** l'application

### Vérification 2 : Logs Vercel

1. Allez sur : **https://vercel.com/neosaastech/neosaas-website/logs**
2. Filtrez par : `[GitHub OAuth]`
3. Cherchez la ligne : `Callback URL (redirect_uri):`
4. Notez l'URL exacte affichée

**Comparez cette URL avec** :
- L'URL configurée sur GitHub
- L'URL configurée en base de données

**Elles doivent être IDENTIQUES.**

---

## 📚 Documentation Détaillée

Si après ces étapes le problème persiste, consultez ces guides :

### Guide de Correction Rapide
**Fichier** : [`docs/GITHUB_OAUTH_FIX_REDIRECT_URI.md`](./docs/GITHUB_OAUTH_FIX_REDIRECT_URI.md)  
**Contenu** : Solution complète en 5 minutes avec exemples

### Guide de Dépannage Complet
**Fichier** : [`docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md`](./docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md)  
**Contenu** : Diagnostic approfondi, toutes les solutions possibles

### Checklist de Vérification
**Fichier** : [`docs/GITHUB_OAUTH_VERIFICATION_CHECKLIST.md`](./docs/GITHUB_OAUTH_VERIFICATION_CHECKLIST.md)  
**Contenu** : Checklist interactive pour vérifier chaque point

### Index de Documentation
**Fichier** : [`docs/GITHUB_OAUTH_INDEX.md`](./docs/GITHUB_OAUTH_INDEX.md)  
**Contenu** : Liste complète de toute la documentation OAuth

---

## 🚨 Problèmes Courants et Solutions

### Problème : URL relative au lieu d'absolue

**Symptôme** : En BDD vous avez : `/api/auth/oauth/github/callback`

**Solution** :
1. Allez sur `/admin/api`
2. Changez pour : `https://www.neosaas.tech/api/auth/oauth/github/callback`
3. Sauvegardez et retestez

### Problème : Différence www

**Symptôme** :
- GitHub a : `https://www.neosaas.tech/...`
- Application envoie : `https://neosaas.tech/...` (sans www)

**Solution** :
Choisissez une seule version et utilisez-la **partout** :
- Soit **avec** www
- Soit **sans** www
Mais **JAMAIS** les deux en même temps.

### Problème : URL de preview deployment

**Symptôme** : L'URL contient `.vercel.app`

**Solution** :
1. Forcez l'URL complète en BDD : `https://www.neosaas.tech/...`
2. Ou créez une OAuth App séparée pour les previews

---

## ✅ Checklist Rapide

Avant de demander de l'aide, vérifiez que :

- [ ] L'URL sur GitHub est : `https://www.neosaas.tech/api/auth/oauth/github/callback`
- [ ] L'URL en BDD est : `https://www.neosaas.tech/api/auth/oauth/github/callback`
- [ ] Les deux URLs sont **exactement identiques**
- [ ] L'URL en BDD est **complète** (commence par `https://`)
- [ ] `NEXT_PUBLIC_APP_URL` existe sur Vercel
- [ ] Test en mode incognito effectué
- [ ] Logs Vercel vérifiés

---

## 📞 Besoin d'Aide ?

Si après tout ça le problème persiste :

1. **Remplissez ce diagnostic** :

```
=== DIAGNOSTIC ===

URL configurée sur GitHub :
_________________________________________________

URL configurée en BDD (via /admin/api) :
_________________________________________________

URL dans les logs Vercel :
_________________________________________________

NEXT_PUBLIC_APP_URL sur Vercel :
_________________________________________________

Erreur exacte reçue :
_________________________________________________
```

2. **Consultez** : [`docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md`](./docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md)

3. **Partagez** ce diagnostic pour obtenir de l'aide ciblée

---

## 🎉 Résolution

Une fois configuré correctement, vous pourrez :

- ✅ Vous connecter avec GitHub sans erreur
- ✅ Créer un compte via GitHub OAuth
- ✅ Lier votre compte GitHub existant

**Le bouton GitHub OAuth apparaît automatiquement** sur les pages de login et register une fois la configuration correcte.

---

**Créé le** : 23 janvier 2026  
**Dernière mise à jour** : 23 janvier 2026  
**Version** : 1.0
