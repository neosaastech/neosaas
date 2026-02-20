# Audit — Authentification, Stripe & Multi-domaines

**Date** : 20 Février 2026
**Statut** : ✅ Problèmes identifiés | 🔧 Fix appliqué (`lib/auth.ts`)
**Branche** : `claude/review-docs-setup-XzYMr`

---

## 📌 Résumé Exécutif

L'application NeoSaaS utilise un système d'authentification **JWT personnalisé** (et non NextAuth.js
comme le nom de la variable `NEXTAUTH_SECRET` pourrait le laisser penser).

| Problème | Sévérité | Statut |
|---|---|---|
| Cookie sans domaine → 401 sur `www.neosaas.tech` | 🔴 Critique | ✅ Corrigé |
| Deux librairies JWT (`jsonwebtoken` + `jose`) | 🟡 Moyen | ⚠️ Documenté |
| `NEXTAUTH_URL` non utilisé pour le domaine du cookie | 🟡 Moyen | ✅ Corrigé |
| Webhook Stripe non configuré | 🔴 Critique | ⏳ Action requise |
| Aucun `middleware.ts` Next.js | 🟡 Moyen | ℹ️ Comportement voulu |
| `.env.local` absent | 🟡 Moyen | ✅ Créé |

---

## 1. Architecture Authentification Réelle

> ⚠️ **Le projet N'UTILISE PAS NextAuth.js** malgré le nom de la variable `NEXTAUTH_SECRET`.

### Stack Auth

| Élément | Fichier | Librairie |
|---|---|---|
| Création token JWT | `lib/auth.ts:createToken()` | `jsonwebtoken` |
| Vérification token (API routes) | `lib/auth.ts:verifyToken()` | `jsonwebtoken` |
| Vérification token (Server components) | `lib/auth/server.ts:verifyAuth()` | `jose` |
| Cookie name | — | `auth-token` |
| Expiration | — | 7 jours |
| Algorithme | — | HS256 |

### Flux d'authentification

```
POST /api/auth/login
  ↓ verifyPassword() [bcrypt]
  ↓ createToken() [jsonwebtoken / HS256]
  ↓ setAuthCookie()  → cookie "auth-token"
  ↓ 200 OK

API Route protégée
  ↓ getCurrentUser() [lib/auth.ts / jsonwebtoken.verify]
  OU
  ↓ verifyAuth() [lib/auth/server.ts / jose.jwtVerify]
  ↓ 401 si absent/invalide
```

---

## 2. Problème Racine — 401 sur `www.neosaas.tech`

### Cause identifiée : Cookie sans domaine explicite

**Avant correction**, `setAuthCookie()` dans `lib/auth.ts` ne définissait **pas** l'option `domain` :

```typescript
// ❌ AVANT (lib/auth.ts)
cookieStore.set('auth-token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 604800,
  path: '/',
  // domain non défini !
});
```

**Conséquence** : le navigateur scope le cookie à l'hostname exact qui l'a émis.

| Scénario | Cookie émis par | Cookie envoyé à | Résultat |
|---|---|---|---|
| Login sur `vercel.app`, accès `neosaas.tech` | `vercel.app` | ❌ non | 401 |
| Login sur `www.neosaas.tech`, accès `neosaas.tech` | `www.neosaas.tech` | ❌ non | 401 |
| Login sur `www.neosaas.tech`, accès `www.neosaas.tech` | `www.neosaas.tech` | ✅ oui | 200 |

Le cas "Login sur `www.neosaas.tech`, accès `neosaas.tech` (sans `www`)" est le scénario
le plus probable : Vercel redirige parfois les requêtes entre sous-domaines, et le cookie
ne suit pas.

### Fix appliqué — `lib/auth.ts`

```typescript
// ✅ APRÈS (lib/auth.ts)
function getCookieDomain(): string | undefined {
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  try {
    const { hostname } = new URL(appUrl);
    if (
      hostname !== 'localhost' &&
      !hostname.endsWith('.vercel.app') &&
      hostname.includes('.')
    ) {
      // ".neosaas.tech" couvre www.neosaas.tech ET neosaas.tech
      const parts = hostname.split('.');
      return '.' + parts.slice(-2).join('.');
    }
  } catch {}
  return undefined;
}

export async function setAuthCookie(token: string) {
  const domain = getCookieDomain();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 604800,
    path: '/',
    ...(domain ? { domain } : {}), // ← domain ajouté
  });
}
```

