# 🔧 Fix: Avatar Recovery in OAuth Providers - 24 January 2026

**Date**: 24 January 2026
**Type**: Bug Fix
**Severity**: Medium
**Status**: ✅ Fixed

---

## 🐛 Problem Identified

The OAuth system had several issues with avatar/profile picture recovery:

1. **Type Mismatch**: Providers used `picture:` instead of `avatar:` (inconsistent with `OAuthUserInfo` type)
2. **GitHub Callback**: Accessed `.picture` instead of `.avatar`
3. **Facebook**: Retrieved small avatar (default size) instead of high resolution
4. **Microsoft**: Used browser-only `URL.createObjectURL()` on server-side (Node.js)

---

## ✅ Fixes Applied

### 1. Facebook Provider

**File**: `lib/oauth/providers/facebook.ts`

**Before**:
```typescript
// Small avatar (default 50x50)
userUrl.searchParams.set("fields", "id,name,email,first_name,last_name,picture");

return {
  ...
  picture: facebookUser.picture?.data?.url, // ❌ Wrong field name
  ...
}
```

**After**:
```typescript
// High resolution avatar (320x320)
userUrl.searchParams.set("fields", "id,name,email,first_name,last_name,picture.width(320).height(320)");

const avatarUrl = facebookUser.picture?.data?.url || null;
console.log(`✅ [Facebook OAuth] Avatar récupéré: ${avatarUrl ? 'Oui (320x320)' : 'Non'}`);

return {
  ...
  avatar: avatarUrl, // ✅ Correct field name
  ...
}
```

**Benefits**:
- ✅ High resolution avatar (320x320 instead of 50x50)
- ✅ Consistent with `OAuthUserInfo` type
- ✅ Better logging

---

### 2. Microsoft Provider

**File**: `lib/oauth/providers/microsoft.ts`

**Before**:
```typescript
// ❌ Browser API on server-side
const photoBlob = await photoResponse.blob();
photoUrl = URL.createObjectURL(photoBlob); // TypeError in Node.js!

return {
  ...
  picture: photoUrl, // ❌ Wrong field name
  ...
}
```

**After**:
```typescript
// ✅ Convert to base64 data URI (server-compatible)
const photoBlob = await photoResponse.blob();
const arrayBuffer = await photoBlob.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const base64Image = buffer.toString('base64');

const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
photoUrl = `data:${contentType};base64,${base64Image}`;

console.log(`✅ [Microsoft OAuth] Avatar récupéré et converti en data URI`);

return {
  ...
  avatar: photoUrl, // ✅ Correct field name
  ...
}
```

**Benefits**:
- ✅ Works on server-side (Node.js)
- ✅ Base64 data URI can be stored in database
- ✅ No dependency on external URLs
- ✅ Consistent with `OAuthUserInfo` type

---

### 3. GitHub Callback

**File**: `app/api/auth/oauth/github/callback/route.ts`

**Before**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: githubUserInfo.picture, // ❌ Wrong field access
  ...
});
```

**After**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: githubUserInfo.avatar, // ✅ Correct field access
  ...
});
```

---

### 4. Facebook Callback

**File**: `app/api/auth/oauth/facebook/callback/route.ts`

**Before**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: facebookUserInfo.picture, // ❌ Wrong field access
  ...
});
```

**After**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: facebookUserInfo.avatar, // ✅ Correct field access
  ...
});
```

---

### 5. Microsoft Callback

**File**: `app/api/auth/oauth/microsoft/callback/route.ts`

