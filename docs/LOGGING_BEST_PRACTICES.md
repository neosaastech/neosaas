---
# 🎯 Logging Best Practices - NeoSaaS

**Date**: 24 janvier 2026  
**Statut**: ✅ Guide Complet  
**Cible**: Développeurs + Administrateurs

---

## 📖 Guide de Logging Optimal

### 1. Logging OAuth Operations

#### ✅ À Logger (Obligatoire)

Chaque opération OAuth doit logger:

```typescript
{
  configId: "uuid",           // ✅ Traçabilité config
  serviceName: "github",      // ✅ Provider
  operation: "oauth_initiation", // ✅ Quelle opération
  status: "success",          // ✅ Résultat
  statusCode: "302",          // ✅ HTTP code
  requestData: {              // ✅ What was requested
    scope: "user:email",
    redirectUri: "https://..."
  },
  responseData: {             // ✅ What was returned
    userId: "uuid",
    newUser: false
  },
  responseTime: 145,          // ✅ Performance metric
  errorMessage: null,         // ✅ Error details (if any)
  createdAt: "2026-01-24T10:15:30Z" // ✅ When
}
```

#### ❌ À NE PAS Logger (Sécurité)

```typescript
// ❌ JAMAIS logger en clair
{
  clientId: "Ov23licqdRXt8oc0sqqQ",      // ❌ Token/Secret
  clientSecret: "xxx...",                 // ❌ Credentials
  accessToken: "ghu_xxx...",              // ❌ User token
  password: "xxx",                        // ❌ Sensitive data
  email: "user@example.com"               // ⚠️ Voir Privacy
}

// ✅ ACCEPTABLE (anonymisé)
{
  email_hash: "sha256(user@example.com)",
  user_id: "uuid",
  config_id: "uuid"
}
```

---

### 2. Implémentation Correcte

#### Pattern OAuth Initiation

**Fichier**: `app/api/auth/oauth/[provider]/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const provider = "github"; // ou "google", etc.
  
  try {
    // 1. Récupérer config
    const config = await getOAuthConfig(provider);
    if (!config) {
      // Log: Config missing
      const startTime = Date.now();
      await serviceApiRepository.trackUsage({
        configId: null, // Unknown config
        serviceName: provider,
        operation: "oauth_initiation",
        status: "failed",
        statusCode: "400",
        requestData: { provider },
        responseData: null,
        responseTime: Date.now() - startTime,
        errorMessage: `${provider} OAuth is not configured`
      });
      
      return NextResponse.json({ error: "not_configured" }, { status: 400 });
    }
    
    // 2. Initiate OAuth
    const startTime = Date.now();
    const state = generateState();
    const redirectUrl = buildOAuthUrl(config, state);
    
    // 3. Set secure cookie
    const response = NextResponse.redirect(redirectUrl, { status: 302 });
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax"
    });
    
    // 4. Log success
    await serviceApiRepository.trackUsage({
      configId: config.id,
      serviceName: provider,
      operation: "oauth_initiation",
      status: "success",
      statusCode: "302",
      requestData: {
        scope: config.scope,
        redirectUri: config.callbackUrl
      },
      responseData: {
        redirectUrl: redirectUrl.split("?")[0] // Hide sensitive params
      },
      responseTime: Date.now() - startTime,
      errorMessage: null
    });
    
    return response;
    
  } catch (error) {
    // 5. Log error
    const startTime = Date.now();
    await serviceApiRepository.trackUsage({
      configId: null,
      serviceName: provider,
      operation: "oauth_initiation",
      status: "failed",
      statusCode: "500",
      requestData: { provider },
      responseData: null,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
```

#### Pattern OAuth Callback