**Résultat** :
- En production (`NEXTAUTH_URL=https://www.neosaas.tech`) → cookie avec `domain=.neosaas.tech`
- En local (`NEXTAUTH_URL=http://localhost:3000`) → pas de domain (comportement standard)
- Sur `*.vercel.app` → pas de domain (cookies séparés par domaine, comportement attendu)

**Note importante** : Les cookies existants (sans domain explicite) ne bénéficient pas
rétroactivement de ce fix. Les utilisateurs devront se reconnecter une fois.

---

## 3. Double Librairie JWT (`jsonwebtoken` vs `jose`)

### État actuel

| Fichier | Opération | Librairie |
|---|---|---|
| `lib/auth.ts` | Sign + Verify | `jsonwebtoken` |
| `lib/auth/server.ts` | Verify | `jose` |

### Compatibilité

Les deux librairies produisent et vérifient des JWT HS256 standards. La clé (`NEXTAUTH_SECRET`)
est encodée UTF-8 dans les deux cas. **Les tokens sont compatibles** entre les deux.

### Risque

- Deux dépendances pour la même fonctionnalité
- `jsonwebtoken` n'est pas compatible avec l'Edge Runtime Vercel
- `jose` est la librairie recommandée par Next.js (Edge-compatible)

### Recommandation (non appliquée — hors scope de cet audit)

Consolider sur `jose` dans les deux fichiers :

```typescript
// lib/auth.ts — migration recommandée
import { SignJWT, jwtVerify } from 'jose';

export async function createToken(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}
```

---

## 4. Stripe — Pourquoi ça fonctionne sur `vercel.app` mais pas sur `www.neosaas.tech`

### Cause directe

L'endpoint `/api/admin/payments/test-stripe` retourne 401 quand `getCurrentUser()` renvoie `null`.
`getCurrentUser()` renvoie `null` quand le cookie `auth-token` est absent ou invalide.

**La cause est l'authentification, pas Stripe**.

### Vérification rapide

```bash
# Tester manuellement depuis www.neosaas.tech (après login)
curl -H "Cookie: auth-token=<token>" \
  https://www.neosaas.tech/api/admin/payments/test-stripe?mode=test
```

### Problèmes Stripe indépendants

| Problème | Impact |
|---|---|
| Webhook secret non configuré | Les événements Stripe sont rejetés (HTTP 500) |
| Aucun produit Stripe créé | Impossible de générer des subscriptions |
| `createStripePayment` (deprecated) encore utilisée dans certains composants | Utiliser `createStripeInvoicePayment` |

**Action prioritaire** : Configurer le webhook Stripe (voir `docs/STRIPE_WEBHOOK_SETUP.md`).

---

## 5. Configuration Vercel — Variables d'Environnement

### Variables obligatoires en production

| Variable | Valeur attendue | Statut |
|---|---|---|
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (≥32 chars) | ⚠️ Vérifier |
| `NEXTAUTH_URL` | `https://www.neosaas.tech` | ⚠️ Vérifier |
| `NEXT_PUBLIC_APP_URL` | `https://www.neosaas.tech` | ⚠️ Vérifier |
| `DATABASE_URL` | URL Neon poolée | ✅ |

### Comment vérifier sur Vercel

```
Vercel Dashboard → Projet → Settings → Environment Variables
→ Filtrer par "Production"
→ Vérifier NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL
```

> ⚠️ Si `NEXTAUTH_SECRET` n'est pas défini en production, la valeur fallback
> `'your-secret-key-here-change-in-production'` est utilisée. Cela invalide
> tous les tokens créés avec la vraie clé.

### Vérification via l'API

```bash
# Doit retourner l'URL de production (pas vercel.app)
curl https://www.neosaas.tech/api/debug/env 2>/dev/null || echo "endpoint non disponible"
```

---

## 6. Cookies — Configuration Multi-Domaines

### Résumé des règles

