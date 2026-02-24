# Intégration GitHub OAuth avec l'Architecture NeoSAS

## Contexte

NeoSAS utilise un système d'authentification JWT personnalisé au lieu de next-auth. L'intégration GitHub OAuth doit donc être adaptée à cette architecture.

## Architecture d'Authentification Actuelle

### Système JWT Personnalisé

Le projet utilise :
- **Cookies httpOnly** pour stocker les tokens
- **JWT** pour la gestion des sessions
- **API Routes** pour les endpoints d'authentification

Fichiers clés :
- Authentification client : [app/(private)/admin/admin-client-guard.tsx](../app/%28private%29/admin/admin-client-guard.tsx)
- API auth : `/api/auth/me`, `/api/auth/login`, etc.

## Intégration GitHub OAuth

### Option 1 : Flux OAuth Manuel (Recommandé pour NeoSAS)

Créez un flux OAuth personnalisé qui s'intègre au système JWT existant.

#### 1. Créer l'Endpoint de Redirection OAuth

```typescript
// app/api/auth/github/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth non configuré" },
      { status: 500 }
    );
  }

  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.append("client_id", clientId);
  githubAuthUrl.searchParams.append("redirect_uri", redirectUri);
  githubAuthUrl.searchParams.append("scope", "read:user user:email");
  githubAuthUrl.searchParams.append("state", generateRandomState()); // CSRF protection

  return NextResponse.redirect(githubAuthUrl.toString());
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
```

#### 2. Créer le Callback OAuth

```typescript
// app/api/auth/github/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=oauth_failed`);
  }

  try {
    // 1. Échanger le code contre un access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to get access token");
    }

    // 2. Récupérer les informations utilisateur GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const githubUser = await userResponse.json();

    // 3. Récupérer l'email si non public
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const emails = await emailResponse.json();
      email = emails.find((e: any) => e.primary)?.email || emails[0]?.email;
    }

    if (!email) {
      throw new Error("No email found on GitHub account");
    }

    // 4. Trouver ou créer l'utilisateur dans la base de données
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Créer un nouvel utilisateur
      const [newUser] = await db.insert(users).values({
        email,
        name: githubUser.name || githubUser.login,
        emailVerified: new Date(), // Email vérifié via GitHub
        // password: null, // Pas de mot de passe pour OAuth
        // Ajoutez d'autres champs nécessaires
      }).returning();
      user = newUser;
    }

    // 5. Créer une session JWT (adaptez selon votre système)
    const token = await createJWTToken({
      userId: user.id,
      email: user.email,
      // Ajoutez d'autres claims
    });

    // 6. Définir le cookie de session
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[GITHUB OAUTH] Error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=oauth_error`
    );
  }
}

// Fonction utilitaire pour créer un JWT (adaptez selon votre implémentation)
async function createJWTToken(payload: any): Promise<string> {
  // Utilisez votre bibliothèque JWT existante
  // Exemple avec jose :
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}
```

#### 3. Ajouter le Bouton de Connexion GitHub

```typescript
// components/auth/github-login-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function GitHubLoginButton() {
  const handleGitHubLogin = () => {
    window.location.href = "/api/auth/github";
  };

  return (
    <Button
      variant="outline"
      onClick={handleGitHubLogin}
      className="w-full"
    >
      <Github className="mr-2 h-4 w-4" />
      Continuer avec GitHub
    </Button>
  );
}
```

#### 4. Intégrer dans la Page de Connexion

```typescript
// app/auth/login/page.tsx
import { GitHubLoginButton } from "@/components/auth/github-login-button";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      {/* Formulaire de connexion existant */}
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou continuer avec
          </span>
        </div>
      </div>

      <GitHubLoginButton />
    </div>
  );
}
```

---

### Option 2 : Utiliser next-auth (Si Migration Prévue)

Si vous prévoyez de migrer vers next-auth, voici la configuration :

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";

const handler = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Ajouter des informations supplémentaires à la session
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST };
```

**Dépendances à installer** :
```bash
pnpm add next-auth @auth/drizzle-adapter
```

---

## Schéma de Base de Données

Si vous utilisez OAuth, ajoutez ces tables à votre schéma Drizzle :

```typescript
// db/schema.ts

import { pgTable, text, timestamp, primaryKey, integer } from "drizzle-orm/pg-core";

// Table pour les comptes OAuth
export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => ({
  compoundKey: primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
}));

// Table pour les sessions (optionnel, si vous utilisez next-auth)
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// Table pour les tokens de vérification
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));
```

**Mettre à jour la base de données** :
```bash
pnpm db:push
```

---

## Sécurité

### Protections Essentielles

1. **CSRF Protection** :
   - Utilisez un paramètre `state` aléatoire
   - Vérifiez-le dans le callback

2. **Validation Email** :
   - Vérifiez que l'email GitHub est vérifié
   - Gérez les comptes sans email public

3. **Gestion des Erreurs** :
   - Affichez des messages d'erreur génériques
   - Loggez les erreurs détaillées côté serveur

4. **Rate Limiting** :
   - Limitez les tentatives d'OAuth
   - Utilisez Upstash Redis (déjà dans le projet)

---

## Tests

### Test Local

```bash
# 1. Configurer les variables
GITHUB_CLIENT_ID="votre_client_id"
GITHUB_CLIENT_SECRET="votre_client_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 2. Démarrer le serveur
pnpm dev

# 3. Tester le flux
# Allez sur : http://localhost:3000/auth/login
# Cliquez sur "Continuer avec GitHub"
```

### Test de Production

Utilisez les callback URLs de production dans GitHub :
```
https://neosaas.tech/api/auth/github/callback
```

---

## Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : URL de callback incorrecte dans GitHub

**Solution** :
1. Allez sur GitHub → Settings → Developer settings → OAuth Apps
2. Vérifiez que l'URL de callback correspond exactement
3. Format : `https://neosaas.tech/api/auth/github/callback`

### Erreur : "email is null"

**Cause** : L'utilisateur GitHub n'a pas d'email public

**Solution** : Demandez le scope `user:email` et récupérez l'email via `/user/emails`

---

## Références

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [Next.js Authentication Patterns](https://nextjs.org/docs/authentication)
- [Drizzle ORM Adapter](https://authjs.dev/reference/adapter/drizzle)

---

## Prochaines Étapes

1. ✅ Configurez GitHub OAuth via `/admin/api-management`
2. ⬜ Implémentez le flux OAuth manuel (Option 1)
3. ⬜ Ajoutez le bouton GitHub sur la page de connexion
4. ⬜ Testez le flux complet
5. ⬜ Ajoutez la gestion des erreurs
6. ⬜ Documentez pour votre équipe
