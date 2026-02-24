# Configuration GitHub OAuth - Guide Rapide

## 🚀 Démarrage Rapide

### Étape 1 : Créer un Personal Access Token GitHub

```bash
# 1. Allez sur : https://github.com/settings/tokens/new
# 2. Nom : "NeoSAS OAuth Configuration"
# 3. Permissions :
#    - ✅ admin:org
#    - ✅ write:org
#    - ✅ read:user
#    - ✅ user:email
# 4. Copiez le token (commence par ghp_)
```

### Étape 2 : Configurer Vercel

```bash
# Récupérer l'ID du projet
vercel project ls

# Créer un token API sur : https://vercel.com/account/tokens

# Ajouter les variables d'environnement
vercel env add VERCEL_PROJECT_ID
# Collez : prj_xxxxxxxxxxxxxxxxxxxx

vercel env add VERCEL_API_TOKEN
# Collez : vercel_xxxxxxxxxxxxxxxxxxxxxxxx

# Ajouter l'URL de l'application
vercel env add NEXT_PUBLIC_APP_URL
# Collez : https://neosaas.tech
```

### Étape 3 : Utiliser l'Interface

1. Connectez-vous en tant qu'admin
2. Allez sur `/admin/api` (section OAuth Services)
3. Cliquez sur "Add New API Configuration"
4. Sélectionnez "GitHub"
5. Collez votre GitHub PAT (Personal Access Token)
6. Cliquez sur "Save" - la configuration se fait automatiquement
7. La page se recharge automatiquement avec les nouvelles variables

---

## 📝 Variables d'Environnement Requises

```env
# Dans Vercel Settings → Environment Variables
VERCEL_PROJECT_ID="prj_xxxxxxxxxxxxxxxxxxxx"
VERCEL_API_TOKEN="vercel_xxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_APP_URL="https://neosaas.tech"
GITHUB_ORG="NEOMIA"  # Optionnel (défaut : NEOMIA)
```

---

## ✅ Variables Créées Automatiquement

Après la configuration, ces variables seront disponibles :

```env
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxxxxxxx"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

## 🔍 Vérification

```bash
# Vérifier l'état de la configuration
curl https://votre-site.com/api/admin/configure-github-oauth

# Réponse attendue :
# {
#   "configured": true,
#   "vercelConfigured": true,
#   "clientId": "Iv1.8a..."
# }
```

---

## ⚠️ Dépannage Rapide

### Erreur : "Configuration Vercel manquante"
➡️ Vérifiez que `VERCEL_PROJECT_ID` et `VERCEL_API_TOKEN` sont configurés

### Erreur : "Clé API invalide"
➡️ Générez un nouveau token avec les bonnes permissions

### Erreur : "Permissions insuffisantes"
➡️ Vérifiez que `admin:org` et `write:org` sont cochés

### L'authentification GitHub ne fonctionne pas
➡️ Redéployez sur Vercel pour recharger les variables

---

## 📚 Documentation Complète

Consultez [GITHUB_OAUTH_AUTO_CONFIG.md](./GITHUB_OAUTH_AUTO_CONFIG.md) pour :
- Guide détaillé
- Architecture technique
- Gestion des erreurs
- Sécurité
- API Reference

---

## 🎯 Prochaines Étapes

Après configuration, GitHub OAuth sera disponible dans votre application.

Pour l'utiliser avec next-auth, voir la section suivante.
