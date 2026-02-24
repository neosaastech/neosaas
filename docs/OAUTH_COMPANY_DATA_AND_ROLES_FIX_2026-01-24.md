# 🏢 OAuth Company Data & Writer Role Fix - 24 January 2026

**Date**: 24 January 2026
**Type**: Feature Enhancement + Bug Fix
**Severity**: Medium (Role) + High (Company Data)
**Status**: ✅ Fixed

---

## 🐛 Problems Identified

### 1. Missing "Writer" Role Assignment

**Issue**: Users created via OAuth were displaying "User" role instead of "Writer"

**Root Cause**:
- Role "writer" was only assigned to **new users** (CAS 2B: Nouvel utilisateur)
- **Existing users** linking OAuth (CAS 2A: Utilisateur existant) didn't receive role assignment
- This left users without proper roles, showing default "User" badge in admin

**Evidence**:
```html
<!-- Admin UI showing incorrect role -->
<span class="...">
  <svg>...</svg>
  User  <!-- ❌ Should be "Writer" -->
</span>
```

### 2. Missing Company Data from OAuth Providers

**Issue**: OAuth providers (GitHub, Microsoft) provide rich company information that wasn't being captured

**Root Cause**:
- `OAuthUserInfo` type didn't include company data fields
- Providers weren't extracting company information from OAuth responses
- Company creation used only generic names (`FirstName's Company`)
- Company updates didn't sync OAuth data

**Missing Data**:
- **GitHub**: `company`, `location`, `blog` (website), `bio`
- **Microsoft**: `companyName`, `officeLocation`, `department`, `jobTitle`
- **Google**: No company data in standard OAuth
- **Facebook**: No company data in standard OAuth

---

## ✅ Fixes Applied

### 1. Type Enhancements

#### A. New `OAuthCompanyInfo` Type

**File**: `lib/oauth/types.ts`

```typescript
/**
 * Informations d'entreprise retournées par les providers OAuth
 */
export interface OAuthCompanyInfo {
  name?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

/**
 * Informations utilisateur retournées par les providers OAuth
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  provider: OAuthProvider;
  companyInfo?: OAuthCompanyInfo; // 🆕 Company data from OAuth
  raw?: any;
}
```

#### B. Enhanced `OAuthProviderData` Type

**File**: `lib/oauth/oauth-user-service.ts`

```typescript
export interface OAuthCompanyData {
  name?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

export interface OAuthProviderData {
  providerId: string;
  providerUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  companyInfo?: OAuthCompanyData; // 🆕 Company data
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string;
  metadata?: Record<string, any>;
}
```

---

### 2. Provider Updates

#### A. GitHub Provider

**File**: `lib/oauth/providers/github.ts`

**Before**:
```typescript
return {
  id: githubUser.id.toString(),
  email,
  name: githubUser.name,
  firstName: githubUser.name?.split(" ")[0] || githubUser.login,
  lastName: githubUser.name?.split(" ").slice(1).join(" ") || null,
  avatar: githubUser.avatar_url,
  provider: 'github',
  raw: githubUser,
};
```

**After**:
```typescript
// Extraire les informations d'entreprise de GitHub
const companyInfo: any = {};
if (githubUser.company) {
  companyInfo.name = githubUser.company.replace(/^@/, ''); // Retirer le @ si présent
}
if (githubUser.location) {
  companyInfo.location = githubUser.location;
}
if (githubUser.blog) {
  companyInfo.website = githubUser.blog;
}
if (githubUser.bio) {
  companyInfo.description = githubUser.bio;
}

console.log(`✅ [GitHub OAuth] Données entreprise récupérées:`, {
  company: companyInfo.name || 'Non spécifié',
  location: companyInfo.location || 'Non spécifié',
  website: companyInfo.website || 'Non spécifié',
});

return {
  id: githubUser.id.toString(),
  email,
  name: githubUser.name,
  firstName: githubUser.name?.split(" ")[0] || githubUser.login,
  lastName: githubUser.name?.split(" ").slice(1).join(" ") || null,
  avatar: githubUser.avatar_url,
  provider: 'github',
  companyInfo: Object.keys(companyInfo).length > 0 ? companyInfo : undefined,
  raw: githubUser,
};
```

**Company Data Retrieved**:
- ✅ `company` → `companyInfo.name` (removes @ prefix if present)
- ✅ `location` → `companyInfo.location`
- ✅ `blog` → `companyInfo.website`
- ✅ `bio` → `companyInfo.description`

#### B. Microsoft Provider

**File**: `lib/oauth/providers/microsoft.ts`

