# Better Auth Configuration

## Overview
This project uses [Better Auth](https://www.better-auth.com/) for authentication, integrated with Drizzle ORM and Neon PostgreSQL.

## Setup Steps

### 1. Initialize Database Tables
Run the SQL script to create the authentication tables:
\`\`\`bash
# Execute the setup script in the v0 interface
# The script will create: user, session, account, and verification tables
\`\`\`

### 2. Environment Variables
Required environment variables (already configured):
- `NEXT_PUBLIC_SITE_URL` - Your site URL
- `NEON_DATABASE_URL` - Neon PostgreSQL connection string

### 3. Features Enabled
- ✅ Email/Password authentication
- ✅ Secure session management
- ✅ Password hashing (automatic)
- ✅ Cookie-based sessions
- ✅ CSRF protection

## Usage

### Client-Side (React Components)
\`\`\`tsx
import { signIn, signUp, signOut, useSession } from "@/lib/auth-client"

// Sign up
await signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "John Doe"
})

// Sign in
await signIn.email({
  email: "user@example.com",
  password: "securepassword"
})

// Get current session
const { data: session } = useSession()

// Sign out
await signOut()
\`\`\`

### Server-Side (Route Handlers, Server Components)
\`\`\`tsx
import { auth } from "@/lib/auth"

// Get session
const session = await auth.api.getSession({ headers: request.headers })

// Require authentication
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
\`\`\`

## Database Schema
The Better Auth tables follow this structure:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth providers & password storage
- `verification` - Email verification tokens

## Security Features
- Passwords are automatically hashed with bcrypt
- Sessions use secure HTTP-only cookies
- CSRF tokens protect against cross-site attacks
- Rate limiting on authentication endpoints
- SQL injection prevention via Drizzle ORM

## Next Steps
1. Run the SQL initialization script
2. Test registration at `/auth/register`
3. Test login at `/auth/login`
4. Access protected routes in `/dashboard`
