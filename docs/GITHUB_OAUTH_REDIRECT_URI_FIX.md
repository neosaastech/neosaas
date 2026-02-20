# Fix GitHub OAuth "redirect_uri is not associated" Error

## 🔴 Problem

When trying to sign in with GitHub, you get this error:

```
The redirect_uri is not associated with this application.

The application might be misconfigured or could be trying to
redirect you to a website you weren't expecting.
```

## 🎯 Root Cause

This error occurs because the **Authorization callback URL** configured in your GitHub OAuth App does not EXACTLY match the callback URL that NeoSaaS is sending in the OAuth request.

### Common Mistakes

1. **Incomplete URL**: Entering only the domain without the path
   - ❌ Wrong: `https://neo-saas-website-no7ezxrr`
   - ✅ Correct: `https://neo-saas-website-no7ezxrr.vercel.app/api/auth/oauth/github/callback`

2. **Missing the full domain**: Not including the complete Vercel URL
   - ❌ Wrong: `https://neo-saas-website-no7ezxrr`
   - ✅ Correct: `https://neo-saas-website-no7ezxrr.vercel.app`

3. **Missing the path**: Including domain but not the callback path
   - ❌ Wrong: `https://myapp.vercel.app`
   - ✅ Correct: `https://myapp.vercel.app/api/auth/oauth/github/callback`

4. **Trailing slash**: Adding a `/` at the end
   - ❌ Wrong: `https://myapp.com/api/auth/oauth/github/callback/`
   - ✅ Correct: `https://myapp.com/api/auth/oauth/github/callback`

5. **Wrong protocol**: Using HTTP instead of HTTPS
   - ❌ Wrong: `http://myapp.com/api/auth/oauth/github/callback`
   - ✅ Correct: `https://myapp.com/api/auth/oauth/github/callback`

## 🔧 How to Fix

### Step 1: Get Your Correct Callback URL

**Option A: From the Admin Interface (Recommended)**

1. Go to `/admin/api` in your NeoSaaS application
2. Find or add "GitHub OAuth" service
3. Look for the "Authorization Callback URL" field
4. Click the **Copy** button to copy the EXACT URL
5. The URL will look like: `https://your-domain.com/api/auth/oauth/github/callback`

**Option B: Check Your Logs**

1. Try to sign in with GitHub (even though it will fail)
2. Check your application logs
3. Look for a line like:
   ```
   ✅ [GitHub OAuth] Callback URL (redirect_uri): https://...
   ```
4. Copy that exact URL

**Option C: Construct It Manually**

Your callback URL should be:
```
[YOUR_FULL_DOMAIN]/api/auth/oauth/github/callback
```

Examples for different hosting environments:
- **Vercel**: `https://your-project-name-xxxxx.vercel.app/api/auth/oauth/github/callback`
- **Custom Domain**: `https://yourapp.com/api/auth/oauth/github/callback`
- **Local Development**: `http://localhost:3000/api/auth/oauth/github/callback`

### Step 2: Update GitHub OAuth App Configuration

1. **Go to GitHub OAuth Apps**:
   - For personal account: https://github.com/settings/developers
   - For organization: `https://github.com/organizations/YOUR_ORG/settings/applications`

2. **Find your OAuth App** and click on it

3. **Update the "Authorization callback URL" field**:
   - Clear the current value
   - Paste the EXACT callback URL from Step 1
   - **Triple-check** there's no trailing slash or typos

4. **Save the changes** by clicking "Update application"

### Step 3: Verify the Configuration

1. Go back to your NeoSaaS application
2. Go to `/admin/api`
3. Find the GitHub OAuth configuration
4. Click "Test OAuth Configuration"
5. It should show: ✅ Configuration valid

### Step 4: Test Sign In

1. Go to `/auth/login`
2. Click "Sign in with GitHub"
3. You should be redirected to GitHub authorization page
4. After authorizing, you should be redirected back to your dashboard

## 📋 Checklist

Before testing, verify:

- [ ] The callback URL in GitHub OAuth App is an ABSOLUTE URL (starts with `http://` or `https://`)
- [ ] The callback URL includes the COMPLETE domain (including `.vercel.app` if on Vercel)
- [ ] The callback URL includes the path `/api/auth/oauth/github/callback`
- [ ] There is NO trailing slash at the end
- [ ] The protocol is HTTPS (or HTTP only for localhost)
- [ ] The URL EXACTLY matches what NeoSaaS is sending (check logs)

## 🔍 Example: Vercel Deployment Fix

If you're deploying on Vercel and your project URL is `https://neo-saas-website-no7ezxrr.vercel.app`:

1. **Your callback URL should be**:
   ```
   https://neo-saas-website-no7ezxrr.vercel.app/api/auth/oauth/github/callback
   ```

2. **In GitHub OAuth App settings**, the "Authorization callback URL" field should contain EXACTLY:
   ```
   https://neo-saas-website-no7ezxrr.vercel.app/api/auth/oauth/github/callback
   ```

3. **In NeoSaaS `/admin/api`**, when you configure GitHub OAuth:
   - The system will automatically show you the correct callback URL
   - Just copy it and paste it in GitHub

## 🆘 Still Having Issues?

### Check the Logs

Look for these log messages:

```bash
# When initiating OAuth
✅ [GitHub OAuth] Callback URL (redirect_uri): https://...

# If there's an error
❌ [GitHub OAuth Callback] REDIRECT_URI_MISMATCH ERROR
```

The logs will show you exactly what URL NeoSaaS is using. Make sure it matches GitHub.

### Common Log Errors

**Error: "Invalid callback URL format"**
- Your callback URL in the database is not an absolute URL
- Go to `/admin/api`, delete the GitHub OAuth config, and recreate it
- The system will automatically generate the correct URL

**Error: "Configuration non trouvée"**
- GitHub OAuth is not configured in the database
- Go to `/admin/api` and add the GitHub OAuth configuration

### Test Directly with GitHub

You can test if GitHub recognizes your callback URL by visiting:
```
https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=read:user
```

Replace:
- `YOUR_CLIENT_ID` with your actual Client ID
- `YOUR_CALLBACK_URL` with your callback URL (URL-encoded)

If you get the authorization page, the URL is valid. If you get an error, the URL doesn't match.

## 📚 Related Documentation

- [GitHub OAuth Manual Setup](./GITHUB_OAUTH_MANUAL_SETUP.md) - Complete setup guide
- [OAuth Database Configuration](./OAUTH_DATABASE_CONFIG.md) - How OAuth configs are stored
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) - Official GitHub docs

## ✅ Summary

The key to fixing this error:

1. **Get the EXACT callback URL** from `/admin/api` (it shows the correct URL automatically)
2. **Copy it** to your GitHub OAuth App settings (don't type it manually)
3. **Verify** there are no typos, extra slashes, or missing parts
4. **Test** by clicking "Sign in with GitHub"

The callback URL must be:
- ✅ Absolute (starting with http:// or https://)
- ✅ Complete (full domain + path)
- ✅ Exact match (no extra or missing characters)
- ✅ No trailing slash

---

**Last updated**: 2026-01-23
