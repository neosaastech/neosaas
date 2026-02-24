# Système RGPD et DPO (Data Protection Officer)

## Vue d'ensemble

Le système gère automatiquement la désignation du Responsable RGPD (DPO) et du représentant légal lors de l'installation initiale de la plateforme.

## Champs utilisateurs pour la conformité RGPD

### Champs dans la table `users`

```typescript
isSiteManager: boolean // Représentant légal de l'organisation (pour mentions légales)
isDpo: boolean         // Data Protection Officer / Responsable RGPD
```

## Configuration initiale

### Lors de l'installation

Le premier super administrateur créé lors de l'installation est **automatiquement désigné** comme :
- **DPO (Data Protection Officer)** : `isDpo = true`
- **Site Manager** (représentant légal) : `isSiteManager = true`

### Scripts concernés

1. **`scripts/seed-database.ts`** (seed du super admin)
```typescript
INSERT INTO users (
  email, password, first_name, last_name,
  company_id, is_active, is_dpo, is_site_manager
)
VALUES (
  'admin@exemple.com', ${hashedPassword},
  'Super', 'Admin',
  NULL, true, true, true
)
```

2. **`scripts/seed-database.ts`** (ligne 104-111)
```typescript
await db.insert(users).values({
  email: 'admin@exemple.com',
  username: 'admin',
  password: hashedPassword,
  firstName: 'Super',
  lastName: 'Admin',
  isActive: true,
  isDpo: true,           // ✅ DPO par défaut
  isSiteManager: true    // ✅ Site manager par défaut
})
```

## Utilisation dans les pages légales

### Fonction `getLegalCompanyDetails()`

Localisation : `app/actions/legal.ts` (ligne 159-232)

Cette fonction récupère les informations légales de l'organisation en suivant cette logique :

1. **Cherche le site manager désigné** (`isSiteManager = true`)
2. **Cherche le DPO** (`isDpo = true`)
3. **Fallback sur le premier super admin** si aucun DPO n'est désigné

```typescript
// Cherche le DPO
const dpoUser = await db.query.users.findFirst({
  where: eq(users.isDpo, true)
})

// Fallback sur super admin
const superAdmin = !dpoUser ? await db
  .select({ user: users })
  .from(users)
  .innerJoin(userRoles, eq(users.id, userRoles.userId))
  .innerJoin(roles, eq(userRoles.roleId, roles.id))
  .where(eq(roles.name, 'super_admin'))
  .limit(1)
  .then(res => res[0]?.user) : null

const privacyContactName = dpoUser 
  ? `${dpoUser.firstName} ${dpoUser.lastName}`
  : superAdmin 
    ? `${superAdmin.firstName} ${superAdmin.lastName}`
    : null
```

### Page Privacy Policy

Localisation : `app/(public)/legal/privacy/page.tsx`

Affiche automatiquement le nom du DPO dans les informations légales :

```tsx
{company.superAdminName && (
  <div>
    <p className="text-sm text-muted-foreground mb-1">Super Admin / DPO</p>
    <p className="font-medium">{company.superAdminName}</p>
  </div>
)}
```

## Correction de l'erreur 500 sur `/legal/terms`

### Problème identifié

La page `/legal/terms` renvoyait une erreur 500 lorsqu'aucun terme de service n'était publié dans la base de données.

**Cause** :
- La fonction `getLatestTos()` retourne `{ success: true, data: undefined }` quand aucun ToS n'existe
- La page vérifiait `if (!tos)` au lieu de `if (!tos.data)`
- Ensuite, elle tentait d'accéder à `tos.version` → erreur 500

### Solution implémentée

**Fichier** : `app/(public)/legal/terms/page.tsx`

```typescript
export default async function TermsOfServicePage() {
  const tosResult = await getLatestTos()
  const config = await getPlatformConfig()

  // ✅ Vérification correcte
  if (!tosResult.success || !tosResult.data) {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>
        <p>No terms of service have been published yet.</p>
        <p className="text-sm text-muted-foreground">
          If you are an administrator, please create and publish 
          the Terms of Service from the admin panel.
        </p>
      </div>
    )
  }

  const tos = tosResult.data // ✅ Extraction sécurisée

  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Terms of Service</h1>
      <p className="lead">
        Version {tos.version} - 
        Effective Date: {new Date(tos.effectiveDate).toLocaleDateString()}
      </p>
      {/* ... */}
    </div>
  )
}
```

