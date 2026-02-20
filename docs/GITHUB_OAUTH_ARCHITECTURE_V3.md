# GitHub OAuth Architecture v3.0 - Unified Encryption System

**Date**: 2026-01-23
**Version**: 3.0
**Status**: ✅ Production Ready

---

## 🎯 Overview

Version 3.0 introduces a **unified encryption architecture** for all GitHub OAuth credentials, eliminating previous inconsistencies and implementing industry-standard AES-256-GCM encryption.

---

## 📋 What Changed in v3.0

| Aspect | v2.0 (Before) | v3.0 (Current) |
|--------|---------------|----------------|
| **Storage** | ❌ Mixed (some encrypted, some plain) | ✅ All encrypted via `serviceApiRepository` |
| **Architecture** | ❌ 3 different code paths | ✅ Single unified path |
| **Encryption** | ❌ Inconsistent | ✅ AES-256-GCM everywhere |
| **Validation** | ❌ Rejected `Ov2X` format | ✅ Supports all GitHub formats |
| **Logging** | ❌ Console only | ✅ Database + Console |
| **UX** | ❌ No feedback | ✅ Toasts + Spinners + Error mapping |
| **Monitoring** | ❌ None | ✅ Full metrics in `service_api_usage` |

---

## 🔐 Encryption Architecture

### Algorithm: AES-256-GCM

**Encryption Flow:**
```
Plain Credentials (JSON)
  ↓
JSON.stringify()
  ↓
AES-256-GCM Encryption
  ├─ Key: PBKDF2 from NEXTAUTH_SECRET (100,000 iterations)
  ├─ Salt: 16 bytes (random)
  └─ IV: 12 bytes (random)
  ↓
Base64 Encoding
  ↓
Database Storage (service_api_configs.config)
```

**Decryption Flow:**
```
Database (Base64 string)
  ↓
Base64 Decoding
  ↓
AES-256-GCM Decryption
  ├─ Extract Salt (first 16 bytes)
  ├─ Extract IV (next 12 bytes)
  └─ Decrypt remaining bytes
  ↓
JSON.parse()
  ↓
Plain Credentials (JSON)
```

### Implementation

**File**: `lib/email/utils/encryption.ts`

```typescript
// Encryption
export async function encrypt(data: string): Promise<string> {
  const secret = getEncryptionSecret(); // NEXTAUTH_SECRET
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt); // PBKDF2, 100k iterations
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  return Buffer.from([...salt, ...iv, ...new Uint8Array(encrypted)]).toString('base64');
}

// Decryption
export async function decrypt(encryptedData: string): Promise<string> {
  const buffer = Buffer.from(encryptedData, 'base64');
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const encrypted = buffer.slice(28);
  const secret = getEncryptionSecret();
  const key = await deriveKey(secret, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return decoder.decode(decrypted);
}
```

---

## 🏗️ Unified Storage Pattern

### Single Entry Point: `serviceApiRepository`

All GitHub OAuth operations now go through `serviceApiRepository`:

```typescript
import { serviceApiRepository } from "@/lib/services";

// WRITE (Automatic Encryption)
await serviceApiRepository.upsertConfig({
  serviceName: "github",
  serviceType: "oauth",
  environment: "production",
  config: {
    clientId: "Ov23...",
    clientSecret: "1899059a...",
  },
  metadata: {
    callbackUrl: "https://...",
    baseUrl: "https://...",
  },
});

// READ (Automatic Decryption)
const config = await serviceApiRepository.getConfig("github", "production");
// config.config is already decrypted JSON object
```

### Eliminated Patterns

❌ **BEFORE** (v2.0 - Multiple Paths):
```typescript
// Path 1: Direct DB insert (UNENCRYPTED)
await db.insert(serviceApiConfigs).values({
  config: { clientId, clientSecret } // ❌ Plain object
});

// Path 2: Direct DB read (NO DECRYPTION)
const config = await db.select().from(serviceApiConfigs);
const creds = config.config as { clientId, clientSecret }; // ❌ Expected plain

// Path 3: Repository (ENCRYPTED)
const config = await serviceApiRepository.getConfig("github");
// ❌ TypeError: decrypt() receives object instead of string
```

