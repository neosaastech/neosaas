# OAuth Activation depuis Admin/Settings - Documentation

**Date** : 2026-01-23  
**Feature** : Activation/Désactivation des providers OAuth depuis `/admin/settings`

---

## 🎯 Objectif

Permettre aux super admins d'activer ou désactiver facilement les connexions sociales (GitHub, Google) depuis l'interface `/admin/settings`, sans avoir à manipuler directement la base de données.

---

## ✅ Ce qui a été implémenté

### 1. Section "Social Authentication" dans `/admin/settings`

**Fichier** : `app/(private)/admin/settings/page.tsx`

**Features** :
- ✅ Section dédiée dans l'onglet "Social Sharing & Links"
- ✅ Switch pour GitHub OAuth
- ✅ Switch pour Google OAuth
- ✅ Icônes visuelles pour chaque provider
- ✅ Indicateur d'état actif (checkmark vert)
- ✅ Message d'information avec lien vers `/admin/api`

**Workflow** :
1. Admin accède à `/admin/settings`
2. Descend à la section "Social Sharing & Links"
3. Voit la sous-section "Social Authentication"
4. Active/désactive les providers avec les switches
5. Changement immédiat dans `service_api_configs` table
6. Toast de confirmation
7. Boutons login/register s'adaptent automatiquement

### 2. API Toggle OAuth

**Fichier** : `app/api/admin/oauth/toggle/route.ts`

**Endpoint** : `POST /api/admin/oauth/toggle`

**Request Body** :
```json
{
  "provider": "github" | "google" | "facebook" | "microsoft" | "linkedin",
  "isActive": true | false
}
```

**Logique** :
1. Vérification authentification (admin requis)
2. Validation du provider
3. Vérification de l'existence de la config dans `service_api_configs`
4. Si config n'existe pas → Error 404 avec message clair
5. Si config existe → Update du champ `isActive`
6. Log de l'action
7. Retour success avec confirmation

**Sécurité** :
- ✅ Authentification admin requise
- ✅ Validation des paramètres
- ✅ Vérification de l'existence de la config
- ✅ Messages d'erreur clairs

### 3. Chargement de l'état initial

**Modification** : `app/(private)/admin/settings/page.tsx`

**Logique** :
- Au chargement de la page, appel à `/api/auth/oauth/config`
- Récupération de l'état actuel de chaque provider
- Mise à jour du state `socialAuthEnabled`
- Affichage des switches dans l'état correct

---

## 🔄 Flow complet

### Activation d'un provider

```
1. Admin ouvre /admin/settings
   ↓
2. Page charge /api/auth/oauth/config
   ↓
3. État initial des switches affiché
   ↓
4. Admin clique sur le switch GitHub
   ↓
5. POST /api/admin/oauth/toggle
   {
     "provider": "github",
     "isActive": true
   }
   ↓
6. API vérifie si config existe
   ↓
7. Si existe → Update service_api_configs.isActive = true
   ↓
8. Retour success
   ↓
9. Toast "GitHub OAuth enabled"
   ↓
10. Frontend met à jour l'état
   ↓
11. Checkmark vert apparaît
   ↓
12. Utilisateurs peuvent maintenant se connecter avec GitHub
```

### Désactivation d'un provider

```
1. Admin clique sur le switch (déjà activé)
   ↓
2. POST /api/admin/oauth/toggle
   {
     "provider": "google",
     "isActive": false
   }
   ↓
3. Update service_api_configs.isActive = false
   ↓
4. Toast "Google OAuth disabled"
   ↓
5. Bouton Google disparaît de /auth/login et /auth/register
```

---

## 🔗 Intégration avec le système existant

### 1. Lien avec /admin/api

L'activation/désactivation depuis `/admin/settings` **ne configure pas** les credentials OAuth. Elle contrôle uniquement le champ `isActive` dans `service_api_configs`.

**Prérequis** :
- Les credentials doivent être configurés dans `/admin/api` AVANT
- Si on essaie d'activer un provider non configuré → Error 404
- Message clair : "Please configure credentials in /admin/api first"

### 2. Lien avec /api/auth/oauth/config

L'API `/api/auth/oauth/config` (utilisée par les pages login/register) vérifie :
- `serviceApiConfigs.isActive = true`
- `serviceApiConfigs.environment = 'production'`
- `serviceApiConfigs.serviceType = 'oauth'`

Si **toutes** ces conditions sont remplies → `{ github: true }` ou `{ google: true }`

### 3. Affichage des boutons login/register

