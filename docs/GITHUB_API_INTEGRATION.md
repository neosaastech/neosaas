# GitHub API Integration - Server-Side Monitoring

**Date**: 2026-01-23
**Version**: 1.0
**Status**: ✅ Production Ready

---

## 🎯 Overview

The GitHub API Integration allows NeoSaaS to interact with GitHub's API using a Personal Access Token (PAT). This enables:

- 📊 **Monitoring GitHub events** (commits, pull requests, issues, etc.)
- 📝 **Logging GitHub activity** into the unified service usage system
- 🔍 **Tracking repository changes** and organization events
- 📈 **Historical analytics** of GitHub operations

This is **separate from GitHub OAuth** (which is for user authentication). This integration is for **server-side operations** and **monitoring**.

---

## 🔐 GitHub OAuth vs GitHub API

| Feature | GitHub OAuth | GitHub API Integration |
|---------|--------------|------------------------|
| **Purpose** | User authentication | Server operations & monitoring |
| **Credentials** | Client ID + Secret | Personal Access Token (PAT) |
| **User** | Authenticates end users | Authenticates the server |
| **Scope** | User data access | Repos, events, org data |
| **Table** | `service_api_configs` (serviceName: `github`) | `service_api_configs` (serviceName: `github_api`) |
| **UI Section** | "OAuth Configuration" | "API Configuration (Server Integration)" |

---

## 📝 Setup Guide

### Step 1: Create GitHub Personal Access Token

1. **Go to GitHub Settings**:
   - Personal account: https://github.com/settings/tokens
   - Organization: `https://github.com/organizations/YOUR_ORG/settings/personal-access-tokens`

2. **Click "Generate new token (classic)"**

3. **Select scopes** (required):
   - ✅ `repo` - Full control of private repositories
   - ✅ `read:org` - Read org and team membership, read org projects
   - ✅ `read:user` - Read ALL user profile data

4. **Optional scopes** (for advanced features):
   - `admin:repo_hook` - Full control of repository hooks
   - `admin:org_hook` - Full control of organization hooks
   - `workflow` - Update GitHub Action workflows

5. **Click "Generate token"**

6. **Copy the token** (starts with `ghp_...`)
   - ⚠️ **Important**: Save it immediately! You won't be able to see it again.

### Step 2: Configure in NeoSaaS

1. **Go to `/admin/api`**

2. **Find "GitHub API Configuration (Server Integration)"** section

3. **Expand the section**

4. **Paste your PAT** in the "Personal Access Token (Classic)" field

5. **Test the token**:
   - Click "Test Token"
   - Should show: ✅ "Token valid! User: your-username"

6. **Save the configuration**:
   - Click "Save API Token"
   - Token is automatically encrypted with AES-256-GCM
   - Stored in `service_api_configs` table

### Step 3: Verify Storage

```sql
SELECT
  id,
  service_name,
  service_type,
  is_active,
  metadata->>'configuredAt' as configured_at
FROM service_api_configs
WHERE service_name = 'github_api';
```

**Expected**:
- `service_name`: `github_api`
- `service_type`: `api`
- `is_active`: `true`
- `config`: Encrypted PAT (not visible as plain text)

---

## 🔧 Architecture

### Files Created

```
lib/github/
└── api-client.ts              # GitHub API client class

app/api/admin/
├── configure-github-api/
│   └── route.ts              # Save/Get PAT configuration
├── test-github-api/
│   └── route.ts              # Test PAT validity
└── github-logs/
    └── route.ts              # Fetch and sync GitHub events
```

### GitHubApiClient Class

**File**: `lib/github/api-client.ts`

```typescript
import { githubApi } from "@/lib/github/api-client";

// Initialize client (loads PAT from database)
await githubApi.init();

// Get user events
const events = await githubApi.getUserEvents("username", 30);

// Get organization events
const orgEvents = await githubApi.getOrgEvents("org-name", 30);

// Get repository commits
const commits = await githubApi.getRepoCommits("owner", "repo", 30);

// Get current user info
const user = await githubApi.getCurrentUser();

// Get user's organizations
const orgs = await githubApi.getUserOrgs();

// Get user's repositories
const repos = await githubApi.getUserRepos(100);
```

---

## 📊 API Endpoints

### 1. Save GitHub PAT

**Endpoint**: `POST /api/admin/configure-github-api`

**Request**:
```json
{
  "personalAccessToken": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "GitHub API Token saved successfully",
  "details": {
    "configId": "uuid",
    "encrypted": true
  }
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid token format. GitHub tokens start with 'ghp_' or 'github_pat_'"
}
```

---

### 2. Test GitHub PAT

**Endpoint**: `POST /api/admin/test-github-api`

