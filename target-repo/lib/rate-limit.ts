import { db } from "@/db"
import { rateLimitAttempts } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

interface RateLimitOptions {
  /** Max attempts allowed within the window. */
  max: number
  /** Window duration in milliseconds. */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  /** Seconds until the caller may retry, only set when allowed is false. */
  retryAfterSeconds?: number
}

/**
 * Fixed-window rate limiter backed by a single upserted row per identifier
 * (db/schema.ts rateLimitAttempts) — no external infra (Redis) required.
 * Call once per attempt; it both checks the current count and increments it.
 */
export async function checkRateLimit(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date()

  const existing = await db.query.rateLimitAttempts.findFirst({
    where: eq(rateLimitAttempts.identifier, identifier),
  })

  const windowExpired = !existing || now.getTime() - existing.windowStart.getTime() > options.windowMs

  if (windowExpired) {
    await db
      .insert(rateLimitAttempts)
      .values({ identifier, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimitAttempts.identifier,
        set: { count: 1, windowStart: now },
      })
    return { allowed: true }
  }

  if (existing.count >= options.max) {
    const retryAfterSeconds = Math.ceil((options.windowMs - (now.getTime() - existing.windowStart.getTime())) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await db
    .update(rateLimitAttempts)
    .set({ count: sql`${rateLimitAttempts.count} + 1` })
    .where(eq(rateLimitAttempts.identifier, identifier))

  return { allowed: true }
}

/** Best-effort client IP extraction, matching the pattern already used in app/api/auth/login. */
export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
}
