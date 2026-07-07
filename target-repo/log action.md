# Log Action

## 2026-02-07
- Reviewed docs index and onboarding entry points (docs/DOCUMENTATION_INDEX.md, docs/00-START-HERE.md).
- Reviewed coupon system documentation (docs/UPSELL_COUPON_SYSTEM.md, docs/PRODUCT_COUPON_INTEGRATION.md).
- Reviewed coupon actions implementation (app/actions/coupons.ts).
- Searched for existing action log file; none found, created this log.
- Checked public-facing checkout/booking UI; no coupon input found (app/(public)/book/[productId]/page.tsx, components/checkout/*).
- Verified public store page redirects to dashboard, so no public store UI to enter coupons (app/(public)/store/page.tsx).
- Added a coupon management overlay to the products admin page (app/(private)/admin/products/page.tsx, app/(private)/admin/products/products-page-client.tsx).
- Translated remaining French text in the product form section to English (app/(private)/admin/products/product-form.tsx).
- Translated subscription recurrence UI labels to English in the product form (app/(private)/admin/products/product-form.tsx).
- Enabled promo code creation when a price is set, even before the product is saved (app/(private)/admin/products/product-form.tsx).
- Added promo code entry points near the products actions toolbar and VAT block in product edit (app/(private)/admin/products/products-page-client.tsx, app/(private)/admin/products/product-form.tsx).
- Added promo badges with hover details in products table (app/(private)/admin/products/products-table.tsx).
- Updated promo badges to display absolute discount values in label and tooltip (app/(private)/admin/products/products-table.tsx).
- Added productId to order items schema to fix notifications query errors (db/schema.ts).
- Removed productId from admin notifications query to avoid 500 when the column is missing in DB (app/api/admin/notifications/route.ts).
- Added order_items.product_id to db safety net to prevent missing column after deploy (scripts/db-ensure-columns.ts).
- Switched migrations to prefer DATABASE_URL_UNPOOLED for Neon (scripts/build-with-db.sh, scripts/db-ensure-columns.ts, drizzle.config.ts).
- Fixed db safety net SQL execution for Neon by using sql.query (scripts/db-ensure-columns.ts).
- Forced IPv4-first DNS resolution during DB migrations to avoid IPv6 ENETUNREACH (scripts/build-with-db.sh).
- Added a local safe migration script with connectivity check and IPv4-first DNS (scripts/db-migrate-safe.sh).
- Updated GitHub Actions DB migration workflow to use the safe script and unpooled URL (.github/workflows/db-migrate.yml).
- Added a CI/Vercel guard to skip DB migrations when handled by an external runner (scripts/build-with-db.sh).
