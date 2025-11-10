import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "@/lib/db/schema"

let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (_db) return _db

  console.log("[v0] Initializing database connection...")

  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.NEON_POSTGRES_URL || process.env.DATABASE_URL

  console.log("[v0] Database URL found:", databaseUrl ? "YES" : "NO")

  if (!databaseUrl) {
    const error = "No database URL found in environment variables"
    console.error("[v0] DB Connection Error:", error)
    throw new Error(error)
  }

  try {
    // Create Neon HTTP client
    console.log("[v0] Creating Neon HTTP client...")
    const sql = neon(databaseUrl)

    // Create Drizzle instance with schema
    console.log("[v0] Creating Drizzle instance...")
    _db = drizzle(sql, { schema })

    console.log("[v0] Database connection initialized successfully")
    return _db
  } catch (error) {
    console.error("[v0] Failed to initialize database:", error)
    throw error
  }
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const dbInstance = getDb()
    return (dbInstance as any)[prop]
  },
})

// Export schema for external use
export * from "@/lib/db/schema"