**Before**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: microsoftUserInfo.picture, // ❌ Wrong field access
  ...
});
```

**After**:
```typescript
const result = await OAuthUserService.processOAuthUser({
  ...
  avatar: microsoftUserInfo.avatar, // ✅ Correct field access
  ...
});
```

---

## 📊 Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `lib/oauth/providers/facebook.ts` | `picture:` → `avatar:` + HD image | ✅ High res avatar |
| `lib/oauth/providers/microsoft.ts` | `URL.createObjectURL()` → base64 + `picture:` → `avatar:` | ✅ Server-compatible |
| `app/api/auth/oauth/github/callback/route.ts` | `.picture` → `.avatar` | ✅ Field access fixed |
| `app/api/auth/oauth/facebook/callback/route.ts` | `.picture` → `.avatar` | ✅ Field access fixed |
| `app/api/auth/oauth/microsoft/callback/route.ts` | `.picture` → `.avatar` | ✅ Field access fixed |

---

## 🧪 Testing Required

### GitHub OAuth
- [ ] Login with GitHub
- [ ] Verify avatar is retrieved
- [ ] Check `users.profileImage` in database
- [ ] Verify avatar displays in UI

### Facebook OAuth
- [ ] Configure Facebook OAuth in `/admin/api`
- [ ] Login with Facebook
- [ ] Verify high resolution avatar (320x320)
- [ ] Check database storage
- [ ] Verify avatar displays in UI

### Microsoft OAuth
- [ ] Configure Microsoft OAuth in `/admin/api`
- [ ] Login with Microsoft
- [ ] Verify avatar is converted to base64 data URI
- [ ] Check database storage (should be data URI)
- [ ] Verify avatar displays in UI (data URI should render)

---

## 🎯 Expected Results

After these fixes, all OAuth providers should:

1. **Retrieve avatars correctly**:
   - GitHub: `githubUser.avatar_url`
   - Google: `googleUser.picture`
   - Facebook: `facebookUser.picture.data.url` (320x320)
   - Microsoft: Microsoft Graph photo converted to base64 data URI

2. **Store avatars in `users.profileImage`**:
   - GitHub: Direct URL (e.g., `https://avatars.githubusercontent.com/u/...`)
   - Google: Direct URL (e.g., `https://lh3.googleusercontent.com/...`)
   - Facebook: Direct URL (e.g., `https://platform-lookaside.fbsbx.com/...`)
   - Microsoft: Data URI (e.g., `data:image/jpeg;base64,...`)

3. **Display avatars in UI**:
   - All avatars should render correctly
   - Microsoft data URI should work in `<img src={profileImage} />`

---

## 📚 Technical Details

### Avatar Storage Strategies

| Provider | Format | Example |
|----------|--------|---------|
| **GitHub** | Direct URL | `https://avatars.githubusercontent.com/u/123456?v=4` |
| **Google** | Direct URL | `https://lh3.googleusercontent.com/a/ABC...` |
| **Facebook** | Direct URL (320x320) | `https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=...&width=320&height=320` |
| **Microsoft** | Data URI (base64) | `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...` |

### Why Data URI for Microsoft?

Microsoft Graph API returns the photo as a binary blob, not a URL. Options:

1. ❌ `URL.createObjectURL()` - Browser-only, doesn't work on server
2. ✅ **Base64 data URI** - Works everywhere (server + browser)
3. ⚠️ Upload to CDN - Requires external storage (S3, Cloudinary, etc.)

We chose option 2 (base64 data URI) because:
- ✅ No external dependencies
- ✅ Works server-side and client-side
- ✅ Can be stored directly in database
- ⚠️ Larger string size (~30-50KB for JPEG)

---

## 🔒 Database Impact

### Before (Broken)
```sql
SELECT email, profile_image FROM users WHERE email = 'user@microsoft.com';

-- Result:
-- email: user@microsoft.com
-- profile_image: NULL ❌
```

### After (Fixed)
```sql
SELECT email,
       SUBSTRING(profile_image, 1, 50) as avatar_preview
FROM users
WHERE email = 'user@microsoft.com';

-- Result:
-- email: user@microsoft.com
-- avatar_preview: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA... ✅
```

---

## 🚀 Deployment Notes

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Avatar fields consistent across providers
- [ ] No `URL.createObjectURL()` in server code
- [ ] Logging enabled for debugging

### Post-deployment Verification
- [ ] Test each OAuth provider in production
- [ ] Check database for avatar storage
- [ ] Verify UI renders avatars correctly
- [ ] Monitor logs for avatar retrieval errors

---

**Fixed by**: Claude AI Assistant
**Date**: 24 January 2026
**Commit**: Next commit
**Related**: OAUTH_UNIFIED_ARCHITECTURE_2026-01-24.md
