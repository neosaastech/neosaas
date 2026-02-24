# OAuth Social Authentication - Guide Complet

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète du système d'authentification sociale avec OAuth2 pour GitHub et Google dans NeoSaaS.

### Caractéristiques

- ✅ **Authentification GitHub OAuth**
- ✅ **Authentification Google OAuth**
- ✅ **Gestion Admin des providers**
- ✅ **Chiffrement des tokens (AES-256-GCM)**
- ✅ **Liaison de comptes multiples**
- ✅ **Cohérence UX (Sheet pattern)**

---

## 🗂️ Architecture

### 1. Base de données

**Table : `oauth_connections`**

Stocke les connexions OAuth des utilisateurs avec chiffrement des tokens sensibles.

```typescript
// db/schema.ts
export const oauthConnections = pgTable("oauth_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // 'github' | 'google'
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  accessToken: text("access_token").notNull(), // Chiffré AES-256-GCM
  refreshToken: text("refresh_token"), // Chiffré AES-256-GCM
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  metadata: jsonb("metadata"), // Photo de profil, nom complet, etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Index unique pour éviter les doublons
.unique("unique_provider_user", ["provider", "providerUserId"])
```

**Relations :**
```typescript
export const oauthConnectionsRelations = relations(oauthConnections, ({ one }) => ({
  user: one(users, {
    fields: [oauthConnections.userId],
    references: [users.id],
  }),
}))
```

**Types TypeScript :**
```typescript
export type OAuthConnection = typeof oauthConnections.$inferSelect
export type NewOAuthConnection = typeof oauthConnections.$inferInsert
```

---

### 2. Interface Admin

#### 2.1 Activation des providers (`/admin/settings`)

**Fichier : `app/(private)/admin/settings/page.tsx`**

Module **"Social Media Connection"** permettant d'activer/désactiver les providers OAuth.

```typescript
// État
const [socialAuthEnabled, setSocialAuthEnabled] = useState({
  github: false,
  google: false,
})

// Sauvegarde
const saveConfig = async () => {
  const config = {
    // ... autres configs
    socialAuthEnabled: JSON.stringify(socialAuthEnabled),
  }
  // POST vers /api/admin/config
}

// Chargement
const loadConfig = async () => {
  // GET depuis /api/admin/config
  if (config.socialAuthEnabled) {
    setSocialAuthEnabled(JSON.parse(config.socialAuthEnabled))
  }
}
```

**UI Card :**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Share2 className="h-5 w-5 text-[#CD7F32]" />
      Social Media Connection
    </CardTitle>
    <CardDescription>
      Enable social authentication providers for your platform
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* GitHub Toggle */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Github className="h-5 w-5" />
        <div>
          <Label htmlFor="github-auth">GitHub</Label>
          <p className="text-xs text-muted-foreground">
            Allow users to sign in with GitHub
          </p>
        </div>
      </div>
      <Switch
        id="github-auth"
        checked={socialAuthEnabled.github}
        onCheckedChange={(checked) => {
          setSocialAuthEnabled({ ...socialAuthEnabled, github: checked })
        }}
      />
    </div>

    {/* Google Toggle */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Google SVG Icon */}
        <div>
          <Label htmlFor="google-auth">Google</Label>
          <p className="text-xs text-muted-foreground">
            Allow users to sign in with Google
          </p>
        </div>
      </div>
      <Switch
        id="google-auth"
        checked={socialAuthEnabled.google}
        onCheckedChange={(checked) => {
          setSocialAuthEnabled({ ...socialAuthEnabled, google: checked })
        }}
      />
    </div>

    {/* Lien vers configuration API */}
    {(socialAuthEnabled.github || socialAuthEnabled.google) && (
      <div className="pt-3 border-t">
        <p className="text-sm text-muted-foreground mb-2">
          Configure OAuth credentials in API Management
        </p>
        <Link href="/admin/api">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure APIs
          </Button>
        </Link>
      </div>
    )}
  </CardContent>
</Card>
```

---

#### 2.2 Configuration des credentials (`/admin/api`)

**Fichier : `app/(private)/admin/api/page.tsx`**

Gestion des Client ID et Client Secret pour GitHub et Google avec **Sheet pattern** (UX cohérence).

**Modifications apportées :**

1. **Ajout des services OAuth :**
```typescript
const services = [
  // ... services existants
  { 
    id: "github", 
    name: "GitHub OAuth", 
    description: "GitHub OAuth authentication provider",
    type: "oauth" as const 
  },
  { 
    id: "google", 
    name: "Google OAuth", 
    description: "Google OAuth authentication provider",
    type: "oauth" as const 
  },
]
```

2. **États de configuration :**
```typescript
const [githubConfig, setGithubConfig] = useState({
  clientId: "",
  clientSecret: "",
  redirectUri: "",
})