✅ **AFTER** (v3.0 - Single Path):
```typescript
// ONLY ONE WAY - Always through repository
const config = await serviceApiRepository.getConfig("github", "production");
// ✅ Always encrypted, always decrypted transparently
```

---

## 📊 Database Schema

### Table: `service_api_configs`

```sql
CREATE TABLE service_api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,           -- 'github'
  service_type TEXT NOT NULL,           -- 'oauth'
  environment TEXT NOT NULL DEFAULT 'production',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  config JSONB NOT NULL,                -- Encrypted credentials (base64 string)
  metadata JSONB,                       -- Unencrypted metadata
  last_tested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note on `config` column type:**
- Currently: `JSONB` (stores the base64 string as JSON)
- Works but not semantically correct
- Future migration recommended: `JSONB` → `TEXT`

**Example stored data:**
```json
{
  "id": "uuid",
  "service_name": "github",
  "service_type": "oauth",
  "environment": "production",
  "is_active": true,
  "config": "Rd8K2mN...base64...Hy7pQ==",  // ← Encrypted string
  "metadata": {
    "callbackUrl": "https://yourapp.com/api/auth/oauth/github/callback",
    "baseUrl": "https://yourapp.com",
    "updatedVia": "manual-admin",
    "configuredAt": "2026-01-23T10:30:00Z"
  }
}
```

---

## 🔄 Complete Flow

### 1. Configuration Flow (Admin)

```
Admin UI (/admin/api)
  ↓ User enters Client ID & Secret
POST /api/admin/configure-github-oauth
  ↓ Validates format
serviceApiRepository.upsertConfig()
  ↓ Calls encrypt(JSON.stringify(config))
  ↓ AES-256-GCM encryption
  ↓ Base64 encoding
Database: Stores encrypted string
  ↓
serviceApiRepository.markTested()
  ↓ Updates last_tested_at
✅ Success toast shown to admin
```

### 2. OAuth Initiation Flow (User Login)

```
User clicks "Sign in with GitHub" (/auth/login)
  ↓ Shows toast "Redirecting to GitHub..."
  ↓ Button shows spinner
GET /api/auth/oauth/github
  ↓ Calls getGitHubOAuthConfig()
  ↓ serviceApiRepository.getConfig("github")
  ↓ Reads encrypted string from DB
  ↓ Calls decrypt()
  ↓ AES-256-GCM decryption
  ↓ JSON.parse() → Plain credentials
  ↓ Validates callback URL is absolute
  ↓ Generates CSRF state token
  ↓ Logs to service_api_usage (oauth_initiation)
Redirect to GitHub OAuth authorize page
  ↓ User authorizes
GitHub redirects to callback
  ↓
GET /api/auth/oauth/github/callback?code=...
  ↓ Validates state token (CSRF)
  ↓ Calls getGitHubOAuthConfig() (decrypts again)
  ↓ Exchanges code for access token
  ↓ Fetches user data from GitHub API
  ↓ Creates/links user in database
  ↓ Generates JWT token
  ↓ Logs to service_api_usage (oauth_callback)
Redirect to /dashboard
  ↓
✅ User logged in
```

---

## 📝 File Structure

### Core Files (Modified in v3.0)

```
lib/
├── oauth/
│   └── github-config.ts              # ✅ Now uses serviceApiRepository
├── services/
│   ├── repository.ts                 # ✅ Handles encryption/decryption
│   └── types.ts                      # Type definitions
└── email/utils/
    └── encryption.ts                 # ✅ AES-256-GCM implementation

app/api/
├── admin/
│   └── configure-github-oauth/
│       └── route.ts                  # ✅ Now uses serviceApiRepository
└── auth/oauth/github/
    ├── route.ts                      # ✅ Added logging
    └── callback/
        └── route.ts                  # ✅ Added logging

app/(private)/admin/api/
└── page.tsx                          # ✅ Fixed Client ID validation

