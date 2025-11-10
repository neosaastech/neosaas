import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import * as schema from "../lib/db/schema"

async function main() {
  const sql = neon(process.env.NEON_DATABASE_URL!)
  const db = drizzle(sql, { schema })

  console.log("[v0] Seeding database...")

  // Seed users
  const [user1, user2] = await db
    .insert(schema.users)
    .values([
      {
        email: "admin@neosaas.com",
        name: "Admin User",
        emailVerified: true,
      },
      {
        email: "demo@neosaas.com",
        name: "Demo User",
        emailVerified: true,
      },
    ])
    .returning()

  console.log("[v0] Created users:", user1.email, user2.email)

  // Seed subscriptions
  await db.insert(schema.subscriptions).values([
    {
      userId: user1.id,
      plan: "pro",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      userId: user2.id,
      plan: "starter",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ])

  console.log("[v0] Seeding completed successfully!")
  process.exit(0)
}

main().catch((err) => {
  console.error("[v0] Seeding failed:", err)
  process.exit(1)
})
