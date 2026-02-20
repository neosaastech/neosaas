---
# Logging et Monitoring - Architecture et Documentation

**Date**: 9 Février 2026
**Version**: 2.0
**Status**: Opérationnel

---

## Vue d'Ensemble

Le système NeoSaaS inclut un **système de logging complet** pour:
1. **Audit Trail** - Traçabilité de toutes les opérations OAuth
2. **Billing Sync** - Logs de synchronisation Lago (plans, add-ons, customers, taxes, coupons)
3. **Debugging** - Diagnostique rapide des problèmes
4. **Monitoring** - Métriques de performance et fiabilité
5. **Sécurité** - Journal des accès et tentatives

---

## Tables de Logging

### 1. Table: `system_logs` (System Logs)

**Visible dans**: Admin > Settings > System Logs

**Catégories**:
- `payment` - Synchronisation Lago, erreurs billing
- `system` - Événements système généraux
- `security` - Accès, tentatives, alertes

**Schéma**:
```typescript
{
  id: uuid
  category: string       // "payment" | "system" | "security"
  level: string          // "info" | "warning" | "error"
  message: string        // Message principal
  userId: uuid           // Utilisateur associé (optionnel)
  metadata: jsonb        // Données additionnelles (steps, totals, etc.)
  createdAt: timestamp
}
```

**Action associée**: `logSystemEvent()` dans `app/actions/logs.ts`

```typescript
import { logSystemEvent } from '@/app/actions/logs'

await logSystemEvent({
  category: 'payment',
  level: 'error',
  message: 'Lago sync [plans]: [ERROR] Plan creation failed',
  userId: currentUser.userId,
  metadata: { step: 'plans', detail: 'Validation error...' },
})
```

### 2. Table: `service_api_usage` (API Usage Tracking)

**Schéma**:
```typescript
{
  id: uuid              // Identifiant unique
  configId: uuid        // Référence à service_api_configs
  serviceName: string   // "github" | "google" | etc.
  operation: string     // "oauth_initiation" | "oauth_callback" | "api_call"
  status: string        // "success" | "failed"
  statusCode: string    // "200" | "302" | "400" | "500" | etc.
  requestData: jsonb    // Données de la requête
  responseData: jsonb   // Données de la réponse
  responseTime: integer // Temps en ms
  errorMessage: string  // Message d'erreur (si applicable)
  createdAt: timestamp  // Quand la log a été créée
}
```

---

## 🔐 OAuth Operations Logging

### 1. OAuth Initiation (`oauth_initiation`)

**Quand**: Utilisateur clique "Continue with GitHub/Google"  
**Route**: `GET /api/auth/oauth/github` ou `/api/auth/oauth/google`  
**Fichier**: `app/api/auth/oauth/{provider}/route.ts`

**Données Loguées**:
```typescript
{
  configId: "uuid-of-config",
  serviceName: "github",
  operation: "oauth_initiation",
  status: "success",
  statusCode: "302",
  requestData: {
    redirectUri: "https://accounts.github.com/login/oauth/authorize",
    scope: "user:email",
    state: "csrf-token-xxx"
  },
  responseData: {
    redirectUrl: "https://github.com/login/oauth/authorize?..."
  },
  responseTime: 45,
  errorMessage: null,
  createdAt: "2026-01-24T10:15:30Z"
}
```

**Cas d'Erreur**:
```typescript
{
  status: "failed",
  statusCode: "400",
  errorMessage: "GitHub OAuth is not configured. Please configure it in /admin/api",
  responseTime: 15
}
```

### 2. OAuth Callback (`oauth_callback`)

**Quand**: GitHub/Google redirige avec code d'autorisation  
**Route**: `GET /api/auth/oauth/{provider}/callback`  
**Fichier**: `app/api/auth/oauth/{provider}/callback/route.ts`

**Données Loguées - Succès**:
```typescript
{
  configId: "uuid-of-config",
  serviceName: "github",
  operation: "oauth_callback",
  status: "success",
  statusCode: "200",
  requestData: {
    code: "authorization-code-from-github",
    state: "csrf-token-xxx",
    provider: "github"
  },
  responseData: {
    userId: "user-uuid",
    email: "user@example.com",
    newUser: false,
    tokenGenerated: true
  },
  responseTime: 320,
  errorMessage: null
}
```

**Données Loguées - Erreur**:
```typescript
{
  status: "failed",
  statusCode: "400",
  errorMessage: "CSRF token mismatch - potential CSRF attack",
  responseTime: 25
}
```

