# ✅ Checklist Vérification GitHub OAuth

**Date** : 23 janvier 2026  
**Client ID** : `Ov23licqdRXt8oc0sqqQ`

---

## 🎯 Objectif

Vérifier que votre configuration GitHub OAuth est correcte et résoudre l'erreur :
```
The redirect_uri is not associated with this application
```

---

## 📋 Checklist de Vérification

### 1️⃣ Configuration GitHub OAuth App

- [ ] Allez sur : https://github.com/settings/developers
- [ ] Trouvez l'OAuth App avec Client ID `Ov23licqdRXt8oc0sqqQ`
- [ ] Vérifiez "Authorization callback URL" :
  ```
  https://www.neosaas.tech/api/auth/oauth/github/callback
  ```
- [ ] Notez l'URL EXACTE (avec ou sans `www`, avec ou sans slash final)

**URL configurée sur GitHub** :
```
_________________________________________________
```

---

### 2️⃣ Configuration Base de Données (Admin)

- [ ] Allez sur : https://www.neosaas.tech/admin/api
- [ ] Connectez-vous en tant qu'admin
- [ ] Section "GitHub OAuth Configuration"
- [ ] Vérifiez les 3 champs :

**Client ID** :
```
Ov23licqdRXt8oc0sqqQ
```

**Client Secret** :
```
1899059a069decd1f582d05b3aac7159773c638b
```

**Callback URL** (doit être URL COMPLÈTE) :
```
https://www.neosaas.tech/api/auth/oauth/github/callback
```

- [ ] URL est **absolue** (commence par `https://`)
- [ ] URL correspond **exactement** à celle sur GitHub

**URL configurée en BDD** :
```
_________________________________________________
```

---

### 3️⃣ Variables d'Environnement Vercel

- [ ] Allez sur : https://vercel.com/neosaastech/neosaas-website/settings/environment-variables
- [ ] Vérifiez que `NEXT_PUBLIC_APP_URL` existe
- [ ] Valeur doit être : `https://www.neosaas.tech`

**NEXT_PUBLIC_APP_URL** :
```
_________________________________________________
```

- [ ] Si manquante : Ajoutez-la et redéployez

---

### 4️⃣ Comparaison des URLs

**Les 3 URLs suivantes doivent être IDENTIQUES** :

| Source | URL |
|--------|-----|
| GitHub OAuth App | `_______________________________________________` |
| Base de données | `_______________________________________________` |
| URL attendue | `https://www.neosaas.tech/api/auth/oauth/github/callback` |

- [ ] Les 3 URLs sont identiques (caractère par caractère)
- [ ] Pas de différence `www` vs non-`www`
- [ ] Pas de slash final différent
- [ ] Même protocole (`https://`)

---

### 5️⃣ Test de Connexion

- [ ] Ouvrez un navigateur en **mode incognito**
- [ ] Allez sur : https://www.neosaas.tech/auth/login
- [ ] Cliquez sur "Se connecter avec GitHub"
- [ ] Observez l'URL dans la barre d'adresse GitHub

**URL observée sur GitHub** (copier/coller) :
```
_________________________________________________
```

- [ ] Pas d'erreur "redirect_uri not associated"
- [ ] Page d'autorisation GitHub s'affiche
- [ ] Après autorisation, redirection vers le site
- [ ] Connexion réussie

---

### 6️⃣ Vérification des Logs (si problème persiste)

- [ ] Allez sur : https://vercel.com/neosaastech/neosaas-website/logs
- [ ] Filtrez par : `[GitHub OAuth]`
- [ ] Trouvez la ligne : `Callback URL (redirect_uri):`

**URL dans les logs** :
```
_________________________________________________
```

- [ ] URL dans les logs correspond à GitHub
- [ ] URL dans les logs correspond à la BDD

---

## 🚨 Problèmes Courants

### Problème 1 : URL relative en BDD

**Symptôme** : Callback URL = `/api/auth/oauth/github/callback`

**Solution** :
1. Allez sur `/admin/api`
2. Changez en URL absolue : `https://www.neosaas.tech/api/auth/oauth/github/callback`
3. Sauvegardez

### Problème 2 : Différence www

**Symptôme** : 
- GitHub : `https://www.neosaas.tech/...`
- Logs : `https://neosaas.tech/...`

**Solution** :
1. Choisissez une convention (avec ou sans `www`)
2. Modifiez GitHub OU Vercel pour qu'ils correspondent
3. Retestez

### Problème 3 : Variable Vercel manquante

**Symptôme** : `NEXT_PUBLIC_APP_URL` n'existe pas

**Solution** :
1. Ajoutez la variable sur Vercel
2. Valeur : `https://www.neosaas.tech`
3. Redéployez l'application

### Problème 4 : URL de preview deployment

**Symptôme** : URL contient `.vercel.app`

**Solution** :
1. Configurez l'URL absolue en BDD
2. Créez une OAuth App séparée pour preview si nécessaire

---

## ✅ Validation Finale

Si tous les points ci-dessus sont validés :

- [x] Configuration GitHub correcte
- [x] Configuration BDD correcte
- [x] Variables Vercel correctes
- [x] URLs identiques partout
- [x] Test de connexion réussi
- [x] Aucune erreur dans les logs

**🎉 Votre GitHub OAuth est configuré correctement !**

---

## 📞 Besoin d'Aide ?

Si après cette checklist le problème persiste :

1. **Consultez le guide complet** : [`docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md`](./docs/GITHUB_OAUTH_REDIRECT_URI_TROUBLESHOOTING.md)

2. **Remplissez ce formulaire de diagnostic** :

```
=== INFORMATIONS DE DIAGNOSTIC ===

URL sur GitHub :
_________________________________________________

URL en BDD (via /admin/api) :
_________________________________________________

URL dans les logs Vercel :
_________________________________________________

NEXT_PUBLIC_APP_URL :
_________________________________________________

Erreur exacte reçue :
_________________________________________________

Captures d'écran disponibles : Oui / Non
```

3. **Partagez ces informations** pour obtenir de l'aide

---

**Guide créé le** : 23 janvier 2026  
**Dernière mise à jour** : 23 janvier 2026
