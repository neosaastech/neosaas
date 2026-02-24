# 🚀 Configuration GitHub OAuth - Guide Express

## 📋 Ce que vous devez faire maintenant

Vous avez validé votre PAT GitHub avec succès ✅

Il reste **2 étapes simples** :

---

## Étape 1️⃣ : Créer l'OAuth App sur GitHub (5 min)

### Pour une organisation (NEOMIA)

1. **Ouvrir** : https://github.com/organizations/NEOMIA/settings/applications

2. **Cliquer** sur le bouton vert **"New OAuth App"**

3. **Remplir le formulaire** :

   ```
   Application name:           NeoSaaS OAuth
   Homepage URL:               http://localhost:3000
   Authorization callback URL: http://localhost:3000/api/auth/oauth/github/callback
   ```

   > 💡 Pour la production, remplacez `http://localhost:3000` par votre vraie URL

4. **Cliquer** sur **"Register application"**

5. **Vous voyez maintenant :**
   - **Client ID** : `Ov23liXXXXXXXXX` ← **Copiez-le**
   - Bouton **"Generate a new client secret"** ← **Cliquez dessus**

6. **Client Secret généré** : `ghp_XXXXXXXXX` ← **Copiez-le IMMÉDIATEMENT**
   
   ⚠️ **IMPORTANT** : Le secret ne sera plus jamais affiché !

---

## Étape 2️⃣ : Enregistrer dans NeoSaaS

### Option A : Via l'API Admin (Interface Web) ✨ RECOMMANDÉ

1. **Retourner** sur votre page `/admin/api`

2. **Chercher** "GitHub OAuth" dans la liste

3. **Cliquer** sur "Configurer"

4. **Entrer** :
   - **Client ID** : `Ov23liXXXXXXXXX` (celui copié à l'étape 1)
   - **Client Secret** : `ghp_XXXXXXXXX` (celui copié à l'étape 1)

5. **Cliquer** sur **"Enregistrer"**

6. ✅ **Terminé !** Vous devriez voir "Configuration enregistrée avec succès"

### Option B : Via SQL Direct (Avancé)

Si l'interface ne fonctionne pas, utilisez SQL :

```sql
-- Remplacez YOUR_CLIENT_ID et YOUR_CLIENT_SECRET par vos vraies valeurs
INSERT INTO service_api_configs (
  service_name, service_type, environment,
  is_active, is_default, config, metadata
) VALUES (
  'github', 'oauth', 'development',
  true, true,
  jsonb_build_object(
    'clientId', 'YOUR_CLIENT_ID',
    'clientSecret', 'YOUR_CLIENT_SECRET'
  ),
  jsonb_build_object(
    'callbackUrl', 'http://localhost:3000/api/auth/oauth/github/callback',
    'baseUrl', 'http://localhost:3000'
  )
)
ON CONFLICT (service_name, environment)
DO UPDATE SET
  config = EXCLUDED.config,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
```

---

## ✅ Vérifier que ça marche

### Test 1 : Vérifier en BDD

```sql
SELECT 
  service_name,
  environment,
  is_active,
  config->>'clientId' as client_id,
  metadata->>'callbackUrl' as callback_url
FROM service_api_configs
WHERE service_name = 'github';
```

**Résultat attendu** :
```
service_name | environment | is_active | client_id       | callback_url
-------------|-------------|-----------|-----------------|---------------------------
github       | development | true      | Ov23liXXXXXXXXX | http://localhost:3000/api/auth/oauth/github/callback
```

### Test 2 : Tester le flux OAuth

1. **Aller** sur `http://localhost:3000/auth/login`

2. **Cliquer** sur "Se connecter avec GitHub"
   
   > 🚧 Si le bouton n'existe pas encore, il faudra l'ajouter (prochaine étape)

3. **Vous devriez être redirigé** vers GitHub pour autoriser l'app

4. **Après autorisation**, retour sur votre dashboard connecté ✅

---

## 🔧 Dépannage

### Erreur : "OAuth configuration not found"

**Cause** : Les credentials ne sont pas en BDD

**Solution** : Vérifiez avec la requête SQL du Test 1

### Erreur : "Redirect URI mismatch"

**Cause** : Le callback URL dans GitHub ≠ celui en BDD

**Solution** :
1. Vérifier dans GitHub : https://github.com/settings/developers
2. Vérifier en BDD avec la requête SQL
3. Ils doivent être **EXACTEMENT identiques**

### Erreur : "Invalid client"

**Cause** : Le Client ID ou Client Secret est incorrect

**Solution** :
1. Regénérer un nouveau Client Secret sur GitHub
2. Mettre à jour en BDD ou via `/admin/api`

---

## 🎯 Prochaines étapes

Après cette configuration :

1. ✅ **Créer l'OAuth App** (vous venez de le faire)
2. ✅ **Enregistrer en BDD** (vous venez de le faire)
3. ⏳ **Ajouter le bouton de connexion** dans `/auth/login`
4. ⏳ **Tester avec de vrais utilisateurs**

---

## 📚 Ressources

- **Guide détaillé complet** : [GITHUB_OAUTH_MANUAL_SETUP.md](./GITHUB_OAUTH_MANUAL_SETUP.md)
- **Documentation technique** : [OAUTH_DATABASE_CONFIG.md](./OAUTH_DATABASE_CONFIG.md)
- **Script SQL** : [QUICK_GITHUB_OAUTH_SETUP.sql](./QUICK_GITHUB_OAUTH_SETUP.sql)

---

## ❓ Besoin d'aide ?

Si vous êtes bloqué, vérifiez :

1. ✅ L'OAuth App existe sur GitHub
2. ✅ Vous avez copié le bon Client ID
3. ✅ Vous avez copié le Client Secret (attention, il ne s'affiche qu'une fois)
4. ✅ Le callback URL est identique partout

**Tout marche ?** 🎉 Vous pouvez maintenant utiliser GitHub OAuth !