const [googleConfig, setGoogleConfig] = useState({
  clientId: "",
  clientSecret: "",
  redirectUri: "",
})
```

3. **ServiceIcon avec GitHub et Google :**
```typescript
const ServiceIcon = ({ service, size = "md" }: ServiceIconProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  }

  switch (service.id) {
    case "github":
      return (
        <svg className={sizeClasses[size]} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    
    case "google":
      return (
        <svg className={sizeClasses[size]} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )
    
    // ... autres services
  }
}
```

4. **handleSave avec validation OAuth :**
```typescript
const handleSave = async () => {
  // ... code existant
  
  switch (selectedService) {
    case "github":
      if (!githubConfig.clientId || !githubConfig.clientSecret) {
        toast.error("Please provide GitHub Client ID and Client Secret")
        return
      }
      credentials = {
        clientId: githubConfig.clientId,
        clientSecret: githubConfig.clientSecret,
      }
      metadata.redirectUri = githubConfig.redirectUri
      break

    case "google":
      if (!googleConfig.clientId || !googleConfig.clientSecret) {
        toast.error("Please provide Google Client ID and Client Secret")
        return
      }
      credentials = {
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
      }
      metadata.redirectUri = googleConfig.redirectUri
      break
    
    // ... autres cases
  }
}
```

5. **renderConfigFields avec GitHub et Google :**
```typescript
const renderConfigFields = () => {
  switch (selectedService) {
    case "github":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client ID *</Label>
            <Input
              type="text"
              placeholder="Iv1.1234567890abcdef"
              value={githubConfig.clientId}
              onChange={(e) => setGithubConfig({ ...githubConfig, clientId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Found in GitHub OAuth App settings
            </p>
          </div>
          <div className="space-y-2">
            <Label>Client Secret *</Label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                placeholder="Client Secret"
                value={githubConfig.clientSecret}
                onChange={(e) => setGithubConfig({ ...githubConfig, clientSecret: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Redirect URI</Label>
            <Input
              type="text"
              placeholder="https://yourdomain.com/api/auth/oauth/github/callback"
              value={githubConfig.redirectUri}
              onChange={(e) => setGithubConfig({ ...githubConfig, redirectUri: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Must match the callback URL configured in GitHub OAuth App
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Setup:</strong>{" "}
              <a 
                href="https://github.com/settings/developers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Create a GitHub OAuth App
              </a>
            </p>
          </div>
        </div>
      )

    case "google":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client ID *</Label>
            <Input
              type="text"
              placeholder="123456789012-abc...apps.googleusercontent.com"
              value={googleConfig.clientId}
              onChange={(e) => setGoogleConfig({ ...googleConfig, clientId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Found in Google Cloud Console → Credentials
            </p>
          </div>
          <div className="space-y-2">
            <Label>Client Secret *</Label>
            <div className="relative">
              <Input
                type={showSecretKey ? "text" : "password"}
                placeholder="GOCSPX-..."
                value={googleConfig.clientSecret}
                onChange={(e) => setGoogleConfig({ ...googleConfig, clientSecret: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
              >
                {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Redirect URI</Label>
            <Input
              type="text"
              placeholder="https://yourdomain.com/api/auth/oauth/google/callback"
              value={googleConfig.redirectUri}
              onChange={(e) => setGoogleConfig({ ...googleConfig, redirectUri: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Must match authorized redirect URIs in Google Console
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>Setup:</strong>{" "}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline"
              >
                Create OAuth 2.0 credentials
              </a>
            </p>
          </div>
        </div>
      )
    
    // ... autres cases
  }
}
```

6. **Dialog → Sheet (UX cohérence) :**
```tsx
{/* AVANT : Dialog */}
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    {/* ... */}
  </DialogContent>
</Dialog>

{/* APRÈS : Sheet */}
<Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
  <SheetContent className="max-w-xl overflow-y-auto">
    <SheetHeader>
      <SheetTitle className="flex items-center gap-2">
        <Key className="h-5 w-5 text-[#CD7F32]" />
        {editingConfig ? "Edit API Configuration" : "Add New API Configuration"}
      </SheetTitle>
      <SheetDescription>
        {editingConfig
          ? "Update the API configuration below"
          : "Configure a new external service integration"}
      </SheetDescription>
    </SheetHeader>

    {/* Contenu */}
    
    <SheetFooter className="gap-2 flex-col sm:flex-row mt-6">
      <Button variant="outline" onClick={() => setDialogOpen(false)}>
        Cancel
      </Button>
      <Button variant="outline" onClick={handleTestInModal}>
        Vérifier la clé
      </Button>
      <Button className="bg-[#CD7F32] hover:bg-[#B8691C]" onClick={handleSave}>
        {editingConfig ? "Update" : "Save"} Configuration
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

## 🔐 Sécurité

### 1. Chiffrement des tokens

Tous les `accessToken` et `refreshToken` sont chiffrés avec **AES-256-GCM** avant stockage en base de données.

**Utilisation :**
```typescript
import { encrypt, decrypt } from "@/lib/encryption"

// Sauvegarde
const encryptedAccessToken = encrypt(plainAccessToken)
const encryptedRefreshToken = encrypt(plainRefreshToken)

await db.insert(oauthConnections).values({
  userId,
  provider: "github",
  accessToken: encryptedAccessToken,
  refreshToken: encryptedRefreshToken,
  // ...
})

// Lecture
const connection = await db.query.oauthConnections.findFirst({ where: ... })
const plainAccessToken = decrypt(connection.accessToken)
const plainRefreshToken = decrypt(connection.refreshToken)
```

### 2. Variables d'environnement

**`.env.local` :**
```bash
# OAuth GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OAuth Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Encryption
ENCRYPTION_KEY=your_32_byte_encryption_key

# URL de base
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

---

## 📦 Prochaines étapes (TODO)

### Tâche 4 : Routes API OAuth
**Fichier : `app/api/auth/oauth/[provider]/route.ts`**

Implémenter :
- GET handler pour rediriger vers le provider OAuth
- Callback handler pour échanger le code contre un token
- Stockage sécurisé dans `oauth_connections`

### Tâche 5 : Page de connexion
**Fichier : `app/auth/login/page.tsx`**

Modifier :
- Rendre le bouton Google existant fonctionnel
- Ajouter un bouton GitHub
- Les deux appellent `/api/auth/oauth/[provider]`

### Tâche 6 : Server Actions OAuth
**Fichier : `app/actions/oauth.ts`**

Créer :
- `linkOAuthAccount(userId, provider, oauthData)`
- `unlinkOAuthAccount(userId, provider)`
- `getOAuthConnections(userId)`
- `refreshOAuthToken(connectionId)`

### Tâche 7 : Tests et validation
- Tester le flux complet GitHub OAuth
- Tester le flux complet Google OAuth
- Vérifier la liaison de comptes multiples
- Valider le chiffrement/déchiffrement des tokens

---

## 📚 Références

### GitHub OAuth
- [Documentation officielle](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [Scopes disponibles](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)

### Google OAuth
- [Documentation officielle](https://developers.google.com/identity/protocols/oauth2)
- [Configuration OAuth 2.0](https://support.google.com/cloud/answer/6158849)

### Architecture NeoSaaS
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture générale
- [AUTHENTICATION_ONBOARDING.md](./AUTHENTICATION_ONBOARDING.md) - Système d'authentification
- [ADMIN_UX_PATTERNS.md](./ADMIN_UX_PATTERNS.md) - Patterns UX Admin

---

## ✅ Statut d'implémentation

| Tâche | Fichier | Statut | Notes |
|-------|---------|--------|-------|
| 1. Schéma DB OAuth | `db/schema.ts` | ✅ Complété | Table + relations + types |
| 2. Admin Settings UI | `app/(private)/admin/settings/page.tsx` | ✅ Complété | Toggles GitHub/Google |
| 3. Admin API Manager | `app/(private)/admin/api/page.tsx` | ✅ Complété | Config OAuth + Sheet UX |
| 4. Routes API OAuth | `app/api/auth/oauth/[provider]/route.ts` | ⏳ À faire | Endpoints OAuth |
| 5. Page Login | `app/auth/login/page.tsx` | ⏳ À faire | Boutons fonctionnels |
| 6. Server Actions | `app/actions/oauth.ts` | ⏳ À faire | Actions serveur |
| 7. Documentation | `docs/OAUTH_SOCIAL_AUTH.md` | ✅ Complété | Ce fichier |

---

**Dernière mise à jour :** {{ date }}
**Auteur :** NeoSaaS Development Team
