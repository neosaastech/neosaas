import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/db"
import { formSubmissions } from "@/db/schema"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const FORM_SUBMIT_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 } // 10 submissions / hour / IP

const SubmitSchema = z.object({
  formName: z.string().min(1),
  pagePath: z.string().min(1),
  fields: z.record(z.union([z.string(), z.boolean()])),
})

/**
 * Public endpoint for the "form" page layer (components/layers/form-layer.tsx)
 * — no auth, any visitor can submit. Stores raw fields as-is (jsonb, no fixed
 * columns) since the field schema is authored in Payload per form instance,
 * not known ahead of time here. No email/CRM notification wired yet — that's
 * a separate decision, submissions are consulted directly in the DB for now.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers)
  const limit = await checkRateLimit(`form-submit:ip:${ip}`, FORM_SUBMIT_RATE_LIMIT)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 0) } },
    )
  }

  const body = await request.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 })
  }

  const { formName, pagePath, fields } = parsed.data
  await db.insert(formSubmissions).values({ formName, pagePath, fields })

  return NextResponse.json({ ok: true })
}
