/**
 * DB Connectivity Test - Test database connection via Neon HTTP driver
 *
 * Uses HTTPS (port 443) which is always reachable from Vercel builds,
 * unlike TCP connections on non-standard ports (e.g., 48278) that may be blocked.
 *
 * Usage: npx tsx scripts/db-connectivity-test.ts
 */
import { neon } from '@neondatabase/serverless'

function cleanDatabaseUrl(url: string): string {
  return url
    .replace('&channel_binding=require', '')
    .replace('channel_binding=require&', '')
    .replace('?channel_binding=require', '')
}

function maskUrl(url: string): string {
  // Show host and port only, mask credentials
  return url.replace(/\/\/[^@]+@/, '//***:***@')
}

async function main() {
  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED
  const pooledUrl = process.env.DATABASE_URL
  const url = unpooledUrl || pooledUrl

  if (!url) {
    console.error('  DATABASE_URL not set')
    process.exit(1)
  }

  console.log(`  URL type: ${unpooledUrl ? 'UNPOOLED (direct)' : 'POOLED'}`)
  console.log(`  Host: ${maskUrl(url)}`)

  // Extract and display port info for diagnostics
  const portMatch = url.match(/:(\d+)\//)
  if (portMatch) {
    const port = parseInt(portMatch[1])
    console.log(`  Port: ${port}${port !== 5432 ? ' (non-standard - TCP may be blocked from Vercel builds)' : ' (standard)'}`)
  } else {
    console.log('  Port: 5432 (default)')
  }

  const sql = neon(cleanDatabaseUrl(url))

  const maxRetries = 3
  const baseWait = 2000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const start = Date.now()
      const result = await sql`SELECT 1 as ok, current_database() as db, version() as version`
      const elapsed = Date.now() - start

      if (result[0]?.ok === 1) {
        console.log(`  Database: ${result[0].db}`)
        console.log(`  Latency: ${elapsed}ms (HTTP)`)
        console.log('  Status: OK')
        process.exit(0)
      }
    } catch (e: any) {
      console.error(`  Attempt ${attempt}/${maxRetries} failed: ${e.message?.slice(0, 120)}`)
      if (attempt < maxRetries) {
        const wait = baseWait * Math.pow(2, attempt - 1)
        console.log(`  Retrying in ${wait / 1000}s...`)
        await new Promise(r => setTimeout(r, wait))
      }
    }
  }

  console.error('  All connectivity attempts failed')
  process.exit(1)
}

main()