**Condition d'affichage** :
```typescript
// Dans login/register page
const [oauthConfig, setOauthConfig] = useState({ github: false, google: false });

useEffect(() => {
  fetch('/api/auth/oauth/config')
    .then(res => res.json())
    .then(data => setOauthConfig({
      github: data.github || false,
      google: data.google || false,
    }));
}, []);

// Bouton GitHub s'affiche si:
{oauthConfig.github && (
  <Button>Continue with GitHub</Button>
)}
```

---

## 📋 Checklist de configuration

### Pour activer Google OAuth (exemple)

1. **Configuration des credentials** (dans `/admin/api`)
   - [ ] Aller sur `/admin/api`
   - [ ] Trouver "Google OAuth Configuration"
   - [ ] Sauvegarder Client ID et Client Secret
   - [ ] Vérifier que la config est créée dans `service_api_configs`

2. **Activation du provider** (dans `/admin/settings`)
   - [ ] Aller sur `/admin/settings`
   - [ ] Onglet "Social Sharing & Links"
   - [ ] Section "Social Authentication"
   - [ ] Activer le switch Google
   - [ ] Vérifier le checkmark vert

3. **Test**
   - [ ] Se déconnecter
   - [ ] Aller sur `/auth/login`
   - [ ] Vérifier que le bouton "Continue with Google" apparaît
   - [ ] Tester la connexion

---

## 🐛 Troubleshooting

### Switch ne change pas d'état

**Cause** : Erreur lors de l'appel API

**Vérification** :
1. Ouvrir la console navigateur
2. Vérifier les logs : `[OAuth Toggle]`
3. Regarder le message d'erreur dans le toast

**Solutions** :
- Si "No configuration found" → Configurer dans `/admin/api` d'abord
- Si erreur 401 → Vérifier que vous êtes admin
- Si erreur 500 → Vérifier les logs serveur

### Bouton n'apparaît toujours pas sur login/register

**Cause** : Cache ou état incorrect

**Vérifications** :
1. Vider le cache du navigateur
2. Ouvrir `/api/auth/oauth/config` dans l'URL
3. Vérifier que la réponse contient `"google": true`
4. Vérifier dans la DB : 
   ```sql
   SELECT * FROM service_api_configs 
   WHERE service_name = 'google' 
   AND service_type = 'oauth';
   ```
5. Vérifier `is_active = true`

### Switch activé mais config n'existe pas

**Cause** : Incohérence de données

**Solution** :
1. Désactiver le switch
2. Aller sur `/admin/api`
3. Configurer les credentials Google
4. Retourner sur `/admin/settings`
5. Réactiver le switch

---

## 💡 Avantages de cette approche

### 1. UX améliorée
- ✅ Un seul endroit pour activer/désactiver
- ✅ Visuel immédiat (switch + checkmark)
- ✅ Pas besoin de manipuler la DB directement

### 2. Sécurité
- ✅ Authentification admin requise
- ✅ Validation des paramètres
- ✅ Logs des actions

### 3. Cohérence
- ✅ Suit le pattern des autres settings
- ✅ Auto-save désactivé (action immédiate)
- ✅ Toast de confirmation

### 4. Maintenance
- ✅ Code centralisé dans une API dédiée
- ✅ Facile à étendre pour d'autres providers
- ✅ Messages d'erreur clairs

---

## 🔮 Évolutions futures possibles

### 1. Status du provider
- [ ] Afficher si le provider est configuré mais inactif
- [ ] Afficher si le provider n'est pas configuré (bouton "Configure" vers /admin/api)

### 2. Statistiques
- [ ] Nombre de connexions par provider
- [ ] Dernier login social

### 3. Providers supplémentaires
- [ ] Facebook OAuth
- [ ] Microsoft OAuth
- [ ] LinkedIn OAuth

---

## 📁 Fichiers modifiés/créés

**Nouveaux** :
- `app/api/admin/oauth/toggle/route.ts` - API Toggle OAuth

**Modifiés** :
- `app/(private)/admin/settings/page.tsx` - Ajout section Social Authentication
  - État `socialAuthEnabled`
  - Chargement depuis `/api/auth/oauth/config`
  - Switches GitHub et Google
  - Handlers pour toggle

---

## ✅ Résumé

**Fonctionnalité** : Activation/Désactivation OAuth depuis `/admin/settings` ✅  
**API** : `/api/admin/oauth/toggle` ✅  
**Interface** : Section "Social Authentication" ✅  
**Intégration** : Compatible avec système existant ✅  
**Documentation** : Complète ✅

**Prochaines étapes** :
1. Tester l'activation GitHub
2. Tester l'activation Google
3. Vérifier l'apparition des boutons
4. Tester la désactivation

**Temps estimé** : 2-3 minutes pour activer/désactiver un provider
