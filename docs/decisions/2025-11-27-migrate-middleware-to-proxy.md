# Migration de middleware.ts vers proxy.ts (Next.js 16)

**Date** : 2025-11-27  
**Statut** : ✅ Implémenté  
**Décision** : Migrer de `middleware.ts` vers `proxy.ts` pour Next.js 16

## Contexte

Next.js 16 a introduit un changement majeur en remplaçant `middleware.ts` par `proxy.ts`. Cette décision vise à séparer clairement :
- **Logique Edge** (redirections, headers) → `proxy.ts`
- **Logique Métier** (auth, validation) → Server Components/Functions

## Décision

Nous avons migré notre middleware selon cette nouvelle architecture :

### 1. **proxy.ts** - Logique Edge Simple

Contient uniquement :
- Mode maintenance (redirections simples)
- Pas de vérification JWT
- Pas de logique métier complexe

```typescript
// proxy.ts
export function proxy(request: NextRequest) {
  // Simple maintenance redirect
  if (isMaintenanceMode && !path.startsWith("/maintenance")) {
    return NextResponse.redirect(new URL("/maintenance", request.url))
  }
  return NextResponse.next()
}
```

### 2. **lib/auth/server.ts** - Utilitaires d'Authentification

Fonctions serveur pour gérer l'authentification :

- `requireAuth()` - Requiert l'authentification, redirige sinon
- `isAuthenticated()` - Vérifie si l'utilisateur est connecté
- `getCurrentUser()` - Récupère l'utilisateur actuel
- `verifyAuth()` - Vérifie le token JWT

### 3. **Layouts avec Vérification d'Auth**

#### Private Layout (`app/(private)/layout.tsx`)
```typescript
export default async function PrivateLayout({ children }) {
  await requireAuth() // Redirects to login if not authenticated
  return <PrivateLayoutClient>{children}</PrivateLayoutClient>
}
```

#### Auth Layout (`app/auth/layout.tsx`)
```typescript
export default async function AuthLayout({ children }) {
  if (await isAuthenticated()) {
    redirect("/dashboard") // Redirect logged-in users away
  }
  return <>{children}</>
}
```

## Avantages

✅ **Séparation des responsabilités** - Edge vs Business Logic  
✅ **Performance** - Auth vérifiée uniquement sur routes concernées  
✅ **Maintenabilité** - Code plus clair et modulaire  
✅ **Type Safety** - Meilleure typage avec Server Components  
✅ **Conformité Next.js 16** - Suit les nouvelles conventions

## Migration depuis l'ancien middleware

| Ancien (middleware.ts) | Nouveau |
|------------------------|---------|
| Maintenance redirects | `proxy.ts` |
| JWT verification | `lib/auth/server.ts` |
| Protected routes | `app/(private)/layout.tsx` |
| Auth page redirects | `app/auth/layout.tsx` |

## Impacts

- ✅ Aucun impact sur les fonctionnalités
- ✅ Même comportement utilisateur
- ✅ Meilleure performance (vérifications ciblées)
- ⚠️ Nécessite Next.js 16+

## Références

- [Next.js 16 Proxy Documentation](https://nextjs.org/docs/app/api-reference/cli/next#next-lint-options)
- [Server Components & Auth](https://nextjs.org/docs/app/building-your-application/authentication)