**Erreurs Tracquées**:
| Code | Message | Cause |
|------|---------|-------|
| `400` | Invalid state token | CSRF mismatch |
| `400` | Failed to exchange code | Token endpoint error |
| `400` | Failed to fetch user info | User info endpoint error |
| `401` | Unauthorized | Invalid token |
| `500` | Database error | Cannot create user |
| `503` | Service unavailable | GitHub/Google down |

---

## 📊 Requêtes SQL pour Monitoring

### 1. Voir tous les OAuth logs

```sql
SELECT 
  created_at,
  service_name,
  operation,
  status,
  status_code,
  response_time,
  error_message
FROM service_api_usage
WHERE service_name IN ('github', 'google')
ORDER BY created_at DESC
LIMIT 100;
```

### 2. Taux de succès par provider (24h)

```sql
SELECT 
  service_name,
  status,
  COUNT(*) as count,
  ROUND(AVG(response_time), 2) as avg_response_time_ms
FROM service_api_usage
WHERE service_name IN ('github', 'google')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY service_name, status;
```

### 3. Erreurs fréquentes

```sql
SELECT 
  error_message,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurred
FROM service_api_usage
WHERE error_message IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message
ORDER BY occurrences DESC;
```

### 4. Response time analysis

```sql
SELECT 
  service_name,
  operation,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_ms,
  MAX(response_time) as max_ms
FROM service_api_usage
WHERE service_name IN ('github', 'google')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY service_name, operation;
```

---

## 📈 Dashboard Admin - À Implémenter

### Écran 1: OAuth Logs Overview

**Route**: `/admin/monitoring/oauth-logs`

**Composants**:
1. **Filtres**:
   - Provider (GitHub, Google, tous)
   - Date range (24h, 7d, 30d, custom)
   - Operation (initiation, callback)
   - Status (succès, erreur)

2. **Statistiques**:
   - Taux de succès global (%)
   - Nombre total d'initiations (24h)
   - Nombre total de succès (24h)
   - Response time moyen (ms)

3. **Graphique**: Logs par heure (line chart)

4. **Tableau**:
   - Timestamp
   - Provider
   - Operation
   - Status (✅/❌)
   - Response Time
   - Error (si applicable)

### Écran 2: OAuth Health Check

**Route**: `/admin/monitoring/oauth-health`

**Composants**:
1. **Configuration Status**:
   - GitHub: ✅ Configured | ❌ Missing
   - Google: ✅ Configured | ❌ Missing

2. **Latest Test Results**:
   - Last success timestamp
   - Last error timestamp
   - Last error message

3. **Performance Metrics**:
   - P50 response time
   - P95 response time
   - P99 response time
   - Error rate (%)

### Écran 3: Error Analysis

**Route**: `/admin/monitoring/oauth-errors`

**Composants**:
1. **Error Frequency** (bar chart)
2. **Error Timeline** (line chart)
3. **Top Errors Table**:
   - Error message
   - Frequency
   - Last occurred
   - Affected users count

---

## 🔍 Debugging via Logs

### Scenario 1: OAuth Button Not Appearing

**Diagnostic Steps**:
1. Vérifier logs `service_api_usage` pour le provider (GitHub/Google)
2. Chercher les entrées `oauth_initiation`
3. Si pas d'entrées → Provider non configuré

**Requête SQL**:
```sql
SELECT COUNT(*) FROM service_api_usage
WHERE service_name = 'github'
  AND operation = 'oauth_initiation'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Logs à vérifier en prod**:
- Vercel logs: `GET /api/auth/oauth/config`
- Filtrer par erreurs

### Scenario 2: OAuth Callback Fails

**Diagnostic Steps**:
1. Vérifier logs `service_api_usage` pour `oauth_callback`
2. Regarder `status = 'failed'`
3. Voir `error_message` pour le diagnostic

**Requête SQL**:
```sql
SELECT 
  created_at, 
  service_name, 
  status_code, 
  error_message
FROM service_api_usage
WHERE operation = 'oauth_callback'
  AND status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Scenario 3: Slow OAuth Initiation

**Diagnostic Steps**:
1. Vérifier response_time dans les logs
2. Si > 1000ms → Problème de latence
3. Vérifier GitHub/Google status page

**Requête SQL**:
```sql
SELECT 
  created_at,
  service_name,
  response_time
FROM service_api_usage
WHERE operation = 'oauth_initiation'
  AND response_time > 1000
ORDER BY response_time DESC;
```

---

## Lago Sync Logging

### Fonctionnement

Chaque synchronisation Lago écrit dans `system_logs` :

