# Guide : Ajouter Google OAuth

Ce guide explique étape par étape comment ajouter l'authentification Google OAuth à votre application.

---

## ✅ Prérequis

- [ ] Architecture OAuth v2.0 implémentée (voir `OAUTH_ARCHITECTURE.md`)
- [ ] Accès à [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Accès admin à `/admin/api` de votre application

---

## 📋 Étapes

### 1. Créer un projet Google Cloud

1. Aller sur https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner un projet existant
3. Nom du projet : `NeoSaaS OAuth`

### 2. Configurer l'écran de consentement OAuth

1. Navigation : **APIs & Services** → **OAuth consent screen**
2. Choisir **External** (utilisateurs non Google Workspace)
3. Remplir les informations :
   - **App name :** NeoSaaS
   - **User support email :** votre@email.com
   - **App logo :** (optionnel)
   - **App domain :** https://www.neosaas.tech
   - **Authorized domains :** neosaas.tech
   - **Developer contact :** votre@email.com
4. **Scopes :** Ajouter les scopes suivants :
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. **Test users :** Ajouter vos emails de test (en mode développement)
6. Sauvegarder

### 3. Créer les credentials OAuth

1. Navigation : **APIs & Services** → **Credentials**
2. Cliquer sur **Create Credentials** → **OAuth client ID**
3. Type : **Web application**
4. Nom : `NeoSaaS Web Client`
5. **Authorized JavaScript origins :**
   ```
   https://www.neosaas.tech
   ```
6. **Authorized redirect URIs :**
   ```
   https://www.neosaas.tech/api/auth/oauth/google/callback
   ```
7. Cliquer **Create**
8. **IMPORTANT :** Copier le **Client ID** et **Client Secret** (vous ne les reverrez qu'une fois !)

### 4. Configurer dans l'application

1. Se connecter à `/admin/api`
2. Cliquer sur **Add Service**
3. Remplir le formulaire :
   - **Service Name :** `google`
   - **Service Type :** `oauth`
   - **Environment :** `production`
   - **Is Active :** ✅ (coché)
   
4. **Config (JSON) :**
   ```json
   {
     "clientId": "VOTRE_CLIENT_ID.apps.googleusercontent.com",
     "clientSecret": "VOTRE_CLIENT_SECRET"
   }
   ```

5. **Metadata (JSON) :**
   ```json
   {
     "callbackUrl": "https://www.neosaas.tech/api/auth/oauth/google/callback",
     "scopes": [
       "https://www.googleapis.com/auth/userinfo.email",
       "https://www.googleapis.com/auth/userinfo.profile",
       "openid"
     ]
   }
   ```

6. Sauvegarder

### 5. Créer les routes API

#### Créer `app/api/auth/oauth/google/route.ts`

```typescript
/**
 * Google OAuth Initiation Route
 */

import { NextRequest, NextResponse } from "next/server";
import { googleOAuthProvider } from "@/lib/oauth/providers/google";
import { getOAuthStateCookieName } from "@/lib/oauth/helpers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔐 [Google OAuth] Initiation de l'authentification");

  try {
    const config = await googleOAuthProvider.getConfiguration("production", request.url);

    if (!config) {
      return NextResponse.json(
        { error: "Google OAuth is not configured" },
        { status: 503 }
      );
    }

    const state = crypto.randomUUID();
    const authUrl = googleOAuthProvider.getAuthorizationUrl(config, state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(getOAuthStateCookieName('google'), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    console.log("✅ [Google OAuth] Redirection vers Google");
    return response;
  } catch (error: any) {
    console.error("❌ [Google OAuth] Erreur:", error);
    return NextResponse.redirect(
      new URL(`/auth/login?error=google_init_failed`, request.url)
    );
  }
}
```

#### Créer `app/api/auth/oauth/google/callback/route.ts`

```typescript
/**
 * Google OAuth Callback Route
 */

import { NextRequest, NextResponse } from "next/server";
import { googleOAuthProvider } from "@/lib/oauth/providers/google";
import { handleOAuthUser, verifyOAuthState, getOAuthStateCookieName } from "@/lib/oauth/helpers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log("🔄 [Google OAuth Callback] Réception du callback");

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error(`❌ [Google OAuth Callback] Erreur Google: ${error}`);
      return NextResponse.redirect(
        new URL(`/auth/login?error=google_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/auth/login?error=missing_code", request.url)
      );
    }

    // Vérifier le state CSRF
    const savedState = request.cookies.get(getOAuthStateCookieName('google'))?.value;
    if (!verifyOAuthState(savedState, state)) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    // Récupérer la config
    const config = await googleOAuthProvider.getConfiguration("production", request.url);
    if (!config) {
      return NextResponse.redirect(
        new URL("/auth/login?error=config_missing", request.url)
      );
    }

    // Échanger le code contre un token
    const tokenResponse = await googleOAuthProvider.exchangeCodeForToken(code, config);
    if (!tokenResponse) {
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    // Récupérer les infos utilisateur
    const userInfo = await googleOAuthProvider.getUserInfo(tokenResponse.accessToken);
    if (!userInfo) {
      return NextResponse.redirect(
        new URL("/auth/login?error=user_fetch_failed", request.url)
      );
    }

    // Créer/mettre à jour l'utilisateur et obtenir le JWT
    const { token } = await handleOAuthUser(userInfo, tokenResponse.accessToken);

    // Redirection avec cookie
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: "/",
    });
    
    response.cookies.delete(getOAuthStateCookieName('google'));

    console.log("✅ [Google OAuth Callback] Authentification réussie");
    return response;
  } catch (error: any) {
    console.error("❌ [Google OAuth Callback] Erreur:", error);
    return NextResponse.redirect(
      new URL(`/auth/login?error=callback_error`, request.url)
    );
  }
}
```

### 6. Ajouter le bouton dans l'UI

Modifier `app/auth/login/page.tsx` et `app/auth/register/page.tsx` :

```tsx
{oauthConfig.google && (
  <Button
    variant="outline"
    className="w-full"
    onClick={() => {
      setIsGoogleLoading(true);
      window.location.href = '/api/auth/oauth/google';
    }}
    disabled={isGoogleLoading || maintenanceMode}
  >
    {isGoogleLoading ? (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <span>Connexion...</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Continuer avec Google</span>
      </div>
    )}
  </Button>
)}
```

### 7. Tester

#### Test en local (développement)

1. Ajouter dans `.env.local` :
   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. Dans Google Cloud Console, ajouter aux redirect URIs :
   ```
   http://localhost:3000/api/auth/oauth/google/callback
   ```

3. Tester :
   ```bash
   npm run dev
   # Visiter http://localhost:3000/auth/login
   # Cliquer "Continue with Google"
   ```

#### Test en production

1. S'assurer que `NEXT_PUBLIC_APP_URL` est défini sur Vercel :
   ```
   NEXT_PUBLIC_APP_URL=https://www.neosaas.tech
   ```

2. Vérifier que l'URL de callback est exacte dans Google Cloud Console

3. Activer le provider dans `/admin/api`

4. Tester sur https://www.neosaas.tech/auth/login

---

## 🔍 Vérification

### Checklist

- [ ] Client ID et Secret créés dans Google Cloud Console
- [ ] Redirect URI configuré : `https://www.neosaas.tech/api/auth/oauth/google/callback`
- [ ] Service `google` créé et actif dans `/admin/api`
- [ ] Routes API créées (`route.ts` et `callback/route.ts`)
- [ ] Bouton Google ajouté dans login/register
- [ ] Variable `NEXT_PUBLIC_APP_URL` définie sur Vercel
- [ ] Test réussi : Clic → Google → Autorisation → Redirection dashboard

