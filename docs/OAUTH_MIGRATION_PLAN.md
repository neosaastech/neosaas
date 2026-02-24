# Plan de Migration OAuth - Élimination des Doublons

> **IMPORTANT**: Ce document décrit comment éliminer les doublons entre l'ancien système OAuth et la nouvelle architecture modulaire.

---

## 📊 État Actuel

### ❌ Doublons Identifiés

| Ancien (Legacy) | Nouveau (Modulaire) | Statut |
|----------------|---------------------|--------|
| `lib/oauth/github-config.ts` | `lib/oauth/providers/github.ts` | � Deprecated |
| `getGitHubOAuthConfig()` | `githubOAuthProvider.getConfiguration()` | ✅ Migré |
| `isGitHubOAuthEnabled()` | `githubOAuthProvider.isEnabled()` | ✅ Migré |
| Logique utilisateur dans routes | `OAuthUserService` (Service unifié) | ✅ Unifié |

### 📁 Fichiers Utilisant le Système Legacy

1. **`app/api/auth/oauth/github/route.ts`**
   - Importe `getGitHubOAuthConfig` depuis `lib/oauth/github-config.ts`
   - Génère URL d'autorisation manuellement
   - **À migrer** ✅

2. **`app/api/auth/oauth/github/callback/route.ts`**
   - Importe `getGitHubOAuthConfig` depuis `lib/oauth/github-config.ts`
   - Gère l'utilisateur manuellement
   - **À migrer** ✅

3. **`lib/oauth/github-config.ts`**
   - Ancienne implémentation
   - Maintenant marquée comme DEPRECATED
   - **À supprimer après migration** ⏳

---

## 🎯 Objectif

**Supprimer complètement les doublons** en migrant toutes les routes vers la nouvelle architecture modulaire.

### Avantages de la Migration

✅ **Code unifié**: Une seule façon de faire  
✅ **Maintenabilité**: Plus facile à maintenir  
✅ **Extensibilité**: Facile d'ajouter Google, Facebook, etc.  
✅ **Réutilisabilité**: Helpers partagés (`handleOAuthUser`, `verifyOAuthState`)  
✅ **Type-safety**: TypeScript complet  

---

## 📋 Plan de Migration

### Phase 1: Migrer `app/api/auth/oauth/github/route.ts`

**Avant (Legacy)**:
```typescript
import { getGitHubOAuthConfig } from "@/lib/oauth/github-config";

export async function GET(request: Request) {
  const config = await getGitHubOAuthConfig("production", request.url);
  if (!config) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
  }

  // Générer URL manuellement
  const state = generateRandomState();
  const authorizationUrl = `${config.baseUrl}/login/oauth/authorize?client_id=${config.clientId}&redirect_uri=${config.callbackUrl}&scope=user:email&state=${state}`;
  
  // Stocker state...
  return NextResponse.redirect(authorizationUrl);
}
```

**Après (Modulaire)**:
```typescript
import { githubOAuthProvider } from "@/lib/oauth/providers/github";
import { generateOAuthState } from "@/lib/oauth/helpers";

export async function GET(request: Request) {
  const isEnabled = await githubOAuthProvider.isEnabled();
  if (!isEnabled) {
    return NextResponse.json({ error: "GitHub OAuth not enabled" }, { status: 500 });
  }

  // Générer state sécurisé
  const state = await generateOAuthState();
  
  // Générer URL via provider (scope inclus automatiquement)
  const authorizationUrl = await githubOAuthProvider.getAuthorizationUrl(state);
  
  // Stocker state dans cookie...
  return NextResponse.redirect(authorizationUrl);
}
```

**Changements**:
- ✅ Utilise `githubOAuthProvider.isEnabled()` au lieu de `getGitHubOAuthConfig()`
- ✅ Utilise `generateOAuthState()` helper pour state sécurisé
- ✅ Utilise `getAuthorizationUrl()` - plus besoin de construire manuellement
- ✅ Scopes gérés automatiquement par le provider

---

### Phase 2: Migrer `app/api/auth/oauth/github/callback/route.ts`

