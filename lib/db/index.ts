import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "@/lib/db/schema"

console.log("[v0] Initializing database connection...")

// Check for database URL with priority order
const databaseUrl =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.NEON_POSTGRES_URL ||
  process.env.NEON_DATABASE_URL_UNPOOLED

console.log("[v0] Database URL found:", databaseUrl ? "YES" : "NO")
console.log("[v0] Available Neon env vars:", {
  NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
  DATABASE_URL: !!process.env.DATABASE_URL,
  NEON_POSTGRES_URL: !!process.env.NEON_POSTGRES_URL,
  NEON_DATABASE_URL_UNPOOLED: !!process.env.NEON_DATABASE_URL_UNPOOLED,
})

if (!databaseUrl) {
  const error = "No database URL found in environment variables"
  console.error("[v0] DB Connection Error:", error)
  throw new Error(error)
}

let sql: ReturnType<typeof neon>
let db: ReturnType<typeof drizzle>

try {
  // Create Neon HTTP client
  console.log("[v0] Creating Neon HTTP client...")
  sql = neon(databaseUrl)

  // Create Drizzle instance with schema
  console.log("[v0] Creating Drizzle instance...")
  db = drizzle(sql, { schema })

  console.log("[v0] Database connection initialized successfully")
} catch (error) {
  console.error("[v0] Failed to initialize database:", error)
  throw error
}

// Export the database instance
export { db }

// Export schema for external use
export * from "@/lib/db/schema"