### Logs attendus

```
🔐 [Google OAuth] Initiation de l'authentification
🔍 [OAuth google] Récupération de la configuration cryptée (env: production)
✅ [OAuth google] Configuration chargée avec succès
   - Client ID: 123456789...
   - Callback URL: https://www.neosaas.tech/api/auth/oauth/google/callback
   - Base URL: https://www.neosaas.tech
✅ [Google OAuth] Redirection vers Google

🔄 [Google OAuth Callback] Réception du callback
✅ [OAuth google] Connexion existante trouvée
✅ [OAuth google] Token JWT créé
   - User ID: cm4...
   - Email: user@gmail.com
   - Roles: user
   - Permissions: 0 permissions
✅ [Google OAuth Callback] Authentification réussie
```

---

## ❌ Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause :** L'URL de callback ne correspond pas exactement

**Solution :**
1. Vérifier dans Google Cloud Console : URLs **exactement identiques**
2. Vérifier dans DB : `metadata.callbackUrl` exact
3. Pas de slash final : `...callback` (pas `...callback/`)

### Erreur : "invalid_client"

**Cause :** Client ID ou Secret incorrect

**Solution :**
1. Vérifier que vous avez copié le bon Client ID et Secret
2. Pas d'espaces au début/fin
3. Re-générer un nouveau secret si nécessaire

### Erreur : "Access blocked: This app's request is invalid"

**Cause :** Écran de consentement mal configuré

**Solution :**
1. Vérifier que les scopes sont autorisés
2. Vérifier que votre email est dans les test users (mode développement)
3. Publier l'app (passer de "Testing" à "In production")

### Bouton Google n'apparaît pas

**Cause :** Provider non actif dans la config

**Solution :**
1. Vérifier `/admin/api` → service `google` → `isActive` = true
2. Vider le cache navigateur (Ctrl+Shift+R)
3. Vérifier les logs : `/api/auth/oauth/config` doit retourner `google: true`

---

## 🔒 Sécurité

### Bonnes pratiques

- ✅ Garder le Client Secret confidentiel (jamais dans le code)
- ✅ Utiliser HTTPS en production
- ✅ Activer la vérification du state CSRF
- ✅ Limiter les scopes au minimum nécessaire
- ✅ Utiliser des cookies HttpOnly pour les tokens
- ✅ Configurer correctement les domaines autorisés

### Conformité RGPD

- Informer les utilisateurs que Google collecte leurs données
- Ajouter une politique de confidentialité
- Permettre la révocation de la connexion Google
- Ne stocker que les données nécessaires

---

## 📚 Ressources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- Architecture OAuth : `docs/OAUTH_ARCHITECTURE.md`
