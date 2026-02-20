# 🚨 Gestion des Erreurs - Configuration GitHub OAuth

## Vue d'ensemble

Ce document détaille toutes les erreurs potentielles lors de la configuration automatique de GitHub OAuth, leurs causes, et les solutions.

---

## 1. Erreurs de Validation (400-401)

### 1.1. Clé API GitHub Manquante

**Code HTTP** : `400 Bad Request`

**Message** :
```json
{
  "success": false,
  "error": "Clé API GitHub manquante ou invalide"
}
```

**Causes** :
- Champ vide dans le formulaire
- Requête POST sans body
- Body JSON malformé

**Solutions** :
1. Vérifiez que le champ n'est pas vide
2. Vérifiez le format de la requête :
```javascript
fetch('/api/admin/configure-github-oauth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ githubPat: 'ghp_...' })
})
```

---

### 1.2. Token GitHub Invalide

**Code HTTP** : `401 Unauthorized`

**Message** :
```json
{
  "success": false,
  "error": "Validation GitHub échouée : Clé API invalide (Status: 401)"
}
```

**Causes** :
- Token expiré
- Token révoqué
- Token incorrect (faute de frappe)
- Mauvais format (ne commence pas par `ghp_`)

**Solutions** :
1. Vérifiez que le token commence par `ghp_`
2. Générez un nouveau token :
   - [GitHub Settings → Tokens](https://github.com/settings/tokens)
   - Créez un nouveau "classic" token
3. Copiez immédiatement le nouveau token
4. Réessayez la configuration

**Test manuel** :
```bash
curl -H "Authorization: Bearer ghp_votre_token" https://api.github.com/user
```

---

### 1.3. Permissions Insuffisantes

**Code HTTP** : `401 Unauthorized`

**Message** :
```json
{
  "success": false,
  "error": "Validation GitHub échouée : La clé API ne dispose pas des permissions nécessaires (admin:org ou write:org requis)"
}
```

**Causes** :
- Token sans les scopes `admin:org` ou `write:org`
- Token créé avec des permissions limitées

**Solutions** :
1. Allez sur [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Localisez votre token
3. Vérifiez les permissions :
   - ✅ `admin:org` (Organization administration)
   - ✅ `write:org` (Write access to organization)
   - ✅ `read:user` (Read user profile)
   - ✅ `user:email` (Access user emails)
4. Si les permissions sont incorrectes :
   - Supprimez l'ancien token
   - Créez un nouveau token avec les bonnes permissions
5. Réessayez

**Permissions minimales requises** :
```
admin:org    → Pour créer l'OAuth App
write:org    → Pour modifier les paramètres d'organisation
read:user    → Pour valider le token
user:email   → Pour récupérer l'email (optionnel)
```

---

## 2. Erreurs de Configuration (500)

### 2.1. Variables Vercel Manquantes

**Code HTTP** : `500 Internal Server Error`

**Message** :
```json
{
  "success": false,
  "error": "Configuration Vercel manquante (VERCEL_PROJECT_ID ou VERCEL_API_TOKEN)"
}
```

**Causes** :
- `VERCEL_PROJECT_ID` non configuré
- `VERCEL_API_TOKEN` non configuré
- Variables configurées mais pas redéployées

**Solutions** :

**Via l'interface Vercel** :
1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. **Settings → Environment Variables**
4. Ajoutez :
   - `VERCEL_PROJECT_ID` : ID du projet (ex: `prj_xxxxxxxxxxxxxxxxxxxx`)
   - `VERCEL_API_TOKEN` : Token API (ex: `vercel_xxxxxxxxxxxxxxxxxxxxxxxx`)
5. **Important** : Cliquez sur **"Redeploy"** après l'ajout

**Via la CLI Vercel** :
```bash
# Installer la CLI si nécessaire
npm i -g vercel

# Lister les projets pour obtenir l'ID
vercel project ls

# Ajouter les variables
vercel env add VERCEL_PROJECT_ID
# Collez : prj_xxxxxxxxxxxxxxxxxxxx

vercel env add VERCEL_API_TOKEN
# Collez : vercel_xxxxxxxxxxxxxxxxxxxxxxxx

# Redéployer
vercel deploy --prod
```

**Récupérer l'ID du projet** :
```bash
# Méthode 1 : CLI
vercel project ls

# Méthode 2 : Interface
# Settings → General → Project ID
```

**Créer un token API** :
1. [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. **"Create Token"**
3. Nom : `NeoSAS GitHub OAuth`
4. Scope : Votre compte/équipe
5. Copiez le token (commence par `vercel_`)

---

### 2.2. URL du Site Indéterminée

**Code HTTP** : `500 Internal Server Error`

**Message** :
```json
{
  "success": false,
  "error": "Impossible de déterminer l'URL du site"
}
```

**Causes** :
- `NEXT_PUBLIC_APP_URL` non configuré
- `VERCEL_URL` non disponible
- Header `host` manquant

**Solutions** :
1. Ajoutez `NEXT_PUBLIC_APP_URL` dans Vercel :
```bash
vercel env add NEXT_PUBLIC_APP_URL
# Collez : https://neosaas.tech
```

2. Vérifiez le format :
   - ✅ `https://neosaas.tech`
   - ✅ `https://www.neosaas.tech`
   - ❌ `neosaas.tech` (sans https://)
   - ❌ `https://neosaas.tech/` (pas de slash final)

3. Redéployez :
```bash
vercel deploy --prod
```

---

## 3. Erreurs GitHub API (500)

### 3.1. Échec de Création OAuth App

**Code HTTP** : `500 Internal Server Error`

**Message** :
```json
{
  "success": false,
  "error": "Création OAuth App échouée : [message d'erreur GitHub]",
  "details": {
    "oauthAppCreated": false,
    "vercelEnvUpdated": false
  }
}
```

**Causes Possibles** :

#### A. Organisation GitHub Incorrecte

**Erreur** : `Not Found` ou `Organization not found`

**Solution** :
1. Vérifiez le nom de votre organisation GitHub
2. Ajoutez la variable `GITHUB_ORG` :
```bash
vercel env add GITHUB_ORG
# Collez : VotreOrganisation (sensible à la casse)
```
3. Redéployez

#### B. Nom d'Application en Conflit

**Erreur** : `validation failed` ou `name already exists`

**Solution** :
Le système crée automatiquement un nom unique avec timestamp.
Si l'erreur persiste :
1. Allez sur [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Supprimez les anciennes OAuth Apps non utilisées
3. Réessayez

#### C. Quota API GitHub Dépassé

**Erreur** : `API rate limit exceeded`

**Détails** :
- Sans authentification : 60 requêtes/heure
- Avec authentification : 5000 requêtes/heure

**Solution** :
1. Attendez la réinitialisation du quota (1 heure)
2. Vérifiez votre quota restant :
```bash
curl -H "Authorization: Bearer ghp_votre_token" https://api.github.com/rate_limit
```
3. Réessayez après quelques minutes

#### D. Permissions Manquantes

**Erreur** : `Resource not accessible by integration`

**Solution** :
1. Vérifiez que votre compte a les permissions sur l'organisation
2. Vérifiez que vous êtes propriétaire (Owner) de l'organisation
3. Si membre : demandez les permissions admin à un propriétaire

---

### 3.2. Réponse GitHub Invalide

**Code HTTP** : `500 Internal Server Error`

**Message** :
```json
{
  "success": false,
  "error": "Création OAuth App échouée : Réponse invalide de l'API GitHub (client_id ou client_secret manquant)"
}
```

**Causes** :
- Réponse GitHub malformée
- Problème temporaire de l'API GitHub

**Solutions** :
1. Réessayez dans quelques minutes
2. Vérifiez le [statut de l'API GitHub](https://www.githubstatus.com/)
3. Si le problème persiste, consultez les logs :
```bash
# Logs Vercel
vercel logs <deployment-url>
```

---

## 4. Erreurs Vercel API (500)

### 4.1. Échec de Mise à Jour des Variables

**Code HTTP** : `500 Internal Server Error`

**Message** :
```json
{
  "success": false,
  "error": "Mise à jour Vercel échouée : [message d'erreur]",
  "details": {
    "oauthAppCreated": true,
    "vercelEnvUpdated": false
  }
}
```

**Causes Possibles** :

#### A. Token Vercel Invalide

**Erreur** : `Invalid token` ou `Unauthorized`

**Solution** :
1. Vérifiez que le token commence par `vercel_`
2. Créez un nouveau token :
   - [Vercel Account → Tokens](https://vercel.com/account/tokens)
   - Supprimez l'ancien
   - Créez un nouveau
3. Mettez à jour la variable :
```bash
vercel env rm VERCEL_API_TOKEN
vercel env add VERCEL_API_TOKEN
```

#### B. Permissions Insuffisantes

**Erreur** : `Forbidden` ou `You don't have access to this resource`

**Solution** :
1. Vérifiez que le token a les permissions sur le projet
2. Créez un nouveau token avec le bon scope :
   - Sélectionnez votre compte/équipe
   - Assurez-vous que le projet est accessible
3. Mettez à jour le token

#### C. ID de Projet Incorrect

**Erreur** : `Project not found`

**Solution** :
1. Vérifiez l'ID du projet :
```bash
vercel project ls
```
2. Mettez à jour la variable :
```bash
vercel env rm VERCEL_PROJECT_ID
vercel env add VERCEL_PROJECT_ID
# Collez le bon ID (commence par prj_)
```

#### D. Limite de Variables Atteinte

**Erreur** : `Environment variable limit reached`

**Solution** :
1. Allez dans Vercel → Settings → Environment Variables
2. Supprimez les variables inutilisées
3. Réessayez

---

## 5. Erreurs d'Authentification (401/403)

### 5.1. Non Authentifié

**Code HTTP** : `401 Unauthorized`

**Message** :
```json
{
  "success": false,
  "error": "Authentification requise"
}
```

**Causes** :
- Cookie `auth-token` absent
- Token expiré
- Session invalide

**Solutions** :
1. Reconnectez-vous à l'application
2. Réessayez la configuration
3. Si le problème persiste, videz les cookies :
```javascript
// Dans la console du navigateur
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
// Puis reconnectez-vous
```

---

### 5.2. Permissions Insuffisantes

**Code HTTP** : `403 Forbidden`

**Message** :
```json
{
  "success": false,
  "error": "Accès refusé - permissions admin requises"
}
```

**Causes** :
- Utilisateur sans rôle `admin` ou `super_admin`
- Rôles non chargés correctement

**Solutions** :
1. Vérifiez vos rôles :
```bash
curl -b "auth-token=votre_token" https://neosaas.tech/api/auth/me
```
2. Demandez les permissions admin à un super administrateur
3. Si vous êtes admin mais l'erreur persiste :
   - Déconnectez-vous
   - Reconnectez-vous
   - Réessayez

---

## 6. Erreurs Réseau

### 6.1. Timeout

**Message** : `Request timeout` ou pas de réponse

**Causes** :
- Problème de connexion
- API GitHub/Vercel lente
- Fonction serverless timeout (10s par défaut)

**Solutions** :
1. Vérifiez votre connexion internet
2. Réessayez dans quelques secondes
3. Si le problème persiste, vérifiez :
   - [GitHub Status](https://www.githubstatus.com/)
   - [Vercel Status](https://www.vercel-status.com/)

---

### 6.2. CORS Error

**Message** : `CORS policy blocked`

**Cause** : Requête depuis un domaine non autorisé

**Solution** :
Ce ne devrait pas arriver dans l'utilisation normale.
Si vous testez depuis un autre domaine :
1. Utilisez le même domaine que l'application
2. Ou configurez CORS dans l'API Route (non recommandé)

---

## 7. Erreurs UI (Client)

### 7.1. Toast ne s'affiche pas

**Cause** : Problème avec Sonner

**Solution** :
1. Vérifiez la console du navigateur
2. Assurez-vous que `<Toaster />` est présent dans le layout
3. Vérifiez l'import :
```typescript
import { useToast } from "@/hooks/use-toast";
```

---

### 7.2. Page ne se recharge pas

**Cause** : `window.location.reload()` bloqué

**Solution** :
Rechargez manuellement la page après la notification de succès.

---

## 8. Logs de Débogage

### Activer les Logs Détaillés

Les logs sont automatiquement activés côté serveur.

**Consulter les logs Vercel** :
```bash
# En temps réel
vercel logs --follow

# Logs d'un déploiement spécifique
vercel logs <deployment-url>
```

**Préfixes des logs** :
```
🔍 Validation de la clé API GitHub...
✅ Clé API validée pour l'utilisateur : ...
🔧 Création de l'OAuth App GitHub...
⚠️ Tentative de création d'une OAuth App classique...
✅ OAuth App créée avec succès : ...
⚙️ Mise à jour des variables Vercel...
🗑️ Variable existante supprimée : ...
✅ Variable créée : ...
❌ Erreur : ...
```

---

## 9. Checklist de Dépannage

### ✅ Avant de Commencer

- [ ] Variables Vercel configurées (`VERCEL_PROJECT_ID`, `VERCEL_API_TOKEN`, `NEXT_PUBLIC_APP_URL`)
- [ ] Token GitHub créé avec `admin:org` et `write:org`
- [ ] Connecté en tant qu'admin
- [ ] Application redéployée après ajout des variables

### ✅ En Cas d'Erreur

1. [ ] Lire le message d'erreur complet
2. [ ] Consulter cette documentation
3. [ ] Vérifier les logs Vercel
4. [ ] Vérifier la console navigateur (Network tab)
5. [ ] Tester avec `curl` si possible
6. [ ] Réessayer après correction

### ✅ Si le Problème Persiste

1. [ ] Supprimer toutes les variables concernées
2. [ ] Recréer les tokens (GitHub + Vercel)
3. [ ] Reconfigurer depuis zéro
4. [ ] Contacter le support avec :
   - Message d'erreur exact
   - Logs (masquez les tokens)
   - Étapes de reproduction

---

## 10. Contact Support

### Informations à Fournir

Lors d'un ticket de support, incluez :

1. **Message d'erreur exact** (JSON complet)
2. **Logs Vercel** (masquez les tokens)
3. **Étapes de reproduction**
4. **Configuration** (sans secrets) :
   ```
   - VERCEL_PROJECT_ID: prj_xxx (masqué)
   - VERCEL_API_TOKEN: vercel_xxx (masqué)
   - NEXT_PUBLIC_APP_URL: https://neosaas.tech
   - GITHUB_ORG: NEOMIA
   ```
5. **Logs console navigateur** (Network tab)

### Ne Pas Partager

- ❌ Tokens GitHub (`ghp_...`)
- ❌ Tokens Vercel (`vercel_...`)
- ❌ Client Secret GitHub
- ❌ Cookies d'authentification

---

## Résumé des Erreurs par Catégorie

| Catégorie | Code HTTP | Principale Cause | Solution Rapide |
|-----------|-----------|------------------|-----------------|
| Validation | 400 | Token manquant | Remplir le champ |
| Auth GitHub | 401 | Token invalide | Générer nouveau token |
| Permissions | 401 | Scopes manquants | Recréer token avec admin:org |
| Auth Admin | 401/403 | Pas admin | Obtenir rôle admin |
| Config Vercel | 500 | Variables manquantes | Ajouter VERCEL_PROJECT_ID/TOKEN |
| GitHub API | 500 | Quota dépassé | Attendre 1h |
| Vercel API | 500 | Token invalide | Recréer token Vercel |
| Réseau | - | Timeout | Vérifier connexion |

---

**Date** : 21 janvier 2026  
**Version** : 1.0.0  
**Dernière mise à jour** : 21 janvier 2026