**Request**:
```json
{
  "personalAccessToken": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "login": "username",
    "name": "User Name",
    "email": "user@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/..."
  },
  "scopes": ["repo", "read:org", "read:user"],
  "details": {
    "hasRepoScope": true,
    "hasOrgScope": true,
    "hasUserScope": true
  }
}
```

---

### 3. Get GitHub Configuration

**Endpoint**: `GET /api/admin/configure-github-api`

**Response**:
```json
{
  "success": true,
  "message": "GitHub API configured",
  "details": {
    "isActive": true,
    "lastTested": "2026-01-23T10:30:00Z",
    "configuredAt": "2026-01-23T10:00:00Z",
    "hasToken": true
  }
}
```

---

### 4. Fetch GitHub Logs

**Endpoint**: `GET /api/admin/github-logs`

**Query Parameters**:
- `type` (optional): `user` | `org` | `repo` (default: `user`)
- `target` (optional): username, org name, or "owner/repo"
- `limit` (optional): number of events (default: 30)
- `save` (optional): `true` to save events to database

**Examples**:

```bash
# Get current user's events
GET /api/admin/github-logs?type=user&limit=50

# Get specific user's events
GET /api/admin/github-logs?type=user&target=octocat&limit=30

# Get organization events
GET /api/admin/github-logs?type=org&target=github&limit=100

# Get repository commits
GET /api/admin/github-logs?type=repo&target=owner/repo&limit=20

# Fetch and save to database
GET /api/admin/github-logs?type=user&limit=50&save=true
```

**Response**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "12345678",
        "type": "PushEvent",
        "actor": {
          "login": "username",
          "avatar_url": "https://..."
        },
        "repo": {
          "name": "owner/repo"
        },
        "payload": {
          "commits": [...]
        },
        "created_at": "2026-01-23T10:00:00Z"
      }
    ],
    "user": {
      "login": "username",
      "name": "User Name",
      "email": "user@example.com",
      "avatar_url": "https://..."
    },
    "count": 50,
    "type": "user",
    "target": "username"
  }
}
```

---

### 5. Sync GitHub Events to Database

**Endpoint**: `POST /api/admin/github-logs`

**Request**:
```json
{
  "type": "user",
  "target": "username",
  "limit": 100
}
```

**Response**:
```json
{
  "success": true,
  "message": "Synced 95 GitHub events",
  "details": {
    "total": 100,
    "saved": 95,
    "failed": 5
  }
}
```

---

## 📊 Logging & Monitoring

### Event Types Tracked

GitHub events are logged to `service_api_usage` table with operation names like:

| GitHub Event | Operation Name |
|--------------|----------------|
| PushEvent | `github_pushevent` |
| PullRequestEvent | `github_pullrequestevent` |
| IssuesEvent | `github_issuesevent` |
| CreateEvent | `github_createevent` |
| DeleteEvent | `github_deleteevent` |
| ForkEvent | `github_forkevent` |
| WatchEvent | `github_watchevent` |
| CommitEvent | `github_commitevent` |

### Query Logs

```sql
-- Recent GitHub events
SELECT
  operation,
  request_data->>'actor' as actor,
  request_data->>'repo' as repo,
  created_at
FROM service_api_usage
WHERE service_name = 'github_api'
ORDER BY created_at DESC
LIMIT 50;

-- Event statistics
SELECT
  operation,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM service_api_usage
WHERE service_name = 'github_api'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY operation
ORDER BY count DESC;

-- Events by actor
SELECT
  request_data->>'actor' as actor,
  COUNT(*) as event_count,
  ARRAY_AGG(DISTINCT operation) as event_types
FROM service_api_usage
WHERE service_name = 'github_api'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY request_data->>'actor'
ORDER BY event_count DESC;
```

---

## 🔒 Security

### Token Storage

- ✅ **Encrypted at rest** using AES-256-GCM
- ✅ **Stored in database** (`service_api_configs` table)
- ✅ **Never logged** in plain text
- ✅ **Admin access only** for configuration

### Token Permissions

The PAT should have **minimum required scopes**:

**Essential**:
- `repo` - For private repos access
- `read:org` - For organization events
- `read:user` - For user information

**Optional** (based on needs):
- `admin:repo_hook` - For webhook management
- `workflow` - For GitHub Actions

### Token Rotation

Recommended to rotate PAT every 90 days:

1. Generate new PAT on GitHub
2. Test in NeoSaaS (`/admin/api`)
3. Save new PAT
4. Revoke old PAT on GitHub

---

## 🧪 Testing

### Manual Test Flow

1. **Configure PAT** in `/admin/api`
2. **Test Token** - Should show user info
3. **Fetch Events** - Use curl or browser:
   ```bash
   curl -H "Cookie: your-session-cookie" \
     "http://localhost:3000/api/admin/github-logs?type=user&limit=10"
   ```
4. **Check Database**:
   ```sql
   SELECT * FROM service_api_usage
   WHERE service_name = 'github_api'
   ORDER BY created_at DESC LIMIT 10;
   ```

### Automated Tests

```typescript
// Test GitHub API client
import { githubApi } from "@/lib/github/api-client";

