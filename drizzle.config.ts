import type { Config } from "drizzle-kit"

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