**Fichier**: `app/api/auth/oauth/[provider]/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const provider = "github";
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  
  const startTime = Date.now();
  
  try {
    // 1. Check for OAuth error
    if (error) {
      const responseTime = Date.now() - startTime;
      await serviceApiRepository.trackUsage({
        configId: null,
        serviceName: provider,
        operation: "oauth_callback",
        status: "failed",
        statusCode: "400",
        requestData: {
          provider,
          error: error
        },
        responseData: null,
        responseTime,
        errorMessage: `OAuth denied: ${error}`
      });
      
      return redirectWithError(error, "redirect_denied");
    }
    
    // 2. Verify CSRF token
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!storedState || storedState !== state) {
      const responseTime = Date.now() - startTime;
      await serviceApiRepository.trackUsage({
        configId: null,
        serviceName: provider,
        operation: "oauth_callback",
        status: "failed",
        statusCode: "401",
        requestData: { provider },
        responseData: null,
        responseTime,
        errorMessage: "CSRF token mismatch - potential attack"
      });
      
      throw new Error("CSRF token mismatch");
    }
    
    // 3. Exchange code for token
    const config = await getOAuthConfig(provider);
    const tokenData = await exchangeCodeForToken(config, code);
    
    // 4. Get user info
    const userInfo = await fetchUserInfo(provider, tokenData);
    
    // 5. Create/update user
    const { user, isNewUser } = await createOrUpdateUser(provider, userInfo);
    
    // 6. Generate JWT
    const jwtToken = generateJWT(user);
    
    // 7. Log success
    const responseTime = Date.now() - startTime;
    await serviceApiRepository.trackUsage({
      configId: config.id,
      serviceName: provider,
      operation: "oauth_callback",
      status: "success",
      statusCode: "200",
      requestData: {
        provider,
        codeReceived: !!code,
        stateVerified: true
      },
      responseData: {
        userId: user.id,
        newUser: isNewUser,
        tokenGenerated: true
      },
      responseTime,
      errorMessage: null
    });
    
    // 8. Redirect to dashboard with token
    return redirectToDashboard(jwtToken);
    
  } catch (error) {
    // 9. Log error
    const responseTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    await serviceApiRepository.trackUsage({
      configId: null,
      serviceName: provider,
      operation: "oauth_callback",
      status: "failed",
      statusCode: "500",
      requestData: { provider },
      responseData: null,
      responseTime,
      errorMessage: errorMsg
    });
    
    return redirectWithError("callback_error", errorMsg);
  }
}
```

---

### 3. Queries de Monitoring

#### Dashboard Real-Time (24h)

```sql
-- Overview Statistics
SELECT 
  service_name,
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY service_name), 2) as percentage,
  ROUND(AVG(response_time), 2) as avg_response_ms,
  MAX(response_time) as max_response_ms
FROM service_api_usage
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND service_name IN ('github', 'google')
GROUP BY service_name, status
ORDER BY service_name, status DESC;
```

#### Error Tracking (1h)

```sql
-- Recent Errors
SELECT 
  created_at,
  service_name,
  operation,
  status_code,
  error_message,
  response_time
FROM service_api_usage
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```

#### Performance Analysis (7d)

```sql
-- Performance Metrics
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  service_name,
  operation,
  COUNT(*) as requests,
  ROUND(AVG(response_time), 2) as avg_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_ms
FROM service_api_usage
WHERE created_at > NOW() - INTERVAL '7 days'
  AND service_name IN ('github', 'google')
GROUP BY DATE_TRUNC('hour', created_at), service_name, operation
ORDER BY hour DESC, service_name, operation;
```

---

### 4. Alerting Rules

#### Configuration Recommandée

| Alert | Condition | Action | Severity |
|-------|-----------|--------|----------|
| **High Error Rate** | Erreurs > 10% en 1h | Page Slack dev | 🔴 Critical |
| **Slow Response** | P95 > 2000ms en 1h | Page Slack ops | 🟠 Warning |
| **OAuth Down** | 0 succès en 15min | Page PagerDuty | 🔴 Critical |
| **Config Missing** | "not_configured" errors | Email admin | 🟡 Important |

---

### 5. Dashboard Mock-up

