import { db } from "../db"
import { pagePermissions } from "../db/schema"

type AccessLevel = "public" | "user" | "admin" | "super-admin"

interface Page {
  path: string
  name: string
  access: AccessLevel
  group: string
}

const defaultPages: Page[] = [
  { path: "/", name: "Home Page", access: "public", group: "Public" },
  { path: "/features", name: "Features", access: "public", group: "Public" },
  { path: "/pricing", name: "Pricing", access: "public", group: "Public" },
  { path: "/docs", name: "Documentation", access: "public", group: "Public" },
  { path: "/auth/login", name: "Login", access: "public", group: "Authentication" },
  { path: "/auth/register", name: "Register", access: "public", group: "Authentication" },
  { path: "/dashboard", name: "Dashboard Overview", access: "user", group: "Dashboard" },
  { path: "/dashboard/profile", name: "User Profile", access: "user", group: "Dashboard" },
  { path: "/dashboard/payments", name: "Payments", access: "user", group: "Dashboard" },
  { path: "/dashboard/company-management", name: "Company Management", access: "user", group: "Dashboard" },
  { path: "/dashboard/checkout", name: "Checkout", access: "user", group: "Dashboard" },
  { path: "/admin", name: "Admin Dashboard", access: "admin", group: "Admin" },
  { path: "/admin/api", name: "API Management", access: "admin", group: "Admin" },
  { path: "/admin/pages", name: "Pages ACL", access: "admin", group: "Admin" },
  { path: "/admin/mail", name: "Mail Management", access: "admin", group: "Admin" },
]

// Utility function for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Retry function with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`  ⏳ Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

async function main() {
  console.log("🔄 Syncing page permissions...")

  // Wait a bit for previous database connections to close
  await sleep(2000)

  try {
    let count = 0
    for (const page of defaultPages) {
      const result = await withRetry(async () => {
        return await db.insert(pagePermissions)
          .values({
            path: page.path,
            name: page.name,
            group: page.group,
            access: page.access
          })
          .onConflictDoNothing({ target: pagePermissions.path })
          .returning()
      })

      if (result.length > 0) {
        count++
      }
    }
    console.log(`✅ Synced ${count} new pages to permissions table`)
    console.log("✅ Page permissions synchronization complete")
  } catch (error) {
    console.error("❌ Failed to sync pages:", error)
    // Exit with code 0 to not block the build - pages can be synced later
    console.log("⚠️  Page sync failed but build will continue. Pages can be synced manually later.")
    process.exit(0)
  }
}

main()