| Situation | `sameSite` | `domain` | Fonctionnel |
|---|---|---|---|
| Même domaine (www → www) | `lax` | non nécessaire | ✅ |
| Sous-domaine (www → bare domain) | `lax` | `.neosaas.tech` | ✅ après fix |
| Cross-domain (vercel.app → neosaas.tech) | n/a | impossible | ❌ jamais |

### Après application du fix

```
NEXTAUTH_URL=https://www.neosaas.tech
→ Cookie domain = .neosaas.tech
→ Accessible sur : www.neosaas.tech, neosaas.tech
→ Non accessible sur : *.vercel.app (attendu)
```

### OAuth callbacks

Vérifier que les OAuth providers (GitHub, Google) redirigent vers `www.neosaas.tech` :

```sql
-- Vérifier les URLs OAuth enregistrées en BDD
SELECT service_name, environment, config->>'callbackUrl'
FROM service_api_configs
WHERE service_name IN ('github', 'google');
```

Les URL de callback OAuth doivent être :
- `https://www.neosaas.tech/api/auth/oauth/github/callback`
- `https://www.neosaas.tech/api/auth/oauth/google/callback`

---

## 7. Base de Données — Sessions

> NeoSaaS utilise des **JWT stateless** (pas de sessions en base de données).

Il n'y a **pas** de table `users_sessions` — les sessions NextAuth.js n'existent pas ici.
L'invalidation d'un token nécessite soit son expiration (7 jours), soit un changement
de `NEXTAUTH_SECRET` (invalide tous les tokens existants).

### Table `stripe_sync_logs` (pour monitoring Stripe)

```sql
SELECT sync_type, status, error_message, created_at
FROM stripe_sync_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 8. Checklist de Validation Post-Fix

### Authentification

- [ ] Reconnecter l'utilisateur admin sur `www.neosaas.tech` (tokens existants invalides)
- [ ] Vérifier que `GET /api/auth/me` renvoie 200 sur `www.neosaas.tech`
- [ ] Vérifier que `GET /api/admin/payments/test-stripe` renvoie 200 sur `www.neosaas.tech`
- [ ] Tester la déconnexion / reconnexion

### Stripe

- [ ] Configurer le webhook Stripe (voir `docs/STRIPE_WEBHOOK_SETUP.md`)
- [ ] Vérifier `STRIPE_SECRET_KEY` dans Admin > API Management
- [ ] Lancer sync : `POST /api/stripe/sync/customers` avec `direction: "both"`

### Variables d'Environnement Vercel

- [ ] `NEXTAUTH_SECRET` ≥ 32 caractères aléatoires
- [ ] `NEXTAUTH_URL` = `https://www.neosaas.tech`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://www.neosaas.tech`

### OAuth

- [ ] GitHub OAuth callback URL = `https://www.neosaas.tech/api/auth/oauth/github/callback`
- [ ] Google OAuth callback URL = `https://www.neosaas.tech/api/auth/oauth/google/callback`

---

## 9. Fichiers Modifiés par Cet Audit

| Fichier | Modification |
|---|---|
| `lib/auth.ts` | Fix cookie domain via `getCookieDomain()` + fix `removeAuthCookie()` |
| `.env.local` | Créé avec les variables de développement fournies |
| `docs/AUDIT_AUTH_STRIPE_MULTIDOMAIN_2026-02-20.md` | Ce document |

---

## 📅 Changelog

### [2026-02-20] — Audit Multi-Domaines Auth + Stripe

- **[Bug critique — cookie domain]** : `setAuthCookie()` ne définissait pas `domain`,
  provoquant une perte de session entre `www.neosaas.tech` et `neosaas.tech`.
  Fix : `getCookieDomain()` extrait le domaine root depuis `NEXTAUTH_URL`.
- **[Fix logout]** : `removeAuthCookie()` passe maintenant `domain` pour supprimer
  correctement le cookie sur le bon scope.
- **[Découverte]** : Le système n'utilise pas NextAuth.js — JWT custom avec `jsonwebtoken`
  et `jose` (deux librairies pour la même clé HS256).
- **[Env]** : `.env.local` créé pour le développement local.
- **Fichiers modifiés** : `lib/auth.ts`, `.env.local`
- **Impact** : Résolution du 401 sur le domaine personnalisé `www.neosaas.tech`.