1. **Log de synthèse** (level: `info` ou `warning`)
   - Message: `Lago sync completed: X synced, Y skipped, Z errors`
   - Metadata: `{ syncSteps, totalSynced, totalSkipped, totalErrors, validationTime }`

2. **Logs d'erreur individuels** (level: `error`, un par erreur)
   - Message: `Lago sync [plans]: [ERROR] Plan Title: validation error — {...}`
   - Metadata: `{ step: 'plans', detail: 'Full Lago API error response' }`

### Consultation

**Via l'interface Admin** : Admin > Settings > System Logs, filtrer par catégorie "Payment"

**Via SQL** :
```sql
-- Toutes les syncs Lago des dernières 24h
SELECT created_at, level, message, metadata
FROM system_logs
WHERE category = 'payment'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Erreurs Lago uniquement
SELECT created_at, message, metadata->>'step' as step, metadata->>'detail' as detail
FROM system_logs
WHERE category = 'payment' AND level = 'error'
ORDER BY created_at DESC
LIMIT 20;
```

### Panneau de résultats (UI)

Le composant `payment-settings.tsx` affiche un panneau de résultats directement après chaque sync avec tous les détails color-codés :
- `[OK]` vert, `[UPDATE]` bleu, `[SKIP]` orange, `[INFO]` bleu, `[ERROR]` rouge

### Fichiers associés

| Fichier | Rôle |
|---------|------|
| `app/actions/lago-sync.ts` | Génère les détails par étape (details[]) |
| `app/api/admin/lago/sync/route.ts` | Écrit les résultats dans system_logs |
| `app/actions/logs.ts` | `logSystemEvent()` - insertion dans system_logs |
| `components/admin/payment-settings.tsx` | Affiche le panneau de résultats |
| `app/(private)/admin/logs/logs-client.tsx` | Affiche les System Logs |

---

## Checklist de Logging

### Pour Développeurs

- [ ] Tous les appels OAuth loggés dans `service_api_usage`
- [ ] Status + statusCode inclus
- [ ] requestData contient paramètres importants
- [ ] responseData contient résultats
- [ ] errorMessage est descriptif
- [ ] responseTime mesuré en ms
- [ ] Aucun credential/token loggé en clair

### Pour Administrateurs

- [ ] Dashboard OAuth logs accessible
- [ ] Filtres fonctionnent correctement
- [ ] Graphiques mise à jour toutes les 5 minutes
- [ ] Alertes sur erreurs > 10% taux
- [ ] Rapports hebdomadaires OAuth

### Pour Sécurité

- [ ] Logs de toutes les tentatives OAuth
- [ ] Erreurs CSRF détectées et loggées
- [ ] Tentatives rate-limiting loggées
- [ ] IP source loggée (futur)
- [ ] Audit trail conservé 90 jours minimum

---

## 🚀 Implémentation Requise

### Phase 1: Dashboard Básic (1-2 jours)

- [ ] Créer page `/admin/monitoring/oauth-logs`
- [ ] Implémenter filtres (provider, date, status)
- [ ] Afficher tableau des logs
- [ ] Ajouter statistiques globales

### Phase 2: Advanced Metrics (2-3 jours)

- [ ] Graphiques response time
- [ ] Taux de succès par provider
- [ ] Error frequency analysis
- [ ] Performance percentiles (P50, P95, P99)

### Phase 3: Alerting (3-4 jours)

- [ ] Email alerts sur erreurs > threshold
- [ ] Slack integration (optionnel)
- [ ] Daily/Weekly reports
- [ ] Dashboard notifications

---

## Fichiers Liés

### OAuth Logging
- `app/api/auth/oauth/github/route.ts` - Logs initiation GitHub
- `app/api/auth/oauth/github/callback/route.ts` - Logs callback GitHub
- `app/api/auth/oauth/google/route.ts` - Logs Google
- `app/api/auth/oauth/google/callback/route.ts` - Logs Google callback

### Lago Sync Logging
- `app/actions/lago-sync.ts` - Sync logic with step-level details
- `app/api/admin/lago/sync/route.ts` - Writes sync results to system_logs
- `app/actions/logs.ts` - `logSystemEvent()` function
- `components/admin/payment-settings.tsx` - UI results panel

### Repository
- `lib/data/service-api-repository.ts` - `trackUsage()` method

### Database
- `db/schema.ts` - `service_api_usage` table definition
- `db/schema.ts` - `system_logs` table definition (`systemLogs`)

---

**Dernière mise à jour**: 9 février 2026
**Statut**: Documentation et Implémentation Opérationnelles
