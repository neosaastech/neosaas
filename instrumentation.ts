/**
 * Next.js Instrumentation Hook
 * =============================
 * Runs once when the Next.js server starts (Node.js runtime only).
 * Used for one-off background tasks that should fire on each deployment,
 * such as syncing products to Stripe that were created before the auto-sync
 * feature was in place.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in the Node.js server runtime, not in the Edge runtime or during build
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Lazy-import to avoid pulling server-only code into edge bundles
  const { syncUnsyncedProducts } = await import('@/lib/stripe-products')

  // Fire-and-forget — a failure must never block the server startup
  syncUnsyncedProducts().catch((err: Error) => {
    console.error('[instrumentation] syncUnsyncedProducts failed (non-fatal):', err.message)
  })
}
