/**
 * Seeds page_layers compositions for marketing pages.
 * Idempotent: skips pages that already have layers.
 */
import { db } from '../db'
import { pageLayers } from '../db/schema'
import { eq } from 'drizzle-orm'
import { buildHomeLayers } from '../lib/pages/home-content'

const LOCALES = ['fr', 'en'] as const

async function seedIfEmpty(pagePath: string, layers: typeof pageLayers.$inferInsert[]) {
  const existing = await db.select().from(pageLayers).where(eq(pageLayers.pagePath, pagePath)).limit(1)
  if (existing.length > 0) {
    console.log(`  ℹ️  ${pagePath} already has layers — skipped`)
    return
  }
  await db.insert(pageLayers).values(layers)
  console.log(`  ✓ ${pagePath} layers seeded (${layers.length} blocks)`)
}

async function seedPageLayers() {
  for (const locale of LOCALES) {
    await seedIfEmpty('/', buildHomeLayers(locale))
  }

  process.exit(0)
}

seedPageLayers().catch((error) => {
  console.error('  ❌ Page layers seeding failed:', error)
  process.exit(1)
})
