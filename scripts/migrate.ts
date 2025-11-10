import { drizzle } from "drizzle-orm/neon-http"
import { migrate } from "drizzle-orm/neon-http/migrator"
import { neon } from "@neondatabase/serverless"

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  const db = drizzle(sql)

  console.log("[v0] Running migrations...")

  await migrate(db, { migrationsFolder: "./drizzle" })

  console.log("[v0] Migrations completed successfully!")
  process.exit(0)
}

main().catch((err) => {
  console.error("[v0] Migration failed:", err)
  process.exit(1)
})
