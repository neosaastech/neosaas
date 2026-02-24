import { type NextRequest, NextResponse } from "next/server"
import { db, validateDatabaseUrl } from "@/db"
import { users, companies, roles, userRoles, verificationTokens } from "@/db/schema"
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth"
import { eq, or } from "drizzle-orm"
import { emailRouter, emailTemplateRepository } from "@/lib/email"
import { randomBytes } from "crypto"
import { getPlatformConfig } from "@/lib/config"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Registration API called")

    try {
      validateDatabaseUrl()
      console.log("[v0] Database URL validated successfully")
    } catch (dbError) {
      console.error("[v0] Database URL validation failed:", dbError)
      return NextResponse.json({ error: "Database configuration error. Please contact support." }, { status: 500 })
    }

    const body = await request.json()
    const { email, password, username } = body

    console.log("[v0] Registration request for email:", email)

    // Validate required fields
    if (!email || !password) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Missing required fields: email, password" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      console.log("[v0] Password too short")
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Check if user already exists
    try {
      const conditions = [eq(users.email, email)]
      if (username) {
        conditions.push(eq(users.username, username))
      }

      const existingUser = await db.query.users.findFirst({
        where: conditions.length > 1 ? or(...conditions) : conditions[0],
      })

      if (existingUser) {
        console.log("[v0] User already exists")
        return NextResponse.json({ error: "User with this email or username already exists" }, { status: 409 })
      }
      console.log("[v0] User does not exist, proceeding with registration")
    } catch (dbError) {
      console.error("[v0] Database query error checking existing user:", dbError)
      return NextResponse.json({ error: "Database error. Please try again later." }, { status: 500 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)
    console.log("[v0] Password hashed successfully")

    // Extract name from email temporarily
    const emailPrefix = email.split("@")[0]
    const firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
    const lastName = "User"

    let company
    try {
      ;[company] = await db
        .insert(companies)
        .values({
          name: `${firstName}'s Company`,
          email: email,
        })
        .returning()
      console.log("[v0] Company created successfully:", company.id)
    } catch (dbError) {
      console.error("[v0] Error creating company:", dbError)
      return NextResponse.json({ error: "Failed to create company. Please try again." }, { status: 500 })
    }

    let newUser
    try {
      ;[newUser] = await db
        .insert(users)
        .values({
          email,
          username: username || null,
          password: hashedPassword,
          firstName,
          lastName,
          companyId: company.id,
          isActive: true,
        })
        .returning()
      console.log("[v0] User created successfully:", newUser.id)
    } catch (dbError) {
      console.error("[v0] Error creating user:", dbError)
      return NextResponse.json({ error: "Failed to create user account. Please try again." }, { status: 500 })
    }

    // Assign writer role (full company access)
    let writerRole
    try {
      writerRole = await db.query.roles.findFirst({
        where: eq(roles.name, "writer"),
      })

      if (!writerRole) {
        console.log("[v0] Writer role not found in database")
        // Don't fail the registration if role assignment fails
        console.log("[v0] Continuing without role assignment")
      } else {
        console.log("[v0] Writer role found:", writerRole.id)
      }
    } catch (dbError) {
      console.error("[v0] Error with writer role:", dbError)
      // Don't fail the registration if role assignment fails
      console.log("[v0] Continuing without role assignment")
    }

    if (writerRole) {
      try {
        await db.insert(userRoles).values({
          userId: newUser.id,
          roleId: writerRole.id,
        })
        console.log("[v0] Writer role assigned to user")
      } catch (dbError) {
        console.error("[v0] Error assigning role to user:", dbError)
        // Don't fail the registration
        console.log("[v0] Continuing without role assignment")
      }
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    try {
      await db.insert(verificationTokens).values({
        identifier: newUser.email,
        token: verificationToken,
        expires,
      })
      console.log("[v0] Verification token created")
    } catch (dbError) {
      console.error("[v0] Error creating verification token:", dbError)
      return NextResponse.json({ error: "Failed to create verification token" }, { status: 500 })
    }

    // Send verification email
    try {
      const host = request.headers.get("host") || "localhost:3000"
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
      const verificationUrl = `${protocol}://${host}/auth/verify?token=${verificationToken}&email=${encodeURIComponent(newUser.email)}`
      
      let subject = "Verify your account - NeoSaaS"
      let htmlContent = `
        <h1>Welcome to NeoSaaS!</h1>
        <p>Please click the link below to verify your account and complete your profile:</p>
        <p><a href="${verificationUrl}">Verify Account</a></p>
        <p>Or copy and paste this link: ${verificationUrl}</p>
      `
      let textContent = `Welcome to NeoSaaS!\n\nPlease verify your account by visiting: ${verificationUrl}`

      const platformConfig = await getPlatformConfig()
      let fromAddress = platformConfig.defaultSenderEmail || "no-reply@neosaas.tech"
      let fromName: string | undefined = undefined

      const template = await emailTemplateRepository.getTemplate("email_verification")
      if (template && template.isActive) {
        subject = template.subject.replace("{{siteName}}", "NeoSaaS")
        htmlContent = template.htmlContent || htmlContent
        textContent = template.textContent || textContent

        if (template.fromEmail) {
          fromAddress = template.fromEmail
          fromName = template.fromName || undefined
        }

        const variables = {
          firstName: newUser.firstName,
          siteName: "NeoSaaS",
          actionUrl: verificationUrl,
        }

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
          htmlContent = htmlContent.replace(regex, value)
          textContent = textContent.replace(regex, value)
        })
      }

      await emailRouter.sendEmail({
        to: [newUser.email],
        from: fromAddress,
        fromName: fromName,
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
      })
      console.log(`[v0] Verification email sent to ${newUser.email}`)
    } catch (emailError) {
      console.error("[v0] Failed to send verification email:", emailError)
    }

    // Return success message
    return NextResponse.json({
      message: "Account created successfully. Please check your email to verify your account.",
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    console.error("[v0] Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("[v0] Error message:", error instanceof Error ? error.message : "Unknown error")
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 },
    )
  }
}