describe("GitHub API Client", () => {
  it("should initialize with token from database", async () => {
    const initialized = await githubApi.init();
    expect(initialized).toBe(true);
  });

  it("should fetch user events", async () => {
    await githubApi.init();
    const events = await githubApi.getUserEvents("octocat", 10);
    expect(events.length).toBeGreaterThan(0);
  });

  it("should track event to database", async () => {
    // Mock event
    const event = {
      id: "test-123",
      type: "PushEvent",
      actor: { login: "test-user", avatar_url: "..." },
      repo: { name: "test/repo" },
      payload: {},
      created_at: new Date().toISOString(),
    };

    await githubApi.trackEvent(event, "config-id");
    // Verify in database
  });
});
```

---

## 📈 Use Cases

### 1. Monitor Team Activity

Track what your team is doing across repositories:

```typescript
import { githubApi } from "@/lib/github/api-client";

await githubApi.init();
const orgEvents = await githubApi.getOrgEvents("your-org", 100);

// Filter by event type
const pushEvents = orgEvents.filter(e => e.type === "PushEvent");
const prEvents = orgEvents.filter(e => e.type === "PullRequestEvent");

console.log(`Pushes: ${pushEvents.length}`);
console.log(`Pull Requests: ${prEvents.length}`);
```

### 2. Track Repository Changes

Monitor specific repository for commits:

```typescript
const commits = await githubApi.getRepoCommits("owner", "repo", 50);

commits.forEach(commit => {
  console.log(`${commit.commit.author.name}: ${commit.commit.message}`);
});
```

### 3. Sync Events Periodically

Set up a cron job to sync GitHub events:

```typescript
// app/api/cron/sync-github-events/route.ts
export async function GET() {
  const response = await fetch("http://localhost:3000/api/admin/github-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "org",
      target: "your-org",
      limit: 100,
    }),
  });

  const data = await response.json();
  return Response.json(data);
}
```

### 4. Dashboard Analytics

Create a dashboard showing GitHub activity:

```typescript
// Fetch recent activity
const events = await fetch("/api/admin/github-logs?type=user&limit=100");
const data = await events.json();

// Group by type
const eventsByType = data.events.reduce((acc, event) => {
  acc[event.type] = (acc[event.type] || 0) + 1;
  return acc;
}, {});

// Display charts
<Chart data={eventsByType} />
```

---

## 🐛 Troubleshooting

### Issue: "GitHub API not configured"

**Cause**: No PAT saved in database

**Solution**:
1. Go to `/admin/api`
2. Expand "API Configuration (Server Integration)"
3. Enter and save your PAT

---

### Issue: "Invalid token"

**Cause**: Token is expired or revoked

**Solution**:
1. Generate new PAT on GitHub
2. Update in `/admin/api`
3. Test and save

---

### Issue: "Rate limit exceeded"

**Cause**: Too many API requests

**Solution**:
- GitHub has rate limits (5000 requests/hour for authenticated)
- Check rate limit: `https://api.github.com/rate_limit`
- Implement caching or reduce polling frequency

---

### Issue: "Insufficient permissions"

**Cause**: PAT missing required scopes

**Solution**:
1. Go to GitHub → Settings → Tokens
2. Edit your token
3. Add missing scopes (`repo`, `read:org`, `read:user`)
4. Regenerate and update in NeoSaaS

---

## 📚 Related Documentation

- [GitHub OAuth v3.0](./GITHUB_OAUTH_ARCHITECTURE_V3.md) - User authentication
- [Service API Management](./SERVICE_API_MANAGEMENT.md) - General API config
- [GitHub API Documentation](https://docs.github.com/en/rest) - Official GitHub docs

---

## 🚀 Future Enhancements

### Planned Features

1. **Webhook Integration** - Real-time event notifications
2. **GitHub Actions Monitoring** - Track workflow runs
3. **Advanced Analytics** - Contributor stats, code review metrics
4. **Automated Reporting** - Weekly/monthly activity reports
5. **Multi-Account Support** - Multiple PATs for different scopes

### Potential Use Cases

- **Automated PR Reviews** - Comment on PRs via API
- **Issue Management** - Create/update issues programmatically
- **Repository Management** - Create repos, manage settings
- **Team Analytics** - Track productivity metrics
- **Security Monitoring** - Detect unusual activity

---

**Version**: 1.0
**Last Updated**: 2026-01-23
**Status**: ✅ Production Ready
**Encryption**: AES-256-GCM
**Access**: Admin Only