#### OAuth Logs Real-Time Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ OAuth Logs Dashboard                    [24h] [7d] [30d]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Success Rate: 98.5%          Avg Response: 156ms         │
│  Total Requests: 1,247        P95 Response: 342ms         │
│  Errors (1h): 2               P99 Response: 892ms         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  GitHub        │ Google          │ Combined                │
│  ✅ 654        │ ✅ 456          │ ✅ 98.5% success       │
│  ❌ 8          │ ❌ 1            │ ❌ 1.5% failed         │
│  ⏱️ 145ms      │ ⏱️ 168ms        │ 📊 Trending UP ↗       │
├─────────────────────────────────────────────────────────────┤
│ Recent Errors                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 14:32 GitHub | oauth_callback | CSRF token mismatch │   │
│ │ 14:15 Google | oauth_initiation | config missing    │   │
│ └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Performance Trend (last 24h)                               │
│                                                              │
│  400ms │                                                    │
│  300ms │  ╱╲    ╱╲                                         │
│  200ms │ ╱  ╲  ╱  ╲                                        │
│  100ms │╱    ╲╱    ╲                                       │
│    0ms └──────────────────────── 24h                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Troubleshooting via Logs

#### Scenario: "OAuth not working"

**Step 1**: Vérifier recent OAuth initiations

```sql
SELECT COUNT(*) as initiations_24h
FROM service_api_usage
WHERE service_name IN ('github', 'google')
  AND operation = 'oauth_initiation'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Resultat**: 
- `0` → Provider non configuré
- `> 0` → Fonctionnement normale

**Step 2**: Si initiations existantes, vérifier les callbacks

```sql
SELECT 
  status,
  COUNT(*) as count,
  error_message
FROM service_api_usage
WHERE operation = 'oauth_callback'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY status, error_message;
```

**Step 3**: Analyser les erreurs

```sql
SELECT DISTINCT error_message
FROM service_api_usage
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY error_message;
```

---

### 7. Checklist de Logging

#### Pour Chaque Opération OAuth

- [ ] Log dans `service_api_usage` table
- [ ] Incluir `configId`, `serviceName`, `operation`
- [ ] Incluir `status` et `statusCode`
- [ ] Incluir `responseTime` (ms)
- [ ] Incluir `requestData` (non-sensitive)
- [ ] Incluir `responseData` (non-sensitive)
- [ ] Incluir `errorMessage` (si erreur)
- [ ] Incluir `createdAt` (timestamp)
- [ ] Pas de credentials en logs
- [ ] Pas de tokens en logs
- [ ] Pas de emails (ou hashés)

#### Pour Chaque Dashboard

- [ ] Filtres par provider
- [ ] Filtres par date range
- [ ] Filtres par status
- [ ] Statistiques de base (count, rate)
- [ ] Performance metrics (avg, p95, p99)
- [ ] Error list avec messages
- [ ] Timeline visualisation
- [ ] Real-time auto-refresh

---

### 8. Gestion des Logs Long-Terme

#### Archivage Recommandé

| Period | Action | Storage |
|--------|--------|---------|
| 0-30d | Actif dans `service_api_usage` | Primary DB |
| 30-90d | Archive dans `service_api_usage_archive` | Warm storage |
| 90d+ | Delete ou archive cloud | Cold storage/S3 |

#### Query Archiv

```sql
-- Archive logs > 30 days
INSERT INTO service_api_usage_archive
SELECT * FROM service_api_usage
WHERE created_at < NOW() - INTERVAL '30 days'
  AND NOT archived;

UPDATE service_api_usage
SET archived = true
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## 📚 Documentation Associée

- [LOGGING_AND_MONITORING.md](./LOGGING_AND_MONITORING.md) - Architecture complète
- [ACTION_LOG.md](./ACTION_LOG.md) - Journal des actions
- [DEBUGGING_LOGGING_SYSTEM.md](./DEBUGGING_LOGGING_SYSTEM.md) - Debugging guide

---

**Dernière mise à jour**: 24 janvier 2026  
**Maintenu par**: Development Team  
**Révision suivante**: 31 janvier 2026