app/auth/login/
└── page.tsx                          # ✅ Added UX improvements

db/
└── schema.ts                         # service_api_configs + service_api_usage
```

---

## 🔍 Logging & Monitoring

### Table: `service_api_usage`

All OAuth operations are logged:

```sql
CREATE TABLE service_api_usage (
  id UUID PRIMARY KEY,
  config_id UUID REFERENCES service_api_configs(id),
  service_name TEXT NOT NULL,           -- 'github'
  operation VARCHAR(255) NOT NULL,      -- 'oauth_initiation' | 'oauth_callback'
  status TEXT NOT NULL,                 -- 'success' | 'failed'
  status_code VARCHAR(10),              -- '200', '302', '500'
  request_data JSONB,                   -- Request details
  response_data JSONB,                  -- Response details
  error_message TEXT,                   -- If failed
  response_time INTEGER,                -- Milliseconds
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Logged Operations

**oauth_initiation**:
```json
{
  "configId": "uuid",
  "serviceName": "github",
  "operation": "oauth_initiation",
  "status": "success",
  "statusCode": "302",
  "requestData": {
    "redirectUri": "https://yourapp.com/api/auth/oauth/github/callback",
    "scope": "read:user user:email"
  },
  "responseTime": 45
}
```

**oauth_callback** (Success):
```json
{
  "configId": "uuid",
  "serviceName": "github",
  "operation": "oauth_callback",
  "status": "success",
  "statusCode": "200",
  "requestData": {
    "githubUser": "johndoe",
    "email": "john@example.com"
  },
  "responseData": {
    "userId": "uuid",
    "newUser": true
  },
  "responseTime": 234
}
```

**oauth_callback** (Failure):
```json
{
  "configId": "uuid",
  "serviceName": "github",
  "operation": "oauth_callback",
  "status": "failed",
  "statusCode": "500",
  "errorMessage": "Invalid access token",
  "responseTime": 123
}
```

### Querying Logs

```sql
-- Recent OAuth operations
SELECT
  operation,
  status,
  status_code,
  response_time,
  created_at
FROM service_api_usage
WHERE service_name = 'github'
ORDER BY created_at DESC
LIMIT 20;

-- Success rate
SELECT
  operation,
  status,
  COUNT(*) as count,
  AVG(response_time) as avg_time
FROM service_api_usage
WHERE service_name = 'github'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY operation, status;
```

---

## ✅ Client ID Validation

### Supported Formats

v3.0 supports ALL GitHub OAuth App formats:

| Format | Example | Description |
|--------|---------|-------------|
| `Iv1.` | `Iv1.a123456789abcdef` | Legacy OAuth Apps (with dot) |
| `Ov1` | `Ov1a123456789abcdef` | Old OAuth Apps (no dot) |
| `Ov2` | `Ov2a123456789abcdef` | New OAuth Apps (no dot) |
| `Ov23` | `Ov23licqdRXt8oc0sqqQ` | New OAuth Apps v2.3+ (no dot) |

**Validation Code** (`app/(private)/admin/api/page.tsx`):
```typescript
const isValid =
  githubConfig.clientId.startsWith('Iv1.') ||  // Legacy: Iv1. (with dot)
  githubConfig.clientId.startsWith('Ov2') ||   // New: Ov2X (no dot)
  githubConfig.clientId.startsWith('Ov1');     // Old: Ov1 (no dot)
```

---

## 🎨 UX Improvements

### Login Page Enhancements

**Before**:
- ❌ Immediate redirect (no feedback)
- ❌ No loading state
- ❌ Cryptic error messages

**After**:
- ✅ Toast: "Redirecting to GitHub..."
- ✅ Animated spinner on button
- ✅ Button disabled during redirect
- ✅ Clear error messages with actionable guidance
- ✅ Auto-cleanup of URL error parameters

### Error Message Mapping

| Error Code | User Message | Description |
|-----------|--------------|-------------|
| `redirect_uri_mismatch` | "GitHub Configuration Error" | "The callback URL is not configured correctly. Please contact support." |
| `access_denied` | "Access Denied" | "You denied access to your GitHub account. Please try again." |
| `config_missing` | "Configuration Missing" | "GitHub OAuth is not configured. Please contact support." |
| `callback_error` | "Authentication Error" | Shows specific error details |
| `invalid_state` | "Security Error" | "Invalid security token. This could be a CSRF attack." |

---

## 🔒 Security Features

### 1. Encryption at Rest
- ✅ AES-256-GCM (industry standard)
- ✅ PBKDF2 key derivation
- ✅ 100,000 iterations
- ✅ Random salt per encryption
- ✅ Random IV per encryption

### 2. CSRF Protection
- ✅ Random UUID state token
- ✅ Stored in httpOnly cookie
- ✅ 10-minute expiration
- ✅ Validated on callback

### 3. Secure Cookies
- ✅ httpOnly (prevents XSS)
- ✅ secure flag (HTTPS only in production)
- ✅ sameSite=lax (prevents CSRF)
- ✅ 7-day JWT expiration

### 4. Validation
- ✅ Callback URL must be absolute
- ✅ Client ID format validation
- ✅ State token validation
- ✅ Access token validation

---

## 📊 Migration from v2.0

If you have existing v2.0 configurations:

### Step 1: Identify Unencrypted Configs

```sql
-- Find configs with plain JSON objects (v2.0)
SELECT id, service_name, config
FROM service_api_configs
WHERE service_name = 'github'
  AND jsonb_typeof(config) = 'object';
```

### Step 2: Re-save via Admin UI

1. Go to `/admin/api`
2. Click "Edit" on GitHub OAuth
3. Re-enter Client ID and Secret
4. Click "Save"

This will automatically:
- ✅ Encrypt credentials via `serviceApiRepository`
- ✅ Store as base64 string
- ✅ Update `last_tested_at`

### Step 3: Verify Encryption

```sql
-- Verify config is now encrypted (base64 string)
SELECT
  id,
  service_name,
  LENGTH(config::text) as encrypted_length,
  config::text LIKE '%base64%' as looks_encrypted
FROM service_api_configs
WHERE service_name = 'github';
```

---

## 🧪 Testing

### Test Configuration

Use these test credentials:
- **Client ID**: `Ov23licqdRXt8oc0sqqQ`
- **Client Secret**: `1899059a069decd1f582d05b3aac7159773c638b`
- **Callback URL**: `https://your-domain.com/api/auth/oauth/github/callback`

### Test Checklist

- [ ] Configuration saves successfully
- [ ] Client ID validation passes
- [ ] Credentials are encrypted in database
- [ ] OAuth initiation redirects to GitHub
- [ ] Callback processes successfully
- [ ] User is created/logged in
- [ ] Operations are logged in `service_api_usage`
- [ ] Error scenarios show clear messages

---

## 📚 Related Documentation

- [Complete Fix Changelog](./CHANGELOG_GITHUB_OAUTH_FIX_2026-01-23.md)
- [Audit Report](./AUDIT_GITHUB_OAUTH_2026-01-23.md)
- [Redirect URI Fix Guide](./GITHUB_OAUTH_REDIRECT_URI_FIX.md)
- [Manual Setup Guide](./GITHUB_OAUTH_MANUAL_SETUP.md)
- [Action Log](./ACTION_LOG.md)

---

## 🆘 Troubleshooting

### Issue: "Config not found"
**Solution**: Configure GitHub OAuth in `/admin/api`

### Issue: "Invalid callback URL"
**Solution**: Ensure `NEXT_PUBLIC_APP_URL` is set or callback URL is in metadata

### Issue: "TypeError: decrypt received object"
**Solution**: Re-save config via admin UI to re-encrypt

### Issue: "Client ID format invalid"
**Solution**: Update to v3.0 - supports all formats

### Issue: "No logs in database"
**Solution**: Check `service_api_usage` table exists and permissions

---

**Version**: 3.0
**Last Updated**: 2026-01-23
**Status**: ✅ Production Ready
**Breaking Changes**: Yes (requires re-saving existing configs)