**Before**:
```typescript
return {
  id: microsoftUser.id,
  email,
  name: microsoftUser.displayName,
  firstName: microsoftUser.givenName,
  lastName: microsoftUser.surname,
  avatar: photoUrl,
  provider: 'microsoft',
  raw: microsoftUser,
};
```

**After**:
```typescript
// Extraire les informations d'entreprise de Microsoft
const companyInfo: any = {};
if (microsoftUser.companyName) {
  companyInfo.name = microsoftUser.companyName;
}
if (microsoftUser.officeLocation) {
  companyInfo.location = microsoftUser.officeLocation;
}
if (microsoftUser.department) {
  companyInfo.department = microsoftUser.department;
}
if (microsoftUser.jobTitle) {
  companyInfo.jobTitle = microsoftUser.jobTitle;
}

console.log(`✅ [Microsoft OAuth] Données entreprise récupérées:`, {
  company: companyInfo.name || 'Non spécifié',
  location: companyInfo.location || 'Non spécifié',
  department: companyInfo.department || 'Non spécifié',
  jobTitle: companyInfo.jobTitle || 'Non spécifié',
});

return {
  id: microsoftUser.id,
  email,
  name: microsoftUser.displayName,
  firstName: microsoftUser.givenName,
  lastName: microsoftUser.surname,
  avatar: photoUrl,
  provider: 'microsoft',
  companyInfo: Object.keys(companyInfo).length > 0 ? companyInfo : undefined,
  raw: microsoftUser,
};
```

**Company Data Retrieved**:
- ✅ `companyName` → `companyInfo.name`
- ✅ `officeLocation` → `companyInfo.location`
- ✅ `department` → `companyInfo.department`
- ✅ `jobTitle` → `companyInfo.jobTitle`

---

### 3. OAuth User Service Updates

#### A. Company Creation with OAuth Data

**File**: `lib/oauth/oauth-user-service.ts` (CAS 2B: Nouvel utilisateur)

**Before**:
```typescript
[company] = await db
  .insert(companies)
  .values({
    name: `${firstName}'s Company`,
    email,
  })
  .returning();
```

**After**:
```typescript
// Préparer les données de la company
const companyData: any = {
  email,
};

// Utiliser les données OAuth si disponibles, sinon valeur par défaut
if (companyInfo?.name) {
  companyData.name = companyInfo.name;
  console.log(`✅ [OAuthUserService] Company name from OAuth: ${companyInfo.name}`);
} else {
  companyData.name = `${firstName}${lastName ? " " + lastName : ""}'s Company`;
  console.log(`✅ [OAuthUserService] Company name (default): ${companyData.name}`);
}

// Ajouter la localisation si disponible
if (companyInfo?.location) {
  companyData.city = companyInfo.location;
  console.log(`✅ [OAuthUserService] Company location: ${companyInfo.location}`);
}

[company] = await db
  .insert(companies)
  .values(companyData)
  .returning();
```

**Benefits**:
- ✅ Real company name instead of generic "`FirstName's Company`"
- ✅ Company location/city populated from OAuth
- ✅ Better data quality for new companies

#### B. Company Update with OAuth Data (Existing User)

**File**: `lib/oauth/oauth-user-service.ts` (CAS 1: Connexion OAuth existante)

**Before**:
```typescript
// Mettre à jour le nom de la company si elle porte encore le nom générique
const genericPattern = /^.+'s Company$/;
if (genericPattern.test(existingCompany[0].name) && firstName) {
  companyUpdates.name = `${firstName}${lastName ? " " + lastName : ""}'s Company`;
}
```

**After**:
```typescript
// Mettre à jour le nom de la company si elle porte encore le nom générique OU si on a un nom OAuth
const genericPattern = /^.+'s Company$/;
if (companyInfo?.name) {
  // Priorité aux données OAuth si disponibles
  companyUpdates.name = companyInfo.name;
  console.log(`✅ [OAuthUserService] Updating company name to: ${companyInfo.name}`);
} else if (genericPattern.test(existingCompany[0].name) && firstName) {
  // Sinon, mettre à jour seulement si nom générique
  companyUpdates.name = `${firstName}${lastName ? " " + lastName : ""}'s Company`;
}