**Avant (Legacy)**:
```typescript
import { getGitHubOAuthConfig } from "@/lib/oauth/github-config";

export async function GET(request: Request) {
  const config = await getGitHubOAuthConfig("production", request.url);
  
  // Échanger code pour token
  const tokenResponse = await fetch(`${config.baseUrl}/login/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    }),
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Récupérer infos utilisateur
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${access_token}` },
  });
  
  const githubUser = await userResponse.json();
  
  // Gérer utilisateur manuellement
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const [newUser] = await db.insert(users).values({ ... }).returning();
    user = newUser;
  }
  
  // Générer JWT...
}
```

**Après (Modulaire)**:
```typescript
import { githubOAuthProvider } from "@/lib/oauth/providers/github";
import { handleOAuthUser, verifyOAuthState } from "@/lib/oauth/helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Vérifier state
  const stateValid = await verifyOAuthState(state, request);
  if (!stateValid) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  // Échanger code pour token (gestion d'erreur incluse)
  const accessToken = await githubOAuthProvider.exchangeCodeForToken(code);
  
  // Récupérer infos utilisateur (gestion d'erreur incluse)
  const githubUser = await githubOAuthProvider.getUserInfo(accessToken);
  
  // Gérer utilisateur via helper (création/mise à jour auto)
  const { user, jwt } = await handleOAuthUser({
    provider: "github",
    providerId: githubUser.id.toString(),
    email: githubUser.email,
    firstName: githubUser.name?.split(" ")[0] || githubUser.login,
    lastName: githubUser.name?.split(" ").slice(1).join(" ") || "",
    avatarUrl: githubUser.avatar_url,
  });
  
  // Cookie déjà configuré par handleOAuthUser
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

**Changements**:
- ✅ Utilise `githubOAuthProvider.exchangeCodeForToken()` - gestion d'erreur intégrée
- ✅ Utilise `githubOAuthProvider.getUserInfo()` - typage automatique
- ✅ Utilise `verifyOAuthState()` helper pour validation
- ✅ Utilise `handleOAuthUser()` - création/mise à jour utilisateur + JWT + cookie automatiques
- ✅ Plus besoin de gérer manuellement la logique utilisateur

---

### Phase 3: Supprimer le Fichier Legacy

**Une fois les routes migrées**:

1. **Vérifier qu'aucun fichier n'importe `github-config.ts`**:
   ```bash
   grep -r "from \"@/lib/oauth/github-config\"" .
   ```

2. **Supprimer le fichier**:
   ```bash
   rm lib/oauth/github-config.ts
   ```

3. **Mettre à jour la documentation** pour supprimer références au legacy

---

## ✅ Checklist de Migration

### Préparation
- [x] Marquer `github-config.ts` comme DEPRECATED
- [x] Créer plan de migration
- [ ] Réviser architecture modulaire

### Migration Routes
- [ ] Migrer `app/api/auth/oauth/github/route.ts`
- [ ] Migrer `app/api/auth/oauth/github/callback/route.ts`
- [ ] Tester flow OAuth complet en dev
- [ ] Tester flow OAuth complet en production

### Nettoyage
- [ ] Vérifier aucune importation de `github-config.ts`
- [ ] Supprimer `lib/oauth/github-config.ts`
- [ ] Mettre à jour documentation

### Documentation
- [ ] Mettre à jour `OAUTH_ARCHITECTURE.md`
- [ ] Supprimer références legacy dans docs
- [ ] Ajouter exemples migration dans README

---

## 🚀 Prochaines Étapes

1. **Migrer les routes** (Phase 1 & 2)
2. **Tester en dev et production**
3. **Supprimer legacy** (Phase 3)
4. **Ajouter Google OAuth** en utilisant `GoogleOAuthProvider` (déjà prêt!)

---

## 📚 Références

- [OAUTH_ARCHITECTURE.md](./OAUTH_ARCHITECTURE.md) - Architecture modulaire
- [OAUTH_GOOGLE_SETUP.md](./OAUTH_GOOGLE_SETUP.md) - Ajouter Google OAuth
- [OAUTH_INDEX.md](./OAUTH_INDEX.md) - Index navigation