## Gestion des rôles RGPD

### Désigner un nouveau DPO

Pour désigner un autre utilisateur comme DPO :

```typescript
// Retirer le DPO actuel
await db.update(users)
  .set({ isDpo: false })
  .where(eq(users.isDpo, true))

// Désigner le nouveau DPO
await db.update(users)
  .set({ isDpo: true })
  .where(eq(users.id, newDpoUserId))
```

### Désigner un nouveau Site Manager

Pour désigner un nouveau représentant légal :

```typescript
// Retirer le site manager actuel
await db.update(users)
  .set({ isSiteManager: false })
  .where(eq(users.isSiteManager, true))

// Désigner le nouveau site manager
await db.update(users)
  .set({ isSiteManager: true })
  .where(eq(users.id, newSiteManagerId))
```

## Recommandations

### Pour les nouveaux déploiements

1. ✅ Lors de l'installation initiale, le super admin est **automatiquement DPO et Site Manager**
2. ✅ Aucune configuration manuelle n'est requise
3. ✅ Les pages légales (`/legal/privacy`, `/legal/terms`) fonctionnent immédiatement

### Pour les déploiements existants

Si vous avez déjà un super admin créé avant cette mise à jour :

```sql
-- Mettre à jour le premier super admin pour être DPO et Site Manager
UPDATE users 
SET is_dpo = true, is_site_manager = true 
WHERE email = 'admin@exemple.com';
```

### Configuration via l'interface admin

**TODO** : Créer une interface dans `/admin/settings` pour :
- Désigner le DPO
- Désigner le Site Manager
- Afficher l'historique des désignations

## Conformité RGPD

### Informations affichées publiquement

Sur la page `/legal/privacy`, les informations suivantes sont affichées :
- Nom de l'organisation / représentant légal
- Adresse complète
- Téléphone et email de contact
- SIRET et numéro de TVA (si applicable)
- **Nom du DPO** (super admin / responsable RGPD)

### Contact pour les demandes RGPD

Les utilisateurs peuvent contacter le DPO via :
- Email affiché sur la page Privacy Policy
- Formulaire de contact (si implémenté)
- Email de plateforme : `config.defaultSenderEmail`

## Schéma de la base de données

```sql
-- Table users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_site_manager BOOLEAN DEFAULT false,  -- Représentant légal
  is_dpo BOOLEAN DEFAULT false,            -- Data Protection Officer
  -- ... autres champs
);

-- Index pour accès rapide
CREATE INDEX idx_users_is_dpo ON users(is_dpo) WHERE is_dpo = true;
CREATE INDEX idx_users_is_site_manager ON users(is_site_manager) WHERE is_site_manager = true;
```

## Résumé des modifications

### Fichiers modifiés

1. ✅ `scripts/seed-database.ts` - Ajout `isDpo` et `isSiteManager` lors du seed (source de vérité pour le seeding)
2. ✅ `db/schema.ts` - Champs `is_dpo` et `is_site_manager` définis dans le schéma Drizzle
3. ✅ `app/(public)/legal/terms/page.tsx` - Correction gestion ToS manquants

### Fichiers déjà corrects

1. ✅ `app/actions/legal.ts` - Fonction `getLegalCompanyDetails()` gère déjà le DPO
2. ✅ `app/(public)/legal/privacy/page.tsx` - Affiche déjà le DPO correctement
3. ✅ `db/schema.ts` - Champs `isDpo` et `isSiteManager` déjà définis

## Tests recommandés

### Test 1 : Installation fraîche
```bash
# Réinitialiser la base de données
npm run db:push

# Vérifier que le super admin est DPO
# Se connecter à admin@exemple.com / admin
# Vérifier /legal/privacy affiche bien le DPO
```

### Test 2 : Absence de ToS
```bash
# Accéder à /legal/terms
# Vérifier qu'un message amical s'affiche (pas d'erreur 500)
```

### Test 3 : Avec ToS publié
```bash
# Créer et publier un ToS depuis l'admin
# Accéder à /legal/terms
# Vérifier l'affichage correct
```

## Support et maintenance

Pour toute question ou modification du système RGPD :
1. Consulter ce document
2. Vérifier la fonction `getLegalCompanyDetails()` dans `app/actions/legal.ts`
3. Vérifier les champs `isDpo` et `isSiteManager` dans `db/schema.ts`

---

**Date de création** : 2024  
**Dernière mise à jour** : 2024  
**Version** : 1.0