// Mettre à jour la localisation si disponible et non définie
if (companyInfo?.location && !existingCompany[0].city) {
  companyUpdates.city = companyInfo.location;
  console.log(`✅ [OAuthUserService] Adding company location: ${companyInfo.location}`);
}
```

#### C. Company Enrichment (Existing User Linking OAuth)

**File**: `lib/oauth/oauth-user-service.ts` (CAS 2A: Utilisateur existant - LIAISON)

**New Code**:
```typescript
// Enrichir la company avec les données OAuth si disponibles
if (companyId && companyInfo) {
  const companyUpdates: any = {};

  const existingCompany = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (existingCompany[0]) {
    // Mettre à jour le nom si données OAuth disponibles et nom générique
    const genericPattern = /^.+'s Company$/;
    if (companyInfo.name && genericPattern.test(existingCompany[0].name)) {
      companyUpdates.name = companyInfo.name;
      console.log(`✅ [OAuthUserService] Enriching company name: ${companyInfo.name}`);
    }

    // Ajouter la localisation si disponible et non définie
    if (companyInfo.location && !existingCompany[0].city) {
      companyUpdates.city = companyInfo.location;
      console.log(`✅ [OAuthUserService] Adding company location: ${companyInfo.location}`);
    }

    if (Object.keys(companyUpdates).length > 0) {
      companyUpdates.updatedAt = new Date();
      await db
        .update(companies)
        .set(companyUpdates)
        .where(eq(companies.id, companyId));

      console.log(`✅ [OAuthUserService] Company enriched with OAuth data`);
    }
  }
}
```

#### D. Writer Role Assignment (Existing User Linking OAuth)

**File**: `lib/oauth/oauth-user-service.ts` (CAS 2A: Utilisateur existant - LIAISON)

**New Code**:
```typescript
// Vérifier si l'utilisateur a déjà un rôle, sinon assigner "writer"
const existingRole = await db
  .select()
  .from(userRoles)
  .where(eq(userRoles.userId, userId))
  .limit(1);

if (existingRole.length === 0) {
  // Pas de rôle assigné, assigner "writer" par défaut
  try {
    const writerRole = await db.query.roles.findFirst({
      where: eq(roles.name, "writer"),
    });

    if (writerRole) {
      await db.insert(userRoles).values({
        userId,
        roleId: writerRole.id,
      });
      console.log(
        `✅ [OAuthUserService] Rôle "writer" assigné à l'utilisateur existant`
      );
    }
  } catch (roleError) {
    console.error(
      "❌ [OAuthUserService] Erreur assignation rôle:",
      roleError
    );
  }
}
```

**Benefits**:
- ✅ Existing users linking OAuth now receive "writer" role
- ✅ Fixes "User" badge showing in admin
- ✅ Consistent role assignment across all user creation paths

---

### 4. Callback Updates

#### A. GitHub Callback

**File**: `app/api/auth/oauth/github/callback/route.ts`

```typescript
const result = await OAuthUserService.processOAuthUser({
  providerId: "github",
  providerUserId: githubUserInfo.id,
  email: userEmail,
  firstName: githubUserInfo.name.split(" ")[0] || "User",
  lastName: githubUserInfo.name.split(" ").slice(1).join(" ") || "",
  avatar: githubUserInfo.avatar,
  companyInfo: githubUserInfo.companyInfo, // 🆕 Données entreprise de GitHub
  accessToken,
  metadata: {
    login: (githubUserInfo.raw as any)?.login || githubUserInfo.name,
  },
});
```

#### B. Microsoft Callback

**File**: `app/api/auth/oauth/microsoft/callback/route.ts`

```typescript
const result = await OAuthUserService.processOAuthUser({
  providerId: "microsoft",
  providerUserId: microsoftUserInfo.id,
  email: microsoftUserInfo.email,
  firstName: microsoftUserInfo.firstName || "User",
  lastName: microsoftUserInfo.lastName || "",
  avatar: microsoftUserInfo.avatar,
  companyInfo: microsoftUserInfo.companyInfo, // 🆕 Données entreprise de Microsoft
  accessToken,
  refreshToken: tokenData.refreshToken,
});
```

---

## 📊 Data Mapping Summary

### GitHub → Companies Table

| GitHub Field | DB Field | Example |
|--------------|----------|---------|
| `company` | `name` | "GitHub Inc" (@ removed) |
| `location` | `city` | "San Francisco, CA" |
| `blog` | - | (Not mapped - website field doesn't exist) |
| `bio` | - | (Not mapped - description field doesn't exist) |

### Microsoft → Companies Table

| Microsoft Field | DB Field | Example |
|-----------------|----------|---------|
| `companyName` | `name` | "Microsoft Corporation" |
| `officeLocation` | `city` | "Redmond, WA" |
| `department` | - | (Not mapped - field doesn't exist) |
| `jobTitle` | - | (Not mapped - field doesn't exist) |

### Current Companies Schema

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  city TEXT,  -- 🆕 Now populated from OAuth
  address TEXT,
  zip_code TEXT,
  siret TEXT,
  vat_number TEXT,
  phone TEXT,
  lago_id TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Future Schema Enhancements (Recommended)

```sql
ALTER TABLE companies ADD COLUMN website TEXT;
ALTER TABLE companies ADD COLUMN description TEXT;
ALTER TABLE companies ADD COLUMN department TEXT;
ALTER TABLE companies ADD COLUMN job_title TEXT;
```

This would allow full mapping of:
- GitHub: `blog` → `website`, `bio` → `description`
- Microsoft: `department` → `department`, `jobTitle` → `job_title`

---

## 🧪 Testing

### Test 1: New User via GitHub

**Steps**:
1. Clear cookies, logout
2. Go to `/auth/login`
3. Click "Continue with GitHub"
4. Authorize GitHub
5. Check database

**Expected Results**:
```sql
-- Users table
SELECT email, first_name, last_name, profile_image FROM users WHERE email = 'user@github.com';
-- ✅ profile_image populated with avatar URL

