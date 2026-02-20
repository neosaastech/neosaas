# Troubleshooting — NeoSaaS

> **Dernière mise à jour :** 20 février 2026

---

## Problème : "Unauthorized" lors de la sauvegarde des paramètres admin (`/admin/settings`)

### Symptôme

Sur la page `/admin/settings`, la sauvegarde des données (onglet Overview / General) échoue avec la notification : **"Unauthorized"** — même pour un utilisateur avec le rôle `super_admin`.

### Cause racine

La route `POST /api/admin/config` (et `GET /api/admin/config`) utilisait `getCurrentUser()` de `lib/auth.ts`, qui lit les rôles **uniquement depuis le JWT token**. Si le JWT ne contient pas le(s) rôle(s) attendu(s), la vérification échoue avec 401.

Cas déclencheurs :
- Le rôle `super_admin` a été assigné à l'utilisateur **après** sa dernière connexion (JWT antérieur au changement de rôle).
- L'utilisateur s'est connecté via le service OAuth (`lib/oauth/oauth-user-service.ts`) qui créait les tokens **sans rôles** (lignes 547-551).
- Le JWT est expiré ou ne contient pas le champ `roles`.

### Correction appliquée (20 février 2026)

**Fichier modifié :** `app/api/admin/config/route.ts`

Remplacement de `getCurrentUser()` (vérification JWT uniquement) par `verifyAdminAuth()` de `lib/auth/admin-auth.ts`, qui effectue une **vérification des rôles en base de données en temps réel**.

```diff
- import { getCurrentUser } from '@/lib/auth';
+ import { verifyAdminAuth } from '@/lib/auth/admin-auth';

  // GET handler
- const currentUser = await getCurrentUser();
- const isAdmin = currentUser?.roles?.some(role => role === 'admin' || role === 'super_admin');
- if (!currentUser || !isAdmin) {
-   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
- }
+ const authResult = await verifyAdminAuth(request);
+ if (!authResult.isAuthenticated || !authResult.isAdmin) {
+   return NextResponse.json({ error: 'Unauthorized' }, { status: authResult.isAuthenticated ? 403 : 401 });
+ }
```

Identique pour le handler `POST`.

### Pourquoi `verifyAdminAuth` est plus fiable

`verifyAdminAuth()` (`lib/auth/admin-auth.ts`) :
1. Vérifie le JWT via `verifyAuth()` (authentification)
2. Interroge directement la table `user_roles` + `roles` en base de données (autorisation)

Cela signifie que **même si le JWT ne contient pas les rôles** (token antérieur à l'assignation du rôle, ou créé sans rôles), l'accès sera correctement accordé si l'utilisateur est bien admin en base.

### Règle générale pour les routes API admin

Toujours utiliser `verifyAdminAuth(request)` ou `withAdminAuth()` depuis `lib/auth/admin-auth.ts` pour les routes `/api/admin/*`, jamais `getCurrentUser()` seul.

---

## Problème secondaire identifié : OAuth User Service sans rôles

**Fichier :** `lib/oauth/oauth-user-service.ts` lignes 547-551

Le `processOAuthUser()` crée des tokens JWT **sans rôles ni permissions**. Si un administrateur se connecte via OAuth, son token sera vide de rôles. Ce problème est indépendant du fix ci-dessus (le fix DB contourne ce problème), mais il reste à corriger dans le service OAuth pour assurer la cohérence des tokens.
