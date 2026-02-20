# ⚠️ LEGACY — Lago Billing Configuration

> **⛔ Ce document est LEGACY.**  
> Lago a été **retiré le 16 février 2026**. Le système de paiement actuel utilise **Stripe Direct**.  
> Consultez la documentation à jour :
> - [STRIPE_QUICK_START.md](./STRIPE_QUICK_START.md) — Setup rapide
> - [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md) — Architecture complète  
> - [STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md) — Webhooks
>
> Le contenu ci-dessous est conservé à titre de référence historique uniquement.

---

NeoSaaS uses [Lago](https://getlago.com/) for billing and invoicing. You can connect to either a self-hosted Lago instance or the Lago Cloud.

**Derniere mise a jour**: 16 fevrier 2026 (marqué LEGACY)
**Version**: 2.0 (obsolète)

## Configuration

Navigate to **Business Dashboard > Settings > Payments** (`/admin/settings`).

### Environment Modes

You can switch between **Dev**, **Test**, and **Production** modes instantly via the 3-mode selector in the admin panel.

1.  **Dev Mode** (Purple): Uses the `Test API Key` against the Lago sandbox. Ideal for a final pre-production run.
2.  **Test Mode** (Orange): Lago sync is disabled (no API calls).
3.  **Production Mode** (Green): Uses the `Production API Key`. Real invoices are generated.

### Setup Steps

1.  **Lago API URL**:
    *   For Lago Cloud: `https://api.getlago.com/v1` (Default)
    *   For Self-Hosted: Enter your instance URL (e.g., `https://api.lago.yourdomain.com/v1`).

2.  **API Keys**:
    *   **Production API Key**: Enter your live API key from the Lago dashboard.
    *   **Test API Key**: Enter your test API key.
    *   Keys are stored encrypted in the `service_api_configs` table (AES-256-GCM) or in `platformConfig`.

3.  **Enable Payments**:
    *   Toggle "Enable Payments" to activate the billing system globally.

## Integration Details

The system automatically selects the correct API key based on the selected mode in the database.

```typescript
// lib/lago.ts
export type LagoMode = 'production' | 'test' | 'dev';

const mode = (configMap['lago_mode'] || process.env.LAGO_MODE || 'dev') as LagoMode;

const apiKey = mode === 'production'
    ? (configMap['lago_api_key'] || process.env.LAGO_API_KEY)
    : (configMap['lago_api_key_test'] || process.env.LAGO_API_KEY_TEST);
```

### Credential Resolution (Priority Order)

The sync route resolves credentials in this order:
1. **`service_api_configs` table** (API Management page at `/admin/api`)
2. **`platformConfig` table** (legacy / env vars)

### Dynamic Payment Methods

The checkout page dynamically shows/hides payment methods based on the configuration:

- **Dev Mode**: No payment methods shown, "Mode Developpement" message displayed
- **Test/Production**: Shows only enabled payment methods (Stripe, PayPal)

Payment methods are configured via toggles in Admin > Settings > Payments:
- `lago_stripe_enabled`: Enable/disable Stripe card payments
- `lago_paypal_enabled`: Enable/disable PayPal payments

---

## Synchronization Details

### Architecture

All Lago API calls use **direct HTTP** via `lagoFetch()` helper (no SDK dependency).

**Key files**:
- `app/actions/lago-sync.ts` — Full sync logic (customers, taxes, plans, add-ons, coupons)
- `app/actions/payments.ts` — Payment actions (invoices, subscriptions, manual payments)
- `app/api/admin/lago/sync/route.ts` — Sync API endpoint + system log writing
- `components/admin/payment-settings.tsx` — Sync UI with results panel
- `lib/lago.ts` — Config loader (mode, API key selection)
- `lib/lago-utils.ts` — URL normalization

### Sync Steps

The full sync (`runFullLagoSync`) executes the following steps in order:

| Step | Description | Source | Lago Endpoint |
|------|------------|--------|---------------|
| 1. Customers | Active users with company metadata | `users` table | `POST /customers` |
| 2. Taxes | VAT rates (must precede plans/add-ons) | `vatRates` table | `POST /taxes` |
| 3. Plans | Subscription products (recurring) | `products` where `paymentType='subscription'` | `POST /plans` |
| 4. Add-ons | One-time/hourly products | `products` where `paymentType!='subscription'` | `POST /add_ons` |
| 5. Coupons | Active discount coupons | `coupons` table | `POST /coupons` |

### Product -> Lago Mapping

| NeoSaaS `paymentType` | Lago Entity | Lago Endpoint | Notes |
|---|---|---|---|
| `subscription` | **Plan** | `POST /plans` | One plan per interval (weekly/monthly/yearly) |
| `one_time` | **Add-on** | `POST /add_ons` | Single add-on per product |
| `hourly` | **Add-on** | `POST /add_ons` | Single add-on per product |

### Subscription Plans (Detail)

For products with `paymentType = 'subscription'`, the sync creates **one Lago plan per billing interval** that has a price defined:

- `subscriptionPriceWeekly` -> Lago interval `weekly`
- `subscriptionPriceMonthly` -> Lago interval `monthly`
- `subscriptionPriceYearly` -> Lago interval `yearly`

**Fallback**: If no subscription prices are set, the main `price` field is used with a `monthly` interval.

**Plan code format**: `{product_id}-{interval}` (e.g., `550e8400-...-monthly`)

**Plan configuration**:
```typescript
{
  plan: {
    name: "Product Title (Mensuel)",
    code: "{product_id}-monthly",
    interval: "monthly",
    amount_cents: 2990,           // from subscriptionPriceMonthly
    amount_currency: "EUR",
    pay_in_advance: true,
    tax_codes: ["tva_20"]         // from linked vatRate
  }
}
```

### Add-ons (Detail)

For products with `paymentType = 'one_time'` or `'hourly'`:

**Add-on code format**: `{product_id}` (UUID)

```typescript
{
  add_on: {
    name: "Product Title",
    code: "{product_id}",
    amount_cents: 4900,
    amount_currency: "EUR",
    tax_codes: ["tva_20"]
  }
}
```

**Validation**: Products with `price <= 0` are skipped (counted as "skipped" in results).

### Customer Sync (Detail)

Each active user is synced with:
- `external_id`: user ID (UUID)
- Company metadata (name, SIRET, VAT number, address)
- Billing address (company address with user fallback)
- `billing_configuration.payment_provider = "stripe"` when Stripe is enabled

### Error Handling

Each sync step uses an upsert strategy:
1. **POST** to create the resource
2. If **422** with "code already taken" -> **PUT** to update
3. If **422** with other validation error -> count as error with full Lago error body
4. Other HTTP errors -> count as error

### Diagnostic Info

The `syncPlans()` step logs the **product paymentType distribution** to help debug missing plans:
```
[INFO] Product paymentType distribution: {"one_time":3,"subscription":1}
```

If you see `{"one_time":4}` or `{"null":4}`, it means no products have `paymentType = 'subscription'` — plans won't be created.

---

## Sync Results & Logging

### Sync Results Panel (UI)

After each sync, a **results panel** appears directly below the "Sync with Lago" button in `/admin/settings` showing:
- Each step with status icon (success/error/skipped)
- Counts per step (synced/skipped/errors)
- **All details** color-coded:
  - `[OK]` green — created successfully
  - `[UPDATE]` blue — updated existing
  - `[SKIP]` orange — skipped (with reason)
  - `[INFO]` blue — diagnostic information
  - `[ERROR]` red — error with Lago API response

### System Logs

Every sync writes results to the **`system_logs` table** (visible at **Admin > Settings > System Logs**, filter by category `payment`):

- **Summary log** (level `info` or `warning`): "Lago sync completed: X synced, Y skipped, Z errors"
- **Individual error logs** (level `error`): One entry per sync error with full Lago API error message

```sql
-- View recent Lago sync logs
SELECT * FROM system_logs
WHERE category = 'payment'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Customer Portal & Payment Methods

NeoSaaS integrates with Lago's **Customer Portal** to securely manage payment methods.

### How it works

1.  **View Payment Methods**: The user's payment methods are fetched directly from Lago and displayed in `Dashboard > Payments`.
2.  **Manage Cards**: When a user clicks "Manage Cards", the system generates a secure, temporary URL to the Lago Customer Portal.
3.  **Redirect**: The user is redirected to Lago's hosted portal where they can:
    *   Add new credit cards.
    *   Update existing cards.
    *   Set a default payment method.
    *   Delete cards.

### Implementation

*   **Frontend**: `app/(private)/dashboard/payments/page.tsx`
*   **Backend Actions**: `app/actions/payments.ts` (uses direct HTTP calls to Lago API)

#### Available Actions

| Action | Description | Lago Endpoint |
|--------|-------------|---------------|
| `getPaymentMethods()` | Retrieves payment provider info from Lago customer | `GET /customers/{id}` |
| `getCustomerPortalUrl()` | Generates the magic link for the Lago portal | `POST /customers/{id}/portal_url` |
| `getInvoices()` | Retrieves billing history | `GET /invoices?external_customer_id={id}` |
| `getInvoiceCheckoutUrl(invoiceId)` | Generates a Stripe checkout URL for a specific invoice | `POST /invoices/{id}/payment_url` |
| `recordPaymentInLago(params)` | Records an external payment (e.g., PayPal) in Lago | `POST /payments` |
| `createSubscription(params)` | Assigns a Lago plan to a customer | `POST /subscriptions` |
| `createOneTimeInvoice(params)` | Creates a one-time invoice using an add-on | `POST /invoices` |

This approach ensures PCI compliance as sensitive card data is never handled directly by the NeoSaaS application.

---

## Payment Providers

### Stripe (Native Lago Integration)

Stripe is natively supported by Lago. When `lago_stripe_enabled` is set to `true`:
- The Stripe secret key must be configured in the Lago dashboard (Organization > Integrations > Stripe).
- The Stripe public key and secret key are stored in the NeoSaaS API Management page (`service_api_configs` table).
- During sync, each customer gets `billing_configuration.payment_provider = "stripe"`.
- Lago automatically handles payment intents and checkout URLs via Stripe.

### PayPal (External via Manual Recording)

PayPal is **not** natively supported by Lago (only Stripe and Adyen are native). PayPal payments are handled as follows:
1. PayPal API credentials (Client ID, Client Secret) are stored in the NeoSaaS API Management page.
2. Payments are processed externally via the PayPal API.
3. After a successful PayPal payment, it is recorded in Lago using `POST /payments` endpoint via `recordPaymentInLago()`.
4. This updates the invoice status in Lago, keeping billing records synchronized.

---

## Troubleshooting

### Connection Failed
- Ensure your API URL is correct and accessible from the server.
- Check URL format: should end with `/v1` or be auto-normalized by `normalizeLagoUrl()`.

### Invalid API Key
- Double-check that you haven't mixed up Test and Production keys.
- Verify the key in Lago dashboard > API Keys.

### No Plans Created After Sync
1. **Check paymentType**: Go to Admin > Products and verify the product has `paymentType = 'subscription'`. If it shows "One-time" or nothing, the product goes to add-ons, not plans.
2. **Check sync results panel**: After sync, look at the "Plans (abonnements)" step. The `[INFO]` line shows the paymentType distribution.
3. **Check subscription prices**: The product must have at least one subscription price (weekly/monthly/yearly) OR a main price > 0.
4. **Check system logs**: Go to Admin > Settings > System Logs, filter by category "Payment".

### Sync Shows Errors
1. **Check sync results panel**: Error details appear in red with the full Lago API response.
2. **Common 422 errors**:
   - `tax_codes` referencing a non-existent tax -> ensure VAT rates are synced first.
   - `amount_cents` is 0 -> set a price for the product.
   - Duplicate code -> the update (PUT) should handle this automatically.
3. **Check system logs**: Each error is logged individually in Admin > Settings > System Logs.

### 500 Error
- Check the application logs. It might be due to a missing API key for the selected mode.

---

## Architecture Overview

```
app/actions/
  lago-sync.ts          # Full sync: customers, taxes, plans, add-ons, coupons
  payments.ts           # Payment actions: invoices, subscriptions, portal
  logs.ts               # System logging (logSystemEvent)

app/api/admin/lago/
  sync/route.ts         # POST: Run full sync + write system logs
                        # GET: Quick API key validation

lib/
  lago.ts               # getLagoConfig() - mode/key selection
  lago-utils.ts         # normalizeLagoUrl() - URL format helper

components/admin/
  payment-settings.tsx  # Sync UI: mode selector, sync button, results panel

db/schema.ts
  products              # paymentType: 'one_time' | 'hourly' | 'subscription'
  vatRates              # Tax rates -> Lago taxes
  coupons               # Discount coupons -> Lago coupons
  systemLogs            # Sync results logging (category: 'payment')
  platformConfig        # lago_mode, lago_stripe_enabled, lago_paypal_enabled
  serviceApiConfigs     # Encrypted API keys (Lago, Stripe, PayPal)
```
