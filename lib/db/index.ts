import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "./schema"

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL environment variable is not set")
}

// Create Neon HTTP client
const sql = neon(process.env.NEON_DATABASE_URL)

// Create Drizzle instance with schema
export const db = drizzle(sql, { schema })

// Export schema for external use
export * from "./schema"
