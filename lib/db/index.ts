import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("NEON_DATABASE_URL or DATABASE_URL environment variable is not set")
}

// Create Neon HTTP client
const sql = neon(databaseUrl)

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema })

// Export schema for external use
export * from "./schema"
