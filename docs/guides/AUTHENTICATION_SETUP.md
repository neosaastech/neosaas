# Authentication Setup Guide

## Overview

This project now includes a complete authentication system using Drizzle ORM with PostgreSQL (Neon Database). The system supports:

- User registration and login
- Company management
- Role-based access control (Admin and Finance roles)
- SaaS admin functionality
- JWT-based session management
- Password hashing with bcrypt

## Database Schema

### Tables

**companies**
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `email` (TEXT, Unique)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**users**
- `id` (UUID, Primary Key)
- `email` (TEXT, Unique)
- `password` (TEXT, Hashed)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `company_id` (UUID, Foreign Key → companies.id)
- `role` (ENUM: 'admin' | 'finance')
- `is_saas_admin` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### User Roles

1. **Finance (Read-only)**: Basic access with read-only permissions
2. **Admin**: Full access to company resources
3. **SaaS Admin**: Platform-wide administrative access

## Setup Instructions

### 1. Environment Variables

The `.env.local` file has been created with the following variables:

\`\`\`env
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require

NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Optional: Secret key for making a user SaaS admin
ADMIN_SECRET_KEY=change-this-in-production
\`\`\`

**Important**: Update `NEXTAUTH_SECRET` and `ADMIN_SECRET_KEY` in production with secure random strings.

### 2. Install Dependencies

Dependencies have already been installed, including:
- `drizzle-orm` - ORM for database operations
- `@neondatabase/serverless` - Neon database client
- `drizzle-kit` - Database migration tool
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `tsx` - TypeScript execution

### 3. Database Migration

To create the database tables, run:

\`\`\`bash
pnpm db:push
\`\`\`

This will:
- Create the `role` ENUM type
- Create the `companies` table
- Create the `users` table with all relationships

**Note**: The schema is defined in `db/schema.ts` and pushed via `drizzle-kit push`.

### 4. Available Scripts

- `pnpm db:push` - Push database schema to Neon (reads `db/schema.ts`)
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

## API Routes

### Authentication Endpoints

#### POST `/api/auth/register`

Create a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Inc.", // Optional
  "companyEmail": "contact@acme.com", // Optional
  "role": "admin" // or "finance"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "isSaasAdmin": false
  },
  "message": "User created successfully"
}
\`\`\`

#### POST `/api/auth/login`

Log in with email and password.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword"
}
\`\`\`

**Response:**
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "isSaasAdmin": false
  },
  "message": "Login successful"
}
\`\`\`

#### GET `/api/auth/me`

Get the currently authenticated user.

**Response:**
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "isSaasAdmin": false,
    "company": {
      "id": "uuid",
      "name": "Acme Inc.",
      "email": "contact@acme.com"
    }
  }
}
\`\`\`

#### POST `/api/auth/logout`

Log out the current user.

**Response:**
\`\`\`json
{
  "message": "Logout successful"
}
\`\`\`

#### POST `/api/auth/make-admin`

Promote the current user to SaaS admin. Requires a secret key.

**Request Body:**
\`\`\`json
{
  "secretKey": "your-admin-secret-key"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "User successfully promoted to SaaS admin",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "isSaasAdmin": true
  }
}
\`\`\`

## Pages

### `/auth/login`

Login page with:
- Email/password form
- Google OAuth placeholder
- Redirect to dashboard on success
- Role-based redirect (SaaS admin → `/admin`, Company admin → `/dashboard-exemple`, Finance → `/dashboard-exemple/analytics`)

### `/auth/register`

Registration page with:
- User information (first name, last name, email)
- Optional company creation
- Role selection (Admin or Finance)
- Password confirmation
- Terms and conditions checkbox

### `/admin`

SaaS admin dashboard (protected):
- Only accessible to users with `isSaasAdmin: true`
- Overview of admin functions
- Links to user management, company management, and settings

## Authentication Flow

1. User visits `/auth/register` and creates an account
2. Password is hashed using bcrypt (10 rounds)
3. User and optional company are created in the database
4. JWT token is generated with user info
5. Token is stored in HTTP-only cookie
6. User is redirected based on role
7. Protected routes check for valid JWT token
8. User can log out to clear the cookie

## Making a User SaaS Admin

### Method 1: Using the API

1. Log in as the user you want to promote
2. Make a POST request to `/api/auth/make-admin`:

\`\`\`bash
curl -X POST http://localhost:3000/api/auth/make-admin \\
  -H "Content-Type: application/json" \\
  -d '{"secretKey": "change-this-in-production"}'
\`\`\`

### Method 2: Direct Database Update

Connect to your database and run:

\`\`\`sql
UPDATE users
SET is_saas_admin = true
WHERE email = 'admin@example.com';
\`\`\`

## Security Considerations

1. **Password Security**: Passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Security**: Tokens expire after 7 days
3. **HTTP-Only Cookies**: Auth tokens are stored in HTTP-only cookies to prevent XSS attacks
4. **HTTPS**: In production, cookies are marked as secure
5. **Environment Variables**: Never commit `.env.local` to version control
6. **Admin Secret**: Change `ADMIN_SECRET_KEY` and protect the `/api/auth/make-admin` endpoint

## Testing the Authentication

### 1. Run the development server

\`\`\`bash
pnpm dev
\`\`\`

### 2. Create a test user

1. Visit http://localhost:3000/auth/register
2. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Company Name: Acme Inc. (optional)
   - Company Email: contact@acme.com (optional)
   - Role: Admin
   - Password: password123
   - Confirm Password: password123
   - Accept terms
3. Click "Create account"

### 3. Test login

1. Visit http://localhost:3000/auth/login
2. Enter:
   - Email: john@example.com
   - Password: password123
3. Click "Sign in"
4. You should be redirected to the dashboard

### 4. Make yourself a SaaS admin

While logged in, run in the browser console:

\`\`\`javascript
fetch('/api/auth/make-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secretKey: 'change-this-in-production' })
})
.then(r => r.json())
.then(console.log);
\`\`\`

Then visit http://localhost:3000/admin

## File Structure

\`\`\`
/db
  schema.ts          # Database schema definitions (source of truth)
  index.ts           # Database client configuration

/lib
  auth.ts            # Authentication utilities (JWT, password hashing, cookies)

/app/api/auth
  register/route.ts  # User registration endpoint
  login/route.ts     # User login endpoint
  me/route.ts        # Get current user endpoint
  logout/route.ts    # Logout endpoint
  make-admin/route.ts # Make user SaaS admin endpoint

/app/auth
  login/page.tsx     # Login page
  register/page.tsx  # Registration page

/app/admin
  page.tsx           # SaaS admin dashboard
\`\`\`

## Troubleshooting

### Database connection fails

- Verify `DATABASE_URL` in `.env.local`
- Ensure the URL does not include `channel_binding=require` parameter
- Check that your Neon database is active

### JWT token errors

- Ensure `NEXTAUTH_SECRET` is set in `.env.local`
- Clear browser cookies if encountering token verification issues

### Schema push fails

- The sandbox environment may block external database connections
- Run the script in a local development environment
- Alternatively, execute the SQL commands manually in Neon's SQL editor

## Next Steps

1. ✅ Database schema created
2. ✅ Authentication system implemented
3. ✅ Login and registration pages updated
4. ✅ SaaS admin page created
5. 🔜 Add user management interface for admins
6. 🔜 Add company management interface for SaaS admins
7. 🔜 Implement password reset functionality
8. 🔜 Add email verification
9. 🔜 Implement OAuth providers (Google, GitHub, etc.)

## Support

For issues or questions, please refer to:
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Neon Database Documentation](https://neon.tech/docs)
- [Next.js Authentication](https://nextjs.org/docs/pages/building-your-application/routing/authenticating)