-- Companies table
SELECT name, email, city FROM companies WHERE email = 'user@github.com';
-- ✅ name = Real company name from GitHub (or "FirstName LastName's Company" if not set)
-- ✅ city = User location from GitHub

-- User Roles
SELECT r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'user@github.com';
-- ✅ Should return "writer"
```

**Admin UI**:
```html
<!-- Role badge should show -->
<span>Writer</span>  <!-- ✅ Not "User" -->
```

### Test 2: Existing User Linking GitHub

**Steps**:
1. Create account via email/password (no OAuth)
2. Login
3. Link GitHub account (if feature exists) OR logout and login with GitHub using same email

**Expected Results**:
```sql
-- User Roles (if user had no role before)
SELECT r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN users u ON ur.user_id = u.id
WHERE u.email = 'existing@user.com';
-- ✅ Should return "writer" (newly assigned)

-- Companies (if had generic name before)
SELECT name, city FROM companies WHERE email = 'existing@user.com';
-- ✅ name updated from "John's Company" to real company name
-- ✅ city populated if was NULL
```

### Test 3: Microsoft OAuth

**Steps**:
1. Configure Microsoft OAuth in `/admin/api`
2. Login with Microsoft account

**Expected Results**:
```sql
-- Companies table
SELECT name, city FROM companies WHERE email = 'user@microsoft.com';
-- ✅ name = companyName from Microsoft
-- ✅ city = officeLocation from Microsoft
```

---

## 📋 Files Changed Summary

| File | Type | Changes |
|------|------|---------|
| `lib/oauth/types.ts` | Type | Added `OAuthCompanyInfo` |
| `lib/oauth/oauth-user-service.ts` | Service | Added `OAuthCompanyData`, company enrichment, role assignment |
| `lib/oauth/providers/github.ts` | Provider | Extract company data from GitHub |
| `lib/oauth/providers/microsoft.ts` | Provider | Extract company data from Microsoft |
| `app/api/auth/oauth/github/callback/route.ts` | Callback | Pass `companyInfo` to service |
| `app/api/auth/oauth/microsoft/callback/route.ts` | Callback | Pass `companyInfo` to service |

**Total**: 6 files modified

---

## 🎯 Benefits

### For Users
- ✅ Proper "Writer" role displayed in admin
- ✅ Real company names from OAuth instead of generic names
- ✅ Company location automatically filled
- ✅ Better profile data quality

### For Administrators
- ✅ Accurate user roles in admin dashboard
- ✅ Real company information for analytics
- ✅ Less manual data entry required
- ✅ Better segmentation by company

### For Developers
- ✅ Consistent role assignment across all auth paths
- ✅ Reusable company data extraction pattern
- ✅ Clear type definitions for company info
- ✅ Comprehensive logging for debugging

---

## 🚀 Deployment Notes

### Pre-deployment
- [ ] Verify `roles` table contains "writer" role
- [ ] Check database schema supports `city` field
- [ ] Test OAuth providers in staging

### Post-deployment
- [ ] Monitor logs for company data extraction
- [ ] Verify role assignments in production
- [ ] Check admin UI displays "Writer" badge
- [ ] Review company data quality

### Optional Follow-up
- [ ] Add `website`, `description`, `department`, `job_title` to companies table
- [ ] Create migration for existing generic company names
- [ ] Add admin UI to manually edit company info

---

**Fixed by**: Claude AI Assistant
**Date**: 24 January 2026
**Related**: OAUTH_UNIFIED_ARCHITECTURE_2026-01-24.md, OAUTH_AVATAR_FIX_2026-01-24.md
